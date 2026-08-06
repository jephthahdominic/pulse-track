import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Laptop, Smartphone, Sparkles, RefreshCw, Activity, Users, MousePointerClick } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Project } from '../types';
import { db } from '../services/db';

interface LiveVisitorsProps {
  onTriggerSimulatedHit?: () => void;
  project?: Project;
  authHeaders?: Record<string, string>;
}

interface LiveVisitorItem {
  sessionId: string;
  userId: string;
  country: string;
  city: string;
  browser: string;
  device: string;
  activePage: string;
  durationSeconds: number;
  startedAt: number;
  referrer: string;
}

interface ActivityFeedItem {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'visit' | 'click' | 'form' | 'purchase' | 'error' | 'identify' | 'event';
}

interface RealtimeFeedEntry {
  id: string;
  type: 'visit' | 'click' | 'event' | 'purchase' | 'error' | 'identify';
  user: string;
  action: string;
  target: string;
  timestamp: number;
}

interface ClickBucket {
  time: string;
  clicks: number;
  pageviews: number;
}

const timeAgo = (ts: number): string => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'Just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
};

export const LiveVisitors: React.FC<LiveVisitorsProps> = ({ onTriggerSimulatedHit, project, authHeaders }) => {
  const [activeCount, setActiveCount] = useState(0);
  const [visitors, setVisitors] = useState<LiveVisitorItem[]>([]);
  const [visitorsPage, setVisitorsPage] = useState(1);
  const visitorsPageSize = 20;
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [clickBuckets, setClickBuckets] = useState<ClickBucket[]>([]);

  const paramsFor = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (project?.id) params.set('projectId', project.id);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  };

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/analytics/live?${paramsFor({ limit: String(visitorsPageSize), offset: String((visitorsPage - 1) * visitorsPageSize) })}`,
        { headers: authHeaders || {} }
      );
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      setActiveCount(data.activeCount ?? 0);
      setVisitors(data.visitors || []);
    } catch {
      const fallback = db.getLiveVisitors(project?.id || db.projects[0].id, visitorsPageSize, (visitorsPage - 1) * visitorsPageSize);
      setActiveCount(fallback.activeCount);
      setVisitors(fallback.visitors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, authHeaders, visitorsPage]);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/analytics/realtime?${paramsFor()}`, { headers: authHeaders || {} });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const entries: RealtimeFeedEntry[] = data.entries || [];
      setFeed(entries.map((e) => ({
        id: e.id,
        user: e.user,
        action: e.action,
        target: e.target,
        timestamp: timeAgo(e.timestamp),
        type: e.type,
      })));
    } catch {
      // Keep the last successfully loaded feed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, authHeaders]);

  const fetchClicks = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/analytics/realtime/clicks?${paramsFor({ window: '30' })}`, { headers: authHeaders || {} });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      setClickBuckets(data.buckets || []);
    } catch {
      // Keep the last successfully loaded series
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, authHeaders]);

  useEffect(() => {
    fetchLive();
    fetchFeed();
    fetchClicks();
    const interval = setInterval(() => {
      fetchLive();
      fetchFeed();
      fetchClicks();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchLive, fetchFeed, fetchClicks]);

  const totalClicks = clickBuckets.reduce((acc, b) => acc + b.clicks, 0);
  const totalPages = Math.max(1, Math.ceil(activeCount / visitorsPageSize));
  const from = activeCount > 0 ? (visitorsPage - 1) * visitorsPageSize + 1 : 0;
  const to = Math.min(visitorsPage * visitorsPageSize, activeCount);

  const refresh = () => {
    fetchLive();
    fetchFeed();
    fetchClicks();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Real-Time Visitors & Live Feed</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                LIVE NOW
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeCount.toLocaleString()} active sessions right now, with live click-rate monitoring and paginated session feed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          {onTriggerSimulatedHit && (
            <button
              onClick={onTriggerSimulatedHit}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Live Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Click Rate Graph */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Click Rate</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Clicks & pageviews per minute over the last 30 minutes</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="font-semibold">{totalClicks.toLocaleString()} clicks</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-semibold">pageviews</span>
            </span>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={clickBuckets} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pageviewGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b822" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#6366f1" strokeWidth={2} fill="url(#clickGradient)" />
              <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#06b6d4" strokeWidth={2} fill="url(#pageviewGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Visitors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>Currently Active Sessions ({activeCount.toLocaleString()})</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Showing {from.toLocaleString()}–{to.toLocaleString()} of {activeCount.toLocaleString()} active sessions
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {visitors.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No active sessions right now
                </div>
              )}
              {visitors.map((v, idx) => (
                <div key={`${v.sessionId}_${idx}`} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <span>{v.userId}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          • {v.city}, {v.country}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {v.activePage}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1">
                      {v.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                      <span>{v.browser}</span>
                    </div>
                    <div className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {v.durationSeconds}s duration
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Page {visitorsPage} of {totalPages.toLocaleString()}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setVisitorsPage((p) => Math.max(1, p - 1))}
                  disabled={visitorsPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setVisitorsPage((p) => Math.min(totalPages, p + 1))}
                  disabled={visitorsPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Stream Feed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <span>Live Activity Stream</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </h3>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {feed.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-start space-x-2.5"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    item.type === 'purchase'
                      ? 'bg-emerald-500'
                      : item.type === 'click'
                      ? 'bg-indigo-500'
                      : item.type === 'form'
                      ? 'bg-amber-500'
                      : item.type === 'error'
                      ? 'bg-red-500'
                      : item.type === 'identify'
                      ? 'bg-slate-400'
                      : item.type === 'event'
                      ? 'bg-fuchsia-500'
                      : 'bg-cyan-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.user}</span>
                    <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {item.action} <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{item.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
