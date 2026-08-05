# PulseTrack — Backend Build Progress

> Last updated: 2026-08-04

---

## Legend
- ✅ Done
- 🔄 In Progress
- ⬜ Pending
- ❌ Blocked

---

## Phase 1 — Authentication & Database Layer
| Task | Status |
|------|--------|
| Install backend dependencies (mongoose, bcryptjs, jsonwebtoken) | ✅ |
| Add MONGODB_URI and JWT_SECRET to .env | ✅ |
| `src/services/mongodb.ts` — MongoDB connection manager | ✅ |
| `src/models/UserModel.ts` — User schema | ✅ |
| `src/models/WorkspaceModel.ts` — Workspace schema | ✅ |
| `src/models/ProjectModel.ts` — Project schema | ✅ |
| `src/models/EventModel.ts` — Analytics event schema | ✅ |
| `src/models/SessionModel.ts` — Session schema | ✅ |
| `src/models/ApiKeyModel.ts` — API key schema | ✅ |
| `src/models/SupportTicketModel.ts` — Support ticket schema | ✅ |
| `src/middleware/auth.ts` — JWT validation middleware | ✅ |
| `POST /api/v1/auth/register` — Register user, provision workspace + project | ✅ |
| `POST /api/v1/auth/login` — Authenticate, return JWT | ✅ |
| `GET /api/v1/auth/me` — Validate token, return user + workspace context | ✅ |
---

## Phase 2 — Real API Routes (MongoDB-backed)
| Task | Status |
|------|--------|
| `POST /api/v1/events` — Persist real events to MongoDB | ✅ |
| `GET /api/v1/analytics/overview` — Aggregate real stats from MongoDB | ✅ |
| `GET /api/v1/analytics/sessions` — Real session query | ✅ |
| `GET /api/v1/analytics/errors` — Real error log query | ✅ |
| `GET /api/v1/analytics/performance` — Real web vitals query | ✅ |
| `GET /api/v1/analytics/live` — Real active session count | ✅ |
| `GET /api/v1/workspaces` — Workspace from MongoDB (auth-gated) | ✅ |
| `GET /api/v1/projects` — Projects from MongoDB (auth-gated) | ✅ |
| `POST /api/v1/projects` — Create new project | ✅ |
| `GET /api/v1/apikeys` — API keys from MongoDB (auth-gated) | ✅ |
| `POST /api/v1/support/ticket` — Persist ticket to MongoDB | ✅ |
| `GET /api/v1/support/tickets` — Real ticket query | ✅ |
| `GET /api/v1/status` — Server + MongoDB health endpoint | ✅ |

---

## Phase 3 — Frontend Auth Flow
| Task | Status |
|------|--------|
| `src/components/AuthPage.tsx` — Login / Register UI | ✅ |
| `src/App.tsx` — Auth gate (show AuthPage if unauthenticated) | ✅ |
| App.tsx — On login success: load real workspace + project | ✅ |
| App.tsx — Logout / clear token | ✅ |
| Dashboard — Pass real workspaces/projects from API into components | ✅ |
| Demo mode — Dashboard still works without MongoDB (mock data) | ✅ |

---

## Phase 4 — Workspace & Project Management (4/5)
| Task | Status |
|------|--------|
| `SettingsWorkspace.tsx` — Full rewrite with 4-tab UI (Projects / API Keys / Workspace / Billing) | ✅ |
| Create new project (form, API call, live update to project switcher) | ✅ |
| Edit project name & domain inline | ✅ |
| Pause / Resume project tracking | ✅ |
| Archive project (with confirmation) | ✅ |
| `PATCH /api/v1/projects/:id` — update name, domain, status | ✅ |
| `DELETE /api/v1/projects/:id` — soft archive | ✅ |
| `POST /api/v1/projects/:id/regenerate-keys` — rotate API keys | ✅ |
| `PATCH /api/v1/workspaces` — rename workspace | ✅ |
| Regenerate API keys (with invalidation warning + confirm) | ✅ |
| Rename workspace inline | ✅ |
| Embed script snippet shown per project (copy-to-clipboard) | ✅ |
| API Keys tab — per-project selector, reveal/hide secret key | ✅ |
| Billing tab — plan usage bar, plan comparison, usage stats | ✅ |
| Workspace tab — members list, invite placeholder, danger zone | ✅ |
| Demo mode support — all actions work without MongoDB | ✅ |

---

## Phase 4 — Analytics Engine (Real Aggregations)
| Task | Status |
|------|--------|
| Visitor trend timeseries from real events | ⬜ |
| Funnel computation from event sequences | ⬜ |
| Real heatmap data from click events | ⬜ |
| Session replay event stream | ⬜ |
| UTM / Referrer tracking | ⬜ |
| Geo-IP resolution (ip-api or MaxMind) | ⬜ |

---

## Phase 5 — Production Hardening
| Task | Status |
|------|--------|
| Rate limiting on /api/v1/events (express-rate-limit) | ⬜ |
| Request validation / sanitization (zod or joi) | ⬜ |
| Redis cache for overview stats | ⬜ |
| BullMQ queue for event ingestion (batch writes) | ⬜ |
| MongoDB indexes (projectId, timestamp, sessionId) | ⬜ |
| Docker + docker-compose setup | ⬜ |
| PM2 process config | ⬜ |
| Nginx config template | ⬜ |

---

## How it works (once complete)

```
Customer visits pulsetrack.app
    ↓
Register (name, email, password, website)
    ↓
MongoDB: User + Workspace + Project + API Keys created
JWT token returned
    ↓
Dashboard loads with real empty analytics
    ↓
Customer copies embed script:
<script src="/tracker.min.js" data-key="pk_live_xxx"></script>
    ↓
Visitor lands on their website
SDK fires → POST /api/v1/events (batched every 5s)
    ↓
MongoDB stores events, sessions, errors, vitals
    ↓
Dashboard shows REAL live data
```
