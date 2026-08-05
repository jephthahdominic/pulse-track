import React from 'react';
import {
  Activity,
  ChevronDown,
  Clock,
  Search,
  Moon,
  Sun,
  Layers,
  Sparkles,
  Plus,
  Key,
  ShieldCheck,
  Download,
  LogOut,
} from 'lucide-react';
import { Project, Workspace, Timeframe } from '../types';

interface HeaderNavbarProps {
  currentWorkspace: Workspace;
  currentProject: Project;
  projects: Project[];
  workspaces: Workspace[];
  timeframe: Timeframe;
  onSelectProject: (project: Project) => void;
  onSelectTimeframe: (timeframe: Timeframe) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenDemo: () => void;
  onOpenExport: () => void;
  onOpenCommandPalette?: () => void;
  onLogout?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentWorkspace,
  currentProject,
  projects,
  timeframe,
  onSelectProject,
  onSelectTimeframe,
  darkMode,
  onToggleDarkMode,
  onOpenDemo,
  onOpenExport,
  onOpenCommandPalette,
  onLogout,
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = React.useState(false);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Logo & Project Switcher */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            P
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-zinc-100">
              PulseTrack
            </span>
            <span className="hidden sm:flex items-center space-x-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center space-x-2 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span className="max-w-[140px] truncate">{currentProject.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-64 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl py-1 z-50 text-xs">
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
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
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
        <div className="flex items-center bg-slate-100 dark:bg-zinc-900 rounded p-0.5 border border-slate-200/80 dark:border-zinc-800 text-xs">
          {(['1h', '24h', '7d', '30d'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                timeframe === tf
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-blue-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-1.5 rounded text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Avatar + Logout */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-zinc-800">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5">
            <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              AR
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded text-slate-500 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
