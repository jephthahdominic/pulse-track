import React from 'react';

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />
);

const Card: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 ${className}`}>
    {children}
  </div>
);

/** Placeholder shown while a project's real data is loading, so demo data never flashes. */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse" role="status" aria-label="Loading dashboard">
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Bar className="h-5 w-48" />
        <Bar className="h-3 w-72 max-w-full" />
      </div>
      <Bar className="h-9 w-28 rounded-xl" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="space-y-3">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-20" />
          <Bar className="h-3 w-16" />
        </Card>
      ))}
    </div>

    <Card className="space-y-4">
      <Bar className="h-4 w-40" />
      <Bar className="h-56 w-full rounded-xl" />
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <Card key={i} className="space-y-3">
          <Bar className="h-4 w-32" />
          {[0, 1, 2, 3].map((j) => <Bar key={j} className="h-8 w-full" />)}
        </Card>
      ))}
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);
