import { HIDE_UNPUBLISHED } from '@/config/sidebar';

/**
 * Market-launch switch — page-level hiding.
 *
 * Sections that only exist on local/dev machines: finance (invoices, wallets,
 * collections, expenses) + accounting + HR + team + analytics + AI. The chrome
 * already strips them (`useVisibleSections` + the settings tabs), and this guard
 * makes sure a direct URL or a stale bookmark cannot open them in production.
 */
export const LOCAL_ONLY_SECTIONS: ReadonlySet<string> = new Set([
  'finance',
  'accounting',
  'hr',
  'team',
  'analytics',
  'ai',
]);

/** True when the given dashboard pathname belongs to a local-only section. */
export function isLocalOnlyPathname(pathname: string | null | undefined): boolean {
  if (!HIDE_UNPUBLISHED) return false;
  // '/dashboard/<section>/...' → the section is the second path segment.
  const section = String(pathname || '').split('/').filter(Boolean)[1] || '';
  return LOCAL_ONLY_SECTIONS.has(section);
}
