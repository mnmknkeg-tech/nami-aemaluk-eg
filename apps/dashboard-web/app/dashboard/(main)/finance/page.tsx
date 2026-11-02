'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Info,
  MoreVertical,
  DollarSign,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  Mail,
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
  InvRow,
  InvRowAction,
  InvPagination,
  InvBulkBar,
} from '@/components/inventory/InventoryShell';

type InvoiceLine = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type ReceiptTheme = {
  shopName: string;
  phone: string;
  city: string;
  address: string;
  logoDataUrl: string;
  footerNote: string;
  vatRatePercent: number;
};

type Invoice = {
  id: string;
  source: 'legacy' | 'acc';
  kind: 'sale' | 'purchase';
  /** الحالة الموحدة للتصفية — مشتقة من حالة النظام + المدفوع + الاستحقاق */
  state: 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

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

  const formatMoney = (v: any) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return '0.00';
    return n.toFixed(2);
  };

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
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [legacyRes, accRes] = await Promise.all([
        apiRequest(`/invoices/shop/${sid}`).catch(() => []),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => ({ data: [] })),
      ]);
      const legacy = Array.isArray(legacyRes) ? legacyRes : legacyRes?.data || [];
      const acc = Array.isArray(accRes) ? accRes : accRes?.data || [];

      const today = new Date().toISOString().split('T')[0];
      const deriveState = (
        rawStatus: string,
        kind: 'sale' | 'purchase',
        due: string,
        total: number,
        paid: number
      ): Invoice['state'] => {
        const s = String(rawStatus || '').toLowerCase();
        if (s === 'cancelled' || s === 'canceled') return 'cancelled';
        if (s === 'draft') return 'draft';
        if (s === 'paid') return 'paid';
        if (s === 'overdue') return 'overdue';
        // posted / sent / viewed / pending → اشتقاق من المدفوع والاستحقاق
        if (total > 0 && paid >= total - 0.005) return 'paid';
        if (total > 0 && paid > 0) return 'partial';
        if (due && due < today) return 'overdue';
        return 'unpaid';
      };

      const legacyMapped: Invoice[] = legacy.map((i: any) => {
        const rawStatus = String(i.status || 'draft').toLowerCase();
        const totalAmount = Number(i.totalAmount || i.total_amount || i.amount || 0);
        const paidAmount = Number(i.paidAmount || i.paid_amount || 0);
        const dueDate = i.dueDate || i.due_date || '';
        return {
          id: String(i.id),
          source: 'legacy' as const,
          kind: 'sale' as const,
          state: deriveState(rawStatus, 'sale', dueDate, totalAmount, paidAmount),
          invoiceNumber: i.invoiceNumber || i.invoice_number || '---',
          customerId: i.customerId || i.customer_id || '---',
          customerName: i.customerName || i.customer_name || '---',
          customerEmail: i.customerEmail || i.customer_email || '---',
          status: rawStatus,
          issueDate: i.issueDate || i.issue_date || i.createdAt || new Date().toISOString(),
          dueDate,
          paidDate: i.paidDate || i.paid_date || null,
          subtotal: Number(i.subtotal || 0),
          taxAmount: Number(i.taxAmount || i.tax_amount || 0),
          discountAmount: Number(i.discountAmount || i.discount_amount || 0),
          totalAmount,
          paidAmount,
          notes: i.notes || '',
          createdBy: i.createdBy || i.created_by || '---',
          createdAt: i.createdAt || new Date().toISOString(),
          updatedAt: i.updatedAt || new Date().toISOString(),
        };
      });

      // فواتير المحاسبة — تدعم البيع والشراء وتتغذى من المشتريات
      const accMapped: Invoice[] = acc
        .filter((i: any) => {
          const t = String(i.invoice_type || i.invoiceType || 'sale').toLowerCase();
          return t === 'sale' || t === 'purchase';
        })
        .map((i: any) => {
          const kind =
            String(i.invoice_type || i.invoiceType || 'sale').toLowerCase() === 'purchase'
              ? ('purchase' as const)
              : ('sale' as const);
          const rawStatus = String(i.status || 'draft').toLowerCase();
          const totalAmount = Number(i.total_amount || i.totalAmount || i.total || 0);
          const paidAmount = Number(i.paid_amount || i.paidAmount || i.paid || 0);
          const dueDate = i.due_date || i.dueDate || '';
          return {
            id: `acc-${String(i.id)}`,
            source: 'acc' as const,
            kind,
            state: deriveState(rawStatus, kind, dueDate, totalAmount, paidAmount),
            invoiceNumber: i.number || i.invoice_number || '---',
            customerId: i.entity_id || i.entityId || '---',
            customerName: i.entity_name || i.entityName || (kind === 'purchase' ? 'مورد' : 'عميل'),
            customerEmail: i.entity_email || '',
            status: rawStatus,
            issueDate: i.invoice_date || i.invoiceDate || i.created_at || new Date().toISOString(),
            dueDate,
            paidDate: null,
            subtotal: totalAmount,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount,
            paidAmount,
            notes: '',
            createdBy: '---',
            createdAt: i.created_at || new Date().toISOString(),
            updatedAt: i.updated_at || i.created_at || new Date().toISOString(),
          };
        });

      setInvoices([...legacyMapped, ...accMapped]);
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
    const escapeHtml = (v: any) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

    const linesHtml = lines
      .map(
        (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(l.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price * l.quantity)}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!doctype html>
    <html dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8"/>
      <title>${escapeHtml(receiptTheme.shopName || 'Invoice')}</title>
      <style>
        @page { margin: 10mm; size: A4; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f5f5f5;
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #BD00FF;
        }
        .logo img { max-height: 60px; max-width: 200px; }
        .shop-info h1 { margin: 0; color: #BD00FF; font-size: 24px; }
        .shop-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        .meta-item { flex: 1; }
        .meta-label { font-weight: bold; color: #333; font-size: 12px; }
        .meta-value { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { 
          background: #BD00FF; 
          color: white; 
          padding: 12px; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          font-weight: bold;
        }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals {
          margin-top: 20px;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .total-row.final {
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #BD00FF;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #BD00FF;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        @media print {
          body { background: white; }
          .invoice-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">
            ${receiptTheme.logoDataUrl ? `<img src="${escapeHtml(receiptTheme.logoDataUrl)}" alt="Logo">` : ''}
          </div>
          <div class="shop-info">
            <h1>${escapeHtml(receiptTheme.shopName || 'Shop Name')}</h1>
            <p>${escapeHtml(receiptTheme.address || '')}</p>
            <p>${escapeHtml(receiptTheme.city || '')} | ${escapeHtml(receiptTheme.phone || '')}</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</div>
            <div class="meta-value">${escapeHtml(selectedInvoiceId || 'NEW')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'التاريخ' : 'Date'}</div>
            <div class="meta-value">${escapeHtml(invoiceDate)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'الصنف' : 'Item'}</th>
              <th style="text-align: center;">${isArabic ? 'الكمية' : 'Qty'}</th>
              <th style="text-align: right;">${isArabic ? 'السعر' : 'Price'}</th>
              <th style="text-align: right;">${isArabic ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>${isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>${fmt(subtotal)}</span>
          </div>
          ${
            discount > 0
              ? `
          <div class="total-row">
            <span>${isArabic ? 'الخصم' : 'Discount'}</span>
            <span>-${fmt(discount)}</span>
          </div>
          `
              : ''
          }
          ${
            showVat
              ? `
          <div class="total-row">
            <span>${isArabic ? `ضريبة القيمة المضافة (${vatRatePct}%)` : `VAT (${vatRatePct}%)`}</span>
            <span>${fmt(vatAmount)}</span>
          </div>
          `
              : ''
          }
          <div class="total-row final">
            <span>${isArabic ? 'الإجمالي' : 'Total'}</span>
            <span>${fmt(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${escapeHtml(receiptTheme.footerNote || '')}</p>
          <p>${isArabic ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      const w = window.open('', '_blank', 'width=800,height=1000');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch {}
      }, 500);
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  // PDF Export via iframe
  const exportPDF = () => {
    const escapeHtml = (v: any) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

    const linesHtml = lines
      .map(
        (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(l.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price * l.quantity)}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!doctype html>
    <html dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8"/>
      <title>${escapeHtml(receiptTheme.shopName || 'Invoice')}</title>
      <style>
        @page { margin: 10mm; size: A4; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #BD00FF;
        }
        .logo img { max-height: 60px; max-width: 200px; }
        .shop-info h1 { margin: 0; color: #BD00FF; font-size: 24px; }
        .shop-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        .meta-item { flex: 1; }
        .meta-label { font-weight: bold; color: #333; font-size: 12px; }
        .meta-value { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { 
          background: #BD00FF; 
          color: white; 
          padding: 12px; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          font-weight: bold;
        }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals {
          margin-top: 20px;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .total-row.final {
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #BD00FF;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #BD00FF;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">
            ${receiptTheme.logoDataUrl ? `<img src="${escapeHtml(receiptTheme.logoDataUrl)}" alt="Logo">` : ''}
          </div>
          <div class="shop-info">
            <h1>${escapeHtml(receiptTheme.shopName || 'Shop Name')}</h1>
            <p>${escapeHtml(receiptTheme.address || '')}</p>
            <p>${escapeHtml(receiptTheme.city || '')} | ${escapeHtml(receiptTheme.phone || '')}</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</div>
            <div class="meta-value">${escapeHtml(selectedInvoiceId || 'NEW')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'التاريخ' : 'Date'}</div>
            <div class="meta-value">${escapeHtml(invoiceDate)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'الصنف' : 'Item'}</th>
              <th style="text-align: center;">${isArabic ? 'الكمية' : 'Qty'}</th>
              <th style="text-align: right;">${isArabic ? 'السعر' : 'Price'}</th>
              <th style="text-align: right;">${isArabic ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>${isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>${fmt(subtotal)}</span>
          </div>
          ${
            discount > 0
              ? `
          <div class="total-row">
            <span>${isArabic ? 'الخصم' : 'Discount'}</span>
            <span>-${fmt(discount)}</span>
          </div>
          `
              : ''
          }
          ${
            showVat
              ? `
          <div class="total-row">
            <span>${isArabic ? `ضريبة القيمة المضافة (${vatRatePct}%)` : `VAT (${vatRatePct}%)`}</span>
            <span>${fmt(vatAmount)}</span>
          </div>
          `
              : ''
          }
          <div class="total-row final">
            <span>${isArabic ? 'الإجمالي' : 'Total'}</span>
            <span>${fmt(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${escapeHtml(receiptTheme.footerNote || '')}</p>
          <p>${isArabic ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('PDF export error:', e);
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (e) {
      console.error('PDF export error:', e);
    }
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

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'مسودة', color: 'bg-slate-50 text-slate-600', icon: <FileText size={12} /> },
    unpaid: { label: 'غير مدفوعة', color: 'bg-blue-50 text-blue-600', icon: <Clock size={12} /> },
    partial: {
      label: 'مدفوعة جزئيًا',
      color: 'bg-amber-50 text-amber-600',
      icon: <AlertTriangle size={12} />,
    },
    sent: { label: 'مرسلة', color: 'bg-blue-50 text-blue-600', icon: <Send size={12} /> },
    viewed: { label: 'تمت المشاهدة', color: 'bg-cyan-50 text-cyan-600', icon: <Eye size={12} /> },
    paid: {
      label: 'مدفوعة',
      color: 'bg-green-50 text-green-600',
      icon: <CheckCircle2 size={12} />,
    },
    overdue: {
      label: 'متأخرة',
      color: 'bg-red-50 text-red-700',
      icon: <AlertTriangle size={12} />,
    },
    cancelled: { label: 'ملغاة', color: 'bg-red-50 text-red-600', icon: <XCircle size={12} /> },
  };

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
            {paginatedInvoices.map((invoice) => {
              const statusConfig =
                STATUS_CONFIG[invoice.state] ||
                STATUS_CONFIG[invoice.status] ||
                STATUS_CONFIG.draft;
              const remaining = Math.max(invoice.totalAmount - invoice.paidAmount, 0);
              const canPay =
                invoice.state === 'unpaid' ||
                invoice.state === 'partial' ||
                invoice.state === 'overdue';
              return (
                <InvRow
                  key={invoice.id}
                  muted={invoice.state === 'draft' || invoice.state === 'cancelled'}
                >
                  <div className="col-span-1 flex items-center">
                    <button onClick={() => toggleSelect(invoice.id)} className="p-1">
                      {selectedIds.has(invoice.id) ? (
                        <Check size={16} className="text-[#00E5FF]" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">
                      {invoice.invoiceNumber}
                    </div>
                    {invoice.source === 'acc' && (
                      <div className="text-[10px] text-slate-400 font-bold">مستند محاسبي</div>
                    )}
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="text-slate-600 text-sm truncate">
                      {invoice.customerName || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {invoice.customerEmail}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        invoice.kind === 'purchase'
                          ? 'text-amber-600 bg-amber-50 border-amber-200'
                          : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {invoice.kind === 'purchase' ? 'شراء' : 'بيع'}
                    </span>
                  </div>
                  <div className="col-span-1 text-slate-600 text-sm">
                    {invoice.issueDate
                      ? new Date(invoice.issueDate).toLocaleDateString('ar-EG')
                      : '—'}
                  </div>
                  <div className="col-span-2">
                    <div className="font-bold text-slate-900 text-sm">
                      ج.م {formatMoney(invoice.totalAmount)}
                    </div>
                    {remaining > 0 && invoice.state !== 'draft' && (
                      <div className="text-[11px] text-rose-500 font-bold">
                        متبقي ج.م {formatMoney(remaining)}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 text-slate-600 text-sm">
                    ج.م {formatMoney(invoice.paidAmount)}
                  </div>
                  <div className="col-span-1">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1.5">
                    {invoice.source === 'legacy' ? (
                      <>
                        <InvRowAction
                          onClick={() => openInvoiceForEdit(invoice.id)}
                          title={isArabic ? 'تعديل' : 'Edit'}
                        >
                          <Edit size={14} />
                        </InvRowAction>
                        <InvRowAction
                          onClick={() => handleSend(invoice.id)}
                          title={isArabic ? 'إرسال' : 'Send'}
                        >
                          <Send size={14} />
                        </InvRowAction>
                        <InvRowAction
                          onClick={() => handleDelete(invoice.id)}
                          title={isArabic ? 'حذف' : 'Delete'}
                          danger
                        >
                          <Trash2 size={14} />
                        </InvRowAction>
                      </>
                    ) : (
                      <a
                        href="/dashboard/finance/collections"
                        title={isArabic ? 'المدفوعات وكشف الحساب' : 'Payments & statement'}
                        className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <DollarSign size={14} />
                      </a>
                    )}
                    {canPay && invoice.source === 'legacy' && (
                      <a
                        href="/dashboard/finance/collections"
                        title={isArabic ? 'تسجيل دفعة' : 'Record payment'}
                        className="h-8 px-2.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center hover:bg-emerald-100 transition-colors"
                      >
                        دفعة
                      </a>
                    )}
                  </div>
                </InvRow>
              );
            })}
          </InvTableCard>
        </InventoryPage>
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
              <h2 className="text-xl font-black text-slate-900">
                {isArabic ? 'دليل الفواتير' : 'Invoice Guide'}
              </h2>
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
                  <h3 className="font-bold text-slate-900">
                    {isArabic ? 'وظيفة الصفحة' : 'Page Function'}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {isArabic
                    ? 'إدارة فواتير العملاء وتتبع المدفوعات مع محرر بنود كامل.'
                    : 'Manage customer invoices and track payments with full line item editor.'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">{isArabic ? 'الميزات' : 'Features'}</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>
                    •{' '}
                    {isArabic
                      ? 'إنشاء فواتير جديدة مع محرر بنود كامل'
                      : 'Create new invoices with full line item editor'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'إدارة البنود (إضافة/حذف/تعديل)'
                      : 'Manage line items (add/delete/edit)'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'حسابات تلقائية (المجموع، الخصم، الضريبة، الإجمالي)'
                      : 'Automatic calculations (subtotal, discount, tax, total)'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'طباعة احترافية مع تصميم HTML جميل'
                      : 'Professional printing with beautiful HTML design'}
                  </li>
                  <li>• {isArabic ? 'تصدير PDF عبر iframe' : 'PDF export via iframe'}</li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'دعم RTL كامل للعربية والإنجليزية'
                      : 'Full RTL support for Arabic and English'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'ضريبة القيمة المضافة (VAT) مع نسبة مئوية قابلة للتعديل'
                      : 'VAT with adjustable percentage'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'تصميم الإيصال مع Receipt Theme'
                      : 'Receipt design with Receipt Theme'}
                  </li>
                  <li>
                    •{' '}
                    {isArabic
                      ? 'تتبع الحالة (مسودة، مرسلة، مدفوعة، متأخرة)'
                      : 'Status tracking (draft, sent, paid, overdue)'}
                  </li>
                  <li>
                    • {isArabic ? 'إحصائيات شاملة للفواتير' : 'Comprehensive invoice statistics'}
                  </li>
                  <li>• {isArabic ? 'تصدير تقارير الفواتير' : 'Export invoice reports'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
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
