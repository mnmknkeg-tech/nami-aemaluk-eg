'use client';

import { useState, useMemo } from 'react';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import type { Product } from '@/lib/services';
import { formatPrice } from '@/lib/utils';
import { ProductGrid } from './ProductGrid';

interface ShopProductsProps {
  products: Product[];
  primaryColor: string;
}

export function ShopProducts({ products }: ShopProductsProps) {
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [products]);

  const priceRange = useMemo(() => {
    const prices = products.map((p) => p.price || 0).filter((p) => p > 0);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (maxPrice != null && (p.price || 0) > maxPrice) return false;
      return true;
    });

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, category, maxPrice, sortBy]);

  const activeFilters =
    (category ? 1 : 0) + (maxPrice != null ? 1 : 0) + (sortBy !== 'default' ? 1 : 0);

  const clearFilters = () => {
    setCategory('');
    setMaxPrice(null);
    setSortBy('default');
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          فلترة
          {activeFilters > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-cyan text-white text-[10px] flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        {activeFilters > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-500"
          >
            <X className="w-3 h-3" />
            مسح الفلاتر
          </button>
        )}
        <span className="text-sm font-bold text-slate-400 mr-auto">{filtered.length} منتج</span>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-6 space-y-4">
          {/* Category filter */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-black mb-2 text-slate-500">التصنيف</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategory('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!category ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                >
                  الكل
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${category === c ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price filter */}
          {priceRange.max > 0 && (
            <div>
              <label className="block text-xs font-black mb-2 text-slate-500">
                السعر الأقصى: {maxPrice != null ? formatPrice(maxPrice) : 'بدون حد'}
              </label>
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                value={maxPrice ?? priceRange.max}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-cyan"
              />
              <div className="flex justify-between text-xs text-slate-400 font-semibold mt-1">
                <span>{formatPrice(priceRange.min)}</span>
                <span>{formatPrice(priceRange.max)}</span>
              </div>
            </div>
          )}

          {/* Sort */}
          <div>
            <label className="block text-xs font-black mb-2 text-slate-500">ترتيب حسب</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'default', label: 'الافتراضي' },
                { key: 'price-asc', label: 'السعر: الأقل أولاً' },
                { key: 'price-desc', label: 'السعر: الأعلى أولاً' },
                { key: 'name', label: 'الاسم' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === s.key ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products grid with "عرض المزيد" and filter reset */}
      <ProductGrid
        products={filtered}
        initialCount={12}
        step={8}
        resetKey={`${category}-${maxPrice}-${sortBy}`}
        emptyState={
          <div className="text-center py-20">
            <Filter className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">لا توجد منتجات مطابقة للفلاتر</p>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-brand-cyan font-bold text-sm hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        }
      />
    </div>
  );
}
