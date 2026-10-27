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

/**
 * Shared section-visibility logic used by both the classic Sidebar and the
 * TopNav header: strictly respects the modules and features chosen by the merchant.
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
    } else if (!hasConfig) {
      // New or unconfigured shop: use standard defaults
      for (const [k, v] of Object.entries(DEFAULT_FEATURES)) {
        featureMap[k.toLowerCase()] = new Set(v.map((f) => String(f).toLowerCase()));
      }
    }

    return {
      enabledFeatures: featureMap,
      enabledModulesSet: modSet,
      hasExplicitConfig: hasConfig,
    };
  }, [shop]);

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

    return base
      .map((section) => {
        // Core sections that are always available
        if (section.id === 'dashboard' || section.id === 'settings') return section;
        if (section.id === 'analytics') return section;

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
          const isSettings =
            item.id.toLowerCase().endsWith('settings') || item.href.includes('/dashboard/settings');
          if (isSettings) return true;
          if (!activeFeatures || activeFeatures.size === 0) return true;
          const featureId = (FEATURE_ALIASES[item.id] || item.id).toLowerCase();
          return activeFeatures.has(featureId);
        });

        if (items.length === 0) return null;
        return { ...section, items };
      })
      .filter((section): section is SidebarSection => Boolean(section));
  }, [enabledFeatures, enabledModulesSet, hasExplicitConfig]);

  return visibleSections;
}
