'use client';

import { ChevronDown } from 'lucide-react';
import type { Product } from '@/lib/services';
import { ProductCard } from './ProductCard';
import { useChunkedList } from '@/lib/use-chunked-list';
import { PRODUCT_GRID_CLASS } from '@/lib/product-layout';
import { cn } from '@/lib/utils';

export interface ProductGridProps {
  products: Product[];
  initialCount?: number;
  step?: number;
  resetKey?: string;
  className?: string;
  emptyState?: React.ReactNode;
}

export function ProductGrid({
  products,
  initialCount = 12,
  step = 12,
  resetKey,
  className,
  emptyState,
}: ProductGridProps) {
  const { shownCount, remaining, hasMore, showMore } = useChunkedList(products?.length ?? 0, {
    initialCount,
    step,
    resetKey,
  });

  if (!products || products.length === 0) {
    return (
      emptyState ?? (
        <div className="py-12 text-center text-slate-500 font-semibold text-sm">
          لا توجد منتجات لعرضها
        </div>
      )
    );
  }

  const visibleProducts = products.slice(0, shownCount);

  return (
    <div className={cn('space-y-6', className)}>
      <div className={PRODUCT_GRID_CLASS}>
        {visibleProducts.map((product, idx) => (
          <ProductCard key={product.id} product={product} priority={idx < 4} />
        ))}
      </div>

      {hasMore && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={showMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-brand-cyan/40 text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 shadow-sm transition-all active:scale-95"
          >
            <span>عرض المزيد ({remaining} متبقي)</span>
            <ChevronDown className="w-4 h-4 text-brand-cyan" />
          </button>
        </div>
      )}
    </div>
  );
}
