'use client';

/**
 * صفحة الإجازات — طلبات إجازات الموظفين: إنشاء طلب، الموافقة/الرفض للطلبات
 * المعلقة من الصف مباشرة، فلترة حسب النوع والحالة، بحث، ترقيم صفحات،
 * وتصدير CSV. نفس هيكل صفحات HR الموحدة.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Download, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { downloadCsv } from '@/lib/csv';
import { createLeave, fetchEmployees, fetchLeaves, updateLeaveStatus } from '@/lib/api/hr';
import type { HrEmployee, HrLeave, HrLeaveType } from '@/lib/api/hr';
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
  HrRowAction,
  HrStatusPill,
  HrTableCard,
} from '@/components/hr/HRShell';
import type { HrTab } from '@/components/hr/HRShell';
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';

const TODAY = new Date().toLocaleDateString('en-CA');
const PER_PAGE = 25;

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'سنوية',
  sick: 'مرضية',
  unpaid: 'بدون راتب',
  emergency: 'طارئة',
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلقة',
  approved: 'مقبولة',
  rejected: 'مرفوضة',
};

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

export default function LeavesPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [records, setRecords] = useState<HrLeave[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusTab, setStatusTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // حقول مودال طلب إجازة
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<HrLeaveType>('annual');
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await fetchLeaves(shopId);
      setRecords(data);
      fetchEmployees(shopId).then(setEmployees).catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل طلبات الإجازة');
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

  const pendingCount = useMemo(
    () => records.filter((r) => String(r.status) === 'pending').length,
    [records]
  );
  const approvedDays = useMemo(
    () =>
      records
        .filter((r) => String(r.status) === 'approved')
        .reduce((s, r) => s + (Number(r.days) || 0), 0),
    [records]
  );

  const tabs: HrTab[] = useMemo(
    () => [
      { id: 'all', label: 'الكل', count: records.length },
      { id: 'pending', label: 'معلقة', count: records.filter((r) => String(r.status) === 'pending').length },
      { id: 'approved', label: 'مقبولة', count: records.filter((r) => String(r.status) === 'approved').length },
      { id: 'rejected', label: 'مرفوضة', count: records.filter((r) => String(r.status) === 'rejected').length },
    ],
    [records]
  );

  const dateInvalid = Boolean(startDate && endDate && endDate < startDate);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = records.filter(
      (r) =>
        (statusTab === 'all' || String(r.status) === statusTab) &&
        (typeFilter === 'all' || String(r.type) === typeFilter) &&
        (!q || `${r.employeeName || ''} ${r.reason || ''}`.toLowerCase().includes(q))
    );
    if (sort === 'days') return [...list].sort((a, b) => (Number(b.days) || 0) - (Number(a.days) || 0));
    if (sort === 'oldest')
      return [...list].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
    return [...list].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [records, statusTab, typeFilter, debouncedSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, typeFilter, sort]);

  const exportCsv = () => {
    downloadCsv(
      `leaves-${TODAY}.csv`,
      ['الموظف', 'النوع', 'من', 'إلى', 'الأيام', 'السبب', 'الحالة'],
      filtered.map((r) => [
        r.employeeName || '',
        LEAVE_TYPE_LABELS[String(r.type)] || String(r.type || '—'),
        r.startDate || '—',
        r.endDate || '—',
        Number(r.days) || 0,
        r.reason || '—',
        LEAVE_STATUS_LABELS[String(r.status)] || String(r.status || '—'),
      ])
    );
  };

  const openModal = () => {
    setEmployeeId('');
    setType('annual');
    setStartDate(TODAY);
    setEndDate(TODAY);
    setReason('');
    setFormError('');
    setModalOpen(true);
  };

  const submitLeave = async () => {
    if (!shopId) return;
    const selected = employees.find((e) => e.id === employeeId);
    if (!selected) {
      setFormError('اختر الموظف');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('حدد تاريخ البداية والنهاية');
      return;
    }
    if (endDate < startDate) {
      setFormError('تاريخ النهاية يجب أن يكون بعد البداية');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createLeave(shopId, {
        employeeName: selected.name,
        type,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ طلب الإجازة');
    } finally {
      setSaving(false);
    }
  };

  const decide = async (leave: HrLeave, nextStatus: 'approved' | 'rejected') => {
    if (!shopId || busyId) return;
    setBusyId(leave.id);
    try {
      await updateLeaveStatus(shopId, leave.id, nextStatus);
      await load();
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث حالة الإجازة');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <HrPageShell
        title="الإجازات"
        subtitle={`معلقة: ${pendingCount} — أيام مقبولة: ${approvedDays}`}
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <button onClick={openModal} className={PRIMARY_BTN}>
              <Plus size={15} />
              طلب إجازة
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
        searchPlaceholder="ابحث باسم الموظف أو السبب…"
        filters={
          <>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={HR_FILTER_SELECT_CLS}
            >
              <option value="all">كل الأنواع</option>
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="unpaid">بدون راتب</option>
              <option value="emergency">طارئة</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={HR_FILTER_SELECT_CLS}>
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="days">أكثر أياماً</option>
            </select>
          </>
        }
        loading={loading || shopLoading}
        empty={
          filtered.length === 0 ? (
            <HrEmpty
              icon={CalendarDays}
              title={records.length === 0 ? 'لا توجد طلبات إجازة بعد' : 'لا توجد نتائج مطابقة للبحث أو الفلترة'}
            >
              {records.length === 0 && <p className="text-xs text-slate-400">اضغط «طلب إجازة» لإنشاء أول طلب</p>}
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
            label="طلب"
          />
        }
      >
        <HrTableCard
          columns={[
            { label: 'الموظف', className: 'col-span-2' },
            { label: 'النوع', className: 'col-span-1' },
            { label: 'من', className: 'col-span-2' },
            { label: 'إلى', className: 'col-span-2' },
            { label: 'الأيام', className: 'col-span-1' },
            { label: 'السبب', className: 'col-span-2' },
            { label: 'الحالة', className: 'col-span-1' },
            { label: 'إجراءات', className: 'col-span-1' },
          ]}
        >
          {paginated.map((leave) => (
            <HrRow key={leave.id}>
              <div className="col-span-2 min-w-0">
                <div className="font-bold text-slate-800 text-[13px] truncate">{leave.employeeName || '—'}</div>
              </div>
              <div className="col-span-1 min-w-0">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                  {LEAVE_TYPE_LABELS[String(leave.type)] || String(leave.type || '—')}
                </span>
              </div>
              <div className="col-span-2 text-slate-600 text-[12px] tabular-nums" dir="ltr">
                {leave.startDate || '—'}
              </div>
              <div className="col-span-2 text-slate-600 text-[12px] tabular-nums" dir="ltr">
                {leave.endDate || '—'}
              </div>
              <div className="col-span-1 text-slate-900 text-[13px] font-bold tabular-nums">{Number(leave.days) || 0}</div>
              <div className="col-span-2 min-w-0 text-[12px] text-slate-500 truncate">{leave.reason || '—'}</div>
              <div className="col-span-1">
                <HrStatusPill
                  tone={
                    String(leave.status) === 'approved'
                      ? 'emerald'
                      : String(leave.status) === 'rejected'
                        ? 'red'
                        : 'amber'
                  }
                >
                  {LEAVE_STATUS_LABELS[String(leave.status)] || String(leave.status || '—')}
                </HrStatusPill>
              </div>
              <div className="col-span-1 flex items-center gap-2 justify-end">
                {busyId === leave.id ? (
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                ) : String(leave.status) === 'pending' ? (
                  <>
                    <HrRowAction onClick={() => decide(leave, 'approved')} title="موافقة">
                      <Check size={14} />
                    </HrRowAction>
                    <HrRowAction onClick={() => decide(leave, 'rejected')} title="رفض" danger>
                      <X size={14} />
                    </HrRowAction>
                  </>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </div>
            </HrRow>
          ))}
        </HrTableCard>
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title="طلب إجازة"
          subtitle="أنشئ طلب إجازة لموظف"
          onClose={() => setModalOpen(false)}
          footer={
            <HrModalActions
              onCancel={() => setModalOpen(false)}
              onSubmit={submitLeave}
              submitting={saving}
              submitLabel="إرسال الطلب"
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
          <HrField label="النوع">
            <select value={type} onChange={(e) => setType(e.target.value as HrLeaveType)} className={HR_INPUT_CLS}>
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="unpaid">بدون راتب</option>
              <option value="emergency">طارئة</option>
            </select>
          </HrField>
          <div className="grid grid-cols-2 gap-3">
            <HrField label="من تاريخ" required>
              <input
                type="date"
                dir="ltr"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={HR_INPUT_CLS}
              />
            </HrField>
            <HrField label="إلى تاريخ" required>
              <input
                type="date"
                dir="ltr"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={HR_INPUT_CLS}
              />
              {dateInvalid && <p className="text-[11px] font-bold text-red-500 mt-1">تاريخ النهاية يجب أن يكون بعد البداية</p>}
            </HrField>
          </div>
          <HrField label="السبب">
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب الإجازة (اختياري)…"
              className={`${HR_INPUT_CLS} h-auto py-3`}
            />
          </HrField>
        </HrModal>
      )}

      <HRGuideDrawer page="leaves" title="دليل صفحة الإجازات" open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
