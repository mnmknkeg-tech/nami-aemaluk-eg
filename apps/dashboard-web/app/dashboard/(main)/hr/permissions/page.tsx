'use client';

/**
 * صفحة الصلاحيات — إدارة أدوار الفريق وصلاحيات الوصول لكل وحدة + سجل النشاطات.
 * نفس الهيكل المعياري لبقية أقسام الداشبورد (هيدر أبيض + تابات + بطاقات/جدول).
 * كل البيانات من الباكند عبر src/lib/api/hr.ts — بدون localStorage.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import {
  HR_INPUT_CLS,
  HrEmpty,
  HrField,
  HrModal,
  HrModalActions,
  HrPageShell,
  HrRow,
  HrRowAction,
  HrStatusPill,
  HrTableCard,
} from '@/components/hr/HRShell';
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';
import {
  createRole,
  deleteRole,
  fetchAccessLogs,
  fetchRoles,
  updateRole,
  type HrAccessLog,
  type HrRole,
  type HrRolePermission,
} from '@/lib/api/hr';
import { useShop } from '@/hooks/useShop';

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

const MODULES = [
  { id: 'pos', label: 'الكاشير' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'inventory', label: 'المخزون' },
  { id: 'finance', label: 'المالية' },
  { id: 'accounting', label: 'المحاسبة' },
  { id: 'customers', label: 'العملاء' },
  { id: 'marketing', label: 'التسويق' },
  { id: 'bookings', label: 'الحجوزات' },
  { id: 'hr', label: 'الموارد البشرية' },
  { id: 'analytics', label: 'التحليلات' },
  { id: 'settings', label: 'الإعدادات' },
];

const ACTIONS = [
  { id: 'view', label: 'عرض' },
  { id: 'create', label: 'إنشاء' },
  { id: 'edit', label: 'تعديل' },
  { id: 'delete', label: 'حذف' },
];

const ROLE_COLORS = [
  { hex: '#0F172A', label: 'أسود' },
  { hex: '#0EA5E9', label: 'أزرق' },
  { hex: '#10B981', label: 'أخضر' },
  { hex: '#F59E0B', label: 'برتقالي' },
  { hex: '#EF4444', label: 'أحمر' },
  { hex: '#8B5CF6', label: 'بنفسجي' },
];

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

type RoleForm = {
  name: string;
  nameAr: string;
  color: string;
  fullAccess: boolean;
  perms: Record<string, string[]>;
};

const emptyPerms = (): Record<string, string[]> =>
  Object.fromEntries(MODULES.map((m) => [m.id, [] as string[]]));

const emptyForm: RoleForm = { name: '', nameAr: '', color: ROLE_COLORS[0].hex, fullAccess: false, perms: emptyPerms() };

export default function HrPermissionsPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [roles, setRoles] = useState<HrRole[]>([]);
  const [logs, setLogs] = useState<HrAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'roles' | 'logs'>('roles');

  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrRole | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!shopId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [roleList, logList] = await Promise.all([
          fetchRoles(shopId),
          fetchAccessLogs(shopId, 100).catch(() => [] as HrAccessLog[]),
        ]);
        setRoles(roleList);
        setLogs(logList);
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل الأدوار');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (role: HrRole) => {
    const perms = emptyPerms();
    (role.permissions || []).forEach((p: HrRolePermission) => {
      if (perms[p.moduleId] !== undefined) perms[p.moduleId] = [...(p.actions || [])];
    });
    setEditing(role);
    setForm({
      name: role.name || '',
      nameAr: role.name_ar || '',
      color: HEX_RE.test(role.color) ? role.color : ROLE_COLORS[0].hex,
      fullAccess: Boolean(role.full_access),
      perms,
    });
    setFormError('');
    setModalOpen(true);
  };

  const togglePerm = (moduleId: string, action: string) => {
    setForm((prev) => {
      const current = prev.perms[moduleId] || [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, perms: { ...prev.perms, [moduleId]: next } };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('اسم الدور مطلوب');
      return;
    }
    if (!shopId) return;
    setSaving(true);
    setFormError('');
    const permissions: HrRolePermission[] = form.fullAccess
      ? []
      : MODULES.filter((m) => (form.perms[m.id] || []).length > 0).map((m) => ({
          moduleId: m.id,
          actions: form.perms[m.id],
        }));
    const payload = {
      name: form.name.trim(),
      name_ar: form.nameAr.trim(),
      color: form.color,
      full_access: form.fullAccess,
      permissions,
    };
    try {
      if (editing) await updateRole(shopId, editing.id, payload);
      else await createRole(shopId, payload);
      setModalOpen(false);
      await loadAll(true);
    } catch (err: any) {
      setFormError(err?.message || 'فشل حفظ الدور');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: HrRole) => {
    if (!shopId || role.is_system) return;
    if (!window.confirm(`حذف الدور "${role.name}"؟ لن يتمكن أي موظف من استخدامه بعد الحذف.`)) return;
    setDeletingId(role.id);
    try {
      await deleteRole(shopId, role.id);
      await loadAll(true);
    } catch (err: any) {
      setError(err?.message || 'فشل حذف الدور');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return ts;
    }
  };

  const matrixSummary = useMemo(
    () => MODULES.filter((m) => (form.perms[m.id] || []).length > 0).length,
    [form.perms]
  );

  return (
    <>
      <HrPageShell
        title="الصلاحيات"
        subtitle="أدوار الفريق وصلاحيات الوصول لكل وحدة"
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <button onClick={openAdd} className={PRIMARY_BTN}>
              <Plus size={15} />
              إضافة دور
            </button>
            <button onClick={() => loadAll(true)} className={SECONDARY_BTN}>
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
          </>
        }
        error={error || undefined}
        onDismissError={() => setError('')}
        tabs={[
          { id: 'roles', label: 'الأدوار', count: roles.length },
          { id: 'logs', label: 'سجل النشاطات', count: logs.length },
        ]}
        activeTab={activeView}
        onTabChange={(id) => setActiveView(id as 'roles' | 'logs')}
        loading={loading || shopLoading}
      >
        {activeView === 'roles' ? (
          roles.length === 0 ? (
            <HrEmpty icon={ShieldCheck} title="لا توجد أدوار بعد — أضف أول دور وحدد صلاحياته">
              <button
                onClick={openAdd}
                className="h-9 px-4 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={15} />
                إضافة دور
              </button>
            </HrEmpty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {roles.map((role) => (
                <div key={role.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: HEX_RE.test(role.color) ? role.color : '#0F172A' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-[13px] truncate">{role.name}</div>
                      {role.name_ar && (
                        <div className="text-[11px] text-slate-400 truncate">{role.name_ar}</div>
                      )}
                    </div>
                    {role.is_system && (
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                        دور النظام
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    {role.full_access ? (
                      <HrStatusPill tone="amber">وصول كامل</HrStatusPill>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-bold">
                        {(role.permissions || []).length} وحدة محددة
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                      {role.users} موظف مرتبط
                    </span>
                    {!role.is_system && (
                      <div className="flex items-center gap-2">
                        <HrRowAction onClick={() => openEdit(role)} title="تعديل">
                          <Pencil size={14} />
                        </HrRowAction>
                        <HrRowAction onClick={() => handleDelete(role)} title="حذف" danger>
                          {deletingId === role.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </HrRowAction>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : logs.length === 0 ? (
          <HrEmpty icon={History} title="لا يوجد نشاط مسجل" />
        ) : (
          <HrTableCard
            columns={[
              { label: 'الوقت', className: 'col-span-3' },
              { label: 'المنفذ', className: 'col-span-3' },
              { label: 'الإجراء', className: 'col-span-3' },
              { label: 'الهدف', className: 'col-span-2' },
              { label: 'التفاصيل', className: 'col-span-1' },
            ]}
          >
            {logs.map((log) => (
              <HrRow key={log.id}>
                <div className="col-span-3 text-[12px] text-slate-600 tabular-nums">
                  {formatTime(log.timestamp)}
                </div>
                <div className="col-span-3 text-[13px] font-semibold text-slate-900 truncate">
                  {log.actor || '—'}
                </div>
                <div className="col-span-3 text-[13px] text-slate-600">
                  {log.action_ar || log.action || '—'}
                </div>
                <div className="col-span-2 text-[12px] text-slate-500 truncate">
                  {log.target || '—'}
                </div>
                <div className="col-span-1 text-[11px] text-slate-400 truncate">
                  {log.details_ar || log.details || '—'}
                </div>
              </HrRow>
            ))}
          </HrTableCard>
        )}
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title={editing ? 'تعديل دور' : 'إضافة دور'}
          subtitle="حدد اسم الدور وصلاحيات الوصول لكل وحدة"
          onClose={() => setModalOpen(false)}
          maxWidth="max-w-2xl"
        >
          {formError && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="اسم الدور" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={HR_INPUT_CLS}
                placeholder="مثال: Manager"
              />
            </HrField>
            <HrField label="الاسم بالعربية">
              <input
                type="text"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                className={HR_INPUT_CLS}
                placeholder="مثال: مدير"
              />
            </HrField>
          </div>
          <HrField label="لون التمييز">
            <select
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className={HR_INPUT_CLS}
            >
              {ROLE_COLORS.map((c) => (
                <option key={c.hex} value={c.hex}>
                  {c.label}
                </option>
              ))}
            </select>
          </HrField>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.fullAccess}
              onChange={(e) => setForm({ ...form, fullAccess: e.target.checked })}
              className="accent-slate-900 w-4 h-4"
            />
            <span className="text-[13px] font-bold text-slate-900">
              وصول كامل لكل الوحدات
              <span className="text-[11px] font-semibold text-slate-400 block">
                عند التفعيل تُتجاهل المصفوفة التالية
              </span>
            </span>
          </label>
          {!form.fullAccess && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">
                مصفوفة الصلاحيات — {matrixSummary} وحدة محددة
              </div>
              <div className="border border-slate-200 rounded-xl p-3 max-h-[40vh] overflow-y-auto space-y-2">
                {MODULES.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-[12px] font-bold text-slate-700">{m.label}</span>
                    <div className="flex items-center gap-3">
                      {ACTIONS.map((a) => (
                        <label
                          key={a.id}
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={(form.perms[m.id] || []).includes(a.id)}
                            onChange={() => togglePerm(m.id, a.id)}
                            className="accent-slate-900 h-3.5 w-3.5"
                          />
                          <span className="text-[11px] font-semibold text-slate-500">{a.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <HrModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'حفظ التعديلات' : 'إضافة الدور'}
            submitting={saving}
          />
        </HrModal>
      )}

      <HRGuideDrawer
        page="permissions"
        title="دليل صفحة الصلاحيات"
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}
