'use client';

import { useState, useEffect, useMemo } from 'react';
import { sidebarSections, HIDE_UNPUBLISHED, type SidebarSection } from '@/config/sidebar';
import { apiRequest } from '@/lib/auth';

type Shop = {
  id?: string;
  name?: string;
  enabledModules?: string[];
  layoutConfig?: {
    enabledFeatures?: Record<string, string[]>;
    enabledModules?: string[];
  };
  builderConfig?: {
    enabledModules?: string[];
  };
};

const DEFAULT_FEATURES: Record<string, string[]> = {
  branches: ['branchesList', 'branchCompare'],
  team: ['teamMembers', 'teamRoles'],
  sales: ['orders', 'salesOrders', 'deliveryNotes'],
  inventory: [
    'inventoryoverview',
    'products',
    'purchaseorders',
    'warehouses',
    'stocktake',
    'suppliers',
  ],
  finance: [
    'invoice',
    'collections',
    'wallets',
    'expenses',
    'receivables',
    'payables',
    'settlements',
    'eta',
  ],
  accounting: ['accounts', 'journal', 'ledger', 'trialBalance', 'financialReports', 'taxes'],
  crm: [
    'customers',
    'customerStatements',
    'creditLimits',
    'customerSegments',
    'customerTags',
    'loyaltyProgram',
  ],
  pos: ['posCheckout', 'posSettings'],
  website: ['website', 'website_themes', 'website_builder'],
  analytics: [],
};

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
  reservations: 'bookings',
};

const SETTINGS_ITEM_MODULES: Record<string, string> = {
  settings_bookings: 'bookings',
  settings_orders: 'sales',
  settings_pos: 'pos',
  settings_inventory: 'inventory',
  settings_branches: 'branches',
  settings_accounting: 'accounting',
  settings_customers: 'customers',
  settings_crm: 'crm',
  settings_hr: 'hr',
};

const SETTINGS_TAB_MODULES: Record<string, string> = {
  bookings: 'booking_settings',
  sales: 'orders_settings',
  pos: 'pos_settings',
  inventory: 'inventory_settings',
  branches: 'branches_settings',
  accounting: 'accounting_settings',
  customers: 'customers_settings',
  crm: 'crm_settings',
  hr: 'hr_settings',
};

/**
 * Shared section-visibility logic used by both the classic Sidebar and the
 * TopNav header: strictly respects the modules and features chosen by the merchant.
 */
export default function useVisibleSections() {
  const [shop, setShop] = useState<Shop | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ray_merchant_shop_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('ray_merchant_shop_cache'));
    }
    return false;
  });

  useEffect(() => {
    const handleModulesChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          enabledFeatures?: Record<string, string[]>;
          enabledModules?: string[];
        }>
      ).detail;
      if (detail?.enabledFeatures || detail?.enabledModules) {
        setShop((current) => {
          const next = {
            ...(current || {}),
            enabledModules: detail.enabledModules ?? current?.enabledModules,
            layoutConfig: {
              ...(current?.layoutConfig || {}),
              enabledFeatures: detail.enabledFeatures ?? current?.layoutConfig?.enabledFeatures,
              enabledModules: detail.enabledModules ?? current?.layoutConfig?.enabledModules,
            },
          };
          try {
            localStorage.setItem('ray_merchant_shop_cache', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('merchant-modules-changed', handleModulesChanged);
    let cancelled = false;
    (async () => {
      try {
        const shopData = await apiRequest('/shops/me');
        if (cancelled) return;
        setShop(shopData);
        setIsLoaded(true);
        try {
          localStorage.setItem('ray_merchant_shop_cache', JSON.stringify(shopData));
        } catch {}
      } catch {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('merchant-modules-changed', handleModulesChanged);
    };
  }, []);

  const { enabledFeatures, enabledModulesSet, hasExplicitConfig } = useMemo(() => {
    const savedFeatures = shop?.layoutConfig?.enabledFeatures;
    const explicitModules =
      shop?.builderConfig?.enabledModules ||
      shop?.layoutConfig?.enabledModules ||
      shop?.enabledModules;

    const hasFeatures =
      savedFeatures && typeof savedFeatures === 'object' && Object.keys(savedFeatures).length > 0;
    const hasModules = Array.isArray(explicitModules) && explicitModules.length > 0;
    const hasConfig = Boolean(hasFeatures || hasModules);

    const modSet = new Set<string>();
    if (hasModules) {
      explicitModules.forEach((m) => {
        const norm = (MODULE_ALIASES[m.toLowerCase()] || m).toLowerCase();
        modSet.add(norm);
      });
    }
    if (hasFeatures) {
      Object.keys(savedFeatures).forEach((k) => {
        const norm = (MODULE_ALIASES[k.toLowerCase()] || k).toLowerCase();
        modSet.add(norm);
      });
    }

    const featureMap: Record<string, Set<string>> = {};
    if (hasFeatures) {
      for (const [k, v] of Object.entries(savedFeatures)) {
        const norm = (MODULE_ALIASES[k.toLowerCase()] || k).toLowerCase();
        if (Array.isArray(v)) {
          featureMap[norm] = new Set(v.map((f) => String(f).toLowerCase()));
        }
      }
    } else if (!hasConfig && isLoaded) {
      // Only for genuinely unconfigured shops that have completed loading
      for (const [k, v] of Object.entries(DEFAULT_FEATURES)) {
        featureMap[k.toLowerCase()] = new Set(v.map((f) => String(f).toLowerCase()));
      }
    }

    return {
      enabledFeatures: featureMap,
      enabledModulesSet: modSet,
      hasExplicitConfig: hasConfig,
    };
  }, [shop, isLoaded]);

  const visibleSections: SidebarSection[] = useMemo(() => {
    const base = HIDE_UNPUBLISHED
      ? sidebarSections
          .filter((section) => section.published !== false)
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.published !== false),
          }))
          .filter((section) => section.items.length > 0)
      : sidebarSections;

    // While loading without any cache or explicit config, keep it minimal (core only)
    if (!isLoaded && !hasExplicitConfig) {
      return base.filter((s) => s.id === 'dashboard' || s.id === 'settings');
    }

    return base
      .map((section) => {
        // Core dashboard section is always available
        if (section.id === 'dashboard') return section;

        // Settings section: always available, but only show sub-items for enabled modules!
        if (section.id === 'settings') {
          if (!hasExplicitConfig) return section;
          const items = section.items.filter((item) => {
            const reqMod = SETTINGS_ITEM_MODULES[item.id];
            if (!reqMod) return true; // core items like overview, store
            const norm = (MODULE_ALIASES[reqMod.toLowerCase()] || reqMod).toLowerCase();
            return enabledModulesSet.has(norm) || Boolean(enabledFeatures[norm]);
          });
          return { ...section, items };
        }

        if (!section.moduleId) return section;

        const moduleId = (
          MODULE_ALIASES[section.moduleId.toLowerCase()] || section.moduleId
        ).toLowerCase();

        // If the merchant configured their modules during signup, ONLY show enabled modules!
        if (hasExplicitConfig) {
          const isModEnabled =
            enabledModulesSet.has(moduleId) || Boolean(enabledFeatures[moduleId]);
          if (!isModEnabled) {
            return null;
          }
        }

        const activeFeatures = enabledFeatures[moduleId];
        // If features are configured for this module, filter items accordingly;
        // if no specific sub-features are restricted, show all items for this enabled module.
        const items = section.items.filter((item) => {
          // If subscriptions is unenabled, hide subscription item
          if (item.id === 'subscriptions' || item.id === 'sales_subscriptions') {
            if (
              hasExplicitConfig &&
              !enabledModulesSet.has('subscriptions') &&
              !enabledFeatures['subscriptions']
            ) {
              return false;
            }
          }

          const isSettings =
            item.id.toLowerCase().endsWith('settings') || item.href.includes('/dashboard/settings');
          if (isSettings) {
            for (const [mod, tab] of Object.entries(SETTINGS_TAB_MODULES)) {
              if (item.href.includes(`tab=${tab}`) || item.id.toLowerCase().includes(mod)) {
                const norm = (MODULE_ALIASES[mod.toLowerCase()] || mod).toLowerCase();
                if (hasExplicitConfig && !enabledModulesSet.has(norm) && !enabledFeatures[norm]) {
                  return false;
                }
              }
            }
            return true;
          }
          if (!activeFeatures || activeFeatures.size === 0) return true;
          const featureId = (FEATURE_ALIASES[item.id] || item.id).toLowerCase();
          return activeFeatures.has(featureId);
        });

        if (items.length === 0) return null;
        return { ...section, items };
      })
      .filter((section): section is SidebarSection => Boolean(section));
  }, [enabledFeatures, enabledModulesSet, hasExplicitConfig, isLoaded]);

  return visibleSections;
}
