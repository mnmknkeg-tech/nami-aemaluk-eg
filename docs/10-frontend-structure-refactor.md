# 10) Frontend Structure Refactor & Organization Guide

## What changed

This refactor splits previously oversized frontend files into smaller modules with clearer responsibilities.

> Current context: the frontend is three separate Next.js apps in `apps/` — `marketplace-next` (store), `dashboard-web` (control panel), `business` (merchant portal). Each app rewrites `/api/:path*` to `BACKEND_URL` (default `http://localhost:4000`) — see `apps/*/next.config.mjs`. The only backend is Go 1.25 + Fiber v2.52.5 in `gobackend/` (29 domain modules under `/api/v1`).

### New app-level structure

- `app/AppRoutes.tsx`
  - Owns the full route tree.
  - Keeps `App.tsx` focused on bootstrap and router shell concerns.
- `app/routerHelpers.tsx`
  - Centralizes suspense fallback and small redirect helper components.
- `app/routeWarmup.ts`
  - Isolates route preloading heuristics and warmup loaders from the main app bootstrap.

### New public home structure

- `components/pages/public/home/HomeHero.tsx`
  - Owns the hero / LCP-friendly top section.
- `components/pages/public/home/OffersSection.tsx`
  - Owns the offers loading skeleton, grid rendering, sentinel, and “load more” UI.
- `components/pages/public/HomeFeed.tsx`
  - Now focuses on state, fetching, and orchestration only.
  - Fetching goes through relative `/api/...` paths (proxied by the Next.js rewrite to the Go backend).

## Why this structure is better

### 1. Smaller files
Large mixed-purpose files are harder to reason about and slower to change safely. Splitting them makes review, debugging, and future optimization easier.

### 2. Clear boundaries
Each module now has a more obvious responsibility:
- bootstrap shell
- route definition
- route helper UI
- route warmup heuristics
- page state orchestration
- page visual sections
- browser auth state (`localStorage`: `ray_user` / `ray_token` / `token`, plus the `ray_session` cookie)

### 3. Safer performance work
When route warmup logic, suspense helpers, and hero rendering are isolated, performance changes can be made without risking unrelated routing logic.

### 4. Better onboarding
New developers can find routing logic in `app/`, page-level UI sections in the page folder, and cross-cutting helpers in `lib/` / `services/`. Backend-driven behavior (roles `CUSTOMER` / `MERCHANT` / `ADMIN` / `COURIER` / `CASHIER`, dev-only demo login at `/admin/gate`) comes from the Go/Fiber API, not from frontend code.

## Suggested organization rules going forward

1. If a route file exceeds ~250 lines, split route helpers out.
2. If a page mixes:
   - fetching/state,
   - large visual sections,
   - modal wiring,
   split the visual sections into sibling files under the page folder.
3. Keep `App.tsx` as a shell, not a mega-file.
4. Put performance heuristics (warmup, prefetch, scheduling) in dedicated modules.
5. Prefer one responsibility per file when the logic is reused or independently testable.
6. Keep backend knowledge in one place: the rewrite target (`BACKEND_URL`, default `http://localhost:4000`) lives in `apps/*/next.config.mjs`; page components should only call relative `/api/...` paths.

## Current high-value folders

```text
apps/
  marketplace-next/   # store (Next.js, rewrites /api/:path* → BACKEND_URL)
  dashboard-web/      # control panel (Next.js, rewrites /api/:path* → BACKEND_URL)
  business/           # merchant portal (Next.js, rewrites /api/:path* → BACKEND_URL)

app/
  AppRoutes.tsx
  routerHelpers.tsx
  routeWarmup.ts

components/pages/public/
  HomeFeed.tsx
  home/
    HomeHero.tsx
    OfferCard.tsx
    OffersSection.tsx
```

## Recommended next refactor candidates

- `components/layouts/PublicLayout.tsx`
- `components/pages/public/ShopProfile/index.tsx`
- `components/pages/shared/CartDrawer.tsx`
- `components/pages/public/ProductPage.tsx`

These files still contain multiple responsibilities and are good candidates for the same pattern.
