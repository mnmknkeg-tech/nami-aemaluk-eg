'use client';

import { apiRequest } from '@/lib/auth';

/**
 * POS cashier-settings storage.
 *
 * Cashier accounts + admin PIN live in the shop's layoutConfig (no dedicated
 * backend yet) — merged the same way ModulesTab persists enabledFeatures:
 * PATCH /shops/me with { layoutConfig: { ...previousLayout, posSettings } }.
 *
 * Client-side PINs are an accountability/UX gate, not real security.
 */

export interface PosCashier {
  id: string;
  name: string;
  pin: string;
  permissions: string[];
}

export interface PosSettings {
  adminPin?: string;
  cashiers: PosCashier[];
  /** Merchant-level notification preferences (additional to the user mute toggle). */
  notifications?: { sound?: boolean; banner?: boolean };
  /** Auto-confirm POS orders right after they are created (no manual confirm page visit). */
  autoConfirmOrders?: boolean;
}

/** Fixed permission keys a cashier can hold. */
export const CASHIER_PERMISSIONS: { key: string; labelAr: string }[] = [
  { key: 'open_shift', labelAr: 'فتح الوردية' },
  { key: 'close_shift', labelAr: 'إغلاق الوردية' },
  { key: 'returns', labelAr: 'عمل مرتجع' },
  { key: 'discount', labelAr: 'منح خصم' },
  { key: 'reports', labelAr: 'تقارير الكاشير' },
];

export const CURRENT_CASHIER_KEY = 'pos_current_cashier';

/** Read saved POS settings from the shop object (defaults when absent). */
export function loadPosSettings(shop: any): PosSettings {
  const raw = shop?.layoutConfig?.posSettings;
  if (raw && typeof raw === 'object') {
    const cashiers = Array.isArray(raw.cashiers)
      ? raw.cashiers
          .filter((c: any) => c && typeof c === 'object' && c.name)
          .map((c: any) => ({
            id: String(c.id || ''),
            name: String(c.name),
            pin: String(c.pin || ''),
            permissions: Array.isArray(c.permissions)
              ? c.permissions.map((p: any) => String(p))
              : [],
          }))
          .filter((c: PosCashier) => c.id)
      : [];
    return {
      adminPin: typeof raw.adminPin === 'string' && raw.adminPin ? raw.adminPin : undefined,
      cashiers,
      notifications: {
        sound: raw.notifications?.sound !== false,
        banner: raw.notifications?.banner !== false,
      },
      autoConfirmOrders: raw.autoConfirmOrders === true,
    };
  }
  return {
    cashiers: [],
    notifications: { sound: true, banner: true },
    autoConfirmOrders: false,
  };
}

/** Persist POS settings via PATCH /shops/me (merge-on-top of previous layout). */
export async function savePosSettings(shop: any, posSettings: PosSettings): Promise<PosSettings> {
  const previousLayout =
    shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? shop.layoutConfig : {};
  await apiRequest('/shops/me', {
    method: 'PATCH',
    body: JSON.stringify({ layoutConfig: { ...previousLayout, posSettings } }),
  });
  // keep the in-memory shop object in sync (same pattern as ModulesTab)
  if (shop && typeof shop === 'object') {
    shop.layoutConfig = { ...previousLayout, posSettings };
  }
  return posSettings;
}

/** Does a cashier hold a permission key? */
export function cashierHasPermission(
  cashier: { id: string; permissions?: string[] } | null | undefined,
  permissionKey: string
): boolean {
  return Boolean(
    cashier && Array.isArray(cashier.permissions) && cashier.permissions.includes(permissionKey)
  );
}

/** Active cashier identity on this device (set when a shift is opened). */
export function readCurrentCashier(): { id: string; name: string; permissions?: string[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CURRENT_CASHIER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.name) {
      return {
        id: String(parsed.id),
        name: String(parsed.name),
        permissions: Array.isArray(parsed.permissions)
          ? parsed.permissions.map((p: any) => String(p))
          : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the current cashier against the FRESH settings: find by id in
 * loadPosSettings(shop).cashiers and return the live object (permissions and
 * name come from settings, not the stale localStorage copy). Falls back to the
 * stored copy if the cashier was deleted from settings.
 */
export function resolveCurrentCashier(
  shop: any,
  current: { id: string; name: string; permissions?: string[] } | null | undefined
): PosCashier | null {
  if (!current?.id) return null;
  const settings = loadPosSettings(shop);
  const fresh = settings.cashiers.find((c) => c.id === current.id);
  if (fresh) return fresh;
  // cashier was deleted from settings — fall back to the stored identity
  return {
    id: current.id,
    name: current.name,
    pin: '',
    permissions: Array.isArray(current.permissions) ? current.permissions : [],
  };
}

export function writeCurrentCashier(
  cashier: { id: string; name: string; permissions?: string[] } | null
) {
  if (typeof window === 'undefined') return;
  try {
    if (cashier) {
      window.localStorage.setItem(CURRENT_CASHIER_KEY, JSON.stringify(cashier));
    } else {
      window.localStorage.removeItem(CURRENT_CASHIER_KEY);
    }
    window.dispatchEvent(new CustomEvent('pos-cashier-changed'));
  } catch {}
}
