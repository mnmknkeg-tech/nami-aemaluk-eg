'use client';

/**
 * تبويب المتغيرات داخل صفحة المنتجات — الوظيفة التابعة = تبويب، مش صفحة مستقلة.
 * المحتوى المنقول من app/dashboard/(main)/inventory/variants/page.tsx
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Download,
  Check,
  X,
  ArrowUpDown,
  Package2,
  Palette,
  Tag,
  MoreVertical,
} from 'lucide-react';
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

type Variant = {
  id: string;
  name: string;
  nameAr: string;
  type: 'color' | 'size' | 'material' | 'style' | 'custom';
  values: string[];
  productCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export const VARIANT_TYPES = [
  { id: 'color', label: 'لون', icon: <Palette size={16} /> },
  { id: 'size', label: 'حجم', icon: <Layers size={16} /> },
  { id: 'material', label: 'مادة', icon: <Package2 size={16} /> },
  { id: 'style', label: 'طراز', icon: <Tag size={16} /> },
  { id: 'custom', label: 'مخصص', icon: <MoreVertical size={16} /> },
];

export default function VariantsView() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    type: 'custom' as 'color' | 'size' | 'material' | 'style' | 'custom',
    values: '',
    status: 'active' as 'active' | 'inactive',
  });

  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/variants/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setVariants(
        data.map((v: any) => ({
          id: String(v.id),
          name: v.name || '---',
          nameAr: v.nameAr || v.name_ar || '---',
          type: v.type || 'custom',
          values: v.values || [],
          productCount: Number(v.productCount || v.products_count || 0),
          status: v.status || 'active',
          createdAt: v.createdAt || new Date().toISOString(),
          updatedAt: v.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const filtered = useMemo(() => {
    let result = variants.filter(
      (v) =>
        v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        v.nameAr.includes(debouncedSearch)
    );

    if (filterType !== 'all') {
      result = result.filter((v) => v.type === filterType);
    }

    if (filterStatus !== 'all') {
      result = result.filter((v) => v.status === filterStatus);
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
  }, [variants, debouncedSearch, filterType, filterStatus, sortBy, sortOrder]);

  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedVariants.length && paginatedVariants.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedVariants.map((v) => v.id)));
    }
  }, [paginatedVariants, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} نوع؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} نوع`);
      setSelectedIds(new Set());
      loadVariants();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadVariants]);

  const bulkActivate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      // TODO: Implement bulk activate API call
      alert(`تم تفعيل ${selectedIds.size} نوع`);
      setSelectedIds(new Set());
      loadVariants();
    } catch (error) {
      alert('حدث خطأ أثناء التفعيل');
    }
  }, [selectedIds, loadVariants]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Type',
      'Values',
      'Product Count',
      'Status',
      'Created At',
    ];
    const rows = filtered.map((v) => [
      v.name,
      v.nameAr,
      v.type,
      v.values.join(', '),
      v.productCount,
      v.status,
      v.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'variants.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'variants.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/variants', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          values: formData.values
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v),
          shopId: sid,
        }),
      });
      setAddModal(false);
      setFormData({ name: '', nameAr: '', type: 'custom', values: '', status: 'active' });
      loadVariants();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة النوع');
    }
  }, [formData, loadVariants]);

  const handleEdit = useCallback(async () => {
    if (!editVariant) return;
    try {
      await apiRequest(`/variants/${editVariant.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          values: formData.values
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v),
        }),
      });
      setEditModal(false);
      setEditVariant(null);
      setFormData({ name: '', nameAr: '', type: 'custom', values: '', status: 'active' });
      loadVariants();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل النوع');
    }
  }, [editVariant, formData, loadVariants]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا النوع؟')) return;
      try {
        await apiRequest(`/variants/${id}`, { method: 'DELETE' });
        loadVariants();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadVariants]
  );

  const openEditModal = useCallback((variant: Variant) => {
    setEditVariant(variant);
    setFormData({
      name: variant.name,
      nameAr: variant.nameAr,
      type: variant.type,
      values: variant.values.join(', '),
      status: variant.status,
    });
    setEditModal(true);
  }, []);

  const activeCount = variants.filter((v) => v.status === 'active').length;
  const inactiveCount = variants.filter((v) => v.status === 'inactive').length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${variants.length} نوع • ${variants.reduce((s, v) => s + v.productCount, 0)} منتج عليه متغيرات`}
      >
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
        <InvToolButton primary onClick={() => setAddModal(true)}>
          <Plus size={14} />
          إضافة نوع
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: variants.length },
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
          searchPlaceholder="بحث بالاسم..."
          filters={
            <>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="all">كل الأنواع</option>
                <option value="color">لون</option>
                <option value="size">حجم</option>
                <option value="material">مادة</option>
                <option value="style">طراز</option>
                <option value="custom">مخصص</option>
              </select>
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
            <span>{selectedIds.size} نوع محدد</span>
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
          <InvEmpty icon={Layers} title="لا توجد أنواع حالياً" />
        ) : (
          <>
            <InvTableCard
              headerExtra={
                <div className="col-span-1 flex items-center">
                  <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                    {selectedIds.size === paginatedVariants.length &&
                    paginatedVariants.length > 0 ? (
                      <Check size={16} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </div>
              }
              columns={[
                { label: 'الاسم', className: 'col-span-2' },
                { label: 'النوع', className: 'col-span-2' },
                { label: 'القيم', className: 'col-span-3' },
                { label: 'المنتجات', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'الإجراءات', className: 'col-span-2' },
              ]}
            >
              {paginatedVariants.map((variant) => {
                const typeConfig =
                  VARIANT_TYPES.find((t) => t.id === variant.type) || VARIANT_TYPES[4];
                return (
                  <InvRow key={variant.id} muted={variant.status !== 'active'}>
                    <div className="col-span-2 flex items-center">
                      <button onClick={() => toggleSelect(variant.id)} className="p-1">
                        {selectedIds.has(variant.id) ? (
                          <Check size={16} className="text-[#00E5FF]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                      <div className="mr-3 min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {variant.name}
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          {variant.nameAr}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 pr-4">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs sm:text-sm">
                        {typeConfig.icon}
                        <span>{typeConfig.label}</span>
                      </div>
                    </div>
                    <div className="col-span-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {variant.values.slice(0, 3).map((val, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full"
                          >
                            {val}
                          </span>
                        ))}
                        {variant.values.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-full">
                            +{variant.values.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                      {variant.productCount}
                    </div>
                    <div className="col-span-1">
                      <InvStatusPill tone={variant.status === 'active' ? 'emerald' : 'slate'}>
                        {variant.status === 'active' ? 'نشط' : 'غير نشط'}
                      </InvStatusPill>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <InvRowAction onClick={() => openEditModal(variant)} title="تعديل">
                        <Edit size={14} />
                      </InvRowAction>
                      <InvRowAction onClick={() => handleDelete(variant.id)} title="حذف" danger>
                        <Trash2 size={14} />
                      </InvRowAction>
                    </div>
                  </InvRow>
                );
              })}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="نوع"
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
              <h2 className="text-xl font-black text-slate-900">إضافة نوع جديد</h2>
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
                  placeholder="Variant Name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="اسم النوع"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">نوع النوع</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {VARIANT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  القيم (مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={formData.values}
                  onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                  placeholder="أحمر، أزرق، أخضر"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
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
                إضافة النوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل النوع</h2>
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
                <label className="text-sm font-bold text-slate-700 mb-1 block">نوع النوع</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {VARIANT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  القيم (مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={formData.values}
                  onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
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
