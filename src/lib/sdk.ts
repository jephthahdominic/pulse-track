/**
 * @pulsetrack/sdk - Lightweight Enterprise Analytics & Monitoring SDK
 * Automatically captures page views, clicks, rage clicks, performance metrics (CWV),
 * errors, and custom user events with batched queuing & retry logic.
 */

export interface PulseTrackConfig {
  apiKey: string;
  endpoint?: string;
  batchIntervalMs?: number;
  maxBatchSize?: number;
  debug?: boolean;
  autoTrackPageViews?: boolean;
  autoTrackClicks?: boolean;
  autoTrackErrors?: boolean;
  autoTrackPerformance?: boolean;
}

interface QueuedPayload {
  type: 'pageview' | 'event' | 'click' | 'performance' | 'error' | 'identify' | 'heartbeat';
  data: any;
  timestamp: number;
}

class PulseTrackSDK {
  private apiKey: string = '';
  private endpoint: string = '/api/v1/events';
  private batchIntervalMs: number = 5000;
  private maxBatchSize: number = 25;
  private debug: boolean = false;

  private sessionId: string = '';
  private userId: string | null = null;
  private userTraits: Record<string, any> = {};
  private globalMetadata: Record<string, any> = {};
  private queue: QueuedPayload[] = [];
  private timer: any = null;
  private isInitialized: boolean = false;

  private lastClickTime: number = 0;
  private lastClickTarget: Element | null = null;
  private rageClickCount: number = 0;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  public init(config: PulseTrackConfig) {
    if (this.isInitialized) return;
    this.apiKey = config.apiKey;
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.batchIntervalMs) this.batchIntervalMs = config.batchIntervalMs;
    if (config.maxBatchSize) this.maxBatchSize = config.maxBatchSize;
    if (config.debug) this.debug = config.debug;

    this.isInitialized = true;
    this.loadPersistedQueue();

    // Auto Listeners
    if (config.autoTrackPageViews !== false) {
      this.trackPageView();
      this.setupRouteChangeListener();
    }
    if (config.autoTrackClicks !== false) {
      this.setupClickListeners();
    }
    if (config.autoTrackErrors !== false) {
      this.setupErrorListeners();
    }
    if (config.autoTrackPerformance !== false) {
      this.setupPerformanceListeners();
    }

    this.setupHeartbeat();
    this.startBatchTimer();

    if (this.debug) {
      console.log('[PulseTrack SDK] Initialized with API Key:', this.apiKey);
    }
  }

  private getOrCreateSessionId(): string {
    try {
      let id = sessionStorage.getItem('pulsetrack_session_id');
      if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        sessionStorage.setItem('pulsetrack_session_id', id);
      }
      return id;
    } catch {
      return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    }
  }

  private getDeviceDetails() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let browser = 'Unknown Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    const isMobile = /Mobi|Android|iPhone/i.test(ua);

    return {
      browser,
      os,
      deviceType: isMobile ? 'mobile' : 'desktop',
      screenWidth: typeof window !== 'undefined' ? window.screen.width : 1920,
      screenHeight: typeof window !== 'undefined' ? window.screen.height : 1080,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
      userAgent: ua,
      language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  }

  public trackPageView(url?: string, title?: string) {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '/');
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : 'PulseTrack');
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';

    const payload: QueuedPayload = {
      type: 'pageview',
      timestamp: Date.now(),
      data: {
        sessionId: this.sessionId,
        userId: this.userId,
        url: currentUrl,
        path,
        title: pageTitle,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        device: this.getDeviceDetails(),
      },
    };

    this.enqueue(payload);
  }

  public track(eventName: string, properties: Record<string, any> = {}) {
    const payload: QueuedPayload = {
      type: 'event',
      timestamp: Date.now(),
      data: {
        sessionId: this.sessionId,
        userId: this.userId,
        eventName,
        properties: { ...this.globalMetadata, ...properties },
        url: typeof window !== 'undefined' ? window.location.href : '/',
        device: this.getDeviceDetails(),
      },
    };

    this.enqueue(payload);
  }

  public identify(userId: string, traits: Record<string, any> = {}) {
    this.userId = userId;
    this.userTraits = { ...this.userTraits, ...traits };

    const payload: QueuedPayload = {
      type: 'identify',
      timestamp: Date.now(),
      data: {
        sessionId: this.sessionId,
        userId,
        traits: this.userTraits,
      },
    };

    this.enqueue(payload);
  }

  public setUser(props: Record<string, any>) {
    if (this.userId) {
      this.identify(this.userId, props);
    } else {
      this.userTraits = { ...this.userTraits, ...props };
    }
  }

  public setMetadata(metadata: Record<string, any>) {
    this.globalMetadata = { ...this.globalMetadata, ...metadata };
  }

  public trackError(errorObj: { type: string; message: string; stack?: string; statusCode?: number }) {
    const payload: QueuedPayload = {
      type: 'error',
      timestamp: Date.now(),
      data: {
        sessionId: this.sessionId,
        userId: this.userId,
        type: errorObj.type,
        message: errorObj.message,
        stack: errorObj.stack || '',
        statusCode: errorObj.statusCode || 500,
        url: typeof window !== 'undefined' ? window.location.href : '/',
        browser: this.getDeviceDetails().browser,
        os: this.getDeviceDetails().os,
      },
    };

    this.enqueue(payload);
  }

  public trackPerformanceMetric(name: 'CLS' | 'LCP' | 'FID' | 'TTFB' | 'INP' | 'FCP', value: number) {
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
    if (name === 'LCP') rating = value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    if (name === 'CLS') rating = value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    if (name === 'FID') rating = value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
    if (name === 'INP') rating = value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';

    const payload: QueuedPayload = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        sessionId: this.sessionId,
        name,
        value,
        rating,
        url: typeof window !== 'undefined' ? window.location.href : '/',
      },
    };

    this.enqueue(payload);
  }

  private setupClickListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const now = Date.now();
      const isRageClick = this.lastClickTarget === target && now - this.lastClickTime < 500;
      if (isRageClick) {
        this.rageClickCount++;
      } else {
        this.rageClickCount = 1;
      }
      this.lastClickTime = now;
      this.lastClickTarget = target;

      const isNonInteractive = !['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) && !target.onclick;
      const isDeadClick = isNonInteractive && !target.closest('a, button');

      const payload: QueuedPayload = {
        type: 'click',
        timestamp: now,
        data: {
          sessionId: this.sessionId,
          userId: this.userId,
          targetTag: target.tagName,
          targetId: target.id || undefined,
          targetClasses: target.className || undefined,
          targetText: (target.innerText || '').slice(0, 50),
          x: Math.round(e.clientX),
          y: Math.round(e.clientY + window.scrollY),
          isRageClick: this.rageClickCount >= 3,
          isDeadClick,
          url: window.location.href,
        },
      };

      this.enqueue(payload);
    });
  }

  private setupErrorListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'js_exception',
        message: event.message || 'Unhandled Script Error',
        stack: event.error?.stack || '',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
      });
    });
  }

  private setupPerformanceListeners() {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    setTimeout(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        if (ttfb > 0) this.trackPerformanceMetric('TTFB', Math.round(ttfb));

        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcp) this.trackPerformanceMetric('FCP', Math.round(fcp.startTime));
      }
    }, 2000);
  }

  private setupRouteChangeListener() {
    if (typeof window === 'undefined') return;

    let oldPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== oldPath) {
        oldPath = window.location.pathname;
        this.trackPageView(window.location.href, document.title);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private setupHeartbeat() {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const payload: QueuedPayload = {
        type: 'heartbeat',
        timestamp: Date.now(),
        data: {
          sessionId: this.sessionId,
          userId: this.userId,
          url: window.location.href,
          isVisible: document.visibilityState === 'visible',
        },
      };
      this.enqueue(payload);
    }, 30000);
  }

  private enqueue(payload: QueuedPayload) {
    this.queue.push(payload);
    this.saveQueueToStorage();

    if (this.debug) {
      console.log('[PulseTrack SDK] Queued event:', payload.type, payload.data);
    }

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.queue.length === 0 || !this.apiKey) return;

    const itemsToSend = [...this.queue];
    this.queue = [];
    this.saveQueueToStorage();

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PulseTrack-Key': this.apiKey,
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          sessionId: this.sessionId,
          events: itemsToSend,
        }),
      });

      if (!res.ok) {
        if (this.debug) console.warn('[PulseTrack SDK] Ingestion status:', res.status);
        // Put back in queue if temporary failure
        this.queue = [...itemsToSend, ...this.queue];
        this.saveQueueToStorage();
      } else {
        if (this.debug) console.log(`[PulseTrack SDK] Successfully sent ${itemsToSend.length} events.`);
      }
    } catch (err) {
      if (this.debug) console.error('[PulseTrack SDK] Flush failed:', err);
      this.queue = [...itemsToSend, ...this.queue];
      this.saveQueueToStorage();
    }
  }

  private startBatchTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.flush();
    }, this.batchIntervalMs);
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem('pulsetrack_queue', JSON.stringify(this.queue.slice(-100)));
    } catch {}
  }

  private loadPersistedQueue() {
    try {
      const stored = localStorage.getItem('pulsetrack_queue');
      if (stored) {
        const items = JSON.parse(stored);
        if (Array.isArray(items)) {
          this.queue = [...items, ...this.queue];
        }
      }
    } catch {}
  }
}

// Global instance export
export const Pulse = new PulseTrackSDK();
export default Pulse;
