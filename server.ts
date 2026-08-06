import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Services
import { connectMongoDB, isMongoConnected } from './src/services/mongodb.js';
import { db } from './src/services/db.js';

// Mongoose Models
import { UserModel } from './src/models/UserModel.js';
import { WorkspaceModel } from './src/models/WorkspaceModel.js';
import { ProjectModel } from './src/models/ProjectModel.js';
import { EventModel } from './src/models/EventModel.js';
import { SessionModel } from './src/models/SessionModel.js';
import { ApiKeyModel } from './src/models/ApiKeyModel.js';
import { SupportTicketModel } from './src/models/SupportTicketModel.js';

// Auth middleware
import { requireAuth, AuthenticatedRequest } from './src/middleware/auth.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genPublicKey() { return `pk_live_${randomBytes(12).toString('hex')}`; }
function genSecretKey() { return `sk_live_${randomBytes(12).toString('hex')}`; }
function makeSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + randomBytes(3).toString('hex'); }
function timeframeToMs(tf: string): number { const m: Record<string, number> = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 }; return m[tf] || 604800000; }
function signJWT(userId: string, workspaceId: string): string { return jwt.sign({ userId, workspaceId }, process.env.JWT_SECRET!, { expiresIn: '30d' }); }
function verifyJWT(token: string): { userId: string; workspaceId: string } | null { try { return jwt.verify(token, process.env.JWT_SECRET!) as any; } catch { return null; } }
function extractJWT(req: express.Request): { userId: string; workspaceId: string } | null { const h = req.headers.authorization; if (!h?.startsWith('Bearer ')) return null; return verifyJWT(h.slice(7)); }
function clientIP(req: express.Request): string { const xff = req.headers['x-forwarded-for']; if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim(); return req.ip || req.socket?.remoteAddress || ''; }

// ─── Best-effort geo-IP resolution (cached, rate-limited) ───────────────────
const geoCache = new Map<string, any>();
let lastGeoCall = 0;
const GEO_MIN_INTERVAL_MS = 1400; // keep under ~40 req/min on freeipapi
async function resolveGeo(ip: string): Promise<any | null> {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, '');
  if (clean === '127.0.0.1' || clean === '::1' || clean.startsWith('192.168.') || clean.startsWith('10.') || clean.startsWith('172.16.')) return null;
  const cached = geoCache.get(clean);
  if (cached) return cached;
  const wait = Math.max(0, GEO_MIN_INTERVAL_MS - (Date.now() - lastGeoCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeoCall = Date.now();
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(clean)}`, { signal: controller.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const j = await res.json();
    const geo = {
      ip: clean,
      country: j.countryName || 'Unknown',
      countryCode: j.countryCode || 'XX',
      city: j.cityName || j.city || 'Unknown',
      region: j.regionName || '',
      latitude: j.latitude,
      longitude: j.longitude,
    };
    geoCache.set(clean, geo);
    return geo;
  } catch { return null; }
}

// ─── Gemini usage controls ────────────────────────────────────────────────────
// Config (tunable via .env)
const GEMINI_ENABLED       = process.env.GEMINI_ENABLED !== 'false';            // set to 'false' to disable entirely
const CACHE_TTL_MS         = (parseInt(process.env.GEMINI_CACHE_TTL_MIN  || '15') * 60_000); // default 15 min
const RATE_LIMIT_WINDOW_MS = (parseInt(process.env.GEMINI_RATE_WINDOW_MIN || '60') * 60_000); // default 60 min
const RATE_LIMIT_MAX       =  parseInt(process.env.GEMINI_RATE_MAX        || '6');            // default 6 calls/hr/project
const MAX_ERRORS_IN_PROMPT =  parseInt(process.env.GEMINI_MAX_ERRORS      || '3');
const MAX_VITALS_IN_PROMPT =  parseInt(process.env.GEMINI_MAX_VITALS      || '4');
const MAX_PAGES_IN_PROMPT  =  parseInt(process.env.GEMINI_MAX_PAGES       || '3');

// In-memory TTL cache:  key → { result, expiresAt }
const insightsCache = new Map<string, { result: any; expiresAt: number }>();

// In-memory rate-limit tracker:  projectId → [timestamp, ...]
const insightsRateMap = new Map<string, number[]>();

function getCacheKey(projectId: string, timeframe: string, customQuestion?: string): string {
  return `${projectId}:${timeframe}:${customQuestion ? customQuestion.trim().toLowerCase().slice(0, 80) : ''}`;
}

function checkRateLimit(projectId: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const calls = (insightsRateMap.get(projectId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (calls.length >= RATE_LIMIT_MAX) {
    const oldest = Math.min(...calls);
    return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - oldest) };
  }
  calls.push(now);
  insightsRateMap.set(projectId, calls);
  return { allowed: true, retryAfterMs: 0 };
}

// Purge expired cache entries periodically (every 30 min) to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of insightsCache) { if (v.expiresAt < now) insightsCache.delete(k); }
}, 30 * 60_000);


// ─── MongoDB analytics aggregation ───────────────────────────────────────────
async function getRealOverviewStats(projectId: string, timeframe: string) {
  const since = new Date(Date.now() - timeframeToMs(timeframe));
  const pid = new mongoose.Types.ObjectId(projectId);
  const [pageviews, sessions, errors, webVitals] = await Promise.all([
    EventModel.find({ projectId: pid, type: 'pageview', timestamp: { $gte: since } }).lean(),
    SessionModel.find({ projectId: pid, startedAt: { $gte: since } }).lean(),
    EventModel.find({ projectId: pid, type: 'error', timestamp: { $gte: since } }).lean(),
    EventModel.find({ projectId: pid, type: 'performance' }).lean(),
  ]);
  const totalVisitors = pageviews.length;
  const uniqueVisitors = new Set(pageviews.map((p) => p.sessionId)).size;
  const totalSessions = sessions.length;
  const bounces = (sessions as any[]).filter((s) => s.isBounce).length;
  const bounceRate = totalSessions > 0 ? Math.round((bounces / totalSessions) * 100) : 0;
  const avgSessionDuration = totalSessions > 0 ? Math.round((sessions as any[]).reduce((a, s) => a + s.durationSeconds, 0) / totalSessions) : 0;
  const fiveMinAgo = new Date(Date.now() - 300000);
  const liveUsersCount = await SessionModel.countDocuments({ projectId: pid, lastActiveAt: { $gte: fiveMinAgo } });
  const pageMap: Record<string, { views: number; unique: Set<string> }> = {};
  (pageviews as any[]).forEach((p) => { const pg = p.data?.path || '/'; if (!pageMap[pg]) pageMap[pg] = { views: 0, unique: new Set() }; pageMap[pg].views++; pageMap[pg].unique.add(p.sessionId); });
  const topPages = Object.entries(pageMap).map(([path, d]) => ({ path, views: d.views, uniqueViews: d.unique.size })).sort((a, b) => b.views - a.views).slice(0, 5);
  const devMap: Record<string, number> = {};
  (sessions as any[]).forEach((s) => { const d = s.device?.deviceType || 'desktop'; devMap[d] = (devMap[d] || 0) + 1; });
  const topDevices = Object.entries(devMap).map(([name, count]) => ({ name, count, percentage: Math.round((count / (totalSessions || 1)) * 100) }));
  const geoMap: Record<string, { code: string; count: number }> = {};
  (sessions as any[]).forEach((s) => { const c = s.geo?.country || 'Unknown'; if (!geoMap[c]) geoMap[c] = { code: s.geo?.countryCode || 'XX', count: 0 }; geoMap[c].count++; });
  const topCountries = Object.entries(geoMap).map(([country, d]) => ({ country, code: d.code, count: d.count, percentage: Math.round((d.count / (totalSessions || 1)) * 100) })).sort((a, b) => b.count - a.count).slice(0, 5);
  const browserMap: Record<string, number> = {};
  (sessions as any[]).forEach((s) => { const b = s.device?.browser || 'Unknown'; browserMap[b] = (browserMap[b] || 0) + 1; });
  const topBrowsers = Object.entries(browserMap).map(([name, count]) => ({ name, count }));
  const hourlySeries = [];
  for (let h = 23; h >= 0; h--) {
    const slotStart = new Date(Date.now() - h * 3600000);
    const slotEnd = new Date(Date.now() - (h - 1) * 3600000);
    const pvCount = (pageviews as any[]).filter((p) => { const t = new Date(p.timestamp); return t >= slotStart && t < slotEnd; }).length;
    hourlySeries.push({ time: `${slotStart.getHours()}:00`, pageViews: pvCount, visitors: Math.floor(pvCount * 0.7), sessions: Math.floor(pvCount * 0.5) });
  }
  let webVitalsScore = 100;
  (webVitals as any[]).forEach((v) => { if (v.data?.rating === 'poor') webVitalsScore -= 5; else if (v.data?.rating === 'needs-improvement') webVitalsScore -= 2; });
  return { totalVisitors, uniqueVisitors, totalSessions, bounceRate, liveUsersCount, avgSessionDuration, totalErrors: errors.length, webVitalsScore: Math.max(0, Math.min(100, webVitalsScore)), topPages, topDevices, topCountries, topBrowsers, hourlySeries };
}

// ─── Funnel computation from real events ──────────────────────────────────────
async function computeFunnels(projectId: string, workspaceId: string) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const configured = db.funnels.filter((f) => f.projectId === projectId);

  // Build step definitions — prefer configured funnels, else derive a useful
  // default funnel from the actual event stream.
  const funnels: Array<{ name: string; steps: Array<{ name: string; urlPattern?: string; eventName?: string }> }> =
    configured.length > 0
      ? configured.map((f) => ({ name: f.name, steps: f.steps }))
      : [{ name: 'Site Engagement Funnel', steps: [
          { name: 'Visited Site', urlPattern: '/' },
          { name: 'Interacted (click)', eventName: '__any_click__' },
          { name: 'Custom Event Tracked', eventName: '__any_custom__' },
        ] }];

  const results: any[] = [];
  for (const funnel of funnels) {
    const steps: any[] = [];
    let prevUsers = 0;
    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      let usersCount = 0;
      if (step.eventName === '__any_custom__') {
        usersCount = (await EventModel.distinct('sessionId', { projectId: pid, type: 'custom' })).length;
      } else if (step.eventName === '__any_click__') {
        usersCount = (await EventModel.distinct('sessionId', { projectId: pid, type: 'click' })).length;
      } else if (step.eventName) {
        usersCount = (await EventModel.distinct('sessionId', { projectId: pid, type: 'custom', 'data.eventName': step.eventName })).length;
      } else if (step.urlPattern !== undefined) {
        const pvs = await EventModel.find({ projectId: pid, type: 'pageview' }).select('data sessionId').lean();
        const sessions = new Set<string>();
        (pvs as any[]).forEach((m) => {
          const p = m.data?.path || '/';
          if (step.urlPattern === '/' ? p === '/' : p.startsWith(step.urlPattern)) sessions.add(m.sessionId);
        });
        usersCount = sessions.size;
      }
      const firstUsers = steps[0]?.usersCount || 0;
      steps.push({
        name: step.name,
        usersCount,
        dropoffPercentage: i === 0 ? 0 : Math.round(((prevUsers - usersCount) / (prevUsers || 1)) * 100),
        conversionPercentage: i === 0 ? 100 : firstUsers > 0 ? Math.round((usersCount / firstUsers) * 100) : 0,
      });
      prevUsers = usersCount;
    }
    const overallConversion = steps.length > 1 && steps[0].usersCount > 0 ? Math.round((steps[steps.length - 1].usersCount / steps[0].usersCount) * 1000) / 10 : 0;
    results.push({ funnelId: `funnel_${projectId}`, name: funnel.name, steps, overallConversion });
  }
  return results;
}

// ─── AI Insights payload builder (real Mongo data when connected) ─────────────
async function buildInsightsPayload(projectId: string, timeframe: string) {
  if (isMongoConnected() && mongoose.Types.ObjectId.isValid(projectId)) {
    const pid = new mongoose.Types.ObjectId(projectId);
    const proj = await ProjectModel.findById(pid).lean();
    if (proj) {
      const stats = await getRealOverviewStats(projectId, timeframe);
      const since = new Date(Date.now() - timeframeToMs(timeframe));
      const [errors, vitals] = await Promise.all([
        EventModel.find({ projectId: pid, type: 'error', timestamp: { $gte: since } }).sort({ timestamp: -1 }).limit(200).lean(),
        EventModel.find({ projectId: pid, type: 'performance', timestamp: { $gte: since } }).sort({ timestamp: -1 }).limit(200).lean(),
      ]);
      // Aggregate errors by message to count occurrences
      const errMap = new Map<string, any>();
      (errors as any[]).forEach((e) => {
        const key = e.data?.message || 'Unknown error';
        const ex = errMap.get(key) || { type: e.data?.type || 'js_exception', message: key.slice(0, 120), url: e.data?.url || '', occurrences: 0, browser: (e.device as any)?.browser || 'Unknown' };
        ex.occurrences++;
        errMap.set(key, ex);
      });
      const topErrors = [...errMap.values()].sort((a, b) => b.occurrences - a.occurrences).slice(0, MAX_ERRORS_IN_PROMPT);
      const topVitals = (vitals as any[]).map((v) => ({ name: v.data?.name, value: v.data?.value, rating: v.data?.rating })).slice(0, MAX_VITALS_IN_PROMPT);
      const topPages = stats.topPages.slice(0, MAX_PAGES_IN_PROMPT);
      return { project: { name: (proj as any).name, domain: (proj as any).domain }, stats, topErrors, topVitals, topPages };
    }
  }
  const project = db.projects.find((p) => p.id === projectId) || db.projects[0];
  const stats = db.getOverviewStats(projectId, timeframe as any);
  const topErrors = db.errorLogs
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, MAX_ERRORS_IN_PROMPT)
    .map((e) => ({ type: e.type, message: e.message.slice(0, 120), url: e.url, occurrences: e.occurrences, browser: e.browser }));
  const topVitals = db.webVitals
    .filter((w) => w.projectId === projectId)
    .slice(0, MAX_VITALS_IN_PROMPT)
    .map((v) => ({ name: v.name, value: v.value, rating: v.rating }));
  const topPages = stats.topPages.slice(0, MAX_PAGES_IN_PROMPT);
  return { project: { name: project.name, domain: project.domain }, stats, topErrors, topVitals, topPages };
}

// ─── Ingest events to MongoDB ─────────────────────────────────────────────────
async function ingestEventsToMongo(projectId: mongoose.Types.ObjectId, workspaceId: mongoose.Types.ObjectId, sessionId: string, events: Array<{ type: string; data: any; timestamp: number }>, clientIp?: string) {
  const now = new Date();
  let session = await SessionModel.findOne({ sessionId });
  if (!session) {
    session = new SessionModel({ projectId, workspaceId, sessionId, startedAt: now, lastActiveAt: now, durationSeconds: 0, pageViewsCount: 0, eventsCount: 0, entryPage: events.find((e) => e.type === 'pageview')?.data?.path || '/', exitPage: '/', isBounce: true, device: events[0]?.data?.device || {}, geo: events[0]?.data?.geo || {} });
  }
  const sessionGeo = (session as any).geo?.country ? (session as any).geo : events[0]?.data?.geo || {};
  await EventModel.insertMany(events.map((evt) => ({ projectId, workspaceId, sessionId, userId: evt.data?.userId, type: evt.type as any, data: evt.data || {}, device: evt.data?.device || (session as any).device || {}, geo: evt.data?.geo || sessionGeo || {}, timestamp: new Date(evt.timestamp || Date.now()) })));
  const pvCount = events.filter((e) => e.type === 'pageview').length;
  session.pageViewsCount += pvCount;
  session.eventsCount += events.length;
  session.isBounce = session.pageViewsCount <= 1;
  session.lastActiveAt = now;
  const lastPV = [...events].reverse().find((e) => e.type === 'pageview');
  if (lastPV) session.exitPage = lastPV.data?.path || '/';
  session.durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
  await session.save();

  // Best-effort background geo enrichment (never blocks ingestion)
  if (!sessionGeo?.country && clientIp) {
    resolveGeo(clientIp).then((geo) => {
      if (!geo) return;
      session.geo = geo;
      session.save().catch(() => {});
      EventModel.updateMany({ sessionId, timestamp: { $gte: new Date(Date.now() - 60000) } }, { $set: { geo } }).catch(() => {});
    }).catch(() => {});
  }
  return { success: true, ingested: events.length };
}

// ─── Build auth payload ───────────────────────────────────────────────────────
async function buildAuthPayload(userId: string, workspaceId: string) {
  const [user, workspace, projects] = await Promise.all([UserModel.findById(userId).lean(), WorkspaceModel.findById(workspaceId).lean(), ProjectModel.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId) }).lean()]);
  if (!user || !workspace) return null;
  const projectIds = (projects as any[]).map((p) => p._id);
  const apiKeys = await ApiKeyModel.find({ projectId: { $in: projectIds } }).lean();
  return {
    user: { id: (user as any)._id.toString(), name: (user as any).name, email: (user as any).email },
    workspace: { id: (workspace as any)._id.toString(), name: (workspace as any).name, slug: (workspace as any).slug, plan: (workspace as any).plan, eventQuota: (workspace as any).eventQuota, eventsUsed: (workspace as any).eventsUsed, members: (workspace as any).members || [] },
    projects: (projects as any[]).map((p) => ({ id: p._id.toString(), name: p.name, domain: p.domain, publicKey: p.publicKey, secretKey: p.secretKey, status: p.status, aiInsightsEnabled: (p as any).aiInsightsEnabled !== false, healthInsightsEnabled: (p as any).healthInsightsEnabled !== false, activeVisitors: 0, totalEvents24h: 0, workspaceId: p.workspaceId.toString(), createdAt: p.createdAt })),
    apiKeys: (apiKeys as any[]).map((k) => ({ id: k._id.toString(), projectId: k.projectId.toString(), name: k.name, key: k.key, type: k.type, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt })),
  };
}

// ─── Main Server ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Attempt MongoDB connection (non-blocking — app works in demo mode if unavailable)
  await connectMongoDB();

  app.use(express.json({ limit: '2mb' }));

  // CORS — required for SDK cross-origin event ingestion
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-PulseTrack-Key, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
    next();
  });

  // ── Server status ─────────────────────────────────────────────────────────
  app.get('/api/v1/status', (_req, res) => {
    res.json({ status: 'ok', mongoConnected: isMongoConnected(), demoMode: !isMongoConnected(), version: '1.0.0' });
  });

  // ── Auth routes (no JWT required) ─────────────────────────────────────────

  app.post('/api/v1/auth/register', async (req, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected. Set MONGODB_URI in .env to enable registration.' }); return; }
    try {
      const { name, email, password, websiteName, websiteDomain } = req.body;
      if (!name || !email || !password) { res.status(400).json({ error: 'Name, email, and password are required.' }); return; }
      if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters.' }); return; }
      const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (existing) { res.status(409).json({ error: 'An account with this email already exists.' }); return; }
      const hashedPassword = await bcrypt.hash(password, 12);
      const workspaceDoc = new WorkspaceModel({ name: `${name.split(' ')[0]}'s Workspace`, slug: makeSlug(name), plan: 'Free', eventQuota: 100000, eventsUsed: 0, ownerId: new mongoose.Types.ObjectId(), members: [] });
      const userDoc = new UserModel({ name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword, defaultWorkspaceId: workspaceDoc._id });
      await userDoc.save();
      workspaceDoc.ownerId = userDoc._id;
      workspaceDoc.members = [{ userId: userDoc._id.toString(), name: userDoc.name, email: userDoc.email, role: 'owner', createdAt: new Date().toISOString() }];
      await workspaceDoc.save();
      const publicKey = genPublicKey(); const secretKey = genSecretKey();
      const project = new ProjectModel({ workspaceId: workspaceDoc._id, name: websiteName?.trim() || `${name.split(' ')[0]}'s Website`, domain: (websiteDomain?.trim() || 'yourwebsite.com').replace(/^https?:\/\//, ''), publicKey, secretKey, status: 'active' });
      await project.save();
      await ApiKeyModel.insertMany([{ projectId: project._id, workspaceId: workspaceDoc._id, name: 'Public Client Key', key: publicKey, type: 'public' }, { projectId: project._id, workspaceId: workspaceDoc._id, name: 'Server Secret Key', key: secretKey, type: 'secret' }]);
      const token = signJWT(userDoc._id.toString(), workspaceDoc._id.toString());
      const payload = await buildAuthPayload(userDoc._id.toString(), workspaceDoc._id.toString());
      res.status(201).json({ token, ...payload });
    } catch (err: any) {
      console.error('[Register Error]', err);
      res.status(500).json({ error: err.message || 'Registration failed.' });
    }
  });

  app.post('/api/v1/auth/login', async (req, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected. Cannot authenticate.' }); return; }
    try {
      const { email, password } = req.body;
      if (!email || !password) { res.status(400).json({ error: 'Email and password are required.' }); return; }
      const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!user || !(await bcrypt.compare(password, user.password))) { res.status(401).json({ error: 'Invalid email or password.' }); return; }
      if (!user.defaultWorkspaceId) { res.status(500).json({ error: 'Account has no workspace.' }); return; }
      const token = signJWT(user._id.toString(), user.defaultWorkspaceId.toString());
      const payload = await buildAuthPayload(user._id.toString(), user.defaultWorkspaceId.toString());
      res.json({ token, ...payload });
    } catch (err: any) {
      console.error('[Login Error]', err);
      res.status(500).json({ error: 'Login failed.' });
    }
  });

  app.get('/api/v1/auth/me', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req);
    if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    try {
      const payload = await buildAuthPayload(decoded.userId, decoded.workspaceId);
      if (!payload) { res.status(404).json({ error: 'User not found.' }); return; }
      res.json(payload);
    } catch { res.status(500).json({ error: 'Failed to fetch user data.' }); }
  });

  // ── SDK Event Ingestion (API key auth) ────────────────────────────────────

  app.post('/api/v1/events', async (req, res) => {
    try {
      const apiKey = (req.headers['x-pulsetrack-key'] as string) || req.body.apiKey;
      const { sessionId, events } = req.body;
      if (!apiKey) { res.status(401).json({ error: 'Missing X-PulseTrack-Key header.' }); return; }
      if (!Array.isArray(events) || events.length === 0) { res.json({ success: true, ingested: 0 }); return; }
      if (isMongoConnected()) {
        const keyDoc = await ApiKeyModel.findOne({ key: apiKey });
        if (!keyDoc) { res.status(401).json({ error: 'Invalid API key.' }); return; }
        keyDoc.lastUsedAt = new Date(); await keyDoc.save();
        const result = await ingestEventsToMongo(keyDoc.projectId as any, keyDoc.workspaceId as any, sessionId || `sess_${Date.now()}`, events, clientIP(req));
        res.json(result);
      } else {
        res.json(db.ingestBatchedEvents(apiKey, sessionId || 'sess_default', events));
      }
    } catch (err: any) {
      console.error('[Ingestion Error]', err);
      res.status(500).json({ error: err.message || 'Failed to process events.' });
    }
  });

  app.post('/api/v1/identify', async (req, res) => {
    const { apiKey, sessionId, userId, traits } = req.body;
    if (isMongoConnected() && apiKey) {
      const keyDoc = await ApiKeyModel.findOne({ key: apiKey });
      if (keyDoc) { await EventModel.create({ projectId: keyDoc.projectId, workspaceId: keyDoc.workspaceId, sessionId: sessionId || 'sess_default', userId, type: 'identify', data: { userId, traits }, timestamp: new Date() }); await SessionModel.findOneAndUpdate({ sessionId }, { userId, userTraits: traits }); }
    }
    res.json({ success: true });
  });

  app.post('/api/v1/session', (req, res) => {
    res.json({ success: true, sessionId: req.body.sessionId || `sess_${Date.now()}` });
  });

  app.post('/api/v1/heartbeat', async (req, res) => {
    const { sessionId } = req.body;
    if (isMongoConnected() && sessionId) { await SessionModel.findOneAndUpdate({ sessionId }, { lastActiveAt: new Date() }); }
    res.json({ success: true, status: 'active' });
  });

  app.post('/api/v1/performance', async (req, res) => {
    const { apiKey, sessionId, name, value, rating } = req.body;
    if (isMongoConnected() && apiKey) {
      const k = await ApiKeyModel.findOne({ key: apiKey });
      if (k) await EventModel.create({ projectId: k.projectId, workspaceId: k.workspaceId, sessionId: sessionId || 'sess_default', type: 'performance', data: { name, value, rating }, timestamp: new Date() });
    } else if (apiKey) { db.ingestBatchedEvents(apiKey, sessionId || 'sess_default', [{ type: 'performance', data: { name, value, rating }, timestamp: Date.now() }]); }
    res.json({ success: true });
  });

  app.post('/api/v1/error', async (req, res) => {
    const { apiKey, sessionId, type, message, stack } = req.body;
    if (isMongoConnected() && apiKey) {
      const k = await ApiKeyModel.findOne({ key: apiKey });
      if (k) await EventModel.create({ projectId: k.projectId, workspaceId: k.workspaceId, sessionId: sessionId || 'sess_default', type: 'error', data: { type, message, stack }, timestamp: new Date() });
    } else if (apiKey) { db.ingestBatchedEvents(apiKey, sessionId || 'sess_default', [{ type: 'error', data: { type, message, stack }, timestamp: Date.now() }]); }
    res.json({ success: true });
  });

  app.post('/api/v1/custom-event', async (req, res) => {
    const { apiKey, sessionId, eventName, properties } = req.body;
    if (isMongoConnected() && apiKey) {
      const k = await ApiKeyModel.findOne({ key: apiKey });
      if (k) await EventModel.create({ projectId: k.projectId, workspaceId: k.workspaceId, sessionId: sessionId || 'sess_default', type: 'custom', data: { eventName, properties }, timestamp: new Date() });
    } else if (apiKey) { db.ingestBatchedEvents(apiKey, sessionId || 'sess_default', [{ type: 'event', data: { eventName, properties }, timestamp: Date.now() }]); }
    res.json({ success: true });
  });

  // ── Dashboard Analytics API ────────────────────────────────────────────────

  app.get('/api/v1/analytics/overview', async (req: AuthenticatedRequest, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || '7d';
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const project = await ProjectModel.findOne({ _id: new mongoose.Types.ObjectId(projectId), workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) });
        if (!project) { res.status(403).json({ error: 'Project not found or access denied.' }); return; }
        res.json(await getRealOverviewStats(projectId, timeframe));
      } else {
        res.json(db.getOverviewStats((req.query.projectId as string) || db.projects[0].id, timeframe as any));
      }
    } catch (err: any) { console.error('[Overview Error]', err); res.status(500).json({ error: 'Failed to fetch analytics.' }); }
  });

  app.get('/api/v1/analytics/live', async (req: AuthenticatedRequest, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const fiveMinAgo = new Date(Date.now() - 300000);
        const liveSessions = await SessionModel.find({ projectId: new mongoose.Types.ObjectId(projectId), lastActiveAt: { $gte: fiveMinAgo } }).sort({ lastActiveAt: -1 }).limit(50).lean();
        res.json({ activeCount: liveSessions.length, visitors: (liveSessions as any[]).map((s) => ({ sessionId: s.sessionId, userId: s.userId, country: s.geo?.country || 'Unknown', city: s.geo?.city || 'Unknown', browser: s.device?.browser || 'Unknown', device: s.device?.deviceType || 'desktop', activePage: s.exitPage, durationSeconds: s.durationSeconds, startedAt: s.startedAt, referrer: s.userTraits?.referrer || 'Direct' })) });
      } else {
        const live = db.getLiveVisitors((req.query.projectId as string) || db.projects[0].id);
        res.json({ activeCount: live.length, visitors: live });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch live visitors.' }); }
  });

  app.get('/api/v1/analytics/realtime', async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = (req.query.projectId as string) || db.projects[0].id;

      const shortId = (id?: string) => {
        if (!id) return 'Anonymous';
        const last = id.split('_').pop();
        return last && /^\d+$/.test(last) ? `Visitor #${last}` : id;
      };

      const feedUser = (sessionId: string, userId?: string) => userId || shortId(sessionId);

      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const pid = new mongoose.Types.ObjectId(projectId);
        const events = await EventModel.find({
          projectId: pid,
          type: { $in: ['pageview', 'click', 'custom', 'error', 'identify'] },
        }).sort({ timestamp: -1 }).limit(60).lean();

        const entries = (events as any[]).map((e) => {
          const ts = new Date(e.timestamp).getTime();
          const base = { id: e._id.toString(), timestamp: ts, user: feedUser(e.sessionId, e.userId) };
          switch (e.type) {
            case 'pageview':
              return { ...base, type: 'visit', action: 'visited', target: e.data?.path || e.data?.url || '/' };
            case 'click':
              return { ...base, type: 'click', action: 'clicked', target: e.data?.targetText || e.data?.targetId || e.data?.targetTag || 'element' };
            case 'custom':
              return {
                ...base,
                type: (e.data?.eventName || '').toLowerCase().includes('purchase') ? 'purchase' : 'event',
                action: (e.data?.eventName || '').toLowerCase().includes('purchase') ? 'completed' : 'triggered',
                target: e.data?.eventName || 'CustomAction',
              };
            case 'error':
              return { ...base, type: 'error', action: 'exception on', target: (e.data?.message || 'Script error').slice(0, 60) };
            case 'identify':
            default:
              return { ...base, type: 'identify', action: 'identified', target: e.userId || e.data?.userId || e.sessionId };
          }
        });

        res.json({ entries });
      } else {
        const limit = 60;
        const feed: any[] = [];

        db.pageViews.filter((p) => p.projectId === projectId).forEach((p) => {
          feed.push({ id: p.id, type: 'visit', user: feedUser(p.sessionId, p.userId), action: 'visited', target: p.path || p.url, timestamp: p.timestamp });
        });
        db.clickEvents.filter((c) => c.projectId === projectId).forEach((c) => {
          feed.push({ id: c.id, type: 'click', user: feedUser(c.sessionId, c.userId), action: 'clicked', target: c.targetText || c.targetId || c.targetTag || 'element', timestamp: c.timestamp });
        });
        db.customEvents.filter((e) => e.projectId === projectId).forEach((e) => {
          const isPurchase = (e.eventName || '').toLowerCase().includes('purchase');
          feed.push({
            id: e.id,
            type: isPurchase ? 'purchase' : 'event',
            user: feedUser(e.sessionId, e.userId),
            action: isPurchase ? 'completed' : 'triggered',
            target: isPurchase && e.properties?.orderId ? `Order ${e.properties.orderId} ($${e.properties.amount ?? ''})` : e.eventName,
            timestamp: e.timestamp,
          });
        });
        db.errorLogs.filter((e) => e.projectId === projectId).forEach((e) => {
          feed.push({ id: e.id, type: 'error', user: shortId(e.sessionId), action: 'exception on', target: (e.message || 'Script error').slice(0, 60), timestamp: e.timestamp });
        });

        feed.sort((a, b) => b.timestamp - a.timestamp);
        res.json({ entries: feed.slice(0, limit) });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch realtime feed.' }); }
  });

  app.get('/api/v1/analytics/sessions', async (req: AuthenticatedRequest, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const sessions = await SessionModel.find({ projectId: new mongoose.Types.ObjectId(projectId) }).sort({ startedAt: -1 }).limit(200).lean();
        res.json({ sessions: (sessions as any[]).map((s) => ({ id: s._id.toString(), sessionId: s.sessionId, userId: s.userId, projectId: s.projectId.toString(), workspaceId: s.workspaceId.toString(), startedAt: new Date(s.startedAt).getTime(), lastActiveAt: new Date(s.lastActiveAt).getTime(), durationSeconds: s.durationSeconds, pageViewsCount: s.pageViewsCount, eventsCount: s.eventsCount, entryPage: s.entryPage, exitPage: s.exitPage, isBounce: s.isBounce, device: s.device, geo: s.geo })) });
      } else {
        res.json({ sessions: db.sessions.filter((s) => s.projectId === ((req.query.projectId as string) || db.projects[0].id)) });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch sessions.' }); }
  });

  app.get('/api/v1/analytics/events', async (req: AuthenticatedRequest, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const events = await EventModel.find({ projectId: new mongoose.Types.ObjectId(projectId), type: 'custom' }).sort({ timestamp: -1 }).limit(500).lean();
        res.json({ events: (events as any[]).map((e) => ({ id: e._id.toString(), sessionId: e.sessionId, userId: e.userId, projectId: e.projectId.toString(), workspaceId: e.workspaceId.toString(), eventName: e.data?.eventName || 'Unknown', properties: e.data?.properties || {}, timestamp: new Date(e.timestamp).getTime(), url: e.data?.url || '', device: e.device, geo: e.geo })) });
      } else {
        res.json({ events: db.customEvents.filter((e) => e.projectId === ((req.query.projectId as string) || db.projects[0].id)) });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch events.' }); }
  });

  app.get('/api/v1/analytics/performance', async (req: AuthenticatedRequest, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const vitals = await EventModel.find({ projectId: new mongoose.Types.ObjectId(projectId), type: 'performance' }).sort({ timestamp: -1 }).limit(200).lean();
        res.json({ vitals: (vitals as any[]).map((v) => ({ id: v._id.toString(), sessionId: v.sessionId, projectId: v.projectId.toString(), workspaceId: v.workspaceId.toString(), name: v.data?.name, value: v.data?.value, rating: v.data?.rating, url: v.data?.url || '', timestamp: new Date(v.timestamp).getTime() })) });
      } else {
        res.json({ vitals: db.webVitals.filter((w) => w.projectId === ((req.query.projectId as string) || db.projects[0].id)) });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch performance data.' }); }
  });

  app.get('/api/v1/analytics/errors', async (req: AuthenticatedRequest, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const errors = await EventModel.find({ projectId: new mongoose.Types.ObjectId(projectId), type: 'error' }).sort({ timestamp: -1 }).limit(200).lean();
        res.json({ errors: (errors as any[]).map((e) => ({ id: e._id.toString(), sessionId: e.sessionId, userId: e.userId, projectId: e.projectId.toString(), workspaceId: e.workspaceId.toString(), type: e.data?.type || 'js_exception', message: e.data?.message || '', stack: e.data?.stack, url: e.data?.url || '', browser: e.device?.browser || 'Unknown', os: e.device?.os || 'Unknown', timestamp: new Date(e.timestamp).getTime(), status: 'unresolved', occurrences: 1 })) });
      } else {
        res.json({ errors: db.errorLogs.filter((e) => e.projectId === ((req.query.projectId as string) || db.projects[0].id)) });
      }
    } catch (err: any) { res.status(500).json({ error: 'Failed to fetch errors.' }); }
  });

  app.get('/api/v1/analytics/funnels', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const project = await ProjectModel.findOne({ _id: new mongoose.Types.ObjectId(projectId), workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) });
        if (!project) { res.status(403).json({ error: 'Project not found or access denied.' }); return; }
        res.json({ funnels: await computeFunnels(projectId, decoded.workspaceId) });
      } else {
        const projectId = (req.query.projectId as string) || db.projects[0].id;
        const configFunnels = db.funnels.filter((f) => f.projectId === projectId);
        const defaults = [18420, 12400, 5820, 3410, 2840];
        const drops = [0, 32.7, 53.1, 41.5, 16.8];
        const convs = [100, 67.3, 46.9, 58.5, 83.2];
        const funnels = configFunnels.map((f) => ({
          funnelId: f.id, name: f.name,
          steps: f.steps.map((s, i) => ({ name: s.name, usersCount: defaults[i] || 0, dropoffPercentage: drops[i] || 0, conversionPercentage: convs[i] || 0 })),
          overallConversion: Math.round((2840 / 18420) * 1000) / 10,
        }));
        res.json({ funnels });
      }
    } catch (err: any) { console.error('[Funnels Error]', err); res.status(500).json({ error: 'Failed to fetch funnels.' }); }
  });

  app.get('/api/v1/analytics/heatmaps', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const clicks = await EventModel.find({ projectId: new mongoose.Types.ObjectId(projectId), type: 'click' }).sort({ timestamp: -1 }).limit(10000).lean();
        const agg = new Map<string, any>();
        (clicks as any[]).forEach((c) => {
          const x = Math.round(((c.data?.x || 0) / 25)) * 25;
          const y = Math.round(((c.data?.y || 0) / 25)) * 25;
          const url = c.data?.url || c.data?.path || '/';
          const key = `${x}:${y}:${url}`;
          const entry = agg.get(key) || { x, y, count: 0, rageCount: 0, url };
          entry.count++;
          if (c.data?.isRageClick) entry.rageCount++;
          agg.set(key, entry);
        });
        res.json({ clicks: [...agg.values()] });
      } else {
        const projectId = (req.query.projectId as string) || db.projects[0].id;
        res.json({ clicks: db.clickEvents.filter((c) => c.projectId === projectId) });
      }
    } catch (err: any) { console.error('[Heatmaps Error]', err); res.status(500).json({ error: 'Failed to fetch heatmap data.' }); }
  });

  app.get('/api/v1/analytics/user-explorer', async (req, res) => {
    try {
      if (isMongoConnected()) {
        const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
        const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
        const pid = new mongoose.Types.ObjectId(projectId);
        const [identifyEvents, userSessions] = await Promise.all([
          EventModel.find({ projectId: pid, type: 'identify' }).sort({ timestamp: -1 }).lean(),
          SessionModel.find({ projectId: pid, userId: { $exists: true, $ne: null } }).lean(),
        ]);
        const map = new Map<string, any>();
        (identifyEvents as any[]).forEach((e) => {
          const uid = e.userId; if (!uid) return;
          const traits = e.data?.traits || {};
          const ex = map.get(uid) || { userId: uid, name: traits.name || traits.email, email: traits.email, traits: {}, firstSeenAt: new Date(e.timestamp).getTime(), lastSeenAt: new Date(e.timestamp).getTime(), totalSessions: 0 };
          ex.traits = { ...ex.traits, ...traits };
          if (traits.name) ex.name = traits.name;
          if (traits.email) ex.email = traits.email;
          ex.lastSeenAt = Math.max(ex.lastSeenAt, new Date(e.timestamp).getTime());
          ex.firstSeenAt = Math.min(ex.firstSeenAt, new Date(e.timestamp).getTime());
          map.set(uid, ex);
        });
        (userSessions as any[]).forEach((s) => {
          const uid = s.userId; if (!uid) return;
          const traits = s.userTraits || {};
          const ex = map.get(uid) || { userId: uid, name: traits.name || traits.email, email: traits.email, traits: {}, firstSeenAt: new Date(s.startedAt).getTime(), lastSeenAt: new Date(s.lastActiveAt).getTime(), totalSessions: 0 };
          ex.totalSessions++;
          ex.traits = { ...ex.traits, ...traits };
          if (traits.name) ex.name = traits.name;
          if (traits.email) ex.email = traits.email;
          ex.lastSeenAt = Math.max(ex.lastSeenAt, new Date(s.lastActiveAt).getTime());
          ex.firstSeenAt = Math.min(ex.firstSeenAt, new Date(s.startedAt).getTime());
          map.set(uid, ex);
        });
        res.json({ profiles: [...map.values()].map((p, i) => ({ id: `prof_${i + 1}`, projectId, workspaceId: decoded.workspaceId, userId: p.userId, name: p.name, email: p.email, traits: p.traits, firstSeenAt: p.firstSeenAt, lastSeenAt: p.lastSeenAt, totalSessions: p.totalSessions })) });
      } else {
        const projectId = (req.query.projectId as string) || db.projects[0].id;
        res.json({ profiles: db.userProfiles.filter((u) => u.projectId === projectId) });
      }
    } catch (err: any) { console.error('[User Explorer Error]', err); res.status(500).json({ error: 'Failed to fetch user profiles.' }); }
  });

  // ── Workspace & Project management ────────────────────────────────────────

  app.get('/api/v1/workspaces', async (req: AuthenticatedRequest, res) => {
    if (isMongoConnected()) {
      const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
      try {
        const workspace = await WorkspaceModel.findById(decoded.workspaceId).lean();
        if (!workspace) { res.status(404).json({ error: 'Workspace not found.' }); return; }
        res.json({ workspaces: [{ id: (workspace as any)._id.toString(), name: (workspace as any).name, slug: (workspace as any).slug, plan: (workspace as any).plan, eventQuota: (workspace as any).eventQuota, eventsUsed: (workspace as any).eventsUsed, members: (workspace as any).members }] });
      } catch { res.status(500).json({ error: 'Failed to fetch workspace.' }); }
    } else {
      res.json({ workspaces: db.workspaces });
    }
  });

  app.get('/api/v1/projects', async (req: AuthenticatedRequest, res) => {
    if (isMongoConnected()) {
      const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
      try {
        const projects = await ProjectModel.find({ workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) }).lean();
        res.json({ projects: (projects as any[]).map((p) => ({ id: p._id.toString(), name: p.name, domain: p.domain, publicKey: p.publicKey, secretKey: p.secretKey, status: p.status, aiInsightsEnabled: (p as any).aiInsightsEnabled !== false, healthInsightsEnabled: (p as any).healthInsightsEnabled !== false, workspaceId: p.workspaceId.toString(), activeVisitors: 0, totalEvents24h: 0, createdAt: p.createdAt })) });
      } catch { res.status(500).json({ error: 'Failed to fetch projects.' }); }
    } else {
      res.json({ projects: db.projects.filter((p) => p.workspaceId === ((req.query.workspaceId as string) || db.workspaces[0].id)) });
    }
  });

  app.post('/api/v1/projects', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    const { name, domain } = req.body;
    if (!name || !domain) { res.status(400).json({ error: 'Project name and domain are required.' }); return; }
    try {
      const publicKey = genPublicKey(); const secretKey = genSecretKey();
      const project = new ProjectModel({ workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId), name: name.trim(), domain: domain.trim().replace(/^https?:\/\//, ''), publicKey, secretKey, status: 'active' });
      await project.save();
      await ApiKeyModel.insertMany([{ projectId: project._id, workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId), name: 'Public Client Key', key: publicKey, type: 'public' }, { projectId: project._id, workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId), name: 'Server Secret Key', key: secretKey, type: 'secret' }]);
      res.status(201).json({ id: project._id.toString(), name: project.name, domain: project.domain, publicKey, secretKey, status: project.status, aiInsightsEnabled: (project as any).aiInsightsEnabled !== false, healthInsightsEnabled: (project as any).healthInsightsEnabled !== false, workspaceId: decoded.workspaceId, activeVisitors: 0, totalEvents24h: 0, createdAt: project.createdAt });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Project management (update / archive / regenerate keys) ─────────────────

  app.patch('/api/v1/projects/:id', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    try {
      const project = await ProjectModel.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) });
      if (!project) { res.status(404).json({ error: 'Project not found.' }); return; }
      const { name, domain, status, aiInsightsEnabled, healthInsightsEnabled } = req.body;
      if (name) project.name = name.trim();
      if (domain) project.domain = domain.trim().replace(/^https?:\/\//, '');
      if (status && ['active', 'paused', 'archived'].includes(status)) (project as any).status = status;
      if (typeof aiInsightsEnabled === 'boolean') (project as any).aiInsightsEnabled = aiInsightsEnabled;
      if (typeof healthInsightsEnabled === 'boolean') (project as any).healthInsightsEnabled = healthInsightsEnabled;
      await project.save();
      res.json({ id: project._id.toString(), name: project.name, domain: project.domain, status: project.status, publicKey: project.publicKey, secretKey: project.secretKey, aiInsightsEnabled: (project as any).aiInsightsEnabled !== false, healthInsightsEnabled: (project as any).healthInsightsEnabled !== false, workspaceId: project.workspaceId.toString(), activeVisitors: 0, totalEvents24h: 0, createdAt: project.createdAt });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/v1/projects/:id', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    try {
      const project = await ProjectModel.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) });
      if (!project) { res.status(404).json({ error: 'Project not found.' }); return; }
      (project as any).status = 'archived';
      await project.save();
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/v1/projects/:id/regenerate-keys', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    try {
      const project = await ProjectModel.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) });
      if (!project) { res.status(404).json({ error: 'Project not found.' }); return; }
      const newPublicKey = genPublicKey();
      const newSecretKey = genSecretKey();
      await ApiKeyModel.deleteMany({ projectId: project._id });
      project.publicKey = newPublicKey;
      project.secretKey = newSecretKey;
      await project.save();
      await ApiKeyModel.insertMany([
        { projectId: project._id, workspaceId: project.workspaceId, name: 'Public Client Key', key: newPublicKey, type: 'public' },
        { projectId: project._id, workspaceId: project.workspaceId, name: 'Server Secret Key', key: newSecretKey, type: 'secret' },
      ]);
      res.json({ publicKey: newPublicKey, secretKey: newSecretKey });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/v1/workspaces', async (req: AuthenticatedRequest, res) => {
    if (!isMongoConnected()) { res.status(503).json({ error: 'Database not connected.' }); return; }
    const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
    try {
      const workspace = await WorkspaceModel.findById(decoded.workspaceId);
      if (!workspace) { res.status(404).json({ error: 'Workspace not found.' }); return; }
      if (req.body.name) workspace.name = req.body.name.trim();
      await workspace.save();
      res.json({ id: workspace._id.toString(), name: workspace.name, slug: workspace.slug, plan: workspace.plan, eventQuota: workspace.eventQuota, eventsUsed: workspace.eventsUsed, members: workspace.members });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/v1/apikeys', async (req: AuthenticatedRequest, res) => {
    if (isMongoConnected()) {
      const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
      const projectId = req.query.projectId as string; if (!projectId) { res.status(400).json({ error: 'projectId is required.' }); return; }
      const keys = await ApiKeyModel.find({ projectId: new mongoose.Types.ObjectId(projectId) }).lean();
      res.json({ keys: (keys as any[]).map((k) => ({ id: k._id.toString(), projectId: k.projectId.toString(), name: k.name, key: k.key, type: k.type, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt })) });
    } else {
      res.json({ keys: db.apiKeys.filter((k) => k.projectId === ((req.query.projectId as string) || db.projects[0].id)) });
    }
  });

  // ── Support tickets ────────────────────────────────────────────────────────

  app.get('/api/v1/support/tickets', async (req: AuthenticatedRequest, res) => {
    if (isMongoConnected()) {
      const decoded = extractJWT(req); if (!decoded) { res.status(401).json({ error: 'Authentication required.' }); return; }
      const tickets = await SupportTicketModel.find({ workspaceId: new mongoose.Types.ObjectId(decoded.workspaceId) }).sort({ createdAt: -1 }).lean();
      res.json({ tickets: (tickets as any[]).map((t) => ({ id: t._id.toString(), workspaceId: t.workspaceId.toString(), userName: t.userName, userEmail: t.userEmail, subject: t.subject, category: t.category, priority: t.priority, status: t.status, messages: t.messages, createdAt: new Date(t.createdAt).getTime(), updatedAt: new Date(t.updatedAt).getTime() })) });
    } else {
      res.json({ tickets: db.supportTickets.filter((t) => t.workspaceId === ((req.query.workspaceId as string) || db.workspaces[0].id)) });
    }
  });

  app.post('/api/v1/support/ticket', async (req, res) => {
    const { workspaceId, userName, userEmail, subject, category, priority, message } = req.body;
    if (isMongoConnected() && workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
      try {
        const ticket = new SupportTicketModel({ workspaceId: new mongoose.Types.ObjectId(workspaceId), userName: userName || 'Customer', userEmail: userEmail || 'user@example.com', subject: subject || 'Support Query', category: category || 'general', priority: priority || 'medium', status: 'open', messages: [{ id: `msg_${Date.now()}`, sender: 'user', senderName: userName || 'Customer', content: message || '', timestamp: Date.now() }] });
        await ticket.save();
        res.json({ success: true, ticket: { id: ticket._id.toString(), ...ticket.toObject() } });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    } else {
      const newTicket = { id: `tkt_${Date.now()}`, workspaceId: workspaceId || db.workspaces[0].id, userName: userName || 'Customer', userEmail: userEmail || 'user@example.com', subject: subject || 'Support Query', category: category || 'general', priority: priority || 'medium', status: 'open' as const, messages: [{ id: `msg_${Date.now()}`, sender: 'user' as const, senderName: userName || 'Customer', content: message || '', timestamp: Date.now() }], createdAt: Date.now(), updatedAt: Date.now() };
      db.supportTickets.unshift(newTicket);
      res.json({ success: true, ticket: newTicket });
    }
  });

  app.post('/api/v1/support/message', async (req, res) => {
    const { ticketId, sender, senderName, content } = req.body;
    if (isMongoConnected() && ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
      const ticket = await SupportTicketModel.findById(ticketId);
      if (!ticket) { res.status(404).json({ error: 'Ticket not found.' }); return; }
      const newMsg = { id: `msg_${Date.now()}`, sender: sender || 'agent', senderName: senderName || 'Support Agent', content, timestamp: Date.now() };
      ticket.messages.push(newMsg as any); await ticket.save();
      res.json({ success: true, message: newMsg });
    } else {
      const ticket = db.supportTickets.find((t) => t.id === ticketId);
      if (!ticket) { res.status(404).json({ error: 'Ticket not found.' }); return; }
      const newMsg = { id: `msg_${Date.now()}`, sender: sender || 'agent', senderName: senderName || 'Support Agent', content, timestamp: Date.now() };
      ticket.messages.push(newMsg as any); ticket.updatedAt = Date.now();
      res.json({ success: true, message: newMsg });
    }
  });

  app.get('/api/v1/admin/stats', (_req, res) => { res.json(db.getAdminStats()); });

  // ── AI Insights (Gemini) — with cache + rate limiting + prompt trimming ─────

  app.post('/api/v1/analytics/ai-insights', async (req, res) => {
    try {
      const { projectId, timeframe, customQuestion } = req.body;
      const targetProjectId = projectId || db.projects[0].id;
      const selectedTimeframe = timeframe || '7d';

      // ── 0. Feature toggle check (AI Insights disabled for this project) ────
      if (isMongoConnected() && mongoose.Types.ObjectId.isValid(targetProjectId)) {
        const projectDoc = await ProjectModel.findById(new mongoose.Types.ObjectId(targetProjectId)).lean().catch(() => null);
        if (projectDoc && (projectDoc as any).aiInsightsEnabled === false) {
          res.json({ success: true, enabled: false, reason: 'ai_insights_disabled' });
          return;
        }
      } else {
        const demoProject = db.projects.find((p) => p.id === targetProjectId);
        if (demoProject && demoProject.aiInsightsEnabled === false) {
          res.json({ success: true, enabled: false, reason: 'ai_insights_disabled' });
          return;
        }
      }

      // ── 1. Rate limit check ─────────────────────────────────────────────────
      const { allowed, retryAfterMs } = checkRateLimit(targetProjectId);
      if (!allowed) {
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);
        res.status(429).json({
          error: `AI Insights rate limit reached. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
          retryAfterSeconds: retryAfterSec,
        });
        return;
      }

      // ── 2. Cache lookup ─────────────────────────────────────────────────────
      const cacheKey = getCacheKey(targetProjectId, selectedTimeframe, customQuestion);
      const cached = insightsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.json({ success: true, insights: cached.result, source: 'cache', cachedAt: new Date(cached.expiresAt - CACHE_TTL_MS).toISOString() });
        return;
      }

      // ── 3. Build trimmed data payload (real Mongo data when connected) ──────
      const insightsData = await buildInsightsPayload(targetProjectId, selectedTimeframe);
      const project = insightsData.project;
      const stats = insightsData.stats;
      const topErrors = insightsData.topErrors;
      const topVitals = insightsData.topVitals;
      const topPages = insightsData.topPages;

      let insightsResponse: any = null;
      let usedModel = 'rule-engine';

      // ── 4. Call Gemini (only if enabled and key is present) ─────────────────
      if (GEMINI_ENABLED && process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

        // Compact prompt — only essential data, no repetitive filler
        const prompt = [
          `You are a senior SRE analysing website telemetry for "${project.name}" (${project.domain}).`,
          `Timeframe: ${selectedTimeframe}`,
          `Stats: pageviews=${stats.totalVisitors}, sessions=${stats.uniqueVisitors}, bounce=${stats.bounceRate}%, avgDuration=${stats.avgSessionDuration}s, liveUsers=${stats.liveUsersCount}, vitalsScore=${stats.webVitalsScore}`,
          `Errors (top ${topErrors.length}): ${JSON.stringify(topErrors)}`,
          `WebVitals: ${JSON.stringify(topVitals)}`,
          `TopPages: ${JSON.stringify(topPages)}`,
          customQuestion ? `Question: "${customQuestion.slice(0, 200)}"` : '',
          'Output: healthScore (0-100), healthStatus, executiveSummary (2 sentences), up to 3 performanceInsights, up to 3 errorDiagnostics, up to 4 actionableSteps.',
        ].filter(Boolean).join('\n');

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  healthScore:          { type: Type.NUMBER },
                  healthStatus:         { type: Type.STRING },
                  executiveSummary:     { type: Type.STRING },
                  performanceInsights:  { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, impact: { type: Type.STRING }, metric: { type: Type.STRING }, description: { type: Type.STRING }, recommendation: { type: Type.STRING } }, required: ['title', 'impact', 'metric', 'description', 'recommendation'] } },
                  errorDiagnostics:     { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { errorName: { type: Type.STRING }, severity: { type: Type.STRING }, affectedArea: { type: Type.STRING }, plainLanguageExplanation: { type: Type.STRING }, suggestedFix: { type: Type.STRING } }, required: ['errorName', 'severity', 'plainLanguageExplanation', 'suggestedFix'] } },
                  actionableSteps:      { type: Type.ARRAY, items: { type: Type.STRING } },
                  customAnswer:         { type: Type.STRING },
                },
                required: ['healthScore', 'healthStatus', 'executiveSummary', 'performanceInsights', 'errorDiagnostics', 'actionableSteps'],
              },
            },
          });
          if (response.text) { insightsResponse = JSON.parse(response.text.trim()); usedModel = 'gemini-2.0-flash'; }
        } catch (geminiErr: any) {
          console.warn('[Gemini] Call failed, using fallback:', geminiErr?.message);
          // No retry — fall through to rule-engine immediately to avoid doubling token spend
        }
      }

      if (!insightsResponse) {
        insightsResponse = generateFallbackInsights(project, stats, topErrors, topVitals, customQuestion);
      }

      // ── 5. Store in cache (cache both Gemini and fallback responses) ─────────
      insightsCache.set(cacheKey, { result: insightsResponse, expiresAt: Date.now() + CACHE_TTL_MS });

      res.json({ success: true, insights: insightsResponse, source: usedModel });
    } catch (err: any) {
      console.error('[AI Insights Error]', err);
      res.status(500).json({ error: err.message || 'Failed to generate AI Insights.' });
    }
  });

  // ── Vite / Static files ───────────────────────────────────────────────────

  if (process.env.NODE_ENV === 'development') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PulseTrack Server → http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${isMongoConnected() ? '✅ Connected' : '⚠️  Not connected (demo mode)'}`);
    console.log(`🔐 Auth: ${process.env.JWT_SECRET ? '✅ JWT secret configured' : '⚠️  JWT_SECRET not set'}\n`);
  });
}

// ─── Fallback AI Insights (rule-based) ───────────────────────────────────────

function generateFallbackInsights(project: any, stats: any, errors: any[], vitals: any[], customQuestion?: string) {
  const isSlowLCP = vitals.some((v) => v.name === 'LCP' && v.value > 2500);
  const isHighBounce = stats.bounceRate > 40;

  const healthScore = Math.max(50, Math.min(100, Math.round(stats.webVitalsScore - errors.length * 4 - (stats.bounceRate > 40 ? 8 : 0))));
  const healthStatus = healthScore > 85 ? 'Healthy & Optimized' : healthScore > 70 ? 'Needs Attention' : 'Critical Action Required';

  const executiveSummary = `${project.name} is currently running at a ${healthScore}/100 system health rating. ${
    errors.length > 0
      ? `We detected ${errors.length} active error exceptions requiring developer attention.`
      : 'No critical runtime exceptions detected.'
  } Core Web Vitals score is ${stats.webVitalsScore}/100 with a ${stats.bounceRate}% bounce rate over the selected timeframe.`;

  const performanceInsights = [
    {
      title: 'Largest Contentful Paint (LCP) Optimization',
      impact: isSlowLCP ? 'high' : 'medium',
      metric: 'LCP (Core Web Vitals)',
      description: isSlowLCP
        ? 'LCP render timing exceeds the 2.5s threshold on key entry routes.'
        : 'LCP timing is currently within optimal boundaries under 2.0s.',
      recommendation: 'Preload main hero assets, enable WebP/AVIF media compression, and implement edge caching for static assets.',
    },
    {
      title: 'Bounce Rate & Visitor Engagement',
      impact: isHighBounce ? 'high' : 'low',
      metric: `Bounce Rate (${stats.bounceRate}%)`,
      description: isHighBounce
        ? `Bounce rate is high at ${stats.bounceRate}%. Users are leaving quickly after single pageview visits.`
        : `Bounce rate is stable at ${stats.bounceRate}%.`,
      recommendation: 'Optimize above-the-fold content visibility, reduce layout reflow shift (CLS), and streamline primary CTA elements.',
    },
    {
      title: 'Input Delay & Main Thread Workload',
      impact: 'medium',
      metric: 'INP (Interaction to Next Paint)',
      description: 'Main-thread execution pauses slightly during heavy interactive state changes on checkout forms.',
      recommendation: 'Offload non-critical analytics tracking script parsing using requestIdleCallback or async script attributes.',
    },
  ];

  const errorDiagnostics = errors.slice(0, 3).map((err) => ({
    errorName: err.message || err.type || 'Unhandled Exception',
    severity: err.occurrences > 10 ? 'critical' : 'warning',
    affectedArea: err.url || 'Frontend Core Bundle / API',
    plainLanguageExplanation: `This error occurred ${err.occurrences} times on ${err.browser || 'client browsers'}. It happens when network requests fail or response objects lack expected property keys.`,
    suggestedFix: `Add optional chaining guards to response payloads and implement graceful try-catch fallback handling around ${err.url || 'API endpoints'}.`,
  }));

  const actionableSteps = [
    'Resolve unhandled 500 error exception on /api/payment endpoint to prevent checkout drop-offs.',
    'Enable Brotli compression and HTTP/2 multiplexing on web application assets.',
    'Set up automated alerting thresholds for Core Web Vitals degradation.',
    'Implement client-side fallback UI placeholders for asynchronous component loading.',
  ];

  return {
    healthScore,
    healthStatus,
    executiveSummary,
    performanceInsights,
    errorDiagnostics: errorDiagnostics.length > 0 ? errorDiagnostics : [
      {
        errorName: 'No Critical Exceptions Logged',
        severity: 'info',
        affectedArea: 'Global Application',
        plainLanguageExplanation: 'Application is running without recorded runtime errors.',
        suggestedFix: 'Maintain automated error boundary monitoring.',
      }
    ],
    actionableSteps,
    customAnswer: customQuestion ? `Analysis for "${customQuestion}": Based on current telemetry, system health score is ${healthScore}/100. Key areas to address are reducing unhandled payment endpoint errors and improving hero image preload times.` : null,
  };
}

startServer();
