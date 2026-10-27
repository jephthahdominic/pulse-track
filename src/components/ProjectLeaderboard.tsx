import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Crown, TrendingUp, TrendingDown, Minus, Eye, Users } from 'lucide-react';
import { Project, Timeframe } from '../types';
import { db } from '../services/db';

interface LeaderboardEntry {
  projectId: string;
  name: string;
  domain: string;
  status: string;
  pageviews: number;
  sessions: number;
  previousPageviews: number | null;
  change: number | null;
}

interface ProjectLeaderboardProps {
  timeframe: Timeframe;
  projects: Project[];
  currentProjectId: string;
  /** True when the app is backed by the live database; otherwise it ranks the built-in demo projects. */
  isLive: boolean;
  authHeaders?: Record<string, string>;
  onSelectProject: (project: Project) => void;
}

const TIMEFRAME_LABEL: Record<string, string> = {
  '1h': 'the last hour', '24h': 'the last 24 hours', '7d': 'the last 7 days', '30d': 'the last 30 days', '90d': 'the last 90 days',
};

const MEDAL: Record<number, { ring: string; badge: string; bar: string }> = {
  0: { ring: 'border-amber-400/60', badge: 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950', bar: 'from-orange-500 to-amber-300' },
  1: { ring: 'border-slate-300/60 dark:border-slate-500/50', badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800', bar: 'from-slate-500 to-slate-300' },
  2: { ring: 'border-orange-400/50', badge: 'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950', bar: 'from-amber-800 to-orange-400' },
};
/** Podium order: 2nd | 1st | 3rd so the winner stands in the middle */
const podiumOrder = (n: number) => (n >= 3 ? [1, 0, 2] : n === 2 ? [1, 0] : [0]);
const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

const TrendChip: React.FC<{ change: number | null; previous: number | null; current: number }> = ({ change, previous, current }) => {
  if (previous === null) return null;
  if (change === null) {
    return current > 0
      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">New</span>
      : <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400"><Minus className="w-3 h-3" />0%</span>;
  }
  if (change === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400"><Minus className="w-3 h-3" />0%</span>;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{change}%
    </span>
  );
};

export const ProjectLeaderboard: React.FC<ProjectLeaderboardProps> = ({
  timeframe, projects, currentProjectId, isLive, authHeaders = {}, onSelectProject,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [animate, setAnimate] = useState(false);
  const headersRef = useRef(authHeaders);
  headersRef.current = authHeaders;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!isLive) {
          const board = projects.filter((p) => p.status !== 'archived').map((p) => {
            const st = db.getOverviewStats(p.id, timeframe);
            return { projectId: p.id, name: p.name, domain: p.domain, status: p.status, pageviews: st.totalVisitors, sessions: st.uniqueVisitors, previousPageviews: null, change: null };
          }).sort((a, b) => b.pageviews - a.pageviews);
          if (!cancelled) { setEntries(board); setError(false); }
          return;
        }
        const res = await fetch(`/api/v1/analytics/leaderboard?timeframe=${timeframe}`, { headers: headersRef.current });
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        if (!cancelled) { setEntries(data.leaderboard || []); setError(false); }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const t = isLive ? setInterval(load, 30000) : undefined;
    return () => { cancelled = true; if (t) clearInterval(t); };
  }, [timeframe, isLive, projects.length]);

  // Let bars grow from 0 once data lands
  useEffect(() => {
    if (!entries) { setAnimate(false); return; }
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [entries]);

  const podium = (entries || []).slice(0, 3);
  // Share is measured against everything the workspace received, not just the top 3
  const total = (entries || []).reduce((a, e) => a + e.pageviews, 0);
  const top = podium[0]?.pageviews || 0;
  const hasTraffic = total > 0;

  return (
    <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm overflow-hidden" aria-label="Project leaderboard">
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="w-4 h-4 text-amber-950" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Top 3 Projects</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500">Most visited over {TIMEFRAME_LABEL[timeframe] || 'this period'}</p>
          </div>
        </div>
        {hasTraffic && (
          <div className="text-right">
            <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-100 leading-none">{total.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">total pageviews</div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-2">
        {entries === null && !error && (
          <div className="space-y-2 animate-pulse" role="status" aria-label="Loading leaderboard">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-zinc-800/60" />)}
          </div>
        )}

        {error && entries === null && (
          <p className="text-xs text-slate-500 text-center py-6">Couldn't load the leaderboard right now.</p>
        )}

        {entries && entries.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">No projects to rank yet.</p>
        )}

        {entries && entries.length > 0 && !hasTraffic && (
          <p className="text-xs text-slate-500 text-center py-6">No visits recorded in this period yet. Once your sites send events, the busiest project will take the crown here.</p>
        )}

        {entries && hasTraffic && (
          <div className={`grid gap-2 sm:gap-4 items-end ${podium.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : podium.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {podiumOrder(podium.length).map((i) => {
              const e = podium[i];
              const medal = MEDAL[i];
              const pct = top > 0 ? (e.pageviews > 0 ? Math.max(6, Math.round((e.pageviews / top) * 100)) : 0) : 0;
              const share = total > 0 ? Math.round((e.pageviews / total) * 100) : 0;
              const project = projects.find((p) => p.id === e.projectId);
              const isCurrent = e.projectId === currentProjectId;
              return (
                <button
                  key={e.projectId}
                  onClick={() => project && onSelectProject(project)}
                  disabled={!project}
                  title={isCurrent ? 'Currently viewing this project' : `View ${e.name}`}
                  className={`group min-w-0 flex flex-col items-center text-center rounded-xl border p-2 sm:p-3 transition-all hover:shadow-md hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                    ${i === 0 ? 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-500/10 dark:to-transparent' : 'bg-slate-50/60 dark:bg-zinc-800/30'}
                    ${medal.ring} ${isCurrent ? 'ring-2 ring-indigo-500/40' : ''}`}
                >
                  {/* Count + trend above the bar */}
                  <div className="text-base sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100 leading-none">{e.pageviews.toLocaleString()}</div>
                  <div className="mt-1 min-h-[1rem]"><TrendChip change={e.change} previous={e.previousPageviews} current={e.pageviews} /></div>

                  {/* Vertical bar */}
                  <div className="mt-2 w-full h-40 sm:h-48 flex items-end justify-center border-b border-slate-200 dark:border-zinc-700"
                    role="progressbar" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label={`${e.name} share of visits`}>
                    <div
                      className={`w-full max-w-[6rem] rounded-t-lg bg-gradient-to-t ${medal.bar} transition-[height] duration-700 ease-out shadow-sm flex items-start justify-center pt-1.5`}
                      style={{ height: animate ? `${pct}%` : '0%' }}
                    >
                      {i === 0 && pct > 20 && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 drop-shadow" />}
                    </div>
                  </div>

                  {/* Position + project */}
                  <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-sm ${medal.badge}`}>{ordinal(i + 1)}</span>
                  <div className="mt-1.5 w-full min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 break-words leading-tight">{e.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 break-all">{e.domain}</div>
                    {isCurrent && <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">Viewing</span>}
                  </div>
                  <div className="mt-1.5 flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap text-[10px] text-slate-500 dark:text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{share}%</span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{e.sessions.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
