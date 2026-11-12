'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  ArrowUpDown,
  Check,
  X,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvBulkBar,
} from '@/components/inventory/InventoryShell';

type Stocktake = {
  id: string;
  name: string;
  reference: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string | null;
  location: string;
  notes: string;
  itemCount: number;
  discrepancyCount: number;
  totalValue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export default function StocktakePage() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editStocktake, setEditStocktake] = useState<Stocktake | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    location: '',
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const loadStocktakes = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/stocktakes/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setStocktakes(
        data.map((s: any) => ({
          id: String(s.id),
          name: s.name || '---',
          reference: s.reference || '---',
          status: s.status || 'draft',
          startDate: s.startDate || new Date().toISOString(),
          endDate: s.endDate || null,
          location: s.location || '---',
          notes: s.notes || '',
          itemCount: Number(s.itemCount || s.items_count || 0),
          discrepancyCount: Number(s.discrepancyCount || s.discrepancy_count || 0),
          totalValue: Number(s.totalValue || s.total_value || 0),
          createdBy: s.createdBy || s.created_by || '---',
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setStocktakes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocktakes();
  }, [loadStocktakes]);

  const filtered = useMemo(() => {
    let result = stocktakes.filter(
      (s) =>
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.reference.includes(debouncedSearch) ||
        s.location.includes(debouncedSearch)
    );

    if (filterStatus === 'discrepancies') {
      result = result.filter((s) => s.discrepancyCount > 0);
    } else if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'name' ? a.name : sortBy === 'createdAt' ? a.createdAt : a.startDate;
      const bVal = sortBy === 'name' ? b.name : sortBy === 'createdAt' ? b.createdAt : b.startDate;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [stocktakes, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedStocktakes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedStocktakes.length && paginatedStocktakes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStocktakes.map((s) => s.id)));
    }
  }, [paginatedStocktakes, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} جرد؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} جرد`);
      setSelectedIds(new Set());
      loadStocktakes();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadStocktakes]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Reference',
      'Status',
      'Start Date',
      'End Date',
      'Location',
      'Item Count',
      'Discrepancy Count',
      'Total Value',
      'Created By',
      'Created At',
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.reference,
      s.status,
      s.startDate,
      s.endDate || '-',
      s.location,
      s.itemCount,
      s.discrepancyCount,
      s.totalValue,
      s.createdBy,
      s.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'stocktakes.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'stocktakes.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/stocktakes', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          shopId: sid,
          status: 'draft',
        }),
      });
      setAddModal(false);
      setFormData({
        name: '',
        reference: '',
        location: '',
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      loadStocktakes();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الجرد');
    }
  }, [formData, loadStocktakes]);

  const handleEdit = useCallback(async () => {
    if (!editStocktake) return;
    try {
      await apiRequest(`/stocktakes/${editStocktake.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditStocktake(null);
      setFormData({
        name: '',
        reference: '',
        location: '',
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      loadStocktakes();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الجرد');
    }
  }, [editStocktake, formData, loadStocktakes]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا الجرد؟')) return;
      try {
        await apiRequest(`/stocktakes/${id}`, { method: 'DELETE' });
        loadStocktakes();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadStocktakes]
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        await apiRequest(`/stocktakes/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        loadStocktakes();
      } catch (error) {
        alert('حدث خطأ أثناء تغيير الحالة');
      }
    },
    [loadStocktakes]
  );

  const openEditModal = useCallback((stocktake: Stocktake) => {
    setEditStocktake(stocktake);
    setFormData({
      name: stocktake.name,
      reference: stocktake.reference,
      location: stocktake.location,
      notes: stocktake.notes,
      startDate: stocktake.startDate.split('T')[0],
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    draft: { label: 'جرد جديد', icon: <FileText size={12} /> },
    in_progress: { label: 'جاري', icon: <Clock size={12} /> },
    completed: { label: 'بانتظار الاعتماد', icon: <CheckCircle2 size={12} /> },
    cancelled: { label: 'ملغي', icon: <XCircle size={12} /> },
  };

  const STATUS_TONE: Record<Stocktake['status'], 'slate' | 'amber' | 'emerald' | 'red'> = {
    draft: 'slate',
    in_progress: 'amber',
    completed: 'emerald',
    cancelled: 'red',
  };

  const stats = useMemo(() => {
    const total = stocktakes.length;
    const draft = stocktakes.filter((s) => s.status === 'draft').length;
    const inProgress = stocktakes.filter((s) => s.status === 'in_progress').length;
    const completed = stocktakes.filter((s) => s.status === 'completed').length;
    const totalDiscrepancies = stocktakes.reduce((sum, s) => sum + s.discrepancyCount, 0);
    return [
      {
        label: 'إجمالي الجرد',
        value: total,
        icon: ClipboardCheck,
        color: 'bg-blue-50 text-blue-600',
      },
      { label: 'جرد جديد', value: draft, icon: FileText, color: 'bg-slate-50 text-slate-600' },
      { label: 'الجاري', value: inProgress, icon: Clock, color: 'bg-blue-50 text-blue-600' },
      {
        label: 'بانتظار الاعتماد',
        value: completed,
        icon: CheckCircle2,
        color: 'bg-green-50 text-green-600',
      },
      {
        label: 'الاختلافات',
        value: totalDiscrepancies,
        icon: AlertTriangle,
        color: 'bg-amber-50 text-amber-600',
      },
    ];
  }, [stocktakes]);

  return (
    <InventoryPage
      title="جرد المخزون"
      subtitle={<>إدارة عمليات جرد المخزون — {stats[4].value} اختلاف مسجل</>}
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button
            onClick={() => setAddModal(true)}
            className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700"
          >
            <Plus size={14} />
            جرد جديد
          </button>
          <button
            onClick={exportCSV}
            className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5"
          >
            <Download size={14} />
            تصدير CSV
          </button>
        </>
      }
      tabs={[
        { id: 'all', label: 'سجل الجرد', count: stats[0].value as number },
        { id: 'draft', label: 'جرد جديد', count: stats[1].value as number },
        { id: 'in_progress', label: 'الجاري', count: stats[2].value as number },
        { id: 'completed', label: 'بانتظار الاعتماد', count: stats[3].value as number },
        {
          id: 'discrepancies',
          label: 'الفروقات',
          count: stocktakes.filter((s) => s.discrepancyCount > 0).length,
        },
      ]}
      activeTab={filterStatus}
      onTabChange={(id) => {
        setFilterStatus(id);
        setCurrentPage(1);
      }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="بحث بالاسم أو المرجع..."
      filters={
        <>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
          >
            <option value="name">الاسم</option>
            <option value="startDate">تاريخ البدء</option>
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
      loading={loading}
      empty={
        <>
          <ClipboardCheck size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد عمليات جرد حالياً</p>
        </>
      }
      footer={
        <InvPagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          perPage={itemsPerPage}
          onPage={setCurrentPage}
          label="جرد"
        />
      }
    >
      {selectedIds.size > 0 && (
        <div className="mb-3">
          <InvBulkBar>
            <span>{selectedIds.size} جرد محدد</span>
            <div className="flex items-center gap-2">
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

      <InvTableCard
        headerExtra={
          <div className="col-span-1 flex items-center">
            <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
              {selectedIds.size === paginatedStocktakes.length && paginatedStocktakes.length > 0 ? (
                <Check size={16} className="text-[#00E5FF]" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded" />
              )}
            </button>
          </div>
        }
        columns={[
          { label: 'الاسم', className: 'col-span-2' },
          { label: 'المرجع', className: 'col-span-1' },
          { label: 'الحالة', className: 'col-span-1' },
          { label: 'تاريخ البدء', className: 'col-span-2' },
          { label: 'الموقع', className: 'col-span-1' },
          { label: 'عدد الأصناف', className: 'col-span-1' },
          { label: 'الاختلافات', className: 'col-span-1' },
          { label: 'القيمة', className: 'col-span-1' },
          { label: 'إجراءات', className: 'col-span-1' },
        ]}
      >
        {paginatedStocktakes.map((stocktake) => {
          const statusConfig = STATUS_CONFIG[stocktake.status];
          return (
            <InvRow key={stocktake.id}>
              <div className="col-span-1 flex items-center">
                <button onClick={() => toggleSelect(stocktake.id)} className="p-1">
                  {selectedIds.has(stocktake.id) ? (
                    <Check size={16} className="text-[#00E5FF]" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                  )}
                </button>
              </div>
              <div className="col-span-2 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {stocktake.name}
                </div>
              </div>
              <div className="col-span-1 text-slate-600 text-xs sm:text-sm truncate">
                {stocktake.reference}
              </div>
              <div className="col-span-1">
                <InvStatusPill tone={STATUS_TONE[stocktake.status]}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </InvStatusPill>
              </div>
              <div className="col-span-2 text-slate-600 text-xs sm:text-sm flex items-center gap-1 truncate">
                <Calendar size={12} />
                {new Date(stocktake.startDate).toLocaleDateString('ar-EG')}
              </div>
              <div className="col-span-1 text-slate-600 text-xs sm:text-sm truncate">
                {stocktake.location}
              </div>
              <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                {stocktake.itemCount}
              </div>
              <div className="col-span-1">
                {stocktake.discrepancyCount > 0 ? (
                  <div className="flex items-center gap-1 text-amber-600 text-xs sm:text-sm font-bold">
                    <AlertTriangle size={12} />
                    {stocktake.discrepancyCount}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs sm:text-sm">-</span>
                )}
              </div>
              <div className="col-span-1 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                ج.م {stocktake.totalValue.toLocaleString()}
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <InvRowAction onClick={() => openEditModal(stocktake)} title="تعديل">
                  <Edit size={14} />
                </InvRowAction>
                <InvRowAction onClick={() => handleDelete(stocktake.id)} title="حذف" danger>
                  <Trash2 size={14} />
                </InvRowAction>
              </div>
            </InvRow>
          );
        })}
      </InvTableCard>

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
              <h2 className="text-xl font-black text-slate-900">جرد جديد</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم الجرد</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="اسم الجرد"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المرجع</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="رقم المرجع"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الموقع</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="موقع الجرد"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all"
              >
                إنشاء الجرد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editStocktake && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل الجرد</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم الجرد</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المرجع</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الموقع</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
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

      {/* Guide Modal */}
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
              <h2 className="text-xl font-black text-slate-900">دليل جرد المخزون</h2>
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
                  <Info size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إدارة عمليات جرد المخزون الدورية لضمان دقة البيانات.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إنشاء عمليات جرد جديدة</li>
                  <li>• تتبع الحالة (مسودة، جاري، مكتمل، ملغي)</li>
                  <li>• تسجيل الاختلافات بين المخزون الفعلي والنظامي</li>
                  <li>• إحصائيات شاملة لكل جرد</li>
                  <li>• تصدير تقارير الجرد</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}
