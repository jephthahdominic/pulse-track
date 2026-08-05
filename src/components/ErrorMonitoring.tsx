import React, { useState } from 'react';
import { AlertTriangle, Bug, XCircle, CheckCircle2, ChevronRight, Terminal, RefreshCw } from 'lucide-react';
import { ErrorLog } from '../types';

interface ErrorMonitoringProps {
  errors: ErrorLog[];
}

export const ErrorMonitoring: React.FC<ErrorMonitoringProps> = ({ errors }) => {
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(errors[0] || null);
  const [errorState, setErrorState] = useState<ErrorLog[]>(errors);

  const toggleStatus = (id: string) => {
    setErrorState((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextStatus: ErrorLog['status'] =
            e.status === 'unresolved' ? 'investigating' : e.status === 'investigating' ? 'resolved' : 'unresolved';
          return { ...e, status: nextStatus };
        }
        return e;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">JavaScript & API Error Monitoring</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatic stack trace capture, network failures, and 404/500 API exception logs
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Error Exception List */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Grouped Unhandled Errors</h3>

          <div className="space-y-2">
            {errorState.map((err) => (
              <div
                key={err.id}
                onClick={() => setSelectedError(err)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedError?.id === err.id
                    ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-500 dark:border-rose-500 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {err.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {err.url}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white font-mono">
                      {err.message}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1 shrink-0">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      {err.occurrences} events
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(err.id);
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        err.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : err.status === 'investigating'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                      }`}
                    >
                      {err.status.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stack Trace Inspector */}
        {selectedError ? (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                  <Bug className="w-4 h-4 text-rose-500" />
                  <span>Stack Trace Inspector</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ID: {selectedError.id}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400">Error Message</div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-mono font-bold text-rose-700 dark:text-rose-300">
                {selectedError.message}
              </div>
            </div>

            {selectedError.stack && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400">Stack Trace</div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedError.stack}
                </pre>
              </div>
            )}

            <div className="text-xs space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Browser</span>
                <span className="font-semibold">{selectedError.browser}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operating System</span>
                <span className="font-semibold">{selectedError.os}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            Select an error to inspect stack trace
          </div>
        )}
      </div>
    </div>
  );
};
