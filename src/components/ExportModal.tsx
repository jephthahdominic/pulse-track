import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  X,
  Check,
  Copy,
  Calendar,
  Layers,
  Database,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Project, Workspace, Timeframe, OverviewStats } from '../types';
import {
  exportOverviewCSV,
  exportSessionsCSV,
  exportEventsCSV,
  exportErrorsCSV,
  exportProjectJSON,
  triggerFileDownload,
} from '../services/exportService';
import { db } from '../services/db';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  currentWorkspace: Workspace;
  timeframe: Timeframe;
  stats: OverviewStats;
}

export type DatasetOption = 'overview' | 'sessions' | 'events' | 'errors' | 'all';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  currentWorkspace,
  timeframe,
  stats,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<DatasetOption>('overview');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    // Refresh stats if timeframe changed
    const activeStats = db.getOverviewStats(currentProject.id, selectedTimeframe as any);
    const sessions = db.sessions.filter((s) => s.projectId === currentProject.id);
    const events = db.customEvents.filter((e) => e.projectId === currentProject.id);
    const errors = db.errorLogs.filter((err) => err.projectId === currentProject.id);

    if (exportFormat === 'json') {
      exportProjectJSON(currentProject, currentWorkspace, selectedTimeframe);
      setLastExportMessage(`Exported ${currentProject.name} full JSON report!`);
    } else {
      // CSV Export based on selected dataset
      switch (selectedDataset) {
        case 'overview':
          exportOverviewCSV(currentProject, activeStats, selectedTimeframe);
          setLastExportMessage(`Exported Overview CSV for ${selectedTimeframe.toUpperCase()}`);
          break;
        case 'sessions':
          exportSessionsCSV(currentProject, sessions);
          setLastExportMessage(`Exported ${sessions.length} sessions as CSV`);
          break;
        case 'events':
          exportEventsCSV(currentProject, events);
          setLastExportMessage(`Exported ${events.length} custom event metrics as CSV`);
          break;
        case 'errors':
          exportErrorsCSV(currentProject, errors);
          setLastExportMessage(`Exported ${errors.length} error logs as CSV`);
          break;
        case 'all':
        default:
          exportOverviewCSV(currentProject, activeStats, selectedTimeframe);
          exportSessionsCSV(currentProject, sessions);
          exportEventsCSV(currentProject, events);
          exportErrorsCSV(currentProject, errors);
          setLastExportMessage(`Exported all project datasets as CSV bundle`);
          break;
      }
    }

    setTimeout(() => {
      setLastExportMessage(null);
    }, 4000);
  };

  const handleCopyJSON = () => {
    const activeStats = db.getOverviewStats(currentProject.id, selectedTimeframe as any);
    const sessions = db.sessions.filter((s) => s.projectId === currentProject.id);
    const events = db.customEvents.filter((e) => e.projectId === currentProject.id);
    const errors = db.errorLogs.filter((err) => err.projectId === currentProject.id);
    const vitals = db.webVitals.filter((v) => v.projectId === currentProject.id);

    const fullDump = {
      project: currentProject.name,
      domain: currentProject.domain,
      exportedAt: new Date().toISOString(),
      timeframe: selectedTimeframe,
      overview: activeStats,
      sessions,
      events,
      errors,
      vitals,
    };

    navigator.clipboard.writeText(JSON.stringify(fullDump, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-600/10 text-blue-500 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Export Analytics Data
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Download reports for {currentProject.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Success Banner if exported */}
          {lastExportMessage && (
            <div className="flex items-center space-x-2 p-2.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{lastExportMessage}</span>
            </div>
          )}

          {/* 1. Format Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              1. Select File Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                  exportFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold">CSV Spreadsheet</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                    Compatible with Excel, Sheets, R, Python
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportFormat('json')}
                className={`flex items-center space-x-3 p-3 rounded-lg border text-left transition-all ${
                  exportFormat === 'json'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <FileJson className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold">JSON Document</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                    Structured full telemetry & schema payload
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Dataset Selection (if CSV format) */}
          {exportFormat === 'csv' && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                2. Select Dataset Module
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'overview' as DatasetOption, label: 'Overview & KPIs', desc: 'Pageviews, trend, top pages' },
                  { id: 'sessions' as DatasetOption, label: 'User Sessions', desc: 'Browsers, devices, durations' },
                  { id: 'events' as DatasetOption, label: 'Custom Events', desc: 'Conversions & revenue' },
                  { id: 'errors' as DatasetOption, label: 'Error Logs', desc: 'Exceptions & affected users' },
                  { id: 'all' as DatasetOption, label: 'All Modules (Zip Bundle)', desc: 'Exports individual CSVs' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDataset(item.id)}
                    className={`p-2.5 rounded border text-left transition-all ${
                      selectedDataset === item.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                    } ${item.id === 'all' ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Timeframe Option */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                Timeframe Filter
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Current: {selectedTimeframe.toUpperCase()}</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-zinc-900 rounded p-1 border border-slate-200 dark:border-zinc-800 text-xs">
              {(['1h', '24h', '7d', '30d'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`flex-1 py-1 rounded text-center text-xs font-medium transition-all ${
                    selectedTimeframe === tf
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 flex items-center justify-between">
          <button
            onClick={handleCopyJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {copiedJSON ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedJSON ? 'Copied to Clipboard!' : 'Copy Raw JSON'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {exportFormat.toUpperCase()} Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
