import { OverviewStats, Project, Workspace, UserSession, CustomAnalyticsEvent, ErrorLog, WebVitalMetric } from '../types';
import { db } from './db';

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function triggerFileDownload(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Overview Traffic & Metrics to CSV
 */
export function exportOverviewCSV(project: Project, stats: OverviewStats, timeframe: string, date?: string) {
  const lines: string[] = [];

  // Report Header
  lines.push(`"# PulseTrack Analytics Overview Report"`);
  lines.push(`"# Project: ${project.name} (${project.domain})"`);
  lines.push(`"# Timeframe: ${timeframe.toUpperCase()}${date ? ` (Custom day: ${date})` : ''}"`);
  lines.push(`"# Generated At: ${new Date().toISOString()}"`);
  lines.push('');

  // Key Metrics Summary Section
  lines.push('"Section","KPI Summary Metrics"');
  lines.push('"Metric","Value"');
  lines.push(`"Total Pageviews",${stats.totalVisitors}`);
  lines.push(`"Unique Visitors",${stats.uniqueVisitors}`);
  lines.push(`"Bounce Rate (%)",${stats.bounceRate}`);
  lines.push(`"Avg Session Duration (sec)",${stats.avgSessionDuration}`);
  lines.push(`"Live Active Users",${stats.liveUsersCount}`);
  lines.push(`"Core Web Vitals Score",${stats.webVitalsScore}`);
  lines.push(`"Total Logged Errors",${stats.totalErrors}`);
  lines.push('');

  // Hourly Activity Trend
  lines.push('"Section","Hourly Activity Trend"');
  lines.push('"Time","PageViews","UniqueVisitors","Sessions"');
  stats.hourlySeries.forEach((h) => {
    lines.push(`${escapeCSV(h.time)},${h.pageViews},${h.visitors},${h.sessions}`);
  });
  lines.push('');

  // Top Pages
  lines.push('"Section","Top Pages Performance"');
  lines.push('"Path","Total Views","Unique Views"');
  stats.topPages.forEach((p) => {
    lines.push(`${escapeCSV(p.path)},${p.views},${p.uniqueViews}`);
  });
  lines.push('');

  // Top Countries
  lines.push('"Section","Geographic Distribution"');
  lines.push('"Country","Country Code","Visitor Count","Percentage"');
  stats.topCountries.forEach((c) => {
    lines.push(`${escapeCSV(c.country)},${escapeCSV(c.code)},${c.count},${c.percentage}%`);
  });

  const csvContent = lines.join('\n');
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_overview_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Export Sessions Data to CSV
 */
export function exportSessionsCSV(project: Project, sessions: UserSession[]) {
  const lines: string[] = [];
  lines.push(`"# PulseTrack User Sessions Report"`);
  lines.push(`"# Project: ${project.name}"`);
  lines.push(`"# Total Sessions: ${sessions.length}"`);
  lines.push(`"# Exported At: ${new Date().toISOString()}"`);
  lines.push('');

  lines.push('"Session ID","User ID","Email / Trait","Device","OS","Browser","Country","Duration (s)","Pageviews","Events Count","Landing Page","Is Bounce","Started At"');
  sessions.forEach((s) => {
    lines.push([
      escapeCSV(s.sessionId || s.id),
      escapeCSV(s.userId || 'Anonymous'),
      escapeCSV(s.userTraits?.email || s.userTraits?.name || 'N/A'),
      escapeCSV(s.device.deviceType),
      escapeCSV(s.device.os),
      escapeCSV(s.device.browser),
      escapeCSV(s.geo.country),
      s.durationSeconds,
      s.pageViewsCount,
      s.eventsCount,
      escapeCSV(s.entryPage),
      s.isBounce ? 'Yes' : 'No',
      escapeCSV(new Date(s.startedAt).toISOString())
    ].join(','));
  });

  const csvContent = lines.join('\n');
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Export Custom Events Data to CSV
 */
export function exportEventsCSV(project: Project, events: CustomAnalyticsEvent[]) {
  const lines: string[] = [];
  lines.push(`"# PulseTrack Custom Events Report"`);
  lines.push(`"# Project: ${project.name}"`);
  lines.push(`"# Total Events Recorded: ${events.length}"`);
  lines.push(`"# Exported At: ${new Date().toISOString()}"`);
  lines.push('');

  lines.push('"Event ID","Session ID","User ID","Event Name","URL","Timestamp","Properties JSON"');
  events.forEach((e) => {
    lines.push([
      escapeCSV(e.id),
      escapeCSV(e.sessionId),
      escapeCSV(e.userId || 'Anonymous'),
      escapeCSV(e.eventName),
      escapeCSV(e.url),
      escapeCSV(new Date(e.timestamp).toISOString()),
      escapeCSV(JSON.stringify(e.properties || {}))
    ].join(','));
  });

  const csvContent = lines.join('\n');
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_custom_events_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Export Error Audit Logs to CSV
 */
export function exportErrorsCSV(project: Project, errors: ErrorLog[]) {
  const lines: string[] = [];
  lines.push(`"# PulseTrack Error Audit Report"`);
  lines.push(`"# Project: ${project.name}"`);
  lines.push(`"# Total Errors Recorded: ${errors.length}"`);
  lines.push(`"# Exported At: ${new Date().toISOString()}"`);
  lines.push('');

  lines.push('"Error ID","Error Type","Message","URL","Browser","OS","Occurrences","Status","Timestamp"');
  errors.forEach((err) => {
    lines.push([
      escapeCSV(err.id),
      escapeCSV(err.type),
      escapeCSV(err.message),
      escapeCSV(err.url),
      escapeCSV(err.browser),
      escapeCSV(err.os),
      err.occurrences,
      escapeCSV(err.status),
      escapeCSV(new Date(err.timestamp).toISOString())
    ].join(','));
  });

  const csvContent = lines.join('\n');
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_error_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerFileDownload(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Export Full Project Analytics Snapshot as JSON
 */
export function exportProjectJSON(project: Project, workspace: Workspace, timeframe: string, date?: string) {
  const overviewStats = db.getOverviewStats(project.id, timeframe as any, date);
  const projectSessions = db.sessions.filter((s) => s.projectId === project.id);
  const projectEvents = db.customEvents.filter((e) => e.projectId === project.id);
  const projectErrors = db.errorLogs.filter((err) => err.projectId === project.id);
  const projectVitals = db.webVitals.filter((v) => v.projectId === project.id);
  const projectFunnels = db.funnels.filter((f) => f.projectId === project.id);

  const exportData = {
    exportMetadata: {
      generatedAt: new Date().toISOString(),
      exporterApp: 'PulseTrack Enterprise Realtime Analytics',
      formatVersion: '1.0.0',
      timeframe: timeframe,
      date: date || null,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
    },
    project: {
      id: project.id,
      name: project.name,
      domain: project.domain,
      status: project.status,
      createdAt: project.createdAt,
    },
    analyticsSummary: overviewStats,
    sessions: projectSessions,
    customEvents: projectEvents,
    errorLogs: projectErrors,
    webVitals: projectVitals,
    funnels: projectFunnels,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_full_report_${timeframe}_${new Date().toISOString().slice(0, 10)}.json`;
  triggerFileDownload(filename, jsonString, 'application/json');
}
