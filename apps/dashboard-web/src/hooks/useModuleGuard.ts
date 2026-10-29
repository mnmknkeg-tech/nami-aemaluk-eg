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
  if (Array.isArray(shop.enabledModules) && shop.enabledModules.length > 0) return true;
  if (
    Array.isArray(shop.builderConfig?.enabledModules) &&
    shop.builderConfig.enabledModules.length > 0
  )
    return true;
  if (
    Array.isArray((shop.layoutConfig as any)?.enabledModules) &&
    (shop.layoutConfig as any).enabledModules.length > 0
  )
    return true;
  const features = shop.layoutConfig?.enabledFeatures;
  if (features && typeof features === 'object' && Object.keys(features).length > 0) return true;
  return false;
}

export function isModuleEnabled(shop: ShopData | null | undefined, moduleId: string): boolean {
  if (!shop) return false;
  if (!hasExplicitConfig(shop)) return false;

  const norm = normalise(moduleId);
  if (['dashboard', 'overview', 'settings', 'account', 'store'].includes(norm)) {
    return true;
  }

  const explicitMods: string[] = (
    shop.builderConfig?.enabledModules ??
    (shop.layoutConfig as any)?.enabledModules ??
    shop.enabledModules ??
    []
  ).map(normalise);

  if (explicitMods.includes(norm)) return true;

  // Also check layoutConfig.enabledFeatures keys
  const features = shop.layoutConfig?.enabledFeatures;
  if (features && typeof features === 'object') {
    for (const [key, val] of Object.entries(features)) {
      if (normalise(key) === norm) {
        if (Array.isArray(val)) return val.length > 0;
        return Boolean(val);
      }
    }
  }

  return false;
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
