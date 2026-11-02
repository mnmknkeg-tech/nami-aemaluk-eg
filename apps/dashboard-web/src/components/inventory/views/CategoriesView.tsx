'use client';

/**
 * تبويب الفئات داخل صفحة المنتجات — الوظيفة التابعة = تبويب، مش صفحة مستقلة.
 * المحتوى المنقول من app/dashboard/(main)/inventory/categories/page.tsx
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FolderKanban, Plus, Edit, Trash2, Download, Check, X, ArrowUpDown } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvBulkBar,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Category = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  parentCategory: string | null;
  parentCategoryName: string;
  image: string;
  productCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export default function CategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    parentCategory: '',
    image: '',
    status: 'active' as 'active' | 'inactive',
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/categories/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setCategories(
        data.map((c: any) => ({
          id: String(c.id),
          name: c.name || '---',
          nameAr: c.nameAr || c.name_ar || '---',
          description: c.description || '',
          parentCategory: c.parentCategoryId || null,
          parentCategoryName: c.parentCategoryName || '-',
          image: c.image || '',
          productCount: Number(c.productCount || c.products_count || 0),
          status: c.status || 'active',
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = useMemo(() => {
    let result = categories.filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.nameAr.includes(debouncedSearch) ||
        c.description.includes(debouncedSearch)
    );

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'name' ? a.name : sortBy === 'productCount' ? a.productCount : a.createdAt;
      const bVal =
        sortBy === 'name' ? b.name : sortBy === 'productCount' ? b.productCount : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [categories, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedCategories.length && paginatedCategories.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCategories.map((c) => c.id)));
    }
  }, [paginatedCategories, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} فئة؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} فئة`);
      setSelectedIds(new Set());
      loadCategories();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadCategories]);

  const bulkActivate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      // TODO: Implement bulk activate API call
      alert(`تم تفعيل ${selectedIds.size} فئة`);
      setSelectedIds(new Set());
      loadCategories();
    } catch (error) {
      alert('حدث خطأ أثناء التفعيل');
    }
  }, [selectedIds, loadCategories]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Description',
      'Parent Category',
      'Product Count',
      'Status',
      'Created At',
    ];
    const rows = filtered.map((c) => [
      c.name,
      c.nameAr,
      c.description,
      c.parentCategoryName,
      c.productCount,
      c.status,
      c.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'categories.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'categories.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          shopId: sid,
        }),
      });
      setAddModal(false);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        parentCategory: '',
        image: '',
        status: 'active',
      });
      loadCategories();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الفئة');
    }
  }, [formData, loadCategories]);

  const handleEdit = useCallback(async () => {
    if (!editCategory) return;
    try {
      await apiRequest(`/categories/${editCategory.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        parentCategory: '',
        image: '',
        status: 'active',
      });
      loadCategories();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الفئة');
    }
  }, [editCategory, formData, loadCategories]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
      try {
        await apiRequest(`/categories/${id}`, { method: 'DELETE' });
        loadCategories();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadCategories]
  );

  const openEditModal = useCallback((category: Category) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      nameAr: category.nameAr,
      description: category.description,
      parentCategory: category.parentCategory || '',
      image: category.image,
      status: category.status,
    });
    setEditModal(true);
  }, []);

  const activeCount = categories.filter((c) => c.status === 'active').length;
  const inactiveCount = categories.filter((c) => c.status === 'inactive').length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${categories.length} فئة • ${filtered.reduce((s, c) => s + c.productCount, 0)} منتج مصنف`}
      >
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
        <InvToolButton primary onClick={() => setAddModal(true)}>
          <Plus size={14} />
          إضافة فئة
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: categories.length },
            { id: 'active', label: 'نشط', count: activeCount },
            { id: 'inactive', label: 'غير نشط', count: inactiveCount },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="دوّر باسم الفئة أو الوصف…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="name">الاسم</option>
                <option value="productCount">عدد المنتجات</option>
                <option value="createdAt">تاريخ الإنشاء</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <ArrowUpDown size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </button>
            </>
          }
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3">
          <InvBulkBar>
            <span>{selectedIds.size} فئة محددة</span>
            <div className="flex items-center gap-2">
              <button
                onClick={bulkActivate}
                className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1.5"
              >
                <Check size={13} />
                تفعيل
              </button>
              <button
                onClick={bulkDelete}
                className="h-8 px-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                حذف
              </button>
            </div>
          </InvBulkBar>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={FolderKanban} title="لا توجد فئات حالياً" />
        ) : (
          <>
            <InvTableCard
              headerExtra={
                <div className="col-span-2 flex items-center">
                  <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                    {selectedIds.size === paginatedCategories.length &&
                    paginatedCategories.length > 0 ? (
                      <Check size={16} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </div>
              }
              columns={[
                { label: 'الاسم', className: 'col-span-2' },
                { label: 'الاسم (عربي)', className: 'col-span-2' },
                { label: 'الوصف', className: 'col-span-2' },
                { label: 'الفئة الرئيسية', className: 'col-span-2' },
                { label: 'المنتجات', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'إجراءات', className: 'col-span-2' },
              ]}
            >
              {paginatedCategories.map((category) => (
                <InvRow key={category.id} muted={category.status !== 'active'}>
                  <div className="col-span-2 flex items-center">
                    <button onClick={() => toggleSelect(category.id)} className="p-1">
                      {selectedIds.has(category.id) ? (
                        <Check size={16} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                    <div className="mr-3 min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {category.name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        {category.nameAr}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {category.description || '-'}
                  </div>
                  <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {category.parentCategoryName}
                  </div>
                  <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                    {category.productCount}
                  </div>
                  <div className="col-span-1">
                    <InvStatusPill tone={category.status === 'active' ? 'emerald' : 'slate'}>
                      {category.status === 'active' ? 'نشط' : 'غير نشط'}
                    </InvStatusPill>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <InvRowAction onClick={() => openEditModal(category)} title="تعديل">
                      <Edit size={14} />
                    </InvRowAction>
                    <InvRowAction onClick={() => handleDelete(category.id)} title="حذف" danger>
                      <Trash2 size={14} />
                    </InvRowAction>
                  </div>
                </InvRow>
              ))}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="فئة"
            />
          </>
        )}
      </div>

      {/* Add Modal */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إضافة فئة جديدة</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="اسم الفئة"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف الفئة"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الفئة الرئيسية
                </label>
                <select
                  value={formData.parentCategory}
                  onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">بدون فئة رئيسية</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all"
              >
                إضافة الفئة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل الفئة</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  الفئة الرئيسية
                </label>
                <select
                  value={formData.parentCategory}
                  onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">بدون فئة رئيسية</option>
                  {categories
                    .filter((c) => c.id !== editCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <button
                onClick={handleEdit}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
