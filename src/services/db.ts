import {
  Workspace,
  Project,
  ApiKey,
  PageViewEvent,
  CustomAnalyticsEvent,
  ClickAnalyticsEvent,
  WebVitalMetric,
  ErrorLog,
  UserSession,
  UserProfile,
  SupportTicket,
  Funnel,
  HeatmapPoint,
  OverviewStats,
  AdminPlatformStats,
  Timeframe,
} from '../types';

class AnalyticsDatabase {
  public workspaces: Workspace[] = [];
  public projects: Project[] = [];
  public apiKeys: ApiKey[] = [];
  public pageViews: PageViewEvent[] = [];
  public customEvents: CustomAnalyticsEvent[] = [];
  public clickEvents: ClickAnalyticsEvent[] = [];
  public webVitals: WebVitalMetric[] = [];
  public errorLogs: ErrorLog[] = [];
  public sessions: UserSession[] = [];
  public userProfiles: UserProfile[] = [];
  public supportTickets: SupportTicket[] = [];
  public funnels: Funnel[] = [];

  constructor() {
    this.seedDatabase();
  }

  private seedDatabase() {
    // 1. Workspaces
    const defaultWorkspace: Workspace = {
      id: 'ws_enterprise_01',
      name: 'Acme Global Workspace',
      slug: 'acme-global',
      plan: 'Pro',
      eventQuota: 5000000,
      eventsUsed: 1428500,
      members: [
        {
          id: 'usr_owner_01',
          name: 'Alex Rivera',
          email: 'alex.rivera@acme.com',
          role: 'owner',
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        },
        {
          id: 'usr_dev_02',
          name: 'Sarah Chen',
          email: 'sarah.c@acme.com',
          role: 'developer',
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    };
    this.workspaces.push(defaultWorkspace);

    // 2. Projects
    const p1: Project = {
      id: 'proj_ecommerce_01',
      workspaceId: defaultWorkspace.id,
      name: 'Acme E-Commerce Store',
      domain: 'ecommerce.acme.com',
      publicKey: 'pk_live_98a72f1b4c6e801d',
      secretKey: 'sk_live_0918237465ab12cd',
      activeVisitors: 42,
      totalEvents24h: 38420,
      status: 'active',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    };

    const p2: Project = {
      id: 'proj_blog_02',
      workspaceId: defaultWorkspace.id,
      name: 'Tech Engineering Blog',
      domain: 'blog.acme.com',
      publicKey: 'pk_live_1234567890abcdef',
      secretKey: 'sk_live_abcdef1234567890',
      activeVisitors: 12,
      totalEvents24h: 12400,
      status: 'active',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    };

    this.projects.push(p1, p2);

    // 3. API Keys
    this.apiKeys.push(
      {
        id: 'key_01',
        projectId: p1.id,
        name: 'Production Public Client SDK Key',
        key: p1.publicKey,
        type: 'public',
        lastUsedAt: new Date().toISOString(),
        createdAt: p1.createdAt,
      },
      {
        id: 'key_02',
        projectId: p1.id,
        name: 'Production Server Secret Key',
        key: p1.secretKey,
        type: 'secret',
        lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: p1.createdAt,
      }
    );

    // 4. Funnels
    this.funnels.push({
      id: 'funnel_checkout_01',
      projectId: p1.id,
      name: 'E-Commerce Purchase Funnel',
      steps: [
        { name: 'Landing Page View', urlPattern: '/' },
        { name: 'Product View', urlPattern: '/products' },
        { name: 'Add to Cart', eventName: 'AddToCart' },
        { name: 'Checkout Initiated', urlPattern: '/checkout' },
        { name: 'Payment Complete', eventName: 'Purchase' },
      ],
    });

    // 5. Seed Historical Events & Traffic (Last 7 Days)
    const now = Date.now();
    const countries = [
      { country: 'United States', code: 'US', cities: ['San Francisco', 'New York', 'Austin'] },
      { country: 'United Kingdom', code: 'GB', cities: ['London', 'Manchester'] },
      { country: 'Germany', code: 'DE', cities: ['Berlin', 'Munich'] },
      { country: 'Canada', code: 'CA', cities: ['Toronto', 'Vancouver'] },
      { country: 'Nigeria', code: 'NG', cities: ['Lagos', 'Abuja'] },
      { country: 'Japan', code: 'JP', cities: ['Tokyo', 'Osaka'] },
    ];

    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
    const osList = ['macOS', 'Windows', 'iOS', 'Android'];
    const paths = ['/', '/products', '/products/quantum-headphones', '/pricing', '/checkout', '/docs', '/blog/ai-trends'];

    // Seed 150 User Sessions
    for (let i = 0; i < 150; i++) {
      const timeOffset = Math.random() * 7 * 86400000;
      const sessionTime = now - timeOffset;
      const sId = `sess_hist_${i + 1000}`;
      const geo = countries[i % countries.length];
      const city = geo.cities[i % geo.cities.length];
      const browser = browsers[i % browsers.length];
      const os = osList[i % osList.length];
      const isMobile = os === 'iOS' || os === 'Android';

      const device = {
        browser,
        os,
        deviceType: isMobile ? ('mobile' as const) : ('desktop' as const),
        screenWidth: isMobile ? 390 : 1920,
        screenHeight: isMobile ? 844 : 1080,
        viewportWidth: isMobile ? 390 : 1440,
        viewportHeight: isMobile ? 700 : 900,
        userAgent: `Mozilla/5.0 (${os}; ${browser}/120.0)`,
        language: 'en-US',
        timezone: 'America/Los_Angeles',
      };

      const geoInfo = {
        ip: `192.168.1.${(i % 250) + 1}`,
        country: geo.country,
        countryCode: geo.code,
        city,
        region: 'State/Region',
      };

      const userId = i % 3 === 0 ? `usr_id_${(i % 15) + 1}` : undefined;

      const duration = Math.floor(Math.random() * 300) + 15;
      const viewsCount = Math.floor(Math.random() * 5) + 1;

      // Session
      this.sessions.push({
        id: `sess_obj_${i}`,
        sessionId: sId,
        userId,
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        startedAt: sessionTime,
        lastActiveAt: sessionTime + duration * 1000,
        durationSeconds: duration,
        pageViewsCount: viewsCount,
        eventsCount: viewsCount + 2,
        entryPage: paths[0],
        exitPage: paths[viewsCount % paths.length],
        isBounce: viewsCount === 1,
        device,
        geo: geoInfo,
      });

      // PageViews for session
      for (let v = 0; v < viewsCount; v++) {
        const pvPath = paths[v % paths.length];
        this.pageViews.push({
          id: `pv_${i}_${v}`,
          sessionId: sId,
          userId,
          projectId: p1.id,
          workspaceId: defaultWorkspace.id,
          url: `https://ecommerce.acme.com${pvPath}`,
          path: pvPath,
          title: `Acme Store - ${pvPath === '/' ? 'Home' : pvPath.slice(1)}`,
          referrer: v === 0 ? 'https://google.com' : `https://ecommerce.acme.com${paths[v - 1]}`,
          timestamp: sessionTime + v * 30000,
          durationMs: Math.floor(Math.random() * 20000) + 5000,
          scrollDepthPercentage: Math.floor(Math.random() * 60) + 40,
          device,
          geo: geoInfo,
        });

        // Heatmap clicks
        this.clickEvents.push({
          id: `click_${i}_${v}`,
          sessionId: sId,
          userId,
          projectId: p1.id,
          workspaceId: defaultWorkspace.id,
          targetTag: v % 2 === 0 ? 'BUTTON' : 'A',
          targetId: 'btn-buy-now',
          targetText: 'Add to Cart',
          x: Math.floor(Math.random() * 800) + 100,
          y: Math.floor(Math.random() * 600) + 50,
          isRageClick: i % 10 === 0,
          isDeadClick: i % 15 === 0,
          url: `https://ecommerce.acme.com${pvPath}`,
          timestamp: sessionTime + v * 30000 + 2000,
        });
      }

      // Custom Events
      if (i % 2 === 0) {
        this.customEvents.push({
          id: `evt_cust_${i}`,
          sessionId: sId,
          userId,
          projectId: p1.id,
          workspaceId: defaultWorkspace.id,
          eventName: 'AddToCart',
          properties: {
            productId: 'prod_99',
            productName: 'Quantum Headphones Pro',
            price: 249.99,
            currency: 'USD',
          },
          timestamp: sessionTime + 15000,
          url: 'https://ecommerce.acme.com/products/quantum-headphones',
          device,
          geo: geoInfo,
        });
      }

      if (i % 4 === 0) {
        this.customEvents.push({
          id: `evt_purch_${i}`,
          sessionId: sId,
          userId,
          projectId: p1.id,
          workspaceId: defaultWorkspace.id,
          eventName: 'Purchase',
          properties: {
            orderId: `ord_live_${1000 + i}`,
            amount: 249.99,
            currency: 'USD',
            itemCount: 1,
          },
          timestamp: sessionTime + 45000,
          url: 'https://ecommerce.acme.com/checkout',
          device,
          geo: geoInfo,
        });
      }

      // Web Vitals
      if (i % 3 === 0) {
        this.webVitals.push(
          {
            id: `wv_lcp_${i}`,
            sessionId: sId,
            projectId: p1.id,
            workspaceId: defaultWorkspace.id,
            name: 'LCP',
            value: Math.floor(Math.random() * 2000) + 1100,
            rating: 'good',
            url: 'https://ecommerce.acme.com/',
            timestamp: sessionTime,
          },
          {
            id: `wv_cls_${i}`,
            sessionId: sId,
            projectId: p1.id,
            workspaceId: defaultWorkspace.id,
            name: 'CLS',
            value: parseFloat((Math.random() * 0.12).toFixed(3)),
            rating: 'good',
            url: 'https://ecommerce.acme.com/',
            timestamp: sessionTime,
          },
          {
            id: `wv_inp_${i}`,
            sessionId: sId,
            projectId: p1.id,
            workspaceId: defaultWorkspace.id,
            name: 'INP',
            value: Math.floor(Math.random() * 150) + 40,
            rating: 'good',
            url: 'https://ecommerce.acme.com/',
            timestamp: sessionTime,
          }
        );
      }
    }

    // 6. User Profiles
    this.userProfiles.push(
      {
        id: 'prof_01',
        userId: 'usr_id_1',
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        name: 'John Doe',
        email: 'john.doe@techcorp.io',
        traits: { plan: 'Enterprise', company: 'TechCorp', role: 'CTO' },
        firstSeenAt: now - 30 * 86400000,
        lastSeenAt: now - 3600000,
        totalSessions: 18,
        totalSpent: 1249.5,
      },
      {
        id: 'prof_02',
        userId: 'usr_id_2',
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        name: 'Sarah Connor',
        email: 'sarah.c@skyline.org',
        traits: { plan: 'Pro', company: 'Skyline Inc' },
        firstSeenAt: now - 14 * 86400000,
        lastSeenAt: now - 1800000,
        totalSessions: 9,
        totalSpent: 499.0,
      }
    );

    // 7. Error Logs
    this.errorLogs.push(
      {
        id: 'err_01',
        sessionId: 'sess_hist_1002',
        userId: 'usr_id_1',
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        type: 'js_exception',
        message: "TypeError: Cannot read properties of undefined (reading 'checkoutToken')",
        stack: "TypeError: Cannot read properties of undefined (reading 'checkoutToken')\n    at CheckoutForm.tsx:142:18\n    at HTMLButtonElement.dispatch (react-dom.production.min.js:21:401)",
        url: 'https://ecommerce.acme.com/checkout',
        statusCode: 500,
        browser: 'Chrome',
        os: 'macOS',
        timestamp: now - 3600000 * 4,
        status: 'unresolved',
        occurrences: 48,
      },
      {
        id: 'err_02',
        sessionId: 'sess_hist_1008',
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        type: 'api_failure',
        message: '500 Internal Server Error: POST /api/v1/payments/charge',
        stack: 'FetchError: HTTP 500 Internal Server Error from Gateway\n    at paymentClient.ts:88:12',
        url: 'https://ecommerce.acme.com/checkout',
        statusCode: 500,
        browser: 'Safari',
        os: 'iOS',
        timestamp: now - 3600000 * 12,
        status: 'investigating',
        occurrences: 14,
      },
      {
        id: 'err_03',
        sessionId: 'sess_hist_1015',
        projectId: p1.id,
        workspaceId: defaultWorkspace.id,
        type: '404_not_found',
        message: '404 Not Found: GET /assets/images/missing-banner.webp',
        url: 'https://ecommerce.acme.com/products',
        statusCode: 404,
        browser: 'Firefox',
        os: 'Windows',
        timestamp: now - 3600000 * 24,
        status: 'resolved',
        occurrences: 120,
      }
    );

    // 8. Support Tickets
    this.supportTickets.push(
      {
        id: 'tkt_1001',
        workspaceId: defaultWorkspace.id,
        projectId: p1.id,
        userId: 'usr_id_1',
        userName: 'John Doe',
        userEmail: 'john.doe@techcorp.io',
        subject: 'SDK Batching delay when tab is backgrounded',
        category: 'sdk_help',
        priority: 'high',
        status: 'open',
        messages: [
          {
            id: 'msg_01',
            sender: 'user',
            senderName: 'John Doe',
            content: 'Hello PulseTrack team! We noticed that when our browser tab goes to background, batch events wait until focus returns. Is there a Page Visibility API handler?',
            timestamp: now - 3600000 * 6,
          },
          {
            id: 'msg_02',
            sender: 'agent',
            senderName: 'Alex Rivera (Support Lead)',
            content: 'Hi John! Yes, PulseTrack SDK uses navigator.sendBeacon() on visibilitychange hidden state to automatically flush all queued events before tab sleep.',
            timestamp: now - 3600000 * 3,
          },
        ],
        createdAt: now - 3600000 * 6,
        updatedAt: now - 3600000 * 3,
      },
      {
        id: 'tkt_1002',
        workspaceId: defaultWorkspace.id,
        projectId: p1.id,
        userName: 'Sarah Connor',
        userEmail: 'sarah.c@skyline.org',
        subject: 'Request for custom IP masking compliance feature',
        category: 'feature_request',
        priority: 'medium',
        status: 'in_progress',
        messages: [
          {
            id: 'msg_03',
            sender: 'user',
            senderName: 'Sarah Connor',
            content: 'Can we enable GDPR anonymizeIp mode in the SDK config for EU traffic?',
            timestamp: now - 3600000 * 48,
          },
        ],
        createdAt: now - 3600000 * 48,
        updatedAt: now - 3600000 * 48,
      }
    );
  }

  // --- API Methods ---
  public getOverviewStats(projectId: string, timeframe: Timeframe = '7d'): OverviewStats {
    const pvs = this.pageViews.filter((p) => p.projectId === projectId);
    const sess = this.sessions.filter((s) => s.projectId === projectId);
    const errs = this.errorLogs.filter((e) => e.projectId === projectId);

    const totalVisitors = pvs.length;
    const uniqueVisitors = new Set(pvs.map((p) => p.sessionId)).size;
    const totalSessions = sess.length;

    const bounces = sess.filter((s) => s.isBounce).length;
    const bounceRate = totalSessions > 0 ? Math.round((bounces / totalSessions) * 100) : 0;

    const liveUsersCount = Math.floor(Math.random() * 15) + 25; // Dynamic live active count
    const avgSessionDuration = totalSessions > 0 ? Math.round(sess.reduce((acc, s) => acc + s.durationSeconds, 0) / totalSessions) : 0;

    // Top Pages
    const pageMap: Record<string, { views: number; unique: Set<string> }> = {};
    pvs.forEach((p) => {
      if (!pageMap[p.path]) pageMap[p.path] = { views: 0, unique: new Set() };
      pageMap[p.path].views++;
      pageMap[p.path].unique.add(p.sessionId);
    });

    const topPages = Object.entries(pageMap)
      .map(([path, data]) => ({
        path,
        views: data.views,
        uniqueViews: data.unique.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Top Devices
    const devMap: Record<string, number> = {};
    sess.forEach((s) => {
      const dev = s.device.deviceType;
      devMap[dev] = (devMap[dev] || 0) + 1;
    });
    const topDevices = Object.entries(devMap).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / (sess.length || 1)) * 100),
    }));

    // Top Countries
    const geoMap: Record<string, { code: string; count: number }> = {};
    sess.forEach((s) => {
      const c = s.geo.country;
      if (!geoMap[c]) geoMap[c] = { code: s.geo.countryCode, count: 0 };
      geoMap[c].count++;
    });
    const topCountries = Object.entries(geoMap)
      .map(([country, data]) => ({
        country,
        code: data.code,
        count: data.count,
        percentage: Math.round((data.count / (sess.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top Browsers
    const browserMap: Record<string, number> = {};
    sess.forEach((s) => {
      const b = s.device.browser;
      browserMap[b] = (browserMap[b] || 0) + 1;
    });
    const topBrowsers = Object.entries(browserMap).map(([name, count]) => ({ name, count }));

    // Timeseries (last 24 hours / 7 days hourly buckets)
    const hourlySeries = [];
    const now = Date.now();
    for (let h = 23; h >= 0; h--) {
      const timeLabel = `${23 - h}:00`;
      const pvCount = Math.floor(Math.random() * 80) + 40;
      const visCount = Math.floor(pvCount * 0.7);
      const sessCount = Math.floor(pvCount * 0.5);
      hourlySeries.push({
        time: timeLabel,
        pageViews: pvCount,
        visitors: visCount,
        sessions: sessCount,
      });
    }

    return {
      totalVisitors,
      uniqueVisitors,
      totalSessions,
      bounceRate,
      liveUsersCount,
      avgSessionDuration,
      totalErrors: errs.reduce((acc, e) => acc + e.occurrences, 0),
      webVitalsScore: 94,
      topPages,
      topDevices,
      topCountries,
      topBrowsers,
      hourlySeries,
    };
  }

  public getLiveVisitors(projectId: string) {
    const currentActive = this.sessions.slice(-12).map((s, idx) => ({
      sessionId: s.sessionId,
      userId: s.userId || `Visitor #${800 + idx}`,
      country: s.geo.country,
      city: s.geo.city,
      browser: s.device.browser,
      device: s.device.deviceType,
      activePage: s.exitPage,
      durationSeconds: Math.floor(Math.random() * 400) + 20,
      startedAt: Date.now() - (idx * 60000 + 12000),
      referrer: 'Direct / Search',
    }));
    return currentActive;
  }

  public ingestBatchedEvents(apiKey: string, sessionId: string, events: Array<{ type: string; data: any; timestamp: number }>) {
    const project = this.projects.find((p) => p.publicKey === apiKey || p.secretKey === apiKey) || this.projects[0];

    events.forEach((evt) => {
      const data = evt.data || {};
      const timestamp = evt.timestamp || Date.now();

      if (evt.type === 'pageview') {
        this.pageViews.unshift({
          id: `pv_live_${Math.random().toString(36).substring(2, 9)}`,
          sessionId,
          userId: data.userId,
          projectId: project.id,
          workspaceId: project.workspaceId,
          url: data.url || '/',
          path: data.path || '/',
          title: data.title || 'Page',
          referrer: data.referrer || '',
          timestamp,
          device: data.device || {
            browser: 'Chrome',
            os: 'macOS',
            deviceType: 'desktop',
            screenWidth: 1920,
            screenHeight: 1080,
            viewportWidth: 1440,
            viewportHeight: 900,
            userAgent: 'Live SDK',
            language: 'en-US',
            timezone: 'UTC',
          },
          geo: { ip: '127.0.0.1', country: 'United States', countryCode: 'US', city: 'San Francisco', region: 'CA' },
        });
      } else if (evt.type === 'event' || evt.type === 'custom') {
        this.customEvents.unshift({
          id: `evt_live_${Math.random().toString(36).substring(2, 9)}`,
          sessionId,
          userId: data.userId,
          projectId: project.id,
          workspaceId: project.workspaceId,
          eventName: data.eventName || 'CustomAction',
          properties: data.properties || {},
          timestamp,
          url: data.url || '/',
          device: data.device || {
            browser: 'Chrome',
            os: 'macOS',
            deviceType: 'desktop',
            screenWidth: 1920,
            screenHeight: 1080,
            viewportWidth: 1440,
            viewportHeight: 900,
            userAgent: 'Live SDK',
            language: 'en-US',
            timezone: 'UTC',
          },
          geo: { ip: '127.0.0.1', country: 'United States', countryCode: 'US', city: 'San Francisco', region: 'CA' },
        });
      } else if (evt.type === 'click') {
        this.clickEvents.unshift({
          id: `click_live_${Math.random().toString(36).substring(2, 9)}`,
          sessionId,
          userId: data.userId,
          projectId: project.id,
          workspaceId: project.workspaceId,
          targetTag: data.targetTag || 'BUTTON',
          targetId: data.targetId,
          targetText: data.targetText,
          x: data.x || 100,
          y: data.y || 100,
          isRageClick: !!data.isRageClick,
          isDeadClick: !!data.isDeadClick,
          url: data.url || '/',
          timestamp,
        });
      } else if (evt.type === 'error') {
        const existing = this.errorLogs.find((e) => e.message === data.message);
        if (existing) {
          existing.occurrences++;
          existing.timestamp = timestamp;
        } else {
          this.errorLogs.unshift({
            id: `err_live_${Math.random().toString(36).substring(2, 9)}`,
            sessionId,
            userId: data.userId,
            projectId: project.id,
            workspaceId: project.workspaceId,
            type: data.type || 'js_exception',
            message: data.message || 'Script Error',
            stack: data.stack || '',
            url: data.url || '/',
            browser: data.browser || 'Chrome',
            os: data.os || 'macOS',
            timestamp,
            status: 'unresolved',
            occurrences: 1,
          });
        }
      } else if (evt.type === 'performance') {
        this.webVitals.unshift({
          id: `wv_live_${Math.random().toString(36).substring(2, 9)}`,
          sessionId,
          projectId: project.id,
          workspaceId: project.workspaceId,
          name: data.name || 'LCP',
          value: data.value || 1200,
          rating: data.rating || 'good',
          url: data.url || '/',
          timestamp,
        });
      }
    });

    // Update project stats counter
    project.totalEvents24h += events.length;

    return { success: true, ingested: events.length };
  }

  public getAdminStats(): AdminPlatformStats {
    return {
      totalCustomers: 420,
      monthlyRecurringRevenue: 34850,
      totalEventsProcessed24h: 8420500,
      queueLatencyMs: 4,
      redisMemoryUsedMb: 142.8,
      serverCpuUsagePercentage: 18.4,
      serverMemoryUsagePercentage: 34.2,
      activeWorkers: 12,
    };
  }
}

export const db = new AnalyticsDatabase();
