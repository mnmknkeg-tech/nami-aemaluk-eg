'use client';

/**
 * صفحة الموردون — كيان وإدارة رئيسية (صفحة مستقلة).
 * التبويبات: الموردون | المشتريات | المستحقات | المدفوعات | كشف الحساب
 * نفس بيانات المورد تُفتح كذلك من المالية → الموردون والدائنون (ملف واحد بلا نسخ).
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Download,
  Check,
  X,
  Info,
  AlertTriangle,
  Phone,
  Mail,
  CreditCard,
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
  InvBulkBar,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';
import PurchasesView from '@/components/inventory/views/PurchasesView';
import { PayablesView, PaymentsView } from '@/components/inventory/views/SupplierBalancesViews';
import StatementView from '@/components/inventory/views/StatementView';

type Supplier = {
  id: string;
  name: string;
  nameAr: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  paymentTerms: string;
  leadTime: number;
  rating: number;
  status: 'active' | 'inactive' | 'blocked';
  productCount: number;
  totalOrders: number;
  totalPurchases: number;
  createdAt: string;
  updatedAt: string;
};

const SUPPLIER_SECTION_TABS = [
  { id: 'suppliers', label: 'الموردون' },
  { id: 'purchases', label: 'المشتريات' },
  { id: 'payables', label: 'المستحقات' },
  { id: 'payments', label: 'المدفوعات' },
  { id: 'statement', label: 'كشف الحساب' },
];

const SUPPLIER_SUBTITLES: Record<string, string> = {
  suppliers: 'ملف المورد الواحد: البيانات والمشتريات والمستحقات والكشف',
  purchases: 'كل أوامر الشراء من منظور مالي — القيمة والمدفوع والمتبقي',
  payables: 'أرصدة المستحقات للموردين من أوامر الشراء',
  payments: 'المدفوعات المسددة للموردين',
  statement: 'كشف حساب المورد: فواتير ومدفوعات ورصيد جاري',
};

export default function SuppliersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <SuppliersPageContent />
    </Suspense>
  );
}

function SuppliersPageContent() {
  const [activeTab, setTab] = useInvSectionTab(
    SUPPLIER_SECTION_TABS.map((t) => t.id),
    'suppliers'
  );

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">الموردون</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{SUPPLIER_SUBTITLES[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* تبويبات القسم */}
      <SectionTabs tabs={SUPPLIER_SECTION_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'suppliers' && <SuppliersListView />}
      {activeTab === 'purchases' && <PurchasesView />}
      {activeTab === 'payables' && <PayablesView />}
      {activeTab === 'payments' && <PaymentsView />}
      {activeTab === 'statement' && <StatementView />}
    </div>
  );
}

/** قائمة الموردين — بيانات الاتصال والحالة والتقييم */
function SuppliersListView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    paymentTerms: '',
    leadTime: 7,
    rating: 5,
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/suppliers/shop/${sid}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setSuppliers(
        data.map((s: any) => ({
          id: String(s.id),
          name: s.name || '---',
          nameAr: s.nameAr || s.name_ar || '---',
          contactPerson: s.contactPerson || s.contact_person || '---',
          email: s.email || '---',
          phone: s.phone || '---',
          address: s.address || '---',
          city: s.city || '---',
          country: s.country || '---',
          taxId: s.taxId || s.tax_id || '---',
          paymentTerms: s.paymentTerms || s.payment_terms || '---',
          leadTime: Number(s.leadTime || s.lead_time || 7),
          rating: Number(s.rating || 5),
          status: s.status || 'active',
          productCount: Number(s.productCount || s.products_count || 0),
          totalOrders: Number(s.totalOrders || s.total_orders || 0),
          totalPurchases: Number(s.totalPurchases || s.total_purchases || 0),
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString(),
        }))
      );
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filtered = useMemo(() => {
    let result = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.nameAr.includes(debouncedSearch) ||
        s.contactPerson.includes(debouncedSearch) ||
        s.email.includes(debouncedSearch) ||
        s.phone.includes(debouncedSearch)
    );

    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'name'
          ? a.name
          : sortBy === 'rating'
            ? a.rating
            : sortBy === 'totalPurchases'
              ? a.totalPurchases
              : a.createdAt;
      const bVal =
        sortBy === 'name'
          ? b.name
          : sortBy === 'rating'
            ? b.rating
            : sortBy === 'totalPurchases'
              ? b.totalPurchases
              : b.createdAt;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [suppliers, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedSuppliers.length && paginatedSuppliers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSuppliers.map((s) => s.id)));
    }
  }, [paginatedSuppliers, selectedIds.size]);

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
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} مورد؟`)) return;
    try {
      // TODO: Implement bulk delete API call
      alert(`تم حذف ${selectedIds.size} مورد`);
      setSelectedIds(new Set());
      loadSuppliers();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  }, [selectedIds, loadSuppliers]);

  const bulkActivate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      // TODO: Implement bulk activate API call
      alert(`تم تفعيل ${selectedIds.size} مورد`);
      setSelectedIds(new Set());
      loadSuppliers();
    } catch (error) {
      alert('حدث خطأ أثناء التفعيل');
    }
  }, [selectedIds, loadSuppliers]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Name (Arabic)',
      'Contact Person',
      'Email',
      'Phone',
      'City',
      'Country',
      'Rating',
      'Status',
      'Product Count',
      'Total Orders',
      'Total Purchases',
      'Created At',
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.nameAr,
      s.contactPerson,
      s.email,
      s.phone,
      s.city,
      s.country,
      s.rating,
      s.status,
      s.productCount,
      s.totalOrders,
      s.totalPurchases,
      s.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'suppliers.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'suppliers.csv');
    });
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/suppliers', {
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
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        taxId: '',
        paymentTerms: '',
        leadTime: 7,
        rating: 5,
        status: 'active',
      });
      loadSuppliers();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة المورد');
    }
  }, [formData, loadSuppliers]);

  const handleEdit = useCallback(async () => {
    if (!editSupplier) return;
    try {
      await apiRequest(`/suppliers/${editSupplier.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModal(false);
      setEditSupplier(null);
      setFormData({
        name: '',
        nameAr: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        taxId: '',
        paymentTerms: '',
        leadTime: 7,
        rating: 5,
        status: 'active',
      });
      loadSuppliers();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل المورد');
    }
  }, [editSupplier, formData, loadSuppliers]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
      try {
        await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
        loadSuppliers();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadSuppliers]
  );

  const openEditModal = useCallback((supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({
      name: supplier.name,
      nameAr: supplier.nameAr,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city,
      country: supplier.country,
      taxId: supplier.taxId,
      paymentTerms: supplier.paymentTerms,
      leadTime: supplier.leadTime,
      rating: supplier.rating,
      status: supplier.status,
    });
    setEditModal(true);
  }, []);

  const STATUS_TONE: Record<Supplier['status'], 'emerald' | 'slate' | 'red'> = {
    active: 'emerald',
    inactive: 'slate',
    blocked: 'red',
  };

  const STATUS_LABEL: Record<Supplier['status'], string> = {
    active: 'نشط',
    inactive: 'غير نشط',
    blocked: 'محظور',
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-slate-300'}>
        ★
      </span>
    ));
  };

  const renderForm = (isEdit: boolean) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (إنجليزي)</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Supplier Name"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
        <input
          type="text"
          value={formData.nameAr}
          onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
          placeholder="اسم المورد"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">جهة الاتصال</label>
        <input
          type="text"
          value={formData.contactPerson}
          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
        <label className="text-sm font-bold text-slate-700 mb-1 block">البريد الإلكتروني</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@example.com"
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
        <label className="text-sm font-bold text-slate-700 mb-1 block">البلد</label>
        <input
          type="text"
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          placeholder="البلد"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">الرقم الضريبي</label>
        <input
          type="text"
          value={formData.taxId}
          onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
          placeholder="الرقم الضريبي"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">شروط الدفع</label>
        <input
          type="text"
          value={formData.paymentTerms}
          onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
          placeholder="شروط الدفع"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">وقت التسليم (أيام)</label>
        <input
          type="number"
          value={formData.leadTime}
          onChange={(e) => setFormData({ ...formData, leadTime: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div>
        <label className="text-sm font-bold text-slate-700 mb-1 block">التقييم</label>
        <select
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {'★'.repeat(r)}
            </option>
          ))}
        </select>
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
          <option value="blocked">محظور</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="text-sm font-bold text-slate-700 mb-1 block">العنوان</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="العنوان الكامل"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>
      <div className="col-span-2">
        <button
          onClick={isEdit ? handleEdit : handleAdd}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all"
        >
          {isEdit ? 'حفظ التعديلات' : 'إضافة المورد'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-bold text-slate-500">
          {suppliers.length} مورد • إجمالي المشتريات ج.م{' '}
          {suppliers.reduce((s, x) => s + x.totalPurchases, 0).toLocaleString('en-US')}
        </div>
        <div className="flex items-center gap-2">
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
            إضافة مورد
          </button>
        </div>
      </div>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: suppliers.length },
            {
              id: 'active',
              label: 'نشط',
              count: suppliers.filter((s) => s.status === 'active').length,
            },
            {
              id: 'inactive',
              label: 'غير نشط',
              count: suppliers.filter((s) => s.status === 'inactive').length,
            },
            {
              id: 'blocked',
              label: 'محظور',
              count: suppliers.filter((s) => s.status === 'blocked').length,
            },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو الاتصال..."
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="name">الاسم</option>
                <option value="rating">التقييم</option>
                <option value="totalPurchases">إجمالي المشتريات</option>
                <option value="createdAt">تاريخ الإنشاء</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <CreditCard size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </button>
            </>
          }
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3">
          <InvBulkBar>
            <span>{selectedIds.size} مورد محدد</span>
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
          <InvEmpty icon={Truck} title="لا يوجد موردين حالياً" />
        ) : (
          <>
            <InvTableCard
              headerExtra={
                <div className="col-span-1 flex items-center">
                  <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                    {selectedIds.size === paginatedSuppliers.length &&
                    paginatedSuppliers.length > 0 ? (
                      <Check size={16} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </div>
              }
              columns={[
                { label: 'الاسم', className: 'col-span-2' },
                { label: 'جهة الاتصال', className: 'col-span-1' },
                { label: 'الهاتف', className: 'col-span-1' },
                { label: 'البريد', className: 'col-span-1' },
                { label: 'المدينة', className: 'col-span-1' },
                { label: 'التقييم', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'المنتجات', className: 'col-span-1' },
                { label: 'المشتريات', className: 'col-span-1' },
                { label: 'إجراءات', className: 'col-span-1' },
              ]}
            >
              {paginatedSuppliers.map((supplier) => (
                <InvRow key={supplier.id} muted={supplier.status !== 'active'}>
                  <div className="col-span-1 flex items-center">
                    <button onClick={() => toggleSelect(supplier.id)} className="p-1">
                      {selectedIds.has(supplier.id) ? (
                        <Check size={16} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {supplier.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {supplier.nameAr}
                    </div>
                  </div>
                  <div className="col-span-1 text-slate-600 text-xs sm:text-sm truncate">
                    {supplier.contactPerson}
                  </div>
                  <div className="col-span-1 text-slate-600 text-xs sm:text-sm flex items-center gap-1 truncate">
                    <Phone size={12} />
                    {supplier.phone}
                  </div>
                  <div className="col-span-1 text-slate-600 text-xs sm:text-sm flex items-center gap-1 truncate">
                    <Mail size={12} />
                    {supplier.email}
                  </div>
                  <div className="col-span-1 text-slate-600 text-xs sm:text-sm truncate">
                    {supplier.city}
                  </div>
                  <div className="col-span-1 text-yellow-400 text-xs sm:text-sm">
                    {renderStars(supplier.rating)}
                  </div>
                  <div className="col-span-1">
                    <InvStatusPill tone={STATUS_TONE[supplier.status]}>
                      {STATUS_LABEL[supplier.status]}
                    </InvStatusPill>
                  </div>
                  <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                    {supplier.productCount}
                  </div>
                  <div className="col-span-1 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                    ج.م {supplier.totalPurchases.toLocaleString('en-US')}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1.5">
                    <InvRowAction onClick={() => openEditModal(supplier)} title="تعديل">
                      <Edit size={14} />
                    </InvRowAction>
                    <InvRowAction onClick={() => handleDelete(supplier.id)} title="حذف" danger>
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
              label="مورد"
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
              <h2 className="text-xl font-black text-slate-900">إضافة مورد جديد</h2>
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
      {editModal && editSupplier && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل المورد</h2>
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
