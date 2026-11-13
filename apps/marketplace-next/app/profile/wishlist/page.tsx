'use client';

import Link from 'next/link';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist';
import { ProductCard } from '@/components/ProductCard';

/**
 * Wishlist — content only. The header, sidebar and the shared user fetch
 * live in app/profile/layout.tsx so tab switches render instantly.
 */
export default function ProfileWishlistPage() {
  const { items, clear, count } = useWishlist();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>قائمة المفضلة</span>
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold">
              {count}
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">المنتجات التي قمت بحفظها للشراء لاحقاً</p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح الكل
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            لا توجد منتجات في المفضلة حالياً
          </p>
          <Link
            href="/dalil"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-sm"
          >
            تصفح المتاجر والمنتجات <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
