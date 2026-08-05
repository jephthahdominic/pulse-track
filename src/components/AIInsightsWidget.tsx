import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { Project, Timeframe } from '../types';

interface AIInsightsWidgetProps {
  project: Project;
  timeframe: Timeframe;
  onNavigateTab?: (tab: string) => void;
}

export interface PerformanceInsight {
  title: string;
  impact: 'high' | 'medium' | 'low';
  metric: string;
  description: string;
  recommendation: string;
}

export interface ErrorDiagnostic {
  errorName: string;
  severity: 'critical' | 'warning' | 'info';
  affectedArea: string;
  plainLanguageExplanation: string;
  suggestedFix: string;
}

export interface AIInsightsPayload {
  healthScore: number;
  healthStatus: string;
  executiveSummary: string;
  performanceInsights: PerformanceInsight[];
  errorDiagnostics: ErrorDiagnostic[];
  actionableSteps: string[];
  customAnswer?: string | null;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  project,
  timeframe,
  onNavigateTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsightsPayload | null>(null);
  const [activeTab, setActiveTab] = useState<'perf' | 'errors' | 'actions'>('perf');
  const [customQuestion, setCustomQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [modelSource, setModelSource] = useState<string>('');
  const [expandedErrorIndex, setExpandedErrorIndex] = useState<number | null>(0);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchAIInsights = async (question?: string) => {
    if (question) { setAskingQuestion(true); } else { setLoading(true); }
    setRateLimitMsg(null);

    try {
      const response = await fetch('/api/v1/analytics/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, timeframe, customQuestion: question || undefined }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setRateLimitMsg(data.error || 'Rate limit reached. Try again later.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.insights) {
          setInsights(data.insights);
          setModelSource(data.source || '');
          setFromCache(data.source === 'cache');
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI Insights:', err);
    } finally {
      setLoading(false);
      setAskingQuestion(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, [project.id, timeframe]);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || askingQuestion) return;
    fetchAIInsights(customQuestion.trim());
  };

  // Helper for impact color styling
  const getImpactBadge = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'medium':
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'low':
      case 'info':
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 85) return { text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
    if (score >= 70) return { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500/30' };
    return { text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500/30' };
  };

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-indigo-950/20 dark:via-[#09090b] dark:to-zinc-900/30 p-4 sm:p-5 shadow-sm space-y-4 relative overflow-hidden">
      {/* Background Decorative Accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                AI Diagnostics & Health Insights
              </h3>
              {modelSource && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border flex items-center gap-1 ${
                  fromCache
                    ? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
                    : modelSource.startsWith('gemini')
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                  <Cpu className="w-2.5 h-2.5" />
                  {fromCache ? 'Cached' : modelSource.startsWith('gemini') ? modelSource : 'Rule Engine'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Automated telemetry evaluation of traffic, Core Web Vitals, and runtime error logs
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAIInsights()}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Refresh AI Analysis'}</span>
        </button>
      </div>

      {/* Rate limit error */}
      {rateLimitMsg && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{rateLimitMsg}</span>
        </div>
      )}

      {/* Skeleton Loading State */}
      {loading && !insights && (
        <div className="py-8 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-2/3 animate-pulse" />
            </div>
          </div>
          <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="text-center text-xs text-indigo-500 font-medium py-2 flex items-center justify-center space-x-2">
            <Bot className="w-4 h-4 animate-bounce" />
            <span>Gemini is evaluating error stack traces and web performance metrics...</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {insights && (
        <div className="space-y-4">
          {/* System Health Score & Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/70 dark:bg-zinc-900/50 rounded-xl p-3.5 border border-slate-200/80 dark:border-zinc-800/80">
            {/* Health Score Gauge */}
            <div className="flex flex-col justify-center items-center p-2 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-zinc-800/80">
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider mb-1">
                Project Health Score
              </div>
              <div className="flex items-baseline space-x-1">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${getHealthColor(insights.healthScore).text}`}>
                  {insights.healthScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/100</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded border uppercase tracking-wider ${getImpactBadge(insights.healthStatus)}`}>
                {insights.healthStatus}
              </span>
            </div>

            {/* Executive Summary */}
            <div className="md:col-span-3 flex flex-col justify-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                <Bot className="w-3 h-3" /> Plain-Language Executive Diagnostic
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-normal">
                {insights.executiveSummary}
              </p>
            </div>
          </div>

          {/* Custom Question Answer Callout (if present) */}
          {insights.customAnswer && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-1 animate-fadeIn">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>Targeted Inquiry Answer</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-mono">
                {insights.customAnswer}
              </p>
            </div>
          )}

          {/* Tab Navigation for Detailed Analysis */}
          <div className="flex border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold gap-4">
            <button
              onClick={() => setActiveTab('perf')}
              className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'perf'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 font-bold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Performance Bottlenecks ({insights.performanceInsights.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'errors'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 font-bold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span>Error Stack Diagnostics ({insights.errorDiagnostics.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`pb-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'actions'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 font-bold'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recommended Action Plan ({insights.actionableSteps.length})</span>
            </button>
          </div>

          {/* TAB 1: Performance Bottlenecks */}
          {activeTab === 'perf' && (
            <div className="space-y-3">
              {insights.performanceInsights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                        {item.metric}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getImpactBadge(item.impact)}`}>
                      {item.impact} Impact
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    <strong className="text-slate-900 dark:text-zinc-100">Diagnosis: </strong>
                    {item.description}
                  </p>

                  <div className="flex items-start space-x-2 pt-1 text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded border border-indigo-100 dark:border-indigo-900/30">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Suggested Optimization: </strong> {item.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Error Log Diagnostics */}
          {activeTab === 'errors' && (
            <div className="space-y-3">
              {insights.errorDiagnostics.map((err, idx) => {
                const isExpanded = expandedErrorIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedErrorIndex(isExpanded ? null : idx)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="flex items-center space-x-2.5">
                        <ShieldAlert className={`w-4 h-4 ${err.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono">
                            {err.errorName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                            Location: {err.affectedArea}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getImpactBadge(err.severity)}`}>
                          {err.severity}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/60 space-y-2 text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-zinc-100">Plain-Language Root Cause:</strong>
                          <p className="text-slate-600 dark:text-zinc-300 mt-0.5">{err.plainLanguageExplanation}</p>
                        </div>
                        <div className="p-2.5 rounded bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          <strong>Fix Guidance: </strong> {err.suggestedFix}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Recommended Action Plan */}
          {activeTab === 'actions' && (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 mb-2">
                Prioritized Engineer Checklist
              </div>
              <ul className="space-y-2 text-xs">
                {insights.actionableSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-normal">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ask Gemini Custom Question Section */}
          <form onSubmit={handleAskSubmit} className="pt-2 flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask Gemini about specific issues e.g. 'Why is bounce rate high on checkout?'..."
              className="flex-1 px-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={askingQuestion || !customQuestion.trim()}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {askingQuestion ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
