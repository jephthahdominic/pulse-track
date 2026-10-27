import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Radio,
  Clock,
  Users,
  Zap,
  Gauge,
  AlertTriangle,
  GitMerge,
  MousePointer,
  HelpCircle,
  Settings,
  ShieldAlert,
  Code2,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import { User } from '../types';

export type ActiveTab =
  | 'overview'
  | 'live'
  | 'sessions'
  | 'users'
  | 'events'
  | 'performance'
  | 'errors'
  | 'funnels'
  | 'heatmaps'
  | 'support'
  | 'settings'
  | 'admin'
  | 'sandbox'
  | 'docs';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  openTicketsCount?: number;
  user: User;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, openTicketsCount = 2, user, mobileOpen = false, onCloseMobile }) => {
  // Pinned & Collapsed state persistence
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_pinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('sidebar_pinned', JSON.stringify(isPinned));
  }, [isPinned]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Determine actual expanded visual state
  // If pinned, it is always expanded. If unpinned and collapsed, hovering expands it temporarily.
  // Mobile drawer is always expanded.
  const isMobile = mobileOpen;
  const effectiveCollapsed = isMobile ? false : isPinned ? false : isCollapsed && !isHovered;

  const selectTab = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const togglePin = () => {
    setIsPinned((prev) => {
      const nextPin = !prev;
      if (!nextPin) {
        setIsCollapsed(true); // default to collapsed when unpinned
      }
      return nextPin;
    });
  };

  const toggleCollapse = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsCollapsed(true);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const mainNavItems = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'live' as ActiveTab, label: 'Realtime', icon: Radio, badge: 'LIVE' },
    { id: 'sessions' as ActiveTab, label: 'Sessions', icon: Clock },
    { id: 'users' as ActiveTab, label: 'User Explorer', icon: Users },
    { id: 'events' as ActiveTab, label: 'Custom Events', icon: Zap },
    { id: 'performance' as ActiveTab, label: 'Performance', icon: Gauge },
    { id: 'errors' as ActiveTab, label: 'Errors', icon: AlertTriangle, count: 12 },
    { id: 'funnels' as ActiveTab, label: 'Funnels', icon: GitMerge },
    { id: 'heatmaps' as ActiveTab, label: 'Heatmaps', icon: MousePointer },
    { id: 'support' as ActiveTab, label: 'Support Desk', icon: HelpCircle, count: openTicketsCount },
  ];

  const secondaryNavItems = [
    { id: 'sandbox' as ActiveTab, label: 'Live Sandbox', icon: Sparkles, highlight: true },
    { id: 'docs' as ActiveTab, label: 'API & SDK Docs', icon: Code2 },
    { id: 'settings' as ActiveTab, label: 'Settings & Keys', icon: Settings },
    { id: 'admin' as ActiveTab, label: 'Platform Admin', icon: ShieldAlert },
  ];

  const renderNavItem = (item: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; badge?: string; count?: number; highlight?: boolean }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isErrors = item.id === 'errors';
    return (
      <div key={item.id} className="relative group">
        {isActive && !effectiveCollapsed && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500" />}
        <button
          onClick={() => selectTab(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={`w-full flex items-center rounded-lg text-[13px] font-medium transition-colors ${
            effectiveCollapsed ? 'justify-center h-10' : 'gap-3 px-3 h-9'
          } ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
          }`}
        >
          <Icon strokeWidth={1.75} className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : item.highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
          {!effectiveCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}

          {!effectiveCollapsed && item.badge && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{item.badge}
            </span>
          )}
          {!effectiveCollapsed && item.count ? (
            <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
              isErrors ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-zinc-400'
            }`}>{item.count}</span>
          ) : null}

          {effectiveCollapsed && item.badge && <span className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          {effectiveCollapsed && item.count ? <span className={`absolute top-2 right-3 w-1.5 h-1.5 rounded-full ${isErrors ? 'bg-red-500' : 'bg-slate-400'}`} /> : null}
        </button>

        {effectiveCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            {item.label}{item.badge ? ` · ${item.badge}` : ''}
          </div>
        )}
      </div>
    );
  };

  const iconButton = 'w-7 h-7 flex items-center justify-center rounded-md text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer';

  const renderContent = () => (
    <>
      <div className="p-3 space-y-6">
        {/* Quiet controls: pin / collapse on desktop, close on mobile */}
        <div className={`flex items-center ${effectiveCollapsed ? 'justify-center' : 'justify-end'} gap-0.5`}>
          {!isMobile && !effectiveCollapsed && (
            <button
              onClick={togglePin}
              title={isPinned ? 'Unpin sidebar (auto-collapse for chart space)' : 'Pin sidebar open'}
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              className={`${iconButton} ${isPinned ? '!text-emerald-600 dark:!text-emerald-400' : ''}`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          )}
          {isMobile ? (
            <button onClick={() => onCloseMobile?.()} title="Close navigation" aria-label="Close navigation" className={iconButton}>
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={toggleCollapse}
              title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={iconButton}
            >
              {effectiveCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div>
          {!effectiveCollapsed && <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500 font-medium">Analytics</div>}
          <nav className="space-y-0.5">{mainNavItems.map(renderNavItem)}</nav>
        </div>

        <div>
          {!effectiveCollapsed && <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500 font-medium">Manage</div>}
          <nav className="space-y-0.5">{secondaryNavItems.map(renderNavItem)}</nav>
        </div>
      </div>

      {/* Account */}
      <div className="p-3">
        <div className={`flex items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors ${effectiveCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2'}`}>
          <div className="w-8 h-8 rounded-full bg-[#0b1a38] ring-1 ring-black/5 dark:ring-white/10 shrink-0 flex items-center justify-center text-[10px] text-white font-semibold tracking-wide">
            {user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'}
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">{user.email}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
        className={`sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-[#09090b] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ease-in-out z-20 ${
          effectiveCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {renderContent()}
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => onCloseMobile?.()}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#09090b] border-r border-slate-200/70 dark:border-white/[0.06] flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Mobile navigation"
      >
        {renderContent()}
      </aside>
    </>
  );
};

