import React from 'react';
import {
  Activity,
  ChevronDown,
  Clock,
  Search,
  Layers,
  Sparkles,
  Plus,
  Key,
  ShieldCheck,
  Download,
  LogOut,
  Menu,
} from 'lucide-react';
import { Project, Workspace, User, Timeframe } from '../types';
import { DatePicker } from './DatePicker';

interface HeaderNavbarProps {
  currentWorkspace: Workspace;
  currentProject: Project;
  projects: Project[];
  workspaces: Workspace[];
  timeframe: Timeframe;
  selectedDate: string | null;
  user: User;
  onSelectProject: (project: Project) => void;
  onSelectTimeframe: (timeframe: Timeframe) => void;
  onSelectDate: (date: string | null) => void;
  onOpenDemo: () => void;
  onOpenExport: () => void;
  onOpenCommandPalette?: () => void;
  onOpenMobileNav?: () => void;
  onLogout?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentWorkspace,
  currentProject,
  projects,
  timeframe,
  selectedDate,
  user,
  onSelectProject,
  onSelectTimeframe,
  onSelectDate,
  onOpenDemo,
  onOpenExport,
  onOpenCommandPalette,
  onOpenMobileNav,
  onLogout,
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const projectDropdownRef = React.useRef<HTMLDivElement>(null);

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Logo & Project Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-1.5 rounded text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] shrink-0">
            P
          </div>
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline font-semibold text-sm tracking-tight text-slate-900 dark:text-zinc-100">
              PulseTrack
            </span>
            <span className="hidden sm:flex items-center space-x-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block shrink-0" />

        {/* Project Selector Dropdown */}
        <div className="relative min-w-0" ref={projectDropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800 transition-all max-w-[38vw] sm:max-w-none"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="max-w-[70px] sm:max-w-[140px] truncate">{currentProject.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl py-1 z-50 text-xs max-h-[70vh] overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                Projects in {currentWorkspace.name}
              </div>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    setShowProjectDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/70 ${
                    proj.id === currentProject.id ? 'bg-indigo-50/50 dark:bg-zinc-800/80 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-medium truncate">{proj.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{proj.domain}</div>
                  </div>
                  {proj.id === currentProject.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="relative flex items-center space-x-3 z-[60]">
        {/* Quick Search / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center justify-between h-8 px-2.5 rounded border border-slate-200 dark:border-zinc-800 bg-slate-100/60 hover:bg-slate-200/60 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/60 text-xs text-slate-500 dark:text-zinc-400 w-48 sm:w-56 transition-all cursor-pointer group"
          title="Open Command Palette (⌘K or Ctrl+K)"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="truncate">Quick switch tab...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Live Demo Trigger */}
        <button
          onClick={onOpenDemo}
          className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Live Sandbox</span>
        </button>

        {/* Export Data Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
          title="Export Reports (CSV / JSON)"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Export Data</span>
        </button>

        {/* Timeframe Selector */}
        <div className={`hidden sm:flex items-center bg-slate-100 dark:bg-zinc-900 rounded p-0.5 border border-slate-200/80 dark:border-zinc-800 text-xs ${selectedDate ? 'opacity-60' : ''}`}>
          {(['1h', '24h', '7d', '30d'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => { onSelectDate(null); onSelectTimeframe(tf); }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                timeframe === tf && !selectedDate
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Calendar / Date Picker (desktop+ — mobile uses the Overview filter strip) */}
        <div className="hidden sm:block">
          <DatePicker value={selectedDate} onChange={onSelectDate} />
        </div>

        {/* User Profile Menu */}
        <div className="relative flex items-center pl-2 border-l border-slate-200 dark:border-zinc-800" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            title="Open profile menu"
            className="flex items-center space-x-1.5 rounded p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-expanded={showUserMenu}
            aria-label="Open profile menu"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
              <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                {getInitials(user.name)}
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-1.5 w-56 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800">
                <div className="font-semibold text-slate-900 dark:text-zinc-100 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate mt-0.5">{user.email}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 mt-1 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
