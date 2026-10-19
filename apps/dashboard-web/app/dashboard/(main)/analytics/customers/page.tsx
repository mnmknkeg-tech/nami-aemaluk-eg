'use client';

/**
 * العملاء والنمو — تحليلات حقيقية في هيكل الصفحات الموحّد (InventoryPage):
 * رؤى العملاء • الزوار • التحويل • التفاعل • التسويق — كلها من
 * /customer-insights و /traffic و /conversions. التاب النشط متزامن مع ?tab=.
 */
import React, { Suspense, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Download } from 'lucide-react';
import { InventoryPage, InvToolButton } from '@/components/inventory/InventoryShell';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PERIOD_OPTIONS, type PeriodKey } from '@/components/analytics/sections/financeShared';
import CustomerInsightsSection from '@/components/analytics/sections/CustomerInsightsSection';
import VisitorsSection from '@/components/analytics/sections/VisitorsSection';
import ConversionsSection from '@/components/analytics/sections/ConversionsSection';
import EngagementSection from '@/components/analytics/sections/EngagementSection';
import MarketingSection from '@/components/analytics/sections/MarketingSection';

const TABS = [
  { id: 'insights', label: 'رؤى العملاء' },
  { id: 'visitors', label: 'الزوار' },
  { id: 'conversions', label: 'التحويل' },
  { id: 'engagement', label: 'التفاعل' },
  { id: 'marketing', label: 'التسويق' },
];

function CustomersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('tab') || '';
  const activeTab = TABS.some((t) => t.id === requested) ? requested : 'insights';

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [exportFn, setExportFn] = useState<(() => void) | null>(null);

  /** يسجّله التاب النشط عندما تتوفر بيانات جدولية للتصدير */
  const registerExport = useCallback((fn: (() => void) | null) => setExportFn(() => fn), []);

  const changeTab = (id: string) => {
    if (id === activeTab) return;
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
    setSearch('');
    setExportFn(null);
  };

  const refresh = () => {
    setExportFn(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <InventoryPage
      title="العملاء والنمو"
      subtitle="رؤى العملاء والزوار والتحويل والتفاعل والتسويق — حسب الفترة"
      actions={
        <>
          <InvToolButton primary onClick={refresh}>
            <RefreshCw size={14} /> تحديث
          </InvToolButton>
          {exportFn && (
            <InvToolButton onClick={exportFn}>
              <Download size={14} /> تصدير CSV
            </InvToolButton>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={changeTab}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="بحث…"
      filters={
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as PeriodKey);
            setExportFn(null);
          }}
          className="h-9 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none"
          title="فترة التحليلات"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      }
    >
      {activeTab === 'insights' && (
        <CustomerInsightsSection
          key={`insights-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
      {activeTab === 'visitors' && (
        <VisitorsSection
          key={`visitors-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
      {activeTab === 'conversions' && (
        <ConversionsSection
          key={`conversions-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
      {activeTab === 'engagement' && (
        <EngagementSection
          key={`engagement-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
      {activeTab === 'marketing' && (
        <MarketingSection
          key={`marketing-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
    </InventoryPage>
  );
}

export default function AnalyticsCustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <CustomersContent />
    </Suspense>
  );
}
