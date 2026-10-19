'use client';

import { useState, useEffect, useMemo } from 'react';
import { sidebarSections, HIDE_UNPUBLISHED, type SidebarSection } from '@/config/sidebar';
import { apiRequest } from '@/lib/auth';

type Shop = {
  id?: string;
  name?: string;
  layoutConfig?: {
    enabledFeatures?: Record<string, string[]>;
  };
};

const DEFAULT_FEATURES: Record<string, string[]> = {
  branches: ['branchesList', 'branchCompare'],
  team: ['teamMembers', 'teamRoles'],
  sales: ['orders', 'salesOrders', 'deliveryNotes'],
  inventory: ['inventoryoverview', 'products', 'purchaseorders', 'warehouses', 'stocktake', 'suppliers'],
  finance: ['invoice', 'collections', 'wallets', 'expenses', 'receivables', 'payables', 'settlements', 'eta'],
  accounting: ['accounts', 'journal', 'ledger', 'trialBalance', 'financialReports', 'taxes'],
  crm: ['customers', 'customerStatements', 'creditLimits', 'customerSegments', 'customerTags', 'loyaltyProgram'],
  pos: ['posCheckout', 'posSettings'],
  website: ['website', 'website_themes', 'website_builder'],
  analytics: [],
};

/**
 * صفحات إعادة الهيكلة الجديدة — بتظهر دايمًا
 * حتى لو المتجر محفوظ عنده enabledFeatures قديمة من غيرها، لأنها جزء
 * من الهيكل الأساسي مش ميزة اختيارية.
 */
const ALWAYS_VISIBLE_ITEMS = new Set([
  'website',
  'website_themes',
  'website_builder',
  'collections',
  'receivables',
  'payables',
  'settlements',
  'ledger',
  'reportsHub',
  // صفحات إعادة هيكلة المخزون — 6 صفحات أساسية
  'inventoryoverview',
  'products',
  'purchaseorders',
  'warehouses',
  'stocktake',
  'suppliers',
]);

const FEATURE_ALIASES: Record<string, string> = {
  sales: 'orders',
  addProduct: 'products',
  marketingHub: 'campaigns',
  promotions: 'campaigns',
  bookingsOverview: 'reservations',
  aiTheme: 'aiContent',
  aiPages: 'aiContent',
  aiBrand: 'aiContent',
  aiDesign: 'aiContent',
  aiReplies: 'aiContent',
  aiSuggestions: 'aiContent',
  aiPageGen: 'aiContent',
  aiDataAnalysis: 'aiAnalysis',
  aiAutomations: 'aiContent',
};

const MODULE_ALIASES: Record<string, string> = {
  customers: 'crm',
};

/**
 * Shared section-visibility logic used by both the classic Sidebar and the
 * TopNav header: merges merchant-enabled features on top of defaults and
 * returns only the sections that should be shown.
 */
export default function useVisibleSections() {
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    const handleModulesChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabledFeatures?: Record<string, string[]> }>).detail;
      if (detail?.enabledFeatures) {
        setShop((current) => ({
          ...(current || {}),
          layoutConfig: {
            ...(current?.layoutConfig || {}),
            enabledFeatures: detail.enabledFeatures,
          },
        }));
      }
    };
    window.addEventListener('merchant-modules-changed', handleModulesChanged);
    let cancelled = false;
    (async () => {
      try {
        const shopData = await apiRequest('/shops/me');
        if (cancelled) return;
        setShop(shopData);
      } catch {
        if (!cancelled) setShop(null);
      }
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('merchant-modules-changed', handleModulesChanged);
    };
  }, []);

  const enabledFeatures = useMemo(() => {
    const saved = shop?.layoutConfig?.enabledFeatures;
    const merged: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(DEFAULT_FEATURES)) merged[k] = [...v];
    if (saved && typeof saved === 'object') {
      for (const [k, v] of Object.entries(saved)) {
        const key = k.toLowerCase();
        if (!Array.isArray(v)) continue;
        // Explicit onboarding/module-config wins over defaults per module —
        // an empty array means the merchant really turned this module off
        // (e.g. answered "no cashier" at signup). Missing keys (new modules)
        // still fall back to defaults.
        merged[key] = v.map((f) => String(f).toLowerCase());
      }
    }
    return Object.fromEntries(
      Object.entries(merged).map(([moduleId, features]) => [
        moduleId.toLowerCase(),
        new Set(features),
      ])
    ) as Record<string, Set<string>>;
  }, [shop]);

  const visibleSections: SidebarSection[] = useMemo(() => {
    // Market-launch switch: strip everything marked as not-yet-published.
    const base = HIDE_UNPUBLISHED
      ? sidebarSections
          .filter((section) => section.published !== false)
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.published !== false),
          }))
          .filter((section) => section.items.length > 0)
      : sidebarSections;
    return base
      .map((section) => {
        // Always show dashboard, settings, and website
        if (section.id === 'dashboard' || section.id === 'settings' || section.id === 'website') return section;
        // Analytics is a reporting core: always show every analytics page.
        // Shops saved before the analytics pages existed carry stale
        // enabledFeatures.analytics lists that would silently hide pages.
        if (section.id === 'analytics') return section;
        if (!section.moduleId) return section;

        const moduleId = (
          MODULE_ALIASES[section.moduleId.toLowerCase()] || section.moduleId
        ).toLowerCase();
        const activeFeatures = enabledFeatures[moduleId] || new Set<string>();
        const items = section.items.filter((item) => {
          const featureId = (FEATURE_ALIASES[item.id] || item.id).toLowerCase();
          const isSettings = item.id.toLowerCase().endsWith('settings') || item.href.includes('/dashboard/settings');
          return isSettings || activeFeatures.has(featureId) || ALWAYS_VISIBLE_ITEMS.has(featureId);
        });
        if (items.length === 0) return null;
        return { ...section, items };
      })
      .filter((section): section is SidebarSection => Boolean(section))
      .filter((section) => {
        if (section.moduleId) {
          const mod = section.moduleId.toLowerCase();
          if (mod === 'bookings' || mod === 'reservations') {
            return (
              (enabledFeatures.bookings?.size || 0) > 0 ||
              (enabledFeatures.reservations?.size || 0) > 0
            );
          }
          return section.items.length > 0;
        }
        return true;
      });
  }, [enabledFeatures]);

  return visibleSections;
}
