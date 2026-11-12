// شاشة الكاشير — نفس تصميم وترتيب صفحة POS الداشبورد:
// هيدر (بحث F2 / تصنيفات / تعليق / باركود) + شريط الوردية الحية +
// شبكة منتجات بنفس الكارت + سلة جانبية 450px + خصم + طرق دفع 4 + دفع الآن.
// كل عملية بيع تتسجل محليًا فورًا وبتتزامن أوتوماتيك لما النت يشتغل.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Filter,
  Lock,
  Pause,
  Play,
  ScanLine,
  UserRound,
  CloudOff,
  Cloud,
  Receipt,
  BarChart3,
} from 'lucide-react';
import {
  api,
  onEvent,
  type Product,
  type Shift,
  type SyncStatus,
  type Order,
  type OrderItem,
  type ShiftReport,
  type HeldOrder,
} from '../lib/api';
import { generateReceiptHtml, printReceipt } from '../lib/receipt';
import PosCartPanel from './pos/PosCartPanel';
import OrderHistoryModals from './pos/OrderHistoryModals';
import ProductGrid from './pos/ProductGrid';
import ReceiptModal from './pos/ReceiptModal';
import ShiftModals from './pos/ShiftModals';
import { money, type CartItem, type PaymentMethod } from './pos/types';

const PAGE_SIZE = 60;

export default function Pos({ onLock }: { onLock: () => void }) {
  // ─── data ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [cashier, setCashier] = useState<{ id: string; name: string; isAdmin: boolean } | null>(
    null
  );
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [shopName, setShopName] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  // ─── ui state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [barcodeListening, setBarcodeListening] = useState(true);

  // modals
  const [receipt, setReceipt] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [closingAmount, setClosingAmount] = useState(0);
  const [closingNote, setClosingNote] = useState('');
  const [closingBusy, setClosingBusy] = useState(false);
  const [closingError, setClosingError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [showCashMove, setShowCashMove] = useState(false);
  const [cashMoveKind, setCashMoveKind] = useState<'in' | 'out'>('in');
  const [cashMoveAmount, setCashMoveAmount] = useState(0);
  const [cashMoveNote, setCashMoveNote] = useState('');
  const [cashMoveBusy, setCashMoveBusy] = useState(false);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [invoices, setInvoices] = useState<Order[]>([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [toast, setToast] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [tick, setTick] = useState(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // ─── load ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const [prods, cats, shift] = await Promise.all([
      api.getProducts('', ''),
      api.getCategories(),
      api.getActiveShift(),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setActiveShift(shift);
  }, []);

  useEffect(() => {
    loadAll();
    api.getSyncStatus().then(setSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh shift strip + report every 30s
  useEffect(() => {
    const t = setInterval(async () => {
      setTick((v) => v + 1);
      const shift = await api.getActiveShift();
      setActiveShift(shift);
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  // sync status live
  useEffect(
    () =>
      onEvent('sync:status', (st: SyncStatus) => {
        setSync(st);
        if (st.online) loadAll();
      }),
    [loadAll]
  );

  // cashier changed (lock event from Go)
  useEffect(
    () =>
      onEvent('cashier:changed', (c: any) => {
        if (!c) onLock();
        else setCashier({ id: c.id, name: c.name, isAdmin: !!c.isAdmin });
      }),
    [onLock]
  );

  useEffect(() => {
    api.getState().then((st) => {
      setShopName(st.shopName);
      setServerUrl(st.serverUrl);
    });
  }, []);

  // F2 → focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // USB barcode: fast-typed chars ending with Enter
  const barcodeBuf = useRef({ chars: '', last: 0 });
  useEffect(() => {
    if (!barcodeListening) return;
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now();
      const b = barcodeBuf.current;
      if (now - b.last > 60) b.chars = '';
      b.last = now;
      if (e.key === 'Enter') {
        const code = b.chars.trim();
        b.chars = '';
        if (code.length >= 4) {
          const p = products.find((pr) => pr.barcode === code || pr.id === code);
          if (p) addToCart(p, 1);
          else {
            setSearch(code);
            showToast('مفيش منتج بالباركود ده — بيدور بالاسم');
          }
        }
        return;
      }
      if (e.key.length === 1) b.chars += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeListening, products]);

  // ─── derived ─────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q);
    });
  }, [products, search, categoryFilter]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = useMemo(
    () => filteredProducts.slice((productsPage - 1) * PAGE_SIZE, productsPage * PAGE_SIZE),
    [filteredProducts, productsPage]
  );
  useEffect(() => setProductsPage(1), [search, categoryFilter]);

  const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.quantity, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (discountType === 'percent')
      return (Math.min(100, Math.max(0, discountValue)) * subtotal) / 100;
    if (discountType === 'fixed') return Math.min(subtotal, Math.max(0, discountValue));
    return 0;
  }, [discountType, discountValue, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);

  const pendingCount = sync?.pending ?? 0;

  // ─── cart ops ────────────────────────────────────────────────────────────
  const addToCart = (p: Product, qty: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: qty }];
    });
  };
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => (it.productId === productId ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };
  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((it) => it.productId !== productId));

  const holdCurrentOrder = async () => {
    if (cart.length === 0) return;
    const label = `${cart[0].name}${cart.length > 1 ? ` +${cart.length - 1}` : ''} — ${money(total)}`;
    await api.holdOrder(label, JSON.stringify(cart));
    setCart([]);
    showToast('الطلب اتعلق ✅');
  };

  const openHeld = async () => {
    setHeldOrders((await api.getHeldOrders()) || []);
    setShowHeld(true);
  };

  const resumeHeld = (h: HeldOrder) => {
    try {
      const items = JSON.parse(h.payload) as CartItem[];
      setCart(items);
      api.deleteHeldOrder(h.id);
      setShowHeld(false);
    } catch {
      /* ignore */
    }
  };

  const deleteHeld = async (id: string) => {
    await api.deleteHeldOrder(id);
    setHeldOrders(await api.getHeldOrders());
  };

  // ─── checkout ────────────────────────────────────────────────────────────
  const processPayment = async () => {
    if (checkoutBusy || cart.length === 0) return;
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const res = await api.checkout({
        items: cart.map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        paymentMethod,
        discountType,
        discountValue,
        customerName,
        customerPhone,
        notes: orderNotes,
      });
      setReceipt({ order: res.order, items: res.items });
      setCart([]);
      setDiscountType('none');
      setDiscountValue(0);
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');
      // cash drawer kick + refresh numbers
      const shift = await api.getActiveShift();
      setActiveShift(shift);
      // beep like the dashboard cash-register sound
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.15);
      } catch {
        /* no audio */
      }
    } catch (e: any) {
      setCheckoutError(String(e?.message || e));
    } finally {
      setCheckoutBusy(false);
    }
  };

  // ─── shift ops ───────────────────────────────────────────────────────────
  const openCloseShift = async () => {
    setClosingAmount(activeShift ? activeShift.openingAmount + activeShift.totalSales : 0);
    setClosingNote('');
    setClosingError('');
    setShowCloseShift(true);
  };

  const submitCloseShift = async () => {
    setClosingBusy(true);
    setClosingError('');
    try {
      await api.closeShift(Math.max(0, closingAmount), closingNote);
      setShowCloseShift(false);
      showToast('اتقفلت الوردية ✅');
      const shift = await api.getActiveShift();
      setActiveShift(shift);
      onLock();
    } catch (e: any) {
      setClosingError(String(e?.message || e));
    } finally {
      setClosingBusy(false);
    }
  };

  const openReport = async () => {
    setReport(await api.getShiftReport());
    setShowReport(true);
  };

  const submitCashMove = async () => {
    setCashMoveBusy(true);
    try {
      await api.addCashMovement(cashMoveKind, cashMoveAmount, cashMoveNote);
      setShowCashMove(false);
      setCashMoveAmount(0);
      setCashMoveNote('');
      showToast(cashMoveKind === 'in' ? 'اتسجل فلوس داخلية ✅' : 'اتسجل فلوس خارجية ✅');
    } catch (e: any) {
      showToast(String(e?.message || e));
    } finally {
      setCashMoveBusy(false);
    }
  };

  // ─── live shift strip (same as dashboard) ────────────────────────────────
  const strip = useMemo(() => {
    if (!activeShift) return null;
    void tick;
    const openedMs = activeShift.openedAt ? new Date(activeShift.openedAt + 'Z').getTime() : 0;
    const elapsedMins = openedMs ? Math.max(0, Math.floor((Date.now() - openedMs) / 60000)) : 0;
    return {
      hours: Math.floor(elapsedMins / 60),
      minutes: elapsedMins % 60,
      totalSales: money(activeShift.totalSales),
      ordersCount: activeShift.ordersCount,
      expectedDrawer: money(activeShift.openingAmount + activeShift.totalSales),
    };
  }, [activeShift, tick]);

  // ─── render ──────────────────────────────────────────────────────────────
  const cartContent = (
    <PosCartPanel
      cart={cart}
      removeFromCart={removeFromCart}
      updateQuantity={updateQuantity}
      showDiscount={showDiscount}
      setShowDiscount={setShowDiscount}
      discountType={discountType}
      setDiscountType={setDiscountType}
      discountValue={discountValue}
      setDiscountValue={setDiscountValue}
      paymentMethod={paymentMethod}
      showPaymentMethods={showPaymentMethods}
      setShowPaymentMethods={setShowPaymentMethods}
      setPaymentMethod={setPaymentMethod}
      customerName={customerName}
      setCustomerName={setCustomerName}
      customerPhone={customerPhone}
      setCustomerPhone={setCustomerPhone}
      orderNotes={orderNotes}
      setOrderNotes={setOrderNotes}
      showCustomer={showCustomer}
      setShowCustomer={setShowCustomer}
      subtotal={subtotal}
      discountAmount={discountAmount}
      total={total}
      processPayment={processPayment}
      checkoutBusy={checkoutBusy}
      checkoutError={checkoutError}
    />
  );

  return (
    <div className="h-full bg-white flex flex-row font-sans text-right overflow-hidden" dir="rtl">
      {/* ─── Products side ─── */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <header className="p-3 md:p-6 bg-white border-b flex items-center gap-2 md:gap-4 flex-wrap">
          <div className="p-2 bg-[#BD00FF]/10 rounded-xl shrink-0">
            <span className="font-black text-[#BD00FF] text-sm">🧾</span>
          </div>
          <div className="flex-1 relative min-w-[150px]">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="بحث عن منتج... (F2)"
              className="w-full bg-slate-50 border rounded-2xl py-2.5 md:py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-[#BD00FF] text-sm md:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryFilter((v) => !v)}
                className={`p-2.5 md:p-3 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all ${
                  categoryFilter !== 'all'
                    ? 'bg-[#BD00FF]/10 border-[#BD00FF] text-[#BD00FF]'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Filter size={16} />
                <span className="hidden md:inline">
                  {categoryFilter === 'all' ? 'الكل' : categoryFilter}
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
                    className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 ${
                      categoryFilter === 'all' ? 'text-[#BD00FF]' : 'text-slate-700'
                    }`}
                  >
                    كل التصنيفات
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(c);
                        setShowCategoryFilter(false);
                      }}
                      className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 border-t border-slate-50 ${
                        categoryFilter === c ? 'text-[#BD00FF]' : 'text-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={holdCurrentOrder}
              disabled={cart.length === 0}
              className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5 text-xs font-black text-amber-700 disabled:opacity-40"
              title="تعليق الطلب (F6)"
            >
              <Pause size={18} />
              <span className="hidden md:inline">تعليق</span>
            </button>
            <button
              type="button"
              onClick={openHeld}
              className="relative p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
              title="الطلبات المعلقة (F7)"
            >
              <Play size={18} />
              <span className="hidden md:inline">معلقة</span>
              {heldOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {heldOrders.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setBarcodeListening((v) => !v)}
              className={`p-2.5 md:p-3 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-black ${
                barcodeListening
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
              title="قارئ الباركود USB (F8)"
            >
              <ScanLine size={18} />
              <span className="hidden md:inline">{barcodeListening ? 'يعمل' : 'باركود'}</span>
            </button>
          </div>

          {/* quick actions — same chips as the dashboard POS header */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {cashier?.name && (
              <div
                className="p-2.5 md:p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-1.5 text-xs font-black text-[#BD00FF]"
                title="الكاشير الحالي"
              >
                <UserRound size={18} />
                <span className="hidden md:inline">
                  {cashier.isAdmin ? 'أدمن' : `الكاشير: ${cashier.name}`}
                </span>
                <span className="md:hidden">{cashier.name}</span>
              </div>
            )}
            {pendingCount > 0 ? (
              <div
                className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-xs font-black text-amber-700"
                title="طلبات في انتظار المزامنة"
              >
                <CloudOff size={18} />
                <span className="hidden md:inline">{pendingCount} طلب معلق</span>
                <span className="md:hidden">{pendingCount}</span>
              </div>
            ) : (
              <div
                className={`p-2.5 md:p-3 rounded-xl border flex items-center gap-1.5 text-xs font-black ${
                  sync?.online
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
                title={
                  sync?.online
                    ? `آخر مزامنة: ${sync?.lastSync || '-'}`
                    : 'أوفلاين — البيع شغال وبيتزامن أول ما النت يرجع'
                }
              >
                {sync?.online ? <Cloud size={18} /> : <CloudOff size={18} />}
                <span className="hidden md:inline">{sync?.online ? 'متزامن' : 'أوفلاين'}</span>
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                setInvoices((await api.getOrders('')) || []);
                setShowInvoices(true);
              }}
              className="p-2.5 md:p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#0098a8] hover:bg-[#00E5FF]/20 transition-all flex items-center gap-1.5 text-xs font-black"
              title="فواتير الكاشير"
            >
              <Receipt size={18} />
              <span className="hidden md:inline">فواتير</span>
            </button>
            <button
              type="button"
              onClick={openReport}
              className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
              title="تقرير الوردية (X)"
            >
              <BarChart3 size={18} />
              <span className="hidden md:inline">تقرير</span>
            </button>
            <button
              type="button"
              onClick={openCloseShift}
              className="p-2.5 md:p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-all flex items-center gap-1.5 text-xs font-black text-red-600"
              title="إغلاق الوردية (Z)"
            >
              <Lock size={18} />
              <span className="hidden md:inline">إغلاق الوردية</span>
            </button>
          </div>
        </header>

        {/* live shift strip */}
        {strip && (
          <div className="bg-gradient-to-l from-emerald-500/10 to-emerald-400/5 border-b border-emerald-100 px-4 md:px-6 py-2 flex items-center gap-4 md:gap-8 overflow-x-auto">
            <span className="text-xs font-black text-emerald-700 whitespace-nowrap">
              ⏱ {strip.hours}س {strip.minutes}د
            </span>
            <span className="text-xs font-black text-emerald-700 whitespace-nowrap">
              💰 {strip.totalSales} ج.م
            </span>
            <span className="text-xs font-black text-emerald-700 whitespace-nowrap">
              🧾 {strip.ordersCount} فاتورة
            </span>
            <span className="text-xs font-black text-emerald-700 whitespace-nowrap">
              🗄 الدرج المتوقع: {strip.expectedDrawer} ج.م
            </span>
            <button
              type="button"
              onClick={() => {
                setCashMoveKind('in');
                setShowCashMove(true);
              }}
              className="text-[11px] font-black text-emerald-600 underline hover:text-emerald-800 whitespace-nowrap"
            >
              حركة كاش
            </button>
          </div>
        )}

        {/* product grid */}
        <ProductGrid
          products={products}
          pagedProducts={pagedProducts}
          filteredCount={filteredProducts.length}
          serverUrl={serverUrl}
          page={productsPage}
          totalPages={totalProductPages}
          setPage={setProductsPage}
          onAdd={addToCart}
        />
      </div>

      {/* ─── Desktop cart sidebar ─── */}
      <div className="hidden md:flex w-[450px] bg-white border-r flex-col">{cartContent}</div>

      {/* ─── toast ─── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10060] bg-slate-900 text-white text-xs font-black px-5 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <ReceiptModal
        receipt={receipt}
        onPrint={({ order, items }) =>
          printReceipt(generateReceiptHtml(order, items, shopName, order.cashierName || ''))
        }
        onClose={() => setReceipt(null)}
      />

      {/* ─── close shift modal (Z) ─── */}
      <ShiftModals
        activeShift={activeShift}
        showCloseShift={showCloseShift}
        closingAmount={closingAmount}
        closingNote={closingNote}
        closingBusy={closingBusy}
        closingError={closingError}
        onClosingAmountChange={setClosingAmount}
        onClosingNoteChange={setClosingNote}
        onSubmitCloseShift={submitCloseShift}
        onCloseCloseShift={() => setShowCloseShift(false)}
        showReport={showReport}
        report={report}
        onCloseReport={() => setShowReport(false)}
        onOpenCashMove={() => {
          setCashMoveKind('in');
          setShowCashMove(true);
        }}
        showCashMove={showCashMove}
        cashMoveKind={cashMoveKind}
        cashMoveAmount={cashMoveAmount}
        cashMoveNote={cashMoveNote}
        cashMoveBusy={cashMoveBusy}
        onCashMoveKindChange={setCashMoveKind}
        onCashMoveAmountChange={setCashMoveAmount}
        onCashMoveNoteChange={setCashMoveNote}
        onSubmitCashMove={submitCashMove}
        onCloseCashMove={() => setShowCashMove(false)}
      />

      <OrderHistoryModals
        heldOrders={heldOrders}
        showHeld={showHeld}
        onCloseHeld={() => setShowHeld(false)}
        onResumeHeld={resumeHeld}
        onDeleteHeld={deleteHeld}
        invoices={invoices}
        showInvoices={showInvoices}
        onCloseInvoices={() => setShowInvoices(false)}
      />
    </div>
  );
}
