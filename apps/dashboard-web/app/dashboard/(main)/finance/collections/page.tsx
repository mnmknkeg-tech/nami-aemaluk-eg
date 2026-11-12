'use client';

/**
 * التحصيلات والمدفوعات — مركز الأموال المحصلة والمدفوعة.
 * التحصيل (receipt من العميل) والدفع (payment للمورد) مع توزيعها على الفواتير،
 * وتقرير أعمار الديون للمتأخرات. كل عملية عند اعتمادها تُرحّل محاسبيًا.
 */
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  X,
  RefreshCw,
  Download,
  Check,
  Info,
  TrendingUp,
  TrendingDown,
  Wallet,
  HandCoins,
  Clock,
  AlertTriangle,
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
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Payment = {
  id: string;
  number: string;
  type: 'receipt' | 'payment';
  date: string;
  amount: number;
  method: string;
  reference: string;
  entityId: string;
  entityName: string;
  status: 'draft' | 'posted';
  hasAllocations: boolean;
};

type Entity = {
  id: string;
  entityType: 'customer' | 'vendor';
  name: string;
  phone: string;
};

type AgingRow = {
  entityName: string;
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90Plus: number;
  total: number;
};

type AccInvoice = {
  id: string;
  number: string;
  invoiceType: 'sale' | 'purchase';
  entityId: string;
  entityName: string;
  total: number;
  paid: number;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');

const METHOD_LABEL: Record<string, string> = {
  cash: 'نقدي',
  bank: 'بنك',
  mobile: 'محفظة موبايل',
  check: 'شيك',
  other: 'أخرى',
};

const SECTION_TABS = [
  { id: 'all', label: 'كل العمليات' },
  { id: 'receipts', label: 'التحصيلات' },
  { id: 'payments', label: 'المدفوعات' },
  { id: 'customer', label: 'دفعات العملاء' },
  { id: 'supplier', label: 'دفعات الموردين' },
  { id: 'partial', label: 'دفعات جزئية' },
  { id: 'overdue', label: 'المتأخرات' },
];

const emptyForm = {
  type: 'receipt' as 'receipt' | 'payment',
  entityId: '',
  number: '',
  date: new Date().toISOString().split('T')[0],
  amount: '',
  method: 'cash',
  reference: '',
  allocationInvoiceId: '',
  allocationAmount: '',
};

function CollectionsContent() {
  const [activeTab, setTab] = useInvSectionTab(
    SECTION_TABS.map((t) => t.id),
    'all'
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [aging, setAging] = useState<AgingRow[]>([]);
  const [openInvoices, setOpenInvoices] = useState<AccInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [addModal, setAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [payRes, entRes, agingRes, invRes] = await Promise.all([
        apiRequest(`/accounting/payments/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/entities/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/aging/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => ({ data: [] })),
      ]);
      const payList = Array.isArray(payRes) ? payRes : payRes?.data || [];
      setPayments(
        payList.map((p: any) => {
          const t = String(p.payment_type || p.paymentType || 'receipt').toLowerCase();
          const allocs = p.allocations || p.payment_allocations;
          return {
            id: String(p.id),
            number: p.number || p.payment_number || '---',
            type: t === 'payment' ? 'payment' : 'receipt',
            date: p.payment_date || p.paymentDate || p.created_at || new Date().toISOString(),
            amount: Number(p.amount || 0),
            method: String(p.method || 'other').toLowerCase(),
            reference: p.reference || '',
            entityId: String(p.entity_id || p.entityId || ''),
            entityName: p.entity_name || p.entityName || '—',
            status: String(p.status || 'posted').toLowerCase() === 'draft' ? 'draft' : 'posted',
            hasAllocations: Array.isArray(allocs) && allocs.length > 0,
          };
        })
      );
      const entList = Array.isArray(entRes) ? entRes : entRes?.data || [];
      setEntities(
        entList.map((e: any) => ({
          id: String(e.id),
          entityType:
            String(e.entity_type || e.entityType || 'customer').toLowerCase() === 'vendor'
              ? 'vendor'
              : 'customer',
          name: e.name || '---',
          phone: e.phone || '',
        }))
      );
      const agingList = Array.isArray(agingRes) ? agingRes : agingRes?.data || [];
      setAging(
        agingList.map((a: any) => {
          const buckets = a.buckets || a.aging || {};
          return {
            entityName: a.entity_name || a.entityName || '---',
            current: Number(buckets.current ?? a.current ?? 0),
            d30: Number(buckets.d1_30 ?? buckets['1_30'] ?? a.d30 ?? 0),
            d60: Number(buckets.d31_60 ?? buckets['31_60'] ?? a.d60 ?? 0),
            d90: Number(buckets.d61_90 ?? buckets['61_90'] ?? a.d90 ?? 0),
            d90Plus: Number(buckets.d90_plus ?? buckets['90_plus'] ?? a.d90_plus ?? 0),
            total: Number(a.total_outstanding ?? a.total ?? a.outstanding ?? 0),
          };
        })
      );
      const invList = Array.isArray(invRes) ? invRes : invRes?.data || [];
      setOpenInvoices(
        invList.map((i: any) => ({
          id: String(i.id),
          number: i.number || '---',
          invoiceType:
            String(i.invoice_type || i.invoiceType || 'sale').toLowerCase() === 'purchase'
              ? 'purchase'
              : 'sale',
          entityId: String(i.entity_id || i.entityId || ''),
          entityName: i.entity_name || i.entityName || '',
          total: Number(i.total_amount || i.totalAmount || i.total || 0),
          paid: Number(i.paid_amount || i.paidAmount || i.paid || 0),
        }))
      );
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل العمليات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** بيانات التاب الحالي — التابات كلها من نفس مصدر العمليات إلا المتأخرات */
  const tabRows = useMemo(() => {
    let result = payments.filter(
      (p) =>
        p.number.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.entityName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (activeTab === 'receipts' || activeTab === 'customer')
      result = result.filter((p) => p.type === 'receipt');
    else if (activeTab === 'payments' || activeTab === 'supplier')
      result = result.filter((p) => p.type === 'payment');
    else if (activeTab === 'partial') result = result.filter((p) => p.hasAllocations);
    return result;
  }, [payments, debouncedSearch, activeTab]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tabRows.slice(start, start + itemsPerPage);
  }, [tabRows, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(tabRows.length / itemsPerPage);

  const stats = useMemo(() => {
    const receipts = payments.filter((p) => p.type === 'receipt').reduce((s, p) => s + p.amount, 0);
    const paid = payments.filter((p) => p.type === 'payment').reduce((s, p) => s + p.amount, 0);
    const overdueTotal = aging.reduce((s, a) => s + a.total, 0);
    return { receipts, paid, net: receipts - paid, overdueTotal };
  }, [payments, aging]);

  const exportCSV = useCallback(() => {
    const headers = ['Number', 'Type', 'Date', 'Party', 'Amount', 'Method', 'Reference', 'Status'];
    const rows = tabRows.map((p) => [
      p.number,
      p.type,
      p.date,
      p.entityName,
      p.amount,
      METHOD_LABEL[p.method] || p.method,
      p.reference,
      p.status,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'collections-payments.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'collections-payments.csv');
    });
  }, [tabRows]);

  const openAddModal = () => {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    setFormData({
      ...emptyForm,
      number: `REC-${stamp}-${String(payments.length + 1).padStart(4, '0')}`,
    });
    setAddModal(true);
  };

  const handleAdd = useCallback(async () => {
    const amount = Number(formData.amount);
    if (!formData.entityId) {
      setError('اختر الطرف أولًا');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('أدخل مبلغًا صحيحًا');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const allocations =
        formData.allocationInvoiceId && formData.allocationAmount
          ? [
              {
                invoice_id: formData.allocationInvoiceId,
                amount: Number(formData.allocationAmount),
              },
            ]
          : undefined;
      const res = await apiRequest(`/accounting/payments/shop/${sid}`, {
        method: 'POST',
        body: JSON.stringify({
          entity_id: formData.entityId,
          payment_type: formData.type,
          number: formData.number,
          payment_date: formData.date,
          amount,
          method: formData.method,
          reference: formData.reference || undefined,
          allocations,
        }),
      });
      const newId = res?.id || res?.data?.id;
      if (newId) {
        await apiRequest(`/accounting/payments/${newId}/post`, { method: 'POST' }).catch(() => {});
      }
      setAddModal(false);
      setFormData(emptyForm);
      load();
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل العملية');
    } finally {
      setSaving(false);
    }
  }, [formData, load]);

  const approvePayment = useCallback(
    async (p: Payment) => {
      try {
        await apiRequest(`/accounting/payments/${p.id}/post`, { method: 'POST' });
        load();
      } catch (err: any) {
        alert(err?.message || 'فشل اعتماد الدفعة');
      }
    },
    [load]
  );

  const statementHref = (p: Payment) =>
    p.type === 'receipt'
      ? `/dashboard/finance/receivables?tab=statement&entity=${p.entityId}`
      : `/dashboard/finance/payables?tab=statement&entity=${p.entityId}`;

  const filteredEntities = entities.filter((e) =>
    formData.type === 'receipt' ? e.entityType === 'customer' : e.entityType === 'vendor'
  );
  const allocationCandidates = openInvoices.filter((i) =>
    formData.type === 'receipt' ? i.invoiceType === 'sale' : i.invoiceType === 'purchase'
  );

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">التحصيلات والمدفوعات</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              كل الأموال الداخلة والخارجة — تحصيل العملاء وسداد الموردين مع ربطها بالفواتير
            </p>
          </div>
        </div>
      </div>

      <SectionTabs tabs={SECTION_TABS} active={activeTab} onChange={setTab} />

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
            {error}
            <button onClick={() => setError('')} className="p-1 rounded hover:bg-red-100">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        {activeTab === 'overdue' ? (
          <>
            <div className="mt-4">
              <InvToolbar hint="المتأخرات حسب تقرير أعمار الديون — الأرصدة غير المسددة موزعة على فترات التأخير">
                <InvToolButton onClick={() => load()}>
                  <RefreshCw size={14} />
                  تحديث
                </InvToolButton>
                <InvToolButton onClick={exportCSV}>
                  <Download size={14} />
                  تصدير CSV
                </InvToolButton>
              </InvToolbar>
            </div>
            <div className="mt-4">
              {loading ? (
                <InvLoading />
              ) : aging.length === 0 ? (
                <InvEmpty icon={Clock} title="لا توجد أرصدة متأخرة — كل الحسابات مسددة" />
              ) : (
                <InvTableCard
                  columns={[
                    { label: 'الطرف', className: 'col-span-3' },
                    { label: 'غير مستحق بعد', className: 'col-span-2' },
                    { label: '1-30 يوم', className: 'col-span-1' },
                    { label: '31-60 يوم', className: 'col-span-1' },
                    { label: '61-90 يوم', className: 'col-span-1' },
                    { label: '+90 يوم', className: 'col-span-1' },
                    { label: 'الإجمالي', className: 'col-span-3' },
                  ]}
                >
                  {aging.map((a, i) => (
                    <InvRow key={i}>
                      <div className="col-span-3 min-w-0">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {a.entityName}
                        </div>
                      </div>
                      <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm">
                        ج.م {fmt(a.current)}
                      </div>
                      <div className="col-span-1 pr-4 text-amber-600 text-xs sm:text-sm font-bold">
                        {a.d30 > 0 ? fmt(a.d30) : '—'}
                      </div>
                      <div className="col-span-1 pr-4 text-orange-600 text-xs sm:text-sm font-bold">
                        {a.d60 > 0 ? fmt(a.d60) : '—'}
                      </div>
                      <div className="col-span-1 pr-4 text-red-600 text-xs sm:text-sm font-bold">
                        {a.d90 > 0 ? fmt(a.d90) : '—'}
                      </div>
                      <div className="col-span-1 pr-4 text-red-700 text-xs sm:text-sm font-bold">
                        {a.d90Plus > 0 ? fmt(a.d90Plus) : '—'}
                      </div>
                      <div className="col-span-3 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                        ج.م {fmt(a.total)}
                      </div>
                    </InvRow>
                  ))}
                </InvTableCard>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Inline Stats Strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-1 mb-3 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <TrendingUp size={13} className="text-emerald-500" />
                <span className="font-bold text-slate-700">إجمالي التحصيلات</span>
                <span className="font-black text-emerald-600 mr-0.5">
                  ج.م {fmt(stats.receipts)}
                </span>
              </span>
              <span className="hidden sm:block w-px h-3 bg-slate-200" />
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <TrendingDown size={13} className="text-rose-500" />
                <span className="font-bold text-slate-700">إجمالي المدفوعات</span>
                <span className="font-black text-rose-600 mr-0.5">ج.م {fmt(stats.paid)}</span>
              </span>
              <span className="hidden sm:block w-px h-3 bg-slate-200" />
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Wallet size={13} className="text-sky-500" />
                <span className="font-bold text-slate-700">الصافي</span>
                <span
                  className={`font-black mr-0.5 ${stats.net >= 0 ? 'text-sky-600' : 'text-rose-600'}`}
                >
                  ج.م {fmt(stats.net)}
                </span>
              </span>
              <span className="hidden sm:block w-px h-3 bg-slate-200" />
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <AlertTriangle size={13} className="text-amber-500" />
                <span className="font-bold text-slate-700">المتأخرات</span>
                <span className="font-black text-amber-600 mr-0.5">
                  ج.م {fmt(stats.overdueTotal)}
                </span>
              </span>
            </div>

            <div className="mt-0">
              <InvToolbar hint={`${tabRows.length} عملية`}>
                <InvToolButton onClick={() => load()}>
                  <RefreshCw size={14} />
                  تحديث
                </InvToolButton>
                <InvToolButton onClick={exportCSV}>
                  <Download size={14} />
                  تصدير CSV
                </InvToolButton>
                <InvToolButton primary onClick={openAddModal}>
                  <Plus size={14} />
                  عملية جديدة
                </InvToolButton>
              </InvToolbar>
            </div>

            <div className="mt-3">
              <InvControlsCard
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="بحث برقم العملية أو الطرف…"
              />
            </div>

            <div className="mt-4">
              {loading ? (
                <InvLoading />
              ) : tabRows.length === 0 ? (
                <InvEmpty
                  icon={HandCoins}
                  title={
                    activeTab === 'partial'
                      ? 'لا توجد دفعات موزعة على فواتير بعد — سجّل عملية مع تحديد فاتورة للتوزيع'
                      : 'لا توجد عمليات في هذا القسم'
                  }
                />
              ) : (
                <>
                  <InvTableCard
                    columns={[
                      { label: 'رقم العملية', className: 'col-span-2' },
                      { label: 'التاريخ', className: 'col-span-2' },
                      { label: 'الطرف', className: 'col-span-2' },
                      { label: 'النوع', className: 'col-span-2' },
                      { label: 'المبلغ', className: 'col-span-1' },
                      { label: 'الطريقة', className: 'col-span-1' },
                      { label: 'الحالة', className: 'col-span-1' },
                      { label: 'إجراءات', className: 'col-span-1' },
                    ]}
                  >
                    {paginated.map((p) => (
                      <InvRow key={p.id} muted={p.status === 'draft'}>
                        <div className="col-span-2 min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {p.number}
                          </div>
                        </div>
                        <div className="col-span-2 text-slate-600 text-xs sm:text-sm">
                          {new Date(p.date).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="col-span-2 text-slate-600 text-xs sm:text-sm truncate">
                          {p.entityName}
                        </div>
                        <div className="col-span-2">
                          <InvStatusPill tone={p.type === 'receipt' ? 'emerald' : 'amber'}>
                            {p.type === 'receipt' ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {p.type === 'receipt' ? 'تحصيل' : 'دفع'}
                          </InvStatusPill>
                        </div>
                        <div className="col-span-1 pr-4 font-bold text-slate-900 text-xs sm:text-sm">
                          ج.م {fmt(p.amount)}
                        </div>
                        <div className="col-span-1 pr-4 text-slate-600 text-xs sm:text-sm">
                          {METHOD_LABEL[p.method] || p.method}
                        </div>
                        <div className="col-span-1">
                          <InvStatusPill tone={p.status === 'posted' ? 'emerald' : 'slate'}>
                            {p.status === 'posted' ? 'معتمدة' : 'مسودة'}
                          </InvStatusPill>
                        </div>
                        <div className="col-span-1 flex items-center justify-end gap-1.5">
                          {p.status === 'draft' && (
                            <InvRowAction onClick={() => approvePayment(p)} title="اعتماد وترحيل">
                              <Check size={14} />
                            </InvRowAction>
                          )}
                          <a
                            href={statementHref(p)}
                            title="كشف حساب الطرف"
                            className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                          >
                            <ArrowLeftRight size={14} />
                          </a>
                        </div>
                      </InvRow>
                    ))}
                  </InvTableCard>

                  <InvPagination
                    page={currentPage}
                    totalPages={totalPages}
                    total={tabRows.length}
                    perPage={itemsPerPage}
                    onPage={setCurrentPage}
                    label="عملية"
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Payment Modal */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">عملية جديدة</h2>
              <button
                onClick={() => setAddModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">نوع العملية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: 'receipt',
                        entityId: '',
                        allocationInvoiceId: '',
                      })
                    }
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${formData.type === 'receipt' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    تحصيل من عميل
                  </button>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: 'payment',
                        entityId: '',
                        allocationInvoiceId: '',
                      })
                    }
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${formData.type === 'payment' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    دفع لمورد
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الطرف</label>
                <select
                  value={formData.entityId}
                  onChange={(e) =>
                    setFormData({ ...formData, entityId: e.target.value, allocationInvoiceId: '' })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">— اختر الطرف —</option>
                  {filteredEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.phone ? ` — ${e.phone}` : ''}
                    </option>
                  ))}
                </select>
                {filteredEntities.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1 font-bold">
                    لا يوجد أطراف من هذا النوع — أضفهم من صفحة العملاء أو الموردين
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">رقم العملية</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">التاريخ</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">المبلغ</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">طريقة الدفع</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="cash">نقدي</option>
                    <option value="bank">بنك</option>
                    <option value="mobile">محفظة موبايل</option>
                    <option value="check">شيك</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  مرجع (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="رقم الشيك / التحويل…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-700 mb-1 block">
                  توزيع على فاتورة (اختياري)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={formData.allocationInvoiceId}
                    onChange={(e) => {
                      const inv = allocationCandidates.find((x) => x.id === e.target.value);
                      const remaining = inv ? Math.max(inv.total - inv.paid, 0) : 0;
                      setFormData({
                        ...formData,
                        allocationInvoiceId: e.target.value,
                        allocationAmount: remaining ? String(remaining) : '',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">— بدون توزيع —</option>
                    {allocationCandidates.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.number} — متبقي ج.م {fmt(i.total - i.paid)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={formData.allocationAmount}
                    onChange={(e) => setFormData({ ...formData, allocationAmount: e.target.value })}
                    placeholder="المبلغ الموزع"
                    disabled={!formData.allocationInvoiceId}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                {saving ? 'جاري التسجيل…' : 'تسجيل واعتماد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <CollectionsContent />
    </Suspense>
  );
}
