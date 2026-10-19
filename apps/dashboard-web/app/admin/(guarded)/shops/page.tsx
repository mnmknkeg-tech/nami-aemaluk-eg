'use client';

import React, { Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Store, Eye, Edit, Check, X, ExternalLink,
  MapPin, Phone, Mail, Globe, Ban, ShieldCheck, Truck, LayoutGrid,
  MessageCircle, Lock, Unlock, RefreshCw, Sparkles, CheckCircle2,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import AdminModal from '@/components/admin/AdminModal';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, FilterSelect,
  Pagination, AdminTable, TH, TD, TR, StatChip, Badge, Spinner, TabBar,
  BTN_SUCCESS, BTN_DANGER_SOFT, BTN_SOFT,
  fmtDate, formatEGP, timeAgo, type Tone,
} from '@/components/admin/ui';
import { cn } from '@/lib/cn';

type StatusKey = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type ShopsTab = 'all' | 'new';

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  APPROVED: { label: 'نشط', tone: 'green' },
  REJECTED: { label: 'مرفوض', tone: 'red' },
  SUSPENDED: { label: 'معلّق إدارياً', tone: 'purple' },
  PENDING: { label: 'قيد المراجعة', tone: 'amber' },
};

function ShopsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<ShopsTab>('all');

  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [pendingShops, setPendingShops] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState<StatusKey>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [selectedShopDetails, setSelectedShopDetails] = useState<any>(null);
  const [actionId, setActionId] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // ── تبويب المتاجر الجديدة ──
  const [newShops, setNewShops] = useState<any[]>([]);
  const [newLoading, setNewLoading] = useState(false);
  const [newLoaded, setNewLoaded] = useState(false);
  const [daysFilter, setDaysFilter] = useState<'3' | '7' | '30' | 'all'>('3');

  useEffect(() => {
    const t = String(searchParams?.get('tab') || '').trim().toLowerCase();
    if (t === 'new' || t === 'all') setTab(t as ShopsTab);
  }, [searchParams]);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allS, p] = await Promise.all([
        apiRequest('/shops?status=all').catch(() => []),
        apiRequest('/shops/pending').catch(() => []),
      ]);
      setShops(Array.isArray(allS) ? allS : []);
      setPendingShops(Array.isArray(p) ? p : []);
    } catch {
      if (!silent) {
        toast({ title: 'فشل تحميل المتاجر', variant: 'destructive' });
        setShops([]);
        setPendingShops([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  // قائمة المتاجر الجديدة: بتُحمَّل أول مرة يفتح فيها المستخدم التبويب فقط
  const loadNewShops = useCallback(async (silent = false) => {
    if (!silent) setNewLoading(true);
    try {
      const data = await apiRequest('/shops/admin?status=all&take=200');
      setNewShops(Array.isArray(data) ? data : (data?.items || []));
    } catch (err: any) {
      if (!silent) toast({ title: `فشل تحميل المتاجر: ${err?.message || 'خطأ غير معروف'}`, variant: 'destructive' });
    } finally {
      if (!silent) setNewLoading(false);
      setNewLoaded(true);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (tab === 'new' && !newLoaded) loadNewShops();
  }, [tab, newLoaded, loadNewShops]);

  const refreshAll = useCallback(async (id?: string) => {
    await loadData(true);
    if (newLoaded) await loadNewShops(true);
    if (id && selectedShop?.id === id) {
      const refreshed = await apiRequest(`/shops/admin/${id}`);
      setSelectedShopDetails(refreshed);
    }
  }, [loadData, loadNewShops, newLoaded, selectedShop]);

  const getShopDeliveryFee = (shop: any): number | null => {
    const raw = shop?.layoutConfig?.deliveryFee;
    const n = typeof raw === 'number' ? raw : raw == null ? NaN : Number(raw);
    return Number.isNaN(n) || n < 0 ? null : n;
  };

  const getEnabledModulesCount = (shop: any) =>
    Array.isArray(shop?.layoutConfig?.enabledModules) ? shop.layoutConfig.enabledModules.length : 0;

  const editShopDeliveryFee = async (shop: any) => {
    try {
      const current = getShopDeliveryFee(shop);
      const raw = window.prompt('رسوم التوصيل (ج.م):', current != null ? String(current) : '');
      if (raw == null) return;
      const fee = Number(String(raw).trim());
      if (Number.isNaN(fee) || fee < 0) return;
      await apiRequest(`/shops/${shop.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryFee: fee }),
      });
      toast({ title: 'تم تحديث رسوم التوصيل', variant: 'success' });
      await refreshAll(shop.id);
    } catch {
      toast({ title: 'فشل تحديث رسوم التوصيل', variant: 'destructive' });
    }
  };

  const handleApprovalAction = async (id: string, action: 'approved' | 'rejected' | 'pending') => {
    try {
      setActionId(id);
      await apiRequest(`/shops/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action }),
      });
      toast({
        title: action === 'approved' ? 'تم قبول المتجر' : action === 'rejected' ? 'تم رفض المتجر' : 'تم الإرجاع للمراجعة',
        variant: 'success',
      });
      await refreshAll(id);
    } catch {
      toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' });
    } finally {
      setActionId('');
    }
  };

  const handleSuspendToggle = async (shop: any, nextStatus: 'approved' | 'suspended') => {
    try {
      setActionId(String(shop?.id || ''));
      await apiRequest(`/shops/${shop?.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast({
        title: nextStatus === 'approved' ? 'تم إعادة تفعيل المتجر' : 'تم تعليق المتجر',
        variant: 'success',
      });
      await refreshAll(String(shop?.id || ''));
    } catch {
      toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' });
    } finally {
      setActionId('');
    }
  };

  // قفل/فتح متجر من تبويب الجديد (نفس عملية التعليق/التفعيل)
  const toggleLock = async (shop: any) => {
    const current = String(shop?.status || '').toUpperCase();
    const next = current === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';
    setActionId(String(shop?.id || ''));
    try {
      await apiRequest(`/shops/${shop?.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast({
        title: next === 'SUSPENDED' ? `تم قفل "${shop?.name}" — التاجر مش هيقدر يدخل` : `تم فتح "${shop?.name}" ورجوع تفعيله`,
        variant: 'success',
      });
      await refreshAll(String(shop?.id || ''));
    } catch (err: any) {
      toast({ title: `فشل تنفيذ العملية: ${err?.message || 'خطأ'}`, variant: 'destructive' });
    } finally {
      setActionId('');
    }
  };

  const toggleFlag = async (shop: any, key: 'publicDisabled' | 'deliveryDisabled', nextValue: boolean) => {
    try {
      setActionId(String(shop?.id || ''));
      await apiRequest(`/shops/${shop?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [key]: nextValue }),
      });
      toast({
        title: key === 'publicDisabled' ? 'تم تحديث الظهور العام' : 'تم تحديث حالة التوصيل',
        variant: 'success',
      });
      await refreshAll(String(shop?.id || ''));
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل الحفظ'), variant: 'destructive' });
    } finally {
      setActionId('');
    }
  };

  const toggleShopActive = async (shop: any, nextActive: boolean) => {
    const id = String(shop?.id || '').trim();
    if (!id) return;
    const name = String(shop?.name || '').trim() || 'المتجر';
    const ok = window.confirm(
      nextActive ? `هل تريد إعادة تفعيل "${name}"؟` : `هل تريد تعطيل "${name}" من التطبيق؟`,
    );
    if (!ok) return;
    try {
      setActionId(id);
      await apiRequest(`/shops/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
      toast({
        title: nextActive ? 'تم إعادة التفعيل' : 'تم التعطيل',
        variant: 'success',
      });
      await refreshAll(id);
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل تنفيذ العملية'), variant: 'destructive' });
    } finally {
      setActionId('');
    }
  };

  const openShopDetails = async (shop: any) => {
    setSelectedShop(shop);
    setSelectedShopDetails(null);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const data = await apiRequest(`/shops/admin/${shop?.id || ''}`);
      setSelectedShopDetails(data || null);
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل تحميل التفاصيل'), variant: 'destructive' });
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── بيانات تبويب "كل المتاجر" ──
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        [shop?.name, shop?.email, shop?.phone, shop?.city, shop?.governorate, shop?.slug]
          .some((x) => String(x || '').toLowerCase().includes(q));
      const matchesStatus = shopStatusFilter === 'all' || String(shop?.status || '').toUpperCase() === shopStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shops, searchTerm, shopStatusFilter]);

  const paginatedShops = filteredShops.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredShops.length / pageSize);

  // ── بيانات تبويب "المتاجر الجديدة" (الأحدث أولاً) ──
  const filteredNewShops = useMemo(() => {
    return newShops
      .filter((s) => {
        const createdAt = s?.createdAt ? new Date(String(s.createdAt)) : null;
        if (daysFilter !== 'all' && createdAt) {
          const days = (Date.now() - createdAt.getTime()) / 86400000;
          if (days > Number(daysFilter)) return false;
        }
        if (!searchTerm) return true;
        const q = searchTerm.trim().toLowerCase();
        return (
          String(s?.name || '').toLowerCase().includes(q) ||
          String(s?.phone || '').includes(q) ||
          String(s?.owner_email || s?.ownerEmail || s?.owner?.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(String(b?.createdAt || 0)).getTime() - new Date(String(a?.createdAt || 0)).getTime());
  }, [newShops, daysFilter, searchTerm]);

  // رقم المالك الحقيقي من حساب التسجيل، ولو مش موجود رقم المتجر
  const ownerPhone = (s: any) => {
    const raw = String(s?.owner?.phone || s?.owner_phone || s?.phone || '');
    const digits = raw.replace(/[^\d+]/g, '');
    if (!digits) return '';
    if (digits.startsWith('+')) return digits;
    if (digits.startsWith('20')) return `+${digits}`;
    if (digits.startsWith('0')) return `+2${digits}`;
    return digits;
  };
  const ownerName = (s: any) => String(s?.owner?.name || s?.name || 'متجر');
  const formatPhone = (p: string) => {
    const m = p.match(/^\+20(1[0125])(\d{4})(\d{4})$/);
    if (m) return `+20 ${m[1]} ${m[2]} ${m[3]}`;
    return p;
  };

  const selected = selectedShopDetails || selectedShop;
  const selectedStatus = String(selected?.status || '').toUpperCase();
  const selectedPublicDisabled = Boolean(selected?.publicDisabled ?? selected?.public_disabled ?? false);
  const selectedDeliveryDisabled = Boolean(selected?.deliveryDisabled ?? selected?.delivery_disabled ?? false);
  const selectedIsActive = Boolean(selected?.isActive ?? selected?.is_active ?? true);
  const enabledModules = Array.isArray(selected?.layoutConfig?.enabledModules) ? selected.layoutConfig.enabledModules : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Store}
        title="إدارة المتاجر"
        subtitle="عرض وإدارة جميع متاجر المنصة، ومتابعة التجار الجدد والتواصل معاهم"
        tone="sky"
        actions={
          <TabBar
            tabs={[
              { id: 'all', label: 'كل المتاجر', icon: Store },
              { id: 'new', label: 'المتاجر الجديدة', icon: Sparkles },
            ]}
            active={tab}
            onChange={(id) => setTab(id as ShopsTab)}
          />
        }
        stats={
          tab === 'all' ? (
            <>
              <StatChip label="الإجمالي" value={shops.length} />
              <StatChip label="قيد المراجعة" value={pendingShops.length} tone="amber" />
              <StatChip
                label="نشطة"
                value={shops.filter((s) => String(s?.status || '').toUpperCase() === 'APPROVED').length}
                tone="green"
              />
            </>
          ) : (
            <>
              <StatChip label="في الفترة" value={filteredNewShops.length} tone="cyan" />
              <StatChip
                label="مقفولة"
                value={filteredNewShops.filter((s) => String(s?.status || '').toUpperCase() === 'SUSPENDED').length}
                tone="red"
              />
            </>
          )
        }
      />

      {tab === 'all' && (
        <>
          {pendingShops.length > 0 && (
            <Panel className="p-6">
              <h3 className="text-slate-900 font-black text-lg mb-4">
                موافقات معلقة ({pendingShops.length})
              </h3>
              <div className="space-y-3">
                {pendingShops.slice(0, 6).map((shop) => (
                  <div
                    key={shop.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-row-reverse">
                      <img
                        src={shop.logoUrl || shop.logo_url || '/default-shop.png'}
                        className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
                        loading="lazy"
                      />
                      <div className="text-right">
                        <div className="text-slate-900 font-black">{shop.name}</div>
                        <div className="text-slate-500 text-xs font-bold">
                          {shop.governorate} • {shop.city} • {shop.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openShopDetails(shop)} className={BTN_SOFT}>
                        <Eye size={16} /> تفاصيل
                      </button>
                      <button onClick={() => handleApprovalAction(shop.id, 'approved')} className={BTN_SUCCESS}>
                        <Check size={16} /> قبول
                      </button>
                      <button onClick={() => handleApprovalAction(shop.id, 'rejected')} className={BTN_DANGER_SOFT}>
                        <X size={16} /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <div className="flex flex-col md:flex-row gap-3 p-5 border-b border-slate-100">
              <SearchInput
                value={searchTerm}
                onChange={(v) => { setSearchTerm(v); setPage(0); }}
                placeholder="ابحث بالاسم، البريد، الهاتف، المدينة..."
              />
              <FilterSelect
                value={shopStatusFilter}
                onChange={(v) => { setShopStatusFilter(v as StatusKey); setPage(0); }}
                options={[
                  { value: 'all', label: 'كل الحالات' },
                  { value: 'APPROVED', label: 'نشط' },
                  { value: 'PENDING', label: 'قيد المراجعة' },
                  { value: 'REJECTED', label: 'مرفوض' },
                  { value: 'SUSPENDED', label: 'معلّق' },
                ]}
              />
            </div>

            {loading ? (
              <LoadingBlock />
            ) : paginatedShops.length === 0 ? (
              <EmptyState
                icon={Store}
                title={searchTerm || shopStatusFilter !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد متاجر بعد'}
              />
            ) : (
              <AdminTable
                minW="min-w-[1180px]"
                head={
                  <>
                    <th className={TH}>المتجر</th>
                    <th className={TH}>المالك</th>
                    <th className={TH}>الموقع</th>
                    <th className={TH}>التوصيل</th>
                    <th className={TH}>الأزرار</th>
                    <th className={TH}>الحالة</th>
                    <th className={TH}>إجراءات</th>
                  </>
                }
              >
                {paginatedShops.map((shop) => {
                  const status = String(shop.status || '').toUpperCase();
                  const meta = STATUS_META[status] || STATUS_META.PENDING;
                  const isActive = Boolean(shop?.isActive ?? shop?.is_active ?? true);
                  const busy = actionId === String(shop?.id);
                  return (
                    <tr key={shop.id} className={TR}>
                      <td className={TD}>
                        <div className="flex items-center gap-3">
                          <img
                            src={shop.logoUrl || shop.logo_url || '/default-shop.png'}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <div className="text-slate-900 font-black truncate">{shop.name}</div>
                            <div className="text-slate-400 text-xs font-bold truncate">
                              /{shop.slug || '-'} • {shop.category || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={TD + ' text-slate-700 font-bold text-sm'}>
                        <div>{shop?.owner?.name || '-'}</div>
                        <div className="text-slate-400 text-xs mt-1">{shop?.owner?.email || shop?.email || '-'}</div>
                      </td>
                      <td className={TD + ' text-slate-700 font-bold text-sm'}>
                        {shop.governorate || '-'}
                        <div className="text-slate-400 text-xs mt-1">{shop.city || '-'}</div>
                      </td>
                      <td className={TD + ' text-slate-700 font-bold text-sm'}>
                        <button onClick={() => editShopDeliveryFee(shop)} className="hover:text-cyan-600 transition-colors">
                          {getShopDeliveryFee(shop) ?? 0} ج.م
                        </button>
                        <div className="text-slate-400 text-xs mt-1">
                          {Boolean(shop?.deliveryDisabled ?? shop?.delivery_disabled) ? 'معطّل' : 'مفعّل'}
                        </div>
                      </td>
                      <td className={TD + ' text-slate-700 font-bold text-sm'}>{getEnabledModulesCount(shop)} زر</td>
                      <td className={TD}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className={TD}>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openShopDetails(shop)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
                            title="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => editShopDeliveryFee(shop)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
                            title="تعديل رسوم التوصيل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {status === 'PENDING' && (
                            <button
                              onClick={() => handleApprovalAction(shop.id, 'approved')}
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600"
                              title="قبول"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {isActive ? (
                            <button
                              disabled={busy}
                              onClick={() => toggleShopActive(shop, false)}
                              className="p-2 rounded-xl bg-red-50 text-red-500"
                              title="تعطيل من التطبيق"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled={busy}
                              onClick={() => toggleShopActive(shop, true)}
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600"
                              title="إعادة تفعيل"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </AdminTable>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              total={filteredShops.length}
              unit="متجر"
              onPage={setPage}
            />
          </Panel>
        </>
      )}

      {tab === 'new' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="ابحث بالاسم أو الرقم أو الإيميل..."
            />
            <div className="flex gap-2">
              {(['3', '7', '30', 'all'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysFilter(d)}
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-xs font-black transition-all',
                    daysFilter === d
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'
                  )}
                >
                  {d === 'all' ? 'الكل' : `آخر ${d} يوم`}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadNewShops(true)}
              disabled={newLoading}
              className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw size={18} className={newLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {newLoading && !newLoaded ? (
            <LoadingBlock />
          ) : filteredNewShops.length === 0 ? (
            <Panel>
              <EmptyState
                icon={Store}
                title="مفيش متاجر جديدة في الفترة المحددة"
                subtitle="التجار الجدد اللي سجلوا نفسهم هيظهروا هنا"
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredNewShops.map((shop) => {
                const status = String(shop?.status || '').toUpperCase();
                const locked = status === 'SUSPENDED';
                const phone = ownerPhone(shop);
                const busy = actionId === String(shop?.id || '');
                return (
                  <div
                    key={shop?.id}
                    className={cn(
                      'bg-white border p-5 rounded-3xl shadow-sm',
                      locked ? 'border-red-300' : 'border-slate-200'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl', locked ? 'bg-red-50 text-red-500' : 'bg-cyan-50 text-cyan-600')}>
                          {locked ? <Lock size={22} /> : <Store size={22} />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            {ownerName(shop)}
                            {status === 'APPROVED' && <CheckCircle2 size={15} className="text-emerald-500" />}
                          </h4>
                          <div className="text-slate-400 text-[11px] font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><Store size={11} /> {shop?.name || '—'}</span>
                            <span>{shop?.category || '—'}</span>
                            {shop?.createdAt && <span>· {timeAgo(String(shop.createdAt))}</span>}
                            {locked && <span className="text-red-500">· مقفول</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openShopDetails(shop)}
                          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900"
                          title="عرض التفاصيل"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => toggleLock(shop)}
                          disabled={busy}
                          className={cn(
                            'px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50',
                            locked
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          )}
                        >
                          {busy
                            ? <RefreshCw size={15} className="animate-spin" />
                            : locked
                              ? <><Unlock size={15} /> فتح</>
                              : <><Lock size={15} /> قفل</>}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Phone size={16} className="text-cyan-600" />
                        <span dir="ltr" className="text-slate-900 font-black text-sm tracking-wide">
                          {phone ? formatPhone(phone) : 'مفيش رقم'}
                        </span>
                      </div>
                      {phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${phone}`}
                            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-[11px] font-black flex items-center gap-1.5"
                          >
                            <Phone size={13} /> اتصال
                          </a>
                          <a
                            href={`https://wa.me/${phone.replace('+', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-[11px] font-black flex items-center gap-1.5"
                          >
                            <MessageCircle size={13} /> واتساب
                          </a>
                        </div>
                      )}
                    </div>

                    {shop?.owner?.email ? (
                      <div className="text-[11px] font-bold text-slate-400 mt-2.5" dir="ltr">
                        {String(shop.owner.email)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <AdminModal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="تفاصيل المتجر" size="xl">
        {detailsLoading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : selected ? (
          <div className="space-y-5 text-right">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selected?.name || 'متجر'}</h3>
                    <div className="mt-2 space-y-2 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-2 justify-end"><Globe size={14} className="text-slate-400" /> /{selected?.slug || '-'}</div>
                      <div className="flex items-center gap-2 justify-end"><Mail size={14} className="text-slate-400" /> {selected?.email || selected?.owner?.email || '-'}</div>
                      <div className="flex items-center gap-2 justify-end"><Phone size={14} className="text-slate-400" /> {selected?.phone || '-'}</div>
                      <div className="flex items-center gap-2 justify-end"><MapPin size={14} className="text-slate-400" /> {selected?.governorate || '-'} • {selected?.city || '-'}</div>
                    </div>
                  </div>
                  <img
                    src={selected?.logoUrl || selected?.logo_url || '/default-shop.png'}
                    className="w-20 h-20 rounded-3xl object-cover bg-white border border-slate-200"
                  />
                </div>
                {selected?.description ? <div className="mt-4 text-sm font-bold text-slate-600 leading-7">{selected.description}</div> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-slate-900 font-black">إجراءات سريعة</div>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => window.open(`/shop/${selected?.slug || selected?.id}`, '_blank')}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-100"
                  >
                    <ExternalLink size={16} /> فتح صفحة المتجر
                  </button>
                  {selectedStatus === 'PENDING' && (
                    <>
                      <button
                        disabled={actionId === String(selected?.id)}
                        onClick={() => handleApprovalAction(String(selected?.id), 'approved')}
                        className="w-full px-4 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-600"
                      >
                        <Check size={16} /> قبول المتجر
                      </button>
                      <button
                        disabled={actionId === String(selected?.id)}
                        onClick={() => handleApprovalAction(String(selected?.id), 'rejected')}
                        className="w-full px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-black text-sm flex items-center justify-center gap-2"
                      >
                        <X size={16} /> رفض الطلب
                      </button>
                    </>
                  )}
                  {selectedStatus === 'APPROVED' && (
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => handleSuspendToggle(selected, 'suspended')}
                      className="w-full px-4 py-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 font-black text-sm flex items-center justify-center gap-2"
                    >
                      <Ban size={16} /> تعليق المتجر
                    </button>
                  )}
                  {selectedStatus === 'SUSPENDED' && (
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => handleSuspendToggle(selected, 'approved')}
                      className="w-full px-4 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-600"
                    >
                      <ShieldCheck size={16} /> إعادة تفعيل
                    </button>
                  )}
                  {selectedIsActive ? (
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => toggleShopActive(selected, false)}
                      className="w-full px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-black text-sm flex items-center justify-center gap-2"
                    >
                      <Ban size={16} /> تعطيل من التطبيق
                    </button>
                  ) : (
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => toggleShopActive(selected, true)}
                      className="w-full px-4 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-600"
                    >
                      <ShieldCheck size={16} /> إعادة تفعيل المتجر
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ['الحالة', STATUS_META[selectedStatus]?.label || selectedStatus || '-'],
                ['رسوم التوصيل', formatEGP(getShopDeliveryFee(selected) || 0)],
                ['عدد الأزرار', enabledModules.length],
                ['تاريخ الإنشاء', fmtDate(selected?.createdAt)],
              ].map(([label, value]: any) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-slate-500 text-[11px] font-black">{label}</div>
                  <div className="mt-2 text-slate-900 font-black">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-slate-900 font-black flex items-center gap-2 justify-end">
                  <LayoutGrid size={16} /> الظهور والخدمات
                </div>
                <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">الظهور العام</span>
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => toggleFlag(selected, 'publicDisabled', !selectedPublicDisabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-black ${
                        selectedPublicDisabled
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {selectedPublicDisabled ? 'إظهار' : 'إخفاء'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">خدمة التوصيل</span>
                    <button
                      disabled={actionId === String(selected?.id)}
                      onClick={() => toggleFlag(selected, 'deliveryDisabled', !selectedDeliveryDisabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-black ${
                        selectedDeliveryDisabled
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {selectedDeliveryDisabled ? 'تفعيل' : 'تعطيل'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">وضع اللوحة</span>
                    <span>{String(selected?.layoutConfig?.dashboardMode || '-')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">مالك المتجر</span>
                    <span>{selected?.owner?.name || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-slate-900 font-black flex items-center gap-2 justify-end">
                  <Truck size={16} /> تفاصيل إضافية
                </div>
                <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">العنوان المعروض</span>
                    <span>{selected?.displayAddress || selected?.addressDetailed || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">واتساب</span>
                    <span>{selected?.whatsapp || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">عدد الزيارات</span>
                    <span>{Number(selected?.visitors || 0).toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">آخر تحديث</span>
                    <span>{fmtDate(selected?.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-slate-900 font-black mb-4">الأزرار المفعّلة</div>
              <div className="flex flex-wrap gap-2 justify-end">
                {enabledModules.length === 0 ? (
                  <span className="text-slate-500 font-bold">لا توجد أزرار مفعّلة</span>
                ) : (
                  enabledModules.map((moduleId: string) => (
                    <span
                      key={String(moduleId)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
                    >
                      {String(moduleId)}
                    </span>
                  ))
                )}
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

export default function AdminShopsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ShopsContent />
    </Suspense>
  );
}
