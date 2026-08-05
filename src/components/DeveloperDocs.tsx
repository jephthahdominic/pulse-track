import React, { useState } from 'react';
import { Code2, Terminal, Copy, Check, FileText, Server, Layers, Package, Globe, BookOpen } from 'lucide-react';

export const DeveloperDocs: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const npmCode = `npm install @pulsetrack/sdk`;

  const reactProviderCode = `import { PulseTrackProvider } from "@pulsetrack/sdk";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PulseTrackProvider apiKey="pk_live_98a72f1b4c6e801d">
      {children}
    </PulseTrackProvider>
  );
}`;

  const cdnScriptCode = `<!-- Paste before closing </head> tag -->
<script
  src="https://cdn.pulsetrack.io/tracker.min.js"
  data-api-key="pk_live_98a72f1b4c6e801d"
  defer
></script>`;

  const apiMethodsCode = `import Pulse from "@pulsetrack/sdk";

// 1. Track custom conversion event
Pulse.track("Purchase", {
  amount: 4000,
  currency: "NGN",
  plan: "Pro"
});

// 2. Identify user ID & traits
Pulse.identify("usr_john_doe", {
  name: "John Doe",
  email: "john@example.com"
});

// 3. Set global metadata
Pulse.setMetadata({
  environment: "production"
});`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Developer Documentation & API Explorer</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SDK integration guides, script tags, REST Swagger endpoints, and Turborepo architecture
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SDK Installation & Usage */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <span>@pulsetrack/sdk Installation</span>
          </h3>

          {/* NPM Command */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">1. Install Package via NPM</label>
            <div className="flex items-center space-x-2">
              <pre className="flex-1 p-3 rounded-xl bg-slate-950 text-cyan-400 font-mono text-xs overflow-x-auto border border-slate-800">
                {npmCode}
              </pre>
              <button
                onClick={() => copyCode(npmCode, 1)}
                className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
              >
                {copiedIndex === 1 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* React Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">2. React / Next.js Provider Integration</label>
            <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {reactProviderCode}
            </pre>
          </div>

          {/* CDN Script Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">3. HTML CDN Script Tag Snippet</label>
            <pre className="p-3.5 rounded-xl bg-slate-950 text-amber-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {cdnScriptCode}
            </pre>
          </div>

          {/* SDK Public API */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">4. Tracking API Usage</label>
            <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {apiMethodsCode}
            </pre>
          </div>
        </div>

        {/* REST API Endpoints & Monorepo Architecture */}
        <div className="space-y-6">
          {/* Swagger API Endpoints */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              <span>Analytics Ingestion REST API</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-[10px]">POST</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/v1/events</span>
                </div>
                <span className="text-[10px] text-slate-400">Batch Event Ingestion</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-[10px]">POST</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/v1/identify</span>
                </div>
                <span className="text-[10px] text-slate-400">Identify User & Traits</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-[10px]">POST</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/v1/performance</span>
                </div>
                <span className="text-[10px] text-slate-400">Core Web Vitals Metric</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-extrabold text-[10px]">POST</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">/api/v1/error</span>
                </div>
                <span className="text-[10px] text-slate-400">JS Error Exception</span>
              </div>
            </div>
          </div>

          {/* Turborepo Architecture */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Turborepo Monorepo Layout</span>
            </h3>

            <pre className="p-4 rounded-xl bg-slate-950 text-indigo-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`apps/
  dashboard/    # Next.js Analytics App
  api/          # NestJS REST API Service
packages/
  sdk/          # TypeScript Lightweight Tracker
  shared/       # Shared Types & Schemas
workers/        # BullMQ Ingestion Queue Workers
docker/         # Dockerfile & Docker Compose`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
