import React, { useState } from 'react';
import {
  Settings, Key, Copy, Check, Shield, Users, CreditCard, Plus, RefreshCw,
  Globe, Pencil, Pause, Play, Trash2, X, Loader2, ChevronRight,
  Code2, AlertTriangle, MailPlus, CheckCircle2, Sparkles, HeartPulse,
} from 'lucide-react';
import { Workspace, Project, ApiKey } from '../types';

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
  onRegenerateKeys: (projectId: string) => Promise<{ publicKey: string; secretKey: string }>;
  onRenameWorkspace: (name: string) => Promise<void>;
  onSelectProject: (project: Project) => void;
}

type Tab = 'projects' | 'apikeys' | 'workspace' | 'billing';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  workspace, projects, currentProject, apiKeys,
  authToken, isMongoMode,
  onCreateProject, onUpdateProject, onArchiveProject, onRegenerateKeys, onRenameWorkspace, onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState(false);

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

  // Regenerate keys
  const [regenConfirmId, setRegenConfirmId] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);

  // Workspace rename
  const [wsName, setWsName] = useState(workspace.name);
  const [wsNameLoading, setWsNameLoading] = useState(false);
  const [wsNameSaved, setWsNameSaved] = useState(false);

  // Selected project for API keys tab (default to current)
  const [keysProjectId, setKeysProjectId] = useState(currentProject.id);
  const keysProject = projects.find((p) => p.id === keysProjectId) || currentProject;

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
      setActiveTab('apikeys'); setKeysProjectId(proj.id);
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

  // ── Regenerate Keys ────────────────────────────────────────────────────────
  const handleRegen = async (id: string) => {
    setRegenLoading(true);
    try { await onRegenerateKeys(id); }
    finally { setRegenLoading(false); setRegenConfirmId(null); }
  };

  // ── Rename Workspace ───────────────────────────────────────────────────────
  const handleRenameWs = async () => {
    if (!wsName.trim() || wsName === workspace.name) return;
    setWsNameLoading(true);
    try { await onRenameWorkspace(wsName.trim()); setWsNameSaved(true); setTimeout(() => setWsNameSaved(false), 3000); }
    finally { setWsNameLoading(false); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'apikeys', label: 'API Keys' },
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

      {/* ── Projects Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* New project trigger */}
          {!showNewProject ? (
            <button onClick={() => setShowNewProject(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium transition-all w-full">
              <Plus className="w-4 h-4" /> <span>Add New Project</span>
            </button>
          ) : (
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

          {/* Projects list */}
          {projects.map((p) => (
            <div key={p.id} className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${p.id === currentProject.id ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800'} shadow-sm`}>
              {editingId === p.id ? (
                /* Edit mode */
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
              ) : archiveConfirmId === p.id ? (
                /* Archive confirm */
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-700 dark:text-slate-300">Archive <strong>{p.name}</strong>? Tracking will stop and data is preserved.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setArchiveConfirmId(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={() => confirmArchive(p.id)} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold">Archive</button>
                  </div>
                </div>
              ) : (
                /* Normal view */
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.id === currentProject.id ? 'bg-indigo-100 dark:bg-indigo-950/60' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Globe className={`w-4 h-4 ${p.id === currentProject.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                        {p.id === currentProject.id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">ACTIVE</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 truncate">{p.domain}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[p.status] || statusColors.active}`}>{p.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.id !== currentProject.id && p.status !== 'archived' && (
                      <button onClick={() => onSelectProject(p)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => { setKeysProjectId(p.id); setActiveTab('apikeys'); }}
                      title="Manage API Keys"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
                      <Key className="w-3.5 h-3.5" />
                    </button>
                    {p.status !== 'archived' && (
                      <>
                        <button onClick={() => startEdit(p)} title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleStatus(p)} title={p.status === 'active' ? 'Pause tracking' : 'Resume tracking'}
                          className={`p-1.5 rounded-lg transition-colors ${p.status === 'active' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}>
                          {p.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setArchiveConfirmId(p.id)} title="Archive project"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* AI & Insights feature toggles */}
              {p.status !== 'archived' && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleFeature(p, 'aiInsightsEnabled')}
                    disabled={featureLoadingId === p.id}
                    title={p.aiInsightsEnabled ? 'Disable AI Insights for this project' : 'Enable AI Insights for this project'}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${p.aiInsightsEnabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">AI Insights</span>
                        <span className="block text-[10px] text-slate-400">Gemini diagnostics &amp; smart analysis</span>
                      </span>
                    </span>
                    {featureLoadingId === p.id ? (
                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                    ) : (
                      <span className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors shrink-0 ${p.aiInsightsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-transform ${p.aiInsightsEnabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => toggleFeature(p, 'healthInsightsEnabled')}
                    disabled={featureLoadingId === p.id}
                    title={p.healthInsightsEnabled ? 'Disable Health Insights for this project' : 'Enable Health Insights for this project'}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <HeartPulse className={`w-3.5 h-3.5 shrink-0 ${p.healthInsightsEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Health Insights</span>
                        <span className="block text-[10px] text-slate-400">Core Web Vitals health score</span>
                      </span>
                    </span>
                    {featureLoadingId === p.id ? (
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                    ) : (
                      <span className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors shrink-0 ${p.healthInsightsEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-transform ${p.healthInsightsEnabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Embed script snippet */}
              {p.status !== 'archived' && editingId !== p.id && archiveConfirmId !== p.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Code2 className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Embed Script</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-cyan-400 bg-slate-950 rounded-lg px-3 py-2 truncate border border-slate-800">
                      {`<script src="${window.location.origin}/tracker.min.js" data-key="${p.publicKey}" async></script>`}
                    </code>
                    <button onClick={() => copy(`<script src="${window.location.origin}/tracker.min.js" data-key="${p.publicKey}" async></script>`, `embed-${p.id}`)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex-shrink-0">
                      {copiedKey === `embed-${p.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── API Keys Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'apikeys' && (
        <div className="space-y-4">
          {/* Project selector */}
          {projects.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {projects.filter((p) => p.status !== 'archived').map((p) => (
                <button key={p.id} onClick={() => setKeysProjectId(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${keysProjectId === p.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-500" /> API Keys — {keysProject.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Use these credentials to initialise the PulseTrack SDK</p>
              </div>
              {regenConfirmId === keysProject.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-600 dark:text-amber-400">Invalidate current keys?</span>
                  <button onClick={() => setRegenConfirmId(null)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                  <button onClick={() => handleRegen(keysProject.id)} disabled={regenLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold flex items-center gap-1">
                    {regenLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Confirm
                  </button>
                </div>
              ) : (
                <button onClick={() => setRegenConfirmId(keysProject.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all">
                  <RefreshCw className="w-3 h-3" /> Regenerate Keys
                </button>
              )}
            </div>

            {/* Public key */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Public Key (Client SDK)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">CLIENT SAFE</span>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={keysProject.publicKey} className="flex-1 px-3 py-2 rounded-lg bg-slate-950 text-cyan-400 font-mono text-xs border border-slate-800 focus:outline-none" />
                <button onClick={() => copy(keysProject.publicKey, 'pub')} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                  {copiedKey === 'pub' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret key */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Secret Key (Server API)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">SECRET — KEEP SAFE</span>
              </div>
              <div className="flex items-center gap-2">
                <input readOnly type={revealSecret ? 'text' : 'password'} value={keysProject.secretKey} className="flex-1 px-3 py-2 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 focus:outline-none" />
                <button onClick={() => setRevealSecret((v) => !v)} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-medium">{revealSecret ? 'Hide' : 'Show'}</button>
                <button onClick={() => copy(keysProject.secretKey, 'sec')} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                  {copiedKey === 'sec' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quickstart */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">SDK Quickstart</span>
              <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">{`<!-- Paste inside <head> of your website -->
<script
  src="${window.location.origin}/tracker.min.js"
  data-key="${keysProject.publicKey}"
  async
></script>`}</pre>
              <button onClick={() => copy(`<script src="${window.location.origin}/tracker.min.js" data-key="${keysProject.publicKey}" async></script>`, 'snippet')}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {copiedKey === 'snippet' ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy snippet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workspace Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'workspace' && (
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

          {/* Danger zone */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-bold text-red-700 dark:text-red-400">Danger Zone</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Deleting a workspace is irreversible and will remove all projects, events, sessions, and API keys permanently.</p>
            <button disabled className="px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 transition-all">
              Delete Workspace
            </button>
          </div>
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
