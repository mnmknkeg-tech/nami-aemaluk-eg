# Independent Merchant Storefront

## Production routing contract

The independent Merchant Storefront is a separate Next.js deployment:

- Vercel project root: `apps/merchant-storefront`
- Current production origin: `https://nami-aemaluk-eg-fib3.vercel.app`
- Public merchant URL: `https://nami-aemaluk-eg-fib3.vercel.app/{slug}`
- Example: `https://nami-aemaluk-eg-fib3.vercel.app/al-islam`
- The app root `/` is informational, not a merchant's shop.

The dashboard publish link and the Marketplace's explicit «الموقع الرسمي» link use one shared URL helper from `packages/shared/src/merchant/siteUrls.ts`. The old Marketplace path is not the default destination.

## Architecture

- Nami Dashboard / Website Builder remains the publishing/control plane.
- Menmakank Marketplace remains the discovery and unified shop experience.
- Merchant Storefront renders each merchant's original published website.
- Go API + PostgreSQL remain the shared source of truth for shops, products, inventory, published builder configuration, bookings and orders.
- The Storefront reuses the published-site renderer and the merchant-only `SiteCartProvider` / `SiteCheckout` implementation. It does not create a second product or inventory database.

## Routes

- `/{slug}` — published home page
- `/{slug}/product/{id}` — product details
- `/{slug}/book` — booking flow
- `/{slug}/bookings/track` — booking tracking
- `/{slug}/checkout` — merchant-site checkout
- `/{slug}/track/{id}` — order tracking

The shared renderer still emits older internal links such as `/site/{slug}/checkout`. Storefront middleware redirects those legacy paths to the equivalent standalone path, including nested routes. Marketplace discovery remains on `/shop/{slug}`; only the explicit official-site action opens the standalone site.

## Deployment configuration

The Storefront enforces these build-time values in `apps/merchant-storefront/next.config.mjs`:

- `NEXT_PUBLIC_MERCHANT_STOREFRONT_MODE=standalone`
- `NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE=https://nami-aemaluk-eg-fib3.vercel.app/{slug}`

Optional overrides for Dashboard and Marketplace:

- `NEXT_PUBLIC_MERCHANT_STOREFRONT_URL`: storefront origin, without a trailing slash.
- `NEXT_PUBLIC_MERCHANT_SITE_URL_TEMPLATE`: verified URL template containing `{slug}`, e.g. `https://{slug}.mnmknk.com`.
- `NEXT_PUBLIC_MERCHANT_ALLOW_LEGACY_SITE_URL=true`: emergency rollback only; permits the old `NEXT_PUBLIC_MERCHANT_BASE_URL` / `/site/{slug}` destination.
- `BACKEND_URL`: Go API origin.
- `NEXT_PUBLIC_MERCHANT_ROOT_DOMAINS`: optional platform root domains for verified tenant subdomains.

Do not use an old Marketplace `/site/{slug}` URL as the normal storefront template. Custom domains still require verified domain-to-shop resolution and ownership checks; never infer a shop from an arbitrary custom hostname.

## Validation

- A real published shop renders at `/{slug}`; an unknown/unpublished shop returns 404.
- Refresh and nested routes work for product, booking, checkout, booking tracking and order tracking.
- Old `/site/{slug}` links redirect to the correct standalone path.
- Merchant site cart remains isolated by shop slug and never reads/writes the Marketplace cart key.
- Checkout creates a website-channel order for the correct shop.
- Marketplace cards/search/maps still open `/shop/{slug}`; only «الموقع الرسمي» opens the independent site.
- Dashboard publish modal and copy/share links use the same standalone URL.
- Keep the old Marketplace `/site/{slug}` renderer available as rollback until standalone smoke tests pass.

## Known boundary

This is application-level separation with shared renderer source imports from `apps/marketplace-next`. Extracting that runtime into a dedicated shared package is a later cleanup. Verified custom-domain mapping and multi-merchant parent/child orders are not part of this cutover.
