import React from 'react';
import { ShieldAlert, Cpu, HardDrive, Database, Server, Activity, Users, DollarSign, Zap } from 'lucide-react';
import { AdminPlatformStats } from '../types';

interface AdminPanelProps {
  adminStats: AdminPlatformStats;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminStats }) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Platform Administration & Server Infrastructure</h2>
            <p className="text-xs text-slate-300">
              Cluster health, Redis BullMQ ingestion queues, total platform bandwidth, and MRR
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>ALL CLUSTERS HEALTHY</span>
        </span>
      </div>

      {/* Enterprise Platform Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Monthly Recurring Revenue</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${adminStats.monthlyRecurringRevenue.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">+18.4% MRR Growth</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Enterprise Customers</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {adminStats.totalCustomers}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Active workspaces</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">24h Events Processed</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
            {(adminStats.totalEventsProcessed24h / 1000000).toFixed(2)}M
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Batch worker pipeline</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">BullMQ Queue Latency</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {adminStats.queueLatencyMs} ms
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Redis Queue Ingestion</div>
        </div>
      </div>

      {/* Cluster Server Metrics */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">NestJS API & Redis Worker Cluster Diagnostics</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>API Server CPU Load</span>
              </span>
              <span>{adminStats.serverCpuUsagePercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${adminStats.serverCpuUsagePercentage}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-cyan-500" />
                <span>Container RAM Allocation</span>
              </span>
              <span>{adminStats.serverMemoryUsagePercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${adminStats.serverMemoryUsagePercentage}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Redis Memory RAM</span>
              </span>
              <span>{adminStats.redisMemoryUsedMb} MB</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
