'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  UserPlus,
  X,
  Plus,
  Receipt,
  RotateCcw,
  Clock,
  BarChart3,
  Tag,
  CreditCard,
  Wallet,
  Banknote,
  Ruler,
  SlidersHorizontal,
  ShoppingCart,
  Trash2,
  Printer,
  Minus,
  Pause,
  Play,
  ScanLine,
  Camera,
  Filter,
  Mail,
  Gift,
  Percent,
  Users,
  Table2,
  Eraser,
  Settings2,
  Scale,
  Send,
  DollarSign,
  Crown,
  ShieldCheck,
  Star,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  Zap,
  Sliders,
  UserRound,
  CloudOff,
  Lock,
  Eye,
  EyeOff,
  WifiOff,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest, useAuth } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import Link from 'next/link';
import {
  HeldOrders,
  startUsbBarcodeListener,
  startCameraBarcodeListener,
  bindShortcuts,
  paginate,
  type HeldOrder,
  type BarcodeScannerHandle,
  validateSplitPayments,
  loadReceiptTheme,
  saveReceiptTheme,
  computeTip,
  loadLoyaltyConfig,
  saveLoyaltyConfig,
  computeEarnedPoints,
  computeRedeemValue,
  validateGiftCard,
  applyGiftCardAmount,
  getPriceForLevel,
  canvasToDataUrl,
  clearCanvas,
  openCashDrawer,
  logAudit,
  readAudit,
  readScaleViaWebSerial,
  createPosSync,
  broadcastPosSync,
  loadTables,
  saveTables,
  emailReceiptViaMailto,
  loadLayaways,
  saveLayaways,
  isCustomerTaxExempt,
  loadCashMovements,
  addCashMovement,
  loadQuickKeys,
  toggleQuickKey,
  buildReportData,
  loadDrawerDeclarations,
  saveDrawerDeclaration,
  type ReceiptTheme,
  type SplitPaymentEntry,
  type PaymentMethod,
  type LoyaltyConfig,
  type PriceLevel,
  type RestaurantTable,
  type LayawayPlan,
  type CashMovement,
  type DrawerDeclaration,
} from '@/lib/pos-utils';
import { printHtmlReceipt, buildReturnReceiptHtml } from '@/lib/print-receipt';
import {
  loadPosSettings,
  writeCurrentCashier,
  cashierHasPermission,
  type PosCashier,
} from '@/lib/posSettings';

const MotionDiv = motion.div as any;

// ─── Offline helpers (cache-first hydration + pending orders queue) ─────────

/** Read a JSON array from localStorage (never throws). */
function readCachedList(key: string): any[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Full order payload queued while offline. */
interface PendingOrder {
  id: string;
  createdAt: number;
  payload: any;
}

function readPendingOrders(shopId: string): PendingOrder[] {
  if (!shopId || typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`pos_pending_orders_${shopId}`) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingOrders(shopId: string, list: PendingOrder[]) {
  if (!shopId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`pos_pending_orders_${shopId}`, JSON.stringify(list));
  } catch {}
}

function enqueuePendingOrder(shopId: string, payload: any): PendingOrder {
  const entry: PendingOrder = {
    id: `pend_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: Date.now(),
    payload,
  };
  writePendingOrders(shopId, [...readPendingOrders(shopId), entry]);
  return entry;
}

/**
 * Network-type failure only (fetch TypeError / no response at all) — NOT a
 * 4xx business error (those arrive as { status, message }).
 */
function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (typeof err.status === 'number') return false;
  if (err instanceof TypeError) return true;
  const name = String(err?.name || '');
  if (name === 'TypeError' || name === 'AbortError') return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('internet connection')
  );
}

// Features that are not part of the first public release (loyalty, gift cards,
// layaway, …) stay visible on local/dev machines only — production builds
// never render them.
const SHOW_UNPUBLISHED = process.env.NODE_ENV !== 'production';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  addons?: any;
  variantSelection?: any;
  /** Manual price override (per-line). */
  priceOverride?: number | null;
}

const POSSystemPage: React.FC = () => {
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const isArabic = true;

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerCardOpen, setIsCustomerCardOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configProduct, setConfigProduct] = useState<any | null>(null);
  const [selectedMenuTypeId, setSelectedMenuTypeId] = useState('');
  const [selectedMenuSizeId, setSelectedMenuSizeId] = useState('');
  const [selectedFashionColorValue, setSelectedFashionColorValue] = useState('');
  const [selectedFashionSize, setSelectedFashionSize] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<
    Array<{ optionId: string; variantId: string }>
  >([]);
  const [usingOfflineData, setUsingOfflineData] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);

  // Collapsible cart sections (closed by default to reduce clutter)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTipSection, setShowTipSection] = useState(false);

  // Active shift / cashier name (shift owner printed on the invoice)
  const [activeShift, setActiveShift] = useState<any>(null);

  // 30s tick so the in-POS shift card keeps its elapsed time live
  const [shiftTick, setShiftTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setShiftTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Current POS cashier identity (set when a shift is opened from the shifts page)
  const [posCashier, setPosCashier] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem('pos_current_cashier');
        const parsed = raw ? JSON.parse(raw) : null;
        setPosCashier(
          parsed && parsed.id && parsed.name
            ? { id: String(parsed.id), name: String(parsed.name) }
            : null
        );
      } catch {
        setPosCashier(null);
      }
    };
    sync();
    window.addEventListener('pos-cashier-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('pos-cashier-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // ─── POS gate (shift + cashier identity) ─────────────────────────────────
  const [shiftLoaded, setShiftLoaded] = useState(false);
  const [gateOpeningCash, setGateOpeningCash] = useState(0);
  const [gateCashierId, setGateCashierId] = useState('');
  const [gatePin, setGatePin] = useState('');
  const [gateShowPin, setGateShowPin] = useState(false);
  const [gateError, setGateError] = useState('');
  const [gateSubmitting, setGateSubmitting] = useState(false);

  const posSettings = useMemo(() => loadPosSettings(shop), [shop]);
  const hasCashiers = posSettings.cashiers.length > 0;
  const gateCashiers = useMemo(
    () => posSettings.cashiers.filter((c) => cashierHasPermission(c, 'open_shift')),
    [posSettings.cashiers]
  );
  const shiftOpen = Boolean(
    activeShift?.id || String(activeShift?.status || '').toUpperCase() === 'OPEN'
  );
  /**
   * 'open'   → no active shift: full gate (cash + cashier + PIN)
   * 'resume' → shift open but no cashier session on this device (browser
   *            reopened): cashier + PIN only, does NOT open a new shift
   * 'none'   → gate passed (or shift still loading / legacy shop)
   */
  const gateMode: 'none' | 'open' | 'resume' = !shiftLoaded
    ? 'none'
    : !shiftOpen
      ? 'open'
      : !posCashier && hasCashiers
        ? 'resume'
        : 'none';
  const isGated = gateMode !== 'none';

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet' | 'credit'>('cash');

  // Customer List Selection States
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [savedCustomers, setSavedCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Mobile cart sheet
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  // VAT
  const [vatRatePct, setVatRatePct] = useState(0);

  // ─── New POS features ───────────────────────────────────────────────────
  // Hold/Suspend orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);

  // Barcode scanning
  const [barcodeListening, setBarcodeListening] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const usbScannerRef = useRef<BarcodeScannerHandle | null>(null);
  const cameraScannerRef = useRef<BarcodeScannerHandle | null>(null);

  // Categories filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Products pagination
  const [productsPage, setProductsPage] = useState(1);
  const productsPageSize = 60;

  // Price override (per-line edit)
  const [priceOverrideId, setPriceOverrideId] = useState<string | null>(null);
  const [priceOverrideValue, setPriceOverrideValue] = useState<string>('');

  // Search input ref (for F2 focus shortcut)
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Advanced POS features state ────────────────────────────────────────
  // Split payment
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([]);
  const [showSplitPayment, setShowSplitPayment] = useState(false);

  // Tip / gratuity
  const [tipType, setTipType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [tipValue, setTipValue] = useState(0);

  // Receipt customization
  const [receiptTheme, setReceiptTheme] = useState<ReceiptTheme>({});
  const [showReceiptSettings, setShowReceiptSettings] = useState(false);

  // Loyalty
  const [loyaltyCfg, setLoyaltyCfg] = useState<LoyaltyConfig>({
    pointsPerEgp: 0.1,
    redeemRate: 0.05,
    enabled: false,
  });
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [showLoyaltySettings, setShowLoyaltySettings] = useState(false);

  // Gift card
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardApplied, setGiftCardApplied] = useState<{ code: string; amount: number } | null>(
    null
  );
  const [giftCardError, setGiftCardError] = useState('');

  // Price level
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('retail');
  const [showPriceLevelMenu, setShowPriceLevelMenu] = useState(false);

  // Tax exempt
  const [taxExempt, setTaxExempt] = useState(false);

  // Signature capture
  const [showSignature, setShowSignature] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Receipt email
  const [receiptEmail, setReceiptEmail] = useState('');
  const [showEmailReceipt, setShowEmailReceipt] = useState(false);

  // Tables (restaurant)
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);

  // Layaway
  const [showLayaway, setShowLayaway] = useState(false);
  const [layawayDeposit, setLayawayDeposit] = useState(0);
  const [layaways, setLayaways] = useState<LayawayPlan[]>([]);

  // Scale
  const [scaleReading, setScaleReading] = useState<number | null>(null);
  const [scaleLoading, setScaleLoading] = useState(false);

  // Audit trail
  const [showAudit, setShowAudit] = useState(false);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);

  // Cashier identity (for audit)
  const cashierId =
    typeof window !== 'undefined' ? localStorage.getItem('pos_cashier_id') || 'cashier' : 'cashier';
  const { user } = useAuth();

  // Shift owner name shown on the invoice: prefer the current session cashier
  // (from the gate login), then the active shift's owner, then the logged-in user.
  const shiftOwnerName: string = useMemo(() => {
    const candidates = [
      posCashier?.name,
      activeShift?.userName,
      activeShift?.user?.name,
      activeShift?.cashierName,
      activeShift?.openedBy,
      user?.name,
      user?.email,
      cashierId,
    ];
    const found = candidates.map((c) => String(c || '').trim()).find((c) => c && c !== 'cashier');
    return found || cashierId;
  }, [posCashier, activeShift, user, cashierId]);

  // ─── Live shift strip (rendered under the header quick actions) ─────────
  const shiftStrip = useMemo(() => {
    if (!activeShift) return null;
    const status = String(activeShift?.status || '').toUpperCase();
    if (!activeShift?.id && status !== 'OPEN') return null;
    // recompute on the 30s tick so elapsed time stays live
    void shiftTick;
    const openedMs = activeShift?.openedAt || activeShift?.opened_at;
    const elapsedMins = openedMs
      ? Math.max(0, Math.floor((Date.now() - new Date(openedMs).getTime()) / 60000))
      : 0;
    const totalSales = Number(activeShift?.totalSales ?? activeShift?.total_sales ?? 0) || 0;
    const ordersCount = Number(activeShift?.ordersCount ?? activeShift?.orders_count ?? 0) || 0;
    const openingAmount =
      Number(activeShift?.openingAmount ?? activeShift?.opening_amount ?? 0) || 0;
    const money = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');
    return {
      hours: Math.floor(elapsedMins / 60),
      minutes: elapsedMins % 60,
      totalSales: money(totalSales),
      ordersCount,
      expectedDrawer: money(openingAmount + totalSales),
    };
  }, [activeShift, shiftTick]);

  // Load the active shift once (for the invoice + reports + gate).
  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    apiRequest(`/shops/${shopId}/shifts/active`)
      .then((data: any) => {
        if (!cancelled) setActiveShift(data?.data ?? data ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setShiftLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // Gate submit: verify PIN against settings, open the shift (in 'open' mode)
  // and store the cashier identity (with permissions) in localStorage.
  const ADMIN_GATE_ID = '__admin__';
  const submitGate = async () => {
    if (!shopId || gateSubmitting) return;
    setGateError('');
    const isAdminLogin = gateCashierId === ADMIN_GATE_ID;
    const selected: PosCashier | undefined = isAdminLogin
      ? undefined
      : gateCashiers.find((c) => c.id === gateCashierId);
    const adminPin = loadPosSettings(shop).adminPin;
    if (!isAdminLogin) {
      if (gateMode === 'resume' && !selected) {
        setGateError('اختار الكاشير الأول');
        return;
      }
      if (gateMode === 'open' && gateCashiers.length > 0 && !selected) {
        setGateError('اختار الكاشير الأول');
        return;
      }
    }
    if (isAdminLogin) {
      if (!adminPin) {
        setGateError('مفيش رمز إدارة — اعمله من إعدادات الكاشير الأول');
        return;
      }
      if (gatePin !== adminPin) {
        setGateError('الرقم السري غير صحيح');
        return;
      }
    } else if (selected && gatePin !== selected.pin) {
      setGateError('الرقم السري غير صحيح');
      return;
    }
    setGateSubmitting(true);
    try {
      if (gateMode === 'open') {
        const resp = await apiRequest(`/shops/${shopId}/shifts`, {
          method: 'POST',
          body: JSON.stringify({ openingAmount: Math.max(0, gateOpeningCash) }),
        });
        const shift = resp?.data ?? resp ?? null;
        setActiveShift(shift && (shift.id || shift.status) ? shift : { ...shift, status: 'OPEN' });
      }
      if (isAdminLogin) {
        // صاحب المحل: كل الصلاحيات
        writeCurrentCashier({
          id: 'admin',
          name: 'الإدارة',
          permissions: ['open_shift', 'close_shift', 'returns', 'discount', 'reports'],
        });
      } else if (selected) {
        // belt & suspenders: permissions stored alongside id/name
        writeCurrentCashier({
          id: selected.id,
          name: selected.name,
          permissions: selected.permissions,
        });
      }
      setGatePin('');
      setGateOpeningCash(0);
      setGateCashierId('');
    } catch (e: any) {
      setGateError(String(e?.message || '').trim() || 'فشل بدء الوردية');
    } finally {
      setGateSubmitting(false);
    }
  };
  // ─── Z/X Report + Cash In/Out + Drawer Declaration + Quick Keys ──────────
  const [showZReport, setShowZReport] = useState(false);
  const [showXReport, setShowXReport] = useState(false);
  const [reportOrders, setReportOrders] = useState<any[]>([]);
  const [reportShift, setReportShift] = useState<any>(null);
  const [reportCashMovements, setReportCashMovements] = useState<CashMovement[]>([]);

  // Cash in/out
  const [showCashMovement, setShowCashMovement] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'in' | 'out'>('out');
  const [cashMovementAmount, setCashMovementAmount] = useState(0);
  const [cashMovementReason, setCashMovementReason] = useState('');
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);

  // Drawer declaration
  const [showDrawerDeclaration, setShowDrawerDeclaration] = useState(false);
  const [declaredCash, setDeclaredCash] = useState(0);
  const [declarationNote, setDeclarationNote] = useState('');
  const [declarations, setDeclarations] = useState<DrawerDeclaration[]>([]);

  // Quick keys / favorites
  const [quickKeyIds, setQuickKeyIds] = useState<string[]>([]);
  const [showQuickKeys, setShowQuickKeys] = useState(false);

  // ─── Cashier invoices (quick access for the shift owner) ─────────────────
  const [showInvoices, setShowInvoices] = useState(false);
  const [posInvoices, setPosInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Quick return from a POS invoice
  const [returnOrder, setReturnOrder] = useState<any | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnToStock, setReturnToStock] = useState(true);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // Edit an existing invoice: items go back to the cart; on checkout the
  // original order is fully returned and replaced by the new one.
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const playCashRegisterSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(150, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.05);
      gain2.gain.setValueAtTime(0.0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.05);
      osc2.stop(ctx.currentTime + 0.55);
    } catch {}
  };

  // ─── Offline order queue (pending orders) ────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingToast, setPendingToast] = useState('');
  const flushingRef = useRef(false);
  // set below (after flushPendingOrders is defined) — lets loadProducts/loadCustomers
  // trigger a flush on the next successful fetch without reordering hooks
  const flushPendingOrdersRef = useRef<(() => void) | null>(null);

  // Flush the offline order queue FIFO through the same endpoint. Runs on the
  // window 'online' event and on the next successful fetch (see ref below).
  const flushPendingOrders = useCallback(async () => {
    if (!shopId || flushingRef.current) return;
    const queue = readPendingOrders(shopId);
    if (queue.length === 0) return;
    flushingRef.current = true;
    try {
      let flushed = 0;
      while (queue.length > 0) {
        const next = queue[0];
        const resp = await apiRequest(`/shops/${shopId}/orders`, {
          method: 'POST',
          body: JSON.stringify(next.payload),
        });
        queue.shift();
        writePendingOrders(shopId, queue);
        flushed += 1;
        // auto-confirm queued orders too (fire-and-forget, never blocks the flush)
        const newOrderId = resp?.data?.id ?? resp?.id;
        if (newOrderId && loadPosSettings(shop).autoConfirmOrders === true) {
          apiRequest(`/shops/${shopId}/orders/${newOrderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'CONFIRMED' }),
          }).catch(() => {});
        }
      }
      if (flushed > 0) {
        setPendingCount(readPendingOrders(shopId).length);
        try {
          playCashRegisterSound();
        } catch {}
      }
    } catch {
      // still offline — leave the queue untouched
    } finally {
      flushingRef.current = false;
    }
  }, [shopId, shop]);

  useEffect(() => {
    flushPendingOrdersRef.current = () => {
      void flushPendingOrders();
    };
  }, [flushPendingOrders]);

  useEffect(() => {
    const onOnline = () => flushPendingOrdersRef.current?.();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const showPendingToast = useCallback((msg: string) => {
    setPendingToast(msg);
    try {
      window.setTimeout(() => setPendingToast(''), 6000);
    } catch {}
  }, []);

  const loadCustomers = useCallback(async () => {
    if (!shopId) return;
    setIsLoadingCustomers(true);
    // cache-first: show the saved list instantly, refresh in the background
    try {
      const cachedCustomers = readCachedList(`pos_customers_${shopId}`);
      if (cachedCustomers.length > 0) setSavedCustomers(cachedCustomers);
    } catch {}
    try {
      const data = await apiRequest(`/shops/${shopId}/customers`);
      const list = Array.isArray(data) ? data : data?.customers ? data.customers : [];
      setSavedCustomers(list);
      localStorage.setItem(`pos_customers_${shopId}`, JSON.stringify(list));
      // connection is back — flush anything queued while offline
      flushPendingOrdersRef.current?.();
    } catch {
      const cached = readCachedList(`pos_customers_${shopId}`);
      if (cached.length > 0) {
        setSavedCustomers(cached);
        setUsingOfflineData(true);
      }
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [shopId]);

  const handleOpenCustomerList = () => {
    setIsCustomerListOpen(true);
    loadCustomers();
  };

  const isRestaurant = String(shop?.category || '').toUpperCase() === 'RESTAURANT';
  const isFashion = String(shop?.category || '').toUpperCase() === 'FASHION';
  const shopAddonsDef = useMemo(() => {
    const raw = (shop as any)?.addons;
    return Array.isArray(raw) ? raw : [];
  }, [shop]);

  const loadProducts = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await apiRequest(`/shops/${shopId}/products`);
      const list = Array.isArray(data) ? data : data?.products ? data.products : [];
      setProducts(list);
      setUsingOfflineData(false);
      localStorage.setItem(`pos_products_${shopId}`, JSON.stringify(list));
      // connection is back — flush anything queued while offline (FIFO)
      flushPendingOrdersRef.current?.();
    } catch {
      // fetch failed: keep the cache (already rendered) + flag offline mode
      const cached = readCachedList(`pos_products_${shopId}`);
      if (cached.length > 0) setProducts(cached);
      setUsingOfflineData(true);
    }
  }, [shopId]);

  // Cache-first hydration: render the cached grid synchronously on mount
  // (before any fetch) so the POS paints instantly, then refresh in background.
  useEffect(() => {
    if (!shopId) return;
    const cachedProducts = readCachedList(`pos_products_${shopId}`);
    if (cachedProducts.length > 0) setProducts(cachedProducts);
    // pending orders count for the header chip
    setPendingCount(readPendingOrders(shopId).length);
  }, [shopId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ─── Held orders (suspend/resume) ───────────────────────────────────────
  const refreshHeldOrders = useCallback(() => {
    if (!shopId) return;
    setHeldOrders(HeldOrders.list(shopId));
  }, [shopId]);

  useEffect(() => {
    refreshHeldOrders();
    const handler = () => refreshHeldOrders();
    window.addEventListener('pos-held-orders:updated', handler);
    return () => window.removeEventListener('pos-held-orders:updated', handler);
  }, [refreshHeldOrders]);

  const holdCurrentOrder = useCallback(() => {
    if (cart.length === 0) return;
    const order: HeldOrder = {
      id: `held_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      savedAt: Date.now(),
      cart: cart,
      customerName,
      customerPhone,
      discountType,
      discountValue,
      paymentMethod,
    };
    HeldOrders.save(shopId, order);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentMethod('cash');
    try {
      localStorage.removeItem(`pos_cart_${shopId}`);
    } catch {}
    setShowHeldOrders(false);
  }, [cart, shopId, customerName, customerPhone, discountType, discountValue, paymentMethod]);

  const resumeHeldOrder = useCallback(
    (id: string) => {
      const order = HeldOrders.list(shopId).find((x) => x.id === id);
      if (!order) return;
      setCart(Array.isArray(order.cart) ? order.cart : []);
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setDiscountType(order.discountType || 'none');
      setDiscountValue(order.discountValue || 0);
      setPaymentMethod(order.paymentMethod || 'cash');
      HeldOrders.remove(shopId, id);
      setShowHeldOrders(false);
    },
    [shopId]
  );

  const deleteHeldOrder = useCallback(
    (id: string) => {
      HeldOrders.remove(shopId, id);
    },
    [shopId]
  );

  // ─── Barcode scanning handler + effects are defined after addToCart/processPayment below ───

  // ─── Categories ─────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(products) ? products : []).forEach((p: any) => {
      const cat = p?.category;
      const id = String(cat?.id || cat?.name || (typeof cat === 'string' ? cat : '') || '').trim();
      const name = String(cat?.name || (typeof cat === 'string' ? cat : '') || id).trim();
      if (id && !map.has(id)) map.set(id, name || id);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // ─── Products filtering + pagination ────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    const q = String(search || '')
      .trim()
      .toLowerCase();
    if (q) {
      list = list.filter((p: any) => {
        const name = String(p?.name || '').toLowerCase();
        const barcode = String(p?.barcode || p?.sku || p?.barcode_id || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || String(p?.id || '').includes(q);
      });
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p: any) => {
        const cat = p?.category;
        const id = String(
          cat?.id || cat?.name || (typeof cat === 'string' ? cat : '') || ''
        ).trim();
        return id === categoryFilter;
      });
    }
    return list;
  }, [products, search, categoryFilter]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPageSize));
  const pagedProducts = useMemo(
    () => paginate(filteredProducts, productsPage, productsPageSize),
    [filteredProducts, productsPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setProductsPage(1);
  }, [search, categoryFilter]);

  // ─── Price override (per line) ──────────────────────────────────────────
  const startPriceOverride = useCallback(
    (id: string) => {
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      setPriceOverrideId(id);
      setPriceOverrideValue(String(item.price));
    },
    [cart]
  );

  const applyPriceOverride = useCallback(() => {
    if (!priceOverrideId) return;
    const n = Number(priceOverrideValue);
    setCart((prev) =>
      prev.map((i) =>
        i.id === priceOverrideId
          ? {
              ...i,
              price: Number.isFinite(n) && n >= 0 ? n : i.price,
              priceOverride: Number.isFinite(n) && n >= 0 ? n : null,
            }
          : i
      )
    );
    setPriceOverrideId(null);
    setPriceOverrideValue('');
  }, [priceOverrideId, priceOverrideValue]);

  // Load VAT from receipt theme + advanced config
  useEffect(() => {
    if (!shopId) return;
    const theme = loadReceiptTheme(shopId);
    setReceiptTheme(theme);
    const pct = Number.isFinite(Number(theme?.vatRatePercent))
      ? Math.min(100, Math.max(0, Number(theme.vatRatePercent)))
      : 0;
    setVatRatePct(pct);
    setLoyaltyCfg(loadLoyaltyConfig(shopId));
    setTables(loadTables(shopId));
    setLayaways(loadLayaways(shopId));
    setQuickKeyIds(loadQuickKeys(shopId));
    setDeclarations(loadDrawerDeclarations(shopId));
  }, [shopId]);

  // Realtime sync between POS terminals
  useEffect(() => {
    if (!shopId) return;
    const stop = createPosSync(shopId, (msg) => {
      if (msg?.type === 'order-created' || msg?.type === 'products-updated') {
        loadProducts();
      }
    });
    return stop;
  }, [shopId, loadProducts]);

  useEffect(() => {
    if (!shopId) return;
    try {
      const raw = localStorage.getItem(`pos_cart_${shopId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setCart(parsed);
    } catch {}
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    try {
      localStorage.setItem(`pos_cart_${shopId}`, JSON.stringify(cart || []));
    } catch {}
  }, [shopId, cart]);

  const getProductStock = useCallback((product: any) => {
    const trackStock = product?.trackStock ?? product?.track_stock ?? true;
    return trackStock ? (Number.isFinite(product?.stock) ? product.stock : 0) : Infinity;
  }, []);

  const getProductEffectivePrice = useCallback((product: any) => {
    const menuVariants = product?.menuVariants ?? product?.menu_variants;
    if (Array.isArray(menuVariants) && menuVariants.length > 0) {
      let min = Infinity;
      menuVariants.forEach((t) => {
        (t?.sizes || []).forEach((s: any) => {
          const p = Number(s?.price);
          if (p > 0) min = Math.min(min, p);
        });
      });
      return min === Infinity ? Number(product?.price || 0) : min;
    }
    return Number(product?.price || 0);
  }, []);

  const addToCart = useCallback(
    (product: any, qty: number = 1) => {
      const stock = getProductStock(product);
      if (stock <= 0) return;

      const hasVariants =
        product?.menuVariants?.length > 0 ||
        product?.menu_variants?.length > 0 ||
        (isFashion && (product?.colors?.length > 0 || product?.sizes?.length > 0));

      if (hasVariants || (isRestaurant && shopAddonsDef.length > 0)) {
        setConfigProduct(product);
        setSelectedAddons([]);
        try {
          const menuVariants = (product?.menuVariants ?? product?.menu_variants) as any[];
          const firstType = Array.isArray(menuVariants) ? menuVariants[0] : undefined;
          const firstSize = Array.isArray(firstType?.sizes) ? firstType.sizes[0] : undefined;
          setSelectedMenuTypeId(String(firstType?.id || '').trim());
          setSelectedMenuSizeId(String(firstSize?.id || '').trim());
        } catch {
          setSelectedMenuTypeId('');
          setSelectedMenuSizeId('');
        }
        if (isFashion) {
          setSelectedFashionColorValue(
            Array.isArray(product?.colors) && product.colors.length > 0
              ? product.colors[0]?.value || ''
              : ''
          );
          setSelectedFashionSize(
            Array.isArray(product?.sizes) && product.sizes.length > 0
              ? product.sizes[0]?.label || product.sizes[0]?.name || ''
              : ''
          );
        }
        setIsConfigOpen(true);
        return;
      }

      const lineId = product.id;
      setCart((prev) => {
        const existing = prev.find((i) => i.id === lineId);
        if (existing)
          return prev.map((i) =>
            i.id === lineId ? { ...i, quantity: Math.min(stock, i.quantity + qty) } : i
          );
        return [
          ...prev,
          {
            id: lineId,
            productId: product.id,
            name: product.name,
            price: getProductEffectivePrice(product),
            quantity: Math.min(stock, qty),
          },
        ];
      });
    },
    [getProductStock, getProductEffectivePrice, isFashion, isRestaurant, shopAddonsDef]
  );

  const updateQuantity = useCallback(
    (id: string, delta: number) => {
      setCart((prev) =>
        prev
          .map((i) => {
            if (i.id !== id) return i;
            const product = products.find((p) => p.id === i.productId);
            const stock = getProductStock(product);
            return { ...i, quantity: Math.min(stock, Math.max(0, i.quantity + delta)) };
          })
          .filter((i) => i.quantity > 0)
      );
    },
    [products, getProductStock]
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent')
      return subtotal * (Math.min(100, Math.max(0, discountValue)) / 100);
    if (discountType === 'fixed') return Math.min(subtotal, Math.max(0, discountValue));
    return 0;
  }, [discountType, discountValue, subtotal]);

  // Loyalty redemption value
  const loyaltyRedeemValue = useMemo(() => {
    if (!loyaltyCfg.enabled || redeemPoints <= 0) return 0;
    return Math.min(computeRedeemValue(redeemPoints, loyaltyCfg), subtotal - discountAmount);
  }, [loyaltyCfg, redeemPoints, subtotal, discountAmount]);

  // Gift card applied amount
  const giftCardAmount = giftCardApplied?.amount || 0;

  // Tip / gratuity
  const tipAmount = useMemo(
    () => computeTip(subtotal, tipType, tipValue),
    [subtotal, tipType, tipValue]
  );

  const afterDiscount = Math.max(
    0,
    subtotal - discountAmount - loyaltyRedeemValue - giftCardAmount
  );
  const taxableAmount = afterDiscount;
  const vatAmount = taxExempt ? 0 : taxableAmount * (vatRatePct / 100);
  const total = taxableAmount + vatAmount + tipAmount;

  // Split payment validation
  const splitValidation = useMemo(
    () => validateSplitPayments(splitPayments, total),
    [splitPayments, total]
  );
  const usingSplitPayment = showSplitPayment && splitPayments.length > 0;

  // Loyalty points the customer will earn from this order
  const earnedPoints = useMemo(() => computeEarnedPoints(total, loyaltyCfg), [total, loyaltyCfg]);

  const itemsCount = useMemo(
    () => cart.reduce((sum, i) => sum + (Number(i?.quantity) || 0), 0),
    [cart]
  );
  const canCheckout =
    cart.length > 0 && !isProcessing && (!usingSplitPayment || splitValidation.ok);

  const handlePrintReceipt = useCallback(() => {
    if (!shopId || cart.length === 0) return;

    const escapeHtml = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
    const now = new Date();
    const dateLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const shopName = escapeHtml(shop?.name || '');
    const phone = escapeHtml(shop?.phone || '');
    const city = escapeHtml(shop?.city || '');
    const address = escapeHtml(shop?.address || '');
    const customerNameEsc = escapeHtml(customerName);
    const customerPhoneEsc = escapeHtml(customerPhone);
    const currency = escapeHtml(receiptTheme.currency || 'ج.م');
    const paperWidth = receiptTheme.paperWidth || '80mm';
    const logoUrl = receiptTheme.logoUrl || '';
    const headerMsg = escapeHtml(receiptTheme.headerMessage || '');
    const footerMsg = escapeHtml(receiptTheme.footerMessage || '');
    const showCashier = receiptTheme.showCashier !== false;
    const showQr = receiptTheme.showQrCode || false;

    const linesHtml = cart
      .map(
        (i) => `
      <tr><td style="padding: 6px 0;">${escapeHtml(i.name)}</td>
      <td style="padding: 6px 0; text-align:left;">${i.quantity}x</td>
      <td style="padding: 6px 0; text-align:left;">${fmt(i.price * i.quantity)}</td></tr>`
      )
      .join('');

    const paymentLabel = usingSplitPayment
      ? 'تقسيم: ' +
        splitPayments
          .map(
            (p) =>
              `${p.method === 'cash' ? 'كاش' : p.method === 'card' ? 'بطاقة' : p.method === 'wallet' ? 'محفظة' : 'آجل'} ${fmt(p.amount)}`
          )
          .join(' + ')
      : paymentMethod === 'cash'
        ? 'كاش'
        : paymentMethod === 'card'
          ? 'بطاقة'
          : paymentMethod === 'wallet'
            ? 'محفظة'
            : 'آجل';

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt</title>
    <style>@page{margin:8mm}body{font-family:Arial,sans-serif;direction:rtl}.wrap{max-width:${paperWidth};margin:0 auto}h1{font-size:16px;text-align:center}.meta{font-size:11px;text-align:center;margin-bottom:10px}.sep{border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse;font-size:12px}.row{display:flex;justify-content:space-between;padding:4px 0}.foot{font-size:11px;text-align:center;margin-top:10px}.logo{max-width:60mm;max-height:30mm;margin:0 auto 8px;display:block}</style>
    </head><body><div class="wrap">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="logo" alt="logo"/>` : ''}
    <h1>${shopName || 'Receipt'}</h1>
    ${headerMsg ? `<div class="meta" style="font-weight:700;margin-bottom:6px">${headerMsg}</div>` : ''}
    <div class="meta">${phone ? `<div>${phone}</div>` : ''}${city ? `<div>${city}</div>` : ''}${address ? `<div>${address}</div>` : ''}
    ${customerNameEsc || customerPhoneEsc ? `<div style="margin-top:6px;"><strong>العميل:</strong> ${customerNameEsc || '-'} ${customerPhoneEsc ? `- ${customerPhoneEsc}` : ''}</div>` : ''}
    ${selectedTableId ? `<div><strong>الطاولة:</strong> ${escapeHtml(tables.find((t) => t.id === selectedTableId)?.name || selectedTableId)}</div>` : ''}
    ${
      showCashier
        ? `<div style="margin-top:6px;"><strong>الكاشير / صاحب الوردية:</strong> ${escapeHtml(shiftOwnerName)}</div>${
            activeShift?.openedAt || activeShift?.opened_at
              ? `<div style="font-size:10px;color:#666;">الوردية مفتوحة من ${escapeHtml(
                  String(activeShift.openedAt || activeShift.opened_at)
                    .replace('T', ' ')
                    .slice(0, 16)
                )}</div>`
              : ''
          }`
        : ''
    }
    <div>${dateLabel}</div></div>
    <div class="sep"></div><table><tbody>${linesHtml}</tbody></table><div class="sep"></div>
    <div class="row"><span>المجموع الفرعي</span><span>${currency} ${fmt(subtotal)}</span></div>
    ${discountAmount > 0 ? `<div class="row" style="color:#dc2626;"><span>خصم</span><span>- ${currency} ${fmt(discountAmount)}</span></div>` : ''}
    ${loyaltyRedeemValue > 0 ? `<div class="row" style="color:#d97706;"><span>نقاط ولاء</span><span>- ${currency} ${fmt(loyaltyRedeemValue)}</span></div>` : ''}
    ${giftCardAmount > 0 ? `<div class="row" style="color:#059669;"><span>قسيمة</span><span>- ${currency} ${fmt(giftCardAmount)}</span></div>` : ''}
    ${vatRatePct > 0 && !taxExempt ? `<div class="row"><span>ضريبة ${vatRatePct}%</span><span>${currency} ${fmt(vatAmount)}</span></div>` : ''}
    ${taxExempt ? `<div class="row" style="color:#16a34a;font-size:10px;"><span>إعفاء ضريبي</span><span>${currency} 0.00</span></div>` : ''}
    ${tipAmount > 0 ? `<div class="row" style="color:#059669;"><span>إكرامية</span><span>+ ${currency} ${fmt(tipAmount)}</span></div>` : ''}
    <div class="row" style="font-weight:700;"><span>الإجمالي</span><span>${currency} ${fmt(total)}</span></div>
    <div class="row" style="font-size:11px;color:#666;margin-top:4px;"><span>الدفع</span><span>${paymentLabel}</span></div>
    ${loyaltyCfg.enabled && earnedPoints > 0 ? `<div class="row" style="font-size:10px;color:#d97706;"><span>نقاط مكتسبة</span><span>${earnedPoints}</span></div>` : ''}
    ${footerMsg ? `<div class="foot" style="margin-top:12px;font-weight:700">${footerMsg}</div>` : ''}
    ${showQr ? `<div style="text-align:center;margin-top:8px;font-size:9px;color:#999">█▀▀█ ▀▀█ ▀▀█ █▀█</div>` : ''}
    </div></body></html>`;

    try {
      printHtmlReceipt(html);
    } catch {}
  }, [
    shopId,
    shop,
    cart,
    subtotal,
    vatAmount,
    vatRatePct,
    total,
    discountAmount,
    paymentMethod,
    customerName,
    customerPhone,
    receiptTheme,
    usingSplitPayment,
    splitPayments,
    loyaltyRedeemValue,
    giftCardAmount,
    taxExempt,
    tipAmount,
    loyaltyCfg,
    earnedPoints,
    selectedTableId,
    tables,
    shiftOwnerName,
    activeShift,
  ]);

  const processPayment = async (opts?: { print?: boolean }) => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    let orderPayload: Record<string, unknown> | null = null;
    try {
      const trimmedPhone = String(customerPhone || '').trim();
      const trimmedName = String(customerName || '').trim();

      if (trimmedPhone) {
        try {
          // العميل الموحد: الباك اند بيدور بالهاتف — لو موجود يرجّع سجله (created:false)
          const custRes = await apiRequest(`/shops/${shopId}/customers`, {
            method: 'POST',
            body: JSON.stringify({
              name: trimmedName,
              phone: trimmedPhone,
              email: receiptEmail || '',
              source: 'pos',
            }),
          });
          if (custRes && custRes.created === false) {
            try {
              window.dispatchEvent(new CustomEvent('pos-toast', { detail: { message: `العميل موجود مسبقًا — تم استخدام سجل ${custRes.data?.name || ''} في النظام كله` } }));
            } catch {}
          }
        } catch {}
      }

      // Build notes with all extra info
      const notesParts: string[] = [];
      if (discountAmount > 0) notesParts.push(`discount:${discountType}:${discountAmount}`);
      if (tipAmount > 0) notesParts.push(`tip:${tipType}:${tipAmount}`);
      if (giftCardAmount > 0 && giftCardApplied)
        notesParts.push(`giftcard:${giftCardApplied.code}:${giftCardAmount}`);
      if (loyaltyRedeemValue > 0)
        notesParts.push(`loyalty_redeem:${redeemPoints}:${loyaltyRedeemValue}`);
      if (taxExempt) notesParts.push('tax_exempt');
      if (priceLevel !== 'retail') notesParts.push(`price_level:${priceLevel}`);
      if (selectedTableId) notesParts.push(`table:${selectedTableId}`);
      if (signatureData) notesParts.push('signed');
      if (usingSplitPayment)
        notesParts.push(`split:${splitPayments.map((p) => `${p.method}:${p.amount}`).join(',')}`);

      const paymentMethodValue = usingSplitPayment
        ? 'SPLIT'
        : paymentMethod === 'cash'
          ? 'COD'
          : paymentMethod === 'card'
            ? 'CARD'
            : paymentMethod === 'wallet'
              ? 'WALLET'
              : 'CREDIT';

      // Invoice edit mode: fully return the original order first, then the
      // freshly paid cart replaces it. Abort if the return fails so the
      // original invoice is never silently duplicated.
      if (editingOrder) {
        try {
          await apiRequest(`/shops/${shopId}/orders/${editingOrder.id}/returns`, {
            method: 'POST',
            body: JSON.stringify({
              reason: 'تعديل فاتورة من الكاشير',
              returnToStock: true,
              totalAmount: Number(editingOrder.total || 0),
              markReturned: true,
              items: (Array.isArray(editingOrder.items) ? editingOrder.items : []).map(
                (it: any) => ({
                  orderItemId: it.id,
                  productId: it.productId,
                  name: it.productName || '',
                  quantity: Number(it.quantity) || 0,
                  price: Number(it.price) || 0,
                })
              ),
            }),
          });
        } catch (retErr: any) {
          const msg =
            String(retErr?.message || '').trim() ||
            'فشل إرجاع الفاتورة الأصلية — لم يتم تنفيذ التعديل';
          try {
            window.alert(msg);
          } catch {}
          setIsProcessing(false);
          return;
        }
      }

      orderPayload = {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          addons: i.addons,
          variantSelection: i.variantSelection,
        })),
        total,
        paymentMethod: paymentMethodValue,
        source: 'pos',
        posShiftId: activeShift?.id || activeShift?.shiftId || undefined,
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        notes: notesParts.length > 0 ? notesParts.join('|') : undefined,
        ...(selectedTableId ? { tableId: selectedTableId } : {}),
      };

      const createdOrder = await apiRequest(`/shops/${shopId}/orders`, {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      // Auto-confirm POS orders when enabled in cashier settings
      // (fire-and-forget — never blocks or fails the sale).
      const newOrderId = createdOrder?.data?.id ?? createdOrder?.id;
      if (newOrderId && loadPosSettings(shop).autoConfirmOrders === true) {
        apiRequest(`/shops/${shopId}/orders/${newOrderId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CONFIRMED' }),
        }).catch(() => {});
      }

      // Audit + broadcast
      logAudit(shopId, {
        action: 'order_created',
        detail: `${cart.length} items`,
        cashierId,
        amount: total,
      });
      broadcastPosSync(shopId, { type: 'order-created' });
      try {
        openCashDrawer();
      } catch {}

      // Mark table as occupied if selected
      if (selectedTableId) {
        const next = tables.map((t) =>
          t.id === selectedTableId ? { ...t, status: 'occupied' as const } : t
        );
        setTables(next);
        saveTables(shopId, next);
      }

      try {
        await loadProducts();
      } catch {}

      setShowSuccess(true);
      try {
        playCashRegisterSound();
      } catch {}
      if (opts?.print) {
        try {
          handlePrintReceipt();
        } catch {}
      }
      setCart([]);
      setGiftCardApplied(null);
      setGiftCardCode('');
      setGiftCardError('');
      setRedeemPoints(0);
      setTipType('none');
      setTipValue(0);
      setSignatureData(null);
      setSelectedTableId(null);
      setSplitPayments([]);
      setShowSplitPayment(false);
      setEditingOrder(null);
      try {
        localStorage.removeItem(`pos_cart_${shopId}`);
      } catch {}
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err: any) {
      // Offline (network-type failure only — never a 4xx business error):
      // queue the full order locally; it flushes FIFO when the connection is
      // back (window 'online' event / next successful fetch).
      if (shopId && orderPayload && cart.length > 0 && !editingOrder && isNetworkError(err)) {
        enqueuePendingOrder(shopId, orderPayload);
        setPendingCount(readPendingOrders(shopId).length);
        showPendingToast(
          isArabic
            ? 'الطلب محفوظ محليًا — هيتسجل أول ما النت يرجع'
            : 'Order saved locally — it will sync when back online'
        );
        // behave like a completed sale locally: clear the cart
        setCart([]);
        setGiftCardApplied(null);
        setGiftCardCode('');
        setGiftCardError('');
        setRedeemPoints(0);
        setTipType('none');
        setTipValue(0);
        setSignatureData(null);
        setSelectedTableId(null);
        setSplitPayments([]);
        setShowSplitPayment(false);
        try {
          localStorage.removeItem(`pos_cart_${shopId}`);
        } catch {}
        return;
      }
      const msg = String(err?.message || '').trim() || 'فشل إنشاء الطلب';
      try {
        window.alert(msg);
      } catch {}
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Gift card ──────────────────────────────────────────────────────────
  const handleApplyGiftCard = async () => {
    const code = giftCardCode.trim();
    if (!code || !shopId) return;
    setGiftCardError('');
    try {
      const card = await validateGiftCard(shopId, code);
      if (!card) {
        setGiftCardError(isArabic ? 'قسيمة غير صالحة أو منتهية' : 'Invalid or expired card');
        return;
      }
      const remaining = Math.max(0, total - (giftCardApplied?.amount || 0));
      const { applied } = applyGiftCardAmount(card, remaining);
      if (applied <= 0) {
        setGiftCardError(isArabic ? 'رصيد القسيمة صفر' : 'Zero balance');
        return;
      }
      setGiftCardApplied({ code: card.code, amount: (giftCardApplied?.amount || 0) + applied });
      setGiftCardCode('');
    } catch {
      setGiftCardError(isArabic ? 'خطأ في التحقق' : 'Validation error');
    }
  };

  const removeGiftCard = () => {
    setGiftCardApplied(null);
    setGiftCardError('');
  };

  // ─── Signature capture ──────────────────────────────────────────────────
  const startSignatureDrawing = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let drawing = false;
    let last = { x: 0, y: 0 };
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    const down = (e: PointerEvent) => {
      drawing = true;
      last = getPos(e);
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drawing) return;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };
    const up = (e: PointerEvent) => {
      drawing = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);
    // Cleanup stored on canvas dataset
    (canvas as any).__cleanup = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
    };
  }, []);

  const saveSignature = () => {
    if (!signatureCanvasRef.current) return;
    const data = canvasToDataUrl(signatureCanvasRef.current);
    setSignatureData(data);
    setShowSignature(false);
    try {
      localStorage.setItem(`pos_signature_${shopId}`, data);
    } catch {}
  };

  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      clearCanvas(signatureCanvasRef.current);
      startSignatureDrawing();
    }
    setSignatureData(null);
    try {
      localStorage.removeItem(`pos_signature_${shopId}`);
    } catch {}
  };

  // ─── Scale integration ──────────────────────────────────────────────────
  const handleReadScale = async () => {
    setScaleLoading(true);
    try {
      const weight = await readScaleViaWebSerial();
      if (weight != null) setScaleReading(weight);
      else
        window.alert(isArabic ? 'تعذّر قراءة الميزان — تأكد من الاتصال' : 'Could not read scale');
    } catch {
    } finally {
      setScaleLoading(false);
    }
  };

  // ─── Receipt email ──────────────────────────────────────────────────────
  const handleEmailReceipt = () => {
    if (!receiptEmail.trim()) return;
    const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
    const lines = cart
      .map((i) => `${i.name} × ${i.quantity} = ${fmt(i.price * i.quantity)}`)
      .join('\n');
    const body = `${shop?.name || ''}\n${isArabic ? 'إجمالي' : 'Total'}: ج.م ${fmt(total)}\n${isArabic ? 'العناصر' : 'Items'}:\n${lines}`;
    emailReceiptViaMailto(
      receiptEmail.trim(),
      isArabic ? `فاتورة من ${shop?.name || ''}` : `Receipt from ${shop?.name || ''}`,
      body
    );
    setShowEmailReceipt(false);
  };

  // ─── Layaway ────────────────────────────────────────────────────────────
  const createLayaway = () => {
    if (cart.length === 0 || total <= 0) return;
    const plan: LayawayPlan = {
      id: `lay_${Date.now()}`,
      orderId: `pending_${Date.now()}`,
      total,
      deposit: Math.min(total, Math.max(0, layawayDeposit)),
      paid: Math.min(total, Math.max(0, layawayDeposit)),
      createdAt: Date.now(),
      status: 'active',
    };
    const next = [plan, ...layaways].slice(0, 50);
    setLayaways(next);
    saveLayaways(shopId, next);
    logAudit(shopId, { action: 'layaway_created', detail: plan.id, cashierId, amount: plan.total });
    setShowLayaway(false);
    setLayawayDeposit(0);
    setCart([]);
    try {
      localStorage.removeItem(`pos_cart_${shopId}`);
    } catch {}
  };

  // ─── Tables ─────────────────────────────────────────────────────────────
  const addTable = () => {
    const name = prompt(isArabic ? 'اسم الطاولة' : 'Table name');
    if (!name) return;
    const t: RestaurantTable = { id: `t_${Date.now()}`, name, seats: 4, status: 'free' };
    const next = [...tables, t];
    setTables(next);
    saveTables(shopId, next);
  };

  const selectTable = (id: string) => {
    setSelectedTableId(id);
    setShowTables(false);
    logAudit(shopId, { action: 'table_selected', detail: id, cashierId });
  };

  // ─── Price level ────────────────────────────────────────────────────────
  const applyPriceLevel = (level: PriceLevel) => {
    setPriceLevel(level);
    setShowPriceLevelMenu(false);
    // Reprice all cart items that don't have a manual override
    setCart((prev) =>
      prev.map((i) => {
        if (i.priceOverride != null) return i;
        const product = products.find((p: any) => p.id === i.productId);
        if (!product) return i;
        return { ...i, price: getPriceForLevel(product, level) };
      })
    );
    logAudit(shopId, { action: 'price_level_changed', detail: level, cashierId });
  };

  // ─── Audit trail ────────────────────────────────────────────────────────
  const showAuditTrail = () => {
    setAuditEntries(readAudit(shopId));
    setShowAudit(true);
  };

  // ─── Z-Report / X-Report ────────────────────────────────────────────────
  const loadReportData = useCallback(async () => {
    if (!shopId) return;
    try {
      const [ordersData, activeShift] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/orders`),
        apiRequest(`/shops/${shopId}/shifts/active`),
      ]);
      const allOrders =
        ordersData.status === 'fulfilled'
          ? (Array.isArray(ordersData.value)
              ? ordersData.value
              : ordersData.value?.orders
                ? ordersData.value.orders
                : []
            ).filter((o: any) => o?.source === 'pos' || o?.source === 'POS')
          : [];
      const shift = activeShift.status === 'fulfilled' ? activeShift.value : null;
      setReportOrders(allOrders);
      setReportShift(shift);
      const shiftId = shift?.id;
      setReportCashMovements(loadCashMovements(shopId, shiftId));
      setCashMovements(loadCashMovements(shopId, shiftId));
    } catch {}
  }, [shopId]);

  const openXReport = async () => {
    await loadReportData();
    setShowXReport(true);
  };
  const openZReport = async () => {
    await loadReportData();
    setShowZReport(true);
  };

  const reportData = useMemo(
    () => buildReportData(reportOrders, reportShift, reportCashMovements),
    [reportOrders, reportShift, reportCashMovements]
  );

  // ─── Cash in/out ────────────────────────────────────────────────────────
  const submitCashMovement = () => {
    if (cashMovementAmount <= 0 || !cashMovementReason.trim()) return;
    const shiftId = reportShift?.id;
    const entry = addCashMovement(shopId, shiftId, {
      type: cashMovementType,
      amount: cashMovementAmount,
      reason: cashMovementReason.trim(),
      cashierId,
    });
    setCashMovements((prev) => [entry, ...prev]);
    logAudit(shopId, {
      action: `cash_${cashMovementType}`,
      detail: cashMovementReason,
      cashierId,
      amount: cashMovementAmount,
    });
    setShowCashMovement(false);
    setCashMovementAmount(0);
    setCashMovementReason('');
  };

  // ─── Drawer declaration ─────────────────────────────────────────────────
  const submitDrawerDeclaration = () => {
    const expected = reportData.netCash;
    const diff = Number((declaredCash - expected).toFixed(2));
    const decl: DrawerDeclaration = {
      id: `dd_${Date.now()}`,
      ts: Date.now(),
      shiftId: reportShift?.id,
      declaredCash,
      expectedCash: expected,
      difference: diff,
      cashierId,
      note: declarationNote || undefined,
    };
    saveDrawerDeclaration(shopId, decl);
    setDeclarations((prev) => [decl, ...prev]);
    logAudit(shopId, {
      action: 'drawer_declaration',
      detail: `declared:${declaredCash} expected:${expected} diff:${diff}`,
      cashierId,
    });
    setShowDrawerDeclaration(false);
    setDeclaredCash(0);
    setDeclarationNote('');
  };

  // ─── Quick keys ─────────────────────────────────────────────────────────
  const quickKeyProducts = useMemo(() => {
    if (quickKeyIds.length === 0) return [];
    return products.filter((p: any) => quickKeyIds.includes(p.id)).slice(0, 12);
  }, [products, quickKeyIds]);

  const handleToggleQuickKey = (productId: string) => {
    const next = toggleQuickKey(shopId, productId);
    setQuickKeyIds(next);
  };

  // ─── Cashier invoices: list, re-print, quick return, edit ────────────────
  const loadPosInvoices = useCallback(async () => {
    if (!shopId) return;
    setInvoicesLoading(true);
    try {
      const data = await apiRequest(`/shops/${shopId}/orders`);
      const list = Array.isArray(data) ? data : data?.orders ? data.orders : [];
      const pos = (Array.isArray(list) ? list : [])
        .filter((o: any) => String(o?.source || '').toUpperCase() === 'POS')
        .slice(0, 50);
      setPosInvoices(pos);
    } catch {
      setPosInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [shopId]);

  const openInvoices = useCallback(() => {
    setShowInvoices(true);
    loadPosInvoices();
  }, [loadPosInvoices]);

  const invoiceStatusStyle = (status: any) => {
    const s = String(status || '').toUpperCase();
    if (s === 'RETURNED' || s === 'REFUNDED') return 'bg-red-50 text-red-600';
    if (s === 'PENDING' || s === 'PROCESSING') return 'bg-amber-50 text-amber-600';
    return 'bg-emerald-50 text-emerald-600';
  };

  // Re-print an existing invoice. Fetches the order's recorded returns so the
  // printed receipt always reflects them (returned items + net total).
  const reprintInvoice = useCallback(
    async (order: any) => {
      if (!order) return;
      // Latest returns recorded against this invoice (empty when none)
      let returns: any[] = [];
      try {
        const data = await apiRequest(`/shops/${shopId}/orders/${order.id}/returns`);
        returns = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      } catch {}

      const escapeHtml = (value: any) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
      const created = String(order.createdAt || '')
        .replace('T', ' ')
        .slice(0, 16);
      const items = Array.isArray(order.items) ? order.items : [];

      const originalTotal = Number(order.total || 0);
      const totalReturned = returns.reduce(
        (sum: number, r: any) => sum + Number(r?.totalAmount || 0),
        0
      );
      const netTotal = Math.max(0, originalTotal - totalReturned);
      const fullyReturned =
        String(order.status || '').toUpperCase() === 'RETURNED' ||
        String(order.status || '').toUpperCase() === 'REFUNDED' ||
        (returns.length > 0 && netTotal <= 0.009);

      // Aggregate returned quantity per item name for the returns section
      const returnedByItem = new Map<string, { name: string; qty: number; amount: number }>();
      returns.forEach((r: any) => {
        (Array.isArray(r?.items) ? r.items : []).forEach((it: any) => {
          const name = String(it.name || it.productId || '');
          const prev = returnedByItem.get(name) || { name, qty: 0, amount: 0 };
          prev.qty += Number(it.quantity) || 0;
          prev.amount += Number(it.price || 0) * Number(it.quantity || 0);
          returnedByItem.set(name, prev);
        });
      });

      const linesHtml = items
        .map(
          (it: any) =>
            `<tr><td style="padding:6px 0;">${escapeHtml(
              it.productName ||
                products.find((p: any) => p.id === it.productId)?.name ||
                it.productId
            )}</td><td style="padding:6px 0;text-align:left;">${it.quantity}x</td><td style="padding:6px 0;text-align:left;">${fmt(
              Number(it.price) * Number(it.quantity)
            )}</td></tr>`
        )
        .join('');
      const returnsHtml =
        returnedByItem.size > 0
          ? `<div class="sep"></div><div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:4px;">المرتجعات</div>
      <table><tbody>${Array.from(returnedByItem.values())
        .map(
          (r) =>
            `<tr><td style="padding:6px 0;color:#dc2626;">${escapeHtml(r.name)}</td><td style="padding:6px 0;text-align:left;color:#dc2626;">${r.qty}x</td><td style="padding:6px 0;text-align:left;color:#dc2626;">- ${fmt(r.amount)}</td></tr>`
        )
        .join('')}</tbody></table>`
          : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt</title>
      <style>@page{margin:8mm}body{font-family:Arial,sans-serif;direction:rtl}.wrap{max-width:80mm;margin:0 auto}h1{font-size:16px;text-align:center}.meta{font-size:11px;text-align:center;margin-bottom:10px}.sep{border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse;font-size:12px}.row{display:flex;justify-content:space-between;padding:4px 0}.foot{font-size:11px;text-align:center;margin-top:10px}</style>
      </head><body><div class="wrap">
      <h1>${escapeHtml(shop?.name || 'Receipt')}</h1>
      <div class="meta">
      <div><strong>فاتورة كاشير #${escapeHtml(String(order.id || '').slice(0, 8))}</strong></div>
      ${order.customerPhone ? `<div>العميل: ${escapeHtml(order.customerPhone)}</div>` : ''}
      <div>${escapeHtml(created)}</div>
      ${shiftOwnerName ? `<div>الكاشير: ${escapeHtml(shiftOwnerName)}</div>` : ''}
      ${fullyReturned ? '<div style="color:#dc2626;font-weight:700">مرتجعة بالكامل</div>' : returns.length > 0 ? '<div style="color:#d97706;font-weight:700">مرتجع جزئي</div>' : ''}
      </div>
      <div class="sep"></div><table><tbody>${linesHtml}</tbody></table>
      ${returnsHtml}
      <div class="sep"></div>
      <div class="row"><span>الإجمالي الأصلي</span><span>ج.م ${fmt(originalTotal)}</span></div>
      ${totalReturned > 0 ? `<div class="row" style="color:#dc2626;"><span>إجمالي المرتجع</span><span>- ج.م ${fmt(totalReturned)}</span></div>` : ''}
      <div class="row" style="font-weight:700;"><span>${totalReturned > 0 ? 'الصافي بعد المرتجع' : 'الإجمالي'}</span><span>ج.م ${fmt(totalReturned > 0 ? netTotal : originalTotal)}</span></div>
      <div class="foot">شكرًا لتعاملكم معنا</div>
      </div></body></html>`;
      try {
        printHtmlReceipt(html);
      } catch {}
    },
    [shop, products, shiftOwnerName, shopId]
  );

  const startReturn = useCallback((order: any) => {
    const qtys: Record<string, number> = {};
    (Array.isArray(order?.items) ? order.items : []).forEach((it: any) => {
      qtys[String(it.id)] = 0;
    });
    setReturnQtys(qtys);
    setReturnToStock(true);
    setReturnReason('');
    setReturnOrder(order);
  }, []);

  const returnTotal = useMemo(() => {
    if (!returnOrder) return 0;
    return (Array.isArray(returnOrder.items) ? returnOrder.items : []).reduce(
      (sum: number, it: any) => sum + (returnQtys[String(it.id)] || 0) * Number(it.price || 0),
      0
    );
  }, [returnOrder, returnQtys]);

  const submitReturn = async () => {
    if (!returnOrder || !shopId || returnSubmitting) return;
    const items = (Array.isArray(returnOrder.items) ? returnOrder.items : [])
      .filter((it: any) => (returnQtys[String(it.id)] || 0) > 0)
      .map((it: any) => ({
        orderItemId: it.id,
        productId: it.productId,
        name: it.productName || '',
        quantity: returnQtys[String(it.id)],
        price: Number(it.price) || 0,
      }));
    if (items.length === 0) return;
    const allReturned = items.every((it: any, idx: number) => {
      const orig = (returnOrder.items || []).find((x: any) => x.id === it.orderItemId);
      return orig ? it.quantity >= Number(orig.quantity) : false;
    });
    setReturnSubmitting(true);
    try {
      await apiRequest(`/shops/${shopId}/orders/${returnOrder.id}/returns`, {
        method: 'POST',
        body: JSON.stringify({
          reason: returnReason.trim() || 'مرتجع كاشير',
          returnToStock,
          totalAmount: Number(returnTotal.toFixed(2)),
          markReturned: allReturned,
          items,
        }),
      });
      logAudit(shopId, {
        action: 'pos_return_created',
        detail: `order:${returnOrder.id} items:${items.length}`,
        cashierId,
        amount: returnTotal,
      });
      // إشعار مرتجع — طباعة تلقائية (iframe — مش بيتمنع من المتصفح)
      try {
        printHtmlReceipt(
          buildReturnReceiptHtml({
            shopName: String(shop?.name || ''),
            orderNo: String(returnOrder.id || ''),
            cashierName: posCashier?.name || shiftOwnerName,
            items: items.map((it: any) => ({
              name: it.name || String(it.productId || ''),
              qty: it.quantity,
              amount: Number(it.price) * Number(it.quantity),
            })),
            total: Number(returnTotal.toFixed(2)),
            reason: returnReason.trim() || undefined,
          })
        );
      } catch {}
      setReturnOrder(null);
      loadPosInvoices();
      loadProducts();
      try {
        window.alert('تم تسجيل المرتجع بنجاح');
      } catch {}
    } catch (err: any) {
      const msg = String(err?.message || '').trim() || 'فشل تسجيل المرتجع';
      try {
        window.alert(msg);
      } catch {}
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Load an existing invoice back into the cart for editing. On checkout the
  // original order is returned in full and the edited cart becomes a new one.
  const startEditOrder = useCallback(
    (order: any) => {
      const items: CartItem[] = (Array.isArray(order?.items) ? order.items : []).map((it: any) => ({
        id: `${it.productId}__${it.id}`,
        productId: it.productId,
        name:
          it.productName ||
          products.find((p: any) => p.id === it.productId)?.name ||
          String(it.productId),
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      }));
      setCart(items);
      setCustomerPhone(String(order?.customerPhone || ''));
      setEditingOrder(order);
      setShowInvoices(false);
      setReturnOrder(null);
    },
    [products]
  );

  // ─── Barcode scanning (defined here so it can reference addToCart) ───────
  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const trimmed = String(code || '').trim();
      if (!trimmed) return;
      const match = products.find((p: any) => {
        const barcode = String(p?.barcode || p?.sku || p?.barcode_id || '').trim();
        if (barcode && barcode === trimmed) return true;
        return (
          String(p?.id || '').startsWith(trimmed) ||
          String(p?.name || '').toLowerCase() === trimmed.toLowerCase()
        );
      });
      if (match) {
        addToCart(match, 1);
        setSearch('');
      } else {
        setSearch(trimmed);
        try {
          navigator.vibrate?.(200);
        } catch {}
      }
    },
    [products, addToCart]
  );

  // USB HID scanner listener
  useEffect(() => {
    if (!shopId) return;
    if (!barcodeListening) {
      if (usbScannerRef.current) {
        usbScannerRef.current.stop();
        usbScannerRef.current = null;
      }
      return;
    }
    usbScannerRef.current = startUsbBarcodeListener(handleBarcodeScanned, {
      minChars: 4,
      maxGapMs: 40,
    });
    return () => {
      if (usbScannerRef.current) {
        usbScannerRef.current.stop();
        usbScannerRef.current = null;
      }
    };
  }, [barcodeListening, shopId, handleBarcodeScanned]);

  // Camera scanner lifecycle
  useEffect(() => {
    if (!showCameraScanner) {
      if (cameraScannerRef.current) {
        cameraScannerRef.current.stop();
        cameraScannerRef.current = null;
      }
      setCameraError('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!cameraVideoRef.current) return;
        cameraScannerRef.current = await startCameraBarcodeListener((code) => {
          handleBarcodeScanned(code);
          setShowCameraScanner(false);
        }, cameraVideoRef.current);
        if (cancelled && cameraScannerRef.current) {
          cameraScannerRef.current.stop();
          cameraScannerRef.current = null;
        }
      } catch (e: any) {
        setCameraError(String(e?.message || 'تعذّر تشغيل الكاميرا'));
      }
    })();
    return () => {
      cancelled = true;
      if (cameraScannerRef.current) {
        cameraScannerRef.current.stop();
        cameraScannerRef.current = null;
      }
    };
  }, [showCameraScanner, handleBarcodeScanned]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId) return;
    const unbind = bindShortcuts([
      {
        key: 'F2',
        handler: () => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        },
      },
      {
        key: 'F4',
        handler: () => {
          if (cart.length > 0) processPayment();
        },
      },
      { key: 'F6', handler: () => holdCurrentOrder() },
      { key: 'F7', handler: () => setShowHeldOrders(true) },
      { key: 'F8', handler: () => setBarcodeListening((v) => !v) },
      { key: 'F9', handler: () => handlePrintReceipt() },
      { key: 'F10', handler: () => setIsCustomerCardOpen(true) },
      { key: 'F11', handler: () => setShowPaymentMethods((v) => !v) },
      { key: 'F12', handler: () => setShowDiscount((v) => !v) },
      { key: 'F3', handler: () => setShowSplitPayment((v) => !v) },
      {
        key: 'F5',
        handler: () => {
          setShowSignature(true);
          setTimeout(startSignatureDrawing, 100);
        },
      },
      {
        key: 'Escape',
        handler: () => {
          setIsConfigOpen(false);
          setIsCustomerCardOpen(false);
          setIsCustomerListOpen(false);
          setShowHeldOrders(false);
          setShowCameraScanner(false);
          setPriceOverrideId(null);
          setShowReceiptSettings(false);
          setShowLoyaltySettings(false);
          setShowSignature(false);
          setShowEmailReceipt(false);
          setShowTables(false);
          setShowLayaway(false);
          setShowAudit(false);
          setShowPriceLevelMenu(false);
          setShowSplitPayment(false);
          setShowInvoices(false);
          setReturnOrder(null);
        },
      },
      {
        key: 'p',
        ctrl: true,
        handler: () => {
          handlePrintReceipt();
        },
      },
    ]);
    return unbind;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shopId,
    cart,
    customerName,
    customerPhone,
    discountAmount,
    paymentMethod,
    subtotal,
    vatAmount,
    vatRatePct,
    total,
    splitPayments,
    showSplitPayment,
  ]);

  // (filteredProducts + pagination are defined above with the new POS features)

  // ===== Cart content (shared between desktop sidebar and mobile sheet) =====
  const cartContent = (
    <>
      <div className="p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#BD00FF]/10 p-2.5 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-[#BD00FF]" />
            </div>
            <h2 className="text-xl md:text-2xl font-black">{isArabic ? 'السلة' : 'Cart'}</h2>
          </div>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black">
            {cart.length} {isArabic ? 'صنف' : 'items'}
          </span>
        </div>
        {editingOrder && (
          <div className="mt-3 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="text-[11px] font-black text-amber-700 flex items-center gap-1.5">
              <Receipt size={13} />
              {isArabic
                ? `بتعدّل الفاتورة #${String(editingOrder.id || '').slice(0, 8)} — عند الدفع هتترجع الأصلية وتتسجل الجديدة`
                : `Editing invoice #${String(editingOrder.id || '').slice(0, 8)}`}
            </span>
            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              className="text-[10px] font-black text-amber-600 hover:text-amber-800 underline"
            >
              {isArabic ? 'إلغاء التعديل' : 'Cancel'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        <AnimatePresence mode="popLayout">
          {cart.map((item) => (
            <MotionDiv
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key={item.id}
              className="bg-white border border-slate-100 p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 text-right">
                  <h4 className="font-black text-slate-900 leading-tight mb-0.5 text-sm md:text-base">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <p className="text-[#BD00FF] font-black text-xs md:text-sm">
                      ج.م {Number(item.price || 0).toFixed(2)}
                    </p>
                    {item.priceOverride != null && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        {isArabic ? 'سعر مخصص' : 'custom'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startPriceOverride(item.id)}
                      className="text-[10px] font-black text-slate-400 hover:text-[#BD00FF] transition-colors"
                      title={isArabic ? 'تعديل السعر' : 'Override price'}
                    >
                      <Tag size={11} className="inline" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-[#BD00FF] hover:text-[#BD00FF] transition-all active:scale-90"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="font-black text-base md:text-lg w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all active:scale-90"
                  >
                    <Minus size={18} />
                  </button>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 text-sm md:text-base">
                    ج.م {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </AnimatePresence>

        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
            <ShoppingCart size={64} className="mb-4 opacity-20" />
            <p className="font-black text-lg">{isArabic ? 'السلة فارغة' : 'Cart is empty'}</p>
          </div>
        )}
      </div>

      <div className="p-3 md:p-6 bg-white border-t border-slate-100 space-y-3">
        {/* Discount */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDiscount((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Tag size={14} />
                {isArabic ? 'خصم' : 'Discount'}
              </span>
              <span className="flex items-center gap-1.5">
                {discountAmount > 0 ? (
                  <span className="text-red-500">- ج.م {discountAmount.toFixed(2)}</span>
                ) : (
                  <span className="text-slate-300">{isArabic ? 'إضافة' : 'Add'}</span>
                )}
                {showDiscount ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showDiscount && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pb-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="text-xs font-black border rounded-xl px-2 py-2 outline-none bg-slate-50"
                    >
                      <option value="none">{isArabic ? 'بدون' : 'None'}</option>
                      <option value="percent">%</option>
                      <option value="fixed">{isArabic ? 'مبلغ' : 'Amount'}</option>
                    </select>
                    {discountType !== 'none' && (
                      <input
                        type="number"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder={
                          discountType === 'percent' ? '%' : isArabic ? 'مبلغ' : 'Amount'
                        }
                        className="flex-1 text-xs font-black border rounded-xl px-3 py-2 outline-none bg-slate-50 text-center"
                        min={0}
                        max={discountType === 'percent' ? 100 : undefined}
                      />
                    )}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Payment method */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPaymentMethods((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                {paymentMethod === 'cash' ? (
                  <Banknote size={14} />
                ) : paymentMethod === 'card' ? (
                  <CreditCard size={14} />
                ) : paymentMethod === 'wallet' ? (
                  <Wallet size={14} />
                ) : (
                  <Clock size={14} />
                )}
                {isArabic ? 'طريقة الدفع' : 'Payment Method'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-700">
                  {paymentMethod === 'cash'
                    ? isArabic
                      ? 'كاش'
                      : 'Cash'
                    : paymentMethod === 'card'
                      ? isArabic
                        ? 'بطاقة'
                        : 'Card'
                      : paymentMethod === 'wallet'
                        ? isArabic
                          ? 'محفظة'
                          : 'Wallet'
                        : isArabic
                          ? 'آجل'
                          : 'Credit'}
                </span>
                {showPaymentMethods ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showPaymentMethods && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-1.5 pb-2">
                    {(
                      [
                        { id: 'cash', label: isArabic ? 'كاش' : 'Cash', icon: Banknote },
                        { id: 'card', label: isArabic ? 'بطاقة' : 'Card', icon: CreditCard },
                        { id: 'wallet', label: isArabic ? 'محفظة' : 'Wallet', icon: Wallet },
                        { id: 'credit', label: isArabic ? 'آجل' : 'Credit', icon: Clock },
                      ] as const
                    ).map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(pm.id);
                            setShowPaymentMethods(false);
                          }}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-black transition-all ${paymentMethod === pm.id ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                          <Icon size={16} />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Advanced features — collapsible (closed by default) */}
        {cart.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`w-full flex items-center justify-between text-xs font-black transition-colors py-1.5 px-2 rounded-xl border ${showAdvanced ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5">
                <Sliders size={14} />
                {isArabic ? 'خيارات متقدمة' : 'Advanced options'}
              </span>
              <span className="flex items-center gap-1.5">
                {!showAdvanced &&
                  (usingSplitPayment ||
                    taxExempt ||
                    priceLevel !== 'retail' ||
                    (loyaltyCfg.enabled && redeemPoints > 0)) && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#BD00FF]"
                      title={isArabic ? 'خيارات مفعّلة' : 'Active'}
                    />
                  )}
                {showAdvanced ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setShowSplitPayment((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${usingSplitPayment ? 'bg-[#BD00FF]/10 border-[#BD00FF] text-[#BD00FF]' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'تقسيم الدفع' : 'Split payment'}
                    >
                      <CreditCard size={12} /> {isArabic ? 'تقسيم' : 'Split'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDiscount((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${discountAmount > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'إكرامية' : 'Tip'}
                    >
                      <DollarSign size={12} /> {isArabic ? 'إكرامية' : 'Tip'}
                    </button>
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => setShowLoyaltySettings(true)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${loyaltyCfg.enabled ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'نقاط الولاء' : 'Loyalty'}
                      >
                        <Crown size={12} /> {isArabic ? 'ولاء' : 'Loyalty'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => {
                          const c = prompt(isArabic ? 'كود القسيمة' : 'Gift card code');
                          if (c) {
                            setGiftCardCode(c);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${giftCardAmount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'قسيمة شراء' : 'Gift card'}
                      >
                        <Gift size={12} /> {isArabic ? 'قسيمة' : 'Gift'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPriceLevelMenu((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${priceLevel !== 'retail' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'مستوى السعر' : 'Price level'}
                    >
                      <Tag size={12} />{' '}
                      {priceLevel === 'retail'
                        ? isArabic
                          ? 'تجزئة'
                          : 'Retail'
                        : priceLevel === 'wholesale'
                          ? isArabic
                            ? 'جملة'
                            : 'Wholesale'
                          : isArabic
                            ? 'موظفين'
                            : 'Employee'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxExempt((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${taxExempt ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'إعفاء ضريبي' : 'Tax exempt'}
                    >
                      <ShieldCheck size={12} /> {isArabic ? 'إعفاء' : 'Exempt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignature(true);
                        setTimeout(startSignatureDrawing, 100);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${signatureData ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'توقيع العميل' : 'Signature'}
                    >
                      <Users size={12} /> {isArabic ? 'توقيع' : 'Sign'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailReceipt(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'إرسال بالبريد' : 'Email receipt'}
                    >
                      <Mail size={12} /> {isArabic ? 'بريد' : 'Email'}
                    </button>
                    {isRestaurant && (
                      <button
                        type="button"
                        onClick={() => setShowTables(true)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${selectedTableId ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'الطاولات' : 'Tables'}
                      >
                        <Table2 size={12} />{' '}
                        {selectedTableId
                          ? tables.find((t) => t.id === selectedTableId)?.name
                          : isArabic
                            ? 'طاولة'
                            : 'Table'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => setShowLayaway(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                        title={isArabic ? 'بيع بالتقسيط' : 'Layaway'}
                      >
                        <Clock size={12} /> {isArabic ? 'تقسيط' : 'Layaway'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={handleReadScale}
                        disabled={scaleLoading}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        title={isArabic ? 'قراءة ميزان' : 'Scale'}
                      >
                        <Scale size={12} />{' '}
                        {scaleLoading
                          ? '...'
                          : scaleReading != null
                            ? `${scaleReading}kg`
                            : isArabic
                              ? 'ميزان'
                              : 'Scale'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowReceiptSettings(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'إعدادات الفاتورة' : 'Receipt settings'}
                    >
                      <Settings2 size={12} /> {isArabic ? 'فاتورة' : 'Receipt'}
                    </button>
                    <button
                      type="button"
                      onClick={showAuditTrail}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'سجل العمليات' : 'Audit trail'}
                    >
                      <BarChart3 size={12} /> {isArabic ? 'سجل' : 'Audit'}
                    </button>
                    <button
                      type="button"
                      onClick={openXReport}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"
                      title={isArabic ? 'تقرير منتصف اليوم (X)' : 'X-Report (mid-day)'}
                    >
                      <FileText size={12} /> X
                    </button>
                    <button
                      type="button"
                      onClick={openZReport}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                      title={isArabic ? 'تقرير نهاية اليوم (Z)' : 'Z-Report (end of day)'}
                    >
                      <FileText size={12} /> Z
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashMovementType('out');
                        setShowCashMovement(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'مصروف/إيداع نقدي' : 'Cash in/out'}
                    >
                      <ArrowDownCircle size={12} /> {isArabic ? 'نقدي' : 'Cash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadReportData();
                        setShowDrawerDeclaration(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'جرد الصندوق' : 'Drawer declaration'}
                    >
                      <Calculator size={12} /> {isArabic ? 'جرد' : 'Declare'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickKeys((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${showQuickKeys && quickKeyProducts.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'أزرار سريعة' : 'Quick keys'}
                    >
                      <Zap size={12} /> {isArabic ? 'سريع' : 'Quick'}
                    </button>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Quick keys bar */}
        {showQuickKeys && quickKeyProducts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {quickKeyProducts.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p, 1)}
                className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black hover:bg-amber-100 transition-all active:scale-95"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Tip section — collapsible */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTipSection((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} />
                {isArabic ? 'إكرامية' : 'Tip'}
              </span>
              <span className="flex items-center gap-1.5">
                {tipAmount > 0 ? (
                  <span className="text-emerald-600">+ ج.م {tipAmount.toFixed(2)}</span>
                ) : (
                  <span className="text-slate-300">{isArabic ? 'إضافة' : 'Add'}</span>
                )}
                {showTipSection ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showTipSection && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 pb-2">
                    <select
                      value={tipType}
                      onChange={(e) => setTipType(e.target.value as any)}
                      className="text-[10px] font-black border rounded-lg px-1.5 py-1 outline-none bg-slate-50"
                    >
                      <option value="none">{isArabic ? 'بدون' : 'None'}</option>
                      <option value="percent">%</option>
                      <option value="fixed">{isArabic ? 'مبلغ' : 'Amount'}</option>
                    </select>
                    {tipType !== 'none' && (
                      <input
                        type="number"
                        value={tipValue || ''}
                        onChange={(e) => setTipValue(Number(e.target.value) || 0)}
                        placeholder={tipType === 'percent' ? '%' : isArabic ? 'مبلغ' : 'Amount'}
                        className="w-16 text-[10px] font-black border rounded-lg px-2 py-1 outline-none bg-slate-50 text-center"
                        min={0}
                      />
                    )}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Split payment section */}
        {usingSplitPayment && (
          <div className="p-3 rounded-xl bg-[#BD00FF]/5 border border-[#BD00FF]/20 space-y-2">
            <div className="text-[10px] font-black text-[#BD00FF] flex items-center gap-1.5">
              <CreditCard size={12} />
              {isArabic ? 'تقسيم الدفع' : 'Split Payment'}
            </div>
            {(['cash', 'card', 'wallet', 'credit'] as PaymentMethod[]).map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-600 w-12">
                  {m === 'cash'
                    ? isArabic
                      ? 'كاش'
                      : 'Cash'
                    : m === 'card'
                      ? isArabic
                        ? 'بطاقة'
                        : 'Card'
                      : m === 'wallet'
                        ? isArabic
                          ? 'محفظة'
                          : 'Wallet'
                        : isArabic
                          ? 'آجل'
                          : 'Credit'}
                </span>
                <input
                  type="number"
                  value={splitPayments.find((s) => s.method === m)?.amount || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setSplitPayments((prev) => {
                      const next = prev.filter((s) => s.method !== m);
                      return v > 0 ? [...next, { method: m, amount: v }] : next;
                    });
                  }}
                  placeholder="0"
                  className="flex-1 text-[10px] font-black border rounded-lg px-2 py-1.5 outline-none bg-white text-center"
                  min={0}
                />
              </div>
            ))}
            <div
              className={`text-[10px] font-black ${splitValidation.ok ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {isArabic ? 'المجموع' : 'Sum'}: ج.م {splitValidation.sum.toFixed(2)} /{' '}
              {total.toFixed(2)}{' '}
              {splitValidation.ok
                ? '✓'
                : ` (${splitValidation.diff > 0 ? '+' : ''}${splitValidation.diff})`}
            </div>
          </div>
        )}

        {/* Gift card applied */}
        {giftCardAmount > 0 && giftCardApplied && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1.5">
              <Gift size={12} />
              {isArabic ? 'قسيمة' : 'Gift'}: {giftCardApplied.code}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-600">
                - ج.م {giftCardAmount.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={removeGiftCard}
                className="text-red-400 hover:text-red-600"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Loyalty redemption */}
        {loyaltyCfg.enabled && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-[10px] font-black text-amber-700 flex items-center gap-1.5">
              <Crown size={12} />
              {isArabic ? 'استبدال نقاط' : 'Redeem points'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={redeemPoints || ''}
                onChange={(e) => setRedeemPoints(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-16 text-[10px] font-black border rounded-lg px-2 py-1 outline-none bg-white text-center"
                min={0}
              />
              {loyaltyRedeemValue > 0 && (
                <span className="text-[10px] font-black text-amber-600">
                  - ج.م {loyaltyRedeemValue.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 font-bold text-sm md:text-base">
            <span>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>ج.م {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-bold text-sm md:text-base">
              <span>{isArabic ? 'خصم' : 'Discount'}</span>
              <span>- ج.م {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {loyaltyRedeemValue > 0 && (
            <div className="flex justify-between text-amber-600 font-bold text-sm">
              <span>{isArabic ? 'نقاط ولاء' : 'Loyalty'}</span>
              <span>- ج.م {loyaltyRedeemValue.toFixed(2)}</span>
            </div>
          )}
          {giftCardAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold text-sm">
              <span>{isArabic ? 'قسيمة' : 'Gift card'}</span>
              <span>- ج.م {giftCardAmount.toFixed(2)}</span>
            </div>
          )}
          {vatRatePct > 0 && !taxExempt && (
            <div className="flex justify-between text-slate-500 font-bold text-sm md:text-base">
              <span>{isArabic ? `ضريبة ${vatRatePct}%` : `VAT ${vatRatePct}%`}</span>
              <span>ج.م {vatAmount.toFixed(2)}</span>
            </div>
          )}
          {taxExempt && vatRatePct > 0 && (
            <div className="flex justify-between text-green-600 font-bold text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} />
                {isArabic ? 'إعفاء ضريبي' : 'Tax exempt'}
              </span>
              <span>ج.م 0.00</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold text-sm">
              <span>{isArabic ? 'إكرامية' : 'Tip'}</span>
              <span>+ ج.م {tipAmount.toFixed(2)}</span>
            </div>
          )}
          {loyaltyCfg.enabled && earnedPoints > 0 && (
            <div className="flex justify-between text-amber-600 font-bold text-[10px]">
              <span className="flex items-center gap-1">
                <Crown size={10} />
                {isArabic ? `سيربح ${earnedPoints} نقطة` : `Earns ${earnedPoints} pts`}
              </span>
              <span></span>
            </div>
          )}
          <div className="flex justify-between items-end pt-1">
            <span className="text-lg md:text-2xl font-black text-slate-900">
              {isArabic ? 'الإجمالي' : 'Total'}
            </span>
            <span className="text-xl md:text-3xl font-black text-[#BD00FF]">
              ج.م {total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => processPayment({ print: true })}
            className="w-full py-4 md:py-6 bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white rounded-2xl md:rounded-3xl font-black text-base md:text-xl shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing
              ? isArabic
                ? 'جاري...'
                : 'Processing...'
              : isArabic
                ? 'دفع وطباعة'
                : 'Pay & Print'}
          </button>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <button
              type="button"
              disabled={!canCheckout}
              onClick={() => processPayment()}
              className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-2xl md:rounded-3xl font-black text-sm md:text-base shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isArabic ? 'دفع فقط' : 'Pay Only'}
            </button>
            <button
              type="button"
              disabled={!canCheckout}
              onClick={handlePrintReceipt}
              className="w-full py-3 md:py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl md:rounded-3xl font-black text-sm md:text-base shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer size={16} className="md:w-5 md:h-5" /> {isArabic ? 'طباعة فقط' : 'Print Only'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[200] bg-white flex flex-col md:flex-row font-sans text-right overflow-hidden"
      dir="rtl"
    >
      {/* Products side */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <header className="p-3 md:p-6 bg-white border-b flex items-center gap-2 md:gap-4 flex-wrap">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl shrink-0">
            <ChevronRight />
          </Link>
          <div className="flex-1 relative min-w-[150px]">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isArabic ? 'بحث عن منتج... (F2)' : 'Search products... (F2)'}
              className="w-full bg-slate-50 border rounded-2xl py-2.5 md:py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-[#BD00FF] text-sm md:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryFilter((v) => !v)}
                className={`p-2.5 md:p-3 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all ${categoryFilter !== 'all' ? 'bg-[#BD00FF]/10 border-[#BD00FF] text-[#BD00FF]' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                title={isArabic ? 'تصنيفات' : 'Categories'}
              >
                <Filter size={16} />
                <span className="hidden md:inline">
                  {categoryFilter === 'all'
                    ? isArabic
                      ? 'الكل'
                      : 'All'
                    : categories.find((c) => c.id === categoryFilter)?.name || '...'}
                </span>
              </button>
              {showCategoryFilter && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('all');
                      setShowCategoryFilter(false);
                    }}
                    className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 ${categoryFilter === 'all' ? 'text-[#BD00FF]' : 'text-slate-700'}`}
                  >
                    {isArabic ? 'كل التصنيفات' : 'All categories'}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(c.id);
                        setShowCategoryFilter(false);
                      }}
                      className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 border-t border-slate-50 ${categoryFilter === c.id ? 'text-[#BD00FF]' : 'text-slate-700'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsCustomerCardOpen(true)}
              className="bg-white border rounded-r-2xl py-3 px-4 w-32 md:w-36 outline-none flex items-center justify-center gap-2 font-black text-sm hover:bg-slate-50 border-l-0"
              title={isArabic ? 'بيانات العميل (F10)' : 'Customer (F10)'}
            >
              <UserPlus size={18} />
              {String(customerPhone || '').trim()
                ? isArabic
                  ? 'تعديل'
                  : 'Edit'
                : isArabic
                  ? 'عميل'
                  : 'Customer'}
            </button>
            <button
              type="button"
              onClick={handleOpenCustomerList}
              className="bg-white border rounded-l-2xl py-3 px-3 outline-none flex items-center justify-center hover:bg-slate-50 border-r-0 text-slate-500 hover:text-[#BD00FF]"
              title={isArabic ? 'اختيار عميل' : 'Select customer'}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* POS feature buttons: hold, resume, barcode */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={holdCurrentOrder}
              disabled={cart.length === 0}
              className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5 text-xs font-black text-amber-700 disabled:opacity-40"
              title={isArabic ? 'تعليق الطلب (F6)' : 'Hold order (F6)'}
            >
              <Pause size={16} className="md:hidden" />
              <Pause size={18} className="hidden md:block" />
              <span className="hidden md:inline">{isArabic ? 'تعليق' : 'Hold'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHeldOrders(true)}
              className="relative p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
              title={isArabic ? 'الطلبات المعلقة (F7)' : 'Held orders (F7)'}
            >
              <Play size={16} className="md:hidden" />
              <Play size={18} className="hidden md:block" />
              <span className="hidden md:inline">{isArabic ? 'معلقة' : 'Held'}</span>
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {heldOrders.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setBarcodeListening((v) => !v)}
              className={`p-2.5 md:p-3 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-black ${barcodeListening ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
              title={isArabic ? 'قارئ الباركود USB (F8)' : 'USB barcode (F8)'}
            >
              <ScanLine size={16} className="md:hidden" />
              <ScanLine size={18} className="hidden md:block" />
              <span className="hidden md:inline">
                {barcodeListening ? (isArabic ? 'يعمل' : 'On') : isArabic ? 'باركود' : 'Scan'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
              title={isArabic ? 'مسح بالكاميرا' : 'Camera scan'}
            >
              <Camera size={16} className="md:hidden" />
              <Camera size={18} className="hidden md:block" />
            </button>
          </div>

          {/* Quick action buttons — hidden while the shift/cashier gate is up */}
          {!isGated && (
            <div className="flex items-center gap-1.5 md:gap-2">
              {posCashier?.name && (
                <div
                  className="p-2.5 md:p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-1.5 text-xs font-black text-[#BD00FF]"
                  title={isArabic ? 'الكاشير الحالي' : 'Current cashier'}
                >
                  <UserRound size={16} className="md:hidden" />
                  <UserRound size={18} className="hidden md:block" />
                  <span className="hidden md:inline">
                    {isArabic ? `الكاشير: ${posCashier.name}` : `Cashier: ${posCashier.name}`}
                  </span>
                  <span className="md:hidden">{posCashier.name}</span>
                </div>
              )}
              {pendingCount > 0 && (
                <div
                  className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-xs font-black text-amber-700"
                  title={
                    isArabic
                      ? 'طلبات محفوظة محليًا في انتظار المزامنة'
                      : 'Orders saved locally, pending sync'
                  }
                >
                  <CloudOff size={16} className="md:hidden" />
                  <CloudOff size={18} className="hidden md:block" />
                  <span className="hidden md:inline">
                    {isArabic ? `${pendingCount} طلب معلق` : `${pendingCount} pending`}
                  </span>
                  <span className="md:hidden">{pendingCount}</span>
                </div>
              )}
              <button
                type="button"
                onClick={openInvoices}
                className="p-2.5 md:p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#0098a8] hover:bg-[#00E5FF]/20 transition-all flex items-center gap-1.5 text-xs font-black"
                title={isArabic ? 'فواتير الكاشير — رجوع سريع وتعديل' : 'Cashier invoices'}
              >
                <Receipt size={16} className="md:hidden" />
                <Receipt size={18} className="hidden md:block" />
                <span className="hidden md:inline">{isArabic ? 'فواتير' : 'Invoices'}</span>
              </button>
              <Link
                href="/dashboard/sales"
                className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
                title={isArabic ? 'الفواتير' : 'Invoices'}
              >
                <Receipt size={16} className="md:hidden" />
                <Receipt size={18} className="hidden md:block" />
                <span className="hidden md:inline">{isArabic ? 'الفواتير' : 'Invoices'}</span>
              </Link>
              <Link
                href="/dashboard/sales"
                className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
                title={isArabic ? 'مرتجع من الطلبات' : 'Return from Orders'}
              >
                <RotateCcw size={16} className="md:hidden" />
                <RotateCcw size={18} className="hidden md:block" />
                <span className="hidden md:inline">
                  {isArabic ? 'مرتجع من الطلبات' : 'Return from Orders'}
                </span>
              </Link>
              <Link
                href="/dashboard/pos/shifts"
                className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
                title={isArabic ? 'ورديتي' : 'My Shift'}
              >
                <Clock size={16} className="md:hidden" />
                <Clock size={18} className="hidden md:block" />
                <span className="hidden md:inline">{isArabic ? 'ورديتي' : 'Shift'}</span>
              </Link>
              <Link
                href="/dashboard/pos/reports"
                className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
                title={isArabic ? 'تقرير' : 'Report'}
              >
                <BarChart3 size={16} className="md:hidden" />
                <BarChart3 size={18} className="hidden md:block" />
                <span className="hidden md:inline">{isArabic ? 'تقرير' : 'Report'}</span>
              </Link>
            </div>
          )}

          {/* Live shift strip — hidden while the gate is up or no active shift */}
          {!isGated && shiftStrip && (
            <Link
              href="/dashboard/pos/shifts"
              className="w-full flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] font-black text-emerald-700 hover:bg-emerald-100/60 transition-all"
              title={isArabic ? 'فتح صفحة الورديات' : 'Open shifts'}
            >
              <span className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span>{isArabic ? 'الوردية مفتوحة' : 'Shift open'}</span>
                <span className="text-emerald-300">•</span>
                <span>
                  {isArabic
                    ? `الكاشير: ${shiftOwnerName}`
                    : `Cashier: ${shiftOwnerName}`}
                </span>
                <span className="text-emerald-300">•</span>
                <span dir="ltr">
                  ⏱{' '}
                  {isArabic
                    ? `${shiftStrip.hours}س ${shiftStrip.minutes}د`
                    : `${shiftStrip.hours}h ${shiftStrip.minutes}m`}
                </span>
                <span className="text-emerald-300">•</span>
                <span>
                  {isArabic
                    ? `مبيعات: ج.م ${shiftStrip.totalSales}`
                    : `Sales: EGP ${shiftStrip.totalSales}`}
                </span>
                <span className="text-emerald-300">•</span>
                <span>{isArabic ? `${shiftStrip.ordersCount} طلب` : `${shiftStrip.ordersCount} orders`}</span>
                <span className="text-emerald-300">•</span>
                <span>
                  {isArabic
                    ? `المتوقع في الدرج: ج.م ${shiftStrip.expectedDrawer}`
                    : `Expected in drawer: EGP ${shiftStrip.expectedDrawer}`}
                </span>
              </span>
              <ChevronLeft size={14} className="shrink-0" />
            </Link>
          )}
        </header>

        {usingOfflineData && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs font-bold text-amber-700 flex items-center gap-2">
            <WifiOff size={14} />{' '}
            {isArabic ? 'أوفلاين — بيتم استخدام البيانات المحفوظة' : 'Offline — using saved data'}
          </div>
        )}

        {pendingToast && (
          <div className="bg-amber-500 border-b border-amber-600 px-4 py-2.5 text-xs font-black text-white flex items-center gap-2 shadow-md">
            <CloudOff size={14} />
            {pendingToast}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] md:p-4 md:pb-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="font-black text-sm">
                {isArabic ? 'جاري تحميل المنتجات...' : 'Loading products...'}
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <Search size={48} className="mb-3 opacity-30" />
              <p className="font-black text-sm">
                {isArabic ? 'لا توجد منتجات مطابقة' : 'No matching products'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                {pagedProducts.map((p) => {
                  const stock = getProductStock(p);
                  const isOutOfStock = stock <= 0;
                  const hasVariants =
                    p?.menuVariants?.length > 0 ||
                    p?.menu_variants?.length > 0 ||
                    (isFashion && (p?.sizes?.length > 1 || p?.colors?.length > 0));
                  const showConfig =
                    p?.menuVariants?.length > 0 ||
                    p?.menu_variants?.length > 0 ||
                    (isFashion && (p?.sizes?.length > 1 || p?.colors?.length > 0)) ||
                    (isRestaurant && shopAddonsDef.length > 0);
                  return (
                    <MotionDiv
                      key={p.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => !isOutOfStock && addToCart(p, 1)}
                      className={`relative active:scale-[0.97] ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} aspect-square`}
                    >
                      <div
                        className={`w-full h-full rounded-lg md:rounded-[1.4rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#BD00FF] transition-all group overflow-hidden relative`}
                      >
                        {hasVariants && (
                          <div className="absolute top-1 right-1 z-10">
                            <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-lg shadow-sm border border-slate-100">
                              <Ruler size={14} className="text-[#BD00FF]" />
                            </div>
                          </div>
                        )}
                        {showConfig && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigProduct(p);
                              setSelectedAddons([]);
                              setIsConfigOpen(true);
                            }}
                            className="absolute top-1 left-1 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-lg shadow-sm border border-slate-100 hover:border-[#BD00FF] hover:text-[#BD00FF] transition-colors"
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        )}
                        {/* Quick key star toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleQuickKey(p.id);
                          }}
                          className={`absolute bottom-1 left-1 z-10 p-1 rounded-lg transition-all ${quickKeyIds.includes(p.id) ? 'bg-amber-400 text-white' : 'bg-white/70 text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'}`}
                          title={isArabic ? 'زر سريع' : 'Quick key'}
                        >
                          <Star
                            size={12}
                            className={quickKeyIds.includes(p.id) ? 'fill-white' : ''}
                          />
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <img
                          src={p.imageUrl || p.image_url || '/brand/logo-business.png'}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-3 text-right">
                          <h3 className="text-white font-black text-[9px] md:text-sm line-clamp-2 leading-tight mb-0.5">
                            {p.name}
                          </h3>
                          <div className="flex items-center justify-between flex-row-reverse">
                            <span className="text-[#00E5FF] font-black text-[9px] md:text-sm">
                              ج.م {getProductEffectivePrice(p).toFixed(2)}
                            </span>
                            {stock !== Infinity && (
                              <span
                                className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isOutOfStock ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}`}
                              >
                                {isOutOfStock ? (isArabic ? 'نفذ' : 'Out') : `${stock}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </MotionDiv>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalProductPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                    disabled={productsPage <= 1}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
                  >
                    {isArabic ? 'السابق' : 'Prev'}
                  </button>
                  <span className="text-xs font-black text-slate-500 px-3">
                    {productsPage} / {totalProductPages}{' '}
                    <span className="text-slate-300">({filteredProducts.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={productsPage >= totalProductPages}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
                  >
                    {isArabic ? 'التالي' : 'Next'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden md:flex w-full md:w-[450px] bg-white border-r border-slate-100 flex-col shadow-2xl relative z-50">
        {cartContent}
      </div>

      {/* Mobile cart bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden pointer-events-none">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="pointer-events-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
        >
          <div className="mx-auto max-w-[1400px] rounded-[1.6rem] bg-slate-900 text-white shadow-2xl flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 w-10 h-10 rounded-2xl flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div className="text-right">
                <div className="font-black text-sm">{isArabic ? 'السلة' : 'Cart'}</div>
                <div className="text-xs text-white/70 font-bold">
                  {itemsCount} {isArabic ? 'قطعة' : 'items'}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="text-xs text-white/70 font-bold">
                {isArabic ? 'الإجمالي' : 'Total'}
              </div>
              <div className="font-black">ج.م {total.toFixed(2)}</div>
            </div>
          </div>
        </button>
      </div>

      {/* Mobile cart sheet */}
      <AnimatePresence>
        {mobileCartOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] md:hidden bg-black/40"
            onClick={() => setMobileCartOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mobileCartOpen && (
          <MotionDiv
            key="pos-cart-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[140] md:hidden bg-white rounded-t-[2rem] shadow-2xl flex flex-col h-[92vh]"
          >
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-14 h-1.5 rounded-full bg-slate-200" />
            </div>
            <button
              onClick={() => setMobileCartOpen(false)}
              className="absolute top-3 left-3 p-2 rounded-xl hover:bg-slate-100 z-10"
            >
              <X size={20} className="text-slate-400" />
            </button>
            {cartContent}
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Config modal */}
      <AnimatePresence>
        {isConfigOpen && configProduct && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/40 flex items-center justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-6 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-xl font-black mb-4">{configProduct.name}</h3>

              {/* Menu variants */}
              {(() => {
                const mv = (configProduct?.menuVariants ?? configProduct?.menu_variants) as any[];
                if (!Array.isArray(mv) || mv.length === 0) return null;
                const typeOptions = mv
                  .map((t: any) => ({
                    id: String(t?.id || '').trim(),
                    label:
                      String(t?.name || t?.label || '').trim() || (isArabic ? 'النوع' : 'Type'),
                    sizes: Array.isArray(t?.sizes) ? t.sizes : [],
                  }))
                  .filter((t: any) => t.id);
                const selectedType =
                  typeOptions.find((t: any) => t.id === String(selectedMenuTypeId || '').trim()) ||
                  typeOptions[0];
                const sizeOptions = Array.isArray(selectedType?.sizes)
                  ? selectedType.sizes
                      .map((s: any) => ({
                        id: String(s?.id || '').trim(),
                        label:
                          String(s?.label || s?.name || '').trim() || (isArabic ? 'الحجم' : 'Size'),
                        price: Number(s?.price),
                      }))
                      .filter((s: any) => s.id)
                  : [];
                const effectiveSizeId =
                  String(selectedMenuSizeId || '').trim() ||
                  String(sizeOptions[0]?.id || '').trim();

                return (
                  <div className="space-y-3 mb-5">
                    <div className="font-black text-sm text-slate-900">
                      {isArabic ? 'اختر الحجم' : 'Choose Size'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeOptions.map((t: any) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedMenuTypeId(t.id);
                            const first = Array.isArray(t?.sizes) ? t.sizes[0] : undefined;
                            setSelectedMenuSizeId(String(first?.id || '').trim());
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedType?.id) === String(t.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {sizeOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedMenuSizeId(s.id)}
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(effectiveSizeId) === String(s.id) ? 'bg-[#00E5FF] text-slate-900 border-[#00E5FF]' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Fashion colors/sizes */}
              {isFashion && (
                <div className="space-y-3 mb-5">
                  {Array.isArray(configProduct?.colors) && configProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-black text-sm text-slate-900">
                        {isArabic ? 'اللون' : 'Color'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {configProduct.colors.map((c: any) => (
                          <button
                            key={String(c?.value || c?.id)}
                            type="button"
                            onClick={() => setSelectedFashionColorValue(String(c?.value || ''))}
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedFashionColorValue) === String(c?.value) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {String(
                              c?.name || c?.label || c?.value || (isArabic ? 'لون' : 'Color')
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(configProduct?.sizes) && configProduct.sizes.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-black text-sm text-slate-900">
                        {isArabic ? 'المقاس' : 'Size'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {configProduct.sizes.map((s: any) => (
                          <button
                            key={String(s?.label || s?.id)}
                            type="button"
                            onClick={() =>
                              setSelectedFashionSize(String(s?.label || s?.name || ''))
                            }
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedFashionSize) === String(s?.label || s?.name) ? 'bg-[#00E5FF] text-slate-900 border-[#00E5FF]' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {String(s?.label || s?.name || (isArabic ? 'مقاس' : 'Size'))}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Addons */}
              {isRestaurant && shopAddonsDef.length > 0 && (
                <div className="space-y-3 mb-5">
                  <div className="font-black text-sm text-slate-900">
                    {isArabic ? 'الإضافات' : 'Addons'}
                  </div>
                  <div className="space-y-3">
                    {shopAddonsDef.map((g: any) => {
                      const groupId = String(g?.id || '').trim();
                      const groupName = String(g?.name || g?.label || '').trim();
                      const opts = Array.isArray(g?.options) ? g.options : [];
                      if (!groupId || opts.length === 0) return null;
                      return (
                        <div
                          key={groupId}
                          className="p-3 rounded-2xl border border-slate-100 bg-slate-50 space-y-2"
                        >
                          <div className="font-black text-xs text-slate-700 mb-1">
                            {groupName || (isArabic ? 'مجموعة' : 'Group')}
                          </div>
                          {opts.map((opt: any) => {
                            const optId = String(opt?.id || '').trim();
                            if (!optId) return null;
                            const variants = Array.isArray(opt?.variants) ? opt.variants : [];
                            if (variants.length === 0) return null;
                            const selectedVariantId = selectedAddons.find(
                              (x) => String(x?.optionId) === optId
                            )?.variantId;
                            return (
                              <div
                                key={optId}
                                className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col gap-1.5"
                              >
                                <div className="font-bold text-xs text-slate-800 text-right">
                                  {String(opt?.name || opt?.label || opt?.title || '').trim() ||
                                    optId}
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  {variants.map((v: any) => {
                                    const vid = String(v?.id || '').trim();
                                    if (!vid) return null;
                                    const isSelected = String(selectedVariantId || '') === vid;
                                    const vPrice =
                                      typeof v?.price === 'number'
                                        ? v.price
                                        : Number(v?.price || 0);
                                    return (
                                      <button
                                        key={vid}
                                        type="button"
                                        onClick={() =>
                                          setSelectedAddons((prev) => {
                                            const next = (prev || []).filter(
                                              (x) => String(x?.optionId) !== optId
                                            );
                                            if (isSelected) return next;
                                            return [...next, { optionId: optId, variantId: vid }];
                                          })
                                        }
                                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-black transition-all ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                                      >
                                        {String(v?.label || v?.name || '').trim() || vid}
                                        {Number.isFinite(vPrice) && vPrice > 0
                                          ? ` (+${vPrice})`
                                          : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              {(() => {
                const mv = (configProduct?.menuVariants ?? configProduct?.menu_variants) as any[];
                const hasMenuVariants = Array.isArray(mv) && mv.length > 0;
                let price = getProductEffectivePrice(configProduct);
                let variantSelection: any = undefined;
                if (hasMenuVariants) {
                  const type =
                    mv.find(
                      (t: any) =>
                        String(t?.id || '').trim() === String(selectedMenuTypeId || '').trim()
                    ) || mv[0];
                  const sizes = Array.isArray(type?.sizes) ? type.sizes : [];
                  const size =
                    sizes.find(
                      (s: any) =>
                        String(s?.id || '').trim() === String(selectedMenuSizeId || '').trim()
                    ) || sizes[0];
                  const sizePrice = Number(size?.price);
                  if (Number.isFinite(sizePrice) && sizePrice > 0) price = sizePrice;
                  if (type && size)
                    variantSelection = {
                      typeId: String(type?.id || '').trim(),
                      sizeId: String(size?.id || '').trim(),
                      menuSizeLabel: String(size?.label || size?.name || '').trim(),
                    };
                }
                if (isFashion) {
                  const colorObj = Array.isArray(configProduct?.colors)
                    ? configProduct.colors.find(
                        (c: any) =>
                          String(c?.value || '') === String(selectedFashionColorValue || '')
                      )
                    : undefined;
                  variantSelection = {
                    ...(variantSelection || {}),
                    kind: 'fashion',
                    colorName: String(colorObj?.name || '').trim(),
                    colorValue: String(selectedFashionColorValue || ''),
                    size: String(selectedFashionSize || ''),
                  };
                }
                const addonsPrice = (() => {
                  if (!isRestaurant) return 0;
                  const priceMap = new Map<string, number>();
                  for (const g of shopAddonsDef)
                    for (const opt of g?.options || [])
                      for (const v of opt?.variants || []) {
                        const vid = String(v?.id || '').trim();
                        const p = Number(v?.price || 0);
                        if (vid && Number.isFinite(p))
                          priceMap.set(`${String(opt?.id).trim()}:${vid}`, p);
                      }
                  return (selectedAddons || []).reduce(
                    (sum, a) =>
                      sum +
                      (priceMap.get(
                        `${String(a?.optionId).trim()}:${String(a?.variantId).trim()}`
                      ) || 0),
                    0
                  );
                })();
                const finalPrice = price + addonsPrice;

                return (
                  <>
                    <div className="text-sm font-black text-[#BD00FF] mb-3">
                      ج.م {finalPrice.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lineId = `${configProduct.id}-${Date.now()}`;
                        const suffix = (() => {
                          const parts: string[] = [];
                          if (variantSelection?.menuSizeLabel)
                            parts.push(String(variantSelection.menuSizeLabel));
                          if (variantSelection?.size) parts.push(String(variantSelection.size));
                          if (variantSelection?.colorName)
                            parts.push(String(variantSelection.colorName));
                          return parts.length ? ` (${parts.join(' - ')})` : '';
                        })();
                        setCart((prev) => [
                          ...prev,
                          {
                            id: lineId,
                            productId: configProduct.id,
                            name: `${configProduct.name}${suffix}`,
                            price: finalPrice,
                            quantity: 1,
                            addons: selectedAddons,
                            variantSelection,
                          },
                        ]);
                        setIsConfigOpen(false);
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black"
                    >
                      {isArabic ? 'أضف للسلة' : 'Add to Cart'}
                    </button>
                  </>
                );
              })()}
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="w-full mt-2 py-2 text-slate-400 font-bold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Success modal */}
      <AnimatePresence>
        {showSuccess && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[3rem] p-12 text-center shadow-2xl">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black">{isArabic ? 'تم بنجاح!' : 'Success!'}</h3>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Customer card modal */}
      <AnimatePresence>
        {isCustomerCardOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setIsCustomerCardOpen(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black">{isArabic ? 'بيانات العميل' : 'Customer'}</h3>
                <button
                  type="button"
                  onClick={() => setIsCustomerCardOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-500">
                    {isArabic ? 'الاسم (اختياري)' : 'Name (optional)'}
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isArabic ? 'اسم العميل' : 'Customer name'}
                    className="w-full bg-white border rounded-2xl py-3 px-4 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-500">
                    {isArabic ? 'الهاتف' : 'Phone'}
                  </div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full bg-white border rounded-2xl py-3 px-4 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('');
                    setCustomerPhone('');
                    setIsCustomerCardOpen(false);
                  }}
                  className="py-3 rounded-2xl bg-slate-50 text-slate-700 font-black"
                >
                  {isArabic ? 'مسح' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerCardOpen(false)}
                  className="py-3 rounded-2xl bg-slate-900 text-white font-black"
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Customer list modal */}
      <AnimatePresence>
        {isCustomerListOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setIsCustomerListOpen(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black">{isArabic ? 'اختر عميل' : 'Select Customer'}</h3>
                <button
                  type="button"
                  onClick={() => setIsCustomerListOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث عن عميل...' : 'Search customers...'}
                  className="w-full bg-slate-50 border rounded-xl py-2.5 pr-9 pl-4 outline-none text-sm text-right focus:ring-2 focus:ring-[#BD00FF]"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 select-none">
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-slate-400" size={24} />
                  </div>
                ) : (
                  (() => {
                    const filtered = savedCustomers.filter((c: any) => {
                      const q = customerSearchQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        String(c?.name || '')
                          .toLowerCase()
                          .includes(q) || String(c?.phone || '').includes(q)
                      );
                    });
                    if (filtered.length === 0)
                      return (
                        <div className="text-center text-slate-400 py-8 font-bold text-sm">
                          {isArabic ? 'لا يوجد عملاء' : 'No customers'}
                        </div>
                      );
                    return filtered.map((cust: any) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setCustomerName(cust.name || '');
                          setCustomerPhone(cust.phone || '');
                          setIsCustomerListOpen(false);
                        }}
                        className="w-full text-right p-3 rounded-xl border border-slate-100 hover:border-[#BD00FF] bg-slate-50/50 hover:bg-[#BD00FF]/5 transition-all flex flex-col gap-1"
                      >
                        <div className="font-black text-sm text-slate-900 flex justify-between flex-row-reverse w-full items-center">
                          <span>{cust.name || (isArabic ? 'بدون اسم' : 'Unnamed')}</span>
                          <span className="text-xs font-bold text-slate-400">{cust.phone}</span>
                        </div>
                      </button>
                    ));
                  })()
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Held orders modal (F7) */}
      <AnimatePresence>
        {showHeldOrders && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowHeldOrders(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Pause size={18} className="text-amber-500" />{' '}
                  {isArabic ? 'الطلبات المعلقة' : 'Held Orders'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHeldOrders(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              {heldOrders.length === 0 ? (
                <div className="text-center text-slate-400 py-12 font-bold text-sm">
                  {isArabic ? 'لا توجد طلبات معلقة' : 'No held orders'}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                  {heldOrders.map((h) => {
                    const total = (Array.isArray(h.cart) ? h.cart : []).reduce(
                      (s, i) => s + Number(i?.price || 0) * Number(i?.quantity || 0),
                      0
                    );
                    const items = (Array.isArray(h.cart) ? h.cart : []).length;
                    return (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-amber-50/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2 flex-row-reverse">
                          <div className="font-black text-sm text-slate-900">
                            {isArabic ? 'طلب معلق' : 'Held order'}
                            <span className="text-[10px] text-slate-400 mr-2">
                              {new Date(h.savedAt).toLocaleTimeString('ar-EG')}
                            </span>
                          </div>
                          <div className="font-black text-sm text-[#BD00FF]">
                            ج.م {total.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mb-2">
                          {items} {isArabic ? 'عنصر' : 'items'}
                          {h.customerName ? ` · ${h.customerName}` : ''}
                          {h.customerPhone ? ` · ${h.customerPhone}` : ''}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => resumeHeldOrder(h.id)}
                            className="py-2 rounded-xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 flex items-center justify-center gap-1.5"
                          >
                            <Play size={14} /> {isArabic ? 'استئناف' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHeldOrder(h.id)}
                            className="py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 flex items-center justify-center gap-1.5"
                          >
                            <Trash2 size={14} /> {isArabic ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Camera barcode scanner modal */}
      <AnimatePresence>
        {showCameraScanner && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowCameraScanner(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Camera size={18} /> {isArabic ? 'مسح الباركود' : 'Scan Barcode'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              {cameraError ? (
                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold text-center">
                  {cameraError}
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                  <video
                    ref={cameraVideoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-3/4 h-1 bg-[#00E5FF] shadow-[0_0_12px_#00E5FF]" />
                  </div>
                </div>
              )}
              <p className="text-center text-xs text-slate-400 font-bold mt-3">
                {isArabic ? 'وجّه الكاميرا نحو الباركود' : 'Point the camera at the barcode'}
              </p>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Price override modal (per-line) */}
      <AnimatePresence>
        {priceOverrideId && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setPriceOverrideId(null)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Tag size={16} className="text-[#BD00FF]" />{' '}
                  {isArabic ? 'تعديل السعر' : 'Price Override'}
                </h3>
                <button
                  type="button"
                  onClick={() => setPriceOverrideId(null)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <input
                type="number"
                autoFocus
                value={priceOverrideValue}
                onChange={(e) => setPriceOverrideValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyPriceOverride();
                }}
                className="w-full bg-white border rounded-2xl py-3 px-4 outline-none text-center text-lg font-black focus:ring-2 focus:ring-[#BD00FF]"
                min={0}
                step="0.01"
              />
              <button
                type="button"
                onClick={applyPriceOverride}
                className="w-full mt-3 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-black"
              >
                {isArabic ? 'تطبيق' : 'Apply'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts help (long-press barcode button shows a hint) */}
      {barcodeListening && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg flex items-center gap-2 animate-pulse">
          <ScanLine size={14} />{' '}
          {isArabic
            ? 'قارئ الباركود يعمل — امسح المنتج الآن'
            : 'Barcode scanner ON — scan a product'}
        </div>
      )}

      {/* Receipt settings modal */}
      <AnimatePresence>
        {showReceiptSettings && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowReceiptSettings(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Settings2 size={18} /> {isArabic ? 'إعدادات الفاتورة' : 'Receipt Settings'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReceiptSettings(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'شعار (URL)' : 'Logo URL'}
                  </label>
                  <input
                    type="text"
                    value={receiptTheme.logoUrl || ''}
                    onChange={(e) => setReceiptTheme((t) => ({ ...t, logoUrl: e.target.value }))}
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'رسالة علوية' : 'Header message'}
                  </label>
                  <input
                    type="text"
                    value={receiptTheme.headerMessage || ''}
                    onChange={(e) =>
                      setReceiptTheme((t) => ({ ...t, headerMessage: e.target.value }))
                    }
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'رسالة سفلية' : 'Footer message'}
                  </label>
                  <input
                    type="text"
                    value={receiptTheme.footerMessage || ''}
                    onChange={(e) =>
                      setReceiptTheme((t) => ({ ...t, footerMessage: e.target.value }))
                    }
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-500">
                      {isArabic ? 'نسبة الضريبة %' : 'VAT %'}
                    </label>
                    <input
                      type="number"
                      value={receiptTheme.vatRatePercent || 0}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setReceiptTheme((t) => ({ ...t, vatRatePercent: v }));
                        setVatRatePct(v);
                      }}
                      className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500">
                      {isArabic ? 'العملة' : 'Currency'}
                    </label>
                    <input
                      type="text"
                      value={receiptTheme.currency || 'ج.م'}
                      onChange={(e) => setReceiptTheme((t) => ({ ...t, currency: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptTheme.showCashier !== false}
                      onChange={(e) =>
                        setReceiptTheme((t) => ({ ...t, showCashier: e.target.checked }))
                      }
                      className="w-4 h-4"
                    />
                    {isArabic ? 'إظهار الكاشير' : 'Show cashier'}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptTheme.showQrCode || false}
                      onChange={(e) =>
                        setReceiptTheme((t) => ({ ...t, showQrCode: e.target.checked }))
                      }
                      className="w-4 h-4"
                    />
                    {isArabic ? 'QR Code' : 'QR Code'}
                  </label>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'عرض الورق' : 'Paper width'}
                  </label>
                  <select
                    value={receiptTheme.paperWidth || '80mm'}
                    onChange={(e) =>
                      setReceiptTheme((t) => ({ ...t, paperWidth: e.target.value as any }))
                    }
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  >
                    <option value="58mm">58mm</option>
                    <option value="80mm">80mm</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveReceiptTheme(shopId, receiptTheme);
                    setShowReceiptSettings(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm"
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Loyalty settings modal */}
      <AnimatePresence>
        {showLoyaltySettings && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowLoyaltySettings(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Crown size={18} className="text-amber-500" />{' '}
                  {isArabic ? 'نقاط الولاء' : 'Loyalty Points'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLoyaltySettings(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-black text-slate-600">
                    {isArabic ? 'تفعيل' : 'Enable'}
                  </span>
                  <input
                    type="checkbox"
                    checked={loyaltyCfg.enabled}
                    onChange={(e) => setLoyaltyCfg((c) => ({ ...c, enabled: e.target.checked }))}
                    className="w-5 h-5"
                  />
                </label>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'نقاط لكل ج.م' : 'Points per EGP'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyCfg.pointsPerEgp}
                    onChange={(e) =>
                      setLoyaltyCfg((c) => ({ ...c, pointsPerEgp: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'قيمة النقطة (ج.م)' : 'Redeem rate (EGP/pt)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyCfg.redeemRate}
                    onChange={(e) =>
                      setLoyaltyCfg((c) => ({ ...c, redeemRate: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-sm font-bold mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveLoyaltyConfig(shopId, loyaltyCfg);
                    setShowLoyaltySettings(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm"
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Signature capture modal */}
      <AnimatePresence>
        {showSignature && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowSignature(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Users size={18} /> {isArabic ? 'توقيع العميل' : 'Customer Signature'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSignature(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl touch-none"
              />
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center gap-1.5"
                >
                  <Eraser size={14} /> {isArabic ? 'مسح' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignature(false)}
                  className="py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="py-2 rounded-xl bg-slate-900 text-white font-black text-xs"
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
              {signatureData && (
                <p className="text-[10px] text-emerald-600 font-black mt-2 text-center">
                  ✓ {isArabic ? 'يوجد توقيع محفوظ' : 'Signature on file'}
                </p>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Email receipt modal */}
      <AnimatePresence>
        {showEmailReceipt && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowEmailReceipt(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Mail size={16} /> {isArabic ? 'إرسال الفاتورة' : 'Email Receipt'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmailReceipt(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <input
                type="email"
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
                placeholder="customer@email.com"
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold focus:ring-2 focus:ring-[#BD00FF]"
              />
              <button
                type="button"
                onClick={handleEmailReceipt}
                disabled={!receiptEmail.trim()}
                className="w-full mt-3 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={14} /> {isArabic ? 'إرسال' : 'Send'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Tables modal (restaurant) */}
      <AnimatePresence>
        {showTables && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowTables(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Table2 size={18} /> {isArabic ? 'الطاولات' : 'Tables'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTables(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              {tables.length === 0 ? (
                <div className="text-center text-slate-400 py-8 font-bold text-sm">
                  {isArabic ? 'لا توجد طاولات' : 'No tables'}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTable(t.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${selectedTableId === t.id ? 'border-[#BD00FF] bg-[#BD00FF]/5' : t.status === 'free' ? 'border-slate-100 bg-slate-50 hover:bg-slate-100' : t.status === 'occupied' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                    >
                      <div className="font-black text-sm">{t.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-1">
                        {t.seats} {isArabic ? 'كرسي' : 'seats'}
                      </div>
                      <div
                        className={`text-[9px] font-black mt-1 ${t.status === 'free' ? 'text-emerald-600' : t.status === 'occupied' ? 'text-red-500' : 'text-amber-600'}`}
                      >
                        {t.status === 'free'
                          ? isArabic
                            ? 'فارغة'
                            : 'Free'
                          : t.status === 'occupied'
                            ? isArabic
                              ? 'مشغولة'
                              : 'Occupied'
                            : isArabic
                              ? 'محجوزة'
                              : 'Reserved'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addTable}
                className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center gap-2"
              >
                <Plus size={14} /> {isArabic ? 'إضافة طاولة' : 'Add table'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Layaway modal */}
      <AnimatePresence>
        {showLayaway && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowLayaway(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Clock size={18} className="text-amber-500" />{' '}
                  {isArabic ? 'بيع بالتقسيط' : 'Layaway'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLayaway(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-500">
                      {isArabic ? 'إجمالي الطلب' : 'Order total'}
                    </span>
                    <span className="text-[#BD00FF]">ج.م {total.toFixed(2)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500">
                    {isArabic ? 'العربون (مقدم)' : 'Deposit'}
                  </label>
                  <input
                    type="number"
                    value={layawayDeposit || ''}
                    onChange={(e) => setLayawayDeposit(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mt-1"
                    min={0}
                    max={total}
                  />
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex justify-between text-xs font-black text-amber-700">
                    <span>{isArabic ? 'المتبقي' : 'Remaining'}</span>
                    <span>ج.م {Math.max(0, total - layawayDeposit).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createLayaway}
                  disabled={cart.length === 0 || total <= 0}
                  className="w-full py-3 rounded-2xl bg-amber-500 text-white font-black text-sm disabled:opacity-50"
                >
                  {isArabic ? 'إنشاء عقد التقسيط' : 'Create layaway'}
                </button>
                {layaways.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-black text-slate-400">
                      {isArabic ? 'العقود النشطة' : 'Active plans'} (
                      {layaways.filter((l) => l.status === 'active').length})
                    </div>
                    {layaways
                      .filter((l) => l.status === 'active')
                      .slice(0, 5)
                      .map((l) => (
                        <div
                          key={l.id}
                          className="flex justify-between text-[10px] font-bold p-2 rounded-lg bg-slate-50"
                        >
                          <span>{l.id.slice(0, 12)}</span>
                          <span className="text-amber-600">
                            ج.م {l.paid}/{l.total}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Audit trail modal */}
      <AnimatePresence>
        {showAudit && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowAudit(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <BarChart3 size={18} /> {isArabic ? 'سجل العمليات' : 'Audit Trail'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAudit(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              {auditEntries.length === 0 ? (
                <div className="text-center text-slate-400 py-8 font-bold text-sm">
                  {isArabic ? 'لا توجد عمليات' : 'No entries'}
                </div>
              ) : (
                <div className="space-y-2">
                  {auditEntries.slice(0, 50).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex justify-between text-xs font-black flex-row-reverse">
                        <span className="text-slate-900">{a.action}</span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(a.ts).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      {a.detail && (
                        <div className="text-[10px] text-slate-500 font-bold mt-1">{a.detail}</div>
                      )}
                      {a.amount != null && (
                        <div className="text-[10px] text-[#BD00FF] font-black mt-0.5">
                          ج.م {Number(a.amount).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Price level menu (popover) */}
      <AnimatePresence>
        {showPriceLevelMenu && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[940]"
            onClick={() => setShowPriceLevelMenu(false)}
          >
            <div className="absolute bottom-24 right-4 md:right-[460px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-48">
              {(['retail', 'wholesale', 'employee'] as PriceLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => applyPriceLevel(lvl)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-black transition-all ${priceLevel === lvl ? 'bg-[#BD00FF]/10 text-[#BD00FF]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {lvl === 'retail'
                    ? isArabic
                      ? 'سعر التجزئة'
                      : 'Retail'
                    : lvl === 'wholesale'
                      ? isArabic
                        ? 'سعر الجملة (-15%)'
                        : 'Wholesale (-15%)'
                      : isArabic
                        ? 'سعر الموظفين (-10%)'
                        : 'Employee (-10%)'}
                </button>
              ))}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Gift card apply (inline prompt result) */}
      {giftCardCode && !giftCardApplied && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-white border border-slate-200 rounded-2xl shadow-xl p-3 flex items-center gap-2">
          <Gift size={16} className="text-emerald-500" />
          <span className="text-xs font-black text-slate-700">{giftCardCode}</span>
          <button
            type="button"
            onClick={handleApplyGiftCard}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black"
          >
            {isArabic ? 'تطبيق' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={() => {
              setGiftCardCode('');
              setGiftCardError('');
            }}
            className="text-slate-400"
          >
            <X size={14} />
          </button>
          {giftCardError && (
            <span className="text-[10px] text-red-500 font-bold">{giftCardError}</span>
          )}
        </div>
      )}

      {/* X-Report modal (mid-day) */}
      <AnimatePresence>
        {showXReport && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowXReport(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />{' '}
                  {isArabic ? 'تقرير منتصف اليوم (X)' : 'X-Report'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowXReport(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between p-2 rounded-lg bg-blue-50">
                  <span className="text-blue-600">
                    {isArabic ? 'إجمالي المبيعات' : 'Total sales'}
                  </span>
                  <span className="text-blue-700 font-black">
                    ج.م {reportData.totalSales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                  <span>{isArabic ? 'عدد الفواتير' : 'Orders'}</span>
                  <span className="font-black">{reportData.totalOrders}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                  <span>{isArabic ? 'كاش' : 'Cash'}</span>
                  <span>ج.م {reportData.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                  <span>{isArabic ? 'بطاقة' : 'Card'}</span>
                  <span>ج.م {reportData.cardSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                  <span>{isArabic ? 'محفظة' : 'Wallet'}</span>
                  <span>ج.م {reportData.walletSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                  <span>{isArabic ? 'آجل' : 'Credit'}</span>
                  <span>ج.م {reportData.creditSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-50">
                  <span className="text-emerald-600">{isArabic ? 'إكراميات' : 'Tips'}</span>
                  <span className="text-emerald-700">ج.م {reportData.totalTips.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-red-50">
                  <span className="text-red-600">{isArabic ? 'مرتجعات' : 'Returns'}</span>
                  <span className="text-red-700">ج.م {reportData.totalReturns.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-amber-700 font-black">
                    {isArabic ? 'الصندوق المتوقع' : 'Expected cash'}
                  </span>
                  <span className="text-amber-800 font-black">
                    ج.م {reportData.netCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Z-Report modal (end of day) */}
      <AnimatePresence>
        {showZReport && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowZReport(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <FileText size={18} className="text-red-500" />{' '}
                  {isArabic ? 'تقرير نهاية اليوم (Z)' : 'Z-Report'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowZReport(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2 text-xs font-bold">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="text-[10px] font-black text-red-600 mb-2">
                    {isArabic ? 'ملخص اليوم' : 'Day Summary'}
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'إجمالي المبيعات' : 'Total sales'}</span>
                    <span className="font-black">ج.م {reportData.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'عدد الفواتير' : 'Orders'}</span>
                    <span>{reportData.totalOrders}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'ضريبة محصلة' : 'VAT collected'}</span>
                    <span>ج.م {reportData.totalVat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'خصومات' : 'Discounts'}</span>
                    <span>ج.م {reportData.totalDiscounts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'إكراميات' : 'Tips'}</span>
                    <span>ج.م {reportData.totalTips.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'مرتجعات' : 'Returns'}</span>
                    <span>ج.م {reportData.totalReturns.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-black text-slate-500 mb-2">
                    {isArabic ? 'الصندوق' : 'Cash Drawer'}
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{isArabic ? 'عهدة افتتاح' : 'Opening'}</span>
                    <span>ج.م {reportData.openingAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-emerald-600">
                    <span>{isArabic ? 'مبيعات كاش' : 'Cash sales'}</span>
                    <span>+ ج.م {reportData.cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-emerald-600">
                    <span>{isArabic ? 'إيداع نقدي' : 'Cash in'}</span>
                    <span>+ ج.م {reportData.cashIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-red-600">
                    <span>{isArabic ? 'مصروف نقدي' : 'Cash out'}</span>
                    <span>- ج.م {reportData.cashOut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 text-red-600">
                    <span>{isArabic ? 'مرتجعات' : 'Returns'}</span>
                    <span>- ج.م {reportData.totalReturns.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                    <span>{isArabic ? 'الصافي المتوقع' : 'Expected net'}</span>
                    <span className="text-amber-700">ج.م {reportData.netCash.toFixed(2)}</span>
                  </div>
                </div>
                {reportData.topProducts.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-black text-slate-500 mb-2">
                      {isArabic ? 'أفضل المنتجات' : 'Top Products'}
                    </div>
                    {reportData.topProducts.slice(0, 5).map((p, i) => (
                      <div key={p.name} className="flex justify-between text-[10px] py-0.5">
                        <span>
                          {i + 1}. {p.name}
                        </span>
                        <span className="text-[#BD00FF]">
                          {p.qty}× / ج.م {p.revenue.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowZReport(false);
                    setShowDrawerDeclaration(true);
                  }}
                  className="w-full py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600"
                >
                  {isArabic ? 'إغلاق اليوم + جرد الصندوق' : 'Close Day + Declare Drawer'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Cash in/out modal */}
      <AnimatePresence>
        {showCashMovement && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowCashMovement(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <ArrowDownCircle size={16} /> {isArabic ? 'حركة نقدية' : 'Cash Movement'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCashMovement(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCashMovementType('in')}
                  className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${cashMovementType === 'in' ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-600'}`}
                >
                  <ArrowUpCircle size={14} /> {isArabic ? 'إيداع' : 'Cash In'}
                </button>
                <button
                  type="button"
                  onClick={() => setCashMovementType('out')}
                  className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${cashMovementType === 'out' ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-600'}`}
                >
                  <ArrowDownCircle size={14} /> {isArabic ? 'صرف' : 'Cash Out'}
                </button>
              </div>
              <input
                type="number"
                value={cashMovementAmount || ''}
                onChange={(e) => setCashMovementAmount(Number(e.target.value) || 0)}
                placeholder={isArabic ? 'المبلغ' : 'Amount'}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mb-2"
                min={0}
              />
              <input
                type="text"
                value={cashMovementReason}
                onChange={(e) => setCashMovementReason(e.target.value)}
                placeholder={isArabic ? 'السبب' : 'Reason'}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold mb-3"
              />
              <button
                type="button"
                onClick={submitCashMovement}
                disabled={cashMovementAmount <= 0 || !cashMovementReason.trim()}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50"
              >
                {isArabic ? 'تأكيد' : 'Confirm'}
              </button>
              {cashMovements.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 max-h-32 overflow-y-auto">
                  {cashMovements.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex justify-between text-[10px] font-bold">
                      <span className={m.type === 'in' ? 'text-emerald-600' : 'text-red-500'}>
                        {m.type === 'in' ? '+' : '-'} ج.م {m.amount.toFixed(2)}
                      </span>
                      <span className="text-slate-400 truncate max-w-[100px]">{m.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Drawer declaration modal */}
      <AnimatePresence>
        {showDrawerDeclaration && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowDrawerDeclaration(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[2rem] p-5"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Calculator size={16} /> {isArabic ? 'جرد الصندوق' : 'Drawer Declaration'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDrawerDeclaration(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 mb-3">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-amber-600">{isArabic ? 'المتوقع' : 'Expected'}</span>
                  <span className="text-amber-700">ج.م {reportData.netCash.toFixed(2)}</span>
                </div>
              </div>
              <input
                type="number"
                value={declaredCash || ''}
                onChange={(e) => setDeclaredCash(Number(e.target.value) || 0)}
                placeholder={isArabic ? 'العدد الفعلي للصندوق' : 'Declared cash'}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center mb-2"
                min={0}
              />
              <input
                type="text"
                value={declarationNote}
                onChange={(e) => setDeclarationNote(e.target.value)}
                placeholder={isArabic ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-bold mb-3"
              />
              {declaredCash > 0 && (
                <div
                  className={`p-2 rounded-xl text-center text-xs font-black mb-3 ${Math.abs(declaredCash - reportData.netCash) < 0.01 ? 'bg-emerald-50 text-emerald-600' : declaredCash > reportData.netCash ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}
                >
                  {isArabic ? 'الفرق' : 'Difference'}: ج.م{' '}
                  {(declaredCash - reportData.netCash).toFixed(2)}
                </div>
              )}
              <button
                type="button"
                onClick={submitDrawerDeclaration}
                disabled={declaredCash <= 0}
                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm disabled:opacity-50"
              >
                {isArabic ? 'تأكيد الجرد' : 'Confirm Declaration'}
              </button>
              {declarations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 max-h-24 overflow-y-auto">
                  {declarations.slice(0, 3).map((d) => (
                    <div key={d.id} className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">
                        {new Date(d.ts).toLocaleDateString('ar-EG')}
                      </span>
                      <span
                        className={
                          Math.abs(d.difference) < 0.01 ? 'text-emerald-600' : 'text-red-500'
                        }
                      >
                        ± ج.م {d.difference.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Quick keys management (add/remove) */}
      <AnimatePresence>
        {showQuickKeys && quickKeyProducts.length === 0 && products.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowQuickKeys(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />{' '}
                  {isArabic ? 'إضافة أزرار سريعة' : 'Add Quick Keys'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickKeys(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-3">
                {isArabic
                  ? 'اضغط على المنتجات لإضافتها للأزرار السريعة'
                  : 'Tap products to add them as quick keys'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.slice(0, 20).map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleQuickKey(p.id)}
                    className={`p-2.5 rounded-xl text-xs font-black text-right transition-all ${quickKeyIds.includes(p.id) ? 'bg-amber-100 border-2 border-amber-300 text-amber-700' : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {quickKeyIds.includes(p.id) && (
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
      {/* Cashier invoices modal — quick access for the shift owner */}
      <AnimatePresence>
        {showInvoices && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowInvoices(false)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <Receipt size={16} className="text-[#0098a8]" />{' '}
                  {isArabic ? 'فواتير الكاشير' : 'Cashier Invoices'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInvoices(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-12 text-slate-300">
                    <Loader2 size={28} className="animate-spin" />
                  </div>
                ) : posInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <Receipt size={48} className="mb-3 opacity-30" />
                    <p className="font-black text-sm">
                      {isArabic ? 'لا توجد فواتير كاشير بعد' : 'No cashier invoices yet'}
                    </p>
                  </div>
                ) : (
                  posInvoices.map((inv: any) => {
                    const returned =
                      String(inv?.status || '').toUpperCase() === 'RETURNED' ||
                      String(inv?.status || '').toUpperCase() === 'REFUNDED';
                    return (
                      <div
                        key={inv.id}
                        className={`border rounded-2xl p-3 ${returned ? 'border-red-100 bg-red-50/40' : 'border-slate-100 bg-white'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-row-reverse">
                          <div className="text-right min-w-0">
                            <div className="text-xs font-black text-slate-900 flex items-center gap-2 justify-end">
                              <span>#{String(inv.id || '').slice(0, 8)}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${invoiceStatusStyle(inv.status)}`}
                              >
                                {returned ? 'مرتجعة' : 'مكتملة'}
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {String(inv.createdAt || '')
                                .replace('T', ' ')
                                .slice(0, 16)}
                              {inv.customerPhone ? ` • ${inv.customerPhone}` : ''}
                            </div>
                          </div>
                          <span className="text-sm font-black text-slate-900 shrink-0">
                            ج.م {Number(inv.total || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-row-reverse">
                          <button
                            type="button"
                            onClick={() => reprintInvoice(inv)}
                            className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1"
                          >
                            <Printer size={12} /> {isArabic ? 'طباعة' : 'Print'}
                          </button>
                          <button
                            type="button"
                            disabled={returned}
                            onClick={() => startReturn(inv)}
                            className="flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-[10px] font-black text-red-600 hover:bg-red-100 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <RotateCcw size={12} /> {isArabic ? 'مرتجع سريع' : 'Return'}
                          </button>
                          <button
                            type="button"
                            disabled={returned}
                            onClick={() => startEditOrder(inv)}
                            className="flex-1 py-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[10px] font-black text-[#0098a8] hover:bg-[#00E5FF]/20 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Sliders size={12} /> {isArabic ? 'تعديل' : 'Edit'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Quick return modal */}
      <AnimatePresence>
        {returnOrder && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[960] bg-black/40 flex items-center justify-center p-4"
            onClick={() => !returnSubmitting && setReturnOrder(null)}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1 flex-row-reverse">
                <h3 className="text-base font-black flex items-center gap-2">
                  <RotateCcw size={16} className="text-red-500" />{' '}
                  {isArabic ? 'مرتجع سريع' : 'Quick Return'}
                </h3>
                <button
                  type="button"
                  onClick={() => setReturnOrder(null)}
                  disabled={returnSubmitting}
                  className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mb-3">
                {isArabic
                  ? `فاتورة #${String(returnOrder.id || '').slice(0, 8)} — حدّد الكمية المرتجعة من كل صنف`
                  : `Invoice #${String(returnOrder.id || '').slice(0, 8)}`}
              </p>
              <div className="space-y-2 mb-3">
                {(Array.isArray(returnOrder.items) ? returnOrder.items : []).map((it: any) => {
                  const qty = returnQtys[String(it.id)] || 0;
                  const orig = Number(it.quantity) || 0;
                  return (
                    <div
                      key={it.id}
                      className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 ${qty > 0 ? 'border-red-200 bg-red-50/40' : 'border-slate-100'}`}
                    >
                      <div className="min-w-0 text-right">
                        <div className="text-xs font-black text-slate-900 truncate">
                          {it.productName || it.productId}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          ج.م {Number(it.price || 0).toFixed(2)} × {orig}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setReturnQtys((prev) => ({
                              ...prev,
                              [String(it.id)]: Math.max(0, (prev[String(it.id)] || 0) - 1),
                            }))
                          }
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:text-red-500"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-black text-sm">{qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setReturnQtys((prev) => ({
                              ...prev,
                              [String(it.id)]: Math.min(orig, (prev[String(it.id)] || 0) + 1),
                            }))
                          }
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-red-400 hover:text-red-500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <label className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 mb-2 cursor-pointer">
                <span className="text-xs font-black text-slate-600">
                  {isArabic ? 'إرجاع الأصناف للمخزون' : 'Return items to stock'}
                </span>
                <input
                  type="checkbox"
                  checked={returnToStock}
                  onChange={(e) => setReturnToStock(e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
              </label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder={isArabic ? 'السبب (اختياري)' : 'Reason (optional)'}
                className="w-full bg-slate-50 border rounded-xl py-2.5 px-4 outline-none text-xs font-bold mb-3"
              />
              <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2.5 mb-3">
                <span className="text-xs font-black text-red-600">
                  {isArabic ? 'إجمالي المرتجع' : 'Return total'}
                </span>
                <span className="text-sm font-black text-red-600">
                  ج.م {returnTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={submitReturn}
                disabled={returnTotal <= 0 || returnSubmitting}
                className="w-full py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {returnSubmitting && <Loader2 size={14} className="animate-spin" />}
                {isArabic ? 'تأكيد المرتجع' : 'Confirm Return'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ─── POS gate — full-screen blocking card shown INSTEAD of the checkout
              UI until the shift/cashier session is ready ─── */}
      {isGated &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            dir="rtl"
          >
            <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#BD00FF]/10 flex items-center justify-center mb-3">
                  {gateMode === 'open' ? (
                    <Play size={26} className="text-[#BD00FF]" />
                  ) : (
                    <Lock size={26} className="text-[#BD00FF]" />
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {gateMode === 'open' ? 'ابدأ الوردية' : 'سجّل الكاشير'}
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  {gateMode === 'open'
                    ? 'افتح وردية جديدة لتبدأ البيع'
                    : 'الوردية مفتوحة — سجّل دخولك لتكمل البيع'}
                </p>
              </div>

              {gateMode === 'open' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500">العهدة الافتتاحية</label>
                  <input
                    type="number"
                    min={0}
                    value={gateOpeningCash || ''}
                    onChange={(e) => setGateOpeningCash(Number(e.target.value) || 0)}
                    placeholder="مبلغ العهدة"
                    className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
                  />
                </div>
              )}

              {(gateCashiers.length > 0 || Boolean(loadPosSettings(shop).adminPin)) && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500">اسم الكاشير</label>
                    <select
                      value={gateCashierId}
                      onChange={(e) => setGateCashierId(e.target.value)}
                      className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
                    >
                      <option value="">اختار الكاشير...</option>
                      <option value="__admin__">الإدارة (صاحب المحل)</option>
                      {gateCashiers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500">الرقم السري</label>
                    <div className="relative">
                      <input
                        type={gateShowPin ? 'text' : 'password'}
                        inputMode="numeric"
                        value={gatePin}
                        onChange={(e) => setGatePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="أدخل الرقم السري"
                        className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center tracking-[0.4em] focus:ring-2 focus:ring-[#BD00FF]"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setGateShowPin((v) => !v)}
                        className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                        aria-label="إظهار الرقم السري"
                      >
                        {gateShowPin ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {gateError && (
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
                  {gateError}
                </div>
              )}

              <button
                type="button"
                onClick={submitGate}
                disabled={gateSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gateSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Play size={18} />
                )}
                {gateMode === 'open' ? 'فتح الوردية ودخول الكاشير' : 'دخول'}
              </button>

              {gateMode === 'open' && !hasCashiers && (
                <button
                  type="button"
                  onClick={submitGate}
                  disabled={gateSubmitting}
                  className="w-full text-center text-xs font-black text-slate-400 hover:text-slate-600 underline"
                >
                  فتح بدون كاشير
                </button>
              )}

              {gateMode === 'open' && hasCashiers && gateCashiers.length === 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold text-center">
                  مفيش كاشير عنده صلاحية فتح الوردية — عدّل الصلاحيات من{' '}
                  <Link href="/dashboard/pos/settings" className="underline font-black">
                    إعدادات الكاشير
                  </Link>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default POSSystemPage;
