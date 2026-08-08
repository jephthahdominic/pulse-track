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

  const renderContent = () => (
    <>
      <div className="p-3 space-y-4">
        {/* Sidebar Controls (Pin / Expand / Collapse Toggle / Close on mobile) */}
        <div
          className={`flex items-center pb-2 border-b border-slate-200/80 dark:border-zinc-800/80 ${
            effectiveCollapsed ? 'justify-center' : 'justify-between px-1'
          }`}
        >
          {!effectiveCollapsed && (
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              <span>Navigation</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            {!isMobile && (
              <button
                onClick={togglePin}
                title={isPinned ? 'Unpin sidebar (allow auto-collapse for chart space)' : 'Pin sidebar (keep expanded)'}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  isPinned
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 fill-indigo-500/30" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {isMobile ? (
              <button
                onClick={() => onCloseMobile?.()}
                title="Close navigation"
                aria-label="Close navigation"
                className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={toggleCollapse}
                title={effectiveCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                className="p-1.5 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                {effectiveCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Main Analytics Section */}
        <div>
          {!effectiveCollapsed && (
            <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">
              Analytics
            </div>
          )}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => selectTab(item.id)}
                    className={`w-full flex items-center rounded text-xs font-medium transition-all ${
                      effectiveCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2 py-1.5'
                    } ${
                      isActive
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-blue-400'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      ) : (
                        <Icon className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                      )}
                      {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!effectiveCollapsed && (
                      <div className="flex items-center gap-1">
                        {item.badge && (
                          <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold">
                            {item.badge}
                          </span>
                        )}
                        {item.count && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.id === 'errors'
                                ? 'bg-red-900/30 text-red-400'
                                : isActive
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-slate-200 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Compact Badge Dot when collapsed */}
                    {effectiveCollapsed && item.badge && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {effectiveCollapsed && item.count && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>

                  {/* Tooltip on Collapsed Hover */}
                  {effectiveCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-zinc-800 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex items-center space-x-1.5">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* System & Management Section */}
        <div>
          {!effectiveCollapsed && (
            <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">
              Management
            </div>
          )}
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => selectTab(item.id)}
                    className={`w-full flex items-center rounded text-xs font-medium transition-all ${
                      effectiveCollapsed ? 'justify-center py-2 px-0' : 'justify-between px-2 py-1.5'
                    } ${
                      isActive
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-blue-400'
                        : item.highlight
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      ) : (
                        <Icon className={`w-4 h-4 shrink-0 ${item.highlight ? 'text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                      )}
                      {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                  </button>

                  {/* Tooltip on Collapsed Hover */}
                  {effectiveCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-zinc-800 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer User Profile Box */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800">
        <div
          className={`flex items-center rounded bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 transition-all ${
            effectiveCollapsed ? 'justify-center p-1.5' : 'gap-2 p-2'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shrink-0 flex items-center justify-center text-[10px] text-white font-bold shadow-xs">
            {user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'}
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 truncate">{user.name}</div>
              <div className="text-[9px] text-slate-500 dark:text-zinc-500 truncate">{user.email}</div>
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
        className={`sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#09090b] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ease-in-out z-20 ${
          effectiveCollapsed ? 'w-16' : 'w-56'
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
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-50 dark:bg-[#09090b] border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-label="Mobile navigation"
      >
        {renderContent()}
      </aside>
    </>
  );
};

