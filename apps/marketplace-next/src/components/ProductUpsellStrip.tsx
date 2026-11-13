'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, Plus, Sparkles, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/services';

/**
 * شريط «ضيف على طلبك» للمنتجات البسيطة (اللي مفيهاش خيارات) — بيظهر تحت
 * زر الشراء في صفحة المنتج، وبنفس أسلوب تطبيقات الطلبات: ضغطة واحدة
 * تضيف المنتج للسلة من غير فتح الدروار.
 */
export function ProductUpsellStrip({ suggestions }: { suggestions: Product[] }) {
  const { addItem } = useCart();
  const [quickAdded, setQuickAdded] = useState<Record<string, boolean>>({});

  const items = (suggestions || []).filter((s) => s.isAvailable !== false);
  if (items.length === 0) return null;

  const handleQuickAdd = (s: Product) => {
    addItem(s, 1, false);
    setQuickAdded((prev) => ({ ...prev, [s.id]: true }));
    window.setTimeout(() => setQuickAdded((prev) => ({ ...prev, [s.id]: false })), 2000);
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-brand-orange-soft flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
          </span>
          ضيف على طلبك — من نفس المتجر
        </h3>
        <span className="text-[11px] font-bold text-slate-400">ضغطة واحدة وتتضاف للسلة</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:thin]">
        {items.slice(0, 10).map((s) => {
          const isQuickAdded = Boolean(quickAdded[s.id]);
          const img = s.imageUrl || s.images?.[0];
          return (
            <div
              key={s.id}
              className="shrink-0 w-[150px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
            >
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700">
                {img ? (
                  <Image src={img} alt={s.name || 'منتج'} fill sizes="150px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                  {s.name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-brand-orange-dark">
                    {formatPrice(s.price ?? 0, s.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(s)}
                    aria-label={`إضافة ${s.name || ''} للسلة`}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isQuickAdded ? 'bg-green-500 text-white' : 'bg-brand-cyan text-black hover:opacity-85'
                    }`}
                  >
                    {isQuickAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
