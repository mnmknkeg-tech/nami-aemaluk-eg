'use client';

/**
 * العروض والخصومات — صفحة موحّدة تدمج: الخصومات + الكوبونات + العروض الموسمية.
 * نفس هيكل صفحة المنتجات: هيدر أبيض + تابات بعدادات + بحث + جدول grid-cols-12.
 * التبويبات: كل العروض / الخصومات / الكوبونات / العروض الموسمية / النشطة / المجدولة / المنتهية.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Percent, Ticket, CalendarHeart, Plus, Edit, Trash2, Download, X, Info,
  Check, Loader2, Search,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSearchParams } from 'next/navigation';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvLoading,
  InvEmpty,
  type InvTab,
} from '@/components/inventory/InventoryShell';

type Discount = {
  id: string; name: string; nameAr: string;
  type: 'product' | 'category' | 'order' | 'bundle' | 'seasonal';
  discountType: 'percentage' | 'fixed'; value: number;
  minOrderValue: number; maxDiscountValue: number;
  applicableProducts: string[]; applicableCategories: string[];
  startDate: string; endDate: string;
  status: 'active' | 'inactive' | 'expired';
  usageCount: number; totalSavings: number; description: string;
};
type Coupon = {
  id: string; code: string; name: string; nameAr: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
  value: number; minOrderValue: number; maxDiscountValue: number;
  usageLimit: number; usedCount: number; startDate: string; endDate: string;
  status: 'active' | 'inactive' | 'expired'; description: string;
};
type SeasonalOffer = {
  id: string; name: string; description: string; occasion: string;
  discountType: 'percentage' | 'fixed'; discountValue: number;
  categories: string[]; startDate: string; endDate: string;
  status: 'scheduled' | 'active' | 'paused' | 'ended' | 'expired' | 'draft';
  bannerColor: string; usageCount: number; revenue: number;
};

const TAB_IDS = ['all', 'discounts', 'coupons', 'seasonal', 'active', 'scheduled', 'ended'];

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) => (s ? new Date(s).toLocaleDateString('ar-EG') : '—');

function OffersPageContent() {
  const searchParams = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'all';

  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalOffer[]>([]);

  // ─── load ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [dRes, cRes, sRes] = await Promise.all([
        apiRequest(`/discounts/shop/${sid}`).catch(() => []),
        apiRequest(`/coupons/shop/${sid}`).catch(() => []),
        apiRequest(`/marketing/seasonal-offers/shop/${sid}`).catch(() => []),
      ]);
      const dl = Array.isArray(dRes) ? dRes : dRes?.data || [];
      setDiscounts(dl.map((x: any) => ({
        id: String(x.id), name: x.name || '---', nameAr: x.nameAr || x.name_ar || '---',
        type: x.type || 'order', discountType: x.discountType || 'percentage',
        value: Number(x.value || 0), minOrderValue: Number(x.minOrderValue || x.min_order_value || 0),
        maxDiscountValue: Number(x.maxDiscountValue || x.max_discount_value || 0),
        applicableProducts: x.applicableProducts || x.applicable_products || [],
        applicableCategories: x.applicableCategories || x.applicable_categories || [],
        startDate: x.startDate || x.start_date || '', endDate: x.endDate || x.end_date || '',
        status: x.status || 'active', usageCount: Number(x.usageCount || x.usage_count || 0),
        totalSavings: Number(x.totalSavings || x.total_savings || 0), description: x.description || '',
      })));
      const cl = Array.isArray(cRes) ? cRes : cRes?.data || [];
      setCoupons(cl.map((x: any) => ({
        id: String(x.id), code: x.code || '---', name: x.name || '---', nameAr: x.nameAr || x.name_ar || '---',
        type: x.type || 'percentage', value: Number(x.value || 0),
        minOrderValue: Number(x.minOrderValue || x.min_order_value || 0),
        maxDiscountValue: Number(x.maxDiscountValue || x.max_discount_value || 0),
        usageLimit: Number(x.usageLimit || x.usage_limit || 0), usedCount: Number(x.usedCount || x.used_count || 0),
        startDate: x.startDate || x.start_date || '', endDate: x.endDate || x.end_date || '',
        status: x.status || 'active', description: x.description || '',
      })));
      const sl = Array.isArray(sRes) ? sRes : sRes?.data || [];
      setSeasonal(sl.map((x: any) => ({
        id: String(x.id), name: x.name || '---', description: x.description || '',
        occasion: x.occasion || '', discountType: x.discountType || 'percentage',
        discountValue: Number(x.discountValue || x.discount_value || 0),
        categories: x.categories || [], startDate: x.startDate || x.start_date || '',
        endDate: x.endDate || x.end_date || '', status: x.status || 'scheduled',
        bannerColor: x.bannerColor || x.banner_color || '#00E5FF',
        usageCount: Number(x.usageCount || x.usage_count || 0), revenue: Number(x.revenue || 0),
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── unified rows ────────────────────────────────────────────────────────
  type Row = {
    kind: 'discount' | 'coupon' | 'seasonal'; id: string;
    title: string; sub: string; badge: string;
    valueLabel: string; conditions: string; period: string;
    usage: string; status: string; tone: 'emerald' | 'slate' | 'red' | 'amber';
  };

  const today = new Date().toISOString().split('T')[0];
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    discounts.forEach((x) => {
      const ended = x.status === 'expired' || (x.endDate && x.endDate < today);
      out.push({
        kind: 'discount', id: x.id, title: x.name, sub: x.nameAr,
        badge: { product: 'منتج', category: 'فئة', order: 'طلب', bundle: 'حزمة', seasonal: 'موسم' }[x.type] || x.type,
        valueLabel: x.discountType === 'percentage' ? `${x.value}%` : `ج.م ${fmt(x.value)}`,
        conditions: [x.minOrderValue > 0 ? `حد أدنى ${fmt(x.minOrderValue)}` : '', x.maxDiscountValue > 0 ? `أقصى ${fmt(x.maxDiscountValue)}` : ''].filter(Boolean).join(' • ') || '—',
        period: `${d(x.startDate)} → ${d(x.endDate)}`,
        usage: `${fmt(x.usageCount)} استخدام • وفّر ${fmt(x.totalSavings)}`,
        status: x.status, tone: ended ? 'slate' : 'emerald',
      });
    });
    coupons.forEach((x) => {
      const ended = x.status === 'expired' || (x.endDate && x.endDate < today);
      out.push({
        kind: 'coupon', id: x.id, title: x.code, sub: x.name,
        badge: { percentage: 'نسبة', fixed: 'مبلغ', free_shipping: 'شحن مجاني', buy_x_get_y: 'اشترِ X احصل على Y' }[x.type] || x.type,
        valueLabel: x.type === 'percentage' ? `${x.value}%` : x.type === 'fixed' ? `ج.م ${fmt(x.value)}` : x.type === 'free_shipping' ? 'شحن مجاني' : 'X + Y',
        conditions: [x.minOrderValue > 0 ? `حد أدنى ${fmt(x.minOrderValue)}` : '', x.maxDiscountValue > 0 ? `أقصى ${fmt(x.maxDiscountValue)}` : '', x.usageLimit > 0 ? `حتى ${fmt(x.usageLimit)} مرة` : ''].filter(Boolean).join(' • ') || '—',
        period: `${d(x.startDate)} → ${d(x.endDate)}`,
        usage: `${fmt(x.usedCount)}${x.usageLimit > 0 ? ` / ${fmt(x.usageLimit)}` : ''} استخدام`,
        status: x.status, tone: ended ? 'slate' : 'emerald',
      });
    });
    seasonal.forEach((x) => {
      const ended = ['ended', 'expired', 'paused'].includes(x.status);
      const scheduled = ['scheduled', 'draft'].includes(x.status);
      out.push({
        kind: 'seasonal', id: x.id, title: x.name, sub: x.occasion,
        badge: 'عرض موسمي',
        valueLabel: x.discountType === 'percentage' ? `${x.discountValue}%` : `ج.م ${fmt(x.discountValue)}`,
        conditions: (x.categories || []).length > 0 ? `فئات: ${x.categories.join('، ')}` : '—',
        period: `${d(x.startDate)} → ${d(x.endDate)}`,
        usage: `${fmt(x.usageCount)} استخدام • إيراد ${fmt(x.revenue)}`,
        status: x.status,
        tone: ended ? 'slate' : scheduled ? 'amber' : 'emerald',
      });
    });
    return out;
  }, [discounts, coupons, seasonal, today]);

  const counts = useMemo(() => ({
    all: rows.length,
    discounts: discounts.length,
    coupons: coupons.length,
    seasonal: seasonal.length,
    active: rows.filter((r) => r.tone === 'emerald' && ['active', 'scheduled'].includes(r.status)).length,
    scheduled: seasonal.filter((s) => ['scheduled', 'draft'].includes(s.status)).length,
    ended: rows.filter((r) => ['expired', 'ended', 'paused'].includes(r.status) || r.tone === 'slate').length,
  }), [rows, discounts, coupons, seasonal]);

  const filtered = useMemo(() => {
    let result = rows;
    if (['discounts', 'coupons', 'seasonal'].includes(tab)) result = result.filter((r) => r.kind === tab.slice(0, -1));
    if (tab === 'active') result = result.filter((r) => r.status === 'active');
    else if (tab === 'scheduled') result = result.filter((r) => ['scheduled', 'draft'].includes(r.status));
    else if (tab === 'ended') result = result.filter((r) => ['expired', 'ended', 'paused'].includes(r.status));
    const q = debouncedSearch.trim().toLowerCase();
    if (q) result = result.filter((r) => r.title.toLowerCase().includes(q) || r.sub.includes(debouncedSearch) || r.badge.includes(debouncedSearch));
    return result;
  }, [rows, tab, debouncedSearch]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const tabs: InvTab[] = [
    { id: 'all', label: 'كل العروض', count: counts.all },
    { id: 'discounts', label: 'الخصومات', count: counts.discounts },
    { id: 'coupons', label: 'الكوبونات', count: counts.coupons },
    { id: 'seasonal', label: 'العروض الموسمية', count: counts.seasonal },
    { id: 'active', label: 'النشطة', count: counts.active },
    { id: 'scheduled', label: 'المجدولة', count: counts.scheduled },
    { id: 'ended', label: 'المنتهية', count: counts.ended },
  ];

  // ─── discount form ───────────────────────────────────────────────────────
  const emptyDiscount = {
    name: '', nameAr: '', type: 'order' as Discount['type'],
    discountType: 'percentage' as 'percentage' | 'fixed', value: 0,
    minOrderValue: 0, maxDiscountValue: 0,
    startDate: new Date().toISOString().split('T')[0], endDate: '',
    status: 'active' as Discount['status'], description: '',
  };
  const [discountModal, setDiscountModal] = useState<'add' | 'edit' | null>(null);
  const [editDiscount, setEditDiscount] = useState<Discount | null>(null);
  const [dForm, setDForm] = useState(emptyDiscount);

  const saveDiscount = async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      if (discountModal === 'edit' && editDiscount) {
        await apiRequest(`/discounts/${editDiscount.id}`, { method: 'PUT', body: JSON.stringify(dForm) });
      } else {
        await apiRequest('/discounts', { method: 'POST', body: JSON.stringify({ ...dForm, shopId: sid }) });
      }
      setDiscountModal(null); setEditDiscount(null); setDForm(emptyDiscount); load();
    } catch { alert('حدث خطأ أثناء حفظ الخصم'); }
  };

  // ─── coupon form ─────────────────────────────────────────────────────────
  const emptyCoupon = {
    code: '', name: '', nameAr: '',
    type: 'percentage' as Coupon['type'], value: 0,
    minOrderValue: 0, maxDiscountValue: 0, usageLimit: 0,
    startDate: new Date().toISOString().split('T')[0], endDate: '',
    status: 'active' as Coupon['status'], description: '',
  };
  const [couponModal, setCouponModal] = useState<'add' | 'edit' | null>(null);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [cForm, setCForm] = useState(emptyCoupon);

  const saveCoupon = async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      if (couponModal === 'edit' && editCoupon) {
        await apiRequest(`/coupons/${editCoupon.id}`, { method: 'PUT', body: JSON.stringify(cForm) });
      } else {
        await apiRequest('/coupons', { method: 'POST', body: JSON.stringify({ ...cForm, shopId: sid }) });
      }
      setCouponModal(null); setEditCoupon(null); setCForm(emptyCoupon); load();
    } catch { alert('حدث خطأ أثناء حفظ الكوبون'); }
  };

  // ─── seasonal form ───────────────────────────────────────────────────────
  const emptySeasonal = {
    name: '', description: '', occasion: '',
    discountType: 'percentage' as 'percentage' | 'fixed', discountValue: 10,
    categories: '', startDate: new Date().toISOString().split('T')[0], endDate: '',
    bannerColor: '#00E5FF',
  };
  const [seasonalModal, setSeasonalModal] = useState<'add' | 'edit' | null>(null);
  const [editSeasonal, setEditSeasonal] = useState<SeasonalOffer | null>(null);
  const [sForm, setSForm] = useState(emptySeasonal);
  const [saving, setSaving] = useState(false);

  const saveSeasonal = async () => {
    if (!sForm.name || !sForm.occasion) { alert('يرجى إدخال الاسم والمناسبة'); return; }
    if (!sForm.endDate) { alert('يرجى تحديد تاريخ الانتهاء'); return; }
    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const payload = {
        ...sForm, shopId: sid,
        categories: sForm.categories ? sForm.categories.split(',').map((c) => c.trim()) : [],
      };
      if (seasonalModal === 'edit' && editSeasonal) {
        await apiRequest(`/marketing/seasonal-offers/${editSeasonal.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/marketing/seasonal-offers', { method: 'POST', body: JSON.stringify(payload) });
      }
      setSeasonalModal(null); setEditSeasonal(null); setSForm(emptySeasonal); load();
    } catch { alert('حدث خطأ أثناء حفظ العرض الموسمي'); }
    finally { setSaving(false); }
  };

  // ─── delete + csv ────────────────────────────────────────────────────────
  const deleteRow = async (r: Row) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      if (r.kind === 'discount') await apiRequest(`/discounts/${r.id}`, { method: 'DELETE' });
      else if (r.kind === 'coupon') await apiRequest(`/coupons/${r.id}`, { method: 'DELETE' });
      else await apiRequest(`/marketing/seasonal-offers/${r.id}`, { method: 'DELETE' });
      load();
    } catch { alert('حدث خطأ أثناء الحذف'); }
  };

  const exportCSV = () => {
    const headers = ['Kind', 'Name', 'Type', 'Value', 'Conditions', 'Start', 'End', 'Usage', 'Status'];
    const body = filtered.map((r) => [r.kind, r.title, r.badge, r.valueLabel, r.conditions, r.period, r.usage, r.status]);
    const blob = new Blob([[headers, ...body].map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'offers.csv';
    link.click();
  };

  const openEdit = (r: Row) => {
    if (r.kind === 'discount') {
      const x = discounts.find((v) => v.id === r.id);
      if (!x) return;
      setEditDiscount(x);
      setDForm({ name: x.name, nameAr: x.nameAr, type: x.type, discountType: x.discountType, value: x.value, minOrderValue: x.minOrderValue, maxDiscountValue: x.maxDiscountValue, startDate: x.startDate?.split('T')[0] || '', endDate: x.endDate?.split('T')[0] || '', status: x.status, description: x.description });
      setDiscountModal('edit');
    } else if (r.kind === 'coupon') {
      const x = coupons.find((v) => v.id === r.id);
      if (!x) return;
      setEditCoupon(x);
      setCForm({ code: x.code, name: x.name, nameAr: x.nameAr, type: x.type, value: x.value, minOrderValue: x.minOrderValue, maxDiscountValue: x.maxDiscountValue, usageLimit: x.usageLimit, startDate: x.startDate?.split('T')[0] || '', endDate: x.endDate?.split('T')[0] || '', status: x.status, description: x.description });
      setCouponModal('edit');
    } else {
      const x = seasonal.find((v) => v.id === r.id);
      if (!x) return;
      setEditSeasonal(x);
      setSForm({ name: x.name, description: x.description, occasion: x.occasion, discountType: x.discountType, discountValue: x.discountValue, categories: (x.categories || []).join(', '), startDate: x.startDate?.split('T')[0] || '', endDate: x.endDate?.split('T')[0] || '', bannerColor: x.bannerColor });
      setSeasonalModal('edit');
    }
  };

  const KIND_ICON = { discount: Percent, coupon: Ticket, seasonal: CalendarHeart };
  const KIND_LABEL = { discount: 'خصم', coupon: 'كوبون', seasonal: 'موسمي' };

  return (
    <InventoryPage
      title="العروض والخصومات"
      subtitle="كل العروض والخصومات والكوبونات في مكان واحد"
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button onClick={exportCSV} className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
            <Download size={14} />
            تصدير CSV
          </button>
          <button onClick={() => { setDForm(emptyDiscount); setDiscountModal('add'); }} className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700">
            <Plus size={14} />
            إضافة خصم
          </button>
          <button onClick={() => { setCForm(emptyCoupon); setCouponModal('add'); }} className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
            <Plus size={14} />
            كوبون
          </button>
          <button onClick={() => { setSForm(emptySeasonal); setSeasonalModal('add'); }} className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
            <Plus size={14} />
            عرض موسمي
          </button>
        </>
      }
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => { setTab(id); setCurrentPage(1); }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="دوّر باسم العرض أو كود الكوبون…"
      loading={loading}
      empty={
        <>
          <Percent size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد عروض في هذا القسم</p>
        </>
      }
      footer={
        <InvPagination page={currentPage} totalPages={totalPages} total={filtered.length} perPage={itemsPerPage} onPage={setCurrentPage} label="عرض" />
      }
    >
      <InvTableCard
        columns={[
          { label: 'العرض', className: 'col-span-3' },
          { label: 'النوع', className: 'col-span-1' },
          { label: 'القيمة', className: 'col-span-2' },
          { label: 'الشروط', className: 'col-span-2' },
          { label: 'الفترة', className: 'col-span-1' },
          { label: 'الاستخدام', className: 'col-span-1' },
          { label: 'الحالة', className: 'col-span-1' },
          { label: 'إجراءات', className: 'col-span-1' },
        ]}
      >
        {paginated.map((r) => {
          const Icon = KIND_ICON[r.kind];
          return (
            <InvRow key={`${r.kind}-${r.id}`}>
              <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{r.title}</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">{r.sub}</div>
                </div>
              </div>
              <div className="col-span-1">
                <span className="h-8 px-3 inline-flex items-center rounded-full text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                  {r.badge}
                </span>
              </div>
              <div className="col-span-2 pr-4 font-bold text-slate-900 text-xs sm:text-sm">{r.valueLabel}</div>
              <div className="col-span-2 pr-4 text-slate-500 text-xs truncate">{r.conditions}</div>
              <div className="col-span-1 pr-4 text-slate-500 text-xs">{r.period}</div>
              <div className="col-span-1 pr-4 text-slate-500 text-xs">{r.usage}</div>
              <div className="col-span-1">
                <InvStatusPill tone={r.tone}>
                  {r.status === 'active' ? 'نشط' : r.status === 'scheduled' ? 'مجدول' : r.status === 'draft' ? 'مسودة' : r.status === 'paused' ? 'متوقف' : r.status === 'expired' || r.status === 'ended' ? 'منتهي' : 'غير نشط'}
                </InvStatusPill>
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <InvRowAction onClick={() => openEdit(r)} title="تعديل">
                  <Edit size={14} />
                </InvRowAction>
                <InvRowAction onClick={() => deleteRow(r)} title="حذف" danger>
                  <Trash2 size={14} />
                </InvRowAction>
              </div>
            </InvRow>
          );
        })}
      </InvTableCard>

      {/* ═══ Discount Modal ═══ */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDiscountModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">{discountModal === 'add' ? 'خصم جديد' : 'تعديل الخصم'}</h2>
              <button onClick={() => setDiscountModal(null)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (إنجليزي)</label>
                  <input type="text" value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} placeholder="Discount Name" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
                  <input type="text" value={dForm.nameAr} onChange={(e) => setDForm({ ...dForm, nameAr: e.target.value })} placeholder="اسم الخصم" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">النوع</label>
                  <select value={dForm.type} onChange={(e) => setDForm({ ...dForm, type: e.target.value as Discount['type'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="product">خصم على منتج</option>
                    <option value="category">خصم على فئة</option>
                    <option value="order">خصم على طلب</option>
                    <option value="bundle">خصم حزمة</option>
                    <option value="seasonal">خصم موسمي</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">طريقة الخصم</label>
                  <select value={dForm.discountType} onChange={(e) => setDForm({ ...dForm, discountType: e.target.value as 'percentage' | 'fixed' })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="percentage">نسبة مئوية %</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">القيمة</label>
                  <input type="number" min={0} value={dForm.value || ''} onChange={(e) => setDForm({ ...dForm, value: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحد الأدنى للطلب</label>
                  <input type="number" min={0} value={dForm.minOrderValue || ''} onChange={(e) => setDForm({ ...dForm, minOrderValue: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">أقصى قيمة خصم</label>
                  <input type="number" min={0} value={dForm.maxDiscountValue || ''} onChange={(e) => setDForm({ ...dForm, maxDiscountValue: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                  <input type="date" value={dForm.startDate} onChange={(e) => setDForm({ ...dForm, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ النهاية</label>
                  <input type="date" value={dForm.endDate} onChange={(e) => setDForm({ ...dForm, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                  <select value={dForm.status} onChange={(e) => setDForm({ ...dForm, status: e.target.value as Discount['status'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea value={dForm.description} onChange={(e) => setDForm({ ...dForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <button onClick={saveDiscount} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all">حفظ الخصم</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Coupon Modal ═══ */}
      {couponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCouponModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">{couponModal === 'add' ? 'كوبون جديد' : 'تعديل الكوبون'}</h2>
              <button onClick={() => setCouponModal(null)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">كود الكوبون</label>
                  <input type="text" value={cForm.code} onChange={(e) => setCForm({ ...cForm, code: e.target.value.toUpperCase() })} placeholder="SALE20" dir="ltr" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم</label>
                  <input type="text" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">نوع الخصم</label>
                  <select value={cForm.type} onChange={(e) => setCForm({ ...cForm, type: e.target.value as Coupon['type'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="percentage">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                    <option value="free_shipping">شحن مجاني</option>
                    <option value="buy_x_get_y">اشترِ X احصل على Y</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">قيمة الخصم</label>
                  <input type="number" min={0} value={cForm.value || ''} onChange={(e) => setCForm({ ...cForm, value: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                  <select value={cForm.status} onChange={(e) => setCForm({ ...cForm, status: e.target.value as Coupon['status'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحد الأدنى</label>
                  <input type="number" min={0} value={cForm.minOrderValue || ''} onChange={(e) => setCForm({ ...cForm, minOrderValue: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">أقصى خصم</label>
                  <input type="number" min={0} value={cForm.maxDiscountValue || ''} onChange={(e) => setCForm({ ...cForm, maxDiscountValue: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">حد مرات الاستخدام (0 = بلا حد)</label>
                  <input type="number" min={0} value={cForm.usageLimit || ''} onChange={(e) => setCForm({ ...cForm, usageLimit: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                  <input type="date" value={cForm.startDate} onChange={(e) => setCForm({ ...cForm, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ النهاية</label>
                  <input type="date" value={cForm.endDate} onChange={(e) => setCForm({ ...cForm, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <button onClick={saveCoupon} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all">حفظ الكوبون</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Seasonal Modal ═══ */}
      {seasonalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSeasonalModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">{seasonalModal === 'add' ? 'عرض موسمي جديد' : 'تعديل العرض الموسمي'}</h2>
              <button onClick={() => setSeasonalModal(null)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">اسم الموسم / العرض</label>
                  <input type="text" value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} placeholder="رمضان كريم" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">المناسبة</label>
                  <input type="text" value={sForm.occasion} onChange={(e) => setSForm({ ...sForm, occasion: e.target.value })} placeholder="رمضان 2026" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">نوع الخصم</label>
                  <select value={sForm.discountType} onChange={(e) => setSForm({ ...sForm, discountType: e.target.value as 'percentage' | 'fixed' })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="percentage">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">قيمة الخصم</label>
                  <input type="number" min={0} value={sForm.discountValue || ''} onChange={(e) => setSForm({ ...sForm, discountValue: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">لون البانر</label>
                  <input type="color" value={sForm.bannerColor} onChange={(e) => setSForm({ ...sForm, bannerColor: e.target.value })} className="w-full h-10 px-1 rounded-lg border border-slate-200 cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                  <input type="date" value={sForm.startDate} onChange={(e) => setSForm({ ...sForm, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ النهاية</label>
                  <input type="date" value={sForm.endDate} onChange={(e) => setSForm({ ...sForm, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الفئات المشمولة (مفصولة بفاصلة)</label>
                <input type="text" value={sForm.categories} onChange={(e) => setSForm({ ...sForm, categories: e.target.value })} placeholder="ملابس، أحذية" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <button onClick={saveSeasonal} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                حفظ العرض الموسمي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Guide Modal ═══ */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل العروض والخصومات</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Info size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">إدارة كل أنواع العروض: الخصومات المباشرة، الكوبونات، والعروض الموسمية — في مكان واحد.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Percent size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">الأنواع</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• خصم: نسبة أو مبلغ — على منتج أو فئة أو طلب أو حزمة</li>
                  <li>• كوبون: كود يدفعه العميل — بحد أدنى وأقصى وعدد استخدامات</li>
                  <li>• عرض موسمي: مناسبة بفترة محددة وفئات مشمولة ولون بانر</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <OffersPageContent />
    </Suspense>
  );
}
