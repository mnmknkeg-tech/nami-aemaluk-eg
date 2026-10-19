# Route-Coverage Audit — Missing Endpoints

Generated from the live probe of the Ray API (`probe-final.ps1` → `probe-final.txt`),
cross-checked line-by-line against the static backend route inventory (`be-paths.txt`)
and the frontend call-site inventory (`fe-paths.txt` / `fe-calls.tsv`).

## Probe totals

| Metric                       | Count |
|------------------------------|-------|
| Probed paths                 | 237   |
| OK (>=1 of 200/401/403)      | 188   |
| Missing (all methods 404)    | 47    |
| Wrong-method only (best=405) | 0     |
| Server error (5xx)           | 2     |

237 = 188 + 47 + 2  ✓

> Note: `probe-summary.txt` was **not** produced by the run (the script's `Set-Content`
> step did not flush — the process was still finishing when the shell was reclaimed).
> The row-level data in `probe-final.txt` is complete and was verified manually, so the
> numbers above are authoritative.

## A. The 47 truly-missing endpoints (no backend route registered)

### 1. AI module — backend has NO `/ai/*` routes at all
- L33 `/ai/analysis/shop/{}`        — `dashboard-web\app\dashboard\(main)\ai\analysis\page.tsx`
- L34 `/ai/automations/shop/{}`     — `dashboard-web\app\dashboard\(main)\ai\automations\page.tsx`
- L35 `/ai/images/shop/{}`          — `dashboard-web\app\dashboard\(main)\ai\images\page.tsx`
- L36 `/ai/insights/shop/{}`        — `dashboard-web\app\dashboard\(main)\ai\insights\page.tsx`
- L37 `/ai/seo/shop/{}`            — `dashboard-web\app\dashboard\(main)\ai\seo\page.tsx`

### 2. Analytics — naming mismatch
Frontend calls descriptive metric names; backend ships only
`/analytics/shop/{}/<report>` + `/analytics/system/*`.
- L38 `/analytics/charts/shop/{}`
- L39 `/analytics/kpi/shop/{}`
- L40 `/analytics/sales-performance/shop/{}`
- L50 `/analytics/visitors/shop/{}`

### 3. HR / workforce — path-shape mismatch
Frontend `/<entity>/shop/{}` vs backend `/hr/shops/{}/<entity>`.
- L57  `/attendance/shop/{}`  (backend: `/hr/shops/{}/attendance`)
- L119 `/leaves/shop/{}`      (backend: `/hr/shops/{}/leaves`)
- L143 `/payroll/shop/{}`     (backend: `/hr/shops/{}/payroll`)
- L209 `/tasks/shop/{}`       (backend: `/hr/shops/{}/tasks`)

### 4. CRM — plural vs singular / missing
Backend has `/chat`, `/chat/{}/messages` — **not** `/chats*`.
- L77 `/chats`
- L78 `/chats/{}`
- L79 `/chats/shop/{}`

### 5. Auth / account settings — not implemented
- L59 `/auth/change-password`  (closest: `POST /portal/change-password`, `/auth/password/forgot|reset`)
- L60 `/auth/deactivate`       (none registered)

### 6. Commerce (marketplace-next platform layer) — largely absent
- L200 `/suggestions`   — `marketplace-next\app\suggestions\SuggestionsForm.tsx`
- L83  `/contact`      — `marketplace-next\app\contact\ContactForm.tsx`
- L128 `/marketplace`   — `marketplace-next\src\lib\platform\services.ts`
- L68  `/blog{}`       — `marketplace-next\src\lib\platform\services.ts`
  (backend has `/blog` + `/blog/{}` returning 401; `/blog{}` with no separator is a distinct unmatched route.)

### 7. Content / website builder — `templates`, `themes`, `websites` all missing
- L210 `/templates/{}`
- L211 `/templates{}`
- L212 `/themes{}`
- L230 `/websites/{}/analytics`
- L231 `/websites/{}/blog`
- L232 `/websites/{}/blog/{}`
- L233 `/websites/{}/menus`
- L234 `/websites/{}/menus/{}`
- L235 `/websites/{}/pages`
- L236 `/websites/{}/pages/{}`
- L237 `/websites/{}/seo-report`
All sourced from `marketplace-next\src\lib\platform\services.ts`.

### 8. Inventory / order-management extensions
- L1   `/abandoned-carts`                       — `dashboard-web\app\dashboard\(main)\sales\abandoned-cart\page.tsx`
- L2   `/abandoned-carts/{}/recover`            — same
- L3   `/abandoned-carts/stats`                 — same
  (backend ships `/cart-events/abandoned` + `/cart-events/stats`; `/abandoned-carts/*` is a parallel unimplemented API.)
- L147 `/products/manage/by-shop/{}/import-drafts` — `dashboard-web\app\dashboard\(main)\inventory\products\page.tsx`
- L163 `/shops/{}/customers/{}/detail`          — `dashboard-web\app\dashboard\(main)\customers\page.tsx`
- L169 `/shops/{}/media`                        — `marketplace-next\src\lib\platform\services.ts`
- L170 `/shops/{}/media/{}`                     — same
- L171 `/shops/{}/media{}`                     — same
- L175 `/shops/{}/products`                    — `marketplace-next\src\lib\services.ts; pos\page.tsx`
- L179 `/shops/{}/settings`                    — `marketplace-next\src\lib\platform\services.ts`
- L187 `/shops/{}/website`                      — `marketplace-next\app\site\[slug]\page.tsx` (SSR catch-all, not an API route)
- L167 `/shops/{}/integrations`                 — `marketplace-next\src\lib\platform\services.ts`
- L168 `/shops/{}/integrations/{}`              — same
- L116 `/invoices/{}/send`                      — `dashboard-web\app\dashboard\(main)\finance\page.tsx`

## B. Server errors (5xx) — routes exist but crash

| Line | Frontend call | Status | Source |
|------|---------------|--------|--------|
| 126 | `/marketing/seasonal-offers/public` | `GET=500` | `marketplace-next\src\lib\services.ts` |
| 176 | `/shops/{}/reviews` | `GET=500` | `marketplace-next\src\lib\platform\services.ts` |

`/marketing/seasonal-offers/public` is present in `be-paths.txt` (it was probed), and a route
matching `/shops/{}/reviews` is hit (otherwise it would 404). Both return 500, so the handler
is live but throws. This is a **severity/priority** fix, distinct from the coverage gaps.

## C. Informational — "wrong-method" partials (route exists, best code is 401 → OK, not missing)

These return `405` on some verbs but `401` on the correct verb, so they are counted in the 188 OK.
Listed as hygiene items, not gaps:

- `/feedback/{}/status` — frontend does GET/POST/PUT (→405); PATCH → 401 (the real method).
- `/shops/{}/website` — see §A.8 (true 404).
- `/shops/published-slugs` — `marketplace-next\app\sitemap.ts` hits it; backend only has
  `GET /builder/published-slugs` (naming drift; currently returns 401 via fallback, not 404).

## D. Recommended fixes (grouped by root cause)

1. **Wire up the wholly-absent modules** — register backend routes for `/ai/*` (5),
   `/templates/*` (2), `/themes/*` (1), `/websites/*` (7), `/marketplace`, `/contact`,
   `/suggestions`, and `/invoices/{}/send` (1). Confirm each against product scope.
2. **Add analytics aliases** — `GET /analytics/{charts|kpi|sales-performance|visitors}/shop/{}`
   proxying to the existing report services, OR re-point the frontend to the registered names.
3. **Unify HR path shape** — either add top-level `/attendance|leaves|payroll|tasks/shop/{}`
   routes, or migrate the frontend to `/hr/shops/{}/<entity>`.
4. **Fix chat naming** — add `/chats` aliases to match the `/chat*` routes, or migrate frontend.
5. **Implement auth endpoints** — `/auth/change-password` and `/auth/deactivate`
   (or point at the `/portal/*` equivalents).
6. **Fix the two 500s** — `/marketing/seasonal-offers/public` and `/shops/{}/reviews`
   need handler debugging.
7. **Clean up shop-scoped naming drift** in inventory/media/integrations/website endpoints
   so they match the registered `/media`, `/shops/{}/image-maps`, `/hr/shops/{}/…` shapes.
