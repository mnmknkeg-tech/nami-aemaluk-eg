'use client';

import { ShoppingBag, Check, Plus, Minus, Ban } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { productHasOptions } from '@/lib/product-options';
import type { Product } from '@/lib/services';
import { cn } from '@/lib/utils';

export function AddToCartButton({
  product,
  size = 'md',
  color,
  initialQuantity = 1,
  showQuantityStepper = false,
  variant = 'button',
}: {
  product: Product;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  initialQuantity?: number;
  /** Button variant only: shows the stepper before the first add. */
  showQuantityStepper?: boolean;
  /**
   * `button` → the full "أضف للسلة" pill (product page, drawers).
   * `icon`   → compact circular "+" used inside the product cards: it becomes
   *            the quantity stepper as soon as the product is in the cart.
   */
  variant?: 'button' | 'icon';
}) {
  const { addItem, updateQuantity, items } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(initialQuantity);

  const cartItem = items.find((i) => i.productId === product.id);
  const cartQty = cartItem ? cartItem.quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.isAvailable === false) return;
    // Products with sizes/colors/variants must be configured on the product
    // page first — adding them blind would put an unspecified variant in the cart.
    // Skip when we are already there (the product page's own button).
    const onProductPage = pathname === `/product/${product.id}`;
    if (!onProductPage && productHasOptions(product)) {
      router.push(`/product/${product.id}`);
      return;
    }
    addItem(product, qty, false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleStep = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(product.id, cartQty + delta);
    } else {
      setQty((prev) => Math.max(1, prev + delta));
    }
  };

  const sizeCls =
    size === 'sm'
      ? 'px-3 py-2 text-xs'
      : size === 'lg'
        ? 'px-8 py-4 text-base'
        : 'px-4 py-2.5 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  /* ── Compact icon variant (product cards) ─────────────────────────────── */
  if (variant === 'icon') {
    const label = product.name ? `أضف ${product.name} للسلة` : 'أضف للسلة';

    if (product.isAvailable === false) {
      return (
        <button
          type="button"
          disabled
          aria-label="غير متوفر"
          title="غير متوفر"
          className="w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center cursor-not-allowed"
        >
          <Ban className="w-4 h-4" />
        </button>
      );
    }

    // Already in the cart → the "+" turns into a compact stepper so quantity
    // can be tuned from the card without opening the cart drawer.
    if (cartQty > 0) {
      return (
        <div className="flex items-center gap-0.5 h-9 px-1 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={(e) => handleStep(e, -1)}
            aria-label="تقليل الكمية"
            title="تقليل الكمية"
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-5 text-center text-xs font-black font-mono text-slate-900 dark:text-white">
            {cartQty}
          </span>
          <button
            type="button"
            onClick={(e) => handleStep(e, 1)}
            aria-label="زيادة الكمية"
            title="زيادة الكمية"
            className="w-7 h-7 rounded-full bg-brand-gradient text-white flex items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAdd}
        aria-label={added ? 'تمت الإضافة للسلة' : label}
        title="أضف للسلة"
        className={cn(
          'w-9 h-9 shrink-0 rounded-full text-white flex items-center justify-center shadow-sm transition-all active:scale-90',
          added ? 'bg-green-500' : 'bg-brand-gradient hover:shadow-glow-cyan hover:scale-105'
        )}
      >
        {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    );
  }

  if (product.isAvailable === false) {
    return (
      <button
        disabled
        className={`${sizeCls} rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold cursor-not-allowed flex items-center gap-2`}
      >
        غير متوفر
      </button>
    );
  }

  // إذا كان مطلوب عرض الـ Stepper أو إذا كان المنتج مضافاً بالفعل في السلة
  if (showQuantityStepper || cartQty > 0) {
    const currentCount = cartQty > 0 ? cartQty : qty;
    return (
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={(e) => handleStep(e, -1)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition"
          title="تقليل الكمية"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="font-extrabold text-xs sm:text-sm px-2 text-slate-900 dark:text-white min-w-[24px] text-center font-mono">
          {currentCount}
        </span>

        <button
          onClick={(e) => handleStep(e, 1)}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-cyan text-slate-950 font-bold flex items-center justify-center hover:opacity-90 active:scale-95 transition"
          title="زيادة الكمية"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {cartQty === 0 && (
          <button
            onClick={handleAdd}
            className="mr-1 px-3 py-1.5 rounded-lg bg-brand-gradient text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>تأكيد</span>
          </button>
        )}
      </div>
    );
  }

  const colorStyle = color ? { backgroundColor: color, color: '#0F172A' } : undefined;
  const colorCls = color ? '' : 'bg-brand-gradient text-white hover:shadow-glow-cyan';

  return (
    <button
      onClick={handleAdd}
      style={colorStyle}
      className={`${sizeCls} rounded-lg ${colorCls} font-bold flex items-center gap-2 transition-all active:scale-95 ${
        added ? '!bg-green-500 !text-white' : ''
      }`}
    >
      {added ? <Check className={iconSize} /> : <ShoppingBag className={iconSize} />}
      {added ? 'تمت الإضافة' : 'أضف للسلة'}
    </button>
  );
}
