'use client';

/**
 * المخزون والعمليات — تحليلات حقيقية في هيكل الصفحات الموحّد (InventoryPage):
 * تاب «المخزون»: مؤشرات المخزون + توزيع الحالة + منتجات تحتاج إعادة تعبئة.
 * تاب «المرتجعات»: مؤشرات + مرتجعات عبر الفترة + حسب المصدر + السجل.
 * تاب «اللوجستيات»: التوصيلات وأزمنتها وحالة الطلبات + أحدث التوصيلات.
 * تاب «العمليات»: ساعات الذروة + المصادر + أيام الأسبوع + معدل الإلغاء.
 * التاب النشط متزامن مع ?tab= في الرابط، والفترة فلاتر التحليل.
 */
import React, { Suspense, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Download } from 'lucide-react';
import { InventoryPage, InvToolButton } from '@/components/inventory/InventoryShell';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PERIOD_OPTIONS, type PeriodKey } from '@/components/analytics/sections/financeShared';
import InventorySection from '@/components/analytics/sections/InventorySection';
import ReturnsSection from '@/components/analytics/sections/ReturnsSection';
import LogisticsSection from '@/components/analytics/sections/LogisticsSection';
import OperationsSection from '@/components/analytics/sections/OperationsSection';

const TABS = [
  { id: 'inventory', label: 'المخزون' },
  { id: 'returns', label: 'المرتجعات' },
  { id: 'logistics', label: 'اللوجستيات' },
  { id: 'operations', label: 'العمليات' },
];

/** التابات اللي فيها جداول تدعم البحث */
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  inventory: 'بحث في المنتجات…',
  returns: 'بحث برقم الطلب…',
  logistics: 'بحث برقم الطلب…',
};

function OperationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('tab') || '';
  const activeTab = TABS.some((t) => t.id === requested) ? requested : 'inventory';

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

  const searchPlaceholder = SEARCH_PLACEHOLDERS[activeTab];

  return (
    <InventoryPage
      title="المخزون والعمليات"
      subtitle="المخزون والمرتجعات واللوجستيات وكفاءة التشغيل — حسب الفترة"
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
      search={searchPlaceholder ? search : undefined}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
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
      {activeTab === 'returns' && (
        <ReturnsSection
          key={`returns-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      )}
      {activeTab === 'logistics' && (
        <LogisticsSection
          key={`logistics-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      )}
      {activeTab === 'operations' && (
        <OperationsSection
          key={`operations-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
      {activeTab === 'inventory' && (
        <InventorySection
          key={`inventory-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      )}
    </InventoryPage>
  );
}

export default function AnalyticsOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <OperationsContent />
    </Suspense>
  );
}
