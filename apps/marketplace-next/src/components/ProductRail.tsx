'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Product } from '@/lib/services';
import { ProductCard } from './ProductCard';
import { useChunkedList } from '@/lib/use-chunked-list';
import { RAIL_ITEM_WIDTH, RAIL_SCROLLER_CLASS } from '@/lib/product-layout';
import { cn } from '@/lib/utils';

export interface ProductRailProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  initialCount?: number;
  step?: number;
  className?: string;
}

export function ProductRail({
  title,
  subtitle,
  icon,
  products,
  viewAllHref,
  viewAllLabel = 'عرض الكل',
  initialCount = 8,
  step = 6,
  className,
}: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { shownCount, remaining, hasMore, showMore } = useChunkedList(products?.length ?? 0, {
    initialCount,
    step,
  });

  const visibleProducts = products ? products.slice(0, shownCount) : [];

  const checkScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const absScroll = Math.abs(scrollLeft);
    setCanScrollLeft(absScroll < maxScroll - 4);
    setCanScrollRight(absScroll > 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [shownCount]);

  const scrollBy = (direction: 'next' | 'prev') => {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.firstElementChild?.clientWidth || 240;
    const scrollAmount = itemWidth * 2;
    const multiplier = direction === 'next' ? -1 : 1;
    el.scrollBy({ left: scrollAmount * multiplier, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className={cn('relative py-3 md:py-4', className)}>
      {(title || viewAllHref) && (
        <div className="flex items-end justify-between gap-4 mb-3 md:mb-4">
          <div>
            {title && (
              <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {icon && <span className="text-brand-cyan">{icon}</span>}
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-xs md:text-sm font-bold text-brand-cyan hover:underline transition"
              >
                {viewAllLabel}
              </Link>
            )}

            <div className="hidden lg:flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={() => scrollBy('prev')}
                disabled={!canScrollRight}
                aria-label="السابق"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy('next')}
                disabled={!canScrollLeft}
                aria-label="التالي"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollerRef} className={RAIL_SCROLLER_CLASS}>
        {visibleProducts.map((product, idx) => (
          <div key={product.id} className={RAIL_ITEM_WIDTH}>
            <ProductCard product={product} priority={idx < 2} />
          </div>
        ))}

        {hasMore && (
          <div className={cn(RAIL_ITEM_WIDTH, 'flex')}>
            <button
              type="button"
              onClick={showMore}
              className="group w-full h-full min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-cyan flex flex-col items-center justify-center p-4 text-center bg-slate-50/50 dark:bg-slate-900/40 hover:bg-brand-cyan/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-cyan group-hover:scale-110 group-hover:bg-brand-gradient group-hover:text-white transition-all mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                عرض المزيد
              </span>
              <span className="text-[11px] font-semibold text-slate-400 mt-1">
                ({remaining} منتج إضافي)
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
