'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Package2,
  Printer,
  ReceiptText,
  X,
  Info,
  Target,
  BookOpen,
  Zap,
  Link2,
  ClipboardList,
  Plus,
  Minus,
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Truck,
  MessageCircle,
  Columns3,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import ExportMenu from '@/components/common/ExportMenu';
import { fetchMyOrders } from '@/lib/api/orders';
import {
  formatOrderItemsSummary,
  getDeliveryAddress,
  renderDeliveryFee,
  hasLocationData,
  isDeliveryDisabledOrder,
} from '@/lib/sales-utils';
import { useShop } from '@/hooks/useShop';
import { PrintPreviewModal, parseOrderNotes } from '@/components/sales/print-utils';
import { printHtmlReceipt, buildReturnReceiptHtml } from '@/lib/print-receipt';
import OrderReturnsPanel from '@/components/sales/OrderReturnsPanel';

type Order = {
  id: string;
  status: string;
  total: number;
  items?: any[];
  createdAt?: string;
  created_at?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  deliveryAddress?: string;
  delivery_address?: string;
  deliveryAddressManual?: string;
  delivery_address_manual?: string;
  customerNote?: string;
  customer_note?: string;
  notes?: string;
  user?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  phone?: string;
  source?: string;
  paymentMethod?: string;
};

type FilterType =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'handed_to_courier'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'refunded'
  | 'successful';

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: {
    label: 'بانتظار التأكيد',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'مؤكد',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  PREPARING: {
    label: 'قيد التجهيز',
    cls: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-600',
  },
  READY: { label: 'جاهز', cls: 'bg-teal-50 text-teal-800 border-teal-200', dot: 'bg-teal-600' },
  HANDED_TO_COURIER: {
    label: 'مع المندوب',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  OUT_FOR_DELIVERY: {
    label: 'خارج للتوصيل',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  DELIVERED: {
    label: 'تم التسليم',
    cls: 'bg-green-50 text-green-800 border-green-200',
    dot: 'bg-green-600',
  },
  CANCELLED: {
    label: 'ملغي',
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
  },
  REJECTED: { label: 'مرفوض', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  REFUNDED: {
    label: 'مرتجع',
    cls: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
};

// الحالات اللي يسمح فيها بعمل مرتجع (كامل أو جزئي)
const RETURNABLE_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'HANDED_TO_COURIER', 'DELIVERED'];

const RESTAURANT_FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'successful', label: 'ناجح' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'preparing', label: 'قيد التجهيز' },
  { id: 'ready', label: 'جاهز للتقديم' },
  { id: 'handed_to_courier', label: 'سُلّم للمندوب' },
  { id: 'delivered', label: 'تم التوصيل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'rejected', label: 'مرفوض' },
  { id: 'refunded', label: 'مسترجع' },
];

const RETAIL_FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'successful', label: 'ناجح' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'preparing', label: 'قيد التجهيز' },
  { id: 'ready', label: 'جاهز' },
  { id: 'out_for_delivery', label: 'خرج للتوصيل' },
  { id: 'delivered', label: 'تم التوصيل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'rejected', label: 'مرفوض' },
  { id: 'refunded', label: 'مسترجع' },
];

function formatItemsSummary(order: Order): string {
  return formatOrderItemsSummary(order, undefined, true) || '-';
}

export default function SalesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [updatingId, setUpdatingId] = useState('');
  const [openMenuId, setOpenMenuId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
  });
  const [creating, setCreating] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Advanced filters
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [amountRange, setAmountRange] = useState<'all' | 'under100' | '100to500' | 'over500'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // تخصيص الأعمدة — محفوظ في المتصفح
  const COL_DEFS: Array<{ key: string; label: string }> = [
    { key: 'order', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل' },
    { key: 'items', label: 'الأصناف' },
    { key: 'status', label: 'الحالة' },
    { key: 'delivery', label: 'التوصيل' },
    { key: 'total', label: 'الإجمالي' },
    { key: 'quick', label: 'إجراء سريع' },
  ];
  const ALL_COLS = {
    order: true,
    customer: true,
    items: true,
    status: true,
    delivery: true,
    total: true,
    quick: true,
  };
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return ALL_COLS;
    try {
      const saved = JSON.parse(localStorage.getItem('ray_sales_cols') || 'null');
      if (saved && typeof saved === 'object') return { ...ALL_COLS, ...saved };
    } catch {
      /* defaults */
    }
    return ALL_COLS;
  });
  const [colsOpen, setColsOpen] = useState(false);
  const [colsDraft, setColsDraft] = useState<Record<string, boolean>>(visibleCols);
  const showCol = (k: string) => visibleCols[k] !== false;
  const saveCols = useCallback(() => {
    setVisibleCols(colsDraft);
    try {
      localStorage.setItem('ray_sales_cols', JSON.stringify(colsDraft));
    } catch {
      /* ignore */
    }
    setColsOpen(false);
  }, [colsDraft]);
  const resetCols = useCallback(() => {
    setColsDraft(ALL_COLS);
    setVisibleCols(ALL_COLS);
    try {
      localStorage.setItem('ray_sales_cols', JSON.stringify(ALL_COLS));
    } catch {
      /* ignore */
    }
  }, []);

  // صف مُوسَّع — سهم التفاصيل
  const [expandedId, setExpandedId] = useState('');

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';

  // Print preview state — the preview modal shows the exact print output and
  // lets the merchant fix customer details before printing.
  const [printPreview, setPrintPreview] = useState<{
    order: Order;
    mode: 'invoice' | 'waybill';
  } | null>(null);
  const printInvoice = useCallback(
    (order: Order) => setPrintPreview({ order, mode: 'invoice' }),
    []
  );
  const printWaybill = useCallback(
    (order: Order) => setPrintPreview({ order, mode: 'waybill' }),
    []
  );

  // ===== المرتجع (كامل / جزئي) — المنطق مُنقول من صفحة مرتجعات الكاشير =====
  const [returnModal, setReturnModal] = useState<Order | null>(null);
  const [returnMode, setReturnMode] = useState<'full' | 'partial'>('full');
  const [returnSelection, setReturnSelection] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnToStock, setReturnToStock] = useState(true);
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState('');

  const openReturnModal = useCallback((order: Order) => {
    const init: Record<string, number> = {};
    (Array.isArray(order.items) ? order.items : []).forEach((it: any, idx: number) => {
      const key = String(it?.id || it?.productId || `item_${idx}`);
      init[key] = 0;
    });
    setReturnSelection(init);
    setReturnMode('full');
    setReturnReason('');
    setReturnToStock(true);
    setReturnError('');
    setReturnModal(order);
  }, []);

  const adjustReturnQty = (key: string, delta: number, max: number) => {
    setReturnSelection((prev) => {
      const cur = Number(prev[key] || 0);
      const next = Math.max(0, Math.min(max, cur + delta));
      return { ...prev, [key]: next };
    });
  };

  const setReturnQty = (key: string, value: number, max: number) => {
    const v = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
    setReturnSelection((prev) => ({ ...prev, [key]: v }));
  };

  const returnModalItems = useMemo<
    Array<{ item: any; key: string; returnQty: number; lineTotal: number }>
  >(() => {
    if (!returnModal) return [];
    return (Array.isArray(returnModal.items) ? returnModal.items : [])
      .map((it: any, idx: number) => {
        const key = String(it?.id || it?.productId || `item_${idx}`);
        const qty = Number(returnSelection[key] || 0);
        const unit = Number(it?.price ?? it?.unitPrice ?? 0);
        return { item: it, key, returnQty: qty, lineTotal: unit * qty };
      })
      .filter((x: { returnQty: number }) => x.returnQty > 0);
  }, [returnModal, returnSelection]);

  const partialRefundAmount = useMemo(
    () => returnModalItems.reduce((s: number, x) => s + x.lineTotal, 0),
    [returnModalItems]
  );

  const processReturn = async () => {
    if (!returnModal?.id || !shop?.id) return;
    const orderId = String(returnModal.id);
    setReturnProcessing(true);
    setReturnError('');

    try {
      if (returnMode === 'full') {
        // مرتجع كامل — تحديث حالة الطلب إلى RETURNED
        await apiRequest(`/shops/${shop.id}/orders/${orderId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'RETURNED' }),
        });
      } else {
        // مرتجع جزئي عبر endpoint المرتجعات
        if (returnModalItems.length === 0) {
          setReturnError('اختر كمية مرتجع لعنصر واحد على الأقل');
          setReturnProcessing(false);
          return;
        }
        const items = returnModalItems.map((x: { item: any; returnQty: number }) => ({
          productId: String(x.item?.productId || x.item?.id || ''),
          name: String(x.item?.name || x.item?.productName || x.item?.product?.name || ''),
          quantity: x.returnQty,
          price: Number(x.item?.price ?? x.item?.unitPrice ?? 0),
        }));
        try {
          await apiRequest(`/shops/${shop.id}/orders/${orderId}/returns`, {
            method: 'POST',
            body: JSON.stringify({
              items,
              reason: returnReason || undefined,
              returnToStock,
              totalAmount: partialRefundAmount,
            }),
          });
        } catch {
          // Fallback: لو endpoint المرتجعات غير متاح، علّم الطلب كله كمرتجع
          await apiRequest(`/shops/${shop.id}/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'RETURNED', note: `partial:${partialRefundAmount}` }),
          });
        }
      }
      setOrders((prev) =>
        prev.map((o) => (String(o.id) === orderId ? { ...o, status: 'RETURNED' } : o))
      );
      // إشعار مرتجع — طباعة تلقائية بعد نجاح المرتجع (كامل أو جزئي)
      try {
        const isFull = returnMode === 'full';
        const rcptItems = isFull
          ? (Array.isArray(returnModal.items) ? returnModal.items : []).map((it: any) => {
              const qty = Number(it?.quantity || 0);
              const price = Number(it?.price ?? it?.unitPrice ?? 0);
              return {
                name: String(
                  it?.name || it?.productName || it?.product?.name || it?.productId || ''
                ),
                qty,
                amount: price * qty,
              };
            })
          : returnModalItems.map((x: { item: any; returnQty: number; lineTotal: number }) => ({
              name: String(
                x.item?.name ||
                  x.item?.productName ||
                  x.item?.product?.name ||
                  x.item?.productId ||
                  ''
              ),
              qty: x.returnQty,
              amount: x.lineTotal,
            }));
        printHtmlReceipt(
          buildReturnReceiptHtml({
            shopName: String(shop?.name || ''),
            orderNo: orderId,
            items: rcptItems,
            total: isFull ? Number(returnModal.total || 0) : Number(partialRefundAmount.toFixed(2)),
            reason: returnReason.trim() || undefined,
          })
        );
      } catch {}
      setReturnModal(null);
      setReturnSuccess('تم عمل المرتجع بنجاح');
      try {
        window.dispatchEvent(new Event('orders-updated'));
      } catch {}
      setTimeout(() => setReturnSuccess(''), 5000);
    } catch (err: any) {
      setReturnError(err?.message || 'فشل المرتجع');
    } finally {
      setReturnProcessing(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { orders } = await fetchMyOrders({ limit: 200 });
      let allOrders = (Array.isArray(orders) ? orders : []) as Order[];

      // Load local merchant orders placed from the standalone website cart
      if (typeof window !== 'undefined') {
        try {
          const shopId = shop?.id;
          const localKeys = shopId
            ? [`ray_merchant_orders_${shopId}`]
            : Object.keys(localStorage).filter((k) => k.startsWith('ray_merchant_orders_'));

          const localOrders: any[] = [];
          for (const k of localKeys) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) localOrders.push(...parsed);
            }
          }

          const existingIds = new Set(allOrders.map((o) => o.id));
          const newLocal = localOrders.filter((lo: any) => lo?.id && !existingIds.has(lo.id));
          allOrders = [...newLocal, ...allOrders];
        } catch {}
      }

      setOrders(allOrders);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    fetchOrders();
    const handleUpdate = () => fetchOrders();
    window.addEventListener('orders-updated', handleUpdate);
    window.addEventListener('ray_new_website_order', handleUpdate);
    return () => {
      window.removeEventListener('orders-updated', handleUpdate);
      window.removeEventListener('ray_new_website_order', handleUpdate);
    };
  }, [fetchOrders]);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      setUpdatingId(id);
      setOpenMenuId('');
      try {
        const upper = String(status || '').toUpperCase();
        const payload = upper === 'HANDED_TO_COURIER' ? { handedToCourier: true } : { status };
        await apiRequest(`/orders/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (upper === 'CANCELLED') {
          setOrders((prev) => prev.filter((o) => String(o.id) !== String(id)));
          if (selectedOrder?.id === id) setSelectedOrder(null);
        } else {
          setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: upper } : o)));
          if (selectedOrder?.id === id) {
            setSelectedOrder((prev) => (prev ? { ...prev, status: upper } : prev));
          }
        }
        try {
          window.dispatchEvent(new Event('orders-updated'));
        } catch {}
      } catch (err: any) {
        setError(err?.message || 'فشل تحديث الحالة');
      } finally {
        setUpdatingId('');
      }
    },
    [selectedOrder]
  );

  const createOrder = useCallback(async () => {
    if (!createFormData.customerName.trim() && !createFormData.customerPhone.trim()) {
      setError('أدخل اسم العميل أو رقم الهاتف على الأقل');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setError('لم يتم العثور على المتجر');
        return;
      }
      await apiRequest(`/shops/${sid}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          customerName: createFormData.customerName.trim(),
          customerPhone: createFormData.customerPhone.trim(),
          deliveryAddress: createFormData.customerAddress.trim() || undefined,
          items: [],
          total: 0,
          status: 'PENDING',
          source: 'manual',
        }),
      });
      setShowCreateModal(false);
      setCreateFormData({ customerName: '', customerPhone: '', customerAddress: '' });
      await fetchOrders();
      try {
        window.dispatchEvent(new Event('orders-updated'));
      } catch {}
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء الطلب');
    } finally {
      setCreating(false);
    }
  }, [createFormData, fetchOrders]);

  const isSuccessful = (o: Order) => {
    const s = String(o?.status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'PREPARING' || s === 'READY' || s === 'DELIVERED';
  };

  const isRejected = (o: Order) => String(o?.status || '').toUpperCase() === 'CANCELLED';
  const isPending = (o: Order) => String(o?.status || '').toUpperCase() === 'PENDING';

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (filter === 'successful') result = result.filter(isSuccessful);
    else if (filter === 'rejected') result = result.filter(isRejected);
    else if (filter === 'pending') result = result.filter(isPending);
    else if (filter === 'handed_to_courier')
      result = result.filter((o) => String(o.status || '').toUpperCase() === 'HANDED_TO_COURIER');
    else if (filter === 'out_for_delivery')
      result = result.filter((o) =>
        ['OUT_FOR_DELIVERY', 'HANDED_TO_COURIER'].includes(String(o.status || '').toUpperCase())
      );
    else if (filter === 'refunded')
      result = result.filter((o) => String(o.status || '').toUpperCase() === 'REFUNDED');
    else if (filter !== 'all')
      result = result.filter((o) => String(o.status || '').toUpperCase() === filter.toUpperCase());

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      result = result.filter((o) => {
        const date = new Date(o.createdAt || o.created_at || Date.now());
        return date.toDateString() === now.toDateString();
      });
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((o) => new Date(o.createdAt || o.created_at || Date.now()) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(
        (o) => new Date(o.createdAt || o.created_at || Date.now()) >= monthAgo
      );
    }

    // Amount range filter
    if (amountRange === 'under100') {
      result = result.filter((o) => Number(o.total || 0) < 100);
    } else if (amountRange === '100to500') {
      result = result.filter((o) => Number(o.total || 0) >= 100 && Number(o.total || 0) <= 500);
    } else if (amountRange === 'over500') {
      result = result.filter((o) => Number(o.total || 0) > 500);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          (o.customerName || o.customer_name || o.user?.name || '').toLowerCase().includes(q) ||
          (o.customerPhone || o.customer_phone || o.user?.phone || o.phone || '').includes(q) ||
          String(o.id || '')
            .toLowerCase()
            .includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison =
          new Date(a.createdAt || a.created_at || 0).getTime() -
          new Date(b.createdAt || b.created_at || 0).getTime();
      } else if (sortBy === 'amount') {
        comparison = Number(a.total || 0) - Number(b.total || 0);
      } else if (sortBy === 'status') {
        comparison = String(a.status || '').localeCompare(String(b.status || ''));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [orders, filter, dateRange, amountRange, searchQuery, sortBy, sortOrder]);

  // Pagination
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => String(o.status).toUpperCase() === 'PENDING').length;
    const confirmed = orders.filter((o) => String(o.status).toUpperCase() === 'CONFIRMED').length;
    const delivered = orders.filter((o) => String(o.status).toUpperCase() === 'DELIVERED').length;
    const ready = orders.filter((o) => String(o.status).toUpperCase() === 'READY').length;
    const preparing = orders.filter((o) => String(o.status).toUpperCase() === 'PREPARING').length;
    const handedToCourier = orders.filter(
      (o) => String(o.status).toUpperCase() === 'HANDED_TO_COURIER'
    ).length;
    const outForDelivery = orders.filter((o) =>
      ['OUT_FOR_DELIVERY', 'HANDED_TO_COURIER'].includes(String(o.status).toUpperCase())
    ).length;
    const successful = orders.filter(isSuccessful).length;
    const rejected = orders.filter(isRejected).length;
    const cancelled = orders.filter((o) => String(o.status).toUpperCase() === 'CANCELLED').length;
    const refunded = orders.filter((o) => String(o.status).toUpperCase() === 'REFUNDED').length;
    const revenue = orders
      .filter((o) =>
        ['DELIVERED', 'CONFIRMED', 'PREPARING', 'READY'].includes(String(o.status).toUpperCase())
      )
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgOrder = total > 0 ? Math.round(revenue / total) : 0;
    return {
      total,
      pending,
      confirmed,
      delivered,
      ready,
      preparing,
      handedToCourier,
      outForDelivery,
      successful,
      rejected,
      cancelled,
      refunded,
      revenue,
      avgOrder,
    };
  }, [orders]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedOrders.map((o) => String(o.id))));
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

  const bulkAction = useCallback(
    async (action: 'confirm' | 'reject' | 'cancel') => {
      setUpdatingId('bulk');
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            apiRequest(`/orders/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                status:
                  action === 'confirm'
                    ? 'CONFIRMED'
                    : action === 'reject'
                      ? 'CANCELLED'
                      : 'CANCELLED',
              }),
            })
          )
        );
        await fetchOrders();
        setSelectedIds(new Set());
      } catch (err: any) {
        setError(err?.message || 'فشل الإجراء الجماعي');
      } finally {
        setUpdatingId('');
      }
    },
    [selectedIds, fetchOrders]
  );

  const exportRows = useMemo(
    () =>
      filteredOrders.map((o) => [
        o.id,
        o.customerName || o.customer_name || o.user?.name || '',
        o.customerPhone || o.customer_phone || o.user?.phone || '',
        o.status,
        o.total,
        new Date(o.createdAt || o.created_at || Date.now()).toLocaleString('ar-EG'),
      ]),
    [filteredOrders]
  );

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر بسيط: عنوان + وصف — الإجراءات في الطرف المقابل */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">قائمة الطلبات</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              جميع طلبات متجرك هنا
              {stats.pending > 0 && (
                <span className="text-amber-600 font-semibold">
                  {' '}
                  — {stats.pending} بانتظار التأكيد
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              filename="الطلبات"
              headers={['رقم الطلب', 'العميل', 'الهاتف', 'الحالة', 'المبلغ', 'التاريخ']}
              rows={exportRows}
              sheetName="الطلبات"
              disabled={exportRows.length === 0}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700"
            >
              إنشاء طلب
            </button>
          </div>
        </div>
      </div>

      {/* رسالة نجاح المرتجع */}
      {returnSuccess && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-[12px] font-bold">
            <CheckCircle2 size={15} />
            {returnSuccess}
          </div>
        </div>
      )}

      {/* شريط التشغيل: التابات فوق — البحث والفلاتر تحت */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          {/* تبويبات الحالة — نصية بلا مربعات */}
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
            {(isRestaurant ? RESTAURANT_FILTERS : RETAIL_FILTERS).map((f) => {
              const isActive = filter === f.id;
              const count =
                f.id === 'all'
                  ? stats.total
                  : f.id === 'successful'
                    ? stats.successful
                    : f.id === 'rejected'
                      ? stats.rejected
                      : f.id === 'pending'
                        ? stats.pending
                        : f.id === 'confirmed'
                          ? stats.confirmed
                          : f.id === 'preparing'
                            ? stats.preparing
                            : f.id === 'ready'
                              ? stats.ready
                              : f.id === 'handed_to_courier'
                                ? stats.handedToCourier
                                : f.id === 'out_for_delivery'
                                  ? stats.outForDelivery
                                  : f.id === 'delivered'
                                    ? stats.delivered
                                    : f.id === 'cancelled'
                                      ? stats.cancelled
                                      : f.id === 'refunded'
                                        ? stats.refunded
                                        : 0;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id);
                    setCurrentPage(1);
                  }}
                  className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                      isActive ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* بحث + فلاتر */}
          <div className="px-3 sm:px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="دوّر برقم الطلب، اسم العميل، أو رقم الموبايل…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="all">كل الفترات</option>
                <option value="today">النهاردة</option>
                <option value="week">آخر ٧ أيام</option>
                <option value="month">آخر ٣٠ يوم</option>
              </select>
              <select
                value={amountRange}
                onChange={(e) => setAmountRange(e.target.value as any)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="all">كل المبالغ</option>
                <option value="under100">أقل من ١٠٠ ج.م</option>
                <option value="100to500">١٠٠ – ٥٠٠ ج.م</option>
                <option value="over500">أكتر من ٥٠٠ ج.م</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="hidden md:block h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="date">الأحدث أولاً</option>
                <option value="amount">الأعلى قيمة</option>
                <option value="status">حسب الحالة</option>
              </select>
              <div className="relative">
                <button
                  onClick={() => {
                    setColsDraft(visibleCols);
                    setColsOpen(!colsOpen);
                  }}
                  className={`h-10 w-10 rounded-full border flex items-center justify-center transition-colors ${colsOpen ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                  title="تخصيص الأعمدة"
                >
                  <Columns3 size={15} />
                </button>
                {colsOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setColsOpen(false)} />
                    <div className="absolute top-12 left-0 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">تخصيص الأعمدة</span>
                        <button
                          onClick={resetCols}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                          title="استعادة الكل"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {COL_DEFS.map((c) => (
                          <label
                            key={c.key}
                            className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="text-xs font-semibold text-slate-700">{c.label}</span>
                            <input
                              type="checkbox"
                              checked={colsDraft[c.key] !== false}
                              onChange={(e) =>
                                setColsDraft((p) => ({ ...p, [c.key]: e.target.checked }))
                              }
                              className="w-4 h-4 accent-slate-900"
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={saveCols}
                        className="w-full h-8 mt-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                      >
                        حفظ
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <ArrowUpDown size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* إجراءات جماعية */}
      {selectedIds.size > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 rounded-xl text-white">
            <span className="text-[12px] font-bold">محدد {selectedIds.size} طلب</span>
            <span className="flex-1" />
            <button
              onClick={() => bulkAction('confirm')}
              disabled={updatingId === 'bulk'}
              className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 disabled:opacity-50"
            >
              تأكيد الكل
            </button>
            <button
              onClick={() => bulkAction('reject')}
              disabled={updatingId === 'bulk'}
              className="h-8 px-3 rounded-lg bg-white/10 text-white text-[12px] font-bold hover:bg-white/20 disabled:opacity-50"
            >
              رفض الكل
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-3 rounded-lg text-white/70 text-[12px] font-bold hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* قائمة الطلبات */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 pb-10">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-[12px] font-bold text-slate-400">جاري تحميل الطلبات…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Package2 size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <>
            {/* Mobile view */}
            <div className="space-y-3 md:hidden">
              {filteredOrders.map((order) => {
                const id = String(order.id || '');
                const status = String(order.status || '').toUpperCase();
                const meta = STATUS_META[status] || {
                  label: status,
                  cls: 'bg-slate-50 text-slate-600 border-slate-200',
                };
                const busy = updatingId === id;
                const canAccept = status === 'PENDING';
                const canPrepare = status === 'CONFIRMED';
                const canReady = status === 'PREPARING';
                const canDeliver = status === 'READY';
                const canReject = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(status);
                const canReturn = RETURNABLE_STATUSES.includes(status);
                const address = getDeliveryAddress(order);
                const deliveryManagedByShop = isDeliveryDisabledOrder(order);
                const hasLocation = hasLocationData(order);
                const deliveryFeeText = renderDeliveryFee(order);

                return (
                  <div
                    key={id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="px-3.5 py-3 flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                            #{id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] font-bold text-slate-700 truncate">
                          {order.customerName || order.customer_name || order.user?.name || 'عميل'}{' '}
                          <span className="text-slate-400 font-semibold" dir="ltr">
                            {order.customerPhone ||
                              order.customer_phone ||
                              order.user?.phone ||
                              order.phone ||
                              ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold tabular-nums">
                          {new Date(
                            order.createdAt || order.created_at || Date.now()
                          ).toLocaleString('ar-EG', {
                            day: 'numeric',
                            month: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {order.items?.length || 0} أصناف
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 font-semibold leading-5 line-clamp-2">
                          {formatOrderItemsSummary(order.items, true) || '—'}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-[14px] font-extrabold text-slate-900 tabular-nums">
                          {Number(order.total || 0).toLocaleString('ar-EG')}{' '}
                          <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                        </div>
                        {busy && (
                          <Loader2 size={14} className="animate-spin text-slate-400 mt-1 ml-auto" />
                        )}
                      </div>
                    </div>

                    {(canAccept ||
                      canPrepare ||
                      canReady ||
                      canDeliver ||
                      canReject ||
                      canReturn) &&
                      !busy && (
                        <div className="px-3.5 pb-3 flex gap-1.5">
                          {canAccept && (
                            <>
                              <button
                                onClick={() => updateStatus(id, 'CONFIRMED')}
                                className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-bold"
                              >
                                تأكيد
                              </button>
                              <button
                                onClick={() => updateStatus(id, 'CANCELLED')}
                                className="flex-1 h-9 rounded-lg bg-white border border-red-200 text-red-600 text-[12px] font-bold"
                              >
                                رفض
                              </button>
                            </>
                          )}
                          {canPrepare && !canAccept && (
                            <button
                              onClick={() => updateStatus(id, 'PREPARING')}
                              className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-[12px] font-bold"
                            >
                              بدء التجهيز
                            </button>
                          )}
                          {canReady && !canAccept && !canPrepare && (
                            <button
                              onClick={() => updateStatus(id, 'READY')}
                              className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-[12px] font-bold"
                            >
                              {isRestaurant ? 'جاهز للتقديم' : 'جاهز'}
                            </button>
                          )}
                          {canDeliver && !canAccept && !canPrepare && !canReady && (
                            <button
                              onClick={() => updateStatus(id, 'DELIVERED')}
                              className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-bold"
                            >
                              تم التسليم
                            </button>
                          )}
                          {canReturn && (
                            <button
                              onClick={() => openReturnModal(order)}
                              className="h-9 px-3 rounded-lg bg-white border border-orange-200 text-orange-600 text-[12px] font-bold"
                            >
                              مرتجع
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/dashboard/sales/${id}`)}
                            className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[12px] font-bold"
                          >
                            التفاصيل
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-xl mt-3 overflow-hidden">
              <table className="w-full text-right border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-3 py-2.5 w-10">
                      <button onClick={toggleSelectAll} className="p-1">
                        {selectedIds.size === paginatedOrders.length &&
                        paginatedOrders.length > 0 ? (
                          <CheckSquare size={16} className="text-slate-900" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                      </button>
                    </th>
                    {showCol('order') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الطلب</th>
                    )}
                    {showCol('customer') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العميل</th>
                    )}
                    {showCol('items') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الأصناف</th>
                    )}
                    {showCol('status') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                    )}
                    {showCol('delivery') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">التوصيل</th>
                    )}
                    {showCol('total') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الإجمالي</th>
                    )}
                    {showCol('quick') && (
                      <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">
                        إجراء سريع
                      </th>
                    )}
                    <th className="px-3 py-2.5 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const id = String(order.id || '');
                    const status = String(order.status || '').toUpperCase();
                    const meta = STATUS_META[status] || {
                      label: status,
                      cls: 'bg-slate-50 text-slate-600 border-slate-200',
                    };
                    const busy = updatingId === id;
                    const canAccept = status === 'PENDING';
                    const canPrepare = status === 'CONFIRMED';
                    const canReady = status === 'PREPARING';
                    const canDeliver = status === 'READY';
                    const canReject = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(
                      status
                    );
                    const canReturn = RETURNABLE_STATUSES.includes(status);
                    const address = getDeliveryAddress(order);
                    const deliveryManagedByShop = isDeliveryDisabledOrder(order);
                    const deliveryFeeText = renderDeliveryFee(order);
                    const expanded = expandedId === id;
                    const colCount =
                      2 +
                      ['order', 'customer', 'items', 'status', 'delivery', 'total', 'quick'].filter(
                        showCol
                      ).length;
                    // أرقام الفاتورة الحقيقية من الطلب
                    const _items = Array.isArray(order.items) ? order.items : [];
                    const itemsSubtotal = _items.reduce(
                      (s: number, it: any) =>
                        s +
                        Number(it?.quantity ?? it?.qty ?? 0) *
                          Number(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0),
                      0
                    );
                    const _notes = parseOrderNotes(order);
                    const itemsDeliveryFee = Math.max(
                      Number(order.total || 0) - itemsSubtotal - _notes.discount - _notes.tip,
                      0
                    );
                    const customerPhone =
                      order.customerPhone ||
                      order.customer_phone ||
                      order.user?.phone ||
                      order.phone ||
                      '';
                    const customerNameFull =
                      order.customerName || order.customer_name || order.user?.name || '';
                    const sourceLabel =
                      order.source === 'pos'
                        ? 'من الكاشير'
                        : order.source === 'manual'
                          ? 'طلب يدوي'
                          : order.source === 'website' || !order.source
                            ? 'من الموقع'
                            : order.source;

                    return (
                      <React.Fragment key={id}>
                        <tr
                          className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${status === 'PENDING' ? 'bg-amber-50/40' : ''} ${expanded ? 'bg-slate-50/70' : ''}`}
                        >
                          <td className="px-3 py-3">
                            <button onClick={() => toggleSelect(id)} className="p-1">
                              {selectedIds.has(id) ? (
                                <CheckSquare size={16} className="text-slate-900" />
                              ) : (
                                <Square size={16} className="text-slate-300" />
                              )}
                            </button>
                          </td>
                          {showCol('order') && (
                            <td className="px-3 py-3">
                              <div className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                                #{id.slice(0, 8).toUpperCase()}
                              </div>
                              <div className="text-[11px] text-slate-400 font-semibold tabular-nums">
                                {new Date(
                                  order.createdAt || order.created_at || Date.now()
                                ).toLocaleString('ar-EG', {
                                  day: 'numeric',
                                  month: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                          )}
                          {showCol('customer') && (
                            <td className="px-3 py-3">
                              <div className="text-[12px] font-bold text-slate-800 max-w-[150px] truncate">
                                {customerNameFull || 'عميل'}
                              </div>
                              <div
                                className="text-[11px] text-slate-400 font-semibold tabular-nums"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                              >
                                {customerPhone || '—'}
                              </div>
                            </td>
                          )}
                          {showCol('items') && (
                            <td className="px-3 py-3">
                              <div
                                className="text-[11px] text-slate-600 font-semibold max-w-[220px] truncate"
                                title={formatOrderItemsSummary(order.items, true)}
                              >
                                {formatOrderItemsSummary(order.items, true) || '—'}
                              </div>
                              <div className="text-[11px] text-slate-400 font-bold">
                                {order.items?.length || 0} أصناف
                              </div>
                            </td>
                          )}
                          {showCol('status') && (
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${meta.cls}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                          )}
                          {showCol('delivery') && (
                            <td className="px-3 py-3">
                              <div className="text-[12px] text-slate-600 font-bold whitespace-nowrap">
                                {deliveryManagedByShop ? 'استلام ذاتي' : deliveryFeeText}
                              </div>
                              {address && !deliveryManagedByShop && (
                                <div className="text-[11px] text-slate-400 font-semibold truncate max-w-[160px]">
                                  {address}
                                </div>
                              )}
                            </td>
                          )}
                          {showCol('total') && (
                            <td className="px-3 py-3">
                              <div className="text-[13px] font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                                {Number(order.total || 0).toLocaleString('ar-EG')}{' '}
                                <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                              </div>
                            </td>
                          )}
                          {showCol('quick') && (
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                {busy ? (
                                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                    <Loader2 size={13} className="animate-spin" /> جاري…
                                  </span>
                                ) : (
                                  <>
                                    {canAccept && (
                                      <>
                                        <button
                                          onClick={() => updateStatus(id, 'CONFIRMED')}
                                          className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                                        >
                                          تأكيد
                                        </button>
                                        <button
                                          onClick={() => updateStatus(id, 'CANCELLED')}
                                          className="h-8 px-3 rounded-lg bg-white border border-red-200 text-red-600 text-[11px] font-bold hover:bg-red-50"
                                        >
                                          رفض
                                        </button>
                                      </>
                                    )}
                                    {canPrepare && (
                                      <button
                                        onClick={() => updateStatus(id, 'PREPARING')}
                                        className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                      >
                                        تجهيز
                                      </button>
                                    )}
                                    {canReady && (
                                      <button
                                        onClick={() => updateStatus(id, 'READY')}
                                        className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                      >
                                        {isRestaurant ? 'جاهز للتقديم' : 'جاهز'}
                                      </button>
                                    )}
                                    {canDeliver && (
                                      <button
                                        onClick={() => updateStatus(id, 'DELIVERED')}
                                        className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                                      >
                                        تم التسليم
                                      </button>
                                    )}
                                    {canReturn && (
                                      <button
                                        onClick={() => openReturnModal(order)}
                                        className="h-8 px-3 rounded-lg bg-white border border-orange-200 text-orange-600 text-[11px] font-bold hover:bg-orange-50"
                                      >
                                        مرتجع
                                      </button>
                                    )}
                                    {!canAccept &&
                                      !canPrepare &&
                                      !canReady &&
                                      !canDeliver &&
                                      !canReturn && (
                                        <span className="text-[11px] font-bold text-slate-300">
                                          —
                                        </span>
                                      )}
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => router.push(`/dashboard/sales/${id}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                title="عرض الطلب"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => printInvoice(order)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                title="طباعة الفاتورة"
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                onClick={() => printWaybill(order)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                title="طباعة بوليصة التوصيل"
                              >
                                <Truck size={15} />
                              </button>
                              <button
                                onClick={() => setExpandedId(expanded ? '' : id)}
                                className={`p-1.5 rounded-lg transition-colors ${expanded ? 'text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                                title={expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                              >
                                <ChevronDown
                                  size={15}
                                  className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-slate-100">
                            <td colSpan={colCount} className="px-0 py-0 bg-slate-50/60">
                              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* منتجات الطلب */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                    منتجات الطلب
                                  </div>
                                  {_items.length === 0 ? (
                                    <div className="px-4 py-4 text-[11px] text-slate-400 font-semibold">
                                      لا توجد أصناف مسجلة
                                    </div>
                                  ) : (
                                    <table className="w-full text-right">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                          <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                            المنتج
                                          </th>
                                          <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                            السعر
                                          </th>
                                          <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                            الكمية
                                          </th>
                                          <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                            الإجمالي
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {_items.map((it: any, idx: number) => {
                                          const qty = Number(it?.quantity ?? it?.qty ?? 0);
                                          const unit = Number(
                                            it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0
                                          );
                                          return (
                                            <tr
                                              key={idx}
                                              className="border-b border-slate-50 last:border-0"
                                            >
                                              <td className="px-3 py-2 text-[11px] font-bold text-slate-700">
                                                {it?.product?.name || it?.name || '—'}
                                              </td>
                                              <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                                                {unit.toLocaleString('ar-EG')}
                                              </td>
                                              <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                                                {qty}
                                              </td>
                                              <td className="px-3 py-2 text-[11px] font-bold text-slate-800 tabular-nums">
                                                {(qty * unit).toLocaleString('ar-EG')}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                {/* الفاتورة */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                    الفاتورة
                                  </div>
                                  <div className="px-4 py-2 divide-y divide-slate-50">
                                    {[
                                      { label: 'قيمة المنتجات', value: itemsSubtotal },
                                      _notes.discount > 0 && {
                                        label: 'الخصم',
                                        value: -_notes.discount,
                                      },
                                      _notes.tip > 0 && { label: 'إكرامية', value: _notes.tip },
                                      itemsDeliveryFee > 0 && {
                                        label: 'الشحن',
                                        value: itemsDeliveryFee,
                                      },
                                    ]
                                      .filter(Boolean)
                                      .map((r: any, i: number) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between py-2"
                                        >
                                          <span className="text-[11px] font-semibold text-slate-500">
                                            {r.label}
                                          </span>
                                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                                            {r.value.toLocaleString('ar-EG')} ج.م
                                          </span>
                                        </div>
                                      ))}
                                    <div className="flex items-center justify-between py-2">
                                      <span className="text-xs font-bold text-slate-900">
                                        الإجمالي
                                      </span>
                                      <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                                        {Number(order.total || 0).toLocaleString('ar-EG')} ج.م
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        الدفع
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-700">
                                        {String(order.paymentMethod || 'COD').toUpperCase() ===
                                        'COD'
                                          ? 'دفع عند الاستلام'
                                          : String(order.paymentMethod || '').toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* العميل */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                    العميل
                                  </div>
                                  <div className="px-4 py-2 divide-y divide-slate-50">
                                    <div className="flex items-center justify-between py-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        الاسم
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-800">
                                        {customerNameFull || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        رقم الهاتف
                                      </span>
                                      <span
                                        className="text-[11px] font-bold text-slate-800 tabular-nums"
                                        dir="ltr"
                                      >
                                        {customerPhone || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 py-2">
                                      <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                                        العنوان
                                      </span>
                                      <span className="text-[11px] font-semibold text-slate-700 text-left">
                                        {address || 'استلام من المتجر'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                      <span className="text-[11px] font-semibold text-slate-500">
                                        المصدر
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                                        {sourceLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="px-4 pb-3 pt-2 flex items-center gap-2">
                                    <button
                                      onClick={() => router.push(`/dashboard/sales/${id}`)}
                                      className="h-8 px-4 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                    >
                                      عرض
                                    </button>
                                    {customerPhone && (
                                      <a
                                        href={`https://wa.me/2${customerPhone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 px-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 flex items-center"
                                      >
                                        واتساب
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-xs font-bold text-slate-500">
                  عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredOrders.length)} من{' '}
                  {filteredOrders.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-3">
                    صفحة {currentPage} من {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-slate-900">
                تفاصيل الطلب{' '}
                <span className="text-slate-400 font-bold">
                  #
                  {String(selectedOrder.id || '')
                    .slice(0, 8)
                    .toUpperCase()}
                </span>
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => printInvoice(selectedOrder)}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900"
                  title="طباعة الفاتورة (80مم)"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => printWaybill(selectedOrder)}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900"
                  title="طباعة بوليصة التوصيل (A6)"
                >
                  <Truck size={18} />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-50 rounded-lg"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* إجراءات الحالة — حسب التحولات المسموحة من الباكند */}
              {(() => {
                const st = String(selectedOrder.status || '').toUpperCase();
                const oid = String(selectedOrder.id || '');
                const actions: Array<{
                  label: string;
                  status: string;
                  primary?: boolean;
                  danger?: boolean;
                }> = [];
                if (st === 'PENDING') {
                  actions.push({ label: 'تأكيد الطلب', status: 'CONFIRMED', primary: true });
                  actions.push({ label: 'رفض', status: 'CANCELLED', danger: true });
                } else if (st === 'CONFIRMED') {
                  actions.push({ label: 'بدء التجهيز', status: 'PREPARING', primary: true });
                  actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
                } else if (st === 'PREPARING') {
                  actions.push({
                    label: isRestaurant ? 'جاهز للتقديم' : 'جاهز',
                    status: 'READY',
                    primary: true,
                  });
                  actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
                } else if (st === 'READY') {
                  actions.push({ label: 'تم التسليم', status: 'DELIVERED', primary: true });
                  actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
                } else if (st === 'DELIVERED') {
                  actions.push({ label: 'تسجيل مرتجع', status: 'REFUNDED' });
                }
                if (actions.length === 0) return null;
                return (
                  <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 ml-auto">
                      إجراءات الطلب:
                    </span>
                    {actions.map((a) => (
                      <button
                        key={a.status}
                        onClick={() => updateStatus(oid, a.status)}
                        disabled={updatingId === oid}
                        className={`h-8 px-3.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                          a.primary
                            ? 'bg-slate-900 text-white hover:bg-slate-700'
                            : a.danger
                              ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {updatingId === oid ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          a.label
                        )}
                      </button>
                    ))}
                    {(selectedOrder.customerPhone ||
                      selectedOrder.customer_phone ||
                      selectedOrder.user?.phone) && (
                      <a
                        href={`https://wa.me/2${(selectedOrder.customerPhone || selectedOrder.customer_phone || selectedOrder.user?.phone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 flex items-center gap-1.5"
                      >
                        <MessageCircle size={13} />
                        واتساب العميل
                      </a>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-slate-400">رقم الطلب</div>
                  <div className="mt-2 font-bold text-slate-900 text-sm truncate">
                    #
                    {String(selectedOrder.id || '')
                      .slice(0, 8)
                      .toUpperCase() || '-'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    الحالة
                  </div>
                  <div className="mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_META[String(selectedOrder.status).toUpperCase()]?.cls || ''}`}
                    >
                      {STATUS_META[String(selectedOrder.status).toUpperCase()]?.label ||
                        selectedOrder.status}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    التاريخ
                  </div>
                  <div className="mt-2 font-bold text-slate-900 text-sm leading-6">
                    {new Date(
                      selectedOrder.createdAt || selectedOrder.created_at || Date.now()
                    ).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    الإجمالي
                  </div>
                  <div className="mt-2 font-bold text-slate-900 text-sm">
                    ج.م {Number(selectedOrder.total || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    الدفع
                  </div>
                  <div className="mt-2 font-bold text-slate-900 text-sm">
                    {String((selectedOrder as any).paymentMethod || 'COD').toUpperCase() === 'COD'
                      ? 'دفع عند الاستلام'
                      : String((selectedOrder as any).paymentMethod || '').toUpperCase() || '—'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    المصدر
                  </div>
                  <div className="mt-2 font-bold text-slate-900 text-sm">
                    {(selectedOrder as any).source === 'pos'
                      ? 'الكاشير'
                      : (selectedOrder as any).source === 'manual'
                        ? 'يدوي'
                        : 'الموقع'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                    <ReceiptText size={16} /> بيانات العميل
                  </div>
                  <div className="mt-3 space-y-2 text-sm font-bold text-slate-600">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400">الاسم</span>
                      <span className="text-slate-900 text-left">
                        {selectedOrder.customerName ||
                          selectedOrder.customer_name ||
                          selectedOrder.user?.name ||
                          '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400">الهاتف</span>
                      <span className="text-slate-900 text-left" dir="ltr">
                        {selectedOrder.customerPhone ||
                          selectedOrder.customer_phone ||
                          selectedOrder.user?.phone ||
                          selectedOrder.phone ||
                          '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400">طريقة التوصيل</span>
                      <span className="text-slate-900 text-left">
                        {isDeliveryDisabledOrder(selectedOrder) ? 'استلام ذاتي' : 'عبر المندوب'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-400">العنوان</span>
                      <span className="text-slate-900 text-left">
                        {getDeliveryAddress(selectedOrder) || '-'}
                      </span>
                    </div>
                    {selectedOrder.customerNote || selectedOrder.customer_note ? (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-400">ملاحظة العميل</span>
                        <span className="text-slate-900 text-left">
                          {selectedOrder.customerNote || selectedOrder.customer_note}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                    <ReceiptText size={16} /> ملخص الفاتورة
                  </div>
                  {(() => {
                    const _items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
                    const sub = _items.reduce(
                      (s: number, it: any) =>
                        s +
                        Number(it?.quantity ?? it?.qty ?? 0) *
                          Number(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0),
                      0
                    );
                    const nt = parseOrderNotes(selectedOrder);
                    const del = Math.max(
                      Number(selectedOrder.total || 0) - sub - nt.discount - nt.tip,
                      0
                    );
                    const rows: Array<{ label: string; value: number }> = [
                      { label: 'قيمة المنتجات', value: sub },
                    ];
                    if (nt.discount > 0) rows.push({ label: 'الخصم', value: -nt.discount });
                    if (nt.tip > 0) rows.push({ label: 'إكرامية', value: nt.tip });
                    if (del > 0) rows.push({ label: 'الشحن', value: del });
                    return (
                      <div className="mt-3 divide-y divide-slate-50">
                        {rows.map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-xs font-semibold text-slate-500">{r.label}</span>
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                              {r.value.toLocaleString('ar-EG')} ج.م
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-bold text-slate-900">الإجمالي</span>
                          <span className="text-base font-extrabold text-slate-900 tabular-nums">
                            {Number(selectedOrder.total || 0).toLocaleString('ar-EG')} ج.م
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">المنتجات</div>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 rounded-lg p-3 flex-row-reverse"
                    >
                      <div className="text-right flex-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {it?.product?.name || it?.name || '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {Number(it?.quantity || it?.qty || 1)} × ج.م{' '}
                          {Number(it?.price || it?.unitPrice || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        ج.م{' '}
                        {(
                          Number(it?.price || it?.unitPrice || 0) *
                          Number(it?.quantity || it?.qty || 1)
                        ).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Returns Panel (from old version) */}
              <OrderReturnsPanel order={selectedOrder} />
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal (from old version) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !creating && setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">طلب جديد</h2>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
                disabled={creating}
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم العميل</label>
                <input
                  type="text"
                  value={createFormData.customerName}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, customerName: e.target.value })
                  }
                  placeholder="اسم العميل"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">رقم الهاتف</label>
                <input
                  type="tel"
                  value={createFormData.customerPhone}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, customerPhone: e.target.value })
                  }
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">عنوان التوصيل</label>
                <input
                  type="text"
                  value={createFormData.customerAddress}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, customerAddress: e.target.value })
                  }
                  placeholder="عنوان التوصيل (اختياري)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-900 focus:ring-0"
                />
              </div>
              <button
                onClick={createOrder}
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printPreview && (
        <PrintPreviewModal
          order={printPreview.order}
          shop={shop}
          mode={printPreview.mode}
          onClose={() => setPrintPreview(null)}
        />
      )}

      {/* مودال المرتجع — كامل أو جزئي */}
      {returnModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !returnProcessing && setReturnModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-extrabold text-slate-900">
                مرتجع الطلب{' '}
                <span className="text-slate-400 font-bold">
                  #
                  {String(returnModal.id || '')
                    .slice(0, 8)
                    .toUpperCase()}
                </span>
              </h2>
              <button
                onClick={() => !returnProcessing && setReturnModal(null)}
                className="p-2 hover:bg-slate-50 rounded-lg"
                disabled={returnProcessing}
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* مفتاح الوضع: كامل / جزئي */}
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setReturnMode('full')}
                  className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${returnMode === 'full' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  مرتجع كامل
                </button>
                <button
                  type="button"
                  onClick={() => setReturnMode('partial')}
                  className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${returnMode === 'partial' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  مرتجع جزئي
                </button>
              </div>

              {/* ملخص الطلب والأصناف */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                    {new Date(
                      returnModal.createdAt || returnModal.created_at || Date.now()
                    ).toLocaleString('ar-EG')}
                  </div>
                  <div className="font-black text-lg text-slate-900 tabular-nums">
                    ج.م {Number(returnModal.total || 0).toLocaleString('ar-EG')}
                  </div>
                </div>
                {(Array.isArray(returnModal.items) ? returnModal.items : []).length === 0 ? (
                  <div className="text-xs font-bold text-slate-400 py-2">
                    لا توجد أصناف مسجلة على الطلب
                  </div>
                ) : (
                  (Array.isArray(returnModal.items) ? returnModal.items : []).map(
                    (item: any, idx: number) => {
                      const key = String(item?.id || item?.productId || `item_${idx}`);
                      const maxQty = Number(item?.quantity ?? item?.qty ?? 0);
                      const unitPrice = Number(item?.price ?? item?.unitPrice ?? 0);
                      const retQty = Number(returnSelection[key] || 0);
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 py-2 border-t border-slate-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-700 truncate">
                              {item?.product?.name || item?.name || item?.productName || '—'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold tabular-nums">
                              الكمية: {maxQty} · السعر: {unitPrice.toLocaleString('ar-EG')}
                            </div>
                          </div>
                          {returnMode === 'partial' && (
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => adjustReturnQty(key, -1, maxQty)}
                                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                value={retQty}
                                onChange={(e) => setReturnQty(key, Number(e.target.value), maxQty)}
                                className="w-12 text-center font-black text-xs outline-none bg-transparent"
                                min={0}
                                max={maxQty}
                              />
                              <button
                                type="button"
                                onClick={() => adjustReturnQty(key, 1, maxQty)}
                                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                          <div className="text-left text-xs font-black text-slate-600 w-20 shrink-0 tabular-nums">
                            ج.م{' '}
                            {(
                              unitPrice * (returnMode === 'partial' ? retQty : maxQty)
                            ).toLocaleString('ar-EG')}
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>

              {/* السبب + إرجاع المخزن */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                {returnMode === 'partial' && (
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-700">إجمالي المرتجع</span>
                    <span className="font-black text-lg text-red-600 tabular-nums">
                      ج.م {partialRefundAmount.toLocaleString('ar-EG')}
                    </span>
                  </div>
                )}
                {returnMode === 'full' && (
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-700">المبلغ المسترجع</span>
                    <span className="font-black text-lg text-red-600 tabular-nums">
                      ج.م {Number(returnModal.total || 0).toLocaleString('ar-EG')}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500">السبب</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="سبب المرتجع..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none text-sm font-bold focus:outline-none focus:border-slate-400"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnToStock}
                    onChange={(e) => setReturnToStock(e.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  إرجاع الأصناف للمخزن
                </label>
              </div>

              {returnError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold">
                  <XCircle size={16} />
                  {returnError}
                </div>
              )}

              <button
                type="button"
                onClick={processReturn}
                disabled={
                  returnProcessing || (returnMode === 'partial' && returnModalItems.length === 0)
                }
                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                {returnProcessing
                  ? 'جاري المعالجة...'
                  : returnMode === 'full'
                    ? `تأكيد المرتجع الكامل — ج.م ${Number(returnModal.total || 0).toLocaleString('ar-EG')}`
                    : `تأكيد المرتجع الجزئي — ج.م ${partialRefundAmount.toLocaleString('ar-EG')}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h2 className="text-xl font-black text-slate-900">دليل المبيعات</h2>
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
                  <Target size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إدارة ومتابعة جميع طلبات المتجر، من قيد الانتظار حتى التوصيل أو الإلغاء، مع
                  إمكانية تحديث الحالات وطباعة الفواتير.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  عند الحاجة لمراجعة الطلبات الجديدة، تحديث حالات الطلبات، طباعة الفواتير، أو متابعة
                  تفاصيل كل طلب.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>
                    • 8 بطاقات إحصائية (إجمالي، إيرادات، متوسط، قيد الانتظار، قيد التجهيز، جاهز، تم
                    التوصيل، ملغي/مرفوض)
                  </li>
                  <li>
                    • 10 فلاتر حالة (الكل، ناجح، قيد الانتظار، مؤكد، قيد التجهيز، جاهز، سُلّم
                    للمندوب، خرج للتوصيل، تم التوصيل، ملغي، مرفوض، مسترجع)
                  </li>
                  <li>• فلترة بالنطاق الزمني (اليوم/أسبوع/شهر) ونطاق المبلغ</li>
                  <li>• ترتيب بالتاريخ/المبلغ/الحالة + ترقيم صفحات</li>
                  <li>• تحديد متعدد + إجراءات جماعية (تأكيد/رفض الكل)</li>
                  <li>• جدول بجميع الطلبات مع العميل والمبلغ والحالة والتوصيل</li>
                  <li>
                    • قائمة منسدلة لكل طلب لتحديث الحالة (قبول/تجهيز/جاهز/سُلّم للمندوب/تم
                    التوصيل/رفض)
                  </li>
                  <li>• زر طباعة فاتورة لكل طلب</li>
                  <li>• تفاصيل الطلب مع لوحة المرتجعات (إنشاء/عرض المرتجعات)</li>
                  <li>• إنشاء طلب جديد يدوياً</li>
                  <li>• تصدير CSV</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيفية العمل</h3>
                </div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع الإحصائيات الـ 8 لفهم حجم الطلبات</li>
                  <li>2. استخدم الفلاتر للتركيز على حالة معينة</li>
                  <li>3. اضغط على القائمة المنسدلة للطلب لتحديث الحالة</li>
                  <li>4. اضغط على أيقونة العين لعرض تفاصيل الطلب والمرتجعات</li>
                  <li>5. اضغط على أيقونة الطابعة لطباعة الفاتورة</li>
                  <li>6. حدد عدة طلبات لإجراءات جماعية</li>
                  <li>7. اضغط "طلب جديد" لإنشاء طلب يدوياً</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• راجع الطلبات قيد الانتظار بانتظام لتسريع المعالجة</li>
                  <li>• استخدم الفلترة للتركيز على الطلبات الناجحة أو المرفوضة</li>
                  <li>• طباعة الفواتير للطلبات المكتملة</li>
                  <li>• راجع تفاصيل الطلب قبل تحديث الحالة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900">نصائح</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• الطلبات قيد الانتظار تحتاج متابعة سريعة</li>
                  <li>• استخدم الطباعة المباشرة للفاتورة لسرعة الإنجاز</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• حالة الطلب</li>
                  <li>• المدفوعات</li>
                  <li>• المرتجعات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
