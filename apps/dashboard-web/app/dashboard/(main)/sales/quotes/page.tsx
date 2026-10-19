'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Plus, Search, Loader2, Eye, Trash2, X, FileText as FileIcon, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp, Info, Target, BookOpen, Zap, Link2, ClipboardList, Download, ChevronDown, ArrowUp, ArrowDown, Send, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import InfoButton, { PageHelpConfig } from '@/components/InfoButton';
import { getPageHelpConfig } from '@/config/pageHelp';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';

type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  items: number;
  total: number;
  status: string;
  createdAt: string;
  validUntil: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-slate-600', bg: 'bg-slate-100' },
  sent: { label: 'مرسلة', color: 'text-blue-600', bg: 'bg-blue-100' },
  accepted: { label: 'مقبولة', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: 'مرفوضة', color: 'text-red-600', bg: 'bg-red-100' },
  expired: { label: 'منتهية', color: 'text-amber-600', bg: 'bg-amber-100' },
};

export default function SalesQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  
  // New state variables for enhancements
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const helpConfig: PageHelpConfig = getPageHelpConfig('sales-quotes');

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/orders/me');
      const orders = Array.isArray(data) ? data : (data?.orders || data?.data || []);
      setQuotes(orders.map((o: any) => ({
        id: String(o.id),
        quoteNumber: o.orderNumber || `Q-${o.id}`,
        customerName: o.customerName || o.customer?.name || '---',
        customerPhone: o.customerPhone || o.customer?.phone || '---',
        items: o.items?.length || 0,
        total: Number(o.total || o.totalAmount || 0),
        status: 'draft',
        createdAt: o.createdAt || new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      })));
    } catch { setQuotes([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';


  // Handler functions for new features
  const filtered = useMemo(() => {
    let result = quotes.filter(q =>
      q.quoteNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      q.customerName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(q => q.status === filterStatus);
    }

    // Apply date range filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    if (dateRange === 'today') {
      result = result.filter(q => new Date(q.createdAt) >= today);
    } else if (dateRange === 'week') {
      result = result.filter(q => new Date(q.createdAt) >= weekAgo);
    } else if (dateRange === 'month') {
      result = result.filter(q => new Date(q.createdAt) >= monthAgo);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'total') {
        comparison = a.total - b.total;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [quotes, debouncedSearch, filterStatus, dateRange, sortBy, sortOrder]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q.id)));
    }
  }, [selectedIds, filtered]);

  const toggleSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }, [selectedIds]);

  const bulkSend = useCallback(() => {
    // Implement bulk send logic
    console.log('Sending quotes:', Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const bulkDelete = useCallback(() => {
    // Implement bulk delete logic
    console.log('Deleting quotes:', Array.from(selectedIds));
    setQuotes(prev => prev.filter(q => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const exportCSV = useCallback(() => {
    const headers = ['Quote Number', 'Customer Name', 'Customer Phone', 'Items', 'Total', 'Status', 'Created At', 'Valid Until'];
    const rows = filtered.map(q => [
      q.quoteNumber,
      q.customerName,
      q.customerPhone,
      q.items,
      q.total,
      q.status,
      q.createdAt,
      q.validUntil
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quotes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filtered]);

  // Pagination
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const stats = useMemo(() => [
    { label: 'إجمالي عروض الأسعار', value: filtered.length, color: 'bg-blue-50 text-blue-600' },
    { label: 'مقبولة', value: filtered.filter(q => q.status === 'accepted').length, color: 'bg-green-50 text-green-600' },
    { label: 'مرسلة', value: filtered.filter(q => q.status === 'sent').length, color: 'bg-blue-50 text-blue-600' },
    { label: 'إجمالي القيمة', value: `ج.م ${filtered.reduce((s, q) => s + q.total, 0).toLocaleString()}`, color: 'bg-amber-50 text-amber-600' },
  ], [filtered]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-row-reverse">
        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <FileText size={24} className="text-[#00E5FF]" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">عروض الأسعار</h1>
              <button
                onClick={() => setGuideOpen(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="معلومات / Info"
              >
                <Info size={18} />
              </button>
            </div>
            <p className="text-sm font-bold text-slate-400 mt-1">
              {isRestaurant ? 'إدارة عروض الأسعار للقوائم والوجبات' : 'إدارة عروض الأسعار المرسلة للعملاء'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          <Plus size={18} />
          عرض سعر جديد
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 flex-row-reverse">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <Download size={18} />
          تصدير CSV
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          <Plus size={18} />
          عرض سعر جديد
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap flex-row-reverse">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-600">الحالة:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">الكل</option>
              <option value="draft">مسودة</option>
              <option value="sent">مرسلة</option>
              <option value="accepted">مقبولة</option>
              <option value="rejected">مرفوضة</option>
              <option value="expired">منتهية</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-600">التاريخ:</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">الكل</option>
              <option value="today">اليوم</option>
              <option value="week">آخر أسبوع</option>
              <option value="month">آخر شهر</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-600">ترتيب حسب:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="date">التاريخ</option>
              <option value="total">الإجمالي</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
            title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            {sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between flex-row-reverse">
            <span className="text-sm font-bold text-blue-700">
              تم تحديد {selectedIds.size} عرض
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={bulkSend}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
              >
                <Send size={16} />
                إرسال الكل
              </button>
              <button
                onClick={bulkDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all"
              >
                <Trash2 size={16} />
                حذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileIcon}
          label="إجمالي عروض الأسعار"
          value={filtered.length}
          description="جميع العروض المنشأة"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Clock}
          label="مسودات"
          value={filtered.filter(q => q.status === 'draft').length}
          description="لم يتم الإرسال بعد"
          color="text-slate-600"
          bgColor="bg-slate-100"
        />
        <StatCard
          icon={CheckCircle2}
          label="مقبولة"
          value={filtered.filter(q => q.status === 'accepted').length}
          description="تمت الموافقة عليها"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={TrendingUp}
          label="معدل التحويل"
          value={`${filtered.length > 0 ? Math.round((filtered.filter(q => q.status === 'accepted').length / filtered.length) * 100) : 0}%`}
          description="تحولت إلى مبيعات"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileIcon}
          label="مرسلة"
          value={filtered.filter(q => q.status === 'sent').length}
          description="بانتظار الرد"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={XCircle}
          label="مرفوضة"
          value={filtered.filter(q => q.status === 'rejected').length}
          description="رفضها العميل"
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={AlertCircle}
          label="منتهية"
          value={filtered.filter(q => q.status === 'expired').length}
          description="انتهت صلاحيتها"
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={FileIcon}
          label="القيمة الإجمالية"
          value={`ج.م ${filtered.reduce((s, q) => s + q.total, 0).toLocaleString()}`}
          description="قيمة جميع العروض"
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-300" size={18} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم العرض أو اسم العميل..." className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} className="text-slate-200" />}
          title="لا توجد عروض أسعار بعد"
          description="ابدأ بإنشاء عرض سعر أولي وأرسله للعملاء بشكل احترافي"
          primaryAction={{
            label: 'إنشاء عرض سعر جديد',
            onClick: () => setShowModal(true),
          }}
          secondaryAction={{
            label: 'تعرف على عروض الأسعار',
            onClick: () => setShowHelp(true),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-right border-b border-slate-100">
              <th className="p-4 font-bold text-slate-400 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedQuotes.length && paginatedQuotes.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
              </th>
              <th className="p-4 font-bold text-slate-400">رقم العرض</th>
              <th className="p-4 font-bold text-slate-400">العميل</th>
              <th className="p-4 font-bold text-slate-400">العناصر</th>
              <th className="p-4 font-bold text-slate-400">الإجمالي</th>
              <th className="p-4 font-bold text-slate-400">الحالة</th>
              <th className="p-4 font-bold text-slate-400"></th>
            </tr></thead>
            <tbody>
              {paginatedQuotes.map(q => {
                const st = STATUS_STYLES[q.status] || STATUS_STYLES.draft;
                return (
                  <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900">{q.quoteNumber}</td>
                    <td className="p-4"><p className="font-medium text-slate-700">{q.customerName}</p><p className="text-xs text-slate-400" dir="ltr">{q.customerPhone}</p></td>
                    <td className="p-4 text-slate-500">{q.items}</td>
                    <td className="p-4 font-bold text-slate-900">ج.م {q.total.toLocaleString()}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="p-4"><div className="flex items-center gap-2"><Eye size={16} className="text-slate-400 hover:text-slate-600 cursor-pointer" /><Trash2 size={16} className="text-slate-400 hover:text-red-500 cursor-pointer" /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
            </span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
            <span className="text-sm font-bold text-slate-700">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h4 className="text-lg font-black text-slate-900">عرض سعر جديد</h4>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="اسم العميل" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <input placeholder="رقم الهاتف" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <input type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <button onClick={() => setShowModal(false)} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold">إنشاء</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">ما هي عروض الأسعار؟</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4 text-right">
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-2">الوصف</h3>
                <p className="text-sm text-slate-600">{helpConfig.description}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-2">متى تستخدم هذا؟</h3>
                <ul className="space-y-1">
                  {helpConfig.whenToUse.map((item, index) => (
                    <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-sm mb-2">مثال عملي</h3>
                <p className="text-sm text-slate-600">{helpConfig.businessExample}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل عروض الأسعار</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">إدارة عروض الأسعار المرسلة للعملاء، إنشاء عروض جديدة، ومتابعة الحالات (مسودة، مرسلة، مقبولة، مرفوضة، منتهية).</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><BookOpen size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">متى تستخدمها</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">عند الحاجة لإنشاء عرض سعر لعميل، مراجعة العروض المرسلة، أو متابعة الحالات.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><ClipboardList size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات (إجمالي عروض الأسعار، مسودات، مقبولة، معدل التحويل)</li>
                  <li>• جدول بجميع العروض مع العميل والمبلغ والحالة</li>
                  <li>• بحث برقم العرض أو اسم العميل</li>
                  <li>• زر إنشاء عرض جديد</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">كيفية العمل</h3></div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. اضغط "عرض سعر جديد" لإنشاء عرض</li>
                  <li>2. استخدم البحث للعثور على عرض محدد</li>
                  <li>3. راجع حالة كل عرض في الجدول</li>
                  <li>4. اضغط على أيقونة العين لعرض التفاصيل</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Zap size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">أفضل الممارسات</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• راجع العروض المسودة قبل الإرسال</li>
                  <li>• تابع معدل التحويل لتحسين العروض</li>
                  <li>• استخدم العروض المقبولة لتحليل السوق</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Zap size={18} className="text-amber-500" /><h3 className="font-bold text-slate-900">نصائح</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• معدل التحويل المرتفع يشير لعروض جيدة</li>
                  <li>• استخدم البحث للوصول السريع للعرض</li>
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
