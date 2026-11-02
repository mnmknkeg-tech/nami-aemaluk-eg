'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Settings as SettingsIcon, Loader2, Save } from 'lucide-react';
import { useToast } from './ToastProvider';

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
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import BranchesSettingsTab from './tabs/BranchesSettingsTab';
import AccountingSettingsTab from './tabs/AccountingSettingsTab';
import CustomersSettingsTab from './tabs/CustomersSettingsTab';
import CrmSettingsTab from './tabs/CrmSettingsTab';
import HrSettingsTab from './tabs/HrSettingsTab';
import AnalyticsSettingsTab from './tabs/AnalyticsSettingsTab';
import { isModuleEnabled } from '@/hooks/useModuleGuard';
import { TAB_MODULE_MAP } from './SettingsModal';

type SettingsTab =
  | 'overview'
  | 'account'
  | 'security'
  | 'store'
  | 'modules'
  | 'apps'
  | 'receipt_theme'
  | 'payments'
  | 'notifications'
  | 'booking_settings'
  | 'orders_settings'
  | 'pos_settings'
  | 'social_media'
  | 'inventory_settings'
  | 'branches_settings'
  | 'accounting_settings'
  | 'customers_settings'
  | 'crm_settings'
  | 'hr_settings'
  | 'analytics_settings';

type SaveHandler = () => Promise<boolean>;

const SETTINGS_CONTEXT: Record<string, string> = {
  dashboard: 'إعدادات لوحة التحكم والإشعارات',
  website: 'إعدادات الموقع والمتجر',
  sales: 'إعدادات الطلبات والمبيعات',
  pos: 'إعدادات الكاشير ونقاط البيع',
  inventory: 'إعدادات المخزون والوحدات',
  branches: 'إعدادات الفروع والمتجر',
  finance: 'إعدادات المدفوعات والمالية',
  accounting: 'إعدادات المحاسبة والمدفوعات',
  marketing: 'إعدادات التسويق والتواصل',
  customers: 'إعدادات العملاء والإشعارات',
  crm: 'إعدادات خدمة العملاء والإشعارات',
  bookings: 'إعدادات الحجوزات',
  hr: 'إعدادات الفريق والصلاحيات',
  analytics: 'إعدادات التحليلات والتقارير',
  ai: 'إعدادات التطبيقات والذكاء الاصطناعي',
};

const ALLOWED_TABS = new Set<SettingsTab>([
  'overview',
  'store',
  'inventory_settings',
  'branches_settings',
  'accounting_settings',
  'customers_settings',
  'crm_settings',
  'hr_settings',
  'analytics_settings',
  'booking_settings',
  'orders_settings',
  'pos_settings',
  'payments',
  'receipt_theme',
  'account',
  'security',
  'notifications',
  'social_media',
  'modules',
  'apps',
]);

interface SettingsShellProps {
  shop: any;
  onSaved: () => void;
}

export default function SettingsShell({ shop, onSaved }: SettingsShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const requestedTab = String(searchParams?.get('tab') || '')
    .trim()
    .toLowerCase() as SettingsTab;
  // Market-launch switch: local-only settings tabs fall back to overview in production.
  const LOCAL_ONLY_TABS: ReadonlySet<string> = new Set([
    'accounting_settings',
    'hr_settings',
    'analytics_settings',
    // Payment gateways are deferred (cash-on-delivery only at launch), so the
    // finance/payments tab is local-only as well.
    'payments',
  ]);
  const reqMod = TAB_MODULE_MAP[requestedTab];
  const isReqModAllowed = !reqMod || isModuleEnabled(shop, reqMod);
  const safeRequestedTab =
    (HIDE_UNPUBLISHED && LOCAL_ONLY_TABS.has(requestedTab)) || !isReqModAllowed
      ? 'overview'
      : requestedTab;
  const activeTab: SettingsTab = ALLOWED_TABS.has(safeRequestedTab) ? safeRequestedTab : 'overview';
  const settingsContext =
    SETTINGS_CONTEXT[
      String(searchParams?.get('from') || '')
        .trim()
        .toLowerCase()
    ];

  const [sectionChangeCounts, setSectionChangeCounts] = useState<Record<string, number>>({});
  const sectionChangeCountsRef = useRef<Record<string, number>>({});
  const saveHandlersRef = useRef<Record<string, SaveHandler>>({});
  const [saving, setSaving] = useState(false);

  const changesCount = Object.values(sectionChangeCounts).reduce(
    (sum, n) => sum + (Number.isFinite(n) ? Number(n) : 0),
    0
  );

  useEffect(() => {
    sectionChangeCountsRef.current = sectionChangeCounts;
  }, [sectionChangeCounts]);

  // Listen for section changes and save handler registrations
  useEffect(() => {
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
              description: `تعذر حفظ بعض الأقسام: ${failedIds.join(' | ')}`,
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
  }, [toast]);

  const handleTabClick = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    router.push(`/dashboard/settings?${params.toString()}`);
  };

  const handleSaveAll = () => {
    try {
      window.dispatchEvent(new Event('merchant-settings-save-request'));
    } catch {}
  };

  const renderTabContent = (tabId: SettingsTab) => {
    switch (tabId) {
      case 'overview':
        return <OverviewTab shop={shop} onSelectTab={handleTabClick} />;
      case 'account':
        return <AccountTab shop={shop} onSaved={onSaved} />;
      case 'security':
        return <SecurityTab shop={shop} onSaved={onSaved} />;
      case 'store':
        return <StoreTab shop={shop} onSaved={onSaved} />;
      case 'booking_settings':
        return <BookingSettingsTab shop={shop} onSaved={onSaved} />;
      case 'orders_settings':
        return <OrdersSettingsTab shop={shop} onSaved={onSaved} />;
      case 'pos_settings':
        return <PosSettingsTab shop={shop} onSaved={onSaved} />;
      case 'inventory_settings':
        return <InventorySettingsTab shop={shop} onSaved={onSaved} />;
      case 'branches_settings':
        return <BranchesSettingsTab shop={shop} onSaved={onSaved} />;
      case 'accounting_settings':
        return <AccountingSettingsTab shop={shop} onSaved={onSaved} />;
      case 'customers_settings':
        return <CustomersSettingsTab shop={shop} onSaved={onSaved} />;
      case 'crm_settings':
        return <CrmSettingsTab shop={shop} onSaved={onSaved} />;
      case 'hr_settings':
        return <HrSettingsTab shop={shop} onSaved={onSaved} />;
      case 'analytics_settings':
        return <AnalyticsSettingsTab shop={shop} onSaved={onSaved} />;
      case 'modules':
        return <ModulesTab shop={shop} onSaved={onSaved} />;
      case 'apps':
        return <AppsTab shop={shop} onSaved={onSaved} />;
      case 'receipt_theme':
        return <ReceiptThemeTab shop={shop} />;
      case 'payments':
        return <PaymentsTab shop={shop} onSaved={onSaved} />;
      case 'social_media':
        return <SocialMediaTab shop={shop} onSaved={onSaved} />;
      case 'notifications':
        return <NotificationsTab shop={shop} />;
      default:
        return <OverviewTab shop={shop} onSelectTab={handleTabClick} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#00B4D8] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#0284C7]/20">
            <SettingsIcon size={24} className="text-white" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الإعدادات</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">
              إدارة بيانات المتجر، الحجوزات، الطلبات ونقاط البيع
            </p>
            {settingsContext && (
              <p className="inline-flex mt-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {settingsContext}
              </p>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveAll}
          disabled={saving || changesCount <= 0}
          className={`relative px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
            saving || changesCount <= 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white hover:opacity-90 shadow-md shadow-[#0284C7]/25'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>حفظ الإعدادات</span>
          {changesCount > 0 && (
            <span className="bg-white text-[#0284C7] rounded-full px-2 py-0.5 text-[10px] font-black shadow-xs">
              {changesCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        {renderTabContent(activeTab)}
      </div>
    </div>
  );
}
