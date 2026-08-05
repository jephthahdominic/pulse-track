import React, { useState } from 'react';
import { Users, Search, Mail, Building, ShieldCheck, DollarSign, Calendar, Clock, ChevronRight, UserCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface UserExplorerProps {
  profiles: UserProfile[];
}

export const UserExplorer: React.FC<UserExplorerProps> = ({ profiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(profiles[0] || null);

  const filtered = profiles.filter(
    (u) =>
      u.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>User Explorer & Customer 360</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identified profiles tracked via <code className="text-indigo-600 dark:text-indigo-400 font-mono">Pulse.identify("userId")</code>
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profiles List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Identified Customers ({filtered.length})
          </div>
          <div className="space-y-2">
            {filtered.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedUser?.id === user.id
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5">
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                    </div>
                  </div>
                  <div className="flex-1 truncate">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name || user.userId}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email || 'No email associated'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Customer 360 Detail View */}
        {selectedUser ? (
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-base font-extrabold shadow-md shadow-indigo-500/20">
                  {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{selectedUser.name || selectedUser.userId}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800">
                      IDENTIFIED
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                    <span>ID: {selectedUser.userId}</span>
                  </div>
                </div>
              </div>

              {selectedUser.totalSpent && (
                <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-right">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                    Customer Lifetime Value
                  </div>
                  <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    ${selectedUser.totalSpent.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* User Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1">
                <div className="text-slate-400 font-medium flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Email Address</span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.email || 'N/A'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-1">
                <div className="text-slate-400 font-medium flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Total Recorded Sessions</span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.totalSessions} Sessions
                </div>
              </div>
            </div>

            {/* Custom User Traits */}
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                Custom User Traits (<code className="font-mono text-indigo-600 dark:text-indigo-400">Pulse.setUser()</code>)
              </div>
              <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                {JSON.stringify(selectedUser.traits, null, 2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            Select a customer profile to view 360 attributes
          </div>
        )}
      </div>
    </div>
  );
};
