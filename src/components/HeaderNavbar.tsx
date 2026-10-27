import React from 'react';
import {
  Activity,
  ChevronDown,
  Check,
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
import { PeriodSelect } from './PeriodSelect';
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

  const ghostBase = 'h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer';
  const ghost = `${ghostBase} text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]`;

  return (
    <header className="h-14 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 border-b border-slate-200/70 dark:border-white/[0.06] bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md transition-colors">
      {/* Left: menu, logo, project */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenMobileNav && (
          <button
            onClick={onOpenMobileNav}
            className={`md:hidden w-8 flex items-center justify-center shrink-0 ${ghost}`}
            aria-label="Open navigation"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
        )}

        <div className="hidden min-[360px]:flex items-center">
          {/* Small square mark on phones, full wordmark (theme-matched) from sm up */}
          <img src="/icon-192.png" alt="PulseTrack" width={28} height={28} className="w-7 h-7 rounded-lg shrink-0 sm:hidden" />
          <img src="/logo.png" alt="PulseTrack" width={113} height={24} className="hidden sm:block dark:sm:hidden h-6 w-auto shrink-0" />
          <img src="/logo-dark.png" alt="PulseTrack" width={113} height={24} className="hidden dark:sm:block h-6 w-auto shrink-0" />
        </div>

        <span className="hidden sm:block text-slate-300 dark:text-zinc-700 text-lg font-light select-none" aria-hidden>/</span>

        {/* Project selector */}
        <div className="relative min-w-0" ref={projectDropdownRef}>
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            aria-expanded={showProjectDropdown}
            className={`flex items-center gap-2 px-2.5 max-w-[38vw] sm:max-w-none ${ghost} text-slate-800 dark:text-zinc-100`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentProject.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="max-w-[70px] sm:max-w-[160px] truncate">{currentProject.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-1.5 z-50 text-xs max-h-[70vh] overflow-y-auto">
              <div className="px-2.5 pt-1.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Projects · {currentWorkspace.name}
              </div>
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    setShowProjectDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                    proj.id === currentProject.id
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{proj.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{proj.domain}</div>
                  </div>
                  {proj.id === currentProject.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: tools */}
      <div className="relative flex items-center gap-1 sm:gap-1.5 z-[60] shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className={`hidden lg:flex items-center justify-between gap-2 px-3 w-44 xl:w-56 bg-slate-100/70 dark:bg-white/[0.05] text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] ${ghost}`}
          title="Quick switch (⌘K or Ctrl+K)"
        >
          <span className="flex items-center gap-2 truncate"><Search className="w-3.5 h-3.5" /><span className="truncate">Search…</span></span>
          <kbd className="hidden xl:inline text-[10px] font-mono text-slate-400 dark:text-zinc-500">⌘K</kbd>
        </button>

        <button
          onClick={onOpenDemo}
          className={`hidden xl:flex items-center gap-1.5 px-3 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 ${ghostBase}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sandbox</span>
        </button>

        <button
          onClick={onOpenExport}
          className={`hidden min-[360px]:flex w-8 items-center justify-center ${ghost}`}
          title="Export reports (CSV / JSON)"
          aria-label="Export data"
        >
          <Download className="w-4 h-4" />
        </button>

        <div className="hidden sm:block">
          <PeriodSelect
            timeframe={timeframe}
            hasCustomDate={!!selectedDate}
            onChange={(tf) => { onSelectDate(null); onSelectTimeframe(tf); }}
          />
        </div>

        <div className="hidden sm:block">
          <DatePicker value={selectedDate} onChange={onSelectDate} />
        </div>

        {/* User menu */}
        <div className="relative flex items-center ml-1" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            title="Account"
            className="flex items-center gap-1 rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-expanded={showUserMenu}
            aria-label="Open profile menu"
          >
            <span className="w-7 h-7 rounded-full bg-[#0b1a38] ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center text-white text-[10px] font-semibold tracking-wide">
              {getInitials(user.name)}
            </span>
            <ChevronDown className={`hidden min-[360px]:block w-3 h-3 text-slate-400 mr-1 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 w-60 max-w-[calc(100vw-1rem)] rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-1.5 z-50 text-xs">
              <div className="px-2.5 py-2">
                <div className="font-semibold text-slate-900 dark:text-zinc-100 truncate">{user.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-500 truncate mt-0.5">{user.email}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-slate-600 dark:text-zinc-300 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
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
