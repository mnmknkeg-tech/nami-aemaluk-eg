'use client';

/**
 * صفحة الانصراف — سجل انصراف الموظفين وحساب ساعات العمل تلقائياً:
 * تسجيل انصراف (مع وقت الدخول الاختياري)، فلترة حسب التاريخ، بحث
 * باسم الموظف، ترقيم صفحات، وتصدير CSV. نفس هيكل صفحات HR الموحدة.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, LogOut, RefreshCw } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { downloadCsv } from '@/lib/csv';
import { createCheckOut, fetchCheckOuts, fetchEmployees } from '@/lib/api/hr';
import type { HrAttendanceStatus, HrCheckOutRecord, HrEmployee } from '@/lib/api/hr';
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
} from '@/components/hr/HRShell';
import type { HrTab } from '@/components/hr/HRShell';
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';

const TODAY = new Date().toLocaleDateString('en-CA');
const PER_PAGE = 25;
const WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

/** التاريخ بصيغة YYYY-MM-DD من السجل */
const dateOf = (r: HrCheckOutRecord) => String(r.date || '').slice(0, 10);

/** تصفية التاريخ: today = نفس اليوم، week = آخر 7 أيام، month = نفس السنة والشهر، all = الكل */
const inDateBucket = (date: string, bucket: string): boolean => {
  if (bucket === 'all') return true;
  const d = String(date || '').slice(0, 10);
  if (!d) return false;
  if (bucket === 'today') return d === TODAY;
  if (bucket === 'month') return d.slice(0, 7) === TODAY.slice(0, 7);
  const parsed = new Date(d);
  return !Number.isNaN(parsed.getTime()) && parsed >= WEEK_AGO;
};

/** تسمية ولون حالة الحضور */
const statusMeta = (status: string): { label: string; tone: 'emerald' | 'amber' | 'red' | 'slate' } => {
  const s = String(status || '').toLowerCase();
  if (s === 'present') return { label: 'حاضر', tone: 'emerald' };
  if (s === 'late') return { label: 'متأخر', tone: 'amber' };
  if (s === 'absent') return { label: 'غائب', tone: 'red' };
  return { label: s || '—', tone: 'slate' };
};

/** حساب ساعات العمل من وقتي الدخول والانصراف (HH:MM) — الفرق بالدقائق مع لف 24 ساعة */
const computeHours = (checkIn: string, checkOut: string): string => {
  if (!checkIn || !checkOut) return '';
  const toMinutes = (t: string): number | null => {
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const inMin = toMinutes(checkIn);
  const outMin = toMinutes(checkOut);
  if (inMin === null || outMin === null) return '';
  let diff = outMin - inMin;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `${h} س` : `${h} س ${m.toString().padStart(2, '0')} د`;
};

export default function CheckOutPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [records, setRecords] = useState<HrCheckOutRecord[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusTab, setStatusTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // حقول مودال تسجيل انصراف
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [date, setDate] = useState(TODAY);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState<HrAttendanceStatus>('present');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await fetchCheckOuts(shopId);
      setRecords(data);
      fetchEmployees(shopId).then(setEmployees).catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل سجل الانصراف');
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

  /* انصرافات اليوم — للعنوان الفرعي والتاب */
  const todayCount = useMemo(() => records.filter((r) => dateOf(r) === TODAY).length, [records]);

  const tabs: HrTab[] = useMemo(
    () => [
      { id: 'all', label: 'الكل', count: records.length },
      { id: 'today', label: 'اليوم', count: todayCount },
    ],
    [records, todayCount]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = records.filter(
      (r) =>
        (statusTab === 'all' || (statusTab === 'today' && dateOf(r) === TODAY)) &&
        inDateBucket(String(r.date), dateFilter) &&
        (!q || String(r.employeeName || '').toLowerCase().includes(q))
    );
    if (sort === 'name')
      return [...list].sort((a, b) => String(a.employeeName || '').localeCompare(String(b.employeeName || ''), 'ar'));
    if (sort === 'oldest')
      return [...list].sort(
        (a, b) => dateOf(a).localeCompare(dateOf(b)) || String(a.checkOut || '').localeCompare(String(b.checkOut || ''))
      );
    return [...list].sort(
      (a, b) => dateOf(b).localeCompare(dateOf(a)) || String(b.checkOut || '').localeCompare(String(a.checkOut || ''))
    );
  }, [records, statusTab, dateFilter, debouncedSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, dateFilter, sort]);

  const exportCsv = () => {
    downloadCsv(
      `checkouts-${TODAY}.csv`,
      ['الموظف', 'التاريخ', 'الدخول', 'الانصراف', 'الساعات', 'الحالة'],
      filtered.map((r) => [
        r.employeeName || '',
        dateOf(r) || '—',
        r.checkIn || '—',
        r.checkOut || '—',
        r.hours || '',
        statusMeta(String(r.status)).label,
      ])
    );
  };

  const openModal = () => {
    setEmployeeId('');
    setEmployeeName('');
    setDate(TODAY);
    setCheckIn('');
    setCheckOut(new Date().toTimeString().slice(0, 5));
    setStatus('present');
    setFormError('');
    setModalOpen(true);
  };

  const submitCheckOut = async () => {
    if (!shopId) return;
    if (!employeeId || !employeeName) {
      setFormError('اختر موظفاً');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createCheckOut(shopId, {
        // جدول الانصرافات بلا عمود employee_id — الاسم فقط
        employeeName,
        date,
        checkIn: checkIn || undefined,
        checkOut,
        hours: computeHours(checkIn, checkOut),
        status,
      });
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الانصراف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HrPageShell
        title="الانصراف"
        subtitle={`سجل انصراف الفريق — اليوم: ${todayCount} انصراف`}
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <button onClick={openModal} className={PRIMARY_BTN}>
              <LogOut size={15} />
              تسجيل انصراف
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
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={HR_FILTER_SELECT_CLS}
            >
              <option value="all">الكل</option>
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">هذا الشهر</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={HR_FILTER_SELECT_CLS}>
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="name">الاسم</option>
            </select>
          </>
        }
        loading={loading || shopLoading}
        empty={
          filtered.length === 0 ? (
            <HrEmpty
              icon={LogOut}
              title={records.length === 0 ? 'لا توجد سجلات انصراف بعد' : 'لا توجد نتائج مطابقة للبحث أو الفلترة'}
            >
              {records.length === 0 && <p className="text-xs text-slate-400">اضغط «تسجيل انصراف» لتسجيل أول سجل</p>}
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
            label="سجل"
          />
        }
      >
        <HrTableCard
          columns={[
            { label: 'الموظف', className: 'col-span-3' },
            { label: 'التاريخ', className: 'col-span-2' },
            { label: 'الدخول', className: 'col-span-2' },
            { label: 'الانصراف', className: 'col-span-2' },
            { label: 'الساعات', className: 'col-span-1' },
            { label: 'الحالة', className: 'col-span-2' },
          ]}
        >
          {paginated.map((r) => {
            const meta = statusMeta(String(r.status));
            return (
              <HrRow key={r.id}>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-800 text-[13px] truncate">{r.employeeName || '—'}</div>
                </div>
                <div className="col-span-2 text-slate-600 text-[12px] tabular-nums" dir="ltr">
                  {dateOf(r) || '—'}
                </div>
                <div className="col-span-2 text-slate-600 text-[13px] tabular-nums" dir="ltr">
                  {r.checkIn || '—'}
                </div>
                <div className="col-span-2 text-slate-800 text-[13px] font-bold tabular-nums" dir="ltr">
                  {r.checkOut || '—'}
                </div>
                <div className="col-span-1 text-slate-900 text-[13px] font-bold tabular-nums">{r.hours || '—'}</div>
                <div className="col-span-2">
                  <HrStatusPill tone={meta.tone}>{meta.label}</HrStatusPill>
                </div>
              </HrRow>
            );
          })}
        </HrTableCard>
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title="تسجيل انصراف"
          subtitle="سجّل انصراف موظف واحسب ساعات العمل"
          onClose={() => setModalOpen(false)}
          footer={
            <HrModalActions
              onCancel={() => setModalOpen(false)}
              onSubmit={submitCheckOut}
              submitting={saving}
              submitLabel="تسجيل"
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
              <select
                value={employeeId}
                onChange={(e) => {
                  const id = e.target.value;
                  setEmployeeId(id);
                  setEmployeeName(employees.find((emp) => emp.id === id)?.name || '');
                }}
                className={HR_INPUT_CLS}
              >
                <option value="">— اختر الموظف —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            )}
          </HrField>
          <div className="grid grid-cols-2 gap-3">
            <HrField label="التاريخ">
              <input
                type="date"
                dir="ltr"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={HR_INPUT_CLS}
              />
            </HrField>
            <HrField label="وقت الدخول">
              <input
                type="time"
                dir="ltr"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={HR_INPUT_CLS}
              />
            </HrField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HrField label="وقت الانصراف">
              <input
                type="time"
                dir="ltr"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={HR_INPUT_CLS}
              />
            </HrField>
            <HrField label="الحالة">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as HrAttendanceStatus)}
                className={HR_INPUT_CLS}
              >
                <option value="present">حاضر</option>
                <option value="late">متأخر</option>
                <option value="absent">غائب</option>
              </select>
            </HrField>
          </div>
        </HrModal>
      )}

      <HRGuideDrawer page="checkout" title="دليل صفحة الانصراف" open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
