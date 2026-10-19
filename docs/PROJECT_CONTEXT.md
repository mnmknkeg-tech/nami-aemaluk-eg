# PROJECT_CONTEXT (Ray Marketplace)

## Purpose
This file is the **single source of truth** for the current state of the project.
Use it to avoid re-scanning the repo every time.

Update this file whenever you:
- deploy to a new environment
- change environment variables
- change run/build commands
- introduce a new major module

## Current Status
- **State**: Active development — Go backend + three Next.js apps
- **Phase**: Monorepo (Go backend + marketplace + dashboard + business)
- **Backend health (verified)**: Go backend runs and is connected (DB + Redis) — `GET /monitoring/ready` returns 200 and `GET /api/v1/status` returns 200.

### Production URLs (fill in)
- **Marketplace (Next.js)**: https://mnmknk.com/
- **Dashboard (Next.js)**: dashboard-web (merchant/admin/courier dashboard)
- **Business (Next.js)**: business site
- **Backend API (Go)**: https://api.mnmknk.com
- **Database (Postgres provider)**: <UNKNOWN - PLEASE CONFIRM>

---

## Architecture: Monorepo (Go backend + 3 Next.js apps)

The project is split into **one Go backend** and **three independent Next.js frontend apps**:

```
ray-eg/
├── apps/
│   ├── marketplace-next/     ← Next.js 15 (public marketplace, SEO)
│   ├── dashboard-web/        ← Next.js (merchant/admin/courier dashboard, incl. /admin/gate dev-login page)
│   └── business/             ← Next.js (business / landing site, login, signup, map)
├── packages/
│   ├── shared/               ← @ray-eg/shared (components, services, i18n, utils, types)
│   ├── config/ types/ ui/ utils/
├── gobackend/                ← Go 1.25 + Fiber — the ONLY live backend
├── _archive/                 ← Old NestJS backend (DELETED 2026-08-24 — remains here only, do not use)
└── src/                      ← Legacy Vite app (DEPRECATED — do not use)
```

> The old NestJS backend was deleted on 2026-08-24. Its remains live under `_archive/` only. The only backend is Go 1.25 + Fiber in `gobackend/`.

### Why Split?
- **Marketplace (Next.js)**: Server-side rendering for SEO, sitemaps, robots.txt, structured data, social sharing — critical for public-facing pages.
- **Dashboard (dashboard-web, Next.js)**: Authenticated merchant/admin/courier routes, incl. `/admin/gate` dev-login page (extracts the nested `data.data.token.accessToken`).
- **Business (Next.js)**: Business/landing site with login, signup, and map listing.
- **Shared Package**: Apps import from `@ray-eg/shared` for components, services, i18n, utils — no code duplication.
- **Independent Marketing**: Each app can be deployed, marketed, and scaled independently.

### App 1: Marketplace (Next.js)
- **Location**: `apps/marketplace-next/`
- **Framework**: Next.js 15 (App Router)
- **Port**: `5174` (dev)
- **Purpose**: Public marketplace — shop browsing, product pages, offers, activities, blog, SEO directory
- **Deployment**: Vercel (recommended for Next.js)
- **Key files**: `apps/marketplace-next/app/` (App Router pages), `apps/marketplace-next/next.config.mjs`

### App 2: Dashboard (Next.js, dashboard-web)
- **Location**: `apps/dashboard-web/`
- **Framework**: Next.js (App Router)
- **Port**: `3000` (dev)
- **Purpose**: Merchant dashboard, admin panel, courier orders, portal — all authenticated routes, plus `/admin/gate` dev-login
- **Deployment**: Vercel/Netlify (Next.js)
- **Key files**: `apps/dashboard-web/app/` (incl. `app/admin/gate/page.tsx` — dev-login token extraction), `apps/dashboard-web/next.config.mjs`
- **Dev-login note**: gate page extracts the nested token at `data.data.token.accessToken` and stores it as `ray_token`/`token` (+ `ray_user`).

### App 3: Business (Next.js)
- **Location**: `apps/business/`
- **Framework**: Next.js (App Router)
- **Purpose**: Business/landing site with login, signup, and map listing
- **Deployment**: Vercel/Netlify (Next.js)
- **Key files**: `apps/business/app/`, `apps/business/next.config.mjs`

### Shared Package
- **Location**: `packages/shared/`
- **Package name**: `@ray-eg/shared`
- **Contents**: Components (160+), services (API client, auth), i18n (ar/en), utils, types, hooks
- **Alias**: `@` → `packages/shared/src` (in both apps' configs)

---

## Tech Stack
- **Backend**: Go 1.25 + Fiber v2 (the ONLY live backend, in `gobackend/`)
- **Marketplace Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Dashboard Frontend**: Next.js (dashboard-web) + React 19 + TypeScript + Tailwind CSS
- **Business Frontend**: Next.js (business) + React 19 + TypeScript + Tailwind CSS
- **Shared Package**: `@ray-eg/shared` (components, services, i18n, utils)
- **Database**: PostgreSQL (pgx, golang-migrate under `gobackend/migrations/`)
- **Redis**: used by the Go backend for caching/rate-limiting (`REDIS_URL` or `REDIS_HOST`)
- **AI**: Google Gemini (AI/studio features)
- **Desktop (legacy)**: old Electron wrapper — check `ELECTRON_GUIDE.md`

---

## How to Run Locally

### Install (root — installs all workspaces)
```bash
npm install
```

### Environment Variables
- Go backend reads `gobackend/.env` (reference: `gobackend/.env.example`, prod: `.env.production.example`).
- Frontend apps use `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000` (or `BACKEND_URL` for server-side rewrites).
- **Important**: `.env`, `.env.local`, and `.env.*` are gitignored.

Key variables (backend):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (32+ chars, non-default — mandatory in production)
- `ADMIN_BOOTSTRAP_TOKEN` — non-default (mandatory in production)
- `CSRF_DISABLED` — must be `false` in production
- `CORS_ORIGIN` — no `*` in production
- `REDIS_URL` or `REDIS_HOST` — mandatory in production
- `GEMINI_API_KEY` — backend AI
- `APP_ENV` + `ALLOW_DEV_*_BOOTSTRAP` — dev-login (`dev-*-login`) works only when `APP_ENV=development` with the matching `ALLOW_DEV_*_BOOTSTRAP=true`; forbidden in production.

### Run Backend (Go) — Port 4000
```bash
cd gobackend
docker compose up -d postgres redis
go run ./cmd/api
```
Backend runs on `http://localhost:4000`. Verify with:
```bash
curl http://localhost:4000/monitoring/ready
curl http://localhost:4000/api/v1/status
```
Migrations run on boot (controlled by `DB_MIGRATE_ON_BOOT`).

### Run Marketplace (Next.js) — Port 5174
```bash
npm run dev:marketplace
# or: cd apps/marketplace-next && npm run dev
```
Marketplace runs on `http://localhost:5174`

### Run Dashboard (Next.js) — Port 3000
```bash
npm run dev:dashboard-web
# or: cd apps/dashboard-web && npm run dev
```
Dashboard runs on `http://localhost:3000` (dev-login at `/admin/gate`)

### Run Business (Next.js)
```bash
npm run dev:business
# or: cd apps/business && npm run dev
```

### Run All (concurrent)
```bash
npm run dev:all
npm run go:backend:dev
# Equivalent manual version:
# Terminal 1 (inside gobackend/): docker compose up -d postgres redis && go run ./cmd/api
# Terminal 2: npm run dev:marketplace
# Terminal 3: npm run dev:dashboard-web
# Terminal 4: npm run dev:business
```

### CORS Configuration
Set `CORS_ORIGIN` in `gobackend/.env` to include app origins:
```
CORS_ORIGIN="http://localhost:5174,http://localhost:3000"
```
Never use `*` in production.

---

## Port Reference

| Service          | Port  | Command                                  |
|------------------|-------|------------------------------------------|
| Backend (Go)     | 4000  | `cd gobackend && go run ./cmd/api` (after `docker compose up -d postgres redis` inside `gobackend/`) |
| Marketplace      | 5174  | `npm run dev:marketplace`                |
| Dashboard        | 3000  | `npm run dev:dashboard-web`              |
| Business         | —     | `npm run dev:business`                   |

Verify: `curl http://localhost:4000/monitoring/ready` and `curl http://localhost:4000/api/v1/status`.

---

## Key NPM Scripts (root `package.json`)
> The Go backend replaces the old NestJS backend (deleted 2026-08-24). Legacy remains live under
> `_archive/` and are deprecated.
- Go backend: `cd gobackend && go build ./...` / `go run ./cmd/api` / `go test ./...`
- Root shortcuts: `npm run dev:marketplace`, `npm run dev:dashboard-web`, `npm run dev:business`, `npm run dev:all`, `npm run go:backend:dev`

### Per-app scripts (run from app directory)
- `apps/marketplace-next/`: `npm run dev`, `npm run build`, `npm run start`
- `apps/dashboard-web/`: `npm run dev`, `npm run build`, `npm run start`
- `apps/business/`: `npm run dev`, `npm run build`, `npm run start`

---

## Backend Notes (Go / Fiber)
### Config loading
The Go backend (`gobackend/internal/config`) reads env vars, with `.env` /
`.env.example` / `.env.production.example` under `gobackend/` (godotenv).

### Structure
- `cmd/api`, `cmd/worker` (asynq worker)
- `internal/app` — Fiber wiring, middleware, route registration
- `internal/domains/*` — business domains (auth, users, shops, products, orders,
  customers, dashboard CRM segments/tags, etc.)
- `internal/platform/*` — db, redis, logger, middleware, telemetry, storage, jobs
- `migrations/` — golang-migrate SQL
- `pkg/` — event bus, domain models
- `Dockerfile` (API multi-stage image), `Dockerfile.worker` (worker multi-stage image)

### Key middleware
Request ID, structured logger (zap), compression, security headers, CORS,
admin IP allowlist, CSRF (`CSRF_DISABLED=false` in production), idempotency,
global + auth rate limiting, JWT (required/optional), panic recovery, domain error handler
(errors shaped as `{success:false, error, message}`).

### Monitoring / Health
- `GET /monitoring/ready`
- `GET /monitoring/live`
- `GET /metrics` (Prometheus)
- `GET /api/v1/status`

### Dev-login (development only)
- `dev-*-login` endpoints work only when `APP_ENV=development` with the matching `ALLOW_DEV_*_BOOTSTRAP=true` — forbidden in production.

---

## Frontend Notes

### Marketplace (Next.js)
- App Router with file-based routing
- Server-side rendering for SEO-critical pages
- API proxy via `next.config.mjs` rewrites (`/api/:path*` → backend)
- `NEXT_PUBLIC_BACKEND_URL` env var for backend URL
- Sitemap and robots.txt generated dynamically

### Dashboard (Next.js, dashboard-web)
- Next.js App Router dashboard for merchants/admin/couriers
- `apiRequest(path, options)` helper in `src/lib/auth.tsx` calls `/api/v1${path}`
- `next.config.mjs` rewrites `/api/:path*` → backend (`BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL`)
- Actually wired to the Go backend; segments & tags CRM pages load real data
- `/admin/gate` dev-login page extracts nested `data.data.token.accessToken` and persists `ray_token`/`token`/`ray_user` (clear these keys on `insufficient_role` and re-login)

### Business (Next.js)
- Business/landing site with login, signup, and map listing
- Uses `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_BACKEND_URL`

### Legacy Vite App (`src/`) / Legacy NestJS (`_archive/`)
- **DEPRECATED** — old NestJS backend deleted 2026-08-24 (remains in `_archive/` only); old Vite app no longer maintained
- Do NOT use any `npm run backend:*`, `pm2`, or Nest build commands.

---

## Production Secrets Policy
- Never commit any `.env*` files.
- Configure deploy-time secrets using the hosting platform **Environment Variables**.
- Mandatory production vars: `JWT_SECRET` (32+ chars, non-default), `ADMIN_BOOTSTRAP_TOKEN` (non-default), `CSRF_DISABLED=false`, `CORS_ORIGIN` (no `*`), `REDIS_URL` or `REDIS_HOST`. See `gobackend/.env.example` and `.env.production.example`.

---

## Admin Bootstrap (Production)
There is a secure production initialization endpoint:
- `POST /api/v1/auth/bootstrap-admin`
- guarded by `ADMIN_BOOTSTRAP_TOKEN`

Behavior notes:
- intended as one-time by default in production
- can optionally allow reset via `ADMIN_BOOTSTRAP_ALLOW_RESET=true`

---

## Change Log (manual)
- 2026-01-26: Created this `PROJECT_CONTEXT.md` as the canonical project reference.
- 2026-07-28: Updated to reflect two-app architecture (Next.js marketplace + Vite dashboard + shared package).
- 2026-09-03: Migrated to Go backend (Fiber) + three Next.js apps (marketplace-next, dashboard-web, business). Retired NestJS backend and Vite dashboard. Dashboard CRM now wired to Go API (segments/tags).
- 2026-09-03: Fixed dev-login token persistence in `apps/dashboard-web/app/admin/gate/page.tsx` (extract nested `data.data.token.accessToken`) and documented that the Go backend runs and is connected (DB+Redis) via `/monitoring/ready` and `/api/v1/status`.
