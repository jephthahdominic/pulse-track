import React, { useState } from 'react';
import {
  Clock,
  Search,
  Filter,
  Eye,
  ChevronRight,
  X,
  Laptop,
  Smartphone,
  Globe,
  CornerDownRight,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { UserSession } from '../types';

interface SessionsExplorerProps {
  sessions: UserSession[];
}

export const SessionsExplorer: React.FC<SessionsExplorerProps> = ({ sessions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);

  const filtered = sessions.filter(
    (s) =>
      s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userId && s.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.geo.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.entryPage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>Session Explorer & User Timelines</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect individual visitor journeys, step-by-step page flows, and duration
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search session ID, country, user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Session & User</th>
                <th className="pb-3">Location & Device</th>
                <th className="pb-3">Entry Page</th>
                <th className="pb-3">Exit Page</th>
                <th className="pb-3 text-right">Duration</th>
                <th className="pb-3 text-right">Pageviews</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-medium text-slate-900 dark:text-white">
                    <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {s.sessionId}
                    </div>
                    {s.userId ? (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-0.5">
                        <UserCheck className="w-3 h-3 mr-1" /> {s.userId}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">Anonymous Visitor</div>
                    )}
                  </td>

                  <td className="py-3">
                    <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.geo.city}, {s.geo.country}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      {s.device.deviceType === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                      <span>{s.device.browser} ({s.device.os})</span>
                    </div>
                  </td>

                  <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                    {s.entryPage}
                  </td>

                  <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                    {s.exitPage}
                  </td>

                  <td className="py-3 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s
                  </td>

                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                      {s.pageViewsCount} views
                    </span>
                  </td>

                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedSession(s)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm"
                    >
                      View Timeline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Session Timeline: {selectedSession.sessionId}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSession.geo.city}, {selectedSession.geo.country} • {selectedSession.device.browser} on {selectedSession.device.os}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                User Journey Activity Sequence
              </div>

              {/* Step 1: Entry */}
              <div className="flex space-x-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 my-1" />
                </div>
                <div className="pb-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Session Started & Entry Page</div>
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    GET {selectedSession.entryPage}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Referrer: Direct / Organic Search • Screen: {selectedSession.device.screenWidth}x{selectedSession.device.screenHeight}
                  </div>
                </div>
              </div>

              {/* Step 2: Product View */}
              <div className="flex space-x-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 my-1" />
                </div>
                <div className="pb-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Route Change & Page View</div>
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    GET /products/quantum-headphones
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Duration: 42s • Scroll Depth: 75%
                  </div>
                </div>
              </div>

              {/* Step 3: Button Click */}
              <div className="flex space-x-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 my-1" />
                </div>
                <div className="pb-4">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Custom Event & Click</div>
                  <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Pulse.track("AddToCart", &#123; productId: "prod_99" &#125;)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Target: BUTTON#btn-buy-now • Coordinates: (X: 420, Y: 180)
                  </div>
                </div>
              </div>

              {/* Step 4: Checkout */}
              <div className="flex space-x-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Session Ended / Exit</div>
                  <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                    GET {selectedSession.exitPage}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Total Duration: {selectedSession.durationSeconds}s
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
