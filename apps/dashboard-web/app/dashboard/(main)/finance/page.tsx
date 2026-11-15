'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatAmount as formatMoney } from '@/lib/format';
import {
  FileText,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Download,
  Check,
  X,
  Info,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Send,
  Save,
  ArrowRight,
  FileDown,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvTableCard,
  InvPagination,
  InvBulkBar,
} from '@/components/inventory/InventoryShell';
import type { Invoice, InvoiceLine, ReceiptTheme } from '../_finance/types';
import { fetchUnifiedInvoices } from '../_finance/invoiceData';
import {
  buildPrintInvoiceHtml,
  printInvoiceWindow,
  buildPdfInvoiceHtml,
  printPdfViaIframe,
} from '../_finance/receiptHtml';
import InvoiceGuideModal from '../_finance/GuideModal';
import InvoiceRow from '../_finance/InvoiceRow';

function FinanceContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Invoice Editor States
  const [view, setView] = useState<'manage' | 'edit'>('manage');
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [discountValue, setDiscountValue] = useState('0');
  const [receiptTheme, setReceiptTheme] = useState<ReceiptTheme>({
    shopName: '',
    phone: '',
    city: '',
    address: '',
    logoDataUrl: '',
    footerNote: '',
    vatRatePercent: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [isArabic, setIsArabic] = useState(false);

  // RTL Support
  useEffect(() => {
    const checkRTL = () => {
      const lang = document.documentElement.lang || 'en';
      setIsArabic(lang.toLowerCase().startsWith('ar'));
    };
    checkRTL();
    window.addEventListener('languagechange', checkRTL);
    return () => window.removeEventListener('languagechange', checkRTL);
  }, []);

  // Invoice Calculations
  const subtotal = useMemo(() => {
    return (lines || []).reduce(
      (sum, l) => sum + (Number(l.price) || 0) * (Number(l.quantity) || 0),
      0
    );
  }, [lines]);

  const discount = useMemo(() => {
    const n = Number(discountValue);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(subtotal, n));
  }, [discountValue, subtotal]);

  const netBeforeVat = Math.max(0, subtotal - discount);

  const vatRate = Number(receiptTheme?.vatRatePercent || 0);
  const vatRatePct = Number.isFinite(vatRate) ? vatRate : 0;
  const vatAmount = netBeforeVat * (vatRatePct / 100);
  const total = netBeforeVat + vatAmount;
  const showVat = vatRatePct > 0;

  const resetEditor = () => {
    setSelectedInvoiceId('');
    setLines([]);
    setNewName('');
    setNewQty('1');
    setNewPrice('');
    setEditLineId('');
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setInvoiceDate(`${yyyy}-${mm}-${dd}`);
    setDiscountValue('0');
    setSaveError('');
    setSaveOk('');
  };

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUnifiedInvoices();
      if (data) setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Auto-open editor when ?action=new is present
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'new') {
      resetEditor();
      setView('edit');
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        i.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        i.customerEmail.includes(debouncedSearch)
    );

    if (filterStatus === 'sale' || filterStatus === 'purchase') {
      result = result.filter((i) => i.kind === filterStatus);
    } else if (filterStatus !== 'all') {
      result = result.filter((i) => i.state === filterStatus);
    }

    result = [...result].sort((a, b) => {
      const aVal =
        sortBy === 'invoiceNumber'
          ? a.invoiceNumber
          : sortBy === 'issueDate'
            ? a.issueDate
            : sortBy === 'totalAmount'
              ? a.totalAmount
              : a.createdAt;
      const bVal =
        sortBy === 'invoiceNumber'
          ? b.invoiceNumber
          : sortBy === 'issueDate'
            ? b.issueDate
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
  }, [invoices, debouncedSearch, filterStatus, sortBy, sortOrder]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((i) => i.id)));
    }
  }, [paginatedInvoices, selectedIds.size]);

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
    // الفواتير المحاسبية المرحّلة تُدار من القيود — الحذف الجماعي لفواتير البيع فقط
    const deletable = invoices.filter((i) => selectedIds.has(i.id) && i.source === 'legacy');
    const skipped = selectedIds.size - deletable.length;
    if (deletable.length === 0) {
      alert('المستندات المحددة قيود محاسبية — تُدار من صفحة القيود المحاسبية');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف ${deletable.length} فاتورة؟`)) return;
    let ok = 0;
    for (const inv of deletable) {
      try {
        await apiRequest(`/invoices/${inv.id}`, { method: 'DELETE' });
        ok += 1;
      } catch {
        /* نكمل الباقي ونعيد التحميل */
      }
    }
    if (skipped > 0) alert(`تم حذف ${ok} فاتورة — تم تخطي ${skipped} مستند محاسبي`);
    setSelectedIds(new Set());
    loadInvoices();
  }, [selectedIds, invoices, loadInvoices]);

  const bulkSend = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const sendable = invoices.filter((i) => selectedIds.has(i.id) && i.source === 'legacy');
    if (sendable.length === 0) {
      alert('الإرسال متاح لفواتير البيع فقط');
      return;
    }
    let ok = 0;
    for (const inv of sendable) {
      try {
        await apiRequest(`/invoices/${inv.id}/send`, { method: 'POST' });
        ok += 1;
      } catch {
        /* نكمل الباقي */
      }
    }
    alert(`تم إرسال ${ok} من ${sendable.length} فاتورة`);
    setSelectedIds(new Set());
    loadInvoices();
  }, [selectedIds, invoices, loadInvoices]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Invoice Number',
      'Customer',
      'Email',
      'Status',
      'Issue Date',
      'Due Date',
      'Paid Date',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Paid Amount',
      'Created At',
    ];
    const rows = filtered.map((i) => [
      i.invoiceNumber,
      i.customerName,
      i.customerEmail,
      i.status,
      i.issueDate,
      i.dueDate || '-',
      i.paidDate || '-',
      i.subtotal,
      i.taxAmount,
      i.discountAmount,
      i.totalAmount,
      i.paidAmount,
      i.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob({ filename: 'invoices.csv', headers, rows: [...rows] }, 'csv');
      downloadBlob(blob, 'invoices.csv');
    });
  }, [filtered]);

  // Invoice Line Management
  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const [editLineId, setEditLineId] = useState<string>('');

  const editLine = (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    setNewName(line.name);
    setNewQty(String(line.quantity));
    setNewPrice(String(line.price));
    setEditLineId(id);
  };

  const addLine = () => {
    const name = String(newName || '').trim();
    const qtyRaw = Number(newQty);
    const priceRaw = Number(newPrice);
    if (!name) return;
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : 0;

    if (editLineId) {
      // Update existing line
      setLines((prev) =>
        prev.map((l) => (l.id === editLineId ? { ...l, name, quantity: qty, price } : l))
      );
      setEditLineId('');
    } else {
      // Add new line
      setLines((prev) => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name,
          quantity: qty,
          price,
        },
      ]);
    }
    setNewName('');
    setNewQty('1');
    setNewPrice('');
  };

  const cancelEditLine = () => {
    setEditLineId('');
    setNewName('');
    setNewQty('1');
    setNewPrice('');
  };

  const openNewInvoice = () => {
    resetEditor();
    setView('edit');
  };

  const openInvoiceForEdit = async (id: string) => {
    const invoiceId = String(id || '').trim();
    if (!invoiceId) return;
    setSaveError('');
    setSaveOk('');
    setSaving(true);
    try {
      const inv = await apiRequest(`/invoices/${invoiceId}`);
      setSelectedInvoiceId(String(inv?.id || invoiceId));

      const dRaw = inv?.invoiceDate || inv?.invoice_date || inv?.date;
      const d = dRaw ? new Date(String(dRaw)) : new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setInvoiceDate(`${yyyy}-${mm}-${dd}`);

      const discountDb =
        typeof inv?.discount === 'number' ? inv.discount : Number(inv?.discount ?? 0);
      setDiscountValue(Number.isFinite(discountDb) ? String(discountDb) : '0');

      const items = Array.isArray(inv?.items) ? inv.items : [];
      setLines(
        items
          .map((it: any) => ({
            id: String(it?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`),
            name: String(it?.name || '').trim(),
            quantity: Number(it?.quantity) || 1,
            price: Number(it?.unitPrice ?? it?.unit_price ?? it?.price) || 0,
          }))
          .filter((it: any) => it.name)
      );

      setView('edit');
    } catch (e: any) {
      setSaveError(String(e?.message || 'Error opening invoice'));
      setView('manage');
    } finally {
      setSaving(false);
    }
  };

  const saveInvoice = async () => {
    if (lines.length === 0) {
      setSaveError(isArabic ? 'يجب إضافة بند واحد على الأقل' : 'Add at least one line item');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveOk('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) throw new Error('Shop ID not found');

      const payload = {
        shopId: sid,
        invoiceDate: invoiceDate,
        discount: Number(discountValue),
        items: lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
        subtotal,
        taxAmount: vatAmount,
        discountAmount: discount,
        totalAmount: total,
        status: 'draft',
      };

      if (selectedInvoiceId) {
        await apiRequest(`/invoices/${selectedInvoiceId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSaveOk(isArabic ? 'تم تحديث الفاتورة بنجاح' : 'Invoice updated successfully');
      } else {
        const res = await apiRequest('/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSelectedInvoiceId(String(res?.id || ''));
        setSaveOk(isArabic ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
      }

      setTimeout(() => {
        setSaveOk('');
        loadInvoices();
      }, 2000);
    } catch (e: any) {
      setSaveError(
        String(e?.message || (isArabic ? 'خطأ في حفظ الفاتورة' : 'Error saving invoice'))
      );
    } finally {
      setSaving(false);
    }
  };

  // Professional HTML Printing
  const printInvoice = () => {
    const html = buildPrintInvoiceHtml({
      lines,
      isArabic,
      receiptTheme,
      selectedInvoiceId,
      invoiceDate,
      subtotal,
      discount,
      showVat,
      vatRatePct,
      vatAmount,
      total,
    });
    printInvoiceWindow(html);
  };

  // PDF Export via iframe
  const exportPDF = () => {
    const html = buildPdfInvoiceHtml({
      lines,
      isArabic,
      receiptTheme,
      selectedInvoiceId,
      invoiceDate,
      subtotal,
      discount,
      showVat,
      vatRatePct,
      vatAmount,
      total,
    });
    printPdfViaIframe(html);
  };

  // Load Receipt Theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const shopData = await apiRequest('/shops/me');
        const sid = shopData?.id;
        if (!sid) return;

        // Try to load receipt theme from local storage or API
        const stored = localStorage.getItem(`receipt_theme_${sid}`);
        if (stored) {
          const theme = JSON.parse(stored);
          setReceiptTheme({
            shopName: String(theme?.shopName || shopData?.name || ''),
            phone: String(theme?.phone || shopData?.phone || ''),
            city: String(theme?.city || shopData?.city || ''),
            address: String(theme?.address || shopData?.address || ''),
            logoDataUrl: String(theme?.logoDataUrl || shopData?.logoUrl || ''),
            footerNote: String(theme?.footerNote || ''),
            vatRatePercent: Number(theme?.vatRatePercent || 0),
          });
        } else {
          setReceiptTheme({
            shopName: String(shopData?.name || ''),
            phone: String(shopData?.phone || ''),
            city: String(shopData?.city || ''),
            address: String(shopData?.address || ''),
            logoDataUrl: String(shopData?.logoUrl || ''),
            footerNote: '',
            vatRatePercent: 0,
          });
        }
      } catch (e) {
        console.error('Error loading theme:', e);
      }
    };

    loadTheme();

    const handleThemeUpdate = () => {
      loadTheme();
    };

    window.addEventListener('receipt-theme-update', handleThemeUpdate);
    return () => window.removeEventListener('receipt-theme-update', handleThemeUpdate);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
      try {
        await apiRequest(`/invoices/${id}`, { method: 'DELETE' });
        loadInvoices();
      } catch (error) {
        alert('حدث خطأ أثناء الحذف');
      }
    },
    [loadInvoices]
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        await apiRequest(`/invoices/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        loadInvoices();
      } catch (error) {
        alert('حدث خطأ أثناء تغيير الحالة');
      }
    },
    [loadInvoices]
  );

  const handleSend = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/invoices/${id}/send`, { method: 'POST' });
        alert('تم إرسال الفاتورة بنجاح');
        loadInvoices();
      } catch (error) {
        alert('حدث خطأ أثناء الإرسال');
      }
    },
    [loadInvoices]
  );

  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter((i) => i.state === 'draft').length;
    const unpaid = invoices.filter((i) => i.state === 'unpaid').length;
    const partial = invoices.filter((i) => i.state === 'partial').length;
    const paid = invoices.filter((i) => i.state === 'paid').length;
    const overdue = invoices.filter((i) => i.state === 'overdue').length;
    const purchases = invoices.filter((i) => i.kind === 'purchase').length;
    const totalAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const paidAmount = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    return [
      { label: 'إجمالي الفواتير', value: total, icon: FileText, color: 'bg-blue-50 text-blue-600' },
      { label: 'مسودة', value: draft, icon: FileText, color: 'bg-slate-50 text-slate-600' },
      {
        label: 'غير محصلة',
        value: unpaid + partial,
        icon: Clock,
        color: 'bg-amber-50 text-amber-600',
      },
      { label: 'مدفوعة', value: paid, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
      { label: 'متأخرة', value: overdue, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
      {
        label: 'فواتير شراء',
        value: purchases,
        icon: FileText,
        color: 'bg-orange-50 text-orange-600',
      },
      {
        label: 'إجمالي القيمة',
        value: `ج.م ${totalAmount.toLocaleString()}`,
        icon: DollarSign,
        color: 'bg-purple-50 text-purple-600',
      },
      {
        label: 'المدفوع',
        value: `ج.م ${paidAmount.toLocaleString()}`,
        icon: DollarSign,
        color: 'bg-green-50 text-green-600',
      },
    ];
  }, [invoices]);

  return (
    <div className={view === 'edit' ? 'p-4 sm:p-6 md:p-8 space-y-6' : 'space-y-6'}>
      {/* Header — عرض محرر الفاتورة فقط (صفحة الإدارة بتستخدم الهيكل الموحد) */}
      {view === 'edit' && (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <FileText size={24} className="text-[#00E5FF]" />
          </div>
          <div className="text-right flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الفواتير</h1>
              <button
                onClick={() => setGuideOpen(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="معلومات / Info"
              >
                <Info size={18} />
              </button>
            </div>
            <p className="text-sm font-bold text-slate-400 mt-1">إدارة فواتير العملاء</p>
          </div>
        </div>
      )}

      {/* Invoice Editor View */}
      {view === 'edit' && (
        <div className="space-y-6">
          {/* Editor Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('manage')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <ArrowRight size={18} className={isArabic ? 'rotate-180' : ''} />
              {isArabic ? 'عودة' : 'Back'}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={printInvoice}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
              >
                <Printer size={18} />
                {isArabic ? 'طباعة' : 'Print'}
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-all"
              >
                <FileDown size={18} />
                {isArabic ? 'تصدير PDF' : 'Export PDF'}
              </button>
              <button
                onClick={saveInvoice}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>

          {/* Save Status */}
          {saveError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
              {saveError}
            </div>
          )}
          {saveOk && (
            <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold">
              {saveOk}
            </div>
          )}

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {isArabic ? 'تاريخ الفاتورة' : 'Invoice Date'}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {isArabic ? 'الخصم' : 'Discount'}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {isArabic ? 'بنود الفاتورة' : 'Invoice Items'}
              </h3>
            </div>

            {/* Add New Line */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-5">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isArabic ? 'اسم الصنف' : 'Item name'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder={isArabic ? 'الكمية' : 'Qty'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder={isArabic ? 'السعر' : 'Price'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div className="col-span-4 md:col-span-2 flex gap-1">
                  <button
                    onClick={addLine}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${editLineId ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-[#00E5FF] text-slate-900 hover:bg-[#00B8CC]'}`}
                    title={
                      editLineId ? (isArabic ? 'تحديث' : 'Update') : isArabic ? 'إضافة' : 'Add'
                    }
                  >
                    {editLineId ? <Save size={18} /> : <Plus size={18} />}
                  </button>
                  {editLineId && (
                    <button
                      onClick={cancelEditLine}
                      className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center"
                      title={isArabic ? 'إلغاء' : 'Cancel'}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
              {editLineId && (
                <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                  {isArabic
                    ? 'وضع التعديل: سيتم تحديث البند المحدد'
                    : 'Edit mode: updating selected item'}
                </div>
              )}
            </div>

            {/* Lines List */}
            <div className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-sm">
                  {isArabic ? 'لا توجد بنود' : 'No items yet'}
                </div>
              ) : (
                lines.map((line, index) => (
                  <div
                    key={line.id}
                    className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-all ${editLineId === line.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                  >
                    <div className="flex-1 grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-5 font-medium text-slate-900">
                        {line.name}
                      </div>
                      <div className="col-span-4 md:col-span-2 text-sm text-slate-600">
                        {line.quantity}x
                      </div>
                      <div className="col-span-4 md:col-span-3 text-sm text-slate-600">
                        {formatMoney(line.price)}
                      </div>
                      <div className="col-span-4 md:col-span-2 font-bold text-slate-900">
                        {formatMoney(line.price * line.quantity)}
                      </div>
                    </div>
                    <button
                      onClick={() => editLine(line.id)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-all"
                      title={isArabic ? 'تعديل' : 'Edit'}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        removeLine(line.id);
                        if (editLineId === line.id) cancelEditLine();
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-all"
                      title={isArabic ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">
                  {isArabic ? 'المجموع الفرعي' : 'Subtotal'}
                </span>
                <span className="text-lg font-bold text-slate-900">{formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-600">
                    {isArabic ? 'الخصم' : 'Discount'}
                  </span>
                  <span className="text-lg font-bold text-red-600">-{formatMoney(discount)}</span>
                </div>
              )}
              {showVat && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-600">
                    {isArabic ? `ضريبة القيمة المضافة (${vatRatePct}%)` : `VAT (${vatRatePct}%)`}
                  </span>
                  <span className="text-lg font-bold text-slate-600">{formatMoney(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                <span className="text-lg font-bold text-slate-900">
                  {isArabic ? 'الإجمالي' : 'Total'}
                </span>
                <span className="text-2xl font-black text-[#BD00FF]">{formatMoney(total)}</span>
              </div>
            </div>
          </div>

          {/* VAT Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">
              {isArabic ? 'إعدادات الضريبة' : 'Tax Settings'}
            </h3>
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-slate-700">
                {isArabic ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Rate (%)'}
              </label>
              <input
                type="number"
                value={receiptTheme.vatRatePercent}
                onChange={(e) =>
                  setReceiptTheme({ ...receiptTheme, vatRatePercent: Number(e.target.value) || 0 })
                }
                min="0"
                max="100"
                step="0.1"
                className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Manage View — الهيكل الموحد (نفس تصميم المنتجات/الطلبات/الفئات) */}
      {view === 'manage' && (
        <InventoryPage
          title={isArabic ? 'الفواتير' : 'Invoices'}
          subtitle={
            <>
              {isArabic ? 'إدارة فواتير العملاء' : 'Manage customer invoices'} — {invoices.length}{' '}
              {isArabic ? 'فاتورة' : 'invoices'} • {isArabic ? 'إجمالي' : 'Total'} ج.م{' '}
              {formatMoney(invoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0))}
            </>
          }
          onInfo={() => setGuideOpen(true)}
          actions={
            <>
              <button
                onClick={exportCSV}
                className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5"
              >
                <Download size={14} />
                {isArabic ? 'تصدير CSV' : 'Export CSV'}
              </button>
              <button
                onClick={openNewInvoice}
                className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700"
              >
                <Plus size={14} />
                {isArabic ? 'فاتورة جديدة' : 'New Invoice'}
              </button>
            </>
          }
          tabs={[
            { id: 'all', label: isArabic ? 'الكل' : 'All', count: invoices.length },
            {
              id: 'sale',
              label: isArabic ? 'فواتير البيع' : 'Sales',
              count: invoices.filter((i) => i.kind === 'sale').length,
            },
            {
              id: 'purchase',
              label: isArabic ? 'فواتير الشراء' : 'Purchases',
              count: invoices.filter((i) => i.kind === 'purchase').length,
            },
            {
              id: 'draft',
              label: isArabic ? 'مسودة' : 'Draft',
              count: invoices.filter((i) => i.state === 'draft').length,
            },
            {
              id: 'unpaid',
              label: isArabic ? 'غير مدفوعة' : 'Unpaid',
              count: invoices.filter((i) => i.state === 'unpaid').length,
            },
            {
              id: 'partial',
              label: isArabic ? 'مدفوعة جزئيًا' : 'Partial',
              count: invoices.filter((i) => i.state === 'partial').length,
            },
            {
              id: 'paid',
              label: isArabic ? 'مدفوعة' : 'Paid',
              count: invoices.filter((i) => i.state === 'paid').length,
            },
            {
              id: 'overdue',
              label: isArabic ? 'متأخرة' : 'Overdue',
              count: invoices.filter((i) => i.state === 'overdue').length,
            },
            {
              id: 'cancelled',
              label: isArabic ? 'ملغاة' : 'Cancelled',
              count: invoices.filter((i) => i.state === 'cancelled').length,
            },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => {
            setFilterStatus(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            isArabic ? 'بحث برقم الفاتورة أو العميل…' : 'Search by invoice # or customer…'
          }
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="invoiceNumber">{isArabic ? 'رقم الفاتورة' : 'Invoice #'}</option>
                <option value="issueDate">{isArabic ? 'تاريخ الإصدار' : 'Issue date'}</option>
                <option value="totalAmount">{isArabic ? 'القيمة' : 'Amount'}</option>
                <option value="createdAt">{isArabic ? 'تاريخ الإنشاء' : 'Created'}</option>
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
              <FileText size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 font-bold text-sm">
                {isArabic ? 'لا توجد فواتير حالياً' : 'No invoices yet'}
              </p>
            </>
          }
          footer={
            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="فاتورة"
            />
          }
        >
          {selectedIds.size > 0 && (
            <div className="mb-3">
              <InvBulkBar>
                <span>
                  {selectedIds.size} {isArabic ? 'فاتورة محددة' : 'invoices selected'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={bulkSend}
                    className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    {isArabic ? 'إرسال' : 'Send'}
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="h-8 px-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    {isArabic ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </InvBulkBar>
            </div>
          )}

          <InvTableCard
            headerExtra={
              <div className="col-span-1 flex items-center">
                <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                  {selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 ? (
                    <Check size={16} className="text-[#00E5FF]" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                  )}
                </button>
              </div>
            }
            columns={[
              { label: isArabic ? 'رقم الفاتورة' : 'Invoice #', className: 'col-span-2' },
              { label: isArabic ? 'العميل / المورد' : 'Party', className: 'col-span-2' },
              { label: isArabic ? 'النوع' : 'Type', className: 'col-span-1' },
              { label: isArabic ? 'التاريخ' : 'Date', className: 'col-span-1' },
              { label: isArabic ? 'الإجمالي' : 'Total', className: 'col-span-2' },
              { label: isArabic ? 'المدفوع' : 'Paid', className: 'col-span-1' },
              { label: isArabic ? 'الحالة' : 'Status', className: 'col-span-1' },
              { label: isArabic ? 'إجراءات' : 'Actions', className: 'col-span-1' },
            ]}
          >
            {paginatedInvoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                isArabic={isArabic}
                selected={selectedIds.has(invoice.id)}
                onToggleSelect={toggleSelect}
                onEdit={openInvoiceForEdit}
                onSend={handleSend}
                onDelete={handleDelete}
              />
            ))}
          </InvTableCard>
        </InventoryPage>
      )}

      {/* Guide Modal */}
      {guideOpen && <InvoiceGuideModal onClose={() => setGuideOpen(false)} isArabic={isArabic} />}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <FinanceContent />
    </Suspense>
  );
}
