'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Repeat,
  Search,
  Loader2,
  Calendar,
  X,
  Info,
  Target,
  BookOpen,
  Zap,
  Link2,
  ClipboardList,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronDown,
  Pause,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Subscription = {
  id: string;
  customerName: string;
  planName: string;
  amount: number;
  frequency: string;
  status: string;
  nextBilling: string;
  startedAt: string;
};

const FREQ_LABELS: Record<string, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي',
};
const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشط', color: 'text-green-600', bg: 'bg-green-100' },
  paused: { label: 'متوقف', color: 'text-amber-600', bg: 'bg-amber-100' },
  cancelled: { label: 'ملغي', color: 'text-red-600', bg: 'bg-red-100' },
  expired: { label: 'منتهي', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function SalesSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/customers/shop/${sid}`);
      const customers = Array.isArray(res) ? res : res?.data || [];
      setSubs(
        customers
          .filter((c: any) => c.hasSubscription)
          .map((c: any) => ({
            id: String(c.id),
            customerName: c.name || '---',
            planName: c.subscriptionPlan || 'الباقة الأساسية',
            amount: Number(c.subscriptionAmount || 99),
            frequency: c.subscriptionFrequency || 'monthly',
            status: c.subscriptionStatus || 'active',
            nextBilling: c.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString(),
            startedAt: c.createdAt || new Date().toISOString(),
          }))
      );
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';

  const filtered = useMemo(() => {
    let result = subs.filter((s) =>
      s.customerName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      result = result.filter((s) => new Date(s.startedAt).toDateString() === now.toDateString());
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((s) => new Date(s.startedAt) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter((s) => new Date(s.startedAt) >= monthAgo);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [subs, debouncedSearch, filterStatus, dateRange, sortBy, sortOrder]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }, [selectedIds, filtered]);

  const toggleSelect = useCallback(
    (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    },
    [selectedIds]
  );

  const bulkPause = useCallback(async () => {
    if (selectedIds.size === 0) return;
    // TODO: Implement bulk pause API call
    console.log('Pausing subscriptions:', Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const bulkCancel = useCallback(async () => {
    if (selectedIds.size === 0) return;
    // TODO: Implement bulk cancel API call
    console.log('Cancelling subscriptions:', Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const exportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Customer Name',
      'Plan Name',
      'Amount',
      'Frequency',
      'Status',
      'Next Billing',
      'Started At',
    ];
    const rows = filtered.map((s) => [
      s.id,
      s.customerName,
      s.planName,
      s.amount,
      s.frequency,
      s.status,
      s.nextBilling,
      s.startedAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'subscriptions.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'subscriptions.csv');
    });
  }, [filtered]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const stats = useMemo(() => {
    const totalRevenue = subs
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + s.amount, 0);
    return [
      { label: 'إجمالي الاشتراكات', value: subs.length, color: 'bg-blue-50 text-blue-600' },
      {
        label: 'نشطة',
        value: subs.filter((s) => s.status === 'active').length,
        color: 'bg-green-50 text-green-600',
      },
      {
        label: 'متوقفة',
        value: subs.filter((s) => s.status === 'paused').length,
        color: 'bg-amber-50 text-amber-600',
      },
      {
        label: 'الإيراد الشهري',
        value: `ج.م ${totalRevenue.toLocaleString()}`,
        color: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [subs]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Repeat size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الاشتراكات</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">إدارة اشتراكات العملاء المتكررة</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all"
        >
          <Download size={16} />
          تصدير CSV
        </button>
        <button
          onClick={loadSubs}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white"
          >
            <div className={`p-2 rounded-xl ${s.color}`}>
              <Repeat size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">{s.label}</p>
              <p className="text-lg font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-300" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="paused">متوقف</option>
            <option value="cancelled">ملغي</option>
            <option value="expired">منتهي</option>
          </select>
          <ChevronDown
            className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 pointer-events-none"
            size={16}
          />
        </div>

        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="appearance-none pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
          >
            <option value="all">كل التواريخ</option>
            <option value="today">اليوم</option>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
          </select>
          <ChevronDown
            className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 pointer-events-none"
            size={16}
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
          >
            <option value="date">ترتيب بالتاريخ</option>
            <option value="amount">ترتيب بالمبلغ</option>
          </select>
          <ChevronDown
            className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 pointer-events-none"
            size={16}
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all"
        >
          {sortOrder === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-sm font-bold text-amber-700">{selectedIds.size} اشتراك محدد</span>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkPause}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all"
            >
              <Pause size={16} />
              إيقاف الكل
            </button>
            <button
              onClick={bulkCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all"
            >
              <XCircle size={16} />
              إلغاء الكل
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Repeat size={48} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 font-bold text-sm">لا توجد اشتراكات</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-slate-100">
                  <th className="p-4 font-bold text-slate-400 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === paginatedData.length && paginatedData.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 font-bold text-slate-400">العميل</th>
                  <th className="p-4 font-bold text-slate-400">الباقة</th>
                  <th className="p-4 font-bold text-slate-400">المبلغ</th>
                  <th className="p-4 font-bold text-slate-400">التكرار</th>
                  <th className="p-4 font-bold text-slate-400">الحالة</th>
                  <th className="p-4 font-bold text-slate-400">الفاتورة القادمة</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((s) => {
                  const st = STATUS_STYLES[s.status] || STATUS_STYLES.active;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-bold text-slate-900">{s.customerName}</td>
                      <td className="p-4 text-slate-500">{s.planName}</td>
                      <td className="p-4 font-bold text-slate-900">
                        ج.م {s.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-500">
                        {FREQ_LABELS[s.frequency] || s.frequency}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold ${st.bg} ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />{' '}
                          {new Date(s.nextBilling).toLocaleDateString('ar-EG')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
              <div className="text-sm text-slate-500">
                عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={20} />
                </button>
                <span className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل الاشتراكات</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إدارة ومتابعة اشتراكات العملاء المتكررة (يومية، أسبوعية، شهرية، سنوية)، تتبع حالة
                  كل اشتراك والإيرادات المتوقعة.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  عند الحاجة لمراجعة الاشتراكات النشطة، متابعة الفواتير القادمة، وتحليل الإيرادات
                  المتكررة.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات (إجمالي الاشتراكات، النشطة، المتوقفة، الإيراد الشهري)</li>
                  <li>• جدول بجميع الاشتراكات مع تفاصيل العميل والباقة</li>
                  <li>• بحث بالاسم</li>
                  <li>• حالات الاشتراك (نشط، متوقف، ملغي، منتهي)</li>
                  <li>• إجراءات سريعة (تصدير CSV، تحديث)</li>
                  <li>• فلاتر متقدمة (الحالة، نطاق التاريخ، الترتيب)</li>
                  <li>• إجراءات جماعية (إيقاف، إلغاء)</li>
                  <li>• ترقيم الصفحات</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيفية العمل</h3>
                </div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع الإحصائيات لفهم حجم الاشتراكات</li>
                  <li>2. استخدم البحث للعثور على عميل محدد</li>
                  <li>3. استخدم الفلاتر المتقدمة لتضييق النتائج</li>
                  <li>4. حدد اشتراكات متعددة للإجراءات الجماعية</li>
                  <li>5. استخدم التصدير CSV للحصول على تقرير</li>
                  <li>6. تابع حالة كل اشتراك في الجدول</li>
                  <li>7. راجع تاريخ الفاتورة القادمة لكل اشتراك</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• تابع الاشتراكات المتوقفة لإعادة تفعيلها</li>
                  <li>• راجع الإيراد الشهري للتخطيط المالي</li>
                  <li>• تأكد من تحديث تواريخ الفواتير القادمة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900">نصائح</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• الاشتراكات النشطة هي مصدر دخل ثابت — حافظ عليها</li>
                  <li>• تواصل مع العملاء المتوقفين لإعادة تفعيل اشتراكهم</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• المدفوعات</li>
                  <li>• ولاء العملاء</li>
                  <li>• المبيعات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
