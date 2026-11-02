'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  Info,
  ArrowUpDown,
  Calendar,
  Clock,
  Truck,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
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

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  orderDate: string;
  expectedDate: string;
  receivedDate: string | null;
  itemCount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    notes: '',
  });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/purchase-orders/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setOrders(
        data.map((o: any) => ({
          id: String(o.id),
          orderNumber: o.orderNumber || o.order_number || '---',
          supplierId: o.supplierId || o.supplier_id || '---',
          supplierName: o.supplierName || o.supplier_name || '---',
          status: o.status || 'draft',
          orderDate: o.orderDate || o.order_date || new Date().toISOString(),
          expectedDate: o.expectedDate || o.expected_date || '',
          receivedDate: o.receivedDate || o.received_date || null,
          itemCount: Number(o.itemCount || o.items_count || 0),
          totalAmount: Number(o.totalAmount || o.total_amount || 0),
          paidAmount: Number(o.paidAmount || o.paid_amount || 0),
          notes: o.notes || '',
          createdBy: o.createdBy || o.created_by || '---',
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: o.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    let result = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterStatus !== 'all') {
      result = result.filter((o) => o.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'orderNumber'
          ? a.orderNumber
          : sortBy === 'orderDate'
            ? a.orderDate
            : sortBy === 'totalAmount'
              ? a.totalAmount
              : a.createdAt;
      const bVal =
        sortBy === 'orderNumber'
          ? b.orderNumber
          : sortBy === 'orderDate'
            ? b.orderDate
            : sortBy === 'totalAmount'
              ? b.totalAmount
              : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [orders, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map((o) => o.id)));
    }
  }, [paginatedOrders, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} أمر شراء؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} أمر شراء`);
      setSelectedIds(new Set());
      loadOrders();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadOrders]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Order Number',
      'Supplier',
      'Status',
      'Order Date',
      'Expected Date',
      'Received Date',
      'Item Count',
      'Total Amount',
      'Paid Amount',
      'Created By',
      'Created At',
    ];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.supplierName,
      o.status,
      o.orderDate,
      o.expectedDate || '-',
      o.receivedDate || '-',
      o.itemCount,
      o.totalAmount,
      o.paidAmount,
      o.createdBy,
      o.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'purchase-orders.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'purchase-orders.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          shopId: sid,
          status: 'draft',
        }),
      });
      setAddModal(false);
      setFormData({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        notes: '',
      });
      loadOrders();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة أمر الشراء');
    }
  }, [formData, loadOrders]);

  const handleEdit = useCallback(async () => {
    if (!editOrder) return;
    try {
      await apiRequest(`/purchase-orders/${editOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditOrder(null);
      setFormData({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        notes: '',
      });
      loadOrders();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل أمر الشراء');
    }
  }, [editOrder, formData, loadOrders]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا أمر الشراء؟')) return;
      try {
        await apiRequest(`/purchase-orders/${id}`, { method: 'DELETE' });
        loadOrders();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadOrders]
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        await apiRequest(`/purchase-orders/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        loadOrders();
      } catch (error) {
        alert('حدث خطأ أثناء تغيير الحالة');
      }
    },
    [loadOrders]
  );

  const openEditModal = useCallback((order: PurchaseOrder) => {
    setEditOrder(order);
    setFormData({
      supplierId: order.supplierId,
      orderDate: order.orderDate.split('T')[0],
      expectedDate: order.expectedDate,
      notes: order.notes,
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    draft: { label: 'مسودة', color: 'bg-slate-50 text-slate-600', icon: <FileText size={12} /> },
    sent: {
      label: 'بانتظار الموافقة',
      color: 'bg-blue-50 text-blue-600',
      icon: <Truck size={12} />,
    },
    confirmed: {
      label: 'مطلوب استلامه',
      color: 'bg-cyan-50 text-cyan-600',
      icon: <CheckCircle2 size={12} />,
    },
    partial: {
      label: 'مستلم جزئيًا',
      color: 'bg-amber-50 text-amber-600',
      icon: <Clock size={12} />,
    },
    received: {
      label: 'مستلم بالكامل',
      color: 'bg-green-50 text-green-600',
      icon: <CheckCircle2 size={12} />,
    },
    cancelled: { label: 'ملغي', color: 'bg-red-50 text-red-600', icon: <XCircle size={12} /> },
  };

  const STATUS_TONE: Record<string, 'emerald' | 'slate' | 'red' | 'amber'> = {
    draft: 'slate',
    sent: 'slate',
    confirmed: 'emerald',
    partial: 'amber',
    received: 'emerald',
    cancelled: 'red',
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const draft = orders.filter((o) => o.status === 'draft').length;
    const sent = orders.filter((o) => o.status === 'sent').length;
    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const received = orders.filter((o) => o.status === 'received').length;
    const totalAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return [
      {
        label: 'إجمالي الأوامر',
        value: total,
        icon: ShoppingCart,
        color: 'bg-blue-50 text-blue-600',
      },
      { label: 'مسودة', value: draft, icon: FileText, color: 'bg-slate-50 text-slate-600' },
      { label: 'بانتظار الموافقة', value: sent, icon: Truck, color: 'bg-blue-50 text-blue-600' },
      {
        label: 'مطلوب استلامه',
        value: confirmed,
        icon: CheckCircle2,
        color: 'bg-cyan-50 text-cyan-600',
      },
      {
        label: 'مستلم بالكامل',
        value: received,
        icon: CheckCircle2,
        color: 'bg-green-50 text-green-600',
      },
      {
        label: 'إجمالي القيمة',
        value: `ج.م ${totalAmount.toLocaleString()}`,
        icon: DollarSign,
        color: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [orders]);

  return (
    <InventoryPage
      title="أوامر الشراء"
      subtitle={<>إدارة أوامر الشراء من الموردين — {stats[5].value}</>}
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button
            onClick={() => setAddModal(true)}
            className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700"
          >
            <Plus size={14} />
            أمر شراء جديد
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
        { id: 'all', label: 'الكل', count: stats[0].value as number },
        { id: 'draft', label: 'مسودة', count: stats[1].value as number },
        { id: 'sent', label: 'بانتظار الموافقة', count: stats[2].value as number },
        { id: 'confirmed', label: 'مطلوب استلامه', count: stats[3].value as number },
        {
          id: 'partial',
          label: 'مستلم جزئيًا',
          count: orders.filter((o) => o.status === 'partial').length,
        },
        { id: 'received', label: 'مستلم بالكامل', count: stats[4].value as number },
        {
          id: 'cancelled',
          label: 'ملغي',
          count: orders.filter((o) => o.status === 'cancelled').length,
        },
      ]}
      activeTab={filterStatus}
      onTabChange={(id) => {
        setFilterStatus(id);
        setCurrentPage(1);
      }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="بحث برقم الأمر أو المورد..."
      filters={
        <>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
          >
            <option value="orderNumber">رقم الأمر</option>
            <option value="orderDate">تاريخ الأمر</option>
            <option value="totalAmount">القيمة</option>
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
        filtered.length === 0 ? (
          <>
            <ShoppingCart size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">لا توجد أوامر شراء حالياً</p>
          </>
        ) : undefined
      }
      footer={
        <InvPagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          perPage={itemsPerPage}
          onPage={setCurrentPage}
          label="أمر شراء"
        />
      }
    >
      {selectedIds.size > 0 && (
        <div className="mb-3">
          <InvBulkBar>
            <span>{selectedIds.size} أمر شراء محدد</span>
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
              {selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0 ? (
                <Check size={16} className="text-[#00E5FF]" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded" />
              )}
            </button>
          </div>
        }
        columns={[
          { label: 'رقم الأمر', className: 'col-span-1' },
          { label: 'المورد', className: 'col-span-2' },
          { label: 'الحالة', className: 'col-span-1' },
          { label: 'تاريخ الأمر', className: 'col-span-1' },
          { label: 'التاريخ المتوقع', className: 'col-span-1' },
          { label: 'الأصناف', className: 'col-span-1' },
          { label: 'القيمة', className: 'col-span-1' },
          { label: 'المدفوع', className: 'col-span-1' },
          { label: 'الإجراءات', className: 'col-span-2' },
        ]}
      >
        {paginatedOrders.map((order) => {
          const statusConfig = STATUS_CONFIG[order.status];
          return (
            <InvRow key={order.id} muted={order.status === 'cancelled'}>
              <div className="col-span-1 flex items-center">
                <button onClick={() => toggleSelect(order.id)} className="p-1">
                  {selectedIds.has(order.id) ? (
                    <Check size={16} className="text-[#00E5FF]" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                  )}
                </button>
              </div>
              <div className="col-span-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {order.orderNumber}
                </div>
              </div>
              <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                {order.supplierName}
              </div>
              <div className="col-span-1">
                <InvStatusPill tone={STATUS_TONE[order.status]}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </InvStatusPill>
              </div>
              <div className="col-span-1 pr-4 text-slate-600 text-xs sm:text-sm flex items-center gap-1">
                <Calendar size={12} />
                {new Date(order.orderDate).toLocaleDateString('ar-EG')}
              </div>
              <div className="col-span-1 pr-4 text-slate-600 text-xs sm:text-sm">
                {order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString('ar-EG')
                  : '-'}
              </div>
              <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                {order.itemCount}
              </div>
              <div className="col-span-1 font-bold text-slate-900 text-xs sm:text-sm">
                ج.م {order.totalAmount.toLocaleString()}
              </div>
              <div className="col-span-1 font-bold text-slate-900 text-xs sm:text-sm">
                ج.م {order.paidAmount.toLocaleString()}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <InvRowAction onClick={() => openEditModal(order)} title="تعديل">
                  <Edit size={14} />
                </InvRowAction>
                <InvRowAction onClick={() => handleDelete(order.id)} title="حذف" danger>
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
              <h2 className="text-xl font-black text-slate-900">أمر شراء جديد</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المورد</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر المورد</option>
                  {/* TODO: Load suppliers */}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ الأمر</label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  التاريخ المتوقع
                </label>
                <input
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
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
                إنشاء أمر الشراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل أمر الشراء</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">المورد</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر المورد</option>
                  {/* TODO: Load suppliers */}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ الأمر</label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  التاريخ المتوقع
                </label>
                <input
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
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
              <h2 className="text-xl font-black text-slate-900">دليل أوامر الشراء</h2>
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
                  إدارة أوامر الشراء من الموردين لتجديد المخزون.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الميزات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إنشاء أوامر شراء جديدة</li>
                  <li>• تتبع الحالة (مسودة، مرسل، مؤكد، جزئي، مستلم، ملغي)</li>
                  <li>• إحصائيات شاملة لكل أمر</li>
                  <li>• تصدير تقارير أوامر الشراء</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}
