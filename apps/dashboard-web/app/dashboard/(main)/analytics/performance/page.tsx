'use client';

/**
 * المبيعات والمنتجات — تحليلات حقيقية في هيكل الصفحات الموحّد (InventoryPage):
 * تاب «أداء المبيعات»: مؤشرات مجمعة + تطور الإيراد + قائمة المؤشرات.
 * تاب «أداء المنتجات»: مؤشرات + أعلى المنتجات إيرادًا + جدول الترتيب.
 * التاب النشط متزامن مع ?tab= في الرابط، والفترة فلاتر التحليل.
 */
import React, { Suspense, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Download } from 'lucide-react';
import { InventoryPage, InvToolButton } from '@/components/inventory/InventoryShell';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PERIOD_OPTIONS, type PeriodKey } from '@/components/analytics/sections/financeShared';
import SalesPerformanceSection from '@/components/analytics/sections/SalesPerformanceSection';
import ProductPerformanceSection from '@/components/analytics/sections/ProductPerformanceSection';

const TABS = [
  { id: 'sales', label: 'أداء المبيعات' },
  { id: 'products', label: 'أداء المنتجات' },
];

function PerformanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('tab') || '';
  const activeTab = TABS.some((t) => t.id === requested) ? requested : 'sales';

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
      title="المبيعات والمنتجات"
      subtitle="أداء المبيعات وأداء المنتجات — حسب الفترة"
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
      searchPlaceholder={activeTab === 'products' ? 'بحث بالمنتج أو الفئة…' : 'بحث عن مؤشر…'}
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
      {activeTab === 'products' ? (
        <ProductPerformanceSection
          key={`products-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      ) : (
        <SalesPerformanceSection
          key={`sales-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      )}
    </InventoryPage>
  );
}

export default function AnalyticsPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <PerformanceContent />
    </Suspense>
  );
}
