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
  formatAddonsCompactParts,
  formatVariantSelectionCompact,
} from '@/lib/sales-utils';
import { useShop } from '@/hooks/useShop';
import { PrintPreviewModal, parseOrderNotes } from '@/components/sales/print-utils';
import { printHtmlReceipt, buildReturnReceiptHtml } from '@/lib/print-receipt';
import OrderReturnsPanel from '@/components/sales/OrderReturnsPanel';
import {
  RETURNABLE_STATUSES,
  RESTAURANT_FILTERS,
  RETAIL_FILTERS,
  STATUS_META,
  formatItemsSummary,
  type FilterType,
  type Order,
} from '@/components/sales/salesShared';
import SalesToolbar from '@/components/sales/SalesToolbar';
import SalesOrdersList from '@/components/sales/SalesOrdersList';
import SalesOrderDrawer from '@/components/sales/SalesOrderDrawer';
import SalesCreateOrderModal from '@/components/sales/SalesCreateOrderModal';
import SalesReturnModal from '@/components/sales/SalesReturnModal';
import SalesGuideDrawer from '@/components/sales/SalesGuideDrawer';

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

  /**
   * fetchOrders(silent?) — التحميل الأول فقط هو اللي بيعرض سبينر الجدول كامل.
   * التحديثات في الخلفية (بعد تأكيد/تسليم/مرتجع/إنشاء طلب) بتفضل صامتة:
   * الجدول يفضل مثبت في مكانه، والسطر المتأثر بس هو اللي بيتحدث فورًا
   * (تحديث تفاؤلي في updateStatus) ثم يتطابق مع بيانات السيرفر بهدوء.
   * من غير كده، كل خطوة كانت بتمسح الجدول وترجّعه — رجّزة مزعجة
   * وبتحسس التاجر إن الصفحة "بتعمل ريفرش" مع كل حركة.
   */
  const fetchOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
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
        if (!silent) setLoading(false);
      }
    },
    [shop?.id]
  );

  useEffect(() => {
    fetchOrders();
    // أحداث المزامنة (طلب جديد / تغيير حالة / مرتجع) = تحديث هادئ في الخلفية،
    // مش إعادة تحميل ظاهرة. الصفحة اللي أطلقت الحدث هي اللي حدّثت سطرها محليًا.
    const handleUpdate = () => fetchOrders({ silent: true });
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
      // الطلب الجديد بيظهر في القائمة بهدوء من غير ما الجدول يختفي ويرجع.
      await fetchOrders({ silent: true });
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
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
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

      <SalesToolbar
        isRestaurant={isRestaurant}
        filter={filter}
        stats={stats}
        setFilter={setFilter}
        setCurrentPage={setCurrentPage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateRange={dateRange}
        setDateRange={setDateRange}
        amountRange={amountRange}
        setAmountRange={setAmountRange}
        sortBy={sortBy}
        setSortBy={setSortBy}
        setColsDraft={setColsDraft}
        visibleCols={visibleCols}
        setColsOpen={setColsOpen}
        colsOpen={colsOpen}
        resetCols={resetCols}
        COL_DEFS={COL_DEFS}
        colsDraft={colsDraft}
        saveCols={saveCols}
        setSortOrder={setSortOrder}
        sortOrder={sortOrder}
      />

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

      <SalesOrdersList
        loading={loading}
        filteredOrders={filteredOrders}
        updatingId={updatingId}
        updateStatus={updateStatus}
        isRestaurant={isRestaurant}
        openReturnModal={openReturnModal}
        router={router}
        toggleSelectAll={toggleSelectAll}
        selectedIds={selectedIds}
        paginatedOrders={paginatedOrders}
        showCol={showCol}
        expandedId={expandedId}
        filter={filter}
        toggleSelect={toggleSelect}
        printInvoice={printInvoice}
        printWaybill={printWaybill}
        setExpandedId={setExpandedId}
        totalPages={totalPages}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
      />

      {selectedOrder && (
        <SalesOrderDrawer
          setSelectedOrder={setSelectedOrder}
          selectedOrder={selectedOrder}
          printInvoice={printInvoice}
          printWaybill={printWaybill}
          isRestaurant={isRestaurant}
          updateStatus={updateStatus}
          updatingId={updatingId}
        />
      )}

      {showCreateModal && (
        <SalesCreateOrderModal
          creating={creating}
          setShowCreateModal={setShowCreateModal}
          createFormData={createFormData}
          setCreateFormData={setCreateFormData}
          createOrder={createOrder}
        />
      )}

      {printPreview && (
        <PrintPreviewModal
          order={printPreview.order}
          shop={shop}
          mode={printPreview.mode}
          onClose={() => setPrintPreview(null)}
        />
      )}

      {returnModal && (
        <SalesReturnModal
          returnProcessing={returnProcessing}
          setReturnModal={setReturnModal}
          returnModal={returnModal}
          setReturnMode={setReturnMode}
          returnMode={returnMode}
          returnSelection={returnSelection}
          adjustReturnQty={adjustReturnQty}
          setReturnQty={setReturnQty}
          partialRefundAmount={partialRefundAmount}
          returnReason={returnReason}
          setReturnReason={setReturnReason}
          returnToStock={returnToStock}
          setReturnToStock={setReturnToStock}
          returnError={returnError}
          processReturn={processReturn}
          returnModalItems={returnModalItems}
        />
      )}

      {guideOpen && <SalesGuideDrawer setGuideOpen={setGuideOpen} />}
    </div>
  );
}
