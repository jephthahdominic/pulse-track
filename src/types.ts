export type Timeframe = '1h' | '24h' | '7d' | '30d' | '90d';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'analyst' | 'developer';
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'Free' | 'Pro' | 'Business' | 'Enterprise';
  eventQuota: number;
  eventsUsed: number;
  members: User[];
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  domain: string;
  publicKey: string;
  secretKey: string;
  activeVisitors: number;
  totalEvents24h: number;
  status: 'active' | 'paused' | 'archived';
  aiInsightsEnabled: boolean;
  healthInsightsEnabled: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  key: string;
  type: 'public' | 'secret';
  lastUsedAt: string | null;
  createdAt: string;
}

export interface DeviceInfo {
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  language: string;
  timezone: string;
  connectionSpeed?: string;
}

export interface GeoInfo {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region: string;
  latitude?: number;
  longitude?: number;
}

export interface PageViewEvent {
  id: string;
  sessionId: string;
  userId?: string;
  projectId: string;
  workspaceId: string;
  url: string;
  path: string;
  title: string;
  referrer: string;
  timestamp: number;
  durationMs?: number;
  scrollDepthPercentage?: number;
  device: DeviceInfo;
  geo: GeoInfo;
}

export interface CustomAnalyticsEvent {
  id: string;
  sessionId: string;
  userId?: string;
  projectId: string;
  workspaceId: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: number;
  url: string;
  device: DeviceInfo;
  geo: GeoInfo;
}

export interface ClickAnalyticsEvent {
  id: string;
  sessionId: string;
  userId?: string;
  projectId: string;
  workspaceId: string;
  targetTag: string;
  targetId?: string;
  targetClasses?: string;
  targetText?: string;
  x: number;
  y: number;
  isRageClick?: boolean;
  isDeadClick?: boolean;
  url: string;
  timestamp: number;
}

export interface WebVitalMetric {
  id: string;
  sessionId: string;
  projectId: string;
  workspaceId: string;
  name: 'CLS' | 'LCP' | 'FID' | 'TTFB' | 'INP' | 'FCP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  timestamp: number;
}

export interface ErrorLog {
  id: string;
  sessionId: string;
  userId?: string;
  projectId: string;
  workspaceId: string;
  type: 'js_exception' | 'api_failure' | 'unhandled_rejection' | '404_not_found';
  message: string;
  stack?: string;
  url: string;
  statusCode?: number;
  browser: string;
  os: string;
  timestamp: number;
  status: 'unresolved' | 'investigating' | 'resolved';
  occurrences: number;
}

export interface UserSession {
  id: string;
  sessionId: string;
  userId?: string;
  projectId: string;
  workspaceId: string;
  startedAt: number;
  lastActiveAt: number;
  durationSeconds: number;
  pageViewsCount: number;
  eventsCount: number;
  entryPage: string;
  exitPage: string;
  isBounce: boolean;
  device: DeviceInfo;
  geo: GeoInfo;
  userTraits?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  userId: string;
  projectId: string;
  workspaceId: string;
  name?: string;
  email?: string;
  traits: Record<string, any>;
  firstSeenAt: number;
  lastSeenAt: number;
  totalSessions: number;
  totalSpent?: number;
}

export interface SupportTicket {
  id: string;
  workspaceId: string;
  projectId?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: 'general' | 'bug' | 'billing' | 'sdk_help' | 'feature_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: Array<{
    id: string;
    sender: 'user' | 'agent';
    senderName: string;
    content: string;
    attachments?: string[];
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface FunnelStep {
  name: string;
  urlPattern?: string;
  eventName?: string;
}

export interface Funnel {
  id: string;
  projectId: string;
  name: string;
  steps: FunnelStep[];
}

export interface FunnelResult {
  funnelId: string;
  name: string;
  steps: Array<{
    name: string;
    usersCount: number;
    dropoffPercentage: number;
    conversionPercentage: number;
  }>;
  overallConversion: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
  rageCount: number;
  url: string;
}

export interface OverviewStats {
  totalVisitors: number;
  uniqueVisitors: number;
  totalSessions: number;
  bounceRate: number;
  liveUsersCount: number;
  avgSessionDuration: number;
  totalErrors: number;
  webVitalsScore: number;
  topPages: Array<{ path: string; views: number; uniqueViews: number }>;
  topDevices: Array<{ name: string; percentage: number; count: number }>;
  topCountries: Array<{ country: string; code: string; count: number; percentage: number }>;
  topBrowsers: Array<{ name: string; count: number }>;
  hourlySeries: Array<{ time: string; pageViews: number; visitors: number; sessions: number }>;
}

export interface AdminPlatformStats {
  totalCustomers: number;
  monthlyRecurringRevenue: number;
  totalEventsProcessed24h: number;
  queueLatencyMs: number;
  redisMemoryUsedMb: number;
  serverCpuUsagePercentage: number;
  serverMemoryUsagePercentage: number;
  activeWorkers: number;
}
