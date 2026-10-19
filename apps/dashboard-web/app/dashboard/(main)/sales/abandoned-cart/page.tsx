'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShoppingCart, RefreshCw, Loader2, CheckCircle, TrendingUp, XCircle, X,
  Info, Target, BookOpen, Zap, Link2, ClipboardList,
  Download, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  CheckSquare, Square,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';

type CartEvent = {
  id: string;
  event: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  product?: { name?: string };
  quantity?: number;
  unitPrice?: number;
  isRecovered?: boolean;
  createdAt?: string;
};

export default function SalesAbandonedCartPage() {
  const [stats, setStats] = useState<any>(null);
  const [list, setList] = useState<CartEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  // Advanced filters
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'abandoned' | 'recovered'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setError('لم يتم العثور على المتجر'); setLoading(false); return; }
      const [statsRes, listRes] = await Promise.allSettled([
        apiRequest(`/abandoned-carts/stats?shopId=${sid}`),
        apiRequest(`/abandoned-carts?shopId=${sid}&limit=50`),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      else setStats({ addedToCart: 0, checkoutStarted: 0, abandoned: 0, recovered: 0, abandonmentRate: 0, recoveryRate: 0 });
      if (listRes.status === 'fulfilled') {
        const data = listRes.value;
        setList(Array.isArray(data) ? data : (data?.items || data?.data || []));
      } else {
        setList([]);
      }
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل البيانات');
      setStats({ addedToCart: 0, checkoutStarted: 0, abandoned: 0, recovered: 0, abandonmentRate: 0, recoveryRate: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';


  const handleMarkRecovered = async (id: string) => {
    try {
      await apiRequest(`/abandoned-carts/${id}/recover`, { method: 'PATCH' });
      setList(prev => prev.map(e => e.id === id ? { ...e, isRecovered: true } : e));
      setStats((prev: any) => ({ ...prev, recovered: (prev?.recovered || 0) + 1 }));
    } catch (err: any) {
      setError(err?.message || 'فشل تحديث الحالة');
    }
  };

  const formatMoney = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : '0.00'; };
  const formatDate = (d: any) => { const dt = new Date(String(d)); return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('ar-EG'); };

  const filtered = useMemo(() => {
    let result = [...list];

    // Date filter
    const now = new Date();
    if (dateRange === 'today') {
      result = result.filter(e => new Date(e.createdAt || Date.now()).toDateString() === now.toDateString());
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(e => new Date(e.createdAt || Date.now()) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(e => new Date(e.createdAt || Date.now()) >= monthAgo);
    }

    // Status filter
    if (statusFilter === 'abandoned') result = result.filter(e => !e.isRecovered);
    else if (statusFilter === 'recovered') result = result.filter(e => e.isRecovered);

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt || Date.now()).getTime() - new Date(b.createdAt || Date.now()).getTime();
      } else if (sortBy === 'amount') {
        comparison = Number(a.unitPrice || 0) - Number(b.unitPrice || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [list, dateRange, statusFilter, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, statusFilter, sortBy, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map(e => e.id)));
  }, [paginated, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkRecover = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => apiRequest(`/abandoned-carts/${id}/recover`, { method: 'PATCH' })));
      await loadData();
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'فشل الاسترجاع الجماعي');
    } finally {
      setLoading(false);
    }
  }, [selectedIds, loadData]);

  const exportCSV = useCallback(() => {
    const csv = [
      ['التاريخ', 'الحدث', 'العميل', 'المنتج', 'الكمية', 'السعر', 'الحالة'].join(','),
      ...paginated.map(e => [
        formatDate(e.createdAt),
        e.event,
        e.customerName || '',
        e.product?.name || '',
        e.quantity || 0,
        formatMoney(e.unitPrice),
        e.isRecovered ? 'تم استرجاعها' : 'متروكة',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `abandoned-carts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [paginated]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <ShoppingCart size={24} className="text-[#00E5FF]" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">السلات المتروكة</h1>
              <button onClick={() => setGuideOpen(true)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
                <Info size={18} />
              </button>
            </div>
            <p className="text-sm font-bold text-slate-400 mt-1">السلات التي لم تكتمل عملية الشراء</p>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold text-right">{error}</div>}

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50">
          <Download size={18} />
          تصدير CSV
        </button>
        <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          تحديث
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-slate-600" />
          <span className="font-bold text-slate-900">الفلاتر المتقدمة</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">نطاق التاريخ</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white"
            >
              <option value="all">الكل</option>
              <option value="today">اليوم</option>
              <option value="week">الأسبوع</option>
              <option value="month">الشهر</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white"
            >
              <option value="all">الكل</option>
              <option value="abandoned">متروكة</option>
              <option value="recovered">تم استرجاعها</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">الترتيب حسب</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white"
            >
              <option value="date">التاريخ</option>
              <option value="amount">المبلغ</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ترتيب</label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <ArrowUpDown size={16} />
              {sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
          <span className="font-bold text-blue-900">تم تحديد {selectedIds.size} سلة</span>
          <div className="flex items-center gap-2">
            <button onClick={bulkRecover} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
              <CheckCircle size={16} />
              استرجاع الكل
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50">
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-blue-50 text-blue-600"><ShoppingCart size={20} /></div>
          <span className="text-slate-500 font-semibold text-xs mb-1">أضيف للسلة</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.addedToCart ?? 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-purple-50 text-purple-600"><TrendingUp size={20} /></div>
          <span className="text-slate-500 font-semibold text-xs mb-1">بدأ الدفع</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.checkoutStarted ?? 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-red-50 text-red-600"><XCircle size={20} /></div>
          <span className="text-slate-500 font-semibold text-xs mb-1">متروكة</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.abandoned ?? 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-green-50 text-green-600"><CheckCircle size={20} /></div>
          <span className="text-slate-500 font-semibold text-xs mb-1">تم استرجاعها</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats?.recovered ?? 0}</span>
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
          <span className="text-xs font-semibold text-slate-500 mb-2 block">معدل الترك</span>
          <span className="text-2xl font-bold text-slate-900">{stats?.abandonmentRate ?? 0}%</span>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
          <span className="text-xs font-semibold text-slate-500 mb-2 block">معدل الاسترجاع</span>
          <span className="text-2xl font-bold text-slate-900">{stats?.recoveryRate ?? 0}%</span>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-right">قائمة السلات المتروكة</div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
          ) : paginated.length === 0 ? (
            <div className="py-12 text-center"><ShoppingCart size={48} className="mx-auto mb-3 text-slate-200" /><p className="text-slate-400 font-bold text-sm">لا توجد سلات متروكة</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full">
                <thead><tr className="text-right">
                  <th className="text-xs font-semibold text-slate-500 pb-3 w-10">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-100 rounded">
                      {selectedIds.size === paginated.length ? <CheckSquare size={16} className="text-slate-700" /> : <Square size={16} className="text-slate-400" />}
                    </button>
                  </th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">التاريخ</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">الحدث</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">العميل</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">المنتج</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">الكمية</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">السعر</th>
                  <th className="text-xs font-semibold text-slate-500 pb-3">إجراء</th>
                </tr></thead>
                <tbody>
                  {paginated.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="py-3 text-right">
                        <button onClick={() => toggleSelect(row.id)} className="p-1 hover:bg-slate-100 rounded">
                          {selectedIds.has(row.id) ? <CheckSquare size={16} className="text-slate-700" /> : <Square size={16} className="text-slate-400" />}
                        </button>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700 text-sm">{formatDate(row.createdAt)}</td>
                      <td className="py-3 text-right font-semibold text-slate-700 text-sm">{String(row.event || '').replace('_', ' ')}</td>
                      <td className="py-3 text-right font-semibold text-slate-700 text-sm">
                        {row.customerName ? (<div><div>{row.customerName}</div>{row.customerPhone && <div className="text-xs text-slate-500" dir="ltr">{row.customerPhone}</div>}</div>) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700 text-sm">{row.product?.name || '-'}</td>
                      <td className="py-3 text-right font-semibold text-slate-700 text-sm">{row.quantity || 1}</td>
                      <td className="py-3 text-right font-bold text-slate-900 text-sm">ج.م {formatMoney(row.unitPrice)}</td>
                      <td className="py-3 text-right">
                        {!row.isRecovered ? (
                          <button onClick={() => handleMarkRecovered(row.id)} className="px-3 py-2 rounded-lg bg-green-500 text-white font-semibold text-xs hover:bg-green-600 transition-colors">استرجاع</button>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 font-semibold text-xs w-fit"><CheckCircle size={14} /> تم</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {paginated.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              عرض {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
                السابق
              </button>
              <span className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل السلات المتروكة</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">تتبع السلات التي أضافها العملاء ولكن لم يكملوا عملية الشراء، مع إمكانية استرجاع هذه السلات وتحويلها لمبيعات مكتملة.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><BookOpen size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">متى تستخدمها</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">عند الحاجة لمراجعة السلات المتروكة، فهم سلوك العملاء، ومحاولة استرجاع المبيعات المفقودة.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><ClipboardList size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات (أضيف للسلة، بدأ الدفع، متروكة، تم استرجاعها)</li>
                  <li>• معدلات الترك والاسترجاع بالنسبة المئوية</li>
                  <li>• جدول بجميع السلات المتروكة مع تفاصيل العميل والمنتج</li>
                  <li>• زر استرجاع لكل سلة متروكة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">كيفية العمل</h3></div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع الإحصائيات لفهم حجم السلات المتروكة</li>
                  <li>2. اضغط زر تحديث لجلب أحدث البيانات</li>
                  <li>3. راجع الجدول وحدد السلات التي يمكن استرجاعها</li>
                  <li>4. اضغط زر "استرجاع" للسلات التي تم تحويلها لمبيعات</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Zap size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">أفضل الممارسات</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• راجع السلات المتروكة بانتظام لاسترجاع أكبر عدد ممكن</li>
                  <li>• حلل معدل الترك لتحديد مشاكل في عملية الدفع</li>
                  <li>• تواصل مع العملاء الذين تركوا السلات لتشجيعهم على إكمال الشراء</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Zap size={18} className="text-amber-500" /><h3 className="font-bold text-slate-900">نصائح</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• معدل الترك المرتفع يشير لمشكلة في تجربة الدفع</li>
                  <li>• استخدم بيانات العميل لمتابعة السلات المتروكة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Link2 size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">روابط ذات صلة</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• المبيعات</li>
                  <li>• المدفوعات</li>
                  <li>• حالة الطلب</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
