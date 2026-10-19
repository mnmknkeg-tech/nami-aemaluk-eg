'use client';

/**
 * صفحة الموظفين — نفس الهيكل المعياري لبقية أقسام الداشبورد
 * (هيدر أبيض + تابات بعدّادات + بطاقة بحث/فلاتر + جدول grid-cols-12 + ترقيم).
 * كل البيانات من الباكند عبر src/lib/api/hr.ts — بدون localStorage.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, RefreshCw, Trash2, UserCog } from 'lucide-react';
import {
  EMPLOYEE_STATUS_LABELS,
  HR_FILTER_SELECT_CLS,
  HR_INPUT_CLS,
  HrField,
  HrModal,
  HrModalActions,
  HrPageShell,
  HrPagination,
  HrRow,
  HrRowAction,
  HrStatusPill,
  HrTableCard,
  HrToolbar,
  employeeStatusTone,
  formatMoney,
} from '@/components/hr/HRShell';
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  fetchRoles,
  updateEmployee,
  type HrEmployee,
  type HrEmployeePayload,
  type HrRole,
} from '@/lib/api/hr';
import { downloadCsv } from '@/lib/csv';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

const today = () => new Date().toLocaleDateString('en-CA');

type EmployeeForm = {
  name: string;
  role: string;
  roleId: string;
  email: string;
  phone: string;
  salary: string;
  hireDate: string;
  status: string;
};

const emptyForm: EmployeeForm = {
  name: '',
  role: '',
  roleId: '',
  email: '',
  phone: '',
  salary: '',
  hireDate: '',
  status: 'active',
};

export default function HrEmployeesPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [roles, setRoles] = useState<HrRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEmployees = useCallback(
    async (silent = false) => {
      if (!shopId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [list, roleList] = await Promise.all([
          fetchEmployees(shopId),
          fetchRoles(shopId).catch(() => [] as HrRole[]),
        ]);
        setEmployees(list);
        setRoles(roleList);
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل الموظفين');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, roleFilter, sortBy]);

  const roleOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => String(e.role || '').trim()).filter(Boolean))).sort(),
    [employees]
  );

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => employeeStatusTone(e.status) === 'emerald').length;
    const inactive = total - active;
    const payroll = employees
      .filter((e) => employeeStatusTone(e.status) === 'emerald')
      .reduce((sum, e) => sum + Number(e.salary || 0), 0);
    return { total, active, inactive, payroll };
  }, [employees]);

  const filtered = useMemo(() => {
    let list = [...employees];
    if (statusTab === 'active') list = list.filter((e) => employeeStatusTone(e.status) === 'emerald');
    if (statusTab === 'inactive') list = list.filter((e) => employeeStatusTone(e.status) === 'slate');
    if (roleFilter !== 'all') list = list.filter((e) => String(e.role || '').trim() === roleFilter);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.name, e.email, e.phone, e.role].some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      if (sortBy === 'salary') return Number(b.salary || 0) - Number(a.salary || 0);
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    return list;
  }, [employees, statusTab, roleFilter, debouncedSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page]
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (emp: HrEmployee) => {
    setEditing(emp);
    setForm({
      name: emp.name || '',
      role: emp.role || '',
      roleId: emp.role_id || '',
      email: emp.email || '',
      phone: emp.phone || '',
      salary: emp.salary ? String(emp.salary) : '',
      hireDate: emp.hire_date || '',
      status: emp.status || 'active',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('الاسم مطلوب');
      return;
    }
    if (!shopId) return;
    setSaving(true);
    setFormError('');
    const payload: HrEmployeePayload = {
      name: form.name.trim(),
      role: form.role.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      salary: Number(form.salary) || 0,
      hire_date: form.hireDate,
      status: form.status,
    };
    if (form.roleId) payload.role_id = form.roleId;
    try {
      if (editing) await updateEmployee(shopId, editing.id, payload);
      else await createEmployee(shopId, payload);
      setModalOpen(false);
      await loadEmployees(true);
    } catch (err: any) {
      setFormError(err?.message || 'فشل حفظ الموظف');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: HrEmployee) => {
    if (!shopId) return;
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${emp.name}"؟`)) return;
    setDeletingId(emp.id);
    try {
      await deleteEmployee(shopId, emp.id);
      await loadEmployees(true);
    } catch (err: any) {
      setError(err?.message || 'فشل حذف الموظف');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      `employees-${today()}.csv`,
      ['الاسم', 'المنصب', 'البريد الإلكتروني', 'الهاتف', 'الراتب', 'تاريخ التعيين', 'الحالة'],
      filtered.map((e) => [
        e.name,
        e.role,
        e.email,
        e.phone,
        e.salary,
        e.hire_date,
        EMPLOYEE_STATUS_LABELS[String(e.status || 'active')] || e.status,
      ])
    );
  };

  return (
    <>
      <HrPageShell
      title="الموظفين"
      subtitle={`إدارة فريق العمل — ${stats.total} موظف`}
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button onClick={openAdd} className={PRIMARY_BTN}>
            <Plus size={15} />
            إضافة موظف
          </button>
          <button onClick={handleExport} className={SECONDARY_BTN}>
            <Download size={15} />
            تصدير CSV
          </button>
          <button onClick={() => loadEmployees(true)} className={SECONDARY_BTN}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            تحديث
          </button>
        </>
      }
      error={error || undefined}
      onDismissError={() => setError('')}
      tabs={[
        { id: 'all', label: 'الكل', count: stats.total },
        { id: 'active', label: 'نشط', count: stats.active },
        { id: 'inactive', label: 'غير نشط', count: stats.inactive },
      ]}
      activeTab={statusTab}
      onTabChange={(id) => setStatusTab(id as typeof statusTab)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="بحث بالاسم أو البريد أو الهاتف…"
      filters={
        <>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={HR_FILTER_SELECT_CLS}>
            <option value="all">كل المناصب</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={HR_FILTER_SELECT_CLS}>
            <option value="newest">الأحدث</option>
            <option value="name">الاسم</option>
            <option value="salary">الراتب الأعلى</option>
          </select>
        </>
      }
      loading={loading || shopLoading}
      empty={
        <HrEmptyBlock onAdd={openAdd} />
      }
      footer={
        <HrPagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          perPage={perPage}
          onPage={setPage}
          label="موظف"
        />
      }
    >
      <HrToolbar hint={`نشط: ${stats.active} — غير نشط: ${stats.inactive} — إجمالي الرواتب الشهرية: ${formatMoney(stats.payroll)}`} />
      <div className="mt-3">
        <HrTableCard
          columns={[
            { label: 'الموظف', className: 'col-span-3' },
            { label: 'المنصب', className: 'col-span-2' },
            { label: 'التواصل', className: 'col-span-2' },
            { label: 'الراتب', className: 'col-span-2' },
            { label: 'تاريخ التعيين', className: 'col-span-1' },
            { label: 'الحالة', className: 'col-span-1' },
            { label: 'إجراءات', className: 'col-span-1' },
          ]}
        >
          {paginated.map((emp) => (
            <HrRow key={emp.id}>
              <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{(emp.name || 'م').charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-[13px] truncate">{emp.name || '—'}</div>
                  <div className="text-[11px] text-slate-400 truncate" dir="ltr">
                    {emp.email || '—'}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-[13px] text-slate-600 font-semibold">
                {emp.role || '—'}
              </div>
              <div className="col-span-2 text-[12px] text-slate-600" dir="ltr">
                {emp.phone || '—'}
              </div>
              <div className="col-span-2 text-[13px] font-bold text-slate-900 tabular-nums">
                {formatMoney(emp.salary)}
              </div>
              <div className="col-span-1 text-[12px] text-slate-500 tabular-nums">
                {emp.hire_date || '—'}
              </div>
              <div className="col-span-1">
                <HrStatusPill tone={employeeStatusTone(emp.status)}>
                  {EMPLOYEE_STATUS_LABELS[String(emp.status || 'active')] || emp.status}
                </HrStatusPill>
              </div>
              <div className="col-span-1 flex items-center gap-2 justify-end">
                <HrRowAction onClick={() => openEdit(emp)} title="تعديل">
                  <Pencil size={14} />
                </HrRowAction>
                <HrRowAction onClick={() => handleDelete(emp)} title="حذف" danger>
                  {deletingId === emp.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </HrRowAction>
              </div>
            </HrRow>
          ))}
        </HrTableCard>
      </div>
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title={editing ? 'تعديل موظف' : 'إضافة موظف'}
          subtitle={editing ? `تعديل بيانات ${editing.name}` : 'أدخل بيانات الموظف الجديد'}
          onClose={() => setModalOpen(false)}
        >
          {formError && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold">
              {formError}
            </div>
          )}
          <HrField label="الاسم" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={HR_INPUT_CLS}
              placeholder="اسم الموظف"
            />
          </HrField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="المنصب">
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, roleId: '' })}
                className={HR_INPUT_CLS}
                placeholder="موظف"
              />
            </HrField>
            <HrField label="ربط بدور صلاحيات">
              <select
                value={form.roleId}
                onChange={(e) => {
                  const roleId = e.target.value;
                  const picked = roles.find((r) => r.id === roleId);
                  setForm({ ...form, roleId, role: picked ? picked.name_ar || picked.name : form.role });
                }}
                className={HR_INPUT_CLS}
              >
                <option value="">بدون دور</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name_ar || r.name}
                  </option>
                ))}
              </select>
            </HrField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="البريد الإلكتروني">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={HR_INPUT_CLS}
                dir="ltr"
                placeholder="name@example.com"
              />
            </HrField>
            <HrField label="الهاتف">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={HR_INPUT_CLS}
                dir="ltr"
                placeholder="01xxxxxxxxx"
              />
            </HrField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="الراتب الأساسي">
              <input
                type="number"
                min={0}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className={HR_INPUT_CLS}
                dir="ltr"
                placeholder="0"
              />
            </HrField>
            <HrField label="تاريخ التعيين">
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                className={HR_INPUT_CLS}
                dir="ltr"
              />
            </HrField>
          </div>
          <HrField label="الحالة">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={HR_INPUT_CLS}
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </HrField>
          <HrModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'حفظ التعديلات' : 'إضافة الموظف'}
            submitting={saving}
          />
        </HrModal>
      )}

      <HRGuideDrawer
        page="employees"
        title="دليل صفحة الموظفين"
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}

function HrEmptyBlock({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center">
      <UserCog size={32} className="mx-auto mb-3 text-slate-300" />
      <p className="text-slate-400 font-bold text-sm">لا يوجد موظفون بعد</p>
      <button
        onClick={onAdd}
        className="mt-3 h-9 px-4 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
      >
        <Plus size={15} />
        إضافة موظف
      </button>
    </div>
  );
}
