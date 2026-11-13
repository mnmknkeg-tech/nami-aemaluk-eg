'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { Product } from './services';
import { productStockState } from './stock';
import { playCartSound } from './sounds';
import { isSessionActive } from './api';
// Relative (not '@/…'): this module is pulled into the ROOT tsc program by
// test/cart-stage5.test.ts, where the root tsconfig maps '@/*' to
// packages/shared/src — an app-level alias import breaks that typecheck.
import { AuthGateModal } from '../components/AuthGateModal';
import { trackCartEvent } from './cartEvents';

export interface CartItem {
  id: string;
  productId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  quantity: number;
  maxQuantity?: number;
  variantSelection?: any;
  addons?: any[];
}

interface CartContextValue {
  items: CartItem[];
  /**
   * @param openDrawer When true the cart drawer pops open on add. Defaults to
   * true (builder sites rely on it); the marketplace quick-add passes `false`
   * so tapping "+" just adds the product instead of hijacking the screen.
   */
  addItem: (
    product: Product,
    quantity?: number,
    openDrawer?: boolean,
    options?: { variantSelection?: any; addons?: any[]; calculatedPrice?: number }
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  clearShopItems: (shopId: string) => void;
  totalItems: number;
  totalPrice: number;
  totalPriceByShop: (shopId: string) => number;
  itemsByShop: () => Record<string, CartItem[]>;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

/** محاولة إضافة معلّقة — الزائر ضيف منتج وهو مش مسجل، فبنحتفظ بيها ونضيفها
 *  تلقائياً أول ما الحساب يتعمل من بوابة رقم الموبايل. */
interface PendingAdd {
  product: Product;
  quantity: number;
  openDrawer: boolean;
  options?: { variantSelection?: any; addons?: any[]; calculatedPrice?: number };
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'mnmknk_cart';

/** Merchant slug when the current path is a storefront (/shop/x, /site/x).
 *  Catalog products from the API carry no shop fields, so items added from a
 *  merchant page were saved with shopSlug:'' — and the shop checkout filter
 *  missed them, rendering an empty cart after إتمام الطلب. Stamping the slug
 *  from the path here covers every add-to-cart entry point at once. */
function slugFromPath(pathname: string | null): string {
  const merchant = pathname?.match(/^\/(?:site|shop)\/([^/]+)/);
  return merchant ? merchant[1] : '';
}

function finiteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.shopId === 'string' &&
    typeof item.shopName === 'string' &&
    typeof item.shopSlug === 'string' &&
    typeof item.name === 'string' &&
    finiteNonNegativeNumber(item.price) &&
    typeof item.image === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (item.maxQuantity == null || (Number.isInteger(item.maxQuantity) && item.maxQuantity > 0))
  );
}

export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidCartItem).map((item) => ({ ...item }));
}

function storageKeyForPath(pathname: string | null): string {
  const merchant = pathname?.match(/^\/(site|shop)\/([^/]+)/);
  return merchant ? `${STORAGE_KEY}:${merchant[1]}:${merchant[2]}` : STORAGE_KEY;
}

function loadFromStorage(storageKey: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveToStorage(storageKey: string, items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const storageKey = storageKeyForPath(pathname);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // بوابة التسجيل برقم الموبايل — بتفتح لأول إضافة للزائر
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const pendingAddRef = useRef<PendingAdd | null>(null);

  useEffect(() => {
    setHydrated(false);
    setItems(loadFromStorage(storageKey));
    setHydrated(true);
    setCartOpen(false);
  }, [storageKey]);

  useEffect(() => {
    if (hydrated) saveToStorage(storageKey, items);
  }, [items, hydrated, storageKey]);

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      openDrawer = true,
      options?: { variantSelection?: any; addons?: any[]; calculatedPrice?: number }
    ) => {
      if (product.isAvailable === false || !Number.isInteger(quantity) || quantity < 1) return;

      // الطلب في الماركت للعملاء المسجلين بس: الزائر اللي بيضيف للسلة أول
      // مرة بيستقبل بوابة "سجل برقم موبايلك" — المنتج بيتحفظ معلّق وبيتضاف
      // تلقائياً بعد إنشاء الحساب/الدخول، فالمسار مش بيتبهدل.
      if (typeof window !== 'undefined' && !isSessionActive()) {
        pendingAddRef.current = { product, quantity, openDrawer, options };
        setAuthGateOpen(true);
        return;
      }

      const stockState = productStockState(product);
      // صنف بيتبع مخزون وخلص → مفيش إضافة. الكمية بتتظبط على المتبقي لو طلبت أكتر.
      if (stockState.soldOut) return;
      if (stockState.maxQuantity && quantity > stockState.maxQuantity) {
        quantity = stockState.maxQuantity;
      }
      const vKey = options?.variantSelection ? JSON.stringify(options.variantSelection) : '';
      const aKey =
        options?.addons && options.addons.length > 0 ? JSON.stringify(options.addons) : '';
      const itemKey = vKey || aKey ? `${product.id}::${vKey}::${aKey}` : product.id;

      const finalPrice =
        options?.calculatedPrice !== undefined && Number.isFinite(options.calculatedPrice)
          ? options.calculatedPrice
          : product.price || 0;

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === itemKey);
        if (existing) {
          return prev.map((i) =>
            i.productId === itemKey ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        const newItem: CartItem = {
          id: `${product.id}-${Date.now()}`,
          productId: itemKey,
          shopId: product.shopId,
          shopName: product.shopName || '',
          shopSlug: product.shopSlug || slugFromPath(pathname) || '',
          name: product.name,
          price: finalPrice,
          oldPrice: product.oldPrice,
          image: product.imageUrl || product.images?.[0] || '/placeholder-product.png',
          quantity,
          // أصناف التجزئة بتتبع المخزون → سقف الكمية = المتبقي. أصناف المنيو
          // والخدمات (trackStock=false) بلا سقف — بتتجهز لكل طلب.
          maxQuantity: productStockState(product).maxQuantity,
          variantSelection: options?.variantSelection,
          addons: options?.addons,
        };
        return [...prev, newItem];
      });
      if (openDrawer) setCartOpen(true);
      playCartSound();
      // Abandoned-cart funnel: the merchant dashboard's "السلة المتروكة"
      // reads these. Fire-and-forget — never block or break adding to cart.
      // Uses the raw product id (the cart key can carry variant/addon suffixes).
      if (product.shopId) {
        trackCartEvent('add_to_cart', [
          {
            shopId: product.shopId,
            productId: product.id,
            quantity,
            price: finalPrice,
            name: product.name,
          },
        ]);
      }
    },
    [pathname]
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        // Never exceed the stock cap captured when the item was added.
        const capped = i.maxQuantity != null ? Math.min(quantity, i.maxQuantity) : quantity;
        return { ...i, quantity: Math.max(1, capped) };
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const clearShopItems = useCallback((shopId: string) => {
    setItems((prev) => prev.filter((i) => i.shopId !== shopId));
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const totalPriceByShop = useCallback(
    (shopId: string) =>
      items.filter((i) => i.shopId === shopId).reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const itemsByShop = useCallback(() => {
    const map: Record<string, CartItem[]> = {};
    for (const item of items) {
      if (!map[item.shopId]) map[item.shopId] = [];
      map[item.shopId].push(item);
    }
    return map;
  }, [items]);

  // بعد نجاح التسجيل/الدخول من البوابة: رجّع المنتج المعلّق للسلة بالمسار
  // الأصلي (فتح الدرو/صوت السلة) كأن الإضافة اتعملت من أول مرة.
  const handleAuthSuccess = useCallback(() => {
    const pending = pendingAddRef.current;
    pendingAddRef.current = null;
    if (!pending) return;
    // تأجيل بسيط عشان الحالة تتحدد الأول بعد قفل البوابة
    window.setTimeout(() => {
      addItemRef.current(pending.product, pending.quantity, pending.openDrawer, pending.options);
    }, 0);
  }, []);

  // أحدث نسخة من addItem (بتتغير مع المسار) للإضافة المؤجلة
  const addItemRef = useRef(addItem);
  useEffect(() => {
    addItemRef.current = addItem;
  }, [addItem]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearShopItems,
        totalItems,
        totalPrice,
        totalPriceByShop,
        itemsByShop,
        isCartOpen,
        setCartOpen,
      }}
    >
      {children}
      {/* بوابة "سجل برقم موبايلك عشان تطلب" — واحدة على مستوى التطبيق */}
      <AuthGateModal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
