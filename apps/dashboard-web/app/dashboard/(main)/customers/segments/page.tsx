'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Download,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Segment = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  criteria: {
    minSpent?: number;
    maxSpent?: number;
    minOrders?: number;
    maxOrders?: number;
    minLoyaltyPoints?: number;
    maxLoyaltyPoints?: number;
    registeredAfter?: string;
    registeredBefore?: string;
    lastPurchaseAfter?: string;
    lastPurchaseBefore?: string;
    tags?: string[];
    categories?: string[];
  };
  customerCount: number;
  totalSpent: number;
  averageOrderValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CustomerSegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('customerCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editSegment, setEditSegment] = useState<Segment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    minSpent: '',
    maxSpent: '',
    minOrders: '',
    maxOrders: '',
    minLoyaltyPoints: '',
    maxLoyaltyPoints: '',
  });

  const loadSegments = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      // Load segments from the backend API
      const segmentsData = await apiRequest(`/shops/${sid}/segments`);
      setSegments(Array.isArray(segmentsData) ? segmentsData : []);
    } catch {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const filtered = useMemo(() => {
    let result = segments.filter(
      (s) =>
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.nameAr.includes(debouncedSearch)
    );

    if (filterStatus !== 'all') {
      result = result.filter((s) => (filterStatus === 'active' ? s.isActive : !s.isActive));
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'customerCount'
          ? a.customerCount
          : sortBy === 'totalSpent'
            ? a.totalSpent
            : sortBy === 'averageOrderValue'
              ? a.averageOrderValue
              : a.createdAt;
      const bVal =
        sortBy === 'customerCount'
          ? b.customerCount
          : sortBy === 'totalSpent'
            ? b.totalSpent
            : sortBy === 'averageOrderValue'
              ? b.averageOrderValue
              : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [segments, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedSegments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedSegments.length && paginatedSegments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSegments.map((s) => s.id)));
    }
  }, [paginatedSegments, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const created = await apiRequest(`/shops/${sid}/segments`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr,
          description: formData.description,
          criteria: {
            minSpent: formData.minSpent ? Number(formData.minSpent) : undefined,
            maxSpent: formData.maxSpent ? Number(formData.maxSpent) : undefined,
            minOrders: formData.minOrders ? Number(formData.minOrders) : undefined,
            maxOrders: formData.maxOrders ? Number(formData.maxOrders) : undefined,
            minLoyaltyPoints: formData.minLoyaltyPoints
              ? Number(formData.minLoyaltyPoints)
              : undefined,
            maxLoyaltyPoints: formData.maxLoyaltyPoints
              ? Number(formData.maxLoyaltyPoints)
              : undefined,
          },
          isActive: true,
        }),
      });
      setSegments((prev) => (Array.isArray(created) ? [...prev, ...created] : [...prev, created]));
      setAddModal(false);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        minSpent: '',
        maxSpent: '',
        minOrders: '',
        maxOrders: '',
        minLoyaltyPoints: '',
        maxLoyaltyPoints: '',
      });
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الشريحة');
    }
  }, [formData]);

  const handleEdit = useCallback(async () => {
    if (!editSegment) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const updated = await apiRequest(`/shops/${sid}/segments/${editSegment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr,
          description: formData.description,
          criteria: {
            minSpent: formData.minSpent ? Number(formData.minSpent) : undefined,
            maxSpent: formData.maxSpent ? Number(formData.maxSpent) : undefined,
            minOrders: formData.minOrders ? Number(formData.minOrders) : undefined,
            maxOrders: formData.maxOrders ? Number(formData.maxOrders) : undefined,
            minLoyaltyPoints: formData.minLoyaltyPoints
              ? Number(formData.minLoyaltyPoints)
              : undefined,
            maxLoyaltyPoints: formData.maxLoyaltyPoints
              ? Number(formData.maxLoyaltyPoints)
              : undefined,
          },
        }),
      });
      setSegments((prev) =>
        prev.map((s) => (s.id === editSegment.id ? (updated ? { ...s, ...updated } : s) : s))
      );
      setEditModal(false);
      setEditSegment(null);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        minSpent: '',
        maxSpent: '',
        minOrders: '',
        maxOrders: '',
        minLoyaltyPoints: '',
        maxLoyaltyPoints: '',
      });
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الشريحة');
    }
  }, [editSegment, formData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشريحة؟')) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest(`/shops/${sid}/segments/${id}`, { method: 'DELETE' });
      setSegments((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, []);

  const toggleActive = useCallback(
    async (id: string) => {
      try {
        const shopData = await apiRequest('/shops/me');
        const sid = shopData?.id;
        if (!sid) return;
        const current = segments.find((s) => s.id === id);
        if (!current) return;
        const updated = await apiRequest(`/shops/${sid}/segments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: current.name,
            nameAr: current.nameAr,
            description: current.description,
            criteria: current.criteria,
            isActive: !current.isActive,
          }),
        });
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id ? (updated ? { ...s, ...updated } : { ...s, isActive: !s.isActive }) : s
          )
        );
      } catch (error) {
        alert('حدث خطأ أثناء تحديث الحالة');
      }
    },
    [segments]
  );

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Description',
      'Customer Count',
      'Total Spent',
      'Average Order Value',
      'Status',
      'Created At',
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.nameAr,
      s.description,
      s.customerCount,
      s.totalSpent,
      s.averageOrderValue,
      s.isActive ? 'Active' : 'Inactive',
      s.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'segments.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'segments.csv');
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const totalCustomers = segments.reduce((s, seg) => s + seg.customerCount, 0);
    const totalSpent = segments.reduce((s, seg) => s + seg.totalSpent, 0);
    const activeSegments = segments.filter((s) => s.isActive).length;
    return [
      { label: 'إجمالي الشرائح', value: segments.length, color: 'bg-blue-50 text-blue-600' },
      { label: 'شرائح نشطة', value: activeSegments, color: 'bg-green-50 text-green-600' },
      { label: 'إجمالي العملاء', value: totalCustomers, color: 'bg-purple-50 text-purple-600' },
      {
        label: 'إجمالي الإنفاق',
        value: `ج.م ${totalSpent.toLocaleString()}`,
        color: 'bg-amber-50 text-amber-600',
      },
    ];
  }, [segments]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Layers size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">شرائح العملاء</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">
            إدارة شرائح العملاء وتقسيمهم حسب السلوك والاهتمامات
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end ${stat.color}`}
          >
            <span className="text-slate-500 font-semibold text-xs mb-1">{stat.label}</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            <Plus size={16} />
            إضافة شريحة
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            تصدير
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-sm font-bold text-slate-600">
            تم اختيار {selectedIds.size} شريحة
          </span>
          <button
            onClick={async () => {
              if (confirm('هل أنت متأكد من حذف الشرائح المحددة؟')) {
                try {
                  const shopData = await apiRequest('/shops/me');
                  const sid = shopData?.id;
                  if (sid) {
                    await Promise.all(
                      [...selectedIds].map((id) =>
                        apiRequest(`/shops/${sid}/segments/${id}`, { method: 'DELETE' })
                      )
                    );
                  }
                } catch {
                  alert('حدث خطأ أثناء حذف الشرائح');
                }
                setSegments((prev) => prev.filter((s) => !selectedIds.has(s.id)));
                setSelectedIds(new Set());
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
          >
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      )}

      {/* Segments List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : paginatedSegments.length === 0 ? (
        <div className="text-center py-12">
          <Layers size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">لا توجد شرائح</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedSegments.map((segment) => (
            <div
              key={segment.id}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(segment.id)}
                  onChange={() => toggleSelect(segment.id)}
                  className="mt-1 w-4 h-4 rounded border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{segment.name}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{segment.nameAr}</span>
                      {!segment.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                          غير نشط
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(segment.id)}
                        className={`p-2 rounded-lg transition-all ${segment.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                        title={segment.isActive ? 'تعطيل' : 'تفعيل'}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditSegment(segment);
                          setFormData({
                            name: segment.name,
                            nameAr: segment.nameAr,
                            description: segment.description,
                            minSpent: segment.criteria.minSpent?.toString() || '',
                            maxSpent: segment.criteria.maxSpent?.toString() || '',
                            minOrders: segment.criteria.minOrders?.toString() || '',
                            maxOrders: segment.criteria.maxOrders?.toString() || '',
                            minLoyaltyPoints: segment.criteria.minLoyaltyPoints?.toString() || '',
                            maxLoyaltyPoints: segment.criteria.maxLoyaltyPoints?.toString() || '',
                          });
                          setEditModal(true);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <Edit size={16} className="text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(segment.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{segment.description}</p>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{segment.customerCount} عميل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        ج.م {segment.totalSpent.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-600">
                        متوسط: ج.م {segment.averageOrderValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar size={14} />
                    <span>
                      تم الإنشاء: {new Date(segment.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm font-bold text-slate-600">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">إضافة شريحة جديدة</h3>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أقل إنفاق</label>
                  <input
                    type="number"
                    value={formData.minSpent}
                    onChange={(e) => setFormData({ ...formData, minSpent: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أكثر إنفاق</label>
                  <input
                    type="number"
                    value={formData.maxSpent}
                    onChange={(e) => setFormData({ ...formData, maxSpent: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أقل طلبات</label>
                  <input
                    type="number"
                    value={formData.minOrders}
                    onChange={(e) => setFormData({ ...formData, minOrders: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أكثر طلبات</label>
                  <input
                    type="number"
                    value={formData.maxOrders}
                    onChange={(e) => setFormData({ ...formData, maxOrders: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    أقل نقاط ولاء
                  </label>
                  <input
                    type="number"
                    value={formData.minLoyaltyPoints}
                    onChange={(e) => setFormData({ ...formData, minLoyaltyPoints: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    أكثر نقاط ولاء
                  </label>
                  <input
                    type="number"
                    value={formData.maxLoyaltyPoints}
                    onChange={(e) => setFormData({ ...formData, maxLoyaltyPoints: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                إضافة
              </button>
              <button
                onClick={() => setAddModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">تعديل الشريحة</h3>
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditSegment(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أقل إنفاق</label>
                  <input
                    type="number"
                    value={formData.minSpent}
                    onChange={(e) => setFormData({ ...formData, minSpent: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">أكثر إنفاق</label>
                  <input
                    type="number"
                    value={formData.maxSpent}
                    onChange={(e) => setFormData({ ...formData, maxSpent: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEdit}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                حفظ
              </button>
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditSegment(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
