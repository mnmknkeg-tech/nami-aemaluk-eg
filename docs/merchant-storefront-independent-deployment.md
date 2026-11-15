# Independent Merchant Storefront

## Goal

Run published merchant websites as a separate Next.js deployment from the Menmakank marketplace. The dashboard remains the publishing/control plane and the Go API remains the source of truth for shops, published builder configuration, products, inventory, and orders.

## Current implementation slice

- Added `apps/merchant-storefront` as a separate Next.js workspace.
- Its merchant route reuses the existing published-site renderer and the dedicated `SiteCartProvider` / `SiteCheckout` implementation from `apps/marketplace-next`.
- Marketplace discovery must remain on `/shop/:slug` with the Menmakank theme. Publishing a website only enables the merchant's explicit official-site URL.
- Merchant site cart remains separate from the marketplace cart; this app does not introduce a second product or inventory database.
- New orders record `salesChannel` as `website`, `marketplace`, or `pos`, while the legacy `source` field remains intact for existing consumers.

## Deployment setup

Create a separate Vercel project for this app:

- Root Directory: `apps/merchant-storefront`
- Install command: run from the monorepo root using the repository's configured package manager/workspace lockfile.
- Build command: `npm run build` (or the repository's workspace-aware equivalent).
- Output: Next.js default.

Required environment:

- `BACKEND_URL`: private/public Go API origin reachable by the deployment.
- `NEXT_PUBLIC_MERCHANT_ROOT_DOMAINS`: comma-separated platform root domains, for example `mnmknk.com,ray.eg`.
- `NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE=standalone`: makes published-site canonical URLs match the standalone `/:slug` route.
- Configure wildcard DNS and wildcard domain assignment for each platform root domain.

## Important cutover constraints

1. This is a scaffold and source-reuse boundary, not a completed production migration. Build/typecheck and end-to-end checks are required before routing live domains to it.
2. Platform subdomains can derive the tenant slug. Custom domains must NOT be mapped by guessing the hostname as a shop slug; add a verified backend domain-resolution endpoint and ownership verification before enabling custom domains here.
3. Keep the existing `/site/:slug` renderer and its domain routing alive as a rollback path until the independent deployment passes smoke tests.
4. Do not remove the old renderer, change database schemas, or change order semantics in this phase.
5. Confirm the deployed API permits the storefront origin in CORS and that guest checkout cookies / idempotency behavior work cross-origin as designed.
6. The app currently imports the renderer and supporting source from `apps/marketplace-next`. This isolates deployment and routing, but a later cleanup should extract the shared storefront runtime into a dedicated workspace package to remove cross-app source imports.

## Required validation before cutover

- Workspace install and `apps/merchant-storefront` build/typecheck (`npm run build:merchant-storefront`, `npm run typecheck:merchant-storefront`).
- Published builder site renders for a real shop and returns 404 for an unpublished/unknown shop.
- Cart persistence is scoped by merchant slug and does not read/write the marketplace cart key.
- Checkout creates an order for the correct shop and cannot accept a forged shop/product/price from the browser.
- Verify subdomain root, nested paths, checkout path, refresh, and browser back behavior.
- Verify marketplace pages continue to open the unified Menmakank shop page regardless of website publication state.
- Verify rollback to the existing marketplace-hosted `/site/:slug` route.

## Not included yet

- Verified custom-domain mapping.
- Deployment project creation or DNS changes.
- Multi-merchant marketplace parent/child order redesign.
- Multi-merchant marketplace parent/child order redesign.
- Removal of legacy storefront routes.
