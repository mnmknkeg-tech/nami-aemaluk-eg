'use client';

/**
 * تبويب تنبيهات النفاد داخل صفحة المخزون — حالة المخزون، مش صفحة مستقلة.
 * يجمع بيانات /inventory/low-stock مع اشتقاق الحالة (منخفض/نافد/قريب من النفاد) من المنتجات.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Edit,
  RefreshCw,
  Download,
  Check,
  X,
  Bell,
  Zap,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type AlertRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: 'critical' | 'low' | 'warning' | 'ok';
};

export default function AlertsView() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editModal, setEditModal] = useState(false);
  const [editAlert, setEditAlert] = useState<AlertRow | null>(null);
  const [formData, setFormData] = useState({
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
  });

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [lowRes, prodRes] = await Promise.all([
        apiRequest(`/inventory/low-stock/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/products/manage/by-shop/${sid}?limit=500`).catch(() => []),
      ]);
      const lowData = Array.isArray(lowRes) ? lowRes : lowRes?.data || [];
      const prods = Array.isArray(prodRes) ? prodRes : prodRes?.products || prodRes?.data || [];

      // حدود التنبيه من الـAPI لكل منتج — والباقي يشتق من المنتجات نفسها
      const byProduct = new Map<string, any>();
      lowData.forEach((a: any) => {
        const pid = a.productId || a.product_id;
        if (pid) byProduct.set(String(pid), a);
      });

      const rows: AlertRow[] = prods.map((p: any) => {
        const a = byProduct.get(String(p.id)) || {};
        const currentStock = Number(p.stock ?? p.quantity ?? 0);
        const minStock = Number(a.minStock || a.min_stock || p.minStock || 5);
        const maxStock = Number(a.maxStock || a.max_stock || minStock * 4 || 20);
        const reorderPoint = Number(a.reorderPoint || a.reorder_point || minStock);
        const reorderQuantity = Number(
          a.reorderQuantity || a.reorder_quantity || maxStock - minStock || 10
        );
        let status: AlertRow['status'] = 'ok';
        if (currentStock === 0) status = 'critical';
        else if (currentStock <= minStock) status = 'low';
        else if (currentStock <= minStock * 1.5) status = 'warning';
        return {
          id: String(p.id),
          productId: String(p.id),
          productName: p.name || p.title || '---',
          sku: p.sku || a.sku || '---',
          currentStock,
          minStock,
          maxStock,
          reorderPoint,
          reorderQuantity,
          status,
        };
      });
      setAlerts(rows);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filtered = useMemo(() => {
    let result = alerts.filter(
      (a) =>
        a.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }
    // الأحرج أولًا
    const rank = { critical: 0, low: 1, warning: 2, ok: 3 } as const;
    return [...result].sort(
      (a, b) => rank[a.status] - rank[b.status] || a.currentStock - b.currentStock
    );
  }, [alerts, debouncedSearch, filterStatus]);

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = [
      'Product',
      'SKU',
      'Current Stock',
      'Min Stock',
      'Reorder Point',
      'Reorder Qty',
      'Status',
    ];
    const rows = filtered.map((a) => [
      a.productName,
      a.sku,
      a.currentStock,
      a.minStock,
      a.reorderPoint,
      a.reorderQuantity,
      a.status,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'low-stock-alerts.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'low-stock-alerts.csv');
    });
  }, [filtered]);

  const handleEdit = useCallback(async () => {
    if (!editAlert) return;
    try {
      await apiRequest(`/inventory/low-stock/${editAlert.productId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditAlert(null);
      setFormData({ minStock: 0, maxStock: 0, reorderPoint: 0, reorderQuantity: 0 });
      loadAlerts();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل إعدادات التنبيه');
    }
  }, [editAlert, formData, loadAlerts]);

  const handleReorder = useCallback(async (row: AlertRow) => {
    // TODO: ربط إنشاء أمر شراء من المورد
    alert(`سيتم إنشاء أمر إعادة طلب لـ "${row.productName}" بكمية ${row.reorderQuantity}`);
  }, []);

  const openEditModal = useCallback((alert: AlertRow) => {
    setEditAlert(alert);
    setFormData({
      minStock: alert.minStock,
      maxStock: alert.maxStock,
      reorderPoint: alert.reorderPoint,
      reorderQuantity: alert.reorderQuantity,
    });
    setEditModal(true);
  }, []);

  const STATUS_CONFIG = {
    critical: { label: 'نافد', tone: 'red' as const, icon: <AlertTriangle size={12} /> },
    low: { label: 'منخفض', tone: 'amber' as const, icon: <Bell size={12} /> },
    warning: { label: 'قريب من النفاد', tone: 'amber' as const, icon: <Zap size={12} /> },
    ok: { label: 'سليم', tone: 'emerald' as const, icon: <Check size={12} /> },
  };

  const count = (s: AlertRow['status']) => alerts.filter((a) => a.status === s).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={`${count('critical')} نافد • ${count('low')} منخفض • ${count('warning')} قريب من النفاد`}
      >
        <InvToolButton onClick={() => loadAlerts()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: alerts.length },
            { id: 'critical', label: 'نافد', count: count('critical') },
            { id: 'low', label: 'منخفض', count: count('low') },
            { id: 'warning', label: 'قريب من النفاد', count: count('warning') },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو SKU…"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={AlertTriangle} title="لا توجد تنبيهات — كل الأصناف بحالة سليمة" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'الصنف', className: 'col-span-4' },
                { label: 'الرصيد الحالي', className: 'col-span-3' },
                { label: 'حد التنبيه', className: 'col-span-1' },
                { label: 'كمية إعادة الطلب', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'إجراءات', className: 'col-span-2' },
              ]}
            >
              {paginatedAlerts.map((alert) => {
                const statusConfig = STATUS_CONFIG[alert.status];
                const stockPercentage =
                  alert.maxStock > 0 ? (alert.currentStock / alert.maxStock) * 100 : 0;
                return (
                  <InvRow key={alert.id} muted={alert.status === 'ok'}>
                    <div className="col-span-4 min-w-0">
                      <Link
                        href={`/dashboard/inventory/products?id=${alert.productId}`}
                        className="font-bold text-slate-900 text-xs sm:text-sm truncate hover:text-teal-600"
                      >
                        {alert.productName}
                      </Link>
                      <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {alert.sku}
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <div
                        className={`font-bold text-slate-900 text-xs sm:text-sm ${alert.status === 'critical' ? 'text-red-600' : alert.status === 'low' ? 'text-orange-600' : ''}`}
                      >
                        {alert.currentStock.toLocaleString('en-US')} /{' '}
                        {alert.maxStock.toLocaleString('en-US')}
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full transition-all ${
                            alert.status === 'critical'
                              ? 'bg-red-500'
                              : alert.status === 'low'
                                ? 'bg-orange-500'
                                : alert.status === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 pr-4 font-semibold text-slate-900 text-xs sm:text-sm">
                      {alert.minStock}
                    </div>
                    <div className="col-span-1 pr-4 font-semibold text-slate-600 text-xs sm:text-sm">
                      {alert.reorderQuantity}
                    </div>
                    <div className="col-span-1">
                      <InvStatusPill tone={statusConfig.tone}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </InvStatusPill>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <InvRowAction onClick={() => openEditModal(alert)} title="تعديل حدود التنبيه">
                        <Edit size={14} />
                      </InvRowAction>
                      <InvRowAction onClick={() => handleReorder(alert)} title="إعادة طلب">
                        <ShoppingCart size={14} />
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
              label="صنف"
            />
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && editAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">
                حدود التنبيه — {editAlert.productName}
              </h2>
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
                  الحد الأدنى (نقطة التنبيه)
                </label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحد الأقصى</label>
                <input
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  نقطة إعادة الطلب
                </label>
                <input
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderPoint: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  كمية إعادة الطلب
                </label>
                <input
                  type="number"
                  value={formData.reorderQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderQuantity: Number(e.target.value) })
                  }
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
    </div>
  );
}
