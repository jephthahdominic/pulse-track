import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  maxDate?: Date;
  forceShowLabel?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, maxDate, forceShowLabel }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? parseISO(value) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  function parseISO(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && value) {
      const d = parseISO(value);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const todayStr = toISO(new Date());
  const maxStr = maxDate ? toISO(maxDate) : todayStr;

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const startWeekday = new Date(view.year, view.month, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    setView((v) => {
      const m = v.month === 0 ? 11 : v.month - 1;
      const y = v.month === 0 ? v.year - 1 : v.year;
      return { year: y, month: m };
    });
  };

  const nextMonth = () => {
    setView((v) => {
      const m = v.month === 11 ? 0 : v.month + 1;
      const y = v.month === 11 ? v.year + 1 : v.year;
      return { year: y, month: m };
    });
  };

  const select = (day: number) => {
    onChange(toISO(new Date(view.year, view.month, day)));
    setOpen(false);
  };

  const displayLabel = value
    ? parseISO(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Pick a specific date"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
          value
            ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            : 'bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span className={forceShowLabel ? 'inline' : 'hidden sm:inline'}>{displayLabel}</span>
        {value && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="ml-0.5 p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-zinc-700 transition-colors"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-64 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl p-3 z-50 text-xs">
          {/* Header: month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-900 dark:text-zinc-100">
              {MONTHS[view.month]} {view.year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {cells.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />;
              const iso = toISO(new Date(view.year, view.month, day));
              const isSelected = iso === value;
              const isToday = iso === todayStr;
              const isFuture = iso > maxStr;
              return (
                <button
                  key={iso}
                  disabled={isFuture}
                  onClick={() => select(day)}
                  className={`aspect-square w-full flex items-center justify-center rounded-md text-[11px] font-medium transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold ring-1 ring-indigo-500/40'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer quick actions */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
              {value ? 'Showing metrics for this day' : 'Pick a day'}
            </span>
            <button
              onClick={() => { onChange(todayStr); setOpen(false); }}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
