'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { readOverviewPrefs, writeOverviewPrefs } from './prefs';
import type { OverviewPrefs, Shop } from './types';

/**
 * تخصيص الأقسام — الحالة + الافتراضي الذكي حسب موديولات المتجر.
 * Isolated from the page so the overview stays readable.
 */
export function useOverviewSections(shop: Shop | null) {
  const { user } = useAuth();
  /**
   * Whether the merchant has enabled the bookings module.
   * We treat an unconfigured shop (no enabledModules at all) as having
   * everything available so we don't hide content on first login.
   */
  const bookingModuleEnabled = useMemo(() => {
    const mods: string[] =
      (shop as any)?.enabledModules ??
      (shop as any)?.builderConfig?.enabledModules ??
      Object.keys((shop as any)?.layoutConfig?.enabledFeatures ?? {});
    if (!Array.isArray(mods) || mods.length === 0) return true; // unconfigured
    return mods
      .map((m) => m.toLowerCase())
      .some((m) => m === 'bookings' || m === 'reservations' || m === 'bookingsschedule');
  }, [shop]);

  /* ============================================================
   * تخصيص الأقسام — الحالة + الافتراضي الذكي حسب موديولات المتجر
   * ============================================================ */
  const userKey = String(user?.id || shop?.id || 'anon');
  const [sectionPrefs, setSectionPrefs] = useState<OverviewPrefs>({ hidden: [], forced: [] });
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    setSectionPrefs(readOverviewPrefs(userKey));
  }, [userKey]);

  const saveSectionPrefs = useCallback(
    (next: OverviewPrefs) => {
      setSectionPrefs(next);
      writeOverviewPrefs(userKey, next);
    },
    [userKey]
  );

  // قدرات المتجر بنفس منطق bookingModuleEnabled — متجر متفعّل فيه الحجوزات
  // فقط مثلاً لا يرى بطاقات الطلبات وتوزيعها افتراضيًا (وقد يُرجعها من اللوحة).
  const configuredGroups = useMemo(() => {
    const feats = (shop as any)?.layoutConfig?.enabledFeatures as
      Record<string, string[]> | undefined;
    const mods: string[] =
      (shop as any)?.enabledModules ??
      (shop as any)?.builderConfig?.enabledModules ??
      Object.keys(feats ?? {});
    return Array.isArray(mods) ? mods.map((m) => m.toLowerCase()) : [];
  }, [shop]);
  const hasExplicitModules = configuredGroups.length > 0;
  const ordersCapability = !hasExplicitModules
    ? true
    : configuredGroups.some((g) =>
        ['sales', 'orders', 'pos', 'products', 'inventory', 'promotions'].includes(g)
      );
  const productsCapability = !hasExplicitModules
    ? true
    : configuredGroups.some((g) => ['products', 'inventory', 'sales'].includes(g));
  const crmCapability = !hasExplicitModules
    ? true
    : configuredGroups.some((g) => ['crm', 'customers'].includes(g));

  // أقسام تُخفى تلقائيًا لأن موديولها موقوف — اللوحة تسمح بإظهارها رغم ذلك.
  const moduleAutoHidden = useMemo(() => {
    const out: string[] = [];
    if (!ordersCapability) out.push('kpi:Orders', 'distribution');
    if (!productsCapability) out.push('topProducts');
    if (!bookingModuleEnabled) out.push('kpi:Bookings');
    if (!crmCapability && !bookingModuleEnabled) out.push('kpi:Customers');
    return out;
  }, [ordersCapability, productsCapability, bookingModuleEnabled, crmCapability]);

  const isSectionHidden = useCallback(
    (id: string) =>
      sectionPrefs.hidden.includes(id) ||
      (moduleAutoHidden.includes(id) && !sectionPrefs.forced.includes(id)),
    [sectionPrefs, moduleAutoHidden]
  );

  const hideSection = useCallback(
    (id: string) =>
      saveSectionPrefs({
        hidden: [...new Set([...sectionPrefs.hidden, id])],
        forced: sectionPrefs.forced.filter((f) => f !== id),
      }),
    [sectionPrefs, saveSectionPrefs]
  );

  const toggleSection = useCallback(
    (id: string) => {
      if (!isSectionHidden(id)) {
        hideSection(id);
        return;
      }
      // إظهار: يشيله من المخفي، ولو قسم موقوف مع الموديول يُسجَّل كاستثناء
      saveSectionPrefs({
        hidden: sectionPrefs.hidden.filter((x) => x !== id),
        forced: moduleAutoHidden.includes(id)
          ? [...new Set([...sectionPrefs.forced, id])]
          : sectionPrefs.forced,
      });
    },
    [sectionPrefs, moduleAutoHidden, isSectionHidden, hideSection, saveSectionPrefs]
  );

  const showAllSections = useCallback(
    () => saveSectionPrefs({ hidden: [], forced: [] }),
    [saveSectionPrefs]
  );
  return {
    bookingModuleEnabled,
    moduleAutoHidden,
    customizeOpen,
    setCustomizeOpen,
    isSectionHidden,
    hideSection,
    toggleSection,
    showAllSections,
  };
}
