'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MoreVertical, User, Trash2, ArrowLeftRight,
  RefreshCw, Shield, ChevronDown, ChevronUp, Eye, ShoppingBag,
  CheckCircle2, Wallet, CalendarDays, Pencil, Mail, Phone,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, FilterSelect,
  Pagination, AdminTable, TH, TD, TR, StatChip, Badge, fmtDate, formatEGP,
  Field, INPUT_CLASS, BTN_PRIMARY, BTN_SOFT, Spinner, type Tone,
} from '@/components/admin/ui';
import AdminModal from '@/components/admin/AdminModal';

const MotionDiv = motion.div as any;

const ROLE_TONE: Record<string, Tone> = { admin: 'red', merchant: 'cyan', customer: 'slate' };
const ROLE_LABEL: Record<string, string> = { admin: 'أدمن', merchant: 'تاجر', customer: 'عميل' };

const ORDER_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DELIVERED: { label: 'تم التوصيل', tone: 'green' },
  READY: { label: 'جاهز', tone: 'sky' },
  PREPARING: { label: 'قيد التحضير', tone: 'amber' },
  CONFIRMED: { label: 'مؤكد', tone: 'amber' },
  SHIPPED: { label: 'تم الشحن', tone: 'sky' },
  CANCELLED: { label: 'ملغي', tone: 'red' },
  REFUNDED: { label: 'مسترجع', tone: 'red' },
  PENDING: { label: 'قيد المراجعة', tone: 'amber' },
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // ملخص العميل الموسّع داخل الصف
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, any | null>>({});
  const [statsLoadingId, setStatsLoadingId] = useState<string | null>(null);

  // نافذة التفاصيل الكاملة
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const [detailsOrders, setDetailsOrders] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const loadUsers = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await apiRequest('/users?take=200');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'فشل تحميل المستخدمين', variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const ensureStats = async (userId: string) => {
    if (statsMap[userId] !== undefined || statsLoadingId === userId) return;
    setStatsLoadingId(userId);
    try {
      const data = await apiRequest(`/customers/${userId}/stats`);
      setStatsMap((m) => ({ ...m, [userId]: data || null }));
    } catch {
      setStatsMap((m) => ({ ...m, [userId]: null }));
    } finally {
      setStatsLoadingId(null);
    }
  };

  const toggleExpand = (userId: string) => {
    const next = expandedId === userId ? null : userId;
    setExpandedId(next);
    if (next) ensureStats(next);
  };

  const openDetails = async (user: any) => {
    setActiveMenu(null);
    setExpandedId(null);
    setDetailsUser(user);
    setEditing(false);
    setDetailsOrders([]);
    setEditForm({ name: String(user?.name || ''), phone: String(user?.phone || '') });
    ensureStats(user.id);
    setDetailsLoading(true);
    try {
      const data = await apiRequest(`/orders/admin?userId=${user.id}&limit=50`);
      setDetailsOrders(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'فشل تحميل طلبات العميل', variant: 'destructive' });
      setDetailsOrders([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!detailsUser) return;
    if (!editForm.name.trim()) {
      toast({ title: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await apiRequest(`/users/${detailsUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editForm.name.trim(), phone: editForm.phone.trim() }),
      });
      toast({ title: 'تم حفظ التعديلات', variant: 'success' });
      setEditing(false);
      setDetailsUser((u: any) => ({ ...u, name: editForm.name.trim(), phone: editForm.phone.trim() }));
      setUsers((list) => list.map((u) => (u.id === detailsUser.id ? { ...u, name: editForm.name.trim(), phone: editForm.phone.trim() } : u)));
      void updated;
      await loadUsers(true);
    } catch {
      toast({ title: 'فشل حفظ التعديلات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    try {
      await apiRequest(`/users/${userId}`, { method: 'DELETE' });
      toast({ title: 'تم حذف المستخدم', variant: 'success' });
      await loadUsers(true);
    } catch {
      toast({ title: 'فشل الحذف', variant: 'destructive' });
    }
    setActiveMenu(null);
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'customer' ? 'merchant' : 'customer';
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      toast({
        title: `تم تغيير الدور إلى: ${newRole === 'merchant' ? 'تاجر' : 'عميل'}`,
        variant: 'success',
      });
      await loadUsers(true);
    } catch {
      toast({ title: 'فشل تغيير الدور', variant: 'destructive' });
    }
    setActiveMenu(null);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = !searchTerm ||
        String(user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || String(user?.role || '').toLowerCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const paginatedUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const roleStats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => String(u?.role || '').toLowerCase() === 'admin').length,
    merchants: users.filter((u) => String(u?.role || '').toLowerCase() === 'merchant').length,
    customers: users.filter((u) => String(u?.role || '').toLowerCase() === 'customer').length,
  }), [users]);

  const summaryCards = (userId: string) => {
    const stats = statsMap[userId];
    const loading = statsLoadingId === userId;
    if (loading) {
      return (
        <div className="flex items-center justify-center gap-3 py-8 text-slate-500 text-sm font-bold">
          <Spinner size={16} /> جاري تحميل ملخص العميل...
        </div>
      );
    }
    if (!stats) {
      return (
        <div className="py-6 text-center text-slate-400 text-xs font-bold">
          لا توجد إحصائيات متاحة لهذا العميل
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
          <ShoppingBag size={16} className="mx-auto mb-1.5 text-indigo-500" />
          <div className="text-slate-500 text-[10px] font-black">إجمالي الطلبات</div>
          <div className="mt-1 text-xl font-black text-slate-900 tabular-nums">{Number(stats.total_orders || 0).toLocaleString('ar-EG')}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
          <CheckCircle2 size={16} className="mx-auto mb-1.5 text-emerald-500" />
          <div className="text-slate-500 text-[10px] font-black">الطلبات المكتملة</div>
          <div className="mt-1 text-xl font-black text-emerald-600 tabular-nums">{Number(stats.completed_orders || 0).toLocaleString('ar-EG')}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
          <Wallet size={16} className="mx-auto mb-1.5 text-cyan-500" />
          <div className="text-slate-500 text-[10px] font-black">إجمالي المصروفات</div>
          <div className="mt-1 text-xl font-black text-cyan-700 tabular-nums">{formatEGP(stats.total_spent)}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
          <CalendarDays size={16} className="mx-auto mb-1.5 text-amber-500" />
          <div className="text-slate-500 text-[10px] font-black">آخر طلب</div>
          <div className="mt-1 text-xs font-black text-slate-700">{stats.last_order_at ? fmtDate(stats.last_order_at) : 'لا يوجد'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="إدارة المستخدمين"
        subtitle="عرض وإدارة جميع مستخدمي المنصة"
        tone="purple"
        actions={isRefreshing ? <RefreshCw size={16} className="text-cyan-600 animate-spin" /> : undefined}
        stats={
          <>
            <StatChip label="الإجمالي" value={roleStats.total} />
            <StatChip label="أدمن" value={roleStats.admins} tone="red" />
            <StatChip label="تجار" value={roleStats.merchants} tone="cyan" />
            <StatChip label="عملاء" value={roleStats.customers} tone="indigo" />
          </>
        }
      />

      <Panel>
        <div className="flex flex-col md:flex-row gap-3 p-5 border-b border-slate-100">
          <SearchInput
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setPage(0); }}
            placeholder="ابحث بالاسم أو البريد..."
          />
          <FilterSelect
            value={roleFilter}
            onChange={(v) => { setRoleFilter(v); setPage(0); setExpandedId(null); }}
            options={[
              { value: 'all', label: 'كل الأدوار' },
              { value: 'admin', label: 'أدمن' },
              { value: 'merchant', label: 'تاجر' },
              { value: 'customer', label: 'عميل' },
            ]}
          />
        </div>

        {loading ? (
          <LoadingBlock />
        ) : paginatedUsers.length === 0 ? (
          <EmptyState icon={User} title="لا توجد نتائج" />
        ) : (
          <AdminTable
            head={
              <>
                <th className={TH + ' w-10'}></th>
                <th className={TH}>المستخدم</th>
                <th className={TH}>الدور</th>
                <th className={TH}>البريد</th>
                <th className={TH}>تاريخ الانضمام</th>
                <th className={TH + ' text-left'}>تحكم</th>
              </>
            }
          >
            {paginatedUsers.map((user) => {
              const role = String(user?.role || '').toLowerCase();
              const isCustomer = role === 'customer';
              const isExpanded = expandedId === user.id;
              return (
                <React.Fragment key={user.id}>
                  <tr className={TR + (isExpanded ? ' bg-slate-50/70' : '')}>
                    <td className={TD + ' text-center'}>
                      {isCustomer ? (
                        <button
                          onClick={() => toggleExpand(user.id)}
                          title={isExpanded ? 'إغلاق الملخص' : 'ملخص العميل'}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-cyan-600 border border-slate-200">
                          {String(user?.name || '?').charAt(0)}
                        </div>
                        <span className="text-slate-900 font-bold">{user?.name || '-'}</span>
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge tone={ROLE_TONE[role] || 'slate'}>{ROLE_LABEL[role] || role || '-'}</Badge>
                    </td>
                    <td className={TD + ' text-slate-500 text-sm font-medium'}>{user?.email || '-'}</td>
                    <td className={TD + ' text-slate-500 text-xs font-bold'}>{fmtDate(user?.createdAt)}</td>
                    <td className={TD + ' relative text-left'}>
                      <button
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {activeMenu === user.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <MotionDiv
                              initial={{ opacity: 0, scale: 0.9, x: -10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: -10 }}
                              className="absolute left-12 top-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => openDetails(user)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                              >
                                عرض التفاصيل الكاملة
                                <Eye size={14} className="text-purple-600" />
                              </button>
                              {role !== 'admin' && (
                                <button
                                  onClick={() => handleChangeRole(user.id, role)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border-t border-slate-100"
                                >
                                  {role === 'customer' ? 'ترقية إلى تاجر' : 'خفض إلى عميل'}
                                  <ArrowLeftRight size={14} className="text-cyan-600" />
                                </button>
                              )}
                              {role !== 'admin' && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-red-50 text-red-600 text-xs font-bold transition-all border-t border-slate-100"
                                >
                                  حذف نهائي
                                  <Trash2 size={14} />
                                </button>
                              )}
                              {role === 'admin' && (
                                <div className="p-4 text-slate-500 text-xs font-bold flex items-center gap-2">
                                  <Shield size={14} /> لا يمكن تعديل الأدمن
                                </div>
                              )}
                            </MotionDiv>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>

                  {/* الصف الموسّع: ملخص سريع عن العميل */}
                  {isCustomer && isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={6} className="p-5 border-b border-slate-100">
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black text-slate-500">
                              ملخص سريع — {user?.name}
                            </span>
                            <button
                              onClick={() => openDetails(user)}
                              className={BTN_SOFT}
                            >
                              <Eye size={14} />
                              عرض التفاصيل الكاملة
                            </button>
                          </div>
                          {summaryCards(user.id)}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </AdminTable>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredUsers.length}
          unit="مستخدم"
          onPage={(p) => { setPage(p); setExpandedId(null); }}
        />
      </Panel>

      {/* نافذة تفاصيل العميل الكاملة */}
      <AdminModal
        isOpen={!!detailsUser}
        onClose={() => { setDetailsUser(null); setEditing(false); }}
        title="تفاصيل العميل"
        size="xl"
      >
        {detailsUser && (
          <div className="space-y-6">
            {/* بطاقة العميل */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-gradient-to-l from-purple-50 to-cyan-50 rounded-2xl p-5 border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl font-black text-purple-600 shadow-sm shrink-0">
                {String(detailsUser?.name || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-lg font-black text-slate-900">{detailsUser?.name || '-'}</h4>
                  <Badge tone={ROLE_TONE[String(detailsUser?.role || '').toLowerCase()] || 'slate'}>
                    {ROLE_LABEL[String(detailsUser?.role || '').toLowerCase()] || detailsUser?.role}
                  </Badge>
                </div>
                <p className="text-slate-500 text-xs font-bold mt-1 flex items-center gap-1.5">
                  <Mail size={12} /> {detailsUser?.email || '-'}
                </p>
              </div>
              <button
                onClick={() => setEditing((e) => !e)}
                className={editing ? BTN_SOFT : BTN_PRIMARY}
              >
                <Pencil size={14} />
                {editing ? 'إلغاء التعديل' : 'تعديل'}
              </button>
            </div>

            {/* بيانات العميل */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black text-slate-400 mb-1">رقم الهاتف</div>
                <div className="text-sm font-black text-slate-800 flex items-center gap-1.5" dir="ltr">
                  <Phone size={13} className="text-slate-400" />
                  {detailsUser?.phone ? String(detailsUser.phone) : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black text-slate-400 mb-1">تاريخ الانضمام</div>
                <div className="text-xs font-black text-slate-800">{fmtDate(detailsUser?.createdAt)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black text-slate-400 mb-1">آخر دخول</div>
                <div className="text-xs font-black text-slate-800">{detailsUser?.lastLogin ? fmtDate(detailsUser.lastLogin) : 'لم يسجل الدخول'}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black text-slate-400 mb-1">حالة الحساب</div>
                <div className="text-xs font-black">
                  {detailsUser?.isActive !== false
                    ? <Badge tone="green">نشط</Badge>
                    : <Badge tone="red">موقوف</Badge>}
                </div>
              </div>
            </div>

            {/* نموذج التعديل */}
            {editing && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 space-y-4">
                <h5 className="text-sm font-black text-slate-900">تعديل بيانات العميل</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="الاسم">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="اسم العميل"
                    />
                  </Field>
                  <Field label="رقم الهاتف">
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className={INPUT_CLASS}
                      placeholder="رقم الهاتف"
                      dir="ltr"
                    />
                  </Field>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className={BTN_PRIMARY}>
                    {saving ? <Spinner size={14} className="text-white" /> : null}
                    حفظ التعديلات
                  </button>
                  <button onClick={() => setEditing(false)} className={BTN_SOFT}>إلغاء</button>
                </div>
              </div>
            )}

            {/* إحصائيات العميل */}
            {String(detailsUser?.role || '').toLowerCase() === 'customer' && (
              <div>
                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">إحصائيات الشراء</h5>
                {summaryCards(detailsUser.id)}
              </div>
            )}

            {/* سجل الطلبات */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  سجل الطلبات {detailsOrders.length > 0 && `(${detailsOrders.length})`}
                </h5>
              </div>
              {detailsLoading ? (
                <div className="flex items-center justify-center gap-3 py-10 text-slate-500 text-sm font-bold">
                  <Spinner size={16} /> جاري تحميل الطلبات...
                </div>
              ) : detailsOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <ShoppingBag size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-xs font-bold">لا توجد طلبات لهذا العميل</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse min-w-[560px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className={TH}>رقم الطلب</th>
                          <th className={TH}>التاريخ</th>
                          <th className={TH}>الحالة</th>
                          <th className={TH + ' text-left'}>الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsOrders.map((order) => {
                          const meta = ORDER_STATUS_META[String(order?.status || '').toUpperCase()] || ORDER_STATUS_META.PENDING;
                          return (
                            <tr key={order.id} className={TR}>
                              <td className={TD + ' font-black text-slate-900 text-xs'}>#{String(order.id || '').slice(0, 8)}</td>
                              <td className={TD + ' text-slate-500 text-xs font-bold'}>{fmtDate(order?.createdAt)}</td>
                              <td className={TD}><Badge tone={meta.tone}>{meta.label}</Badge></td>
                              <td className={TD + ' text-left text-cyan-700 font-black text-sm'}>{formatEGP(order?.total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
