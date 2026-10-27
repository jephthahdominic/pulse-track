import React, { useState } from 'react';
import {
  Settings, Key, Copy, Check, Shield, Users, CreditCard, Plus, RefreshCw,
  Globe, Pencil, Pause, Play, Trash2, X, Loader2, ChevronRight,
  Code2, AlertTriangle, MailPlus, CheckCircle2, Sparkles, HeartPulse,
  Sun, Moon, MonitorSmartphone, Archive,
} from 'lucide-react';
import { Workspace, Project, ApiKey, ThemeMode } from '../types';

interface SettingsWorkspaceProps {
  workspace: Workspace;
  projects: Project[];
  currentProject: Project;
  apiKeys: ApiKey[];
  authToken: string | null;
  isMongoMode: boolean;
  onCreateProject: (name: string, domain: string) => Promise<Project>;
  onUpdateProject: (id: string, updates: { name?: string; domain?: string; status?: string; aiInsightsEnabled?: boolean; healthInsightsEnabled?: boolean }) => Promise<void>;
  onArchiveProject: (id: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateApiKey: (projectId: string, name: string, type: 'public' | 'secret') => Promise<ApiKey>;
  onRevokeApiKey: (id: string) => Promise<void>;
  onRenameWorkspace: (name: string) => Promise<void>;
  onSelectProject: (project: Project) => void;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
}

type Tab = 'apikeys' | 'workspace' | 'billing';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const isConnected = (p: Project) => !!p.lastEventAt;

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  workspace, projects, currentProject, apiKeys,
  authToken, isMongoMode,
  onCreateProject, onUpdateProject, onArchiveProject, onDeleteProject, onCreateApiKey, onRevokeApiKey, onRenameWorkspace, onSelectProject,
  themeMode, onSetThemeMode,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('apikeys');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit project inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Archive confirm
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  // Permanent delete confirm (must type the project name)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Feature toggles (AI Insights / Health Insights)
  const [featureLoadingId, setFeatureLoadingId] = useState<string | null>(null);

  const toggleFeature = async (p: Project, key: 'aiInsightsEnabled' | 'healthInsightsEnabled') => {
    if (featureLoadingId) return;
    setFeatureLoadingId(p.id);
    try {
      await onUpdateProject(p.id, { [key]: !p[key] });
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    } finally {
      setFeatureLoadingId(null);
    }
  };

  // API keys: create form, one-time reveal of a new key, revoke confirm, per-key setup snippet
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'public' | 'secret'>('public');
  const [newKeyLoading, setNewKeyLoading] = useState(false);
  const [newKeyError, setNewKeyError] = useState('');
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [setupKeyId, setSetupKeyId] = useState<string | null>(null);

  // Workspace rename
  const [wsName, setWsName] = useState(workspace.name);
  const [wsNameLoading, setWsNameLoading] = useState(false);
  const [wsNameSaved, setWsNameSaved] = useState(false);

  // Project detail page (null = project list)
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = projects.find((p) => p.id === detailId) || null;

  const usagePercent = Math.min(100, Math.round((workspace.eventsUsed / workspace.eventQuota) * 100));

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Create Project ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim() || !newDomain.trim()) { setCreateError('Name and domain are required.'); return; }
    setCreateLoading(true); setCreateError('');
    try {
      const proj = await onCreateProject(newName.trim(), newDomain.trim());
      onSelectProject(proj);
      setShowNewProject(false); setNewName(''); setNewDomain('');
      setDetailId(proj.id);
    } catch (e: any) { setCreateError(e.message || 'Failed to create project.'); }
    finally { setCreateLoading(false); }
  };

  // ── Edit Project ───────────────────────────────────────────────────────────
  const startEdit = (p: Project) => { setEditingId(p.id); setEditName(p.name); setEditDomain(p.domain); };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = async (id: string) => {
    setEditLoading(true);
    try { await onUpdateProject(id, { name: editName.trim(), domain: editDomain.trim() }); setEditingId(null); }
    catch { /* parent handles toast */ } finally { setEditLoading(false); }
  };

  // ── Toggle Status ──────────────────────────────────────────────────────────
  const toggleStatus = async (p: Project) => {
    const next = p.status === 'active' ? 'paused' : 'active';
    await onUpdateProject(p.id, { status: next });
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const confirmArchive = async (id: string) => {
    await onArchiveProject(id);
    setArchiveConfirmId(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const cancelDelete = () => { setDeleteConfirmId(null); setDeleteInput(''); setDeleteError(''); };
  const confirmDelete = async (id: string) => {
    setDeleteLoading(true); setDeleteError('');
    try {
      await onDeleteProject(id);
      if (detailId === id) setDetailId(null);
      cancelDelete();
    } catch (e: any) { setDeleteError(e.message || 'Failed to delete project.'); }
    finally { setDeleteLoading(false); }
  };

  // ── API keys ───────────────────────────────────────────────────────────────
  const openNewKey = () => { setNewKeyName(''); setNewKeyType('public'); setNewKeyError(''); setShowNewKey(true); };
  const handleCreateKey = async (projectId: string) => {
    if (!newKeyName.trim()) { setNewKeyError('Give the key a name.'); return; }
    setNewKeyLoading(true); setNewKeyError('');
    try {
      const k = await onCreateApiKey(projectId, newKeyName.trim(), newKeyType);
      setJustCreatedId(k.id); setShowNewKey(false);
      if (k.type === 'public') setSetupKeyId(k.id);
    } catch (e: any) { setNewKeyError(e.message || 'Failed to create key.'); }
    finally { setNewKeyLoading(false); }
  };
  const handleRevokeKey = async (id: string) => {
    setRevokeLoading(true);
    try { await onRevokeApiKey(id); if (setupKeyId === id) setSetupKeyId(null); }
    finally { setRevokeLoading(false); setRevokeConfirmId(null); }
  };
  const toggleReveal = (id: string) => setRevealedKeys((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const snippetFor = (key: string) => `<script src="${window.location.origin}/tracker.min.js" data-key="${key}" async></script>`;

  // ── Rename Workspace ───────────────────────────────────────────────────────
  const handleRenameWs = async () => {
    if (!wsName.trim() || wsName === workspace.name) return;
    setWsNameLoading(true);
    try { await onRenameWorkspace(wsName.trim()); setWsNameSaved(true); setTimeout(() => setWsNameSaved(false), 3000); }
    finally { setWsNameLoading(false); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'apikeys', label: 'Projects & API Keys' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace & Project Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{workspace.name} · {projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {!isMongoMode && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Demo mode — connect MongoDB to save changes
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── API Keys tab: project list ─────────────────────────────────────────── */}
      {activeTab === 'apikeys' && !detail && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              {projects.filter(isConnected).length} of {projects.length} connected
            </span>
            {!showNewProject && (
              <button onClick={() => setShowNewProject(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New project
              </button>
            )}
          </div>

          {showNewProject && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">New Project</span>
                <button onClick={() => { setShowNewProject(false); setCreateError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Project Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My App" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Domain</label>
                  <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="myapp.com" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewProject(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                <button onClick={handleCreate} disabled={createLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5">
                  {createLoading && <Loader2 className="w-3 h-3 animate-spin" />} Create Project
                </button>
              </div>
            </div>
          )}

          {projects.length === 0 && !showNewProject && (
            <p className="text-xs text-slate-500 py-8 text-center">No projects yet. Create one to start tracking a website.</p>
          )}

          <div className="space-y-2">
            {projects.map((p) => (
              <button key={p.id} onClick={() => setDetailId(p.id)}
                className={`w-full text-left p-4 rounded-2xl bg-white dark:bg-slate-900 border ${p.id === currentProject.id ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800'} shadow-sm hover:border-indigo-400 transition-colors flex items-center justify-between gap-3 flex-wrap`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                    <Globe className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[p.status] || statusColors.active}`}>{p.status}</span>
                    </div>
                    <span className="text-xs text-slate-500 truncate block">{p.domain} · {apiKeys.filter((k) => k.projectId === p.id).length} key(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConnected(p) ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
                  ) : (
                    <span className="text-xs text-slate-400">Not connected yet</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── API Keys tab: project detail ───────────────────────────────────────── */}
      {activeTab === 'apikeys' && detail && (() => {
        const p = detail;
        const keys = apiKeys.filter((k) => k.projectId === p.id);
        const archived = p.status === 'archived';
        return (
          <div className="space-y-4">
            <button onClick={() => setDetailId(null)} className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1">
              <ChevronRight className="w-3 h-3 rotate-180" /> All projects
            </button>

            {/* Overview + controls */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              {editingId === p.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Domain</label>
                      <input value={editDomain} onChange={(e) => setEditDomain(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                    <button onClick={() => saveEdit(p.id)} disabled={editLoading}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5">
                      {editLoading && <Loader2 className="w-3 h-3 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{p.name}</h3>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[p.status] || statusColors.active}`}>{p.status}</span>
                      {p.id === currentProject.id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">VIEWING</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{p.domain}</p>
                  </div>
                  {deleteConfirmId !== p.id && archiveConfirmId !== p.id && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.id !== currentProject.id && !archived && (
                        <button onClick={() => onSelectProject(p)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">View data</button>
                      )}
                      {!archived && (
                        <>
                          <button onClick={() => startEdit(p)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                          <button onClick={() => toggleStatus(p)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${p.status === 'active' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'}`}>
                            {p.status === 'active' ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                          </button>
                          <button onClick={() => setArchiveConfirmId(p.id)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>
                        </>
                      )}
                      {archived && (
                        <button onClick={() => onUpdateProject(p.id, { status: 'active' })} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-1"><Play className="w-3 h-3" /> Restore</button>
                      )}
                      <button onClick={() => { setDeleteConfirmId(p.id); setDeleteInput(''); setDeleteError(''); }} className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                    </div>
                  )}
                </div>
              )}

              {archiveConfirmId === p.id && (
                <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs text-slate-700 dark:text-slate-300">Archive <strong>{p.name}</strong>? Tracking will stop and data is preserved.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setArchiveConfirmId(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={() => confirmArchive(p.id)} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold">Archive</button>
                  </div>
                </div>
              )}

              {deleteConfirmId === p.id && (
                <div className="space-y-3 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    <strong className="text-red-600 dark:text-red-400">Permanently delete {p.name}?</strong> This removes the project, its API keys, and all of its events and sessions. This cannot be undone.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Type <span className="font-mono normal-case">{p.name}</span> to confirm</label>
                    <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} autoFocus
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white" />
                  </div>
                  {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelDelete} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={() => confirmDelete(p.id)} disabled={deleteInput.trim() !== p.name || deleteLoading}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5">
                      {deleteLoading && <Loader2 className="w-3 h-3 animate-spin" />} Delete forever
                    </button>
                  </div>
                </div>
              )}

              {/* Connection / last active */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                {isConnected(p) ? (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected · last active {new Date(p.lastEventAt!).toLocaleString()}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for first event</p>
                )}
                {(p.seenHosts || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Seen from:</span>
                    {p.seenHosts!.map((h) => {
                      const bare = (d: string) => d.replace(/^www\./, '').toLowerCase();
                      const matches = bare(h) === bare(p.domain) || bare(h).endsWith('.' + bare(p.domain));
                      return (
                        <span key={h} title={matches ? 'Matches the project domain' : `Does not match ${p.domain}`}
                          className={`px-1.5 py-0.5 rounded font-mono ${matches ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'}`}>
                          {h}{!matches && ' ⚠'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI & Insights toggles */}
              {!archived && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: 'aiInsightsEnabled', label: 'AI Insights', desc: 'Gemini diagnostics & smart analysis', Icon: Sparkles, on: 'bg-indigo-600', icon: 'text-indigo-500' },
                    { key: 'healthInsightsEnabled', label: 'Health Insights', desc: 'Core Web Vitals health score', Icon: HeartPulse, on: 'bg-emerald-600', icon: 'text-emerald-500' },
                  ] as const).map(({ key, label, desc, Icon, on, icon }) => (
                    <button key={key} onClick={() => toggleFeature(p, key)} disabled={featureLoadingId === p.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-60">
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${p[key] ? icon : 'text-slate-400'}`} />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                          <span className="block text-[10px] text-slate-400">{desc}</span>
                        </span>
                      </span>
                      {featureLoadingId === p.id ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : (
                        <span className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors shrink-0 ${p[key] ? on : 'bg-slate-300 dark:bg-slate-700'}`}>
                          <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-transform ${p[key] ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API keys for this project */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Key className="w-4 h-4 text-indigo-500" /> API Keys</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Create as many keys as you need for this project and revoke any at any time.</p>
                </div>
                {!showNewKey && !archived && (
                  <button onClick={openNewKey} className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Create API key
                  </button>
                )}
              </div>

              {showNewKey && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Name</label>
                      <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} autoFocus placeholder="e.g. Production site"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateKey(p.id); }}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Type</label>
                      <select value={newKeyType} onChange={(e) => setNewKeyType(e.target.value as 'public' | 'secret')}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                        <option value="public">Client (browser SDK)</option>
                        <option value="secret">Server (secret)</option>
                      </select>
                    </div>
                  </div>
                  {newKeyError && <p className="text-xs text-red-500">{newKeyError}</p>}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowNewKey(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                    <button onClick={() => handleCreateKey(p.id)} disabled={newKeyLoading}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5">
                      {newKeyLoading && <Loader2 className="w-3 h-3 animate-spin" />} Create key
                    </button>
                  </div>
                </div>
              )}

              {keys.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No API keys yet. Create one to connect your website.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {keys.map((k) => {
                    const isSecret = k.type === 'secret';
                    const shown = !isSecret || revealedKeys.has(k.id);
                    return (
                      <div key={k.id} className={`py-3 space-y-2 ${justCreatedId === k.id ? 'bg-emerald-50/60 dark:bg-emerald-950/20 -mx-2 px-2 rounded-lg' : ''}`}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{k.name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSecret ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}`}>{isSecret ? 'SERVER · SECRET' : 'CLIENT'}</span>
                              {justCreatedId === k.id && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">New</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Created {new Date(k.createdAt).toLocaleDateString()} · {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'Never used'}</p>
                          </div>
                          {revokeConfirmId === k.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600 dark:text-red-400">Revoke? Sites using it stop reporting.</span>
                              <button onClick={() => setRevokeConfirmId(null)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                              <button onClick={() => handleRevokeKey(k.id)} disabled={revokeLoading}
                                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1">
                                {revokeLoading && <Loader2 className="w-3 h-3 animate-spin" />} Revoke
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {!isSecret && (
                                <button onClick={() => setSetupKeyId(setupKeyId === k.id ? null : k.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1">
                                  <Code2 className="w-3 h-3" /> Setup
                                </button>
                              )}
                              <button onClick={() => setRevokeConfirmId(k.id)} title="Revoke key"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input readOnly type={shown ? 'text' : 'password'} value={k.key}
                            className={`flex-1 px-3 py-2 rounded-lg bg-slate-950 font-mono text-xs border border-slate-800 focus:outline-none ${isSecret ? 'text-emerald-400' : 'text-cyan-400'}`} />
                          {isSecret && (
                            <button onClick={() => toggleReveal(k.id)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-medium">{shown ? 'Hide' : 'Show'}</button>
                          )}
                          <button onClick={() => copy(k.key, `key-${k.id}`)} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                            {copiedKey === `key-${k.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        {setupKeyId === k.id && !isSecret && (
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">SDK Quickstart</span>
                            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">{`<!-- Paste inside <head> of your website -->
<script
  src="${window.location.origin}/tracker.min.js"
  data-key="${k.key}"
  async
></script>`}</pre>
                            <button onClick={() => copy(snippetFor(k.key), `snippet-${k.id}`)}
                              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                              {copiedKey === `snippet-${k.id}` ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy snippet</>}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Workspace Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'workspace' && (
        <div className="space-y-6">
          {/* Group: General */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Settings className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">General</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Rename workspace */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-indigo-500" /> Workspace Settings
                </h3>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Workspace Name</label>
                  <input value={wsName} onChange={(e) => setWsName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Slug</label>
                  <input readOnly value={workspace.slug} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 font-mono" />
                </div>
                <button onClick={handleRenameWs} disabled={wsNameLoading || wsName === workspace.name}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all">
                  {wsNameLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : wsNameSaved ? <CheckCircle2 className="w-3 h-3 text-emerald-300" /> : null}
                  {wsNameSaved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>

              {/* Members */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" /> Members ({workspace.members.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {workspace.members.map((m, i) => (
                    <div key={m.id || i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.email}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.role === 'owner' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Invite placeholder */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <input placeholder="colleague@company.com" disabled={!isMongoMode}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none disabled:opacity-50" />
                    <button disabled={!isMongoMode} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                      <MailPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {!isMongoMode && <p className="text-[10px] text-slate-400 mt-1.5">Member invites require MongoDB connection.</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Group: Appearance */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <MonitorSmartphone className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Appearance</h3>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MonitorSmartphone className="w-4 h-4 text-indigo-500" /> Appearance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose how the dashboard looks on this device.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { mode: 'light', label: 'Light', icon: Sun, desc: 'Always light' },
                  { mode: 'dark', label: 'Dark', icon: Moon, desc: 'Always dark' },
                  { mode: 'system', label: 'Adaptive', icon: MonitorSmartphone, desc: 'Follow device theme' },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  const active = themeMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => onSetThemeMode(opt.mode)}
                      aria-pressed={active}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-xs font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {opt.label}
                        </span>
                        <span className="block text-[10px] text-slate-400">{opt.desc}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {themeMode === 'system' && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Adaptive mode is on — the dashboard automatically matches your device's light/dark setting.
                </p>
              )}
            </div>
          </section>

          {/* Group: Danger Zone */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-bold text-red-700 dark:text-red-400">Danger Zone</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deleting a workspace is irreversible and will remove all projects, events, sessions, and API keys permanently.</p>
              <button disabled className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-all">
                Delete Workspace
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Billing Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-indigo-500" /> Current Plan</h3>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">{workspace.plan.toUpperCase()}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Monthly Event Ingestion</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {workspace.eventsUsed.toLocaleString()} / {workspace.eventQuota.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 60 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{usagePercent}% used</span>
                <span>{(workspace.eventQuota - workspace.eventsUsed).toLocaleString()} events remaining</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['Free', '100K events/mo', 'bg-slate-100 dark:bg-slate-800'], ['Pro', '5M events/mo', 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'], ['Business', '50M events/mo', 'bg-slate-100 dark:bg-slate-800']].map(([plan, quota, cls]) => (
                <div key={plan} className={`p-3 rounded-xl ${cls} space-y-1`}>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{plan}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{quota}</div>
                  <div className={`text-[10px] font-semibold ${workspace.plan === plan ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{workspace.plan === plan ? '✓ Current' : 'Upgrade'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Usage This Month</h3>
            <div className="space-y-2 text-xs">
              {[['Projects', `${projects.length}`], ['Active Projects', `${projects.filter((p) => p.status === 'active').length}`], ['Team Members', `${workspace.members.length}`]].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{val}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
