import React, { useState, useEffect } from 'react';
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
  WebVitalMetric,
  UserProfile,
  HeatmapPoint,
} from './types';
import { db } from './services/db';

const AUTH_TOKEN_KEY = 'pulsetrack_auth_token';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
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
  const [funnels, setFunnels] = useState<any[]>([]);

  // Sync dark mode class on document element
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

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

    if (data.projects.length > 0) {
      const mapProject = (p: any): Project => ({
        id: p.id, workspaceId: p.workspaceId || data.workspace.id,
        name: p.name, domain: p.domain, publicKey: p.publicKey, secretKey: p.secretKey,
        status: p.status || 'active', activeVisitors: p.activeVisitors ?? 0,
        totalEvents24h: p.totalEvents24h ?? 0,
        aiInsightsEnabled: p.aiInsightsEnabled !== false,
        healthInsightsEnabled: p.healthInsightsEnabled !== false,
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
      });
      setProjects(data.projects.map(mapProject));
      setCurrentProject(mapProject(data.projects[0]));
    }

    if (data.apiKeys.length > 0) {
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
  const authHeaders = (): Record<string, string> => authToken ? { Authorization: `Bearer ${authToken}` } : {};

  // ── Fetch / Sync data ───────────────────────────────────────────────────────
  const refreshData = async () => {
    try {
      const res = await fetch(
        `/api/v1/analytics/overview?projectId=${currentProject.id}&timeframe=${timeframe}`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        setOverviewStats(await res.json());
      } else {
        setOverviewStats(db.getOverviewStats(currentProject.id, timeframe));
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
      if (sessRes.status === 'fulfilled' && sessRes.value.ok) { const d = await sessRes.value.json(); setSessions(d.sessions); }
      if (evtRes.status === 'fulfilled' && evtRes.value.ok) { const d = await evtRes.value.json(); setCustomEvents(d.events); }
      if (errRes.status === 'fulfilled' && errRes.value.ok) { const d = await errRes.value.json(); setErrorLogs(d.errors); }
      if (ticketRes.status === 'fulfilled' && ticketRes.value.ok) { const d = await ticketRes.value.json(); setSupportTickets(d.tickets); }
      if (vitalsRes.status === 'fulfilled' && vitalsRes.value.ok) { const d = await vitalsRes.value.json(); setWebVitals(d.vitals || []); }
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) { const d = await profileRes.value.json(); setUserProfiles(d.profiles || []); }
      if (heatRes.status === 'fulfilled' && heatRes.value.ok) { const d = await heatRes.value.json(); setHeatmapClicks(d.clicks || []); }
      if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) { const d = await funnelRes.value.json(); setFunnels(d.funnels || []); }
      setAdminStats(db.getAdminStats());
    } catch {
      setOverviewStats(db.getOverviewStats(currentProject.id, timeframe));
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentProject.id, timeframe, authToken]);

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

  const handleRegenerateKeys = async (projectId: string): Promise<{ publicKey: string; secretKey: string }> => {
    if (!isAuthRequired) {
      const pk = `pk_live_demo_${Math.random().toString(36).slice(2, 10)}`;
      const sk = `sk_live_demo_${Math.random().toString(36).slice(2, 10)}`;
      setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, publicKey: pk, secretKey: sk } : p));
      if (currentProject.id === projectId) setCurrentProject((prev) => ({ ...prev, publicKey: pk, secretKey: sk }));
      return { publicKey: pk, secretKey: sk };
    }
    const res = await fetch(`/api/v1/projects/${projectId}/regenerate-keys`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate keys');
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, publicKey: data.publicKey, secretKey: data.secretKey } : p));
    if (currentProject.id === projectId) setCurrentProject((prev) => ({ ...prev, publicKey: data.publicKey, secretKey: data.secretKey }));
    return data;
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

  if (isAuthRequired && !authToken) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`min-h-screen font-sans bg-slate-100 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors ${darkMode ? 'dark' : ''}`}>
      {/* Top Header */}
      <HeaderNavbar
        currentWorkspace={currentWorkspace}
        currentProject={currentProject}
        projects={projects}
        workspaces={workspaces}
        timeframe={timeframe}
        user={currentUser}
        onSelectProject={(proj) => setCurrentProject(proj)}
        onSelectTimeframe={(tf) => setTimeframe(tf)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
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
          {activeTab === 'overview' && (
            <OverviewDashboard
              stats={overviewStats}
              timeframe={timeframe}
              currentProject={currentProject}
              onNavigateTab={(tab: any) => setActiveTab(tab)}
              onOpenExport={() => setIsExportModalOpen(true)}
              authHeaders={authHeaders()}
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
            <SessionsExplorer sessions={sessions} />
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
            <HeatmapVisualizer clicks={heatmapClicks} />
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
              onRegenerateKeys={handleRegenerateKeys}
              onRenameWorkspace={handleRenameWorkspace}
              onSelectProject={(proj) => setCurrentProject(proj)}
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
        onSelectTimeframe={(tf) => setTimeframe(tf)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
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
        stats={overviewStats}
      />
    </div>
  );
}
