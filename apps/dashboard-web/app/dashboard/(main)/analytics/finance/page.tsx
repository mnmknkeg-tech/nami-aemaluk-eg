'use client';

/**
 * المالية والمدفوعات — تحليلات حقيقية في هيكل الصفحات الموحّد (InventoryPage):
 * تاب «المالية»: مؤشرات + إيرادات مقابل مصروفات + صافي الربح + المصروفات حسب التصنيف.
 * تاب «المدفوعات»: مؤشرات + طرق الدفع + حركة المعاملات + جدول المعاملات مع بحث.
 * التاب النشط متزامن مع ?tab= في الرابط، والفترة فلاتر استعلام التقرير.
 */
import React, { Suspense, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw, Download } from 'lucide-react';
import { InventoryPage, InvToolButton } from '@/components/inventory/InventoryShell';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { PERIOD_OPTIONS, type PeriodKey } from '@/components/analytics/sections/financeShared';
import FinanceSection from '@/components/analytics/sections/FinanceSection';
import PaymentsSection from '@/components/analytics/sections/PaymentsSection';

const TABS = [
  { id: 'finance', label: 'المالية' },
  { id: 'payments', label: 'المدفوعات' },
];

function FinanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('tab') || '';
  const activeTab = TABS.some((t) => t.id === requested) ? requested : 'finance';

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
      title="المالية والمدفوعات"
      subtitle="الإيرادات والأرباح والتدفق النقدي وطرق الدفع — حسب الفترة"
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
      search={activeTab === 'payments' ? search : undefined}
      onSearchChange={setSearch}
      searchPlaceholder="بحث في المعاملات بالوصف أو المحفظة أو المبلغ…"
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
      {activeTab === 'payments' ? (
        <PaymentsSection
          key={`payments-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
          searchQuery={debouncedSearch}
        />
      ) : (
        <FinanceSection
          key={`finance-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
    </InventoryPage>
  );
}

export default function AnalyticsFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <FinanceContent />
    </Suspense>
  );
}
