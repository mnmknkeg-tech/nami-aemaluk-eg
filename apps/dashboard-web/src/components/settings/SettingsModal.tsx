'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import {
  X,
  Maximize2,
  Settings as SettingsIcon,
  Save,
  Loader2,
  ChevronLeft,
  Search,
  User,
  LayoutDashboard,
  Shield,
  Store,
  LayoutGrid,
  Puzzle,
  ShoppingCart,
  Calculator,
  Package,
  CalendarDays,
  Building2,
  Receipt,
  CreditCard,
  Landmark,
  Users,
  Headset,
  Briefcase,
  Bell,
  Share2,
  BarChart3,
} from 'lucide-react';
import { useSettingsModal, parseSettingsHref } from '@/hooks/useSettingsModal';
import { useToast } from './ToastProvider';

// ─── Tab components ──────────────────────────────────────────────────────────
import OverviewTab from './tabs/OverviewTab';
import AccountTab from './tabs/AccountTab';
import SecurityTab from './tabs/SecurityTab';
import StoreTab from './tabs/StoreTab';
import BookingSettingsTab from './tabs/BookingSettingsTab';
import OrdersSettingsTab from './tabs/OrdersSettingsTab';
import PosSettingsTab from './tabs/PosSettingsTab';
import ModulesTab from './tabs/ModulesTab';
import AppsTab from './tabs/AppsTab';
import ReceiptThemeTab from './tabs/ReceiptThemeTab';
import PaymentsTab from './tabs/PaymentsTab';
import SocialMediaTab from './tabs/SocialMediaTab';
import NotificationsTab from './tabs/NotificationsTab';
import InventorySettingsTab from './tabs/InventorySettingsTab';
import BranchesSettingsTab from './tabs/BranchesSettingsTab';
import AccountingSettingsTab from './tabs/AccountingSettingsTab';
import CustomersSettingsTab from './tabs/CustomersSettingsTab';
import CrmSettingsTab from './tabs/CrmSettingsTab';
import HrSettingsTab from './tabs/HrSettingsTab';
import AnalyticsSettingsTab from './tabs/AnalyticsSettingsTab';
import { apiRequest } from '@/lib/auth';
import { isModuleEnabled } from '@/hooks/useModuleGuard';

export const TAB_MODULE_MAP: Record<string, string> = {
  booking_settings: 'bookings',
  orders_settings: 'sales',
  pos_settings: 'pos',
  inventory_settings: 'inventory',
  branches_settings: 'branches',
  accounting_settings: 'accounting',
  crm_settings: 'crm',
  customers_settings: 'customers',
  hr_settings: 'hr',
  analytics_settings: 'analytics',
};

// ─── Tab Categories (matching Salla-style inner sidebar) ─────────────────────
const SETTINGS_CATEGORIES = [
  {
    id: 'account',
    title: 'الحساب',
    tabs: [
      { id: 'account', label: 'ملفك الشخصي', icon: User },
      { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
      { id: 'security', label: 'الأمان والمصادقة', icon: Shield },
      { id: 'store', label: 'خطة وإعدادات المتجر', icon: Store },
      { id: 'modules', label: 'إدارة الوحدات', icon: LayoutGrid },
      { id: 'apps', label: 'التطبيقات والربط', icon: Puzzle },
    ],
  },
  {
    id: 'sales_operations',
    title: 'المبيعات والعمليات',
    tabs: [
      { id: 'orders_settings', label: 'إعدادات الطلبات', icon: ShoppingCart },
      { id: 'pos_settings', label: 'نقطة البيع (الكاشير)', icon: Calculator },
      { id: 'inventory_settings', label: 'الجرد والمخزون', icon: Package },
      { id: 'booking_settings', label: 'الحجوزات والمواعيد', icon: CalendarDays },
      { id: 'branches_settings', label: 'إدارة الفروع', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    title: 'المالية والفوترة',
    tabs: [
      { id: 'receipt_theme', label: 'قالب الفاتورة والإيصال', icon: Receipt },
      { id: 'payments', label: 'بوابات وطرق الدفع', icon: CreditCard },
      { id: 'accounting_settings', label: 'إعدادات المحاسبة', icon: Landmark },
    ],
  },
  {
    id: 'customers_team',
    title: 'العملاء والفريق',
    tabs: [
      { id: 'customers_settings', label: 'إعدادات العملاء', icon: Users },
      { id: 'crm_settings', label: 'خدمة العملاء (CRM)', icon: Headset },
      { id: 'hr_settings', label: 'إدارة الفريق والموظفين', icon: Briefcase },
    ],
  },
  {
    id: 'preferences',
    title: 'التفضيلات والتسويق',
    tabs: [
      { id: 'notifications', label: 'تنبيهات الإشعارات', icon: Bell },
      { id: 'social_media', label: 'منصات التواصل', icon: Share2 },
      { id: 'analytics_settings', label: 'إعدادات التحليلات', icon: BarChart3 },
    ],
  },
];

const ALL_TABS = SETTINGS_CATEGORIES.flatMap((c) => c.tabs);
const TAB_LOOKUP: Record<string, { label: string; icon: any }> = Object.fromEntries(
  ALL_TABS.map((t) => [t.id, { label: t.label, icon: t.icon }])
);

type SaveHandler = () => Promise<boolean>;

export default function SettingsModal() {
  const pathname = usePathname();
  const { state, openModal, setTab, closeModal, expandToPage } = useSettingsModal();
  const { toast } = useToast();

  const [shop, setShop] = useState<any>(null);
  const [loadingShop, setLoadingShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [sectionChangeCounts, setSectionChangeCounts] = useState<Record<string, number>>({});
  const sectionChangeCountsRef = useRef<Record<string, number>>({});
  const saveHandlersRef = useRef<Record<string, SaveHandler>>({});
  const [saving, setSaving] = useState(false);

  const changesCount = Object.values(sectionChangeCounts).reduce(
    (sum, n) => sum + (Number.isFinite(n) ? Number(n) : 0),
    0
  );

  // ── Fetch shop data on open ────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open || shop) return;
    setLoadingShop(true);
    apiRequest('/shops/me')
      .then((data) => setShop(data))
      .catch(() => {})
      .finally(() => setLoadingShop(false));
  }, [state.open, shop]);

  // ── Reset changes on tab switch ───────────────────────────────────────────
  useEffect(() => {
    setSectionChangeCounts({});
    sectionChangeCountsRef.current = {};
  }, [state.tab]);

  useEffect(() => {
    sectionChangeCountsRef.current = sectionChangeCounts;
  }, [sectionChangeCounts]);

  // ── Window save events ────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open) return;

    const onChanges = (e: any) => {
      const sectionId = String(e?.detail?.sectionId || '').trim();
      if (!sectionId) return;
      const count = Number.isFinite(Number(e?.detail?.count))
        ? Math.max(0, Math.floor(Number(e?.detail?.count)))
        : 0;
      setSectionChangeCounts((prev) =>
        Number(prev[sectionId] ?? 0) === count ? prev : { ...prev, [sectionId]: count }
      );
    };

    const onRegister = (e: any) => {
      const sectionId = String(e?.detail?.sectionId || '').trim();
      const handler = e?.detail?.handler;
      if (!sectionId || typeof handler !== 'function') return;
      saveHandlersRef.current[sectionId] = handler as SaveHandler;
    };

    const onSaveRequest = async () => {
      const snapshot = sectionChangeCountsRef.current || {};
      const ids = Object.keys(snapshot).filter((k) => Number(snapshot[k] || 0) > 0);
      if (ids.length === 0) {
        toast({ title: 'لا توجد تغييرات', description: 'لم تقم بأي تعديلات بعد' });
        return;
      }
      setSaving(true);
      let okAll = true;
      const failedIds: string[] = [];
      for (const id of ids) {
        const fn = saveHandlersRef.current[id];
        if (!fn) {
          okAll = false;
          failedIds.push(id);
          continue;
        }
        try {
          const ok = await fn();
          if (!ok) {
            okAll = false;
            failedIds.push(id);
          }
        } catch {
          okAll = false;
          failedIds.push(id);
        }
      }
      if (okAll) {
        sectionChangeCountsRef.current = {};
        setSectionChangeCounts({});
      }
      setSaving(false);
      toast(
        okAll
          ? { title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' }
          : {
              title: 'فشل الحفظ',
              description: `تعذر حفظ: ${failedIds.join(' | ')}`,
              variant: 'destructive',
            }
      );
    };

    window.addEventListener('merchant-settings-section-changes', onChanges as any);
    window.addEventListener('merchant-settings-register-save-handler', onRegister as any);
    window.addEventListener('merchant-settings-save-request', onSaveRequest as any);
    return () => {
      window.removeEventListener('merchant-settings-section-changes', onChanges as any);
      window.removeEventListener('merchant-settings-register-save-handler', onRegister as any);
      window.removeEventListener('merchant-settings-save-request', onSaveRequest as any);
    };
  }, [state.open, toast]);

  // ── Escape key ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.open, closeModal]);

  // ── Global interception of settings links ────────────────────────────────
  // Crucial: If already on /dashboard/settings, NEVER intercept!
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const isAlreadyOnFullSettings =
        pathname === '/dashboard/settings' || pathname?.startsWith('/dashboard/settings');
      if (isAlreadyOnFullSettings) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      if (href.startsWith('/dashboard/settings')) {
        if (
          anchor.getAttribute('data-full-settings') === 'true' ||
          anchor.closest('[data-settings-modal="true"]')
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const { tab, from } = parseSettingsHref(href);
        openModal(tab, from);
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [pathname, openModal]);

  const handleSaveAll = useCallback(() => {
    try {
      window.dispatchEvent(new Event('merchant-settings-save-request'));
    } catch {}
  }, []);

  const handleSaved = useCallback(() => {
    apiRequest('/shops/me')
      .then((data) => setShop(data))
      .catch(() => {});
  }, []);

  // ── Auto-fallback if active tab requires an unenabled module ─────────────
  useEffect(() => {
    if (!shop) return;
    const reqMod = TAB_MODULE_MAP[state.tab];
    if (reqMod && !isModuleEnabled(shop, reqMod)) {
      setTab('overview');
    }
  }, [shop, state.tab, setTab]);

  // ── Filtered sidebar categories based on module enablement + search ────────
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return SETTINGS_CATEGORIES.map((cat) => {
      // Exclude tabs belonging to modules this merchant hasn't enabled
      const availableTabs = cat.tabs.filter((t) => {
        const reqMod = TAB_MODULE_MAP[t.id];
        if (reqMod && !isModuleEnabled(shop, reqMod)) {
          return false;
        }
        return true;
      });

      if (!query) return { ...cat, tabs: availableTabs };

      return {
        ...cat,
        tabs: availableTabs.filter(
          (t) => t.label.toLowerCase().includes(query) || cat.title.toLowerCase().includes(query)
        ),
      };
    }).filter((cat) => cat.tabs.length > 0);
  }, [searchQuery, shop]);

  const currentTabMeta = TAB_LOOKUP[state.tab] || { label: 'الإعدادات', icon: SettingsIcon };
  const CurrentIcon = currentTabMeta.icon;

  // ── Render tab component ──────────────────────────────────────────────────
  const renderTabContent = () => {
    if (loadingShop) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="w-9 h-9 border-3 border-slate-200 border-t-[#00B4D8] rounded-full animate-spin" />
        </div>
      );
    }
    if (!shop) {
      return (
        <div className="p-8 text-center text-sm text-slate-400 font-bold">
          تعذر تحميل بيانات المتجر
        </div>
      );
    }
    const commonProps = { shop, onSaved: handleSaved };
    const handleOverviewTabSelect = (tab: string) => {
      setTab(tab);
    };

    const activeReqMod = TAB_MODULE_MAP[state.tab];
    if (activeReqMod && !isModuleEnabled(shop, activeReqMod)) {
      return <OverviewTab shop={shop} onSelectTab={handleOverviewTabSelect} />;
    }

    switch (state.tab) {
      case 'overview':
        return <OverviewTab shop={shop} onSelectTab={handleOverviewTabSelect} />;
      case 'account':
        return <AccountTab {...commonProps} />;
      case 'security':
        return <SecurityTab {...commonProps} />;
      case 'store':
        return <StoreTab {...commonProps} />;
      case 'booking_settings':
        return <BookingSettingsTab {...commonProps} />;
      case 'orders_settings':
        return <OrdersSettingsTab {...commonProps} />;
      case 'pos_settings':
        return <PosSettingsTab {...commonProps} />;
      case 'inventory_settings':
        return <InventorySettingsTab {...commonProps} />;
      case 'branches_settings':
        return <BranchesSettingsTab {...commonProps} />;
      case 'accounting_settings':
        return <AccountingSettingsTab {...commonProps} />;
      case 'customers_settings':
        return <CustomersSettingsTab {...commonProps} />;
      case 'crm_settings':
        return <CrmSettingsTab {...commonProps} />;
      case 'hr_settings':
        return <HrSettingsTab {...commonProps} />;
      case 'analytics_settings':
        return <AnalyticsSettingsTab {...commonProps} />;
      case 'modules':
        return <ModulesTab {...commonProps} />;
      case 'apps':
        return <AppsTab {...commonProps} />;
      case 'receipt_theme':
        return <ReceiptThemeTab shop={shop} />;
      case 'payments':
        return <PaymentsTab {...commonProps} />;
      case 'social_media':
        return <SocialMediaTab {...commonProps} />;
      case 'notifications':
        return <NotificationsTab shop={shop} />;
      default:
        return <OverviewTab shop={shop} onSelectTab={handleOverviewTabSelect} />;
    }
  };

  return (
    <AnimatePresence>
      {state.open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 overflow-hidden"
          dir="rtl"
        >
          {/* Backdrop overlay */}
          <motion.div
            key="settings-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Centered Modal Window */}
          <motion.div
            key="settings-modal-window"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-full max-w-5xl h-[88vh] max-h-[780px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden"
            data-settings-modal="true"
          >
            {/* ── Inner Sidebar (Right side in RTL) ── */}
            <div className="w-full md:w-64 lg:w-72 bg-slate-50/80 border-b md:border-b-0 md:border-l border-slate-100 flex flex-col shrink-0">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-100/80 bg-white/60 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7]">
                    <SettingsIcon size={16} />
                  </div>
                  <h2 className="text-sm font-black text-slate-800">الإعدادات</h2>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="إعدادات البحث..."
                    className="w-full bg-white border border-slate-200/80 rounded-xl py-2 pr-9 pl-3 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar Tabs List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-4 text-right">
                {filteredCategories.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-bold">
                    لا توجد نتائج مطابقة
                  </div>
                ) : (
                  filteredCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {cat.title}
                      </div>
                      <div className="space-y-0.5">
                        {cat.tabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const active = state.tab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setTab(tab.id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-right ${
                                active
                                  ? 'bg-[#0284C7]/10 text-[#0284C7] font-black shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
                              }`}
                            >
                              <TabIcon
                                size={15}
                                className={`shrink-0 ${
                                  active ? 'text-[#0284C7]' : 'text-slate-400'
                                }`}
                              />
                              <span className="flex-1 truncate">{tab.label}</span>
                              {active && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Main Content Area (Left side in RTL) ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Modal Top Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                    <CurrentIcon size={17} />
                  </div>
                  <div>
                    <h1 className="text-sm md:text-base font-black text-slate-900 truncate">
                      {currentTabMeta.label}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      تعديل الإعدادات والخيارات لهذا القسم
                    </p>
                  </div>
                </div>

                {/* Top Action Controls (Maximize & Close) */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={expandToPage}
                    title="تكبير إلى صفحة كاملة"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
                  >
                    <Maximize2 size={15} />
                  </button>
                  <button
                    onClick={closeModal}
                    title="إغلاق"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Scrollable Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 overscroll-contain">
                {renderTabContent()}
              </div>

              {/* Modal Bottom Footer */}
              <div className="shrink-0 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between gap-3 bg-slate-50/80">
                <button
                  onClick={expandToPage}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>فتح في الصفحة الموحدة</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSaveAll}
                  disabled={saving || changesCount <= 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                    saving || changesCount <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white hover:opacity-90 shadow-sm shadow-[#0284C7]/20'
                  }`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>حفظ التغييرات</span>
                  {changesCount > 0 && (
                    <span className="bg-white text-[#0284C7] rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shadow-xs">
                      {changesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
