import React, { useState, useEffect } from 'react';
import { Radio, Globe, Laptop, Smartphone, Eye, Play, Sparkles, RefreshCw, Activity } from 'lucide-react';
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
  const [visitors, setVisitors] = useState<LiveVisitorItem[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLive = async () => {
    try {
      const params = new URLSearchParams();
      if (project?.id) params.set('projectId', project.id);
      const qs = params.toString();
      const res = await fetch(`/api/v1/analytics/live${qs ? `?${qs}` : ''}`, { headers: authHeaders || {} });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      setVisitors(data.visitors || []);
    } catch {
      setVisitors(db.getLiveVisitors(project?.id || db.projects[0].id));
    }
  };

  const fetchFeed = async () => {
    try {
      const params = new URLSearchParams();
      if (project?.id) params.set('projectId', project.id);
      const qs = params.toString();
      const res = await fetch(`/api/v1/analytics/realtime${qs ? `?${qs}` : ''}`, { headers: authHeaders || {} });
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
  };

  useEffect(() => {
    fetchLive();
    fetchFeed();
    const interval = setInterval(() => {
      fetchLive();
      fetchFeed();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

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
              Active sessions on site right now with continuous websocket/polling updates
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLive}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Visitors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Currently Active Sessions ({visitors.length})
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {visitors.map((v, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
          </div>
        </div>

        {/* Live Activity Stream Feed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <span>Live Activity Stream</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </h3>

          <div className="space-y-3">
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
