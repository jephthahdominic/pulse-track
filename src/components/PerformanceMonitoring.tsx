import React from 'react';
import { Gauge, Zap, CheckCircle2, AlertTriangle, XCircle, Clock, Server, Layers } from 'lucide-react';
import { WebVitalMetric } from '../types';

interface PerformanceMonitoringProps {
  vitals: WebVitalMetric[];
}

const METRIC_DEFS: Array<{
  name: 'CLS' | 'LCP' | 'FID' | 'TTFB' | 'INP' | 'FCP';
  fullName: string;
  target: string;
  desc: string;
  display: (v: number) => string;
}> = [
  { name: 'LCP', fullName: 'Largest Contentful Paint', target: '< 2.5s', desc: 'Measures perceived loading speed', display: (v) => `${(v / 1000).toFixed(1)}s` },
  { name: 'CLS', fullName: 'Cumulative Layout Shift', target: '< 0.1', desc: 'Measures visual stability', display: (v) => v.toFixed(3) },
  { name: 'INP', fullName: 'Interaction to Next Paint', target: '< 200ms', desc: 'Measures user responsiveness', display: (v) => `${Math.round(v)}ms` },
  { name: 'TTFB', fullName: 'Time to First Byte', target: '< 800ms', desc: 'Server response duration', display: (v) => `${Math.round(v)}ms` },
  { name: 'FID', fullName: 'First Input Delay', target: '< 100ms', desc: 'Main thread processing delay', display: (v) => `${Math.round(v)}ms` },
  { name: 'FCP', fullName: 'First Contentful Paint', target: '< 1.8s', desc: 'First DOM element paint', display: (v) => `${(v / 1000).toFixed(1)}s` },
];

function p75(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
  return sorted[idx];
}

function ratingFor(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
  if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
  if (name === 'FID') return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
  if (name === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
  if (name === 'TTFB') return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
  if (name === 'FCP') return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
  return 'good';
}

export const PerformanceMonitoring: React.FC<PerformanceMonitoringProps> = ({ vitals }) => {
  const metricsList = METRIC_DEFS.map((m) => {
    const values = vitals.filter((v) => v.name === m.name).map((v) => v.value);
    const p = p75(values);
    const status = p === null ? 'no-data' : ratingFor(m.name, p);
    return { ...m, score: p === null ? '—' : m.display(p), status, sampleCount: values.length };
  });

  // Aggregate per-URL performance
  const urlMap: Record<string, { lcp: number[]; ttfb: number[] }> = {};
  vitals.forEach((v) => {
    const path = (() => {
      try { return new URL(v.url).pathname; } catch { return v.url || '/'; }
    })();
    if (!urlMap[path]) urlMap[path] = { lcp: [], ttfb: [] };
    if (v.name === 'LCP') urlMap[path].lcp.push(v.value);
    if (v.name === 'TTFB') urlMap[path].ttfb.push(v.value);
  });

  const slowPages = Object.entries(urlMap)
    .map(([path, d]) => {
      const lcp = p75(d.lcp);
      const ttfb = p75(d.ttfb);
      const status = lcp === null ? 'good' : ratingFor('LCP', lcp);
      return {
        path,
        avgLcp: lcp === null ? '—' : `${(lcp / 1000).toFixed(1)}s`,
        avgTtfb: ttfb === null ? '—' : `${Math.round(ttfb)}ms`,
        status,
      };
    })
    .sort((a, b) => {
      const rank = { good: 0, 'needs-improvement': 1, poor: 2 } as Record<string, number>;
      return (rank[b.status] ?? 0) - (rank[a.status] ?? 0);
    })
    .slice(0, 10);

  const totalSamples = vitals.length;
  const poorCount = vitals.filter((v) => v.rating === 'poor').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Core Web Vitals & Page Speed</h2>
              {totalSamples > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${poorCount > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-300 dark:border-amber-800' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'}`}>
                  {poorCount > 0 ? `${poorCount} POOR METRICS` : 'GOOGLE CWV PASSING'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real user performance monitoring (RUM) — p75 metrics from {totalSamples.toLocaleString()} samples
            </p>
          </div>
        </div>
      </div>

      {/* CWV Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsList.map((m) => (
          <div key={m.name} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">{m.name}</span>
                <span className="text-[10px] text-slate-400 block">{m.fullName}</span>
              </div>
              {m.status === 'good' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Good</span>
                </span>
              )}
              {m.status === 'needs-improvement' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Improve</span>
                </span>
              )}
              {m.status === 'poor' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 flex items-center space-x-1">
                  <XCircle className="w-3 h-3" />
                  <span>Poor</span>
                </span>
              )}
              {m.status === 'no-data' && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  No data
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{m.score}</span>
              <span className="text-xs text-slate-400">Target: {m.target}</span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {m.desc}
              {m.sampleCount > 0 && <span className="ml-1 font-mono text-indigo-500">({m.sampleCount} samples)</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Page Speed by URL Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Page Loading Performance by URL (p75)</h3>

        {slowPages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No performance samples yet. Install the tracker script on your website to start collecting Core Web Vitals.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3">URL Path</th>
                  <th className="pb-3 text-right">Avg LCP</th>
                  <th className="pb-3 text-right">Avg TTFB</th>
                  <th className="pb-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {slowPages.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-mono text-slate-800 dark:text-slate-200 font-semibold">{p.path}</td>
                    <td className="py-3 text-right font-mono text-slate-900 dark:text-white">{p.avgLcp}</td>
                    <td className="py-3 text-right font-mono text-slate-500">{p.avgTtfb}</td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'good'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            : p.status === 'needs-improvement'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                        }`}
                      >
                        {p.status === 'good' ? 'Fast' : p.status === 'needs-improvement' ? 'Needs Optimization' : 'Poor'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
