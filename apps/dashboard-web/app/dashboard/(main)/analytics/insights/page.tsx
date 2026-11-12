'use client';

/**
 * المؤشرات والرسوم — صفحة تحليلات على هيكل InventoryPage الموحّد (نفس نمط صفحة المالية):
 * هيدر أبيض (عنوان + وصف يمين، تحديث + تصدير CSV يسار)
 * ← بطاقة تابات (?tab= متزامن مع الرابط) وفلتر الفترة الزمنية
 * ← محتوى التاب النشط (KpiSection / ChartsSection).
 */
import React, { Suspense, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';
import { InventoryPage, InvToolButton } from '@/components/inventory/InventoryShell';
import { PERIOD_OPTIONS, type PeriodKey } from '@/components/analytics/sections/financeShared';
import KpiSection from '@/components/analytics/sections/KpiSection';
import ChartsSection from '@/components/analytics/sections/ChartsSection';

const TABS = [
  { id: 'kpi', label: 'المؤشرات (KPIs)' },
  { id: 'charts', label: 'الرسوم البيانية' },
];

function InsightsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get('tab') || '';
  const activeTab = TABS.some((t) => t.id === requested) ? requested : 'kpi';

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportFn, setExportFn] = useState<(() => void) | null>(null);

  /** يسجّله التاب النشط عندما تتوفر بيانات جدولية للتصدير */
  const registerExport = useCallback((fn: (() => void) | null) => setExportFn(() => fn), []);

  const changeTab = (id: string) => {
    if (id === activeTab) return;
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
    setExportFn(null);
  };

  /** تحديث — يزيد المفتاح فتُعاد تركيب/جلب بيانات التاب النشط */
  const refresh = () => {
    setExportFn(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <InventoryPage
      title="المؤشرات والرسوم"
      subtitle="مؤشرات أداء المتجر والرسوم البيانية — حسب الفترة"
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
      {activeTab === 'charts' ? (
        <ChartsSection
          key={`charts-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      ) : (
        <KpiSection
          key={`kpi-${refreshKey}`}
          period={period}
          refreshKey={refreshKey}
          registerExport={registerExport}
        />
      )}
    </InventoryPage>
  );
}

export default function AnalyticsInsightsPage() {
  /* useSearchParams تتطلب Suspense فوق مكوّن الصفحة */
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <InsightsContent />
    </Suspense>
  );
}
