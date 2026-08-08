import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Radio,
  Users,
  Activity,
  ShieldAlert,
  GitMerge,
  Flame,
  HelpCircle,
  Settings,
  ShieldCheck,
  Code2,
  Sparkles,
  Download,
  Moon,
  Sun,
  MonitorSmartphone,
  Layers,
  Clock,
  ArrowRight,
  Terminal,
  CalendarX2,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { Project, Timeframe, ThemeMode } from '../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  projects: Project[];
  currentProject: Project;
  onSelectProject: (project: Project) => void;
  timeframe: Timeframe;
  selectedDate: string | null;
  onSelectTimeframe: (tf: Timeframe) => void;
  onSelectDate: (date: string | null) => void;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  onOpenDemo: () => void;
  onOpenExport: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: 'Navigation' | 'Projects' | 'Timeframe' | 'Quick Actions';
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  projects,
  currentProject,
  onSelectProject,
  timeframe,
  selectedDate,
  onSelectTimeframe,
  onSelectDate,
  themeMode,
  onSetThemeMode,
  onOpenDemo,
  onOpenExport,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items list
  const items: CommandItem[] = [
    // Navigation items
    {
      id: 'tab-overview',
      label: 'Overview Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => {
        onSelectTab('overview');
        onClose();
      },
    },
    {
      id: 'tab-live',
      label: 'Realtime Traffic Feed',
      category: 'Navigation',
      icon: Radio,
      badge: 'LIVE',
      action: () => {
        onSelectTab('live');
        onClose();
      },
    },
    {
      id: 'tab-sessions',
      label: 'User Sessions Explorer',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onSelectTab('sessions');
        onClose();
      },
    },
    {
      id: 'tab-users',
      label: 'User Directory & Profiles',
      category: 'Navigation',
      icon: Users,
      action: () => {
        onSelectTab('users');
        onClose();
      },
    },
    {
      id: 'tab-events',
      label: 'Custom Events Log',
      category: 'Navigation',
      icon: Activity,
      action: () => {
        onSelectTab('events');
        onClose();
      },
    },
    {
      id: 'tab-performance',
      label: 'Web Vitals & Performance',
      category: 'Navigation',
      icon: Activity,
      action: () => {
        onSelectTab('performance');
        onClose();
      },
    },
    {
      id: 'tab-errors',
      label: 'Error & Crash Monitoring',
      category: 'Navigation',
      icon: ShieldAlert,
      action: () => {
        onSelectTab('errors');
        onClose();
      },
    },
    {
      id: 'tab-funnels',
      label: 'Funnels & Conversion Analytics',
      category: 'Navigation',
      icon: GitMerge,
      action: () => {
        onSelectTab('funnels');
        onClose();
      },
    },
    {
      id: 'tab-heatmaps',
      label: 'Heatmaps & Click Tracking',
      category: 'Navigation',
      icon: Flame,
      action: () => {
        onSelectTab('heatmaps');
        onClose();
      },
    },
    {
      id: 'tab-support',
      label: 'Support Desk & Telemetry',
      category: 'Navigation',
      icon: HelpCircle,
      action: () => {
        onSelectTab('support');
        onClose();
      },
    },
    {
      id: 'tab-settings',
      label: 'Workspace Settings & API Keys',
      category: 'Navigation',
      icon: Settings,
      action: () => {
        onSelectTab('settings');
        onClose();
      },
    },
    {
      id: 'tab-admin',
      label: 'Platform Admin Control',
      category: 'Navigation',
      icon: ShieldCheck,
      action: () => {
        onSelectTab('admin');
        onClose();
      },
    },
    {
      id: 'tab-sandbox',
      label: 'Live Tracking Sandbox',
      category: 'Navigation',
      icon: Terminal,
      action: () => {
        onSelectTab('sandbox');
        onClose();
      },
    },
    {
      id: 'tab-docs',
      label: 'Developer SDK & API Docs',
      category: 'Navigation',
      icon: Code2,
      action: () => {
        onSelectTab('docs');
        onClose();
      },
    },

    // Projects
    ...projects.map((proj) => ({
      id: `proj-${proj.id}`,
      label: `Switch Project: ${proj.name}`,
      category: 'Projects' as const,
      icon: Layers,
      badge: proj.id === currentProject.id ? 'ACTIVE' : undefined,
      action: () => {
        onSelectProject(proj);
        onClose();
      },
    })),

    // Timeframes
    ...(['1h', '24h', '7d', '30d'] as Timeframe[]).map((tf) => ({
      id: `tf-${tf}`,
      label: `Set Timeframe to ${tf.toUpperCase()}`,
      category: 'Timeframe' as const,
      icon: Clock,
      badge: tf === timeframe && !selectedDate ? 'CURRENT' : undefined,
      action: () => {
        onSelectTimeframe(tf);
        onSelectDate(null);
        onClose();
      },
    })),

    // Quick Actions
    {
      id: 'act-demo',
      label: 'Open Interactive Event Sandbox',
      category: 'Quick Actions',
      icon: Sparkles,
      action: () => {
        onOpenDemo();
        onClose();
      },
    },
    {
      id: 'act-export',
      label: 'Export Analytics Data (CSV / JSON)',
      category: 'Quick Actions',
      icon: Download,
      action: () => {
        onOpenExport();
        onClose();
      },
    },
    ...(selectedDate
      ? [{
          id: 'act-clear-date',
          label: `Clear custom date (${selectedDate})`,
          category: 'Quick Actions' as const,
          icon: CalendarX2,
          action: () => {
            onSelectDate(null);
            onClose();
          },
        }]
      : []),
    {
      id: 'act-theme',
      label:
        themeMode === 'dark'
          ? 'Theme: switch to Light'
          : themeMode === 'light'
          ? 'Theme: switch to Adaptive (system)'
          : 'Theme: switch to Dark',
      category: 'Quick Actions',
      icon: themeMode === 'dark' ? Sun : themeMode === 'light' ? MonitorSmartphone : Moon,
      action: () => {
        onSetThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark');
        onClose();
      },
    },
  ];

  // Filter items by search query
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Group items for display
  const categories = Array.from(new Set(filteredItems.map((item) => item.category)));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-start justify-center pt-16 md:pt-24 px-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-scaleIn"
      >
        {/* Search Header */}
        <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center space-x-3 bg-slate-50 dark:bg-zinc-900/50">
          <Search className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tabs, actions, projects, or shortcuts... (Use ↑↓ arrows)"
            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-hidden"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-3 flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
              No matching tabs or commands found for &quot;{query}&quot;
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredItems.filter((item) => item.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    {cat}
                  </div>
                  {catItems.map((item) => {
                    const globalIndex = filteredItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-medium shadow-sm'
                            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white animate-pulse" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Keyboard Help */}
        <div className="p-2.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-[10px] font-mono border border-slate-300 dark:border-zinc-700">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-[10px] font-mono border border-slate-300 dark:border-zinc-700">↵</kbd>
              <span>Select</span>
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700">⌘K</kbd> anywhere
          </div>
        </div>
      </div>
    </div>
  );
};
