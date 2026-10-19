'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Loader2,
  Plus,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Check,
  Info,
  Archive,
  ArchiveRestore,
  MessageCircle,
  Eye,
  Pencil,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  MoreVertical,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useShop } from '@/hooks/useShop';

/* ============================================================
 * العملاء — القائمة المركزية الموحدة (كيان واحد لكل النظام)
 * هيكل موحد مثل صفحة الطلبات: هيدر → كارت فلاتر → جدول + سهم توسيع
 * ============================================================ */

type ShopCustomer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  customerType: string;
  companyName: string;
  status: string;
  city: string;
  country: string;
  branch: string;
  source: string;
  segmentId: string;
  tags: string[];
  archived: boolean;
  loyaltyBalance: number;
  balanceDue: number;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  createdAt: string;
};

type Tag = { id: string; name: string; nameAr?: string; color?: string };
type Segment = { id: string; name: string; nameAr?: string };

const SOURCE_LABELS: Record<string, string> = {
  pos: 'الكاشير',
  website: 'المتجر الإلكتروني',
  bookings: 'الحجوزات',
  services: 'الخدمات',
  manual: 'إضافة يدوية',
  import: 'استيراد',
  app: 'تطبيق العميل',
  customer: 'المتجر الإلكتروني',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: 'نشط', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'غير نشط', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  blocked: { label: 'محظور', cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function CustomersPage() {
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [guideOpen, setGuideOpen] = useState(false);
  const [statusTab, setStatusTab] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<Record<string, any[]>>({});
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const [custsRes, tagsRes, segRes] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/customers?limit=500`),
        apiRequest(`/shops/${shopId}/tags`),
        apiRequest(`/shops/${shopId}/segments`),
      ]);
      if (custsRes.status === 'fulfilled') {
        const data = Array.isArray(custsRes.value) ? custsRes.value : custsRes.value?.data || [];
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        setCustomers([]);
        setError('تعذر تحميل العملاء');
      }
      if (tagsRes.status === 'fulfilled') {
        const t = Array.isArray(tagsRes.value) ? tagsRes.value : tagsRes.value?.data || [];
        setTags(Array.isArray(t) ? t : []);
      }
      if (segRes.status === 'fulfilled') {
        const s = Array.isArray(segRes.value) ? segRes.value : segRes.value?.data || [];
        setSegments(Array.isArray(s) ? s : []);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const tagName = (id: string) => {
    const t = tags.find((x) => x.id === id);
    return t?.nameAr || t?.name || id;
  };
  const tagColor = (id: string) => tags.find((x) => x.id === id)?.color || '#64748B';

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.status === 'active').length,
      inactive: customers.filter((c) => c.status === 'inactive').length,
      blocked: customers.filter((c) => c.status === 'blocked').length,
      debtors: customers.filter((c) => c.balanceDue > 0).length,
    }),
    [customers]
  );

  const filtered = useMemo(() => {
    let result = [...customers];
    if (statusTab === 'debtors') result = result.filter((c) => c.balanceDue > 0);
    else if (statusTab !== 'all') result = result.filter((c) => c.status === statusTab);
    if (sourceFilter) result = result.filter((c) => c.source === sourceFilter);
    if (segmentFilter) result = result.filter((c) => c.segmentId === segmentFilter);
    if (tagFilter) result = result.filter((c) => (c.tags || []).includes(tagFilter));
    return result;
  }, [customers, statusTab, sourceFilter, segmentFilter, tagFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, sourceFilter, segmentFilter, tagFilter, showArchived]);

  const exportCSV = useCallback(() => {
    const csv = [
      [
        'الكود',
        'الاسم',
        'الهاتف',
        'الإيميل',
        'النوع',
        'المصدر',
        'الحالة',
        'الطلبات',
        'المبيعات',
        'المستحق',
        'نقاط الولاء',
        'التسجيل',
      ].join(','),
      ...filtered.map((c) =>
        [
          c.code,
          c.name,
          c.phone,
          c.email,
          c.customerType === 'company' ? 'شركة' : 'فرد',
          SOURCE_LABELS[c.source] || c.source,
          c.status,
          c.totalOrders,
          c.totalSpent,
          c.balanceDue,
          c.loyaltyBalance,
          new Date(c.createdAt).toLocaleDateString('ar-EG'),
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filtered]);

  const toggleArchive = async (c: ShopCustomer) => {
    setArchivingId(c.id);
    try {
      await apiRequest(`/shops/${shopId}/customers/${c.id}/${c.archived ? 'restore' : 'archive'}`, {
        method: 'POST',
      });
      setCustomers((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, archived: !c.archived } : x))
      );
      setExpandedId(null);
    } catch {
    } finally {
      setArchivingId(null);
    }
  };

  const loadExpandedActivity = async (c: ShopCustomer) => {
    if (expandedActivity[c.id]) return;
    try {
      const rows = await apiRequest(`/shops/${shopId}/customers/${c.id}/activity?type=orders`);
      setExpandedActivity((prev) => ({
        ...prev,
        [c.id]: Array.isArray(rows) ? rows.slice(0, 3) : [],
      }));
    } catch {
      setExpandedActivity((prev) => ({ ...prev, [c.id]: [] }));
    }
  };

  const TABS = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'active', label: 'نشط', count: counts.active },
    { id: 'inactive', label: 'غير نشط', count: counts.inactive },
    { id: 'blocked', label: 'محظور', count: counts.blocked },
    { id: 'debtors', label: 'مدينون', count: counts.debtors },
  ];

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر موحد: عنوان + وصف — الإجراءات في الطرف المقابل */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">العملاء</h1>
              <button
                onClick={() => setGuideOpen(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="معلومات / Info"
              >
                <Info size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              قاعدة عملاء موحدة لكل النظام — كاشير وموقع وحجوزات
              {customers.length > 0 && (
                <span className="font-semibold"> — {customers.length} عميل</span>
              )}
              {counts.debtors > 0 && (
                <span className="text-red-600 font-semibold"> — {counts.debtors} مدين</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download size={13} />
              تصدير
            </button>
            <Link
              href="/dashboard/customers/new"
              className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Plus size={13} />
              عميل جديد
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] font-bold">
            <Archive size={15} />
            {error}
          </div>
        </div>
      )}

      {/* شريط الفلاتر: تابات الحالة بالأعداد + البحث والفلاتر */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = statusTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setStatusTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] tabular-nums px-1.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-2 sm:px-3 pb-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو الإيميل أو الكود أو رقم طلب..."
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">كل المصادر</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {segments.length > 0 && (
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">كل الشرائح</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr || s.name}
                  </option>
                ))}
              </select>
            )}
            {tags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">كل الوسوم</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr || t.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`h-10 px-4 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showArchived
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Archive size={13} />
              الأرشيف
            </button>
          </div>
        </div>
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Users size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">
              {showArchived ? 'الأرشيف فاضي' : 'لا يوجد عملاء حالياً'}
            </p>
            {!showArchived && customers.length === 0 && (
              <Link
                href="/dashboard/customers/new"
                className="mt-3 inline-block text-xs font-bold text-slate-900 underline"
              >
                إضافة أول عميل
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
                    <th className="px-4 py-3.5 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(Array.from(new Set([...selectedIds, ...paginated.map((c) => c.id)])));
                          } else {
                            setSelectedIds(selectedIds.filter((id) => !paginated.some((c) => c.id === id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3.5">
                      <div className="leading-tight">
                        <div>الاسم</div>
                        <div className="text-[10px] text-slate-400 font-semibold">النوع</div>
                      </div>
                    </th>
                    <th className="px-3 py-3.5">
                      <div className="leading-tight">
                        <div>الجوال</div>
                        <div className="text-[10px] text-slate-400 font-semibold">البريد الإلكتروني</div>
                      </div>
                    </th>
                    <th className="px-3 py-3.5">
                      <div className="leading-tight">
                        <div>المدينة</div>
                        <div className="text-[10px] text-slate-400 font-semibold">الدولة</div>
                      </div>
                    </th>
                    <th className="px-3 py-3.5">قناة الوصول</th>
                    <th className="px-3 py-3.5 text-center">إجمالي الطلبات</th>
                    <th className="px-3 py-3.5 text-center">نقاط الولاء</th>
                    <th className="px-4 py-3.5 w-44 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => {
                    const isExpanded = expandedId === c.id;
                    const isSelected = selectedIds.includes(c.id);
                    const isMenuOpen = menuOpenId === c.id;
                    // السوق المستهدف مصر — العملة الافتراضية جنيه مصري دائمًا.
                    const curr = 'ج.م';
                    const completedOrdersCount = (expandedActivity[c.id] || []).filter(
                      (o: any) => o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.status === 'مكتمل'
                    ).length;

                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                            isExpanded ? 'bg-slate-50/60' : ''
                          } ${isSelected ? 'bg-purple-50/30' : ''}`}
                        >
                          {/* Checkbox + سهم التوسيع/الطي كالصورة 1 */}
                          <td className="px-3 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedIds([...selectedIds, c.id]);
                                  else setSelectedIds(selectedIds.filter((id) => id !== c.id));
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(isExpanded ? null : c.id);
                                  if (!isExpanded) loadExpandedActivity(c);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-900 transition-all"
                                title={isExpanded ? 'إغلاق التفاصيل' : 'عرض ملخص العميل'}
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-slate-700" />
                                ) : (
                                  <ChevronDown size={16} className="text-slate-400" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* الاسم / النوع */}
                          <td className="px-3 py-3.5">
                            <Link
                              href={`/dashboard/customers/${c.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-purple-700 hover:underline block leading-tight"
                            >
                              {c.name}
                            </Link>
                            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                              {c.customerType === 'company' ? (c.companyName || 'شركة') : 'فرد'}
                            </div>
                          </td>

                          {/* الجوال / البريد الإلكتروني */}
                          <td className="px-3 py-3.5">
                            <div className="text-xs font-bold text-slate-700 tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                              {c.phone || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                              {c.email || '—'}
                            </div>
                          </td>

                          {/* المدينة / الدولة */}
                          <td className="px-3 py-3.5">
                            <div className="text-xs font-bold text-slate-800 leading-tight">
                              {c.city || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                              {c.country || 'مصر'}
                            </div>
                          </td>

                          {/* قناة الوصول */}
                          <td className="px-3 py-3.5">
                            <span className="text-xs font-semibold text-slate-700">
                              {SOURCE_LABELS[c.source] || c.source || 'المتجر الإلكتروني'}
                            </span>
                          </td>

                          {/* إجمالي الطلبات */}
                          <td className="px-3 py-3.5 text-center">
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              {c.totalOrders ?? 0}
                            </span>
                          </td>

                          {/* نقاط الولاء */}
                          <td className="px-3 py-3.5 text-center">
                            <span className="text-xs font-bold text-slate-800 tabular-nums">
                              {c.loyaltyBalance ?? 0}
                            </span>
                          </td>

                          {/* الإجراءات: زر تعديل بنفسجي + زر خيارات ... */}
                          <td className="px-4 py-3.5 text-left">
                            <div className="flex items-center justify-end gap-2 relative">
                              <Link
                                href={`/dashboard/customers/${c.id}/edit`}
                                className="h-8 px-4 rounded-full bg-[#492770] hover:bg-[#3d1f5e] text-white text-[11px] font-bold flex items-center justify-center transition-all shadow-sm"
                              >
                                تعديل
                              </Link>

                              <button
                                type="button"
                                onClick={() => setMenuOpenId(isMenuOpen ? null : c.id)}
                                className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                title="المزيد من الخيارات"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {/* القائمة المنسدلة للخيارات */}
                              {isMenuOpen && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setMenuOpenId(null)}
                                  />
                                  <div className="absolute left-0 top-10 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 space-y-0.5 text-right">
                                    <Link
                                      href={`/dashboard/customers/${c.id}`}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      onClick={() => setMenuOpenId(null)}
                                    >
                                      <Eye size={13} className="text-purple-600" />
                                      عرض التفاصيل
                                    </Link>
                                    <Link
                                      href={`/dashboard/customers/${c.id}/edit`}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      onClick={() => setMenuOpenId(null)}
                                    >
                                      <Pencil size={13} className="text-slate-500" />
                                      تعديل البيانات
                                    </Link>
                                    {c.phone && (
                                      <a
                                        href={`https://wa.me/2${(c.phone || '').replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                        onClick={() => setMenuOpenId(null)}
                                      >
                                        <MessageCircle size={13} />
                                        محادثة واتساب
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMenuOpenId(null);
                                        toggleArchive(c);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                      {c.archived ? (
                                        <>
                                          <ArchiveRestore size={13} />
                                          استعادة العميل
                                        </>
                                      ) : (
                                        <>
                                          <Archive size={13} />
                                          أرشفة العميل
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* صف التوسيع كالصورة 1 تماماً: 3 كروت إحصائية + زر عرض التفاصيل */}
                        {isExpanded && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={8} className="px-6 py-4 border-b border-slate-200">
                              <div className="space-y-4">
                                {/* الكروت الثلاثة: جميع الطلبات | الطلبات المكتملة | إجمالي المصروفات كالصورة 1 */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* كارت جميع الطلبات */}
                                  <div className="bg-[#FAF9FB] border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                      <div className="text-xs font-bold text-slate-500 mb-1">
                                        جميع الطلبات
                                      </div>
                                      <div className="text-xl font-black text-slate-900 tabular-nums">
                                        {c.totalOrders ?? 0}
                                      </div>
                                    </div>
                                    <div className="w-11 h-11 rounded-2xl bg-purple-100/70 text-[#492770] flex items-center justify-center">
                                      <ShoppingBag size={20} />
                                    </div>
                                  </div>

                                  {/* كارت الطلبات المكتملة */}
                                  <div className="bg-[#FAF9FB] border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                      <div className="text-xs font-bold text-slate-500 mb-1">
                                        الطلبات المكتملة
                                      </div>
                                      <div className="text-xl font-black text-slate-900 tabular-nums">
                                        {completedOrdersCount || Math.min(c.totalOrders || 0, 0)}
                                      </div>
                                    </div>
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                                      <CheckCircle2 size={20} />
                                    </div>
                                  </div>

                                  {/* كارت إجمالي المصروفات */}
                                  <div className="bg-[#FAF9FB] border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                      <div className="text-xs font-bold text-slate-500 mb-1">
                                        إجمالي المصروفات
                                      </div>
                                      <div className="text-xl font-black text-slate-900 tabular-nums">
                                        {c.totalSpent.toLocaleString()} {curr}
                                      </div>
                                    </div>
                                    <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
                                      <CreditCard size={20} />
                                    </div>
                                  </div>
                                </div>

                                {/* شريط الإجراءات السريعة مع زر عرض التفاصيل البارز */}
                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/dashboard/customers/${c.id}`}
                                      className="h-9 px-5 rounded-full bg-[#492770] hover:bg-[#3d1f5e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                    >
                                      <Eye size={14} />
                                      عرض التفاصيل
                                      <ChevronLeft size={14} />
                                    </Link>
                                    <Link
                                      href={`/dashboard/customers/${c.id}/edit`}
                                      className="h-9 px-4 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                                    >
                                      <Pencil size={13} />
                                      تعديل بيانات العميل
                                    </Link>
                                    {c.phone && (
                                      <a
                                        href={`https://wa.me/2${(c.phone || '').replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-9 px-4 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-all"
                                      >
                                        <MessageCircle size={13} />
                                        واتساب
                                      </a>
                                    )}
                                  </div>

                                  <div className="text-xs font-semibold text-slate-400">
                                    كود العميل:{' '}
                                    <span className="font-bold text-slate-700 tabular-nums">
                                      {c.code || '—'}
                                    </span>
                                    {c.lastPurchaseAt && (
                                      <span className="mr-3">
                                        آخر عملية شراء:{' '}
                                        <span className="text-slate-700 font-bold">
                                          {new Date(c.lastPurchaseAt).toLocaleDateString('ar-EG')}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-3 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">عرض</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-[11px] font-bold text-slate-500">لكل صفحة</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* دليل الصفحة */}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">عن صفحة العملاء</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <Check size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-right text-sm text-slate-600 leading-relaxed">
              <p>
                قاعدة عملاء موحدة لكل النظام: أي عميل يتسجل من الكاشير أو الموقع أو الحجوزات يظهر
                هنا تلقائيًا — مفيش قواعد منفصلة.
              </p>
              <p>• اضغط السهم جنب أي عميل لأهم إحصائياته وآخر طلباته.</p>
              <p>
                • «عرض الملف الكامل» يفتح صفحة كاملة: النشاط، كشف الحساب، سجل التواصل، ونقاط الولاء.
              </p>
              <p>• الأرشفة تخفي العميل من القوائم مع الاحتفاظ بكل عملياته القديمة.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
