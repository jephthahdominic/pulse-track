import React from 'react';
import { GitMerge, ArrowRight, Filter, TrendingUp, Plus, CheckCircle2 } from 'lucide-react';

interface FunnelStepResult {
  name: string;
  usersCount: number;
  dropoffPercentage: number;
  conversionPercentage: number;
}

interface FunnelResult {
  funnelId: string;
  name: string;
  steps: FunnelStepResult[];
  overallConversion: number;
}

interface FunnelAnalyticsProps {
  funnels: FunnelResult[];
}

export const FunnelAnalytics: React.FC<FunnelAnalyticsProps> = ({ funnels }) => {
  const funnel = funnels[0];

  if (!funnel || !funnel.steps?.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Conversion Funnel Analytics</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track multi-step drop-off points from initial landing to final payment
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
          <Filter className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No funnel data yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Funnels are computed automatically from your event stream once visitors start being tracked.
            Track custom events like <code className="font-mono text-indigo-500">AddToCart</code> or{' '}
            <code className="font-mono text-indigo-500">Purchase</code> with{' '}
            <code className="font-mono text-indigo-500">pulsetrack.track(...)</code> to build richer funnels.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Conversion Funnel Analytics</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track multi-step drop-off points from initial landing to final payment
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-right">
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Overall Funnel Conversion</div>
            <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">{funnel.overallConversion}%</div>
          </div>
        </div>
      </div>

      {/* Funnel Pipeline Visualizer */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{funnel.name}</h3>

        <div className="space-y-4">
          {funnel.steps.map((s, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{s.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>{s.usersCount.toLocaleString()} visitors</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{s.conversionPercentage}% step rate</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl h-6 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-full rounded-xl transition-all"
                  style={{ width: `${s.conversionPercentage}%` }}
                />
                {s.dropoffPercentage > 0 && (
                  <span className="absolute right-3 top-1 text-[10px] text-slate-400 font-semibold">
                    -{s.dropoffPercentage}% drop-off
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
