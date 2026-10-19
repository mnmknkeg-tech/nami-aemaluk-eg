'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tag,
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
  Hash,
  Palette,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type CustomerTag = {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  description: string;
  customerCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TagAssignment = {
  customerId: string;
  customerName: string;
  tagId: string;
  tagName: string;
  assignedAt: string;
};

const TAG_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
  '#000000', // black
];

export default function CustomerTagsPage() {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
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
  const [editTag, setEditTag] = useState<CustomerTag | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    color: TAG_COLORS[0],
    description: '',
  });
  const [assignFormData, setAssignFormData] = useState({
    customerId: '',
    tagId: '',
  });

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      // Load tags from the backend API
      const tagsData = await apiRequest(`/shops/${sid}/tags`);
      setTags(Array.isArray(tagsData) ? tagsData : []);

      // Assignments (empty for now — assignment storage handled later)
      setAssignments([]);
    } catch {
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const filtered = useMemo(() => {
    let result = tags.filter(
      (t) =>
        t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.nameAr.includes(debouncedSearch)
    );

    if (filterStatus !== 'all') {
      result = result.filter((t) => (filterStatus === 'active' ? t.isActive : !t.isActive));
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'customerCount' ? a.customerCount : sortBy === 'name' ? a.name : a.createdAt;
      const bVal =
        sortBy === 'customerCount' ? b.customerCount : sortBy === 'name' ? b.name : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [tags, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedTags = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedTags.length && paginatedTags.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTags.map((t) => t.id)));
    }
  }, [paginatedTags, selectedIds.size]);

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
      const created = await apiRequest(`/shops/${sid}/tags`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr,
          color: formData.color,
          description: formData.description,
          isActive: true,
        }),
      });
      setTags((prev) => (Array.isArray(created) ? [...prev, ...created] : [...prev, created]));
      setAddModal(false);
      setFormData({ name: '', nameAr: '', color: TAG_COLORS[0], description: '' });
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الوسم');
    }
  }, [formData]);

  const handleEdit = useCallback(async () => {
    if (!editTag) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const updated = await apiRequest(`/shops/${sid}/tags/${editTag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.name,
          nameAr: formData.nameAr,
          color: formData.color,
          description: formData.description,
        }),
      });
      setTags((prev) =>
        prev.map((t) => (t.id === editTag.id ? (updated ? { ...t, ...updated } : t) : t))
      );
      setEditModal(false);
      setEditTag(null);
      setFormData({ name: '', nameAr: '', color: TAG_COLORS[0], description: '' });
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الوسم');
    }
  }, [editTag, formData]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسم؟')) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest(`/shops/${sid}/tags/${id}`, { method: 'DELETE' });
      setTags((prev) => prev.filter((t) => t.id !== id));
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
        const current = tags.find((t) => t.id === id);
        if (!current) return;
        const updated = await apiRequest(`/shops/${sid}/tags/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: current.name,
            nameAr: current.nameAr,
            color: current.color,
            description: current.description,
            isActive: !current.isActive,
          }),
        });
        setTags((prev) =>
          prev.map((t) =>
            t.id === id ? (updated ? { ...t, ...updated } : { ...t, isActive: !t.isActive }) : t
          )
        );
      } catch (error) {
        alert('حدث خطأ أثناء تحديث الحالة');
      }
    },
    [tags]
  );

  const handleAssign = useCallback(async () => {
    try {
      // TODO: Implement API call to assign tag to customer
      setAssignModal(false);
      setAssignFormData({ customerId: '', tagId: '' });
    } catch (error) {
      alert('حدث خطأ أثناء تعيين الوسم');
    }
  }, [assignFormData]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Color',
      'Description',
      'Customer Count',
      'Status',
      'Created At',
    ];
    const rows = filtered.map((t) => [
      t.name,
      t.nameAr,
      t.color,
      t.description,
      t.customerCount,
      t.isActive ? 'Active' : 'Inactive',
      t.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'tags.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'tags.csv');
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const totalCustomers = tags.reduce((s, tag) => s + tag.customerCount, 0);
    const activeTags = tags.filter((t) => t.isActive).length;
    return [
      { label: 'إجمالي الوسوم', value: tags.length, color: 'bg-blue-50 text-blue-600' },
      { label: 'وسوم نشطة', value: activeTags, color: 'bg-green-50 text-green-600' },
      {
        label: 'إجمالي العملاء الموسومين',
        value: totalCustomers,
        color: 'bg-purple-50 text-purple-600',
      },
      {
        label: 'متوسط وسوم لكل عميل',
        value: tags.length > 0 ? (totalCustomers / tags.length).toFixed(1) : '0',
        color: 'bg-amber-50 text-amber-600',
      },
    ];
  }, [tags]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Tag size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">وسوم العملاء</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">إدارة وسوم العملاء وتصنيفهم</p>
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
            إضافة وسم
          </button>
          <button
            onClick={() => setAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Hash size={16} />
            تعيين وسم
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
          <span className="text-sm font-bold text-slate-600">تم اختيار {selectedIds.size} وسم</span>
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من حذف الوسوم المحددة؟')) {
                setTags((prev) => prev.filter((t) => !selectedIds.has(t.id)));
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

      {/* Tags List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : paginatedTags.length === 0 ? (
        <div className="text-center py-12">
          <Tag size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">لا توجد وسوم</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTags.map((tag) => (
            <div
              key={tag.id}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }} />
                  <div>
                    <span className="font-bold text-slate-900">{tag.name}</span>
                    <span className="text-xs text-slate-400 mx-1">•</span>
                    <span className="text-xs text-slate-500">{tag.nameAr}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.has(tag.id)}
                  onChange={() => toggleSelect(tag.id)}
                  className="w-4 h-4 rounded border-slate-300"
                />
              </div>
              <p className="text-sm text-slate-600 mb-3">{tag.description}</p>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">{tag.customerCount} عميل</span>
                </div>
                {!tag.isActive && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                    غير نشط
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(tag.id)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tag.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  {tag.isActive ? 'نشط' : 'غير نشط'}
                </button>
                <button
                  onClick={() => {
                    setEditTag(tag);
                    setFormData({
                      name: tag.name,
                      nameAr: tag.nameAr,
                      color: tag.color,
                      description: tag.description,
                    });
                    setEditModal(true);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  title="تعديل"
                >
                  <Edit size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-all"
                  title="حذف"
                >
                  <Trash2 size={16} className="text-slate-400" />
                </button>
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">إضافة وسم جديد</h3>
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
      {editModal && editTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">تعديل الوسم</h3>
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTag(null);
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
                  setEditTag(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">تعيين وسم لعميل</h3>
              <button
                onClick={() => setAssignModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">العميل</label>
                <input
                  type="text"
                  value={assignFormData.customerId}
                  onChange={(e) =>
                    setAssignFormData({ ...assignFormData, customerId: e.target.value })
                  }
                  placeholder="أدخل معرف العميل"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الوسم</label>
                <select
                  value={assignFormData.tagId}
                  onChange={(e) => setAssignFormData({ ...assignFormData, tagId: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-slate-400"
                >
                  <option value="">اختر وسم</option>
                  {tags
                    .filter((t) => t.isActive)
                    .map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name} ({tag.nameAr})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAssign}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
              >
                تعيين
              </button>
              <button
                onClick={() => setAssignModal(false)}
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
