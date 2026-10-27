import React from 'react';
import { CalendarClock, ChevronDown } from 'lucide-react';
import { Timeframe } from '../types';

export const PERIOD_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '1h', label: 'Last hour' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

interface PeriodSelectProps {
  timeframe: Timeframe;
  /** True when a single calendar day is picked instead of a rolling period */
  hasCustomDate?: boolean;
  onChange: (tf: Timeframe) => void;
  className?: string;
}

/** Compact period dropdown shared by the header and the mobile filter strip. */
export const PeriodSelect: React.FC<PeriodSelectProps> = ({ timeframe, hasCustomDate = false, onChange, className = '' }) => (
  <label className={`relative inline-flex items-center ${className}`}>
    <CalendarClock className="absolute left-2.5 w-3.5 h-3.5 text-blue-500 pointer-events-none" />
    <select
      aria-label="Time period"
      value={hasCustomDate ? 'custom' : timeframe}
      onChange={(e) => { if (e.target.value !== 'custom') onChange(e.target.value as Timeframe); }}
      className="appearance-none cursor-pointer h-8 pl-8 pr-7 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {hasCustomDate && <option value="custom">Custom day</option>}
      {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
  </label>
);
