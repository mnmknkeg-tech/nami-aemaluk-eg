'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Check, X, Store, MapPin, ShieldAlert, Truck, Link as LinkIcon, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, BTN_SUCCESS, BTN_DANGER_SOFT,
  fmtDate,
} from '@/components/admin/ui';

const MODULE_LABELS: Record<string, string> = {
  gallery: 'معرض الصور',
  reservations: 'الحجوزات',
  invoice: 'فاتورة',
  pos: 'الكاشير',
  sales: 'الطلبات / المبيعات',
  customers: 'العملاء',
  reports: 'التقارير',
  abandonedCart: 'السلة المتروكة',
};

function ApprovalCard({
  children,
  onApprove,
  onReject,
  busy,
}: {
  children: React.ReactNode;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="text-right flex-1 w-full">{children}</div>
      <div className="flex gap-3 shrink-0">
        <button disabled={busy} onClick={onApprove} className={BTN_SUCCESS + ' px-6 py-3'}>
          <Check size={18} /> قبول
        </button>
        <button disabled={busy} onClick={onReject} className={BTN_DANGER_SOFT + ' px-6 py-3'}>
          <X size={18} /> رفض
        </button>
      </div>
    </div>
  );
}

export default function AdminApprovalsPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [moduleRequests, setModuleRequests] = useState<any[]>([]);
  const [mapListings, setMapListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [shopsRes, modulesRes, mapRes] = await Promise.allSettled([
      apiRequest('/shops/pending'),
      apiRequest('/admin/module-requests?status=PENDING&take=100'),
      apiRequest('/map-listings/pending?limit=100'),
    ]);
    if (shopsRes.status === 'fulfilled') setShops(Array.isArray(shopsRes.value) ? shopsRes.value : []);
    if (modulesRes.status === 'fulfilled') {
      const r = modulesRes.value;
      setModuleRequests(Array.isArray(r) ? r : (r?.items || []));
    }
    if (mapRes.status === 'fulfilled') {
      const r = mapRes.value;
      setMapListings(Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []));
    }
    // فشل أي مصدر منهم يظهر toast واحد مختصر بدل 3 رسائل متتالية
    const failed = [shopsRes, modulesRes, mapRes].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length > 0 && !silent) {
      toast({ title: `فشل تحميل بعض الطلبات: ${failed[0].reason?.message || 'خطأ غير معروف'}`, variant: 'destructive' });
    }
    if (!silent) setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      await apiRequest(`/shops/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action }),
      });
      toast({
        title: action === 'approved' ? 'تم قبول المتجر بنجاح' : 'تم رفض الطلب',
        variant: 'success',
      });
      await loadAll(true);
    } catch (err: any) {
      toast({ title: `فشل تنفيذ العملية: ${err?.message || 'خطأ غير معروف'}`, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleModuleApprove = async (id: string) => {
    try {
      await apiRequest(`/admin/module-requests/${id}/approve`, { method: 'POST' });
      toast({ title: 'تم قبول الطلب', variant: 'success' });
      await loadAll(true);
    } catch {
      toast({ title: 'فشل قبول الطلب', variant: 'destructive' });
    }
  };

  const handleModuleReject = async (id: string) => {
    const note = prompt('سبب الرفض:') || '';
    try {
      await apiRequest(`/admin/module-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: note || null }),
      });
      toast({ title: 'تم رفض الطلب', variant: 'success' });
      await loadAll(true);
    } catch {
      toast({ title: 'فشل رفض الطلب', variant: 'destructive' });
    }
  };

  const handleMapListingApprove = async (id: string) => {
    try {
      await apiRequest(`/map-listings/${id}/approve`, { method: 'POST' });
      toast({ title: 'تم قبول الموقع', variant: 'success' });
      await loadAll(true);
    } catch {
      toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' });
    }
  };

  const handleMapListingReject = async (id: string) => {
    const note = prompt('سبب الرفض:') || '';
    try {
      await apiRequest(`/map-listings/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      toast({ title: 'تم رفض الموقع', variant: 'success' });
      await loadAll(true);
    } catch {
      toast({ title: 'فشل تنفيذ العملية', variant: 'destructive' });
    }
  };

  const getModuleLabel = (id: string) => MODULE_LABELS[id] || id;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-slate-900 font-black text-lg">{children}</h3>
  );

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={ShieldAlert}
        title="الموافقات"
        subtitle="مراجعة واعتماد طلبات الانضمام والميزات"
        tone="cyan"
        actions={
          <button onClick={() => loadAll(true)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 inline-flex items-center gap-2">
            <RefreshCw size={14} /> تحديث
          </button>
        }
      />

      <div className="space-y-10">
        {/* Module Upgrade Requests */}
        <div className="space-y-4">
          <SectionTitle>طلبات تفعيل الأزرار</SectionTitle>
          {moduleRequests.length === 0 ? (
            <Panel><EmptyState icon={ShieldAlert} title="لا توجد طلبات معلقة" /></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {moduleRequests.map((r: any) => {
                const shopName = r?.shop?.name || '';
                const shopSlug = r?.shop?.slug || '';
                const modules = Array.isArray(r?.requestedModules) ? r.requestedModules : [];
                const createdAt = r?.createdAt ? String(r.createdAt) : '';
                return (
                  <ApprovalCard
                    key={r.id}
                    busy={actionLoading === String(r.id)}
                    onApprove={() => handleModuleApprove(String(r.id))}
                    onReject={() => handleModuleReject(String(r.id))}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{shopName || 'متجر'}</h4>
                        <div className="text-slate-500 text-xs font-bold mt-1">{shopSlug ? `/${shopSlug}` : ''}</div>
                      </div>
                      <div className="text-slate-400 text-xs font-bold">
                        {createdAt ? fmtDate(createdAt) : ''}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      {modules.map((m: any) => (
                        <span key={String(m)} className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black">
                          {getModuleLabel(String(m))}
                        </span>
                      ))}
                    </div>
                  </ApprovalCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Merchant Requests */}
        <div className="space-y-4">
          <SectionTitle>طلبات الانضمام كتاجر</SectionTitle>
          {shops.length === 0 ? (
            <Panel><EmptyState icon={Store} title="لا توجد طلبات معلقة" /></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {shops.map((shop) => (
                <ApprovalCard
                  key={shop.id}
                  busy={actionLoading === String(shop.id)}
                  onApprove={() => handleAction(shop.id, 'approved')}
                  onReject={() => handleAction(shop.id, 'rejected')}
                >
                  <div className="flex items-center gap-5 flex-row-reverse">
                    <img
                      src={shop.logoUrl || shop.logo_url || '/default-shop.png'}
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                      loading="lazy"
                    />
                    <div className="text-right">
                      <h4 className="text-xl font-black text-slate-900">{shop.name}</h4>
                      <div className="flex items-center gap-4 text-slate-500 text-xs font-bold mt-1">
                        <span className="flex items-center gap-1"><MapPin size={12} /> {shop.governorate}</span>
                        <span className="flex items-center gap-1"><Store size={12} /> {shop.category}</span>
                      </div>
                    </div>
                  </div>
                </ApprovalCard>
              ))}
            </div>
          )}
        </div>

        {/* Map Listings */}
        <div className="space-y-4">
          <SectionTitle>طلبات إضافة مواقع على الخريطة</SectionTitle>
          {mapListings.length === 0 ? (
            <Panel><EmptyState icon={MapPin} title="لا توجد طلبات معلقة" /></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {mapListings.map((ml: any) => {
                const branches = Array.isArray(ml?.branches) ? ml.branches : [];
                const primaryBranch = branches.find((b: any) => b.isPrimary) || branches[0];
                return (
                  <ApprovalCard
                    key={ml.id}
                    onApprove={() => handleMapListingApprove(String(ml.id))}
                    onReject={() => handleMapListingReject(String(ml.id))}
                  >
                    <div className="flex items-center gap-5 flex-row-reverse">
                      {ml.logoUrl ? (
                        <img src={ml.logoUrl} className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200" loading="lazy" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
                          <MapPin className="text-amber-600" size={24} />
                        </div>
                      )}
                      <div className="text-right">
                        <h4 className="text-xl font-black text-slate-900">{ml.title}</h4>
                        <div className="flex items-center gap-4 text-slate-500 text-xs font-bold mt-1">
                          {ml.category && <span>{ml.category}</span>}
                          {primaryBranch?.governorate && (
                            <span className="flex items-center gap-1"><MapPin size={12} /> {primaryBranch.governorate}</span>
                          )}
                          {ml.phone && <span>{ml.phone}</span>}
                        </div>
                        {primaryBranch?.addressLabel && (
                          <p className="text-slate-400 text-xs font-bold mt-1">{primaryBranch.addressLabel}</p>
                        )}
                        {ml.websiteUrl && (
                          <a href={ml.websiteUrl} target="_blank" rel="noopener" className="text-cyan-700 text-xs font-bold mt-1 block hover:underline">
                            {ml.websiteUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  </ApprovalCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Courier Requests Link */}
        <div className="space-y-4">
          <SectionTitle>طلبات المندوبين</SectionTitle>
          <Panel>
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 flex-row-reverse text-slate-600 font-black">
                <Truck size={18} className="text-cyan-600" />
                تم نقل طلبات المندوبين إلى صفحة إدارة التوصيل
              </div>
              <Link
                href="/admin/delivery?tab=pending"
                prefetch
                className="inline-flex items-center gap-2 px-6 py-3 mt-6 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-700"
              >
                <LinkIcon size={16} /> فتح إدارة التوصيل
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
