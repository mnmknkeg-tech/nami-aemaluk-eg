// The /shop/[slug] storefront adds to the MARKET cart, so its checkout is the
// market checkout filtered to this shop's items (handled inside
// app/checkout/page.tsx via the pathname). This stays a re-export — it is
// marketplace-side by design.
//
// NOTE: the PUBLISHED SITE checkout (/site/[slug]/checkout) is a different,
// fully separate component — see src/merchant-site/checkout/SiteCheckout.tsx.
export { default } from '../../../checkout/page';
