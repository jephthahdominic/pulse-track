import React, { useEffect, useMemo, useState } from 'react';
import { MousePointer, Flame, Target, Layers, AlertTriangle, Link2, SquareMousePointer, TextCursorInput, Image as ImageIcon, Box } from 'lucide-react';
import { HeatmapPoint, HeatmapElement } from '../types';

interface HeatmapVisualizerProps {
  clicks?: HeatmapPoint[];
  elements?: HeatmapElement[];
}

interface Spot { x: number; y: number; count: number; rage: number }

const BUCKET = 25;           // px grid the clicks are merged into
const MIN_W = 1280;          // the stage is at least a desktop viewport wide
const FOLD = 720;            // typical first-screen height, drawn as a guide

/** Human name for a clicked element: its visible text, else its id, else tag.class */
const elementName = (e: { tag: string; id?: string; text?: string; classes?: string }) =>
  e.text ? `“${e.text}”` : e.id ? `#${e.id}` : e.classes ? `${e.tag || 'element'}.${e.classes}` : `<${e.tag || 'element'}>`;

const elementKind = (tag: string): { label: string; Icon: React.ComponentType<{ className?: string }> } => {
  if (tag === 'a') return { label: 'Link', Icon: Link2 };
  if (tag === 'button') return { label: 'Button', Icon: SquareMousePointer };
  if (['input', 'select', 'textarea', 'label'].includes(tag)) return { label: 'Form field', Icon: TextCursorInput };
  if (['img', 'svg', 'picture', 'video'].includes(tag)) return { label: 'Image', Icon: ImageIcon };
  return { label: tag ? `<${tag}>` : 'Element', Icon: Box };
};

/** host + path, without query/hash, so /pricing?a=1 and /pricing count as one page */
const routeOf = (url: string) => {
  try { const u = new URL(url); return `${u.host}${u.pathname}`; } catch { return url; }
};

export const HeatmapVisualizer: React.FC<HeatmapVisualizerProps> = ({ clicks = [], elements = [] }) => {
  const routes = useMemo(() => {
    const counts = new Map<string, number>();
    clicks.forEach((c) => { const r = routeOf(c.url || '/'); counts.set(r, (counts.get(r) || 0) + (c.count || 1)); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  }, [clicks]);

  const [picked, setPicked] = useState('');
  const route = routes.includes(picked) ? picked : routes[0] || '';

  // Merge this page's clicks into BUCKET-sized spots (works for raw clicks and pre-bucketed ones)
  const { spots, width, height, total, rageTotal } = useMemo(() => {
    const map = new Map<string, Spot>();
    clicks.filter((c) => routeOf(c.url || '/') === route).forEach((c) => {
      const x = Math.round((c.x || 0) / BUCKET) * BUCKET;
      const y = Math.round((c.y || 0) / BUCKET) * BUCKET;
      const key = `${x}:${y}`;
      const s = map.get(key) || { x, y, count: 0, rage: 0 };
      s.count += c.count || 1;
      s.rage += c.rageCount ?? ((c as any).isRageClick ? 1 : 0);
      map.set(key, s);
    });
    const list = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 400);
    const maxX = Math.max(0, ...list.map((s) => s.x));
    const maxY = Math.max(0, ...list.map((s) => s.y));
    return {
      spots: list,
      width: Math.max(MIN_W, Math.ceil((maxX + 100) / 100) * 100),
      height: Math.max(FOLD, Math.ceil((maxY + 100) / 100) * 100),
      total: list.reduce((a, s) => a + s.count, 0),
      rageTotal: list.reduce((a, s) => a + s.rage, 0),
    };
  }, [clicks, route]);

  // The elements people click on this page (same element on different URLs of the page is merged)
  const topElements = useMemo(() => {
    const map = new Map<string, HeatmapElement>();
    elements.filter((e) => routeOf(e.url || '/') === route).forEach((e) => {
      const key = `${e.tag}|${e.id || ''}|${e.text || ''}|${e.classes || ''}`;
      const m = map.get(key) || { ...e, count: 0, rageCount: 0, deadCount: 0 };
      m.count += e.count; m.rageCount += e.rageCount; m.deadCount += e.deadCount;
      map.set(key, m);
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [elements, route]);
  const elementTotal = topElements.reduce((a, e) => a + e.count, 0);

  // Let the glow fade in once the data lands
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [route, clicks]);

  const peak = spots[0]?.count || 1;
  const folds = Array.from({ length: Math.floor(height / FOLD) }, (_, i) => (i + 1) * FOLD);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0 sm:flex-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <MousePointer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Click Heatmaps</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Where visitors click on each page, with rage-click detection</p>
          </div>
        </div>

        {routes.length > 0 && (
          <select
            value={route}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Page"
            className="w-full sm:w-auto sm:max-w-[16rem] lg:max-w-sm min-w-0 shrink-0 truncate px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 font-mono font-medium"
          >
            {routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </div>

      {routes.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2">
          <Layers className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No clicks recorded yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Once your site's tracker script is installed and visitors start clicking, the busiest spots on each page show up here.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'Clicks', value: total.toLocaleString(), icon: Target, tone: 'text-cyan-500' },
              { label: 'Hot spots', value: spots.length.toLocaleString(), icon: Flame, tone: 'text-orange-500' },
              { label: 'Rage clicks', value: rageTotal.toLocaleString(), icon: AlertTriangle, tone: 'text-rose-500' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider"><Icon className={`w-3 h-3 ${tone}`} />{label}</div>
                <div className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100 mt-1">{value}</div>
              </div>
            ))}
          </div>

          {/* Heat stage: page-pixel space, no placeholder page content */}
          <div className="p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono truncate">{route} · {width}×{height}px</span>
              <span className="flex items-center gap-2">
                Fewer
                <span className="w-24 h-2 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600" />
                More
                <span className="flex items-center gap-1 ml-2"><span className="w-2.5 h-2.5 rounded-full border-2 border-white bg-rose-600" />Rage click</span>
              </span>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-slate-800">
              <div
                className="relative w-full bg-slate-950 overflow-hidden"
                style={{
                  aspectRatio: `${width} / ${height}`,
                  backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)',
                  backgroundSize: `${(100 / width) * 100}% ${(100 / height) * 100}%`,
                }}
              >
                {folds.map((y) => (
                  <div key={y} className="absolute left-0 right-0 border-t border-dashed border-slate-600/60" style={{ top: `${(y / height) * 100}%` }}>
                    <span className="absolute right-1 -top-4 text-[9px] font-mono text-slate-500">{y}px</span>
                  </div>
                ))}

                {spots.map((s, i) => {
                  const heat = s.count / peak;                    // 0..1
                  const diameter = (70 + 110 * Math.sqrt(heat)) / width * 100; // % of stage width
                  return (
                    <React.Fragment key={`${s.x}:${s.y}`}>
                      <div
                        className="absolute rounded-full pointer-events-none transition-opacity duration-700"
                        style={{
                          left: `${(s.x / width) * 100}%`,
                          top: `${(s.y / height) * 100}%`,
                          width: `${diameter}%`,
                          aspectRatio: '1 / 1',
                          transform: 'translate(-50%, -50%)',
                          mixBlendMode: 'screen',
                          opacity: shown ? 1 : 0,
                          transitionDelay: `${Math.min(i, 30) * 25}ms`,
                          background: `radial-gradient(circle, rgba(255,${Math.round(190 - heat * 150)},0,${0.35 + heat * 0.6}) 0%, rgba(255,90,0,${0.18 + heat * 0.3}) 35%, rgba(255,60,0,0) 70%)`,
                        }}
                      />
                      {s.rage > 0 && (
                        <div
                          className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white bg-rose-600 shadow animate-pulse pointer-events-none"
                          style={{ left: `${(s.x / width) * 100}%`, top: `${(s.y / height) * 100}%` }}
                          title={`${s.rage} rage click${s.rage > 1 ? 's' : ''}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Most clicked elements */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Most clicked elements</h3>
              <p className="text-[11px] text-slate-500">What visitors actually click on this page</p>
            </div>

            {topElements.length > 0 ? (
              <div className="space-y-3">
                {topElements.map((e, i) => {
                  const { label, Icon } = elementKind(e.tag);
                  const topCount = topElements[0].count;
                  return (
                    <div key={`${e.tag}|${e.id}|${e.text}|${e.classes}`} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-slate-400 shrink-0">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-words">{elementName(e)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-500 flex items-center gap-x-2 flex-wrap">
                              <span>{label}</span>
                              {e.id && e.text && <span className="font-mono">#{e.id}</span>}
                              {e.rageCount > 0 && <span className="text-rose-500 font-medium">{e.rageCount} rage</span>}
                              {e.deadCount > 0 && <span className="text-amber-500 font-medium" title="Clicked, but nothing interactive is there">{e.deadCount} dead</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{e.count.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{elementTotal > 0 ? Math.round((e.count / elementTotal) * 100) : 0}%</div>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-red-500 transition-[width] duration-700 ease-out" style={{ width: shown ? `${(e.count / topCount) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">Element names aren't available for these clicks yet. They appear as soon as visitors click with the current tracker script.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
