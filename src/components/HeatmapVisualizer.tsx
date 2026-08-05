import React, { useState } from 'react';
import { MousePointer, AlertCircle, Flame, Target, Layers } from 'lucide-react';
import { HeatmapPoint } from '../types';

interface HeatmapVisualizerProps {
  clicks?: HeatmapPoint[];
}

export const HeatmapVisualizer: React.FC<HeatmapVisualizerProps> = ({ clicks = [] }) => {
  const routes = Array.from(new Set(clicks.map((c) => c.url).filter(Boolean)));
  const [selectedRoute, setSelectedRoute] = useState(routes[0] || '');

  const activeClicks = selectedRoute ? clicks.filter((c) => c.url === selectedRoute) : clicks;
  const totalClicks = activeClicks.reduce((a, c) => a + c.count, 0);

  const normalized = activeClicks
    .map((c) => ({ ...c, x: Math.min(800, Math.max(0, (c.x / 100) * 8)), y: Math.min(600, Math.max(0, (c.y / 100) * 6)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <MousePointer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Click Heatmaps & Behavioral Maps</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual click density overlay, rage click detection, and dead click diagnostics
            </p>
          </div>
        </div>

        {/* Route Selector */}
        {routes.length > 1 && (
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 font-mono font-medium"
          >
            {routes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      {/* Heatmap Preview Visual Stage */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 font-bold text-slate-700 dark:text-slate-300">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>Standard Clicks</span>
            </span>
            <span className="flex items-center space-x-1.5 font-bold text-rose-600 dark:text-rose-400">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>Rage Clicks</span>
            </span>
            <span className="flex items-center space-x-1.5 font-bold text-slate-500 dark:text-slate-400">
              <Target className="w-3 h-3" />
              <span>{totalClicks.toLocaleString()} total clicks</span>
            </span>
          </div>
        </div>

        {/* Mock Page Preview Canvas */}
        <div className="relative w-full h-96 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-6">
          {/* Simulated Web Page Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-2 text-slate-300">{selectedRoute || 'your-website.com'}</span>
            </div>
          </div>

          {normalized.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-500">No click data yet.</p>
              <p className="text-[11px] text-slate-600 max-w-sm">
                Install the tracker script on your website and visitors' clicks will appear here as a heatmap overlay.
              </p>
            </div>
          ) : (
            <>
              {/* Simulated Product Layout */}
              <div className="grid grid-cols-2 gap-6 my-auto text-slate-300">
                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                  [Page Canvas]
                </div>
                <div className="space-y-3">
                  <div className="text-lg font-bold text-white">Your Website</div>
                  <div className="text-xs text-slate-400">Click density across the viewport</div>
                  <div className="w-48 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs text-center shadow-lg shadow-indigo-600/30">
                    Add to Cart
                  </div>
                </div>
              </div>

              {/* Overlaid Click Hotspots */}
              {normalized.map((pt, idx) => (
                <div
                  key={idx}
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ left: `${(pt.x / 800) * 100}%`, top: `${(pt.y / 600) * 100}%` }}
                >
                  <div
                    className={`rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-xl ${
                      pt.rageCount > 0
                        ? 'bg-rose-500/80 animate-pulse border-2 border-rose-300'
                        : 'bg-cyan-500/80 border-2 border-cyan-300'
                    }`}
                    style={{ width: `${Math.min(64, 28 + pt.count)}px`, height: `${Math.min(64, 28 + pt.count)}px` }}
                  >
                    {pt.count}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
