'use client';

import { useState } from 'react';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useSiteCart } from '@/lib/site-cart';

export function SiteProductActions({ product, shop }: { product: any; shop: any }) {
  const { addItem } = useSiteCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const unavailable =
    product.isAvailable === false || product.isActive === false || product.is_active === false;

  const addToCart = () => {
    if (unavailable) return;
    for (let index = 0; index < quantity; index += 1) addItem(product, shop);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {unavailable ? (
        <p role="status" className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-500">
          المنتج غير متوفر حالياً
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="تقليل الكمية"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-6 text-center text-lg font-black">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => value + 1)}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="زيادة الكمية"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={addToCart}
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl px-7 font-black text-white shadow-lg transition hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--site-primary)' }}
          >
            {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
            {added ? 'تمت الإضافة للسلة' : 'إضافة إلى السلة'}
          </button>
        </>
      )}
    </div>
  );
}
