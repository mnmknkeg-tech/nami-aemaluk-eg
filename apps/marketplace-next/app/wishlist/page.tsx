'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist';
import { useCart } from '@/lib/cart';
import { ProductCard } from '@/components/ProductCard';

export default function WishlistPage() {
  const { items, remove, clear, count } = useWishlist();
  const { addItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
        <Heart className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">قائمة المفضلة فارغة</h1>
        <p className="text-slate-500 font-semibold mb-6">أضف منتجاتك المفضلة لتجدها هنا</p>
        <Link href="/dalil" className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm">
          تصفح المتاجر
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 md:w-7 md:h-7 text-red-500 fill-red-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">المفضلة</h1>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs md:text-sm mt-0.5">
              كل اللي حبيته في مكان واحد
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black">
            {count} منتج
          </span>
          <button
            onClick={clear}
            className="text-xs font-bold text-red-400 hover:text-red-500 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح الكل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/dalil" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-cyan">
          <ArrowLeft className="w-4 h-4" />
          متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
