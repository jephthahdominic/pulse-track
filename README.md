# PulseTrack

Self-hosted web analytics for small businesses. Add a single line to any website and get real-time visitors, sessions, web vitals, errors, conversion funnels, and click heatmaps — with AI-generated insights, no cookie banners required.

PulseTrack runs as one Node.js process: an Express REST API, a server-rendered React dashboard, and an embeddable tracking SDK. It stores everything in MongoDB and falls back to a fully-featured in-memory demo mode when no database is connected, so you can try the entire product before wiring up infrastructure.

## Features

- **Live visitors** — active session count with country, device, browser, and current page
- **Overview dashboard** — visitor trends, bounce rate, top pages/devices/countries, hourly series, web-vitals health score
- **Performance monitoring** — real Core Web Vitals (LCP, CLS, INP, TTFB, FID, FCP) aggregated per page with p75 stats
- **Error monitoring** — JS exceptions and unhandled rejections captured in real time
- **Conversion funnels** — drop-off analysis computed from your actual event stream
- **Click heatmaps** — page-scoped heatmap with rage-click detection
- **User explorer** — profiles built from `identify()` calls and signed-in sessions
- **AI insights** — Gemini-powered analysis of your real analytics data, with response caching, per-project rate limiting, and a rule-engine fallback when Gemini is disabled or unreachable
- **Geo enrichment** — best-effort country/city resolution from visitor IPs (background, never blocks ingestion)
- **Workspace & project management** — multi-project workspaces, per-project public/secret API keys with rotation, pause/resume/archive, embed snippet generator
- **Support desk & admin panel** — in-app support tickets and platform stats
- **Privacy-friendly tracking** — single script, no cookies, sample-based Core Web Vitals approximation

## Architecture

```
Website visitor
      │  <script src="https://yourdomain/tracker.min.js" data-key="pk_live_xxx"></script>
      ▼
 public/tracker.min.js   (batched every 5s, keepalive flush, SPA route detection)
      │  POST /api/v1/events  (X-PulseTrack-Key auth)
      ▼
   server.ts  ── Express API + static SPA server
      │
      ├── MongoDB (Mongoose): users, workspaces, projects, api keys, events, sessions, tickets
      └── Demo fallback (src/services/db.ts): in-memory store when Mongo is unavailable
```

One process serves three things:

1. The **tracking endpoint** and **analytics API** (`/api/v1/*`)
2. The **dashboard** — a React SPA (Vite build served from `dist/`)
3. The **tracker script** at `/tracker.min.js`

## Tech stack

- **Backend**: Node.js, Express, Mongoose, MongoDB, JWT (jsonwebtoken), bcryptjs
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Lucide icons
- **AI**: Google Gemini (`@google/genai`)
- **Language**: TypeScript (single `tsconfig` for server and client)

## Getting started

Prerequisites: Node.js 20+ and a MongoDB instance (local or Atlas).

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev            # http://localhost:3000
```

Open http://localhost:3000 and register an account. Registration auto-provisions a workspace, a project, and API keys. If `MONGODB_URI` is missing or unreachable, the app runs in demo mode with realistic mock data so you can explore every screen.

### Configuration

All settings live in `.env` (see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string. Leave empty to use demo mode. | — |
| `JWT_SECRET` | Secret for signing auth tokens. Use a long random string in production. | — |
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | `development` enables Vite dev middleware; anything else serves the production build. Not required — `npm run dev` sets it for you. | `production` |
| `APP_URL` | Public URL of the deployment (used for self-referential links) | `http://localhost:3000` |
| `GEMINI_API_KEY` | Enables AI insights. Leave empty to use the rule-engine fallback. | — |
| `GEMINI_ENABLED` | Set to `false` to disable all Gemini calls | `true` |
| `GEMINI_CACHE_TTL_MIN` | Minutes to cache an AI insights response per project | `15` |
| `GEMINI_RATE_MAX` / `GEMINI_RATE_WINDOW_MIN` | Max Gemini calls per project per window | `6` / `60` |
| `GEMINI_MAX_ERRORS` / `GEMINI_MAX_VITALS` / `GEMINI_MAX_PAGES` | Prompt size caps for AI calls | `3` / `4` / `3` |

## Installing tracking on your website

Add one script tag to any site — plain HTML/CSS, a React app, or Next.js — and PulseTrack starts capturing page views, client-side route changes, clicks (with rage/dead-click detection), JavaScript errors, and Core Web Vitals. No cookies are used, so no consent banner is required.

The SDK batches events every 5 seconds and flushes when the tab is hidden or the page unloads.

### 1. Get your tracking snippet

1. Sign in to your PulseTrack dashboard.
2. Go to **Settings → Projects** and open the project for your site.
3. Copy the **public key** (`pk_...`) and the **tracker URL** (`/tracker.min.js`).
4. For local testing point the tracker at `http://localhost:3000/tracker.min.js`. In production use your deployed PulseTrack URL, e.g. `https://analytics.example.com/tracker.min.js`. In all examples below, replace both the script URL and `data-key` value with your own.

### 2. HTML / CSS (static sites)

Paste the snippet into the `<head>` of every page you want to track:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Site</title>
    <script src="https://analytics.example.com/tracker.min.js" data-key="pk_live_xxxxx" async></script>
  </head>
  <body>
    <!-- your page content -->
  </body>
</html>
```

If your pages come from a template, static-site generator, or CMS, add the line to the shared layout so it appears on every page automatically.

### 3. React (Vite, CRA, Remix, ...)

Add the script to your app shell (`index.html` for Vite/CRA):

```html
<script src="https://analytics.example.com/tracker.min.js" data-key="pk_live_xxxxx" async></script>
```

Client-side route changes are detected automatically — the SDK wraps `history.pushState` / `replaceState` and listens for `popstate` — so page views are recorded without any extra code.

For typed access to the manual API, copy `public/pulsetrack.d.ts` from this repo into your app's `src/` folder (Vite picks it up automatically) and use optional chaining:

```ts
window.pulsetrack?.track('AddToCart', { plan: 'pro' });
```

### 4. Next.js (App Router)

Add the script to your root layout with `next/script` (`src/app/layout.tsx`):

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://analytics.example.com/tracker.min.js"
          data-key="pk_live_xxxxx"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

Next.js client-side navigation also goes through the History API, so the SDK records each route change automatically. In **client components**, call the API directly (the tracker only runs in the browser):

```tsx
'use client';

export default function BuyButton() {
  return (
    <button onClick={() => window.pulsetrack?.track('CheckoutStarted', { plan: 'pro' })}>
      Checkout
    </button>
  );
}
```

**Next.js (Pages Router)** — same idea in `_app.tsx`:

```tsx
import Script from 'next/script';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="https://analytics.example.com/tracker.min.js"
        data-key="pk_live_xxxxx"
        strategy="afterInteractive"
      />
    </>
  );
}
```

### 5. Manual events (custom conversions, users, errors)

The SDK exposes `window.pulsetrack` once the script loads:

```js
// Custom conversion events (show up in Funnels + Events)
window.pulsetrack.track('AddToCart', { plan: 'pro' });

// Identify signed-in users (builds the User Explorer)
window.pulsetrack.identify('user_42', { name: 'Jane Doe', email: 'jane@example.com' });

// Report an error explicitly
window.pulsetrack.trackError({ type: 'app_exception', message: 'Checkout failed', stack: err.stack });
```

Guard calls with `window.pulsetrack?.` if the script may not have loaded yet.

### 6. Verify it's working

1. Open your site with the snippet installed.
2. Open the dashboard → **Live** tab — your session should appear within seconds.
3. Browse a few pages and click around, then check **Overview**, **Heatmaps**, and **Health**. Events arrive in ~5-second batches.
4. Errors and Core Web Vitals are captured automatically and appear in the **Errors** and **Health** sections.

### Notes

- The script loads cross-origin from your PulseTrack server, so serve PulseTrack over **HTTPS** in production.
- If your site uses a strict Content-Security-Policy, allow the tracker origin (your PulseTrack domain) in both `script-src` and `connect-src`:

  ```http
  script-src https://analytics.example.com;
  connect-src https://analytics.example.com;
  ```

- The tracker never sets cookies and never reads them — sessions use an in-page session id, and visitors remain anonymous unless you call `identify()`.

## API

Auth endpoints return a JWT; analytics endpoints require it as `Authorization: Bearer <token>`. Event ingestion is authenticated with `X-PulseTrack-Key: <public_key>`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register user; provisions workspace, project, and API keys |
| `POST` | `/api/v1/auth/login` | Authenticate, return JWT |
| `GET` | `/api/v1/auth/me` | Current user, workspace, projects, and API keys |
| `POST` | `/api/v1/events` | Batch event ingestion (SDK) |
| `POST` | `/api/v1/session` / `/api/v1/heartbeat` | Session lifecycle helpers |
| `POST` | `/api/v1/identify` | Identify a user |
| `POST` | `/api/v1/performance` / `/api/v1/error` / `/api/v1/custom-event` | Single-purpose ingestion endpoints |
| `GET` | `/api/v1/analytics/overview` | Aggregated stats for the selected project and timeframe |
| `GET` | `/api/v1/analytics/live` | Currently active sessions |
| `GET` | `/api/v1/analytics/realtime` | Recent activity feed (paginated `limit`/`offset`) |
| `GET` | `/api/v1/analytics/sessions` | Session history |
| `GET` | `/api/v1/analytics/events` | Custom conversion events |
| `GET` | `/api/v1/analytics/errors` | Captured errors |
| `GET` | `/api/v1/analytics/performance` | Web vitals samples |
| `GET` | `/api/v1/analytics/funnels` | Computed funnel conversion |
| `GET` | `/api/v1/analytics/heatmaps` | Aggregated click coordinates |
| `GET` | `/api/v1/analytics/user-explorer` | Identified user profiles |
| `POST` | `/api/v1/analytics/ai-insights` | AI insights from real analytics data |
| `GET/POST` | `/api/v1/projects`, `/api/v1/projects/:id`, `.../regenerate-keys` | Project management |
| `GET/PATCH` | `/api/v1/workspaces` | Workspace management |
| `GET/POST` | `/api/v1/apikeys`, `/api/v1/support/*` | API keys and support tickets |
| `GET` | `/api/v1/status` | Server + MongoDB health |
| `GET` | `/api/v1/admin/stats` | Platform stats |

## Deployment

PulseTrack is a single Node process, so production is just a build plus a run:

```bash
npm run build          # dist/server.cjs + static SPA in dist/
npm start              # node dist/server.cjs
```

Defaults that matter in production:

- `PORT` defaults to `3000` and honors the `PORT` environment variable (Render, Railway, Fly.io, etc. inject this automatically).
- Without `NODE_ENV`, the server serves the production build. Only `NODE_ENV=development` enables Vite's dev middleware (the `npm run dev` script sets this for you).
- Put Caddy or Nginx in front of it for HTTPS — trackers load cross-origin from your customers' sites, so HTTPS is strongly recommended.
- If MongoDB is behind a firewall (e.g. Atlas), allowlist your server's IP or use a serverless cluster.
- Rotate `JWT_SECRET` to a fresh random value, e.g. `openssl rand -base64 48`.
- For resilience, run with a process manager such as PM2 or a systemd unit.

Scripts:

| Script | Action |
|---|---|
| `npm run dev` | Start the dev server (Vite middleware + live reload) |
| `npm run build` | Type-safe production bundle (`dist/server.cjs` + SPA) |
| `npm start` | Run the production server |
| `npm run lint` | Type-check the whole project with `tsc --noEmit` |

## Project structure

```
server.ts                 Express server: API routes, ingest, aggregations, AI, static serving
public/tracker.js         Tracking SDK (source); tracker.min.js is the served copy
public/pulsetrack.d.ts    TypeScript declarations for window.pulsetrack (copy into your app for typing)
src/
  components/             React dashboard (Auth, Overview, Live, Funnels, Heatmaps, Settings, ...)
  models/                 Mongoose schemas (User, Workspace, Project, Event, Session, ApiKey, ...)
  services/
    mongodb.ts            Mongo connection manager (reconnect + health flag)
    db.ts                 In-memory demo fallback
  middleware/auth.ts      JWT validation
```
