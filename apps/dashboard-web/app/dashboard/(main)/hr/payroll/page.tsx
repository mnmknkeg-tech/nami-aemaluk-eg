'use client';

/**
 * صفحة الرواتب — سجل صرفيات رواتب الموظفين (مدفوع / معلق):
 * إضافة راتب، فلترة حسب الفترة والحالة، بحث باسم الموظف،
 * ترقيم صفحات، وتصدير CSV. نفس هيكل صفحات HR الموحدة.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Download, Plus, RefreshCw } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { downloadCsv } from '@/lib/csv';
import { createPayroll, fetchEmployees, fetchPayroll } from '@/lib/api/hr';
import type { HrEmployee, HrPayrollRecord, HrPayrollStatus } from '@/lib/api/hr';
import {
  HR_FILTER_SELECT_CLS,
  HR_INPUT_CLS,
  HrEmpty,
  HrField,
  HrModal,
  HrModalActions,
  HrPageShell,
  HrPagination,
  HrRow,
  HrStatusPill,
  HrTableCard,
  formatMoney,
} from '@/components/hr/HRShell';
import type { HrTab } from '@/components/hr/HRShell';
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';

const TODAY = new Date().toLocaleDateString('en-CA');
const NOW = new Date();
const DEFAULT_PERIOD = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;
const PER_PAGE = 25;

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

export default function PayrollPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [records, setRecords] = useState<HrPayrollRecord[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusTab, setStatusTab] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // حقول مودال إضافة راتب
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState(false);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [status, setStatus] = useState<HrPayrollStatus>('pending');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await fetchPayroll(shopId);
      setRecords(data);
      fetchEmployees(shopId).then(setEmployees).catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل سجل الرواتب');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  /* الإجماليات على كل السجلات وليس المفلترة */
  const paidTotal = useMemo(
    () => records.filter((r) => String(r.status) === 'paid').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [records]
  );
  const pendingTotal = useMemo(
    () => records.filter((r) => String(r.status) === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [records]
  );

  const periods = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.period).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [records]
  );

  const tabs: HrTab[] = useMemo(
    () => [
      { id: 'all', label: 'الكل', count: records.length },
      { id: 'paid', label: 'مدفوع', count: records.filter((r) => String(r.status) === 'paid').length },
      { id: 'pending', label: 'معلق', count: records.filter((r) => String(r.status) === 'pending').length },
    ],
    [records]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = records.filter(
      (r) =>
        (statusTab === 'all' || String(r.status) === statusTab) &&
        (periodFilter === 'all' || r.period === periodFilter) &&
        (!q || String(r.employeeName || '').toLowerCase().includes(q))
    );
    if (sort === 'amount') return [...list].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    if (sort === 'oldest')
      return [...list].sort(
        (a, b) => (a.period || '').localeCompare(b.period || '') || (a.paid_at || '').localeCompare(b.paid_at || '')
      );
    return [...list].sort(
      (a, b) => (b.period || '').localeCompare(a.period || '') || (b.paid_at || '').localeCompare(a.paid_at || '')
    );
  }, [records, statusTab, periodFilter, debouncedSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, periodFilter, sort]);

  const exportCsv = () => {
    downloadCsv(
      `payroll-${TODAY}.csv`,
      ['الموظف', 'الفترة', 'المبلغ', 'الحالة', 'صُرف في'],
      filtered.map((r) => [
        r.employeeName || '',
        r.period || '—',
        r.amount,
        String(r.status) === 'paid' ? 'مدفوع' : 'معلق',
        r.paid_at ? r.paid_at.slice(0, 10) : '—',
      ])
    );
  };

  const openModal = () => {
    setEmployeeId('');
    setAmount('');
    setAmountError(false);
    setPeriod(DEFAULT_PERIOD);
    setStatus('pending');
    setFormError('');
    setModalOpen(true);
  };

  const submitPayroll = async () => {
    if (!shopId) return;
    const selected = employees.find((e) => e.id === employeeId);
    if (!selected) {
      setFormError('اختر الموظف');
      return;
    }
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      setAmountError(true);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createPayroll(shopId, {
        employee_id: employeeId,
        employeeName: selected.name,
        amount: value,
        period: period.trim() || undefined,
        status,
      });
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ الراتب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HrPageShell
        title="الرواتب"
        subtitle={`مدفوع: ${formatMoney(paidTotal)} — معلق: ${formatMoney(pendingTotal)}`}
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <button onClick={openModal} className={PRIMARY_BTN}>
              <Plus size={15} />
              إضافة راتب
            </button>
            <button onClick={exportCsv} className={SECONDARY_BTN}>
              <Download size={15} />
              تصدير CSV
            </button>
            <button onClick={refresh} className={SECONDARY_BTN}>
              <RefreshCw size={15} className={loading || shopLoading || refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
          </>
        }
        error={error || undefined}
        onDismissError={() => setError('')}
        tabs={tabs}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم الموظف…"
        filters={
          <>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className={HR_FILTER_SELECT_CLS}
            >
              <option value="all">كل الفترات</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={HR_FILTER_SELECT_CLS}>
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="amount">المبلغ الأعلى</option>
            </select>
          </>
        }
        loading={loading || shopLoading}
        empty={
          filtered.length === 0 ? (
            <HrEmpty
              icon={Banknote}
              title={records.length === 0 ? 'لا توجد سجلات رواتب بعد' : 'لا توجد نتائج مطابقة للبحث أو الفلترة'}
            >
              {records.length === 0 && <p className="text-xs text-slate-400">اضغط «إضافة راتب» لتسجيل أول صرفية</p>}
            </HrEmpty>
          ) : undefined
        }
        footer={
          <HrPagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            perPage={PER_PAGE}
            onPage={setPage}
            label="راتب"
          />
        }
      >
        <HrTableCard
          columns={[
            { label: 'الموظف', className: 'col-span-3' },
            { label: 'الفترة', className: 'col-span-2' },
            { label: 'المبلغ', className: 'col-span-2' },
            { label: 'الحالة', className: 'col-span-2' },
            { label: 'صُرف في', className: 'col-span-3' },
          ]}
        >
          {paginated.map((r) => (
            <HrRow key={r.id}>
              <div className="col-span-3 min-w-0">
                <div className="font-bold text-slate-800 text-[13px] truncate">{r.employeeName || '—'}</div>
                <div className="text-[11px] text-slate-400 truncate" dir="ltr">
                  {r.employee_id ? `${r.employee_id.slice(0, 8)}…` : '—'}
                </div>
              </div>
              <div className="col-span-2 text-slate-600 text-[13px]">{r.period || '—'}</div>
              <div className="col-span-2 text-slate-900 text-[13px] font-bold tabular-nums">{formatMoney(r.amount)}</div>
              <div className="col-span-2">
                <HrStatusPill tone={String(r.status) === 'paid' ? 'emerald' : 'amber'}>
                  {String(r.status) === 'paid' ? 'مدفوع' : 'معلق'}
                </HrStatusPill>
              </div>
              <div className="col-span-3 text-slate-500 text-[12px] tabular-nums" dir="ltr">
                {r.paid_at ? r.paid_at.slice(0, 10) : '—'}
              </div>
            </HrRow>
          ))}
        </HrTableCard>
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title="إضافة راتب"
          subtitle="سجّل صرفية راتب لموظف"
          onClose={() => setModalOpen(false)}
          footer={
            <HrModalActions
              onCancel={() => setModalOpen(false)}
              onSubmit={submitPayroll}
              submitting={saving}
              submitLabel="إضافة"
            />
          }
        >
          {formError && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold">
              {formError}
            </div>
          )}
          <HrField label="الموظف" required>
            {employees.length === 0 ? (
              <select value="" disabled className={HR_INPUT_CLS}>
                <option value="">أضف موظفين أولاً من صفحة الموظفين</option>
              </select>
            ) : (
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={HR_INPUT_CLS}>
                <option value="">— اختر الموظف —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            )}
          </HrField>
          <HrField label="المبلغ" required>
            <input
              type="number"
              dir="ltr"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountError(false);
              }}
              onBlur={() => {
                if (amount.trim() && Number(amount) <= 0) setAmountError(true);
              }}
              placeholder="0.00"
              className={HR_INPUT_CLS}
            />
            {amountError && <p className="text-[11px] font-bold text-red-500 mt-1">أدخل مبلغاً صحيحاً</p>}
          </HrField>
          <HrField label="الفترة">
            <input
              type="text"
              dir="ltr"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-09"
              className={HR_INPUT_CLS}
            />
          </HrField>
          <HrField label="الحالة">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HrPayrollStatus)}
              className={HR_INPUT_CLS}
            >
              <option value="paid">مدفوع</option>
              <option value="pending">معلق</option>
            </select>
          </HrField>
        </HrModal>
      )}

      <HRGuideDrawer page="payroll" title="دليل صفحة الرواتب" open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
