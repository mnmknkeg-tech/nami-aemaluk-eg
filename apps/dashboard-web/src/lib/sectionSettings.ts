/**
 * Maps the current dashboard route to its section's dedicated settings tab,
 * so settings buttons anywhere in the chrome deep-link to the right page in
 * the unified general settings (`/dashboard/settings?tab=X&from=Y`).
 *
 * Order matters: the most specific prefix wins.
 */

import { HIDE_UNPUBLISHED } from '@/config/sidebar';

export interface SectionSettingsTarget {
  tab: string;
  from: string;
}

const PUBLISHED_ROUTES: Array<{ prefix: string; target: SectionSettingsTarget }> = [
  { prefix: '/dashboard/website', target: { tab: 'store', from: 'website' } },
  { prefix: '/dashboard/sales', target: { tab: 'orders_settings', from: 'sales' } },
  { prefix: '/dashboard/pos', target: { tab: 'pos_settings', from: 'pos' } },
  { prefix: '/dashboard/inventory', target: { tab: 'inventory_settings', from: 'inventory' } },
  { prefix: '/dashboard/branches', target: { tab: 'branches_settings', from: 'branches' } },
  { prefix: '/dashboard/marketing', target: { tab: 'social_media', from: 'marketing' } },
  { prefix: '/dashboard/customers', target: { tab: 'customers_settings', from: 'customers' } },
  { prefix: '/dashboard/crm', target: { tab: 'crm_settings', from: 'crm' } },
  { prefix: '/dashboard/bookings', target: { tab: 'booking_settings', from: 'bookings' } },
];

// Market-launch switch: local-only sections (finance + accounting + HR + team +
// analytics + AI). Their settings tabs are unpublished too, so in production
// these routes fall back to the plain settings overview instead.
const LOCAL_ONLY_ROUTES: Array<{ prefix: string; target: SectionSettingsTarget }> = [
  // accounting lives under /dashboard/finance/accounts — must match before finance
  {
    prefix: '/dashboard/finance/accounts',
    target: { tab: 'accounting_settings', from: 'accounting' },
  },
  { prefix: '/dashboard/finance', target: { tab: 'payments', from: 'finance' } },
  { prefix: '/dashboard/team', target: { tab: 'hr_settings', from: 'hr' } },
  { prefix: '/dashboard/hr', target: { tab: 'hr_settings', from: 'hr' } },
  { prefix: '/dashboard/analytics', target: { tab: 'analytics_settings', from: 'analytics' } },
  { prefix: '/dashboard/ai', target: { tab: 'apps', from: 'ai' } },
];

const ROUTE_MAP: Array<{ prefix: string; target: SectionSettingsTarget }> = HIDE_UNPUBLISHED
  ? PUBLISHED_ROUTES
  : [...LOCAL_ONLY_ROUTES, ...PUBLISHED_ROUTES];


/**
 * Returns the settings URL for the given dashboard path. Outside a known
 * section (or on the settings page itself) it falls back to the plain
 * settings overview.
 */
export function sectionSettingsHref(pathname: string | null | undefined): string {
  const path = String(pathname || '').split('?')[0];
  if (!path.startsWith('/dashboard') || path.startsWith('/dashboard/settings')) {
    return '/dashboard/settings?tab=overview';
  }
  const hit = ROUTE_MAP.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  if (!hit) return '/dashboard/settings?tab=overview';
  return `/dashboard/settings?tab=${hit.target.tab}&from=${hit.target.from}`;
}
