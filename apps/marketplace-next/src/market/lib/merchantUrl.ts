import { getMerchantStorefrontUrl } from '@ray-eg/shared/merchant/siteUrls';

/**
 * Marketplace discovery stays inside the unified marketplace shop page.
 * The merchant's original published website is opened only by the explicit
 * «الموقع الرسمي» action.
 */
export function getMerchantSitePath(slug: string): string {
  return `/site/${encodeURIComponent(slug)}`;
}

export function getMerchantExternalUrl(slug: string): string {
  return getMerchantStorefrontUrl(slug);
}

export const MERCHANT_LINK_TARGET = '_blank' as const;
export const MERCHANT_LINK_REL = 'noopener noreferrer';
