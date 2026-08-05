import React, { useState, useEffect } from 'react';
import { Sparkles, ShoppingCart, AlertTriangle, ArrowRight, Check, MousePointer, Terminal, Zap, RefreshCw, Send, Radio } from 'lucide-react';
import Pulse from '../lib/sdk';
import { Project } from '../types';

interface DemoSandboxProps {
  project: Project;
  onRefreshAnalytics: () => void;
}

export const DemoSandbox: React.FC<DemoSandboxProps> = ({ project, onRefreshAnalytics }) => {
  const [cartCount, setCartCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'store' | 'pricing' | 'blog'>('store');
  const [sdkLogs, setSdkLogs] = useState<string[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Initialize real PulseTrack SDK with current project's public key
    Pulse.init({
      apiKey: project.publicKey,
      endpoint: '/api/v1/events',
      batchIntervalMs: 3000,
      maxBatchSize: 5,
      debug: true,
    });

    addLog(`[PulseTrack SDK] Initialized for project "${project.name}" with key ${project.publicKey}`);
  }, [project]);

  const addLog = (msg: string) => {
    setSdkLogs((prev) => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleAddToCart = (productName: string, price: number) => {
    setCartCount((prev) => prev + 1);
    Pulse.track('AddToCart', {
      productName,
      price,
      currency: 'USD',
      quantity: 1,
    });
    addLog(`Pulse.track("AddToCart", { productName: "${productName}", price: ${price} })`);
    setQueueCount((prev) => prev + 1);
  };

  const handleCheckout = () => {
    Pulse.track('Purchase', {
      orderId: `ord_live_${Math.floor(Math.random() * 9000) + 1000}`,
      amount: 249.99,
      currency: 'USD',
      itemCount: cartCount || 1,
    });
    Pulse.identify('usr_john_demo', {
      name: 'John Live Tester',
      email: 'john.tester@example.com',
      plan: 'Pro Sandbox',
    });
    setCartCount(0);
    addLog(`Pulse.track("Purchase", { amount: 249.99 }) & Pulse.identify("usr_john_demo")`);
    setQueueCount((prev) => prev + 2);
  };

  const handleTriggerError = () => {
    try {
      // Intentionally cause runtime error
      const obj: any = undefined;
      obj.invalidPropertyAccess();
    } catch (err: any) {
      Pulse.trackError({
        type: 'js_exception',
        message: err.message || 'TypeError: Cannot read properties of undefined in Sandbox',
        stack: err.stack,
      });
      addLog(`Pulse.trackError({ message: "${err.message}" })`);
      setQueueCount((prev) => prev + 1);
    }
  };

  const handleFlushQueue = async () => {
    addLog('[SDK] Manually flushing event queue to /api/v1/events...');
    await Pulse.flush();
    setQueueCount(0);
    addLog('[SDK] Queue successfully flushed! Updating dashboard metrics...');
    onRefreshAnalytics();
  };

  const navigateTab = (tab: 'store' | 'pricing' | 'blog') => {
    setActiveTab(tab);
    const path = tab === 'store' ? '/' : `/${tab}`;
    Pulse.trackPageView(`https://${project.domain}${path}`, `Acme Store - ${tab}`);
    addLog(`Pulse.trackPageView("https://${project.domain}${path}")`);
    setQueueCount((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-950 to-indigo-900 text-white shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-cyan-400 flex items-center justify-center font-bold border border-indigo-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Interactive Live Target Sandbox</h2>
            <p className="text-xs text-indigo-200">
              Test real-time event capture, batching queue, error logging, and identify triggers on a simulated store
            </p>
          </div>
        </div>

        <button
          onClick={handleFlushQueue}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>Flush Batch Queue Now ({queueCount} Queued)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulated Web Application Target */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {/* Simulated Browser Bar */}
          <div className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs flex items-center justify-between border border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-2 text-indigo-400 font-bold">https://{project.domain}{activeTab === 'store' ? '/' : `/${activeTab}`}</span>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => navigateTab('store')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${activeTab === 'store' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Store
              </button>
              <button
                onClick={() => navigateTab('pricing')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${activeTab === 'pricing' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Pricing
              </button>
              <button
                onClick={() => navigateTab('blog')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${activeTab === 'blog' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Blog
              </button>
            </div>
          </div>

          {/* Target Content */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Acme Electronics Store</h3>
                  <p className="text-xs text-slate-500">Interact with buttons to trigger SDK events</p>
                </div>

                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Cart ({cartCount})</span>
                </div>
              </div>

              {/* Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Quantum Headphones Pro</div>
                  <div className="text-xs text-slate-500">$249.99 • Active Noise Cancelling</div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleAddToCart('Quantum Headphones Pro', 249.99)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Ultralight Smartwatch v2</div>
                  <div className="text-xs text-slate-500">$199.00 • Fitness Tracking</div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleAddToCart('Smartwatch v2', 199.00)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons to Trigger Edge Cases */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white">SDK Diagnostics & Edge Case Triggers</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCheckout}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                  >
                    Complete Purchase ($249.99)
                  </button>

                  <button
                    onClick={handleTriggerError}
                    className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Trigger JS Error Exception</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="p-8 text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pricing & Plans Page</h3>
              <p className="text-xs text-slate-500">Route change event automatically captured by SDK</p>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="p-8 text-center space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Engineering Blog</h3>
              <p className="text-xs text-slate-500">Scroll depth and read time automatically calculated</p>
            </div>
          )}
        </div>

        {/* Live SDK Real-Time Terminal Inspector */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 space-y-4 flex flex-col h-[480px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold font-mono text-cyan-400 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>@pulsetrack/sdk Output</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400">
              Queue: {queueCount} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed">
            {sdkLogs.map((log, idx) => (
              <div key={idx} className="text-slate-300">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
