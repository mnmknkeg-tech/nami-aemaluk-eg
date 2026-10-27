'use client';

/**
 * useModuleGuard
 * ──────────────────────────────────────────────────────────────
 * Guards a page so that only merchants who have enabled the given
 * module can access it.  All others are silently redirected to
 * /dashboard.
 *
 * Usage (inside any page component):
 *   useModuleGuard('bookings');
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/auth';

type ShopData = {
  enabledModules?: string[];
  layoutConfig?: { enabledFeatures?: Record<string, unknown> };
  builderConfig?: { enabledModules?: string[] };
};

const MODULE_ALIASES: Record<string, string> = {
  customers: 'crm',
  reservations: 'bookings',
};

function normalise(id: string): string {
  const lower = id.toLowerCase();
  return MODULE_ALIASES[lower] ?? lower;
}

/**
 * Returns true when the shop's stored config explicitly mentions at
 * least one module (i.e. the merchant went through the guided setup).
 * Returns false for brand-new / unconfigured shops so we don't
 * accidentally block every page before first setup completes.
 */
export function hasExplicitConfig(shop?: ShopData | null): boolean {
  if (!shop) return false;
  const mods =
    (shop.builderConfig?.enabledModules ?? shop.layoutConfig?.enabledFeatures)
      ? Object.keys(shop.layoutConfig?.enabledFeatures ?? {})
      : (shop.enabledModules ?? []);
  return Array.isArray(mods) && mods.length > 0;
}

export function isModuleEnabled(shop: ShopData | null | undefined, moduleId: string): boolean {
  if (!shop) return true; // unconfigured/loading → allow everything
  if (!hasExplicitConfig(shop)) return true;

  const norm = normalise(moduleId);
  const explicitMods: string[] = (
    shop.builderConfig?.enabledModules ??
    (shop.layoutConfig as any)?.enabledModules ??
    shop.enabledModules ??
    []
  ).map(normalise);

  if (explicitMods.includes(norm)) return true;

  // Also check layoutConfig.enabledFeatures keys
  const featureKeys = Object.keys(shop.layoutConfig?.enabledFeatures ?? {}).map(normalise);
  return featureKeys.includes(norm);
}

/**
 * @param moduleId – the module key to guard (e.g. 'bookings', 'crm')
 * @returns { allowed: boolean | null } — null while loading, true if allowed, false if blocked
 */
export function useModuleGuard(moduleId: string): { allowed: boolean | null } {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shop: ShopData = await apiRequest('/shops/me');
        if (cancelled) return;
        const ok = isModuleEnabled(shop, moduleId);
        setAllowed(ok);
        if (!ok) {
          // Redirect merchants who don't have this module
          router.replace('/dashboard');
        }
      } catch {
        // If we can't load shop data, don't block access (fail open)
        if (!cancelled) setAllowed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleId, router]);

  return { allowed };
}
