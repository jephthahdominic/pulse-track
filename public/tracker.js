/*! PulseTrack Web Tracker v1.0.0 — https://pulsetrack.io */
(function (w, d) {
  'use strict';
  if (w.__pulsetrack_loaded) { return; }
  w.__pulsetrack_loaded = true;

  function findScript() {
    var scripts = d.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      if (s.src && /tracker(\.min)?\.js/.test(s.src)) { return s; }
    }
    return d.currentScript || scripts[scripts.length - 1];
  }

  var script = findScript();
  var apiKey = script ? script.getAttribute('data-key') : '';
  if (!apiKey) { return; }

  // Events always go to the PulseTrack origin (where this script was served from),
  // NOT to the customer's website domain.
  var origin = '';
  try {
    origin = new URL(script.src, w.location.href).origin;
  } catch (e) {
    origin = w.location.origin;
  }
  var endpoint = origin + '/api/v1/events';

  // ── Session ──────────────────────────────────────────────────────────────
  function getSessionId() {
    try {
      var id = w.sessionStorage.getItem('pt_session_id');
      if (!id) {
        id = 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
        w.sessionStorage.setItem('pt_session_id', id);
      }
      return id;
    } catch (e) {
      return 'sess_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
    }
  }
  var sessionId = getSessionId();

  // ── Device / browser info ────────────────────────────────────────────────
  function getDevice() {
    var ua = navigator.userAgent || '';
    var browser = 'Unknown';
    if (ua.indexOf('Edg') > -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';

    var os = 'Unknown';
    if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac OS') > -1) os = 'macOS';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';

    var isMobile = /Mobi|Android|iPhone/i.test(ua);
    return {
      browser: browser,
      os: os,
      deviceType: isMobile ? 'mobile' : 'desktop',
      screenWidth: w.screen ? w.screen.width : 1920,
      screenHeight: w.screen ? w.screen.height : 1080,
      viewportWidth: d.documentElement ? d.documentElement.clientWidth : 1280,
      viewportHeight: d.documentElement ? d.documentElement.clientHeight : 800,
      userAgent: ua,
      language: navigator.language || 'en-US',
      timezone: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })()
    };
  }

  // ── Batched queue ────────────────────────────────────────────────────────
  var queue = [];
  function enqueue(type, data) {
    queue.push({ type: type, data: data, timestamp: Date.now() });
    if (queue.length >= 25) { flush(); }
  }

  function flush() {
    if (!queue.length) { return; }
    var items = queue.slice();
    queue = [];
    var body = JSON.stringify({ apiKey: apiKey, sessionId: sessionId, events: items });
    var opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PulseTrack-Key': apiKey },
      body: body,
      keepalive: true
    };
    try {
      fetch(endpoint, opts).catch(function () {
        queue = items.concat(queue); // retry later on network failure
      });
    } catch (e) {
      queue = items.concat(queue);
    }
  }

  w.setInterval(flush, 5000);

  // ── Page view (including client-side route changes) ─────────────────────
  function trackPageView() {
    enqueue('pageview', {
      sessionId: sessionId,
      url: w.location.href,
      path: w.location.pathname,
      title: d.title,
      referrer: d.referrer,
      device: getDevice()
    });
  }
  trackPageView();

  (function () {
    var oldPath = w.location.pathname;
    var timer = null;
    d.addEventListener('DOMContentLoaded', function () {
      oldPath = w.location.pathname;
    });
    // SPA route detection via history API (pushState/replaceState + popstate)
    function wrap(orig) {
      return function () {
        var r = orig.apply(this, arguments);
        if (w.location.pathname !== oldPath) { oldPath = w.location.pathname; clearTimeout(timer); timer = w.setTimeout(trackPageView, 150); }
        return r;
      };
    }
    if (w.history) {
      try { w.history.pushState = wrap(w.history.pushState); w.history.replaceState = wrap(w.history.replaceState); } catch (e) {}
    }
    w.addEventListener('popstate', function () {
      if (w.location.pathname !== oldPath) { oldPath = w.location.pathname; clearTimeout(timer); timer = w.setTimeout(trackPageView, 150); }
    });
  })();

  // ── Clicks (with rage/dead click detection) ─────────────────────────────
  var lastClickTarget = null, lastClickTime = 0, rageCount = 0;
  d.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t.nodeType !== 1) { t = t.parentNode; }
    if (!t) { return; }
    var now = Date.now();
    if (t === lastClickTarget && now - lastClickTime < 600) { rageCount++; } else { rageCount = 1; }
    lastClickTime = now;
    lastClickTarget = t;

    var tag = t.tagName ? t.tagName.toLowerCase() : '';
    var interactive = ['a', 'button', 'input', 'select', 'textarea'].indexOf(tag) > -1;
    var isDead = !interactive && !t.closest('a,button,input,select,textarea');

    enqueue('click', {
      sessionId: sessionId,
      targetTag: tag,
      targetId: t.id || undefined,
      targetClasses: (t.className && typeof t.className === 'string') ? t.className.slice(0, 200) : undefined,
      targetText: (t.innerText || '').slice(0, 50),
      x: Math.round(e.clientX || 0),
      y: Math.round((e.clientY || 0) + (w.pageYOffset || 0)),
      isRageClick: rageCount >= 3,
      isDeadClick: isDead,
      url: w.location.href
    });
  });

  // ── JS errors & unhandled rejections ─────────────────────────────────────
  w.addEventListener('error', function (event) {
    enqueue('error', {
      sessionId: sessionId,
      type: 'js_exception',
      message: event.message || 'Unhandled Script Error',
      stack: event.error && event.error.stack ? event.error.stack : '',
      url: w.location.href
    });
  });

  w.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason || {};
    enqueue('error', {
      sessionId: sessionId,
      type: 'unhandled_rejection',
      message: reason.message || String(reason),
      stack: reason.stack || '',
      url: w.location.href
    });
  });

  // ── Performance (Core Web Vitals approximations) ─────────────────────────
  w.setTimeout(function () {
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        var ttfb = nav.responseStart - nav.requestStart;
        if (ttfb > 0) {
          enqueue('performance', { sessionId: sessionId, name: 'TTFB', value: Math.round(ttfb), rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor', url: w.location.href });
        }
      }
      var fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) {
        var v = Math.round(fcp.startTime);
        enqueue('performance', { sessionId: sessionId, name: 'FCP', value: v, rating: v <= 1800 ? 'good' : v <= 3000 ? 'needs-improvement' : 'poor', url: w.location.href });
      }
      if (w.PerformanceObserver && performance.getEntriesByType) {
        try {
          var lcpObs = new w.PerformanceObserver(function (list) {
            var entries = list.getEntries();
            var e = entries[entries.length - 1];
            if (e) { var l = Math.round(e.startTime); enqueue('performance', { sessionId: sessionId, name: 'LCP', value: l, rating: l <= 2500 ? 'good' : l <= 4000 ? 'needs-improvement' : 'poor', url: w.location.href }); }
          });
          lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}
      }
    } catch (e) {}
  }, 2000);

  // ── Heartbeat to keep the session "live" on the dashboard ───────────────
  w.setInterval(function () {
    enqueue('heartbeat', { sessionId: sessionId, url: w.location.href, isVisible: d.visibilityState === 'visible' });
  }, 30000);

  // ── Flush on tab hide / page unload (best-effort via keepalive fetch) ───
  d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') { flush(); } });
  w.addEventListener('pagehide', function () { flush(); });
  w.addEventListener('beforeunload', function () { flush(); });

  // Public API for manual tracking
  w.pulsetrack = {
    track: function (eventName, properties) {
      enqueue('custom', { sessionId: sessionId, eventName: eventName, properties: properties || {}, url: w.location.href, device: getDevice() });
    },
    identify: function (userId, traits) {
      enqueue('identify', { sessionId: sessionId, userId: userId, traits: traits || {} });
    },
    trackError: function (errorObj) {
      errorObj = errorObj || {};
      enqueue('error', {
        sessionId: sessionId,
        type: errorObj.type || 'js_exception',
        message: errorObj.message || 'Script Error',
        stack: errorObj.stack || '',
        url: w.location.href
      });
    },
    flush: flush,
    sessionId: sessionId
  };
})(window, document);
