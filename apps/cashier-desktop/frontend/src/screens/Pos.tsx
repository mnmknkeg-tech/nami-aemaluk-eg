// شاشة الكاشير — نفس تصميم وترتيب صفحة POS الداشبورد:
// هيدر (بحث F2 / تصنيفات / تعليق / باركود) + شريط الوردية الحية +
// شبكة منتجات بنفس الكارت + سلة جانبية 450px + خصم + طرق دفع 4 + دفع الآن.
// كل عملية بيع تتسجل محليًا فورًا وبتتزامن أوتوماتيك لما النت يشتغل.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  Banknote,
  CreditCard,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Lock,
  Loader2,
  Pause,
  Play,
  ScanLine,
  UserRound,
  CloudOff,
  Cloud,
  Receipt,
  BarChart3,
  X,
  Printer,
  CheckCircle2,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Package,
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
  type CashMovement,
} from '../lib/api';
import { generateReceiptHtml, printReceipt } from '../lib/receipt';

type CartItem = { productId: string; name: string; price: number; quantity: number };
type PaymentMethod = 'cash' | 'card' | 'wallet' | 'credit';

const money = (n: number) => (Number.isFinite(n) ? Number(n).toFixed(2) : '0.00');
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

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.quantity, 0),
    [cart]
  );
  const discountAmount = useMemo(() => {
    if (discountType === 'percent') return Math.min(100, Math.max(0, discountValue)) * subtotal / 100;
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
        .map((it) =>
          it.productId === productId ? { ...it, quantity: it.quantity + delta } : it
        )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShift, tick]);

  // ─── render ──────────────────────────────────────────────────────────────
  const cartContent = (
    <>
      <div className="p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#BD00FF]/10 p-2.5 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-[#BD00FF]" />
            </div>
            <h2 className="text-xl md:text-2xl font-black">السلة</h2>
          </div>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black">
            {cart.length} صنف
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {cart.map((item) => (
          <div
            key={item.productId}
            className="bg-white border border-slate-100 p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 text-right">
                <h4 className="font-black text-slate-900 leading-tight mb-0.5 text-sm md:text-base">
                  {item.name}
                </h4>
                <p className="text-[#BD00FF] font-black text-xs md:text-sm">
                  ج.م {money(item.price)}
                </p>
              </div>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-[#BD00FF] hover:text-[#BD00FF] transition-all active:scale-90"
                >
                  <Plus size={18} />
                </button>
                <span className="font-black text-base md:text-lg w-6 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all active:scale-90"
                >
                  <Minus size={18} />
                </button>
              </div>
              <p className="font-black text-slate-900 text-sm md:text-base pl-2">
                ج.م {money(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
            <ShoppingCart size={64} className="mb-4 opacity-20" />
            <p className="font-black text-lg">السلة فارغة</p>
          </div>
        )}
      </div>

      <div className="p-3 md:p-6 bg-white border-t border-slate-100 space-y-3">
        {cart.length > 0 && (
          <>
            {/* discount */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDiscount((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Tag size={14} />
                  خصم
                </span>
                <span className="flex items-center gap-1.5">
                  {discountAmount > 0 ? (
                    <span className="text-red-500">- ج.م {money(discountAmount)}</span>
                  ) : (
                    <span className="text-slate-300">إضافة</span>
                  )}
                  {showDiscount ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </span>
              </button>
              {showDiscount && (
                <div className="flex gap-2 pb-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="text-xs font-black border rounded-xl px-2 py-2 outline-none bg-slate-50"
                  >
                    <option value="none">بدون</option>
                    <option value="percent">%</option>
                    <option value="fixed">مبلغ</option>
                  </select>
                  {discountType !== 'none' && (
                    <input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      placeholder={discountType === 'percent' ? '%' : 'مبلغ'}
                      className="flex-1 text-xs font-black border rounded-xl px-3 py-2 outline-none bg-slate-50 text-center"
                      min={0}
                      max={discountType === 'percent' ? 100 : undefined}
                    />
                  )}
                </div>
              )}
            </div>

            {/* payment method */}
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
                  طريقة الدفع
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-700">
                    {paymentMethod === 'cash'
                      ? 'كاش'
                      : paymentMethod === 'card'
                        ? 'بطاقة'
                        : paymentMethod === 'wallet'
                          ? 'محفظة'
                          : 'آجل'}
                  </span>
                  {showPaymentMethods ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </span>
              </button>
              {showPaymentMethods && (
                <div className="grid grid-cols-4 gap-1.5 pb-2">
                  {(
                    [
                      { id: 'cash', label: 'كاش', icon: Banknote },
                      { id: 'card', label: 'بطاقة', icon: CreditCard },
                      { id: 'wallet', label: 'محفظة', icon: Wallet },
                      { id: 'credit', label: 'آجل', icon: Clock },
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
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                          paymentMethod === pm.id
                            ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]'
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={16} />
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* customer + notes */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCustomer((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <UserRound size={14} />
                  بيانات العميل
                </span>
                {customerName || customerPhone ? (
                  <span className="text-[#BD00FF]">{customerName || customerPhone}</span>
                ) : (
                  <span className="text-slate-300">إضافة</span>
                )}
              </button>
              {showCustomer && (
                <div className="space-y-2 pb-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسم العميل (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black focus:ring-2 focus:ring-[#BD00FF]"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="رقم الموبايل (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
                  />
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black focus:ring-2 focus:ring-[#BD00FF]"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* totals */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-black text-slate-500">
            <span>الإجمالي الفرعي</span>
            <span>ج.م {money(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs font-black text-red-500">
              <span>الخصم</span>
              <span>- ج.م {money(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black text-slate-900 pt-1 border-t border-slate-100 mt-1">
            <span>الإجمالي</span>
            <span className="text-[#BD00FF]">ج.م {money(total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={processPayment}
          disabled={cart.length === 0 || checkoutBusy}
          className="w-full py-4 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-base shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {checkoutBusy ? <Loader2 size={20} className="animate-spin" /> : <Banknote size={20} />}
          دفع الآن
        </button>
        {checkoutError && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
            {checkoutError}
          </div>
        )}
      </div>
    </>
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
              <span className="hidden md:inline">
                {barcodeListening ? 'يعمل' : 'باركود'}
              </span>
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
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {pagedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              {products.length === 0 ? (
                <>
                  <Package size={48} className="mb-3 opacity-30" />
                  <p className="font-black text-sm">
                    مفيش منتجات — افتح التطبيق والنت شغال مرة واحدة لتحميل المنتجات
                  </p>
                </>
              ) : (
                <>
                  <Search size={48} className="mb-3 opacity-30" />
                  <p className="font-black text-sm">لا توجد منتجات مطابقة</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                {pagedProducts.map((p) => {
                  const isOutOfStock = p.trackStock && p.stock <= 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p, 1)}
                      className={`relative active:scale-[0.97] transition-transform ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } aspect-square`}
                    >
                      <div className="w-full h-full rounded-lg md:rounded-[1.4rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#BD00FF] transition-all group overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1]" />
                        <img
                          src={
                            p.imageUrl
                              ? p.imageUrl.startsWith('http')
                                ? p.imageUrl
                                : serverUrl + p.imageUrl
                              : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
                          }
                          alt={p.name}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 bg-slate-200 ${p.imageUrl ? '' : 'opacity-0'}`}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.visibility = 'hidden';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-3 text-right z-[2]">
                          <h3 className="text-white font-black text-[9px] md:text-sm line-clamp-2 leading-tight mb-0.5">
                            {p.name}
                          </h3>
                          <div className="flex items-center justify-between flex-row-reverse">
                            <span className="text-[#00E5FF] font-black text-[9px] md:text-sm">
                              ج.م {money(p.price)}
                            </span>
                            {p.trackStock && (
                              <span
                                className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  isOutOfStock
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-white/10 text-white/60'
                                }`}
                              >
                                {isOutOfStock ? 'نفذ' : `${p.stock}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalProductPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                    disabled={productsPage <= 1}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
                  >
                    السابق
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
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Desktop cart sidebar ─── */}
      <div className="hidden md:flex w-[450px] bg-white border-r flex-col">
        {cartContent}
      </div>

      {/* ─── toast ─── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10060] bg-slate-900 text-white text-xs font-black px-5 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      {/* ─── receipt modal ─── */}
      {receipt && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-1">
              <CheckCircle2 size={30} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900">تمت العملية ✅</h2>
            <p className="text-xs font-bold text-slate-400">
              فاتورة #{receipt.order.id.slice(0, 8)} — ج.م {money(receipt.order.total)}
              {!receipt.order.synced && (
                <span className="block text-amber-500 mt-1">
                  (محفوظة محليًا — هتتزامن أول ما النت يرجع)
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() =>
                printReceipt(
                  generateReceiptHtml(
                    receipt.order,
                    receipt.items,
                    shopName,
                    receipt.order.cashierName || ''
                  )
                )
              }
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
              <Printer size={18} />
              طباعة الإيصال
            </button>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="w-full py-3 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600 hover:bg-slate-100 transition-all"
            >
              بيع جديد
            </button>
          </div>
        </div>
      )}

      {/* ─── close shift modal (Z) ─── */}
      {showCloseShift && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                <Lock size={26} className="text-red-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900">إغلاق الوردية</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                اكتب الفلوس اللي في الدرج فعليًا
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">الفلوس في الدرج</label>
              <input
                type="number"
                min={0}
                value={closingAmount || ''}
                onChange={(e) => setClosingAmount(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">ملاحظة (اختياري)</label>
              <input
                type="text"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black focus:ring-2 focus:ring-[#BD00FF]"
              />
            </div>
            {activeShift && (
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] font-black text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>العهدة الافتتاحية</span>
                  <span>{money(activeShift.openingAmount)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>مبيعات الوردية</span>
                  <span>{money(activeShift.totalSales)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>المتوقع في الدرج</span>
                  <span>{money(activeShift.openingAmount + activeShift.totalSales)} ج.م</span>
                </div>
              </div>
            )}
            {closingError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
                {closingError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitCloseShift}
                disabled={closingBusy}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {closingBusy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => setShowCloseShift(false)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── X report modal ─── */}
      {showReport && report && report.shift && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">تقرير الوردية (X)</h2>
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'العهدة الافتتاحية', value: report.opening },
                { label: 'مبيعات كاش', value: report.cashSales },
                { label: 'فلوس داخلية', value: report.cashIn },
                { label: 'فلوس خارجية', value: report.cashOut },
                { label: 'الدرج الصافي', value: report.netCash },
                { label: 'عدد الفواتير', value: report.shift.ordersCount, plain: true },
              ].map((row) => (
                <div key={row.label} className="p-3 rounded-2xl bg-slate-50 text-center">
                  <p className="text-[10px] font-black text-slate-400">{row.label}</p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {row.plain ? row.value : `${money(Number(row.value))} ج.م`}
                  </p>
                </div>
              ))}
            </div>
            {report.pendingSync > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {report.pendingSync} فاتورة لسه هتتزامن مع السيرفر
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-500">آخر حركات الكاش</p>
              {report.movements.length === 0 && (
                <p className="text-[11px] font-bold text-slate-300">مفيش حركات</p>
              )}
              {report.movements.map((m: CashMovement) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs font-black bg-slate-50 rounded-xl px-3 py-2"
                >
                  <span className="flex items-center gap-1.5">
                    {m.kind === 'in' ? (
                      <ArrowDownToLine size={13} className="text-emerald-500" />
                    ) : (
                      <ArrowUpFromLine size={13} className="text-red-500" />
                    )}
                    {m.kind === 'in' ? 'داخل' : 'خارج'}
                    {m.note ? ` — ${m.note}` : ''}
                  </span>
                  <span>{money(m.amount)} ج.م</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setCashMoveKind('in');
                setShowCashMove(true);
              }}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2"
            >
              <Coins size={16} />
              تسجيل حركة كاش
            </button>
          </div>
        </div>
      )}

      {/* ─── cash movement modal ─── */}
      {showCashMove && (
        <div className="fixed inset-0 z-[10060] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900">حركة كاش</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                فلوس داخلة للدرج أو خارجة منه (مش بيع)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'in', label: 'داخل (إيداع)', icon: ArrowDownToLine },
                  { id: 'out', label: 'خارج (سحب)', icon: ArrowUpFromLine },
                ] as const
              ).map((k) => {
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setCashMoveKind(k.id)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-black transition-all ${
                      cashMoveKind === k.id
                        ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]'
                        : 'border-slate-100 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Icon size={16} />
                    {k.label}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={0}
              value={cashMoveAmount || ''}
              onChange={(e) => setCashMoveAmount(Number(e.target.value) || 0)}
              placeholder="المبلغ"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
            />
            <input
              type="text"
              value={cashMoveNote}
              onChange={(e) => setCashMoveNote(e.target.value)}
              placeholder="السبب (اختياري)"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black focus:ring-2 focus:ring-[#BD00FF]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitCashMove}
                disabled={cashMoveBusy}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {cashMoveBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Coins size={16} />
                )}
                تسجيل
              </button>
              <button
                type="button"
                onClick={() => setShowCashMove(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-black text-sm text-slate-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── held orders / invoices modal ─── */}
      {showHeld && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">الطلبات المعلقة</h2>
              <button
                type="button"
                onClick={() => setShowHeld(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            {heldOrders.length === 0 && (
              <p className="text-xs font-bold text-slate-300 text-center py-6">مفيش طلبات معلقة</p>
            )}
            {heldOrders.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-xs font-black text-slate-800">{h.label}</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {new Date(h.createdAt + 'Z').toLocaleString('ar-EG')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => resumeHeld(h)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600"
                  >
                    استكمال
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.deleteHeldOrder(h.id);
                      setHeldOrders(await api.getHeldOrders());
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-[11px] font-black hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ─── invoices modal ─── */}
      {showInvoices && (
        <div className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">فواتير الكاشير</h2>
              <button
                type="button"
                onClick={() => setShowInvoices(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>
            {invoices.length === 0 && (
              <p className="text-xs font-bold text-slate-300 text-center py-6">مفيش فواتير</p>
            )}
            {invoices.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="text-xs font-black text-slate-800">
                    #{o.id.slice(0, 8)} — ج.م {money(o.total)}
                    {!o.synced && (
                      <span className="text-amber-500"> (في انتظار المزامنة)</span>
                    )}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {o.cashierName || '-'} •{' '}
                    {new Date(o.createdAt + 'Z').toLocaleString('ar-EG')}
                  </p>
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-100 text-slate-500">
                  {o.paymentMethod === 'COD'
                    ? 'كاش'
                    : o.paymentMethod === 'CARD'
                      ? 'بطاقة'
                      : o.paymentMethod === 'WALLET'
                        ? 'محفظة'
                        : 'آجل'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
