'use client';

/**
 * صفحة المهام — إسناد ومتابعة مهام الفريق (الأولوية والحالة وتاريخ الاستحقاق).
 * نفس الهيكل المعياري لبقية أقسام الداشبورد (هيدر أبيض + تابات + جدول grid-cols-12).
 * كل البيانات من الباكند عبر src/lib/api/hr.ts — بدون localStorage.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import { HRGuideDrawer } from '@/components/hr/HRGuideDrawer';
import {
  createTask,
  deleteTask,
  fetchEmployees,
  fetchTasks,
  updateTask,
  type HrEmployee,
  type HrTask,
  type HrTaskPriority,
  type HrTaskStatus,
} from '@/lib/api/hr';
import { downloadCsv } from '@/lib/csv';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const PRIMARY_BTN =
  'h-10 px-5 rounded-full bg-slate-900 text-white hover:bg-slate-700 text-[12px] font-bold flex items-center gap-1.5 transition-colors';
const SECONDARY_BTN =
  'h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors';

const today = () => new Date().toLocaleDateString('en-CA');

const PRIORITY_LABELS: Record<string, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'للتنفيذ',
  inProgress: 'جاري التنفيذ',
  done: 'منجزة',
};

type TaskForm = {
  title: string;
  assignee: string;
  priority: string;
  status: string;
  dueDate: string;
  description: string;
};

const emptyForm: TaskForm = {
  title: '',
  assignee: '',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
  description: '',
};

export default function HrTasksPage() {
  const { shop, loading: shopLoading } = useShop();
  const shopId = shop?.id || '';

  const [tasks, setTasks] = useState<HrTask[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusTab, setStatusTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [guideOpen, setGuideOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrTask | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!shopId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [list, empList] = await Promise.all([
          fetchTasks(shopId),
          fetchEmployees(shopId).catch(() => [] as HrEmployee[]),
        ]);
        setTasks(list);
        setEmployees(empList);
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل المهام');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [shopId]
  );

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusTab, priorityFilter, sortBy]);

  const isOverdue = useCallback(
    (t: HrTask) => Boolean(t.dueDate) && t.dueDate < today() && t.status !== 'done',
    []
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter((t) => t.status !== 'done').length;
    const overdue = tasks.filter(isOverdue).length;
    return { total, open, overdue };
  }, [tasks, isOverdue]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (statusTab !== 'all') list = list.filter((t) => t.status === statusTab);
    if (priorityFilter !== 'all') list = list.filter((t) => t.priority === priorityFilter);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.title, t.assignee, t.description].some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'oldest') return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    return list;
  }, [tasks, statusTab, priorityFilter, debouncedSearch, sortBy]);

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

  const openEdit = (task: HrTask) => {
    setEditing(task);
    setForm({
      title: task.title || '',
      assignee: task.assignee || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate || '',
      description: task.description || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError('العنوان مطلوب');
      return;
    }
    if (!shopId) return;
    setSaving(true);
    setFormError('');
    const payload = {
      title: form.title.trim(),
      assignee: form.assignee,
      priority: form.priority as HrTaskPriority,
      status: form.status as HrTaskStatus,
      dueDate: form.dueDate,
      description: form.description.trim(),
    };
    try {
      if (editing) await updateTask(shopId, editing.id, payload);
      else await createTask(shopId, payload);
      setModalOpen(false);
      await loadTasks(true);
    } catch (err: any) {
      setFormError(err?.message || 'فشل حفظ المهمة');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: HrTask, status: string) => {
    if (!shopId || status === task.status) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await updateTask(shopId, task.id, { status: status as HrTaskStatus });
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث حالة المهمة');
      await loadTasks(true);
    }
  };

  const handleDelete = async (task: HrTask) => {
    if (!shopId) return;
    if (!window.confirm(`هل أنت متأكد من حذف المهمة "${task.title}"؟`)) return;
    setDeletingId(task.id);
    try {
      await deleteTask(shopId, task.id);
      await loadTasks(true);
    } catch (err: any) {
      setError(err?.message || 'فشل حذف المهمة');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      `tasks-${today()}.csv`,
      ['العنوان', 'المسند إليه', 'الأولوية', 'الحالة', 'تاريخ الاستحقاق', 'الوصف'],
      filtered.map((t) => [
        t.title,
        t.assignee,
        PRIORITY_LABELS[String(t.priority)] || t.priority,
        STATUS_LABELS[String(t.status)] || t.status,
        t.dueDate,
        t.description,
      ])
    );
  };

  return (
    <>
      <HrPageShell
        title="المهام"
        subtitle={`مفتوحة: ${stats.open} — متأخرة: ${stats.overdue}`}
        onInfo={() => setGuideOpen(true)}
        actions={
          <>
            <button onClick={openAdd} className={PRIMARY_BTN}>
              <Plus size={15} />
              إضافة مهمة
            </button>
            <button onClick={handleExport} className={SECONDARY_BTN}>
              <Download size={15} />
              تصدير CSV
            </button>
            <button onClick={() => loadTasks(true)} className={SECONDARY_BTN}>
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              تحديث
            </button>
          </>
        }
        error={error || undefined}
        onDismissError={() => setError('')}
        tabs={[
          { id: 'all', label: 'الكل', count: stats.total },
          { id: 'todo', label: 'للتنفيذ', count: tasks.filter((t) => t.status === 'todo').length },
          { id: 'inProgress', label: 'جاري التنفيذ', count: tasks.filter((t) => t.status === 'inProgress').length },
          { id: 'done', label: 'منجزة', count: tasks.filter((t) => t.status === 'done').length },
        ]}
        activeTab={statusTab}
        onTabChange={setStatusTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث في المهام…"
        filters={
          <>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={HR_FILTER_SELECT_CLS}
            >
              <option value="all">كل الأولويات</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={HR_FILTER_SELECT_CLS}>
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="dueDate">تاريخ الاستحقاق</option>
            </select>
          </>
        }
        loading={loading || shopLoading}
        footer={
          <HrPagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            perPage={perPage}
            onPage={setPage}
            label="مهمة"
          />
        }
      >
        {filtered.length === 0 ? (
          <HrEmpty icon={ClipboardCheck} title="لا توجد مهام">
            <button
              onClick={openAdd}
              className="h-9 px-4 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus size={15} />
              إضافة مهمة
            </button>
          </HrEmpty>
        ) : (
          <HrTableCard
            columns={[
              { label: 'المهمة', className: 'col-span-4' },
              { label: 'المسند إليه', className: 'col-span-2' },
              { label: 'الأولوية', className: 'col-span-2' },
              { label: 'الاستحقاق', className: 'col-span-1' },
              { label: 'الحالة', className: 'col-span-2' },
              { label: 'إجراءات', className: 'col-span-1' },
            ]}
          >
            {paginated.map((task) => {
              const overdue = isOverdue(task);
              return (
                <HrRow key={task.id} muted={task.status === 'done'}>
                  <div className="col-span-4 min-w-0">
                    <div className="font-bold text-slate-900 text-[13px] truncate">{task.title}</div>
                    {task.description && (
                      <div className="text-[11px] text-slate-400 truncate">{task.description}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-[13px] text-slate-600 font-semibold">
                    {task.assignee || '—'}
                  </div>
                  <div className="col-span-2">
                    <HrStatusPill
                      tone={
                        task.priority === 'high' ? 'red' : task.priority === 'low' ? 'slate' : 'amber'
                      }
                    >
                      {PRIORITY_LABELS[String(task.priority)] || task.priority}
                    </HrStatusPill>
                  </div>
                  <div
                    className={`col-span-1 text-[12px] tabular-nums ${
                      overdue ? 'text-red-600 font-bold' : 'text-slate-500'
                    }`}
                    title={overdue ? 'متأخرة' : undefined}
                  >
                    {task.dueDate || '—'}
                  </div>
                  <div className="col-span-2">
                    <select
                      value={String(task.status || 'todo')}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className="h-8 px-2 rounded-full border border-slate-200 text-[11px] font-bold bg-white text-slate-700 focus:outline-none focus:border-slate-400"
                    >
                      <option value="todo">للتنفيذ</option>
                      <option value="inProgress">جاري التنفيذ</option>
                      <option value="done">منجزة</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center gap-2 justify-end">
                    <HrRowAction onClick={() => openEdit(task)} title="تعديل">
                      <Pencil size={14} />
                    </HrRowAction>
                    <HrRowAction onClick={() => handleDelete(task)} title="حذف" danger>
                      {deletingId === task.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </HrRowAction>
                  </div>
                </HrRow>
              );
            })}
          </HrTableCard>
        )}
      </HrPageShell>

      {modalOpen && (
        <HrModal
          title={editing ? 'تعديل مهمة' : 'إضافة مهمة'}
          subtitle={editing ? `تعديل: ${editing.title}` : 'حدد تفاصيل المهمة والمسند إليه'}
          onClose={() => setModalOpen(false)}
        >
          {formError && (
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold">
              {formError}
            </div>
          )}
          <HrField label="عنوان المهمة" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={HR_INPUT_CLS}
              placeholder="مثال: جرد المخزون الأسبوعي"
            />
          </HrField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="المسند إليه">
              <select
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className={HR_INPUT_CLS}
              >
                <option value="">غير مسند</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <span className="text-[11px] text-amber-600 font-bold mt-1 block">
                  أضف موظفين أولاً من صفحة الموظفين
                </span>
              )}
            </HrField>
            <HrField label="الأولوية">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className={HR_INPUT_CLS}
              >
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </HrField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HrField label="الحالة">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={HR_INPUT_CLS}
              >
                <option value="todo">للتنفيذ</option>
                <option value="inProgress">جاري التنفيذ</option>
                <option value="done">منجزة</option>
              </select>
            </HrField>
            <HrField label="تاريخ الاستحقاق">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={HR_INPUT_CLS}
                dir="ltr"
              />
            </HrField>
          </div>
          <HrField label="الوصف">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${HR_INPUT_CLS} h-auto py-3`}
              rows={3}
              placeholder="تفاصيل المهمة…"
            />
          </HrField>
          <HrModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'حفظ التعديلات' : 'إضافة المهمة'}
            submitting={saving}
          />
        </HrModal>
      )}

      <HRGuideDrawer
        page="tasks"
        title="دليل صفحة المهام"
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </>
  );
}
