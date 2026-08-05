import React, { useState } from 'react';
import { Zap, Search, Eye, Filter, Code2, Tag } from 'lucide-react';
import { CustomAnalyticsEvent } from '../types';

interface EventsExplorerProps {
  events: CustomAnalyticsEvent[];
}

export const EventsExplorer: React.FC<EventsExplorerProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CustomAnalyticsEvent | null>(events[0] || null);

  const filtered = events.filter(
    (e) =>
      e.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.userId && e.userId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-indigo-500" />
            <span>Custom Events & Payloads</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track business conversions using <code className="text-indigo-600 dark:text-indigo-400 font-mono">Pulse.track(eventName, properties)</code>
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search event name, properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Event Name</th>
                <th className="pb-3">User / Session</th>
                <th className="pb-3">Page URL</th>
                <th className="pb-3 text-right">Timestamp</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{evt.eventName}</span>
                  </td>

                  <td className="py-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {evt.userId || evt.sessionId}
                  </td>

                  <td className="py-3 font-mono text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                    {evt.url}
                  </td>

                  <td className="py-3 text-right text-slate-400 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>

                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedEvent(evt)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-indigo-600 hover:text-white transition-all text-[11px]"
                    >
                      Inspect JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Event Payload Inspector */}
        {selectedEvent ? (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                  <Code2 className="w-4 h-4 text-indigo-500" />
                  <span>{selectedEvent.eventName}</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ID: {selectedEvent.id}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Event Payload Properties
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800">
                {JSON.stringify(selectedEvent.properties, null, 2)}
              </pre>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Device Browser</span>
                <span className="font-semibold">{selectedEvent.device.browser} ({selectedEvent.device.os})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">User Location</span>
                <span className="font-semibold">{selectedEvent.geo.city}, {selectedEvent.geo.country}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            Select an event to inspect properties
          </div>
        )}
      </div>
    </div>
  );
};
