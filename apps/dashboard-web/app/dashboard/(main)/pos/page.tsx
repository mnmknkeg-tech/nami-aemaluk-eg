'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
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
  Mail,
  Gift,
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
import { notFound } from 'next/navigation';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
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
import PosProductToolbar from '@/components/pos/PosProductToolbar';
import PosCustomerAndHeldModals from '@/components/pos/PosCustomerAndHeldModals';
import PosAuditTrailModal from '@/components/pos/PosAuditTrailModal';
import PosPriceLevelPopover from '@/components/pos/PosPriceLevelPopover';
import PosGiftCardPrompt from '@/components/pos/PosGiftCardPrompt';
import PosEmailReceiptModal from '@/components/pos/PosEmailReceiptModal';
import PosTablesModal from '@/components/pos/PosTablesModal';
import PosLayawayModal from '@/components/pos/PosLayawayModal';
import PosCameraScannerModal from '@/components/pos/PosCameraScannerModal';
import PosPriceOverrideModal from '@/components/pos/PosPriceOverrideModal';
import PosXReportModal from '@/components/pos/PosXReportModal';
import PosZReportModal from '@/components/pos/PosZReportModal';
import PosCashMovementModal from '@/components/pos/PosCashMovementModal';
import PosDrawerDeclarationModal from '@/components/pos/PosDrawerDeclarationModal';
import PosQuickKeysModal from '@/components/pos/PosQuickKeysModal';
import PosReceiptSettingsModal from '@/components/pos/PosReceiptSettingsModal';
import PosLoyaltySettingsModal from '@/components/pos/PosLoyaltySettingsModal';
import PosSignatureModal from '@/components/pos/PosSignatureModal';
import PosInvoicesModal from '@/components/pos/PosInvoicesModal';
import PosQuickReturnModal from '@/components/pos/PosQuickReturnModal';
import PosGateModal from '@/components/pos/PosGateModal';
import PosProductGrid from '@/components/pos/PosProductGrid';
import PosConfigModal from '@/components/pos/PosConfigModal';
import PosCartPanel from '@/components/pos/PosCartPanel';
import { type CartItem, type PendingOrder } from './types';
import { SHOW_UNPUBLISHED } from './constants';
import {
  readCachedList,
  readPendingOrders,
  writePendingOrders,
  enqueuePendingOrder,
  getPosOrderRequestKey,
  clearPosOrderRequestKey,
  isNetworkError,
} from './offline-queue';
import { playCashRegisterSound } from './audio';

const MotionDiv = motion.div as any;

const POSSystemPage: React.FC = () => {
  if (HIDE_UNPUBLISHED) {
    notFound();
  }
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
        next.requestKey ||= next.id;
        writePendingOrders(shopId, queue);
        const resp = await apiRequest(`/shops/${shopId}/orders`, {
          method: 'POST',
          headers: { 'X-Idempotency-Key': next.requestKey },
          body: JSON.stringify(next.payload),
        });
        clearPosOrderRequestKey(next.requestStorageKey);
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
    let orderRequestKey = '';
    let orderRequestStorageKey = '';
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
              window.dispatchEvent(
                new CustomEvent('pos-toast', {
                  detail: {
                    message: `العميل موجود مسبقًا — تم استخدام سجل ${custRes.data?.name || ''} في النظام كله`,
                  },
                })
              );
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

      const requestKey = await getPosOrderRequestKey(shopId, orderPayload);
      orderRequestKey = requestKey.key;
      orderRequestStorageKey = requestKey.storageKey;
      const createdOrder = await apiRequest(`/shops/${shopId}/orders`, {
        method: 'POST',
        headers: { 'X-Idempotency-Key': orderRequestKey },
        body: JSON.stringify(orderPayload),
      });
      clearPosOrderRequestKey(orderRequestStorageKey);

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
        enqueuePendingOrder(
          shopId,
          orderPayload,
          orderRequestKey,
          orderRequestStorageKey || undefined
        );
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
    const allReturned = items.every((it: any, _idx: number) => {
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
          <PosProductToolbar
            isArabic={isArabic}
            searchInputRef={searchInputRef}
            search={search}
            setSearch={setSearch}
            categories={categories}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            showCategoryFilter={showCategoryFilter}
            setShowCategoryFilter={setShowCategoryFilter}
          />
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
                  {isArabic ? `الكاشير: ${shiftOwnerName}` : `Cashier: ${shiftOwnerName}`}
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
                <span>
                  {isArabic ? `${shiftStrip.ordersCount} طلب` : `${shiftStrip.ordersCount} orders`}
                </span>
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
        <PosProductGrid
          products={products}
          filteredProducts={filteredProducts}
          pagedProducts={pagedProducts}
          isArabic={isArabic}
          getProductStock={getProductStock}
          getProductEffectivePrice={getProductEffectivePrice}
          isFashion={isFashion}
          isRestaurant={isRestaurant}
          shopAddonsDef={shopAddonsDef}
          addToCart={addToCart}
          setConfigProduct={setConfigProduct}
          setSelectedAddons={setSelectedAddons}
          setIsConfigOpen={setIsConfigOpen}
          handleToggleQuickKey={handleToggleQuickKey}
          quickKeyIds={quickKeyIds}
          productsPage={productsPage}
          setProductsPage={setProductsPage}
          totalProductPages={totalProductPages}
        />{' '}
      </div>

      {/* Desktop cart sidebar */}
      <div className="hidden md:flex w-full md:w-[450px] bg-white border-r border-slate-100 flex-col shadow-2xl relative z-50">
        <PosCartPanel
          addToCart={addToCart}
          canCheckout={canCheckout}
          cart={cart}
          discountAmount={discountAmount}
          discountType={discountType}
          discountValue={discountValue}
          earnedPoints={earnedPoints}
          editingOrder={editingOrder}
          giftCardAmount={giftCardAmount}
          giftCardApplied={giftCardApplied}
          handlePrintReceipt={handlePrintReceipt}
          handleReadScale={handleReadScale}
          isArabic={isArabic}
          isProcessing={isProcessing}
          loadReportData={loadReportData}
          loyaltyCfg={loyaltyCfg}
          loyaltyRedeemValue={loyaltyRedeemValue}
          openXReport={openXReport}
          openZReport={openZReport}
          paymentMethod={paymentMethod}
          priceLevel={priceLevel}
          processPayment={processPayment}
          quickKeyProducts={quickKeyProducts}
          redeemPoints={redeemPoints}
          removeFromCart={removeFromCart}
          removeGiftCard={removeGiftCard}
          scaleLoading={scaleLoading}
          scaleReading={scaleReading}
          selectedTableId={selectedTableId}
          showAdvanced={showAdvanced}
          showAuditTrail={showAuditTrail}
          showDiscount={showDiscount}
          showPaymentMethods={showPaymentMethods}
          showQuickKeys={showQuickKeys}
          showTipSection={showTipSection}
          signatureData={signatureData}
          splitPayments={splitPayments}
          splitValidation={splitValidation}
          startPriceOverride={startPriceOverride}
          startSignatureDrawing={startSignatureDrawing}
          subtotal={subtotal}
          tables={tables}
          taxExempt={taxExempt}
          tipAmount={tipAmount}
          tipType={tipType}
          tipValue={tipValue}
          total={total}
          updateQuantity={updateQuantity}
          usingSplitPayment={usingSplitPayment}
          vatRatePct={vatRatePct}
          vatAmount={vatAmount}
          SHOW_UNPUBLISHED={SHOW_UNPUBLISHED}
          isRestaurant={isRestaurant}
          setCart={setCart}
          setCashMovementType={setCashMovementType}
          setDiscountType={setDiscountType}
          setDiscountValue={setDiscountValue}
          setEditingOrder={setEditingOrder}
          setGiftCardApplied={setGiftCardApplied}
          setGiftCardCode={setGiftCardCode}
          setIsProcessing={setIsProcessing}
          setLoyaltyCfg={setLoyaltyCfg}
          setPaymentMethod={setPaymentMethod}
          setPriceLevel={setPriceLevel}
          setRedeemPoints={setRedeemPoints}
          setScaleLoading={setScaleLoading}
          setScaleReading={setScaleReading}
          setSelectedTableId={setSelectedTableId}
          setShowAdvanced={setShowAdvanced}
          setShowCashMovement={setShowCashMovement}
          setShowDiscount={setShowDiscount}
          setShowDrawerDeclaration={setShowDrawerDeclaration}
          setShowEmailReceipt={setShowEmailReceipt}
          setShowLayaway={setShowLayaway}
          setShowLoyaltySettings={setShowLoyaltySettings}
          setShowPaymentMethods={setShowPaymentMethods}
          setShowPriceLevelMenu={setShowPriceLevelMenu}
          setShowQuickKeys={setShowQuickKeys}
          setShowReceiptSettings={setShowReceiptSettings}
          setShowSignature={setShowSignature}
          setShowSplitPayment={setShowSplitPayment}
          setShowTables={setShowTables}
          setShowTipSection={setShowTipSection}
          setSignatureData={setSignatureData}
          setSplitPayments={setSplitPayments}
          setTables={setTables}
          setTaxExempt={setTaxExempt}
          setTipType={setTipType}
          setTipValue={setTipValue}
          setVatRatePct={setVatRatePct}
        />
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
            <PosCartPanel
              addToCart={addToCart}
              canCheckout={canCheckout}
              cart={cart}
              discountAmount={discountAmount}
              discountType={discountType}
              discountValue={discountValue}
              earnedPoints={earnedPoints}
              editingOrder={editingOrder}
              giftCardAmount={giftCardAmount}
              giftCardApplied={giftCardApplied}
              handlePrintReceipt={handlePrintReceipt}
              handleReadScale={handleReadScale}
              isArabic={isArabic}
              isProcessing={isProcessing}
              loadReportData={loadReportData}
              loyaltyCfg={loyaltyCfg}
              loyaltyRedeemValue={loyaltyRedeemValue}
              openXReport={openXReport}
              openZReport={openZReport}
              paymentMethod={paymentMethod}
              priceLevel={priceLevel}
              processPayment={processPayment}
              quickKeyProducts={quickKeyProducts}
              redeemPoints={redeemPoints}
              removeFromCart={removeFromCart}
              removeGiftCard={removeGiftCard}
              scaleLoading={scaleLoading}
              scaleReading={scaleReading}
              selectedTableId={selectedTableId}
              showAdvanced={showAdvanced}
              showAuditTrail={showAuditTrail}
              showDiscount={showDiscount}
              showPaymentMethods={showPaymentMethods}
              showQuickKeys={showQuickKeys}
              showTipSection={showTipSection}
              signatureData={signatureData}
              splitPayments={splitPayments}
              splitValidation={splitValidation}
              startPriceOverride={startPriceOverride}
              startSignatureDrawing={startSignatureDrawing}
              subtotal={subtotal}
              tables={tables}
              taxExempt={taxExempt}
              tipAmount={tipAmount}
              tipType={tipType}
              tipValue={tipValue}
              total={total}
              updateQuantity={updateQuantity}
              usingSplitPayment={usingSplitPayment}
              vatRatePct={vatRatePct}
              vatAmount={vatAmount}
              SHOW_UNPUBLISHED={SHOW_UNPUBLISHED}
              isRestaurant={isRestaurant}
              setCart={setCart}
              setCashMovementType={setCashMovementType}
              setDiscountType={setDiscountType}
              setDiscountValue={setDiscountValue}
              setEditingOrder={setEditingOrder}
              setGiftCardApplied={setGiftCardApplied}
              setGiftCardCode={setGiftCardCode}
              setIsProcessing={setIsProcessing}
              setLoyaltyCfg={setLoyaltyCfg}
              setPaymentMethod={setPaymentMethod}
              setPriceLevel={setPriceLevel}
              setRedeemPoints={setRedeemPoints}
              setScaleLoading={setScaleLoading}
              setScaleReading={setScaleReading}
              setSelectedTableId={setSelectedTableId}
              setShowAdvanced={setShowAdvanced}
              setShowCashMovement={setShowCashMovement}
              setShowDiscount={setShowDiscount}
              setShowDrawerDeclaration={setShowDrawerDeclaration}
              setShowEmailReceipt={setShowEmailReceipt}
              setShowLayaway={setShowLayaway}
              setShowLoyaltySettings={setShowLoyaltySettings}
              setShowPaymentMethods={setShowPaymentMethods}
              setShowPriceLevelMenu={setShowPriceLevelMenu}
              setShowQuickKeys={setShowQuickKeys}
              setShowReceiptSettings={setShowReceiptSettings}
              setShowSignature={setShowSignature}
              setShowSplitPayment={setShowSplitPayment}
              setShowTables={setShowTables}
              setShowTipSection={setShowTipSection}
              setSignatureData={setSignatureData}
              setSplitPayments={setSplitPayments}
              setTables={setTables}
              setTaxExempt={setTaxExempt}
              setTipType={setTipType}
              setTipValue={setTipValue}
              setVatRatePct={setVatRatePct}
            />
          </MotionDiv>
        )}
      </AnimatePresence>

      <PosConfigModal
        cart={cart}
        configProduct={configProduct}
        getProductEffectivePrice={getProductEffectivePrice}
        isArabic={isArabic}
        isConfigOpen={isConfigOpen}
        isFashion={isFashion}
        isRestaurant={isRestaurant}
        selectedAddons={selectedAddons}
        selectedFashionColorValue={selectedFashionColorValue}
        selectedFashionSize={selectedFashionSize}
        selectedMenuSizeId={selectedMenuSizeId}
        selectedMenuTypeId={selectedMenuTypeId}
        setCart={setCart}
        setIsConfigOpen={setIsConfigOpen}
        setSelectedAddons={setSelectedAddons}
        setSelectedFashionColorValue={setSelectedFashionColorValue}
        setSelectedFashionSize={setSelectedFashionSize}
        setSelectedMenuSizeId={setSelectedMenuSizeId}
        setSelectedMenuTypeId={setSelectedMenuTypeId}
        shopAddonsDef={shopAddonsDef}
      />

      <PosCustomerAndHeldModals
        isArabic={isArabic}
        showSuccess={showSuccess}
        isCustomerCardOpen={isCustomerCardOpen}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        onCloseCustomerCard={() => setIsCustomerCardOpen(false)}
        isCustomerListOpen={isCustomerListOpen}
        onCloseCustomerList={() => setIsCustomerListOpen(false)}
        customerSearchQuery={customerSearchQuery}
        setCustomerSearchQuery={setCustomerSearchQuery}
        savedCustomers={savedCustomers}
        isLoadingCustomers={isLoadingCustomers}
        onSelectCustomer={(customer) => {
          setCustomerName(customer.name || '');
          setCustomerPhone(customer.phone || '');
          setIsCustomerListOpen(false);
        }}
        showHeldOrders={showHeldOrders}
        heldOrders={heldOrders}
        onCloseHeldOrders={() => setShowHeldOrders(false)}
        onResumeHeldOrder={resumeHeldOrder}
        onDeleteHeldOrder={deleteHeldOrder}
      />

      <PosCameraScannerModal
        show={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        videoRef={cameraVideoRef}
        error={cameraError}
        isArabic={isArabic}
      />

      <PosPriceOverrideModal
        overrideId={priceOverrideId}
        onClose={() => setPriceOverrideId(null)}
        value={priceOverrideValue}
        onValueChange={setPriceOverrideValue}
        onApply={applyPriceOverride}
        isArabic={isArabic}
      />

      {/* Keyboard shortcuts help (long-press barcode button shows a hint) */}
      {barcodeListening && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-lg flex items-center gap-2 animate-pulse">
          <ScanLine size={14} />{' '}
          {isArabic
            ? 'قارئ الباركود يعمل — امسح المنتج الآن'
            : 'Barcode scanner ON — scan a product'}
        </div>
      )}

      <PosReceiptSettingsModal
        show={showReceiptSettings}
        onClose={() => setShowReceiptSettings(false)}
        theme={receiptTheme}
        onThemeChange={setReceiptTheme}
        onVatRateChange={setVatRatePct}
        onSave={() => {
          saveReceiptTheme(shopId, receiptTheme);
          setShowReceiptSettings(false);
        }}
        isArabic={isArabic}
      />

      <PosLoyaltySettingsModal
        show={showLoyaltySettings}
        onClose={() => setShowLoyaltySettings(false)}
        cfg={loyaltyCfg}
        onCfgChange={setLoyaltyCfg}
        onSave={() => {
          saveLoyaltyConfig(shopId, loyaltyCfg);
          setShowLoyaltySettings(false);
        }}
        isArabic={isArabic}
      />

      <PosSignatureModal
        show={showSignature}
        onClose={() => setShowSignature(false)}
        canvasRef={signatureCanvasRef}
        onClear={clearSignature}
        onSave={saveSignature}
        hasSignature={!!signatureData}
        isArabic={isArabic}
      />

      <PosEmailReceiptModal
        show={showEmailReceipt}
        onClose={() => setShowEmailReceipt(false)}
        email={receiptEmail}
        onEmailChange={setReceiptEmail}
        onSend={handleEmailReceipt}
        isArabic={isArabic}
      />

      <PosTablesModal
        show={showTables}
        onClose={() => setShowTables(false)}
        tables={tables}
        selectedTableId={selectedTableId}
        onSelect={selectTable}
        onAdd={addTable}
        isArabic={isArabic}
      />

      <PosLayawayModal
        show={showLayaway}
        onClose={() => setShowLayaway(false)}
        total={total}
        cartLength={cart.length}
        deposit={layawayDeposit}
        onDepositChange={setLayawayDeposit}
        onCreate={createLayaway}
        layaways={layaways}
        isArabic={isArabic}
      />

      {/* Audit trail modal */}
      <PosAuditTrailModal
        show={showAudit}
        onClose={() => setShowAudit(false)}
        entries={auditEntries}
        isArabic={isArabic}
      />

      <PosPriceLevelPopover
        show={showPriceLevelMenu}
        onClose={() => setShowPriceLevelMenu(false)}
        current={priceLevel}
        onSelect={applyPriceLevel}
        isArabic={isArabic}
      />

      <PosGiftCardPrompt
        code={giftCardCode}
        applied={!!giftCardApplied}
        error={giftCardError}
        isArabic={isArabic}
        onApply={handleApplyGiftCard}
        onDismiss={() => {
          setGiftCardCode('');
          setGiftCardError('');
        }}
      />

      <PosXReportModal
        show={showXReport}
        onClose={() => setShowXReport(false)}
        reportData={reportData}
        isArabic={isArabic}
      />

      <PosZReportModal
        show={showZReport}
        onClose={() => setShowZReport(false)}
        reportData={reportData}
        isArabic={isArabic}
        onDeclareDrawer={() => {
          setShowZReport(false);
          setShowDrawerDeclaration(true);
        }}
      />

      <PosCashMovementModal
        show={showCashMovement}
        onClose={() => setShowCashMovement(false)}
        type={cashMovementType}
        onTypeChange={setCashMovementType}
        amount={cashMovementAmount}
        onAmountChange={setCashMovementAmount}
        reason={cashMovementReason}
        onReasonChange={setCashMovementReason}
        onSubmit={submitCashMovement}
        movements={cashMovements}
        isArabic={isArabic}
      />

      <PosDrawerDeclarationModal
        show={showDrawerDeclaration}
        onClose={() => setShowDrawerDeclaration(false)}
        expectedCash={reportData.netCash}
        declaredCash={declaredCash}
        onDeclaredCashChange={setDeclaredCash}
        note={declarationNote}
        onNoteChange={setDeclarationNote}
        onSubmit={submitDrawerDeclaration}
        declarations={declarations}
        isArabic={isArabic}
      />

      <PosQuickKeysModal
        show={showQuickKeys && quickKeyProducts.length === 0 && products.length > 0}
        onClose={() => setShowQuickKeys(false)}
        filteredProducts={filteredProducts}
        quickKeyIds={quickKeyIds}
        onToggle={handleToggleQuickKey}
        isArabic={isArabic}
      />
      <PosInvoicesModal
        show={showInvoices}
        onClose={() => setShowInvoices(false)}
        invoices={posInvoices}
        loading={invoicesLoading}
        statusStyle={invoiceStatusStyle}
        onReprint={reprintInvoice}
        onReturn={startReturn}
        onEdit={startEditOrder}
        isArabic={isArabic}
      />

      <PosQuickReturnModal
        order={returnOrder}
        onClose={() => setReturnOrder(null)}
        qtys={returnQtys}
        onQtysChange={setReturnQtys}
        toStock={returnToStock}
        onToStockChange={setReturnToStock}
        reason={returnReason}
        onReasonChange={setReturnReason}
        total={returnTotal}
        submitting={returnSubmitting}
        onSubmit={submitReturn}
        isArabic={isArabic}
      />

      <PosGateModal
        show={isGated}
        mode={gateMode}
        openingCash={gateOpeningCash}
        onOpeningCashChange={setGateOpeningCash}
        cashierId={gateCashierId}
        onCashierIdChange={setGateCashierId}
        cashiers={gateCashiers}
        pin={gatePin}
        onPinChange={setGatePin}
        showPin={gateShowPin}
        onToggleShowPin={() => setGateShowPin((v) => !v)}
        error={gateError}
        submitting={gateSubmitting}
        onSubmit={submitGate}
        hasAdminPin={Boolean(loadPosSettings(shop).adminPin)}
        hasCashiers={hasCashiers}
      />
    </div>
  );
};

export default POSSystemPage;
