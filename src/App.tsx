import React, { useState, useEffect, useRef } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { LiveVisitors } from './components/LiveVisitors';
import { SessionsExplorer } from './components/SessionsExplorer';
import { UserExplorer } from './components/UserExplorer';
import { EventsExplorer } from './components/EventsExplorer';
import { PerformanceMonitoring } from './components/PerformanceMonitoring';
import { ErrorMonitoring } from './components/ErrorMonitoring';
import { FunnelAnalytics } from './components/FunnelAnalytics';
import { HeatmapVisualizer } from './components/HeatmapVisualizer';
import { SupportDesk } from './components/SupportDesk';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { AdminPanel } from './components/AdminPanel';
import { DemoSandbox } from './components/DemoSandbox';
import { DeveloperDocs } from './components/DeveloperDocs';
import { ExportModal } from './components/ExportModal';
import { CommandPalette } from './components/CommandPalette';
import { AuthPage, AuthUserData } from './components/AuthPage';

import {
  Workspace,
  Project,
  User,
  ApiKey,
  OverviewStats,
  UserSession,
  CustomAnalyticsEvent,
  ErrorLog,
  SupportTicket,
  AdminPlatformStats,
  Timeframe,
  ThemeMode,
  WebVitalMetric,
  UserProfile,
  HeatmapPoint,
  HeatmapElement,
} from './types';
import { db } from './services/db';

const AUTH_TOKEN_KEY = 'pulsetrack_auth_token';
const PROJECT_PARAM = 'project';
const TABS: ActiveTab[] = ['overview', 'live', 'sessions', 'users', 'events', 'performance', 'errors', 'funnels', 'heatmaps', 'support', 'settings', 'admin', 'sandbox', 'docs'];
const tabFromPath = (pathname: string): ActiveTab => {
  const seg = pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  return (TABS as string[]).includes(seg) ? (seg as ActiveTab) : 'overview';
};
const pathForTab = (tab: ActiveTab) => (tab === 'overview' ? '/' : `/${tab}`);
const THEME_MODE_KEY = 'pulsetrack_theme_mode';

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
  });
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );
  const darkMode = themeMode === 'system' ? systemDark : themeMode === 'dark';
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => tabFromPath(window.location.pathname));
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Auth & server mode state ────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [isAuthRequired, setIsAuthRequired] = useState(false);  // true when MongoDB is live
  const [authLoading, setAuthLoading] = useState(true);         // checking server status on mount
  const [currentUser, setCurrentUser] = useState<User>(db.workspaces[0].members[0]);

  // Global Keyboard Shortcut Listener for CMD+K / CTRL+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === '/' && !isCommandPaletteOpen) {
        const target = e.target as HTMLElement;
        const isInputElement = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isInputElement) { e.preventDefault(); setIsCommandPaletteOpen(true); }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCommandPaletteOpen]);

  // ── Multi-tenant Context ────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState<Workspace[]>(db.workspaces);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(db.workspaces[0]);
  const [projects, setProjects] = useState<Project[]>(db.projects);
  const [currentProject, setCurrentProject] = useState<Project>(db.projects[0]);

  // Data States
  const [overviewStats, setOverviewStats] = useState<OverviewStats>(db.getOverviewStats(db.projects[0].id, timeframe));
  const [sessions, setSessions] = useState<UserSession[]>(db.sessions);
  const [customEvents, setCustomEvents] = useState<CustomAnalyticsEvent[]>(db.customEvents);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>(db.errorLogs);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(db.supportTickets);
  const [adminStats, setAdminStats] = useState<AdminPlatformStats>(db.getAdminStats());
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(db.apiKeys);
  const [webVitals, setWebVitals] = useState<WebVitalMetric[]>(db.webVitals);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(db.userProfiles);
  const [heatmapClicks, setHeatmapClicks] = useState<HeatmapPoint[]>([]);
  const [heatmapElements, setHeatmapElements] = useState<HeatmapElement[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]);
  // Id of the project whose real data has finished its first load (auth mode only)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);

  // Sync dark mode class on document element + persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(THEME_MODE_KEY, themeMode);
  }, [darkMode, themeMode]);

  // Track OS theme changes so "system" mode stays adaptive in real time
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Lock body scroll while the mobile nav drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  // ── On mount: check server status and validate stored token ────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await fetch('/api/v1/status');
        const status = await statusRes.json();

        if (status.demoMode) {
          // MongoDB not connected — run in demo mode, skip auth
          setIsAuthRequired(false);
          const wanted = new URLSearchParams(window.location.search).get(PROJECT_PARAM);
          const demo = db.projects.find((p) => p.id === wanted);
          if (demo) setCurrentProject(demo);
          setAuthLoading(false);
          return;
        }

        // MongoDB is live — auth is required
        setIsAuthRequired(true);
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!storedToken) { setAuthLoading(false); return; }

        // Validate the stored token
        const meRes = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } });
        if (meRes.ok) {
          const data: AuthUserData = await meRes.json();
          applyAuthData(storedToken, data);
        } else {
          // Token expired or invalid
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
        }
      } catch {
        // Server unreachable — run in demo mode
        setIsAuthRequired(false);
      } finally {
        setAuthLoading(false);
      }
    };
    init();
  }, []);

  // Apply authenticated user data to dashboard state
  const applyAuthData = (token: string, data: AuthUserData) => {
    setAuthToken(token);
    localStorage.setItem(AUTH_TOKEN_KEY, token);

    setCurrentUser({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: 'owner',
      createdAt: new Date().toISOString(),
    });

    const ws: Workspace = {
      id: data.workspace.id,
      name: data.workspace.name,
      slug: data.workspace.slug,
      plan: data.workspace.plan as any,
      eventQuota: data.workspace.eventQuota,
      eventsUsed: data.workspace.eventsUsed,
      members: data.workspace.members,
      createdAt: new Date().toISOString(),
    };
    setWorkspaces([ws]);
    setCurrentWorkspace(ws);

    if (data.projects.length === 0) { setProjects([]); setApiKeys([]); }
    if (data.projects.length > 0) {
      const mapProject = (p: any): Project => ({
        id: p.id, workspaceId: p.workspaceId || data.workspace.id,
        name: p.name, domain: p.domain, publicKey: p.publicKey, secretKey: p.secretKey,
        status: p.status || 'active', activeVisitors: p.activeVisitors ?? 0,
        totalEvents24h: p.totalEvents24h ?? 0,
        aiInsightsEnabled: p.aiInsightsEnabled !== false,
        healthInsightsEnabled: p.healthInsightsEnabled !== false,
        lastEventAt: p.lastEventAt || null, seenHosts: p.seenHosts || [],
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      });
      setProjects(data.projects.map(mapProject));
      // Restore the project from the URL (?project=<id>) when it still exists
      const wanted = new URLSearchParams(window.location.search).get(PROJECT_PARAM);
      const pick = data.projects.find((p: any) => p.id === wanted)
        || data.projects.find((p: any) => p.status !== 'archived')
        || data.projects[0];
      setCurrentProject(mapProject(pick));
    }

    {
      const mapKey = (k: any): ApiKey => ({
        id: k.id, projectId: k.projectId, name: k.name, key: k.key,
        type: k.type as 'public' | 'secret',
        lastUsedAt: k.lastUsedAt || null,
        createdAt: typeof k.createdAt === 'string' ? k.createdAt : new Date().toISOString(),
      });
      setApiKeys(data.apiKeys.map(mapKey));
    }
  };

  const handleAuthSuccess = (token: string, data: AuthUserData) => {
    applyAuthData(token, data);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    // Reset to demo data
    setCurrentUser(db.workspaces[0].members[0]);
    setWorkspaces(db.workspaces);
    setCurrentWorkspace(db.workspaces[0]);
    setProjects(db.projects);
    setCurrentProject(db.projects[0]);
    setApiKeys(db.apiKeys);
  };

  // Helper: get auth headers for API calls
  const authHeaders = (): Record<string, string> => ({
    // Lets the server start "today" (and single-day views) at the user's own midnight
    'X-TZ-Offset': String(new Date().getTimezoneOffset()),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  // ── Fetch / Sync data ───────────────────────────────────────────────────────
  const refreshData = async () => {
    // Wait for the server-mode check, and never query a live database with a demo project id
    // (real projects have Mongo ObjectIds; a demo id means none are loaded yet or none exist).
    if (authLoading) return;
    if (isAuthRequired && !/^[0-9a-f]{24}$/i.test(currentProject.id)) return;
    const loadingFor = currentProject.id;
    try {
      const params = new URLSearchParams();
      params.set('projectId', currentProject.id);
      params.set('timeframe', timeframe);
      if (selectedDate) params.set('date', selectedDate);
      const res = await fetch(
        `/api/v1/analytics/overview?${params.toString()}`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        setOverviewStats(await res.json());
      } else {
        setOverviewStats(db.getOverviewStats(currentProject.id, timeframe, selectedDate || undefined));
      }

      // Fetch sessions, events, errors if authenticated
      const [sessRes, evtRes, errRes, ticketRes, vitalsRes, profileRes, heatRes, funnelRes] = await Promise.allSettled([
        fetch(`/api/v1/analytics/sessions?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/events?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/errors?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/support/tickets`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/performance?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/user-explorer?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/heatmaps?projectId=${currentProject.id}`, { headers: authHeaders() }),
        fetch(`/api/v1/analytics/funnels?projectId=${currentProject.id}`, { headers: authHeaders() }),
      ]);
      if (sessRes.status === 'fulfilled' && sessRes.value.ok) { const d = await sessRes.value.json(); setSessions(d.sessions || []); }
      if (evtRes.status === 'fulfilled' && evtRes.value.ok) { const d = await evtRes.value.json(); setCustomEvents(d.events); }
      if (errRes.status === 'fulfilled' && errRes.value.ok) { const d = await errRes.value.json(); setErrorLogs(d.errors); }
      if (ticketRes.status === 'fulfilled' && ticketRes.value.ok) { const d = await ticketRes.value.json(); setSupportTickets(d.tickets); }
      if (vitalsRes.status === 'fulfilled' && vitalsRes.value.ok) { const d = await vitalsRes.value.json(); setWebVitals(d.vitals || []); }
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) { const d = await profileRes.value.json(); setUserProfiles(d.profiles || []); }
      if (heatRes.status === 'fulfilled' && heatRes.value.ok) { const d = await heatRes.value.json(); setHeatmapClicks(d.clicks || []); setHeatmapElements(d.elements || []); }
      if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) { const d = await funnelRes.value.json(); setFunnels(d.funnels || []); }
      setAdminStats(db.getAdminStats());
    } catch {
      setOverviewStats(db.getOverviewStats(currentProject.id, timeframe, selectedDate || undefined));
    } finally {
      setLoadedProjectId(loadingFor);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentProject.id, timeframe, selectedDate, authToken, authLoading, isAuthRequired]);

  // Monitoring today: keep the numbers moving without a manual refresh
  const refreshRef = useRef(refreshData);
  refreshRef.current = refreshData;
  useEffect(() => {
    if (timeframe !== 'today' || selectedDate) return;
    const t = setInterval(() => refreshRef.current(), 30000);
    return () => clearInterval(t);
  }, [timeframe, selectedDate]);

  const urlSyncedRef = useRef(false);

  // Keep the URL (/<page>?project=<id>) in step with the selected page and project,
  // so a refresh, a shared link, or back/forward lands on the same view
  useEffect(() => {
    if (authLoading) return;
    const url = new URL(window.location.href);
    url.pathname = pathForTab(activeTab);
    if (!isAuthRequired || projects.some((p) => p.id === currentProject.id)) {
      url.searchParams.set(PROJECT_PARAM, currentProject.id);
    }
    if (url.href !== window.location.href) {
      // First sync only normalises the URL; later changes add history entries for back/forward
      if (urlSyncedRef.current) window.history.pushState({}, '', url);
      else window.history.replaceState({}, '', url);
    }
    if (!isAuthRequired || projects.some((p) => p.id === currentProject.id)) urlSyncedRef.current = true;
  }, [authLoading, isAuthRequired, projects, currentProject.id, activeTab]);

  // Browser back/forward: follow the page and project in the URL
  useEffect(() => {
    const onPop = () => {
      setActiveTab(tabFromPath(window.location.pathname));
      const id = new URLSearchParams(window.location.search).get(PROJECT_PARAM);
      const target = projects.find((p) => p.id === id);
      if (target) setCurrentProject(target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [projects]);

  // Logged in with no real projects: send them to Settings to create one
  useEffect(() => {
    if (!authLoading && isAuthRequired && authToken && projects.length === 0) setActiveTab('settings');
  }, [authLoading, isAuthRequired, authToken, projects.length]);

  // Handle live test hit simulation
  const handleSimulatedHit = () => {
    db.ingestBatchedEvents(currentProject.publicKey, `sess_sim_${Date.now()}`, [
      { type: 'pageview', data: { url: `https://${currentProject.domain}/products/live-item`, path: '/products/live-item', title: 'Live Simulated Hit' }, timestamp: Date.now() },
      { type: 'event', data: { eventName: 'SimulatedPurchase', properties: { amount: 149.99, live: true } }, timestamp: Date.now() },
    ]);
    refreshData();
  };

  // ── Workspace & project management callbacks ────────────────────────────────
  const toProject = (p: any, wsId?: string): Project => ({
    id: p.id, workspaceId: p.workspaceId || wsId || currentWorkspace.id,
    name: p.name, domain: p.domain, publicKey: p.publicKey, secretKey: p.secretKey,
    status: (p.status || 'active') as Project['status'], activeVisitors: p.activeVisitors ?? 0,
    totalEvents24h: p.totalEvents24h ?? 0,
    aiInsightsEnabled: p.aiInsightsEnabled !== false,
    healthInsightsEnabled: p.healthInsightsEnabled !== false,
    lastEventAt: p.lastEventAt || null, seenHosts: p.seenHosts || [],
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
  });

  const handleCreateProject = async (name: string, domain: string): Promise<Project> => {
    if (!isAuthRequired) {
      // Demo mode — create in-memory
      const pk = `pk_live_demo_${Math.random().toString(36).slice(2, 10)}`;
      const sk = `sk_live_demo_${Math.random().toString(36).slice(2, 10)}`;
      const proj: Project = { id: `proj_demo_${Date.now()}`, workspaceId: currentWorkspace.id, name, domain, publicKey: pk, secretKey: sk, status: 'active', aiInsightsEnabled: true, healthInsightsEnabled: true, activeVisitors: 0, totalEvents24h: 0, createdAt: new Date().toISOString() };
      setProjects((prev) => [...prev, proj]);
      return proj;
    }
    const res = await fetch('/api/v1/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name, domain }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project');
    const proj = toProject(data);
    setProjects((prev) => [...prev, proj]);
    return proj;
  };

  const handleUpdateProject = async (id: string, updates: { name?: string; domain?: string; status?: string; aiInsightsEnabled?: boolean; healthInsightsEnabled?: boolean }) => {
    if (!isAuthRequired) {
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } as Project : p));
      if (currentProject.id === id) setCurrentProject((prev) => ({ ...prev, ...updates } as Project));
      return;
    }
    const res = await fetch(`/api/v1/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(updates) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update project');
    const proj = toProject(data);
    setProjects((prev) => prev.map((p) => p.id === id ? proj : p));
    if (currentProject.id === id) setCurrentProject(proj);
  };

  const handleArchiveProject = async (id: string) => {
    if (!isAuthRequired) {
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: 'archived' } as Project : p));
      return;
    }
    const res = await fetch(`/api/v1/projects/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to archive project'); }
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: 'archived' } as Project : p));
    if (currentProject.id === id) {
      const next = projects.find((p) => p.id !== id && p.status === 'active');
      if (next) setCurrentProject(next);
    }
  };

  // Keep connection status fresh while the Settings page is open
  useEffect(() => {
    if (!isAuthRequired || !authToken || activeTab !== 'settings') return;
    const tick = async () => {
      try {
        const res = await fetch('/api/v1/projects', { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const fresh = new Map<string, Project>((data.projects || []).map((p: any) => [p.id, toProject(p)]));
        setProjects((prev) => prev.map((p) => fresh.has(p.id) ? { ...p, lastEventAt: fresh.get(p.id)!.lastEventAt, seenHosts: fresh.get(p.id)!.seenHosts } : p));
      } catch { /* transient; retry next tick */ }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [isAuthRequired, authToken, activeTab]);

  const handleDeleteProject = async (id: string) => {
    if (isAuthRequired) {
      const res = await fetch(`/api/v1/projects/${id}?permanent=true`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to delete project'); }
    }
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    setApiKeys((prev) => prev.filter((k) => k.projectId !== id));
    if (currentProject.id === id) {
      const next = remaining.find((p) => p.status === 'active') || remaining[0];
      if (next) setCurrentProject(next);
    }
  };

  const handleCreateApiKey = async (projectId: string, name: string, type: 'public' | 'secret'): Promise<ApiKey> => {
    let key: ApiKey;
    if (!isAuthRequired) {
      const rand = Math.random().toString(36).slice(2, 14);
      key = { id: `key_demo_${Date.now()}`, projectId, name, key: `${type === 'secret' ? 'sk' : 'pk'}_live_demo_${rand}`, type, lastUsedAt: null, createdAt: new Date().toISOString() };
    } else {
      const res = await fetch('/api/v1/apikeys', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ projectId, name, type }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create API key');
      key = { id: data.id, projectId: data.projectId, name: data.name, key: data.key, type: data.type, lastUsedAt: data.lastUsedAt || null, createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString() };
    }
    setApiKeys((prev) => [key, ...prev]);
    return key;
  };

  const handleRevokeApiKey = async (id: string) => {
    if (isAuthRequired) {
      const res = await fetch(`/api/v1/apikeys/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to revoke API key'); }
    }
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const handleRenameWorkspace = async (name: string) => {
    if (!isAuthRequired) {
      setCurrentWorkspace((prev) => ({ ...prev, name }));
      setWorkspaces((prev) => prev.map((w) => w.id === currentWorkspace.id ? { ...w, name } : w));
      return;
    }
    const res = await fetch('/api/v1/workspaces', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to rename workspace');
    const updated: Workspace = { ...currentWorkspace, name: data.name };
    setCurrentWorkspace(updated);
    setWorkspaces((prev) => prev.map((w) => w.id === updated.id ? updated : w));
  };

  // ── Auth gate: show spinner while checking, then login if required ──────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading PulseTrack…</p>
        </div>
      </div>
    );
  }

  // Live mode: hold back the dashboard until the real data for this project has loaded,
  // so the built-in demo data never flashes first.
  const showSkeleton = isAuthRequired && !!authToken && activeTab !== 'settings'
    && projects.length > 0 && loadedProjectId !== currentProject.id;

  if (isAuthRequired && !authToken) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen font-sans bg-slate-100 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors">
      {/* Top Header */}
      <HeaderNavbar
        currentWorkspace={currentWorkspace}
        currentProject={currentProject}
        projects={projects}
        workspaces={workspaces}
        timeframe={timeframe}
        selectedDate={selectedDate}
        user={currentUser}
        onSelectProject={(proj) => setCurrentProject(proj)}
        onSelectTimeframe={(tf) => setTimeframe(tf)}
        onSelectDate={(date) => setSelectedDate(date)}
        onOpenDemo={() => setActiveTab('sandbox')}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onLogout={isAuthRequired && authToken ? handleLogout : undefined}
      />

      {/* Main Layout Container */}
      <div className="flex">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          openTicketsCount={supportTickets.filter((t) => t.status === 'open').length}
          user={currentUser}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Primary View Area */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1400px] mx-auto min-w-0 overflow-hidden space-y-4">
          {showSkeleton ? <DashboardSkeleton /> : (<>
          {activeTab === 'overview' && (
            <OverviewDashboard
              stats={overviewStats}
              timeframe={timeframe}
              date={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectTimeframe={setTimeframe}
              currentProject={currentProject}
              onNavigateTab={(tab: any) => setActiveTab(tab)}
              onOpenExport={() => setIsExportModalOpen(true)}
              authHeaders={authHeaders()}
              projects={projects}
              isLive={isAuthRequired}
              onSelectProject={(proj) => setCurrentProject(proj)}
            />
          )}

          {activeTab === 'live' && (
            <LiveVisitors
              onTriggerSimulatedHit={handleSimulatedHit}
              project={currentProject}
              authHeaders={authHeaders()}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsExplorer sessions={sessions} authHeaders={authHeaders()} />
          )}

          {activeTab === 'users' && (
            <UserExplorer profiles={userProfiles} />
          )}

          {activeTab === 'events' && (
            <EventsExplorer events={customEvents} />
          )}

          {activeTab === 'performance' && (
            <PerformanceMonitoring vitals={webVitals} />
          )}

          {activeTab === 'errors' && (
            <ErrorMonitoring errors={errorLogs} />
          )}

          {activeTab === 'funnels' && (
            <FunnelAnalytics funnels={funnels} />
          )}

          {activeTab === 'heatmaps' && (
            <HeatmapVisualizer clicks={heatmapClicks} elements={heatmapElements} />
          )}

          {activeTab === 'support' && (
            <SupportDesk tickets={supportTickets} onRefreshTickets={refreshData} />
          )}

          {activeTab === 'settings' && (
            <SettingsWorkspace
              workspace={currentWorkspace}
              projects={projects}
              currentProject={currentProject}
              apiKeys={apiKeys}
              authToken={authToken}
              isMongoMode={isAuthRequired}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onArchiveProject={handleArchiveProject}
              onDeleteProject={handleDeleteProject}
              onCreateApiKey={handleCreateApiKey}
              onRevokeApiKey={handleRevokeApiKey}
              onRenameWorkspace={handleRenameWorkspace}
              onSelectProject={(proj) => setCurrentProject(proj)}
              themeMode={themeMode}
              onSetThemeMode={setThemeMode}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel adminStats={adminStats} />
          )}

          {activeTab === 'sandbox' && (
            <DemoSandbox project={currentProject} onRefreshAnalytics={refreshData} />
          )}

          {activeTab === 'docs' && (
            <DeveloperDocs />
          )}
          </>)}
        </main>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(proj) => setCurrentProject(proj)}
        timeframe={timeframe}
        selectedDate={selectedDate}
        onSelectTimeframe={(tf) => setTimeframe(tf)}
        onSelectDate={(date) => setSelectedDate(date)}
        themeMode={themeMode}
        onSetThemeMode={setThemeMode}
        onOpenDemo={() => setActiveTab('sandbox')}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentProject={currentProject}
        currentWorkspace={currentWorkspace}
        timeframe={timeframe}
        date={selectedDate}
        stats={overviewStats}
      />
    </div>
  );
}
