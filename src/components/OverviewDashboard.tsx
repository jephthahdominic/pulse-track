import React from 'react';
import {
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Radio,
  AlertTriangle,
  Zap,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ChevronRight,
  ShieldCheck,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { OverviewStats, Timeframe, Project } from '../types';
import { AIInsightsWidget } from './AIInsightsWidget';

interface OverviewDashboardProps {
  stats: OverviewStats;
  timeframe: Timeframe;
  onNavigateTab: (tab: string) => void;
  onOpenExport?: () => void;
  currentProject?: Project;
  authHeaders?: Record<string, string>;
}

interface RealtimeFeedEntry {
  id: string;
  type: 'visit' | 'click' | 'event' | 'purchase' | 'error' | 'identify';
  user: string;
  action: string;
  target: string;
  timestamp: number;
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  timeframe,
  onNavigateTab,
  onOpenExport,
  authHeaders,
  currentProject = {
    id: 'proj_default',
    workspaceId: 'ws_prod',
    name: 'PulseTrack Store',
    domain: 'pulsetrack-shop.io',
    publicKey: '',
    secretKey: '',
    activeVisitors: 0,
    totalEvents24h: 0,
    status: 'active' as const,
    aiInsightsEnabled: true,
    healthInsightsEnabled: true,
    createdAt: new Date().toISOString(),
  },
}) => {
  const [chartMetric, setChartMetric] = React.useState<'pageViews' | 'visitors' | 'sessions'>('pageViews');
  const [refAreaLeft, setRefAreaLeft] = React.useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = React.useState<string | null>(null);
  const [zoomStartIndex, setZoomStartIndex] = React.useState<number | null>(null);
  const [zoomEndIndex, setZoomEndIndex] = React.useState<number | null>(null);
  const [chartStyle, setChartStyle] = React.useState<'area' | 'line'>('area');
  const [realtimeFeed, setRealtimeFeed] = React.useState<RealtimeFeedEntry[]>([]);

  const fetchRealtimeFeed = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (currentProject?.id) params.set('projectId', currentProject.id);
      const qs = params.toString();
      const res = await fetch(`/api/v1/analytics/realtime${qs ? `?${qs}` : ''}`, { headers: authHeaders || {} });
      if (!res.ok) return;
      const data = await res.json();
      setRealtimeFeed(data.entries || []);
    } catch {
      // Keep the last successfully loaded feed
    }
  }, [currentProject?.id, authHeaders]);

  React.useEffect(() => {
    fetchRealtimeFeed();
    const interval = setInterval(fetchRealtimeFeed, 5000);
    return () => clearInterval(interval);
  }, [fetchRealtimeFeed]);

  const displayedSeries = React.useMemo(() => {
    if (zoomStartIndex !== null && zoomEndIndex !== null) {
      const start = Math.min(zoomStartIndex, zoomEndIndex);
      const end = Math.max(zoomStartIndex, zoomEndIndex);
      return stats.hourlySeries.slice(start, end + 1);
    }
    return stats.hourlySeries;
  }, [stats.hourlySeries, zoomStartIndex, zoomEndIndex]);

  const handleZoomIn = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const indexLeft = stats.hourlySeries.findIndex((item) => item.time === refAreaLeft);
    const indexRight = stats.hourlySeries.findIndex((item) => item.time === refAreaRight);

    if (indexLeft !== -1 && indexRight !== -1) {
      const start = Math.min(indexLeft, indexRight);
      const end = Math.max(indexLeft, indexRight);
      setZoomStartIndex(start);
      setZoomEndIndex(end);
    }

    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    setZoomStartIndex(null);
    setZoomEndIndex(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const setRefLabel = (label: string | number | undefined) => (typeof label === 'string' ? label : String(label ?? ''));

  const isZoomed = zoomStartIndex !== null && zoomEndIndex !== null;

  const realtimeLogEntries = realtimeFeed.map((e) => ({
    id: e.id,
    time: new Date(e.timestamp).toLocaleTimeString('en-GB', { hour12: false }),
    user: e.user,
    action: e.action,
    target: e.target,
    targetColor:
      e.type === 'error'
        ? 'text-red-400 underline font-bold'
        : e.type === 'click'
        ? 'text-green-400 font-bold'
        : e.type === 'purchase'
        ? 'text-emerald-400 font-bold'
        : e.type === 'identify'
        ? 'text-zinc-500 italic'
        : 'text-indigo-400',
  }));

  return (
    <div className="space-y-4">
      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pageviews */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm">
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">
            Total Pageviews
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {stats.totalVisitors.toLocaleString()}
            </span>
            <span className="text-[10px] text-green-500 font-medium">+14.2%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[65%]" />
          </div>
        </div>

        {/* Unique Sessions */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm">
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">
            Unique Sessions
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {stats.uniqueVisitors.toLocaleString()}
            </span>
            <span className="text-[10px] text-green-500 font-medium">+8.7%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-[42%]" />
          </div>
        </div>

        {/* Avg Bounce Rate */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm">
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">
            Avg. Bounce Rate
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {stats.bounceRate}%
            </span>
            <span className="text-[10px] text-red-500 font-medium">-2.1%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 w-[24%]" />
          </div>
        </div>

        {/* Active Now / Live */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm">
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">
            Active Now (Realtime)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              {stats.liveUsersCount}
            </span>
            <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[88%]" />
          </div>
        </div>
      </div>

      {/* AI Insights & Diagnostics Widget */}
      <AIInsightsWidget
        project={currentProject}
        timeframe={timeframe}
        onNavigateTab={onNavigateTab}
      />

      {/* Traffic Analytics & Realtime Feed Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Traffic Timeseries Chart */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/10 flex flex-col overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-slate-50 dark:bg-zinc-900/30">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-blue-500" />
                <span>Interactive Hourly Trends</span>
              </h3>

              {isZoomed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 animate-fadeIn">
                  <span>Zoomed: {displayedSeries[0]?.time} - {displayedSeries[displayedSeries.length - 1]?.time}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isZoomed && (
                <button
                  onClick={handleResetZoom}
                  className="flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Zoom</span>
                </button>
              )}

              {/* Chart Style Toggle */}
              <div className="flex gap-1 text-[10px] bg-slate-200/60 dark:bg-zinc-800 p-0.5 rounded">
                <button
                  onClick={() => setChartStyle('area')}
                  className={`px-2 py-0.5 rounded transition-all ${chartStyle === 'area' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'}`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartStyle('line')}
                  className={`px-2 py-0.5 rounded transition-all ${chartStyle === 'line' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'}`}
                >
                  Line
                </button>
              </div>

              {/* Metric Selector */}
              <div className="flex gap-1 text-[10px] bg-slate-200/60 dark:bg-zinc-800 p-0.5 rounded">
                <button
                  onClick={() => setChartMetric('pageViews')}
                  className={`px-2 py-0.5 rounded transition-all ${chartMetric === 'pageViews' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-zinc-400'}`}
                >
                  Views
                </button>
                <button
                  onClick={() => setChartMetric('visitors')}
                  className={`px-2 py-0.5 rounded transition-all ${chartMetric === 'visitors' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-zinc-400'}`}
                >
                  Visitors
                </button>
                <button
                  onClick={() => setChartMetric('sessions')}
                  className={`px-2 py-0.5 rounded transition-all ${chartMetric === 'sessions' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-zinc-400'}`}
                >
                  Sessions
                </button>
              </div>

              {onOpenExport && (
                <button
                  onClick={onOpenExport}
                  className="flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag instruction notice bar */}
          <div className="px-4 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300">
            <span className="flex items-center gap-1.5 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span><strong>Click & drag</strong> across graph area to zoom into specific date/time ranges.</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono hidden md:inline">
              Showing {displayedSeries.length} hourly data points
            </span>
          </div>

          <div className="p-4 h-72 w-full select-none">
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'area' ? (
                <AreaChart
                  data={displayedSeries}
                  onMouseDown={(e) => e && setRefAreaLeft(setRefLabel(e.activeLabel))}
                  onMouseMove={(e) => e && refAreaLeft && setRefAreaRight(setRefLabel(e.activeLabel))}
                  onMouseUp={handleZoomIn}
                >
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} stroke="#27272a" />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} stroke="#27272a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fafafa',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                    animationDuration={300}
                  />
                  {refAreaLeft && refAreaRight && (
                    <ReferenceArea
                      x1={refAreaLeft}
                      x2={refAreaRight}
                    />
                  )}
                  <Brush
                    dataKey="time"
                    height={22}
                    stroke="#4f46e5"
                    fill="rgba(15, 23, 42, 0.4)"
                    tickFormatter={(value) => value}
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={displayedSeries}
                  onMouseDown={(e) => e && setRefAreaLeft(setRefLabel(e.activeLabel))}
                  onMouseMove={(e) => e && refAreaLeft && setRefAreaRight(setRefLabel(e.activeLabel))}
                  onMouseUp={handleZoomIn}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#71717a' }} stroke="#27272a" />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} stroke="#27272a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#fafafa',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={chartMetric}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 6, fill: '#60a5fa' }}
                    animationDuration={300}
                  />
                  {refAreaLeft && refAreaRight && (
                    <ReferenceArea
                      x1={refAreaLeft}
                      x2={refAreaRight}
                    />
                  )}
                  <Brush
                    dataKey="time"
                    height={22}
                    stroke="#4f46e5"
                    fill="rgba(15, 23, 42, 0.4)"
                    tickFormatter={(value) => value}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-200 dark:border-zinc-800 p-4 grid grid-cols-3 gap-4 bg-slate-50/50 dark:bg-zinc-900/20">
            <div className="space-y-1">
              <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase">Top Page</div>
              <div className="text-xs font-mono font-medium truncate text-slate-800 dark:text-zinc-200">
                {stats.topPages[0]?.path || '/products'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 italic">42.1% of traffic</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase">Main Referrer</div>
              <div className="text-xs font-mono font-medium truncate text-slate-800 dark:text-zinc-200">google.com</div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 italic">56.8% organic search</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase">Peak Device</div>
              <div className="text-xs font-mono font-medium truncate text-slate-800 dark:text-zinc-200">Mobile (iPhone)</div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 italic">68% total share</div>
            </div>
          </div>
        </div>

        {/* Realtime Activity Feed */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/10 flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/30 font-bold text-[10px] uppercase tracking-widest text-slate-700 dark:text-zinc-400 flex items-center justify-between">
            <span>Realtime Activity Feed</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[10px]">
            {realtimeLogEntries.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 p-1 rounded cursor-pointer">
                <span className="text-blue-500 font-medium">{log.time}</span>
                <span className="text-slate-900 dark:text-white font-medium">{log.user}</span>
                <span>{log.action}</span>
                <span className={log.targetColor}>{log.target}</span>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/30 space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-500">
              <span>System Health</span>
              <span className="text-emerald-500 font-bold">99.98%</span>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-[99.9%] bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section: Top Pages & Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Pages Table */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/20 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200">
                Top Active Pages
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('sessions')}
              className="text-[11px] text-blue-500 font-semibold hover:underline flex items-center"
            >
              View Sessions <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-2">Page Path</th>
                  <th className="pb-2 text-right">Pageviews</th>
                  <th className="pb-2 text-right">Unique Views</th>
                  <th className="pb-2 text-right">Traffic Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono text-[11px]">
                {stats.topPages.map((page, idx) => {
                  const maxViews = stats.topPages[0]?.views || 1;
                  const percent = Math.round((page.views / maxViews) * 100);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                      <td className="py-2 font-medium text-slate-800 dark:text-zinc-200">
                        {page.path}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900 dark:text-zinc-100">
                        {page.views.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-slate-500 dark:text-zinc-400">
                        {page.uniqueViews.toLocaleString()}
                      </td>
                      <td className="py-2 text-right w-28">
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Countries */}
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/20 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200">
              Top Countries
            </h3>
            <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          </div>

          <div className="space-y-2.5">
            {stats.topCountries.map((c, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-800 dark:text-zinc-300">
                    {c.country} ({c.code})
                  </span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{c.count} ({c.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${c.percentage * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Monitoring Diagnostics Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentProject.healthInsightsEnabled && (
          <div
            onClick={() => onNavigateTab('performance')}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  Core Web Vitals: {stats.webVitalsScore}/100 (Good)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  LCP 1.2s • CLS 0.02 • INP 85ms
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        )}

        <div
          onClick={() => onNavigateTab('errors')}
          className={`p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 shadow-sm hover:border-red-500/50 cursor-pointer transition-all flex items-center justify-between ${currentProject.healthInsightsEnabled ? '' : 'md:col-span-2'}`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                {stats.totalErrors} Unhandled Errors Detected
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                /api/payment 500 exception needs review
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
