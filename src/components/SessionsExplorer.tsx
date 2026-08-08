import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Search,
  Eye,
  X,
  Laptop,
  Smartphone,
  Globe,
  UserCheck,
  Zap,
  MousePointerClick,
  AlertTriangle,
  Gauge,
  Loader2,
  Timer,
  ArrowRight,
  MousePointer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserSession, SessionTimelineEvent, SessionTimelineEventType } from '../types';

interface SessionsExplorerProps {
  sessions: UserSession[];
  authHeaders?: Record<string, string>;
}

const EVENT_CONFIG: Record<
  SessionTimelineEventType,
  { icon: LucideIcon; label: string; nodeBg: string; nodeRing: string; iconColor: string; textColor: string }
> = {
  pageview: { icon: Eye, label: 'Page View', nodeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20', nodeRing: 'ring-indigo-500/40', iconColor: 'text-indigo-600 dark:text-indigo-400', textColor: 'text-indigo-600 dark:text-indigo-400' },
  click: { icon: MousePointerClick, label: 'Click', nodeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20', nodeRing: 'ring-cyan-500/40', iconColor: 'text-cyan-600 dark:text-cyan-400', textColor: 'text-cyan-600 dark:text-cyan-400' },
  custom: { icon: Zap, label: 'Event', nodeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', nodeRing: 'ring-emerald-500/40', iconColor: 'text-emerald-600 dark:text-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertTriangle, label: 'Error', nodeBg: 'bg-red-500/10 dark:bg-red-500/20', nodeRing: 'ring-red-500/40', iconColor: 'text-red-600 dark:text-red-400', textColor: 'text-red-600 dark:text-red-400' },
  performance: { icon: Gauge, label: 'Performance', nodeBg: 'bg-amber-500/10 dark:bg-amber-500/20', nodeRing: 'ring-amber-500/40', iconColor: 'text-amber-600 dark:text-amber-400', textColor: 'text-amber-600 dark:text-amber-400' },
  identify: { icon: UserCheck, label: 'Identified', nodeBg: 'bg-purple-500/10 dark:bg-purple-500/20', nodeRing: 'ring-purple-500/40', iconColor: 'text-purple-600 dark:text-purple-400', textColor: 'text-purple-600 dark:text-purple-400' },
};

const formatDuration = (totalSeconds: number) => {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

const formatGap = (ms: number) => {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

const formatClockTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const SessionsExplorer: React.FC<SessionsExplorerProps> = ({ sessions, authHeaders = {} }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [timeline, setTimeline] = useState<SessionTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const authHeadersRef = useRef(authHeaders);
  useEffect(() => {
    authHeadersRef.current = authHeaders;
  }, [authHeaders]);

  // Fetch the real per-session event timeline whenever a session is opened
  useEffect(() => {
    if (!selectedSession) {
      setTimeline([]);
      setTimelineError('');
      return;
    }
    let cancelled = false;
    setTimelineLoading(true);
    setTimelineError('');
    fetch(
      `/api/v1/analytics/sessions/${encodeURIComponent(selectedSession.sessionId)}/timeline?projectId=${encodeURIComponent(selectedSession.projectId)}`,
      { headers: authHeadersRef.current }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load timeline');
        const data = await res.json();
        if (!cancelled) setTimeline(data.timeline || []);
      })
      .catch(() => {
        if (!cancelled) setTimelineError('Could not load this session\'s timeline.');
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSession]);

  const filtered = sessions.filter(
    (s) =>
      s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userId && s.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.geo.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.entryPage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pvCount = timeline.filter((e) => e.type === 'pageview').length;
  const clickCount = timeline.filter((e) => e.type === 'click').length;
  const customCount = timeline.filter((e) => e.type === 'custom').length;
  const errorCount = timeline.filter((e) => e.type === 'error').length;
  const perfCount = timeline.filter((e) => e.type === 'performance').length;

  const renderPropertiesChips = (props: Record<string, any>) => {
    const entries = Object.entries(props).slice(0, 6);
    if (entries.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70"
          >
            {k}: <span className="font-semibold">{String(v)}</span>
          </span>
        ))}
      </div>
    );
  };

  const renderEventCard = (evt: SessionTimelineEvent) => {
    switch (evt.type) {
      case 'pageview':
        return (
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              {evt.title || evt.path || 'Page View'}
            </div>
            <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
              {evt.path || evt.url}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-500 dark:text-zinc-500">
              {typeof evt.durationMs === 'number' && (
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" /> On page: {formatDuration(evt.durationMs / 1000)}
                </span>
              )}
              {typeof evt.scrollDepthPercentage === 'number' && (
                <span className="flex items-center gap-1.5">
                  <span>Scroll depth</span>
                  <span className="w-14 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, evt.scrollDepthPercentage)}%` }}
                    />
                  </span>
                  <span>{evt.scrollDepthPercentage}%</span>
                </span>
              )}
              {evt.referrer && !evt.referrer.toLowerCase().includes('direct') && (
                <span className="truncate">via {evt.referrer}</span>
              )}
            </div>
          </div>
        );
      case 'click':
        return (
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              Clicked <span className="font-mono text-cyan-600 dark:text-cyan-400">{evt.targetTag || 'element'}</span>
              {evt.targetText ? <span className="font-medium text-slate-600 dark:text-zinc-300"> · "{evt.targetText}"</span> : null}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{evt.url}</div>
            {(evt.isRageClick || evt.isDeadClick) && (
              <div className="flex gap-1 mt-1.5">
                {evt.isRageClick && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase tracking-wider">
                    Rage Click
                  </span>
                )}
                {evt.isDeadClick && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">
                    Dead Click
                  </span>
                )}
              </div>
            )}
          </div>
        );
      case 'custom':
        return (
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{evt.eventName || 'Custom Event'}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{evt.url}</div>
            {evt.properties && renderPropertiesChips(evt.properties)}
          </div>
        );
      case 'error':
        return (
          <div>
            <div className="text-xs font-bold text-red-600 dark:text-red-400 truncate">{evt.message || 'Script Error'}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase tracking-wider">
                {evt.errorType || 'error'}
              </span>
              {evt.statusCode && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-zinc-400 text-[9px] font-mono">
                  HTTP {evt.statusCode}
                </span>
              )}
            </div>
          </div>
        );
      case 'performance':
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">{evt.vitalName}</span>
              <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-300">{evt.vitalValue}</span>
              {evt.vitalRating && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    evt.vitalRating === 'good'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : evt.vitalRating === 'needs-improvement'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {evt.vitalRating.replace('-', ' ')}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{evt.url}</div>
          </div>
        );
      case 'identify':
        return (
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">User Identified</div>
            {evt.traits && renderPropertiesChips(evt.traits)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>Session Explorer & User Timelines</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect individual visitor journeys, step-by-step page flows, and duration
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search session ID, country, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Session & User</th>
                <th className="pb-3">Location & Device</th>
                <th className="pb-3">Entry Page</th>
                <th className="pb-3">Exit Page</th>
                <th className="pb-3 text-right">Duration</th>
                <th className="pb-3 text-right">Pageviews</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-medium text-slate-900 dark:text-white">
                    <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {s.sessionId}
                    </div>
                    {s.userId ? (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-0.5">
                        <UserCheck className="w-3 h-3 mr-1" /> {s.userId}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">Anonymous Visitor</div>
                    )}
                  </td>

                  <td className="py-3">
                    <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.geo.city}, {s.geo.country}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      {s.device.deviceType === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                      <span>{s.device.browser} ({s.device.os})</span>
                    </div>
                  </td>

                  <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                    {s.entryPage}
                  </td>

                  <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                    {s.exitPage}
                  </td>

                  <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {formatDuration(s.durationSeconds)}
                  </td>

                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      {s.pageViewsCount} views
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedSession(s)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                    >
                      View Timeline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-800/50">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Session Timeline</span>
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                    {selectedSession.sessionId}
                  </span>
                  {selectedSession.isBounce && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      Bounced
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  <Globe className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {selectedSession.geo.city}, {selectedSession.geo.country} · {selectedSession.device.browser} on {selectedSession.device.os}
                  {selectedSession.userId && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                      {selectedSession.userId}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {[
                { label: 'Duration', value: formatDuration(selectedSession.durationSeconds), icon: Timer },
                { label: 'Views', value: String(pvCount || selectedSession.pageViewsCount), icon: Eye },
                { label: 'Clicks', value: String(clickCount), icon: MousePointer },
                { label: 'Events', value: String(customCount), icon: Zap },
                { label: 'Perf', value: String(perfCount), icon: Gauge },
                { label: 'Errors', value: String(errorCount), icon: AlertTriangle },
              ].map((stat) => {
                const StatIcon = stat.icon;
                const isError = stat.label === 'Errors' && errorCount > 0;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70"
                  >
                    <StatIcon className={`w-3.5 h-3.5 shrink-0 ${isError ? 'text-red-500' : 'text-indigo-500'}`} />
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold truncate">
                        {stat.label}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{stat.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Entry → Exit flow */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-zinc-300">
                <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Journey</span>
                <span className="truncate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  {selectedSession.entryPage}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  {selectedSession.exitPage}
                </span>
              </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {timelineLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs mt-3">Loading timeline events…</p>
                </div>
              ) : timelineError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <p className="text-xs mt-3 text-slate-600 dark:text-zinc-300">{timelineError}</p>
                </div>
              ) : timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="w-6 h-6 text-slate-400" />
                  <p className="text-xs mt-3 text-slate-600 dark:text-zinc-300">
                    No events recorded for this session yet.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Page views and interactions will appear here once the tracking script sends data.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Object.entries(EVENT_CONFIG).map(([type, cfg]) => {
                      const LegendIcon = cfg.icon;
                      return (
                        <span
                          key={type}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-slate-700"
                        >
                          <LegendIcon className={`w-3 h-3 ${cfg.iconColor}`} />
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="space-y-0">
                    {timeline.map((evt, idx) => {
                      const cfg = EVENT_CONFIG[evt.type];
                      const Icon = cfg.icon;
                      const isLast = idx === timeline.length - 1;
                      const relSeconds = Math.max(0, Math.round((evt.timestamp - selectedSession.startedAt) / 1000));
                      return (
                        <React.Fragment key={evt.id}>
                          {idx > 0 && (
                            <div className="flex items-center gap-2 pl-4 py-0.5">
                              <span className="w-0.5 h-3 bg-slate-300 dark:bg-slate-700" />
                              <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                +{formatGap(evt.timestamp - timeline[idx - 1].timestamp)}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full ${cfg.nodeBg} ring-1 ${cfg.nodeRing} flex items-center justify-center shrink-0`}>
                                <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                              </div>
                              {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-800 my-1 min-h-5" />}
                            </div>
                            <div className="flex-1 min-w-0 pb-5">
                              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.textColor}`}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 shrink-0">
                                    {formatClockTime(evt.timestamp)}
                                  </span>
                                </div>
                                {renderEventCard(evt)}
                                <div className="mt-1.5 text-[9px] font-semibold text-indigo-500/80 uppercase tracking-wider">
                                  +{relSeconds}s after start
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
