'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Truck, Users, UserPlus, Check, X, Eye, Phone, Mail,
  MapPin, ShieldCheck, ShieldOff, Clock3, PackageCheck,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import AdminModal from '@/components/admin/AdminModal';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, Spinner,
  AdminTable, TH, TD, TR, Badge, TabBar, StatChip, Field, INPUT_CLASS,
  BTN_PRIMARY, BTN_GHOST, BTN_SUCCESS, BTN_DANGER_SOFT, BTN_SOFT,
  fmtDate, formatEGP,
} from '@/components/admin/ui';

type TabKey = 'couriers' | 'pending' | 'create';

function AdminDeliveryContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<TabKey>('couriers');
  const [couriers, setCouriers] = useState<any[]>([]);
  const [pendingCouriers, setPendingCouriers] = useState<any[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [search, setSearch] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [actionId, setActionId] = useState('');

  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCouriers = async (silent = false) => {
    if (!silent) setLoadingCouriers(true);
    try {
      const data = await apiRequest('/couriers');
      setCouriers(Array.isArray(data) ? data : []);
    } catch { setCouriers([]); }
    finally { if (!silent) setLoadingCouriers(false); }
  };

  const loadPendingCouriers = async (silent = false) => {
    if (!silent) setLoadingPending(true);
    try {
      const data = await apiRequest('/couriers/pending');
      setPendingCouriers(Array.isArray(data) ? data : []);
    } catch { setPendingCouriers([]); }
    finally { if (!silent) setLoadingPending(false); }
  };

  useEffect(() => {
    loadCouriers();
    loadPendingCouriers();
  }, []);

  useEffect(() => {
    const t = String(searchParams?.get('tab') || '').trim().toLowerCase();
    if (t === 'couriers' || t === 'pending' || t === 'create') setTab(t as TabKey);
  }, [searchParams]);

  const filteredCouriers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter((c) =>
      [c?.name, c?.email, c?.phone].map((x) => String(x || '').toLowerCase()).join(' ').includes(q)
    );
  }, [couriers, search]);

  const openCourierDetails = async (courier: any) => {
    setSelectedCourier(courier);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const data = await apiRequest(`/couriers/${courier?.id || ''}/admin-details`);
      setDetails(data || null);
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل تحميل التفاصيل'), variant: 'destructive' });
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await apiRequest(`/couriers/${id}/approve`, { method: 'POST' });
      toast({ title: 'تم قبول المندوب', variant: 'success' });
      await Promise.all([loadCouriers(true), loadPendingCouriers(true)]);
      if (selectedCourier?.id === id) {
        setDetails((prev: any) => prev ? ({ ...prev, courier: { ...prev.courier, isActive: true } }) : prev);
      }
    } catch { toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' }); }
    finally { setActionId(''); }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await apiRequest(`/couriers/${id}/reject`, { method: 'POST' });
      toast({ title: 'تم رفض المندوب', variant: 'success' });
      await loadPendingCouriers(true);
      if (selectedCourier?.id === id) {
        setDetailsOpen(false);
        setDetails(null);
        setSelectedCourier(null);
      }
    } catch { toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' }); }
    finally { setActionId(''); }
  };

  const handleSetCourierStatus = async (id: string, isActive: boolean) => {
    try {
      setActionId(id);
      await apiRequest(`/couriers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      toast({ title: isActive ? 'تم تفعيل المندوب' : 'تم إيقاف المندوب', variant: 'success' });
      await loadCouriers(true);
      if (selectedCourier?.id === id) {
        const data = await apiRequest(`/couriers/${id}/admin-details`);
        setDetails(data || null);
      }
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل العملية'), variant: 'destructive' });
    } finally { setActionId(''); }
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await apiRequest('/couriers', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          ...(createPhone.trim() ? { phone: createPhone.trim() } : {}),
        }),
      });
      setCreateName(''); setCreateEmail(''); setCreatePhone(''); setCreatePassword('');
      toast({ title: 'تم إنشاء المندوب', variant: 'success' });
      setTab('couriers');
      await loadCouriers(true);
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل إنشاء المندوب'), variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const selectedCourierData = details?.courier || selectedCourier;
  const state = details?.state || null;
  const stats = details?.stats || {};
  const recentOrders = Array.isArray(details?.recentOrders) ? details.recentOrders : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Truck}
        title="إدارة التوصيل"
        subtitle="إدارة المندوبين وطلبات الانضمام"
        tone="cyan"
        actions={
          <TabBar
            tabs={[
              { id: 'couriers', label: 'المندوبون', icon: Users },
              { id: 'pending', label: 'الطلبات المعلقة', icon: Check, badge: pendingCouriers.length },
              { id: 'create', label: 'إنشاء مندوب', icon: UserPlus },
            ]}
            active={tab}
            onChange={(id) => setTab(id as TabKey)}
          />
        }
      />

      {tab === 'couriers' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="ابحث بالاسم، البريد، الهاتف..."
            />
            <div className="flex gap-2">
              <StatChip label="الإجمالي" value={couriers.length} />
              <StatChip label="نشط" value={couriers.filter((c) => c?.isActive).length} tone="green" />
              <StatChip label="موقوف" value={couriers.filter((c) => !c?.isActive).length} tone="amber" />
            </div>
          </div>

          <Panel>
            {loadingCouriers ? (
              <LoadingBlock />
            ) : filteredCouriers.length === 0 ? (
              <EmptyState icon={Users} title="لا يوجد مندوبون" />
            ) : (
              <AdminTable
                minW="min-w-[980px]"
                head={
                  <>
                    <th className={TH}>المندوب</th>
                    <th className={TH}>التواصل</th>
                    <th className={TH}>تاريخ الإنشاء</th>
                    <th className={TH}>الحالة</th>
                    <th className={TH}>إجراءات</th>
                  </>
                }
              >
                {filteredCouriers.map((c) => (
                  <tr key={String(c?.id)} className={TR}>
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-cyan-600 font-black">
                          {String(c?.name || 'C').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-slate-900 font-black">{c?.name || 'مندوب'}</div>
                          <div className="text-slate-400 text-xs font-bold truncate">#{String(c?.id || '').slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className={TD + ' text-slate-700 text-sm font-bold'}>
                      <div>{c?.email || '-'}</div>
                      <div className="text-slate-400 mt-1">{c?.phone || '-'}</div>
                    </td>
                    <td className={TD + ' text-slate-500 text-sm font-bold'}>{fmtDate(c?.createdAt)}</td>
                    <td className={TD}>
                      <Badge tone={c?.isActive ? 'green' : 'amber'}>{c?.isActive ? 'نشط' : 'موقوف'}</Badge>
                    </td>
                    <td className={TD}>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openCourierDetails(c)}
                          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          disabled={actionId === String(c?.id)}
                          onClick={() => handleSetCourierStatus(String(c?.id), !Boolean(c?.isActive))}
                          className={c?.isActive ? BTN_GHOST : BTN_SUCCESS}
                        >
                          {c?.isActive ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </Panel>
        </div>
      )}

      {tab === 'pending' && (
        <Panel>
          {loadingPending ? (
            <LoadingBlock />
          ) : pendingCouriers.length === 0 ? (
            <EmptyState icon={Truck} title="لا توجد طلبات معلقة" />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-6">
              {pendingCouriers.map((c) => (
                <div
                  key={String(c?.id)}
                  className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-5 flex-row-reverse">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-cyan-600 text-2xl">
                      {String(c?.name || 'C').charAt(0)}
                    </div>
                    <div className="text-right">
                      <h4 className="text-xl font-black text-slate-900">{c?.name || 'مندوب'}</h4>
                      <div className="text-slate-500 text-xs font-bold mt-1">{c?.email}</div>
                      {c?.phone && <div className="text-slate-400 text-xs font-bold mt-1">{c.phone}</div>}
                      <div className="text-slate-400 text-[11px] font-bold mt-2">تاريخ الطلب: {fmtDate(c?.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => openCourierDetails(c)} className={BTN_SOFT + ' px-5 py-3'}>
                      <Eye size={18} /> عرض التفاصيل
                    </button>
                    <button
                      disabled={actionId === String(c?.id)}
                      onClick={() => handleApprove(String(c.id))}
                      className={BTN_SUCCESS + ' px-6 py-3'}
                    >
                      <Check size={18} /> قبول
                    </button>
                    <button
                      disabled={actionId === String(c?.id)}
                      onClick={() => handleReject(String(c.id))}
                      className={BTN_DANGER_SOFT + ' px-6 py-3'}
                    >
                      <X size={18} /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'create' && (
        <Panel padded>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><UserPlus size={22} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">إنشاء مندوب جديد</h3>
              <p className="text-slate-500 text-sm font-bold">أضف مندوب توصيل جديد للمنصة</p>
            </div>
          </div>
          <form onSubmit={handleCreateCourier} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الاسم">
                <input
                  required
                  type="text"
                  disabled={creating}
                  className={INPUT_CLASS}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="اسم المندوب"
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <input
                  required
                  type="email"
                  disabled={creating}
                  className={INPUT_CLASS}
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="رقم الهاتف">
                <input
                  type="text"
                  disabled={creating}
                  className={INPUT_CLASS}
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                />
              </Field>
              <Field label="كلمة المرور">
                <input
                  required
                  type="password"
                  disabled={creating}
                  className={INPUT_CLASS}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="كلمة المرور"
                />
              </Field>
            </div>
            <button disabled={creating} className={BTN_PRIMARY + ' px-8 py-4 text-sm'}>
              {creating ? 'جاري الإنشاء...' : 'إنشاء المندوب'}
            </button>
          </form>
        </Panel>
      )}

      <AdminModal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="تفاصيل المندوب" size="xl">
        {detailsLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : selectedCourierData ? (
          <div className="space-y-5 text-right">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-right">
                    <h3 className="text-2xl font-black text-slate-900">{selectedCourierData?.name || 'مندوب'}</h3>
                    <div className="mt-2 space-y-2 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2 justify-end"><Mail size={14} className="text-slate-400" /> {selectedCourierData?.email || '-'}</div>
                      <div className="flex items-center gap-2 justify-end"><Phone size={14} className="text-slate-400" /> {selectedCourierData?.phone || '-'}</div>
                      <div className="flex items-center gap-2 justify-end"><Clock3 size={14} className="text-slate-400" /> آخر دخول: {fmtDate(selectedCourierData?.lastLogin)}</div>
                      <div className="flex items-center gap-2 justify-end"><Users size={14} className="text-slate-400" /> تاريخ الإنشاء: {fmtDate(selectedCourierData?.createdAt)}</div>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-3xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black text-2xl">
                    {String(selectedCourierData?.name || 'C').charAt(0)}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 justify-end">
                  <Badge tone={selectedCourierData?.isActive ? 'green' : 'amber'}>
                    {selectedCourierData?.isActive ? 'الحساب نشط' : 'الحساب موقوف'}
                  </Badge>
                  {state && (
                    <Badge tone={state?.isAvailable ? 'sky' : 'slate'}>
                      {state?.isAvailable ? 'متاح الآن' : 'غير متاح'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-right">
                <div className="text-slate-500 text-xs font-black">إجراءات سريعة</div>
                <div className="mt-4 space-y-3">
                  {!selectedCourierData?.isActive ? (
                    <button
                      disabled={actionId === String(selectedCourierData?.id)}
                      onClick={() => handleSetCourierStatus(String(selectedCourierData?.id), true)}
                      className={BTN_SUCCESS + ' w-full px-4 py-3'}
                    >
                      <ShieldCheck size={16} /> تفعيل المندوب
                    </button>
                  ) : (
                    <button
                      disabled={actionId === String(selectedCourierData?.id)}
                      onClick={() => handleSetCourierStatus(String(selectedCourierData?.id), false)}
                      className={BTN_GHOST + ' w-full px-4 py-3'}
                    >
                      <ShieldOff size={16} /> إيقاف مؤقت
                    </button>
                  )}
                  {!selectedCourierData?.isActive && pendingCouriers.some((x) => String(x?.id) === String(selectedCourierData?.id)) && (
                    <button
                      disabled={actionId === String(selectedCourierData?.id)}
                      onClick={() => handleApprove(String(selectedCourierData?.id))}
                      className={BTN_SUCCESS + ' w-full px-4 py-3'}
                    >
                      <Check size={16} /> قبول الطلب
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ['إجمالي الطلبات', stats.totalOrders || 0],
                ['طلبات نشطة', stats.activeOrders || 0],
                ['تم التوصيل', stats.deliveredOrders || 0],
                ['ملغي', stats.cancelledOrders || 0],
                ['الإيرادات', formatEGP(stats.deliveredRevenue || 0)],
              ].map(([label, value]: any) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-slate-500 text-[11px] font-black">{label}</div>
                  <div className="mt-2 text-slate-900 text-xl font-black">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-right">
                <div className="flex items-center gap-2 justify-end text-slate-900 font-black"><MapPin size={16} /> حالة الموقع</div>
                <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                  <div className="flex justify-between gap-3"><span className="text-slate-500">آخر ظهور</span><span>{fmtDate(state?.lastSeenAt)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">خط العرض</span><span>{state?.lastLat ?? '-'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">خط الطول</span><span>{state?.lastLng ?? '-'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">الدقة</span><span>{state?.accuracy != null ? `${state.accuracy}m` : '-'}</span></div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-right">
                <div className="flex items-center gap-2 justify-end text-slate-900 font-black"><PackageCheck size={16} /> الطلبات الأخيرة</div>
                <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {recentOrders.length === 0 ? (
                    <div className="text-slate-500 font-bold text-sm">لا توجد طلبات مرتبطة</div>
                  ) : recentOrders.map((order: any) => (
                    <div key={String(order?.id)} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-right min-w-0">
                          <div className="text-slate-900 font-black">طلب #{String(order?.id || '').slice(0, 8).toUpperCase()}</div>
                          <div className="text-slate-500 text-xs font-bold mt-1">
                            {order?.shop?.name || 'متجر'}{order?.customer?.name ? ` • ${order.customer.name}` : ''}
                          </div>
                          <div className="text-slate-400 text-[11px] font-bold mt-1">{fmtDate(order?.createdAt)}</div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-cyan-700 font-black">{formatEGP(order?.total)}</div>
                          <div className="text-[11px] text-slate-500 font-bold mt-1">{String(order?.status || '-').toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 font-bold text-center py-16">لا توجد بيانات</div>
        )}
      </AdminModal>
    </div>
  );
}

export default function AdminDeliveryPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminDeliveryContent />
    </Suspense>
  );
}
