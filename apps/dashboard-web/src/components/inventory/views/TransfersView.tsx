'use client';

/**
 * تبويب النقل بين المخازن داخل صفحة المخازن — النقل عملية داخل إدارة المخازن، مش صفحة مستقلة.
 * المحتوى المنقول من app/dashboard/(main)/inventory/transfers/page.tsx
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Download,
  RefreshCw,
  X,
  ArrowUpDown,
  Check,
  Clock,
  AlertTriangle,
  Truck,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvStatusPill,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Transfer = {
  id: string;
  transferNumber: string;
  fromWarehouse: string;
  toWarehouse: string;
  items: number;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  date: string;
  notes: string;
  createdAt: string;
};

const emptyForm = {
  fromWarehouse: '',
  toWarehouse: '',
  notes: '',
};

export default function TransfersView() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/transfers/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setTransfers(
        data.map((t: any) => ({
          id: String(t.id),
          transferNumber: t.transferNumber || t.transfer_number || `TR-${String(t.id).slice(0, 6)}`,
          fromWarehouse: t.fromWarehouse || t.from_warehouse || '---',
          toWarehouse: t.toWarehouse || t.to_warehouse || '---',
          items: Number(t.items || t.itemCount || 0),
          status: t.status || 'pending',
          date: t.date || t.createdAt || new Date().toISOString(),
          notes: t.notes || '',
          createdAt: t.createdAt || new Date().toISOString(),
        }))
      );
      const wRes = await apiRequest(`/warehouses/shop/${sid}`);
      const wData = Array.isArray(wRes) ? wRes : wRes?.data || [];
      setWarehouses(wData.map((w: any) => ({ id: String(w.id), name: w.name || '---' })));
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const filtered = useMemo(() => {
    let result = transfers.filter(
      (t) =>
        t.transferNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.fromWarehouse.includes(debouncedSearch) ||
        t.toWarehouse.includes(debouncedSearch)
    );
    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }
    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'date' ? a.date : sortBy === 'items' ? a.items : a.transferNumber;
      const bVal = sortBy === 'date' ? b.date : sortBy === 'items' ? b.items : b.transferNumber;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [transfers, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = ['Transfer Number', 'From', 'To', 'Items', 'Status', 'Date', 'Notes'];
    const rows = filtered.map((t) => [
      t.transferNumber,
      t.fromWarehouse,
      t.toWarehouse,
      t.items,
      t.status,
      t.date,
      t.notes,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'transfers.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'transfers.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    if (!formData.fromWarehouse || !formData.toWarehouse) {
      alert('يرجى اختيار المخازن');
      return;
    }
    if (formData.fromWarehouse === formData.toWarehouse) {
      alert('لا يمكن النقل لنفس المخزن');
      return;
    }
    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/transfers', {
        method: 'POST',
        body: JSON.stringify({ ...formData, shopId: sid }),
      });
      setAddModal(false);
      setFormData(emptyForm);
      loadTransfers();
    } catch {
      alert('حدث خطأ أثناء إنشاء النقل');
    } finally {
      setSaving(false);
    }
  }, [formData, loadTransfers]);

  const handleStatusUpdate = useCallback(
    async (id: string, status: string) => {
      try {
        await apiRequest(`/transfers/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        loadTransfers();
      } catch {
        alert('حدث خطأ أثناء تحديث الحالة');
      }
    },
    [loadTransfers]
  );

  const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
    pending: { label: 'قيد الانتظار', icon: <Clock size={12} /> },
    in_transit: { label: 'قيد التنفيذ', icon: <Truck size={12} /> },
    received: { label: 'تم الاستلام', icon: <Check size={12} /> },
    cancelled: { label: 'ملغي', icon: <AlertTriangle size={12} /> },
  };

  const STATUS_TONE: Record<string, 'amber' | 'slate' | 'emerald' | 'red'> = {
    pending: 'amber',
    in_transit: 'slate',
    received: 'emerald',
    cancelled: 'red',
  };

  const count = (s: Transfer['status']) => transfers.filter((t) => t.status === s).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${transfers.length} عملية نقل`}>
        <InvToolButton onClick={() => loadTransfers()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
        <InvToolButton primary onClick={() => setAddModal(true)}>
          <Plus size={14} />
          نقل جديد
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: transfers.length },
            { id: 'pending', label: 'قيد الانتظار', count: count('pending') },
            { id: 'in_transit', label: 'قيد التنفيذ', count: count('in_transit') },
            { id: 'received', label: 'تم الاستلام', count: count('received') },
            { id: 'cancelled', label: 'ملغي', count: count('cancelled') },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث برقم النقل أو المخزن..."
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="date">التاريخ</option>
                <option value="items">عدد العناصر</option>
                <option value="transferNumber">رقم النقل</option>
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

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={ArrowLeftRight} title="لا توجد عمليات نقل حالياً" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'رقم النقل', className: 'col-span-2' },
                { label: 'من مخزن', className: 'col-span-2' },
                { label: 'إلى مخزن', className: 'col-span-2' },
                { label: 'العناصر', className: 'col-span-1' },
                { label: 'التاريخ', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-2' },
                { label: 'الإجراءات', className: 'col-span-2' },
              ]}
            >
              {paginated.map((t) => {
                const statusConfig = STATUS_CONFIG[t.status];
                return (
                  <InvRow key={t.id}>
                    <div className="col-span-2 min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {t.transferNumber}
                      </div>
                    </div>
                    <div className="col-span-2 text-slate-600 text-xs sm:text-sm truncate">
                      {t.fromWarehouse}
                    </div>
                    <div className="col-span-2 text-slate-600 text-xs sm:text-sm truncate">
                      {t.toWarehouse}
                    </div>
                    <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                      {t.items}
                    </div>
                    <div className="col-span-1 text-slate-600 text-xs sm:text-sm">
                      {new Date(t.date).toLocaleDateString('ar-EG')}
                    </div>
                    <div className="col-span-2">
                      <InvStatusPill tone={STATUS_TONE[t.status]}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </InvStatusPill>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5 flex-wrap">
                      {t.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(t.id, 'in_transit')}
                          className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all"
                        >
                          بدء النقل
                        </button>
                      )}
                      {t.status === 'in_transit' && (
                        <button
                          onClick={() => handleStatusUpdate(t.id, 'received')}
                          className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-all"
                        >
                          تأكيد الاستلام
                        </button>
                      )}
                      {(t.status === 'pending' || t.status === 'in_transit') && (
                        <button
                          onClick={() => handleStatusUpdate(t.id, 'cancelled')}
                          className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all"
                        >
                          إلغاء
                        </button>
                      )}
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
              label="نقل"
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
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">نقل جديد</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">من مخزن</label>
                <select
                  value={formData.fromWarehouse}
                  onChange={(e) => setFormData({ ...formData, fromWarehouse: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">إلى مخزن</label>
                <select
                  value={formData.toWarehouse}
                  onChange={(e) => setFormData({ ...formData, toWarehouse: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر المخزن</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الإنشاء...' : 'إنشاء النقل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
