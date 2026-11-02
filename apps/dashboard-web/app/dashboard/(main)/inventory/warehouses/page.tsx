'use client';

/**
 * صفحة المخازن — كيان وإدارة رئيسية (صفحة مستقلة).
 * التبويبات: المخازن | أرصدة كل مخزن | النقل بين المخازن | حركات المخازن
 * النقل عملية داخل إدارة المخازن، مش صفحة مستقلة.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Warehouse,
  Plus,
  Edit,
  Trash2,
  Download,
  X,
  Info,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';
import WarehouseBalancesView from '@/components/inventory/views/WarehouseBalancesView';
import TransfersView from '@/components/inventory/views/TransfersView';
import MovementsView from '@/components/inventory/views/MovementsView';

type WarehouseItem = {
  id: string;
  name: string;
  nameAr: string;
  location: string;
  city: string;
  capacity: number;
  used: number;
  manager: string;
  phone: string;
  status: 'active' | 'inactive' | 'full';
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  name: '',
  nameAr: '',
  location: '',
  city: '',
  capacity: 1000,
  manager: '',
  phone: '',
  status: 'active' as 'active' | 'inactive' | 'full',
};

const WAREHOUSE_SECTION_TABS = [
  { id: 'warehouses', label: 'المخازن' },
  { id: 'balances', label: 'أرصدة كل مخزن' },
  { id: 'transfers', label: 'النقل بين المخازن' },
  { id: 'movements', label: 'حركات المخازن' },
];

const WAREHOUSE_SUBTITLES: Record<string, string> = {
  warehouses: 'إدارة المخازن المتعددة — الرئيسي والفروع والمرتجعات والتالف',
  balances: 'أرصدة الأصناف والكميات والقيمة في كل مخزن',
  transfers: 'تحويل المنتجات بين المخازن ومتابعة الاستلام',
  movements: 'سجل حركات المخازن: تحويلات ودخول وخروج',
};

export default function WarehousesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <WarehousesPageContent />
    </Suspense>
  );
}

function WarehousesPageContent() {
  const [activeTab, setTab] = useInvSectionTab(
    WAREHOUSE_SECTION_TABS.map((t) => t.id),
    'warehouses'
  );

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">المخازن</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{WAREHOUSE_SUBTITLES[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* تبويبات القسم — النقل عملية داخل المخازن مش صفحة مستقلة */}
      <SectionTabs tabs={WAREHOUSE_SECTION_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'warehouses' && <WarehousesListView />}
      {activeTab === 'balances' && <WarehouseBalancesView />}
      {activeTab === 'transfers' && <TransfersView />}
      {activeTab === 'movements' && <MovementsView initialType="transfer" />}
    </div>
  );
}

/** قائمة المخازن — إضافة/تعديل/حذف + السعة والحالة */
function WarehousesListView() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editItem, setEditItem] = useState<WarehouseItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/warehouses/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setWarehouses(
        data.map((w: any) => ({
          id: String(w.id),
          name: w.name || '---',
          nameAr: w.nameAr || w.name_ar || '---',
          location: w.location || w.address || '---',
          city: w.city || '---',
          capacity: Number(w.capacity || 1000),
          used: Number(w.used || w.currentStock || 0),
          manager: w.manager || w.managerName || '---',
          phone: w.phone || '---',
          status: w.status || 'active',
          productCount: Number(w.productCount || w.products_count || 0),
          createdAt: w.createdAt || new Date().toISOString(),
          updatedAt: w.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const filtered = useMemo(() => {
    let result = warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        w.nameAr.includes(debouncedSearch) ||
        w.location.includes(debouncedSearch) ||
        w.manager.includes(debouncedSearch)
    );
    if (filterStatus !== 'all') {
      result = result.filter((w) => w.status === filterStatus);
    }
    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'name'
          ? a.name
          : sortBy === 'capacity'
            ? a.capacity
            : sortBy === 'used'
              ? a.used
              : a.createdAt;
      const bVal =
        sortBy === 'name'
          ? b.name
          : sortBy === 'capacity'
            ? b.capacity
            : sortBy === 'used'
              ? b.used
              : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [warehouses, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Location',
      'City',
      'Capacity',
      'Used',
      'Manager',
      'Phone',
      'Status',
      'Products',
      'Created At',
    ];
    const rows = filtered.map((w) => [
      w.name,
      w.nameAr,
      w.location,
      w.city,
      w.capacity,
      w.used,
      w.manager,
      w.phone,
      w.status,
      w.productCount,
      w.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'warehouses.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'warehouses.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/warehouses', {
        method: 'POST',
        body: JSON.stringify({ ...formData, shopId: sid }),
      });
      setAddModal(false);
      setFormData(emptyForm);
      loadWarehouses();
    } catch {
      alert('حدث خطأ أثناء إضافة المخزن');
    } finally {
      setSaving(false);
    }
  }, [formData, loadWarehouses]);

  const handleEdit = useCallback(async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await apiRequest(`/warehouses/${editItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditItem(null);
      setFormData(emptyForm);
      loadWarehouses();
    } catch {
      alert('حدث خطأ أثناء تعديل المخزن');
    } finally {
      setSaving(false);
    }
  }, [editItem, formData, loadWarehouses]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا المخزن؟')) return;
      try {
        await apiRequest(`/warehouses/${id}`, { method: 'DELETE' });
        loadWarehouses();
      } catch {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadWarehouses]
  );

  const openEditModal = useCallback((w: WarehouseItem) => {
    setEditItem(w);
    setFormData({
      name: w.name,
      nameAr: w.nameAr,
      location: w.location,
      city: w.city,
      capacity: w.capacity,
      manager: w.manager,
      phone: w.phone,
      status: w.status,
    });
    setEditModal(true);
  }, []);

  const STATUS_TONE: Record<string, 'emerald' | 'slate' | 'red'> = {
    active: 'emerald',
    inactive: 'slate',
    full: 'red',
  };

  const renderForm = (isEdit: boolean) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (إنجليزي)</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Warehouse Name"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
        <input
          type="text"
          value={formData.nameAr}
          onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
          placeholder="اسم المخزن"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">العنوان</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="العنوان"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">المدينة</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="المدينة"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">السعة</label>
        <input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">المسؤول</label>
        <input
          type="text"
          value={formData.manager}
          onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
          placeholder="اسم المسؤول"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الهاتف</label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="رقم الهاتف"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="full">ممتلئ</option>
        </select>
      </div>
      <div className="col-span-2">
        <button
          onClick={isEdit ? handleEdit : handleAdd}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المخزن'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-bold text-slate-500">
          {warehouses.length} مخزن • السعة المستخدمة{' '}
          {warehouses.reduce((s, w) => s + w.used, 0).toLocaleString('en-US')} /{' '}
          {warehouses.reduce((s, w) => s + w.capacity, 0).toLocaleString('en-US')}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadWarehouses()}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            تحديث
          </button>
          <button
            onClick={exportCSV}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download size={14} />
            تصدير CSV
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="h-9 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700"
          >
            <Plus size={14} />
            إضافة مخزن
          </button>
        </div>
      </div>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: warehouses.length },
            {
              id: 'active',
              label: 'نشط',
              count: warehouses.filter((w) => w.status === 'active').length,
            },
            {
              id: 'inactive',
              label: 'غير نشط',
              count: warehouses.filter((w) => w.status === 'inactive').length,
            },
            {
              id: 'full',
              label: 'ممتلئ',
              count: warehouses.filter((w) => w.status === 'full').length,
            },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو الموقع..."
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="name">الاسم</option>
                <option value="capacity">السعة</option>
                <option value="used">المستخدم</option>
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

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={Warehouse} title="لا توجد مخازن حالياً" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'الاسم', className: 'col-span-2' },
                { label: 'الموقع', className: 'col-span-2' },
                { label: 'المسؤول', className: 'col-span-2' },
                { label: 'السعة', className: 'col-span-2' },
                { label: 'المنتجات', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'الإجراءات', className: 'col-span-2' },
              ]}
            >
              {paginated.map((w) => {
                const usagePct = w.capacity > 0 ? (w.used / w.capacity) * 100 : 0;
                return (
                  <InvRow key={w.id} muted={w.status === 'inactive'}>
                    <div className="col-span-2 min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {w.name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {w.nameAr}
                      </div>
                    </div>
                    <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                      {w.location}, {w.city}
                    </div>
                    <div className="col-span-2 pr-4 min-w-0">
                      <div className="text-slate-600 text-xs sm:text-sm truncate">{w.manager}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                        {w.phone}
                      </div>
                    </div>
                    <div className="col-span-2 pr-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {w.used.toLocaleString('en-US')} / {w.capacity.toLocaleString('en-US')}
                      </div>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(usagePct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                      {w.productCount}
                    </div>
                    <div className="col-span-1">
                      <InvStatusPill tone={STATUS_TONE[w.status]}>
                        {w.status === 'active'
                          ? 'نشط'
                          : w.status === 'inactive'
                            ? 'غير نشط'
                            : 'ممتلئ'}
                      </InvStatusPill>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <InvRowAction onClick={() => openEditModal(w)} title="تعديل">
                        <Edit size={14} />
                      </InvRowAction>
                      <InvRowAction onClick={() => handleDelete(w.id)} title="حذف" danger>
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
              label="مخزن"
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
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إضافة مخزن جديد</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            {renderForm(false)}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل المخزن</h2>
              <button
                onClick={() => setEditModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            {renderForm(true)}
          </div>
        </div>
      )}
    </div>
  );
}
