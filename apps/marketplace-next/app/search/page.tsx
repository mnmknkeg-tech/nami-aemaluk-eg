'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { AlertCircle, Search, Store, X, SlidersHorizontal, ArrowUpDown, Package } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { ShopCard } from '@/components/ShopCard';
import { jsonRequest } from '@/lib/api';
import type { Product, Shop } from '@/lib/services';

const QUICK_SEARCHES = ['موبايلات', 'ملابس', 'أحذية', 'ساعات', 'عطور'];

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';
type SearchTab = 'all' | 'products' | 'shops';
type SortOption = 'relevance' | 'price-asc' | 'price-desc';

function asList<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQuery = params.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [shopResults, setShopResults] = useState<Shop[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [partialError, setPartialError] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = ++requestSequence.current;

    if (!trimmed) {
      setResults([]);
      setShopResults([]);
      setStatus('idle');
      setPartialError(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setStatus('loading');
      setPartialError(false);
      const productParams = new URLSearchParams({ q: trimmed, limit: '48' });
      const shopParams = new URLSearchParams({ q: trimmed, limit: '24' });

      try {
        const [productsData, shopsData] = await Promise.all([
          jsonRequest<any>('/search/products?' + productParams.toString()).catch(() => null),
          jsonRequest<any>('/search/shops?' + shopParams.toString()).catch(() => null),
        ]);
        if (requestId !== requestSequence.current) return;
        if (productsData === null && shopsData === null) {
          throw new Error('تعذر تحميل نتائج البحث');
        }

        const productItems = asList<any>(productsData);
        const shopItems = asList<any>(shopsData);
        const normalizedProducts = productItems.map((product) => {
          const image = product.imageUrl || product.image || product.image_url || product.images?.[0] || '';
          const rawCategory = product.category;
          return {
            ...product,
            id: String(product.id),
            shopId: String(product.shopId || product.shop_id || ''),
            shopSlug: product.shopSlug || product.shop_slug || undefined,
            shopName: product.shopName || product.shop_name || undefined,
            name: product.name || product.title || 'منتج',
            price: Number(product.price || 0),
            imageUrl: image,
            images: Array.isArray(product.images) && product.images.length ? product.images : image ? [image] : [],
            category: typeof rawCategory === 'string' ? rawCategory : rawCategory?.name || '',
          } as Product;
        });
        const normalizedShops = shopItems.map((shop) => ({
          id: String(shop.id),
          slug: String(shop.slug || ''),
          name: shop.name || 'متجر',
          bio: shop.description || '',
          logo: shop.logo || shop.image || undefined,
          city: shop.city || '',
          activity: shop.activity || '',
          category: shop.category || '',
          rating: Number(shop.rating || 0),
          isApproved: String(shop.status || '').toUpperCase() === 'APPROVED',
        } as Shop)).filter((shop) => shop.slug);

        setResults(normalizedProducts);
        setShopResults(normalizedShops);
        setPartialError(productsData === null || shopsData === null);
        setStatus('success');
      } catch {
        if (requestId !== requestSequence.current) return;
        setResults([]);
        setShopResults([]);
        setStatus('error');
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [query]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? '/search?q=' + encodeURIComponent(trimmed) : '/search');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShopResults([]);
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setStatus('idle');
    setPartialError(false);
    router.replace('/search');
  };

  const chooseQuickSearch = (term: string) => {
    setQuery(term);
    router.push('/search?q=' + encodeURIComponent(term));
  };

  const categories = Array.from(new Set(results.map((product) => String(product.category || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'ar'));
  const min = minPrice.trim() ? Number(minPrice) : null;
  const max = maxPrice.trim() ? Number(maxPrice) : null;
  const invalidPriceRange = (min !== null && (!Number.isFinite(min) || min < 0)) ||
    (max !== null && (!Number.isFinite(max) || max < 0)) ||
    (min !== null && max !== null && min > max);

  const filteredProducts = results.filter((product) => {
    const price = Number(product.price || 0);
    if (category && String(product.category || '').trim() !== category) return false;
    if (min !== null && Number.isFinite(min) && price < min) return false;
    if (max !== null && Number.isFinite(max) && price > max) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === 'price-desc') return Number(b.price || 0) - Number(a.price || 0);
    return 0;
  });

  const showProducts = activeTab !== 'shops';
  const showShops = activeTab !== 'products';
  const hasVisibleResults = (showProducts && sortedProducts.length > 0) || (showShops && shopResults.length > 0);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 pb-12 pt-5 sm:px-5 sm:pt-8 md:px-6 md:pt-12">
      <header className="mb-5 sm:mb-7">
        <p className="mb-1 text-xs font-extrabold text-brand-cyan sm:text-sm">
          اكتشف اللي بتدور عليه
        </p>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
          البحث في الماركت
        </h1>
        <p className="mt-1.5 text-xs font-medium leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">
          دور على المنتجات والمتاجر، وحدد السعر والقسم المناسب ليك.
        </p>
      </header>

      <form
        role="search"
        onSubmit={handleSubmit}
        className="mb-5 rounded-2xl bg-gradient-to-l from-brand-cyan/30 via-brand-cyan/10 to-amber-400/25 p-px shadow-[0_8px_28px_rgba(15,23,42,0.07)] sm:mb-7 sm:max-w-3xl"
      >
        <div className="flex min-h-14 items-center gap-2 rounded-[15px] bg-white px-3 dark:bg-slate-900 sm:min-h-16 sm:px-4">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بتدور على منتج أو متجر إيه؟"
            aria-label="ابحث عن منتج أو متجر"
            autoComplete="off"
            enterKeyHint="search"
            className="h-14 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-white sm:h-16 sm:text-base"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="مسح البحث"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-extrabold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 active:scale-[0.98] dark:bg-brand-cyan dark:text-slate-950 sm:h-11 sm:px-5 sm:text-sm"
          >
            ابحث
          </button>
        </div>
      </form>

      {status === 'idle' && (
        <section aria-label="عمليات بحث مقترحة" className="mb-8">
          <p className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400 sm:text-sm">
            عمليات بحث شائعة
          </p>
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => chooseQuickSearch(term)}
                className="min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:border-brand-cyan hover:bg-brand-cyan/5 hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:text-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      {status === 'loading' && (
        <section aria-live="polite" aria-busy="true">
          <p className="mb-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            بندور على «{query.trim()}»...
          </p>
          <ProductGridSkeleton count={6} />
        </section>
      )}

      {status === 'error' && (
        <section
          role="alert"
          className="mx-auto my-8 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center dark:border-rose-900/50 dark:bg-rose-950/20"
        >
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            حصلت مشكلة أثناء البحث
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            تأكد من اتصالك بالإنترنت وحاول تاني.
          </p>
          <button
            type="button"
            onClick={() => setQuery((value) => value + ' ')}
            className="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-700 dark:bg-brand-cyan dark:text-slate-950"
          >
            إعادة المحاولة
          </button>
        </section>
      )}

      {status === 'success' && (
        <section aria-live="polite" className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'الكل', results.length + shopResults.length],
              ['products', 'المنتجات', results.length],
              ['shops', 'المتاجر', shopResults.length],
            ] as [SearchTab, string, number][]).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-pressed={activeTab === key}
                className={'min-h-10 rounded-full border px-4 text-xs font-extrabold transition-colors ' +
                  (activeTab === key
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-brand-cyan dark:bg-brand-cyan dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-cyan dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}
              >
                {label} <span className="mr-1 opacity-70">({count})</span>
              </button>
            ))}
          </div>

          {partialError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              بعض النتائج لم يتم تحميلها؛ باقي النتائج متاحة.
            </p>
          )}

          {showProducts && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">
                    منتجات «{query.trim()}»
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {sortedProducts.length} منتج معروض
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-cyan/10 px-3 py-1.5 text-[10px] font-bold text-brand-cyan sm:text-xs">
                  <Package className="h-3.5 w-3.5" />
                  منتجات الماركت
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  <SlidersHorizontal className="h-4 w-4 text-brand-cyan" />
                  تصفية المنتجات
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-500">القسم</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-brand-cyan dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="">كل الأقسام</option>
                      {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                      {category && !categories.includes(category) && <option value={category}>{category}</option>}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-500">أقل سعر (ج.م)</span>
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="من"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-brand-cyan dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-500">أعلى سعر (ج.م)</span>
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="إلى"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-brand-cyan dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-slate-500">ترتيب حسب</span>
                    <span className="relative block">
                      <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value as SortOption)}
                        className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-xs font-bold text-slate-700 outline-none focus:border-brand-cyan dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="relevance">الأكثر صلة</option>
                        <option value="price-asc">السعر: من الأقل للأعلى</option>
                        <option value="price-desc">السعر: من الأعلى للأقل</option>
                      </select>
                    </span>
                  </label>
                </div>
                {invalidPriceRange && (
                  <p role="alert" className="mt-3 text-xs font-bold text-rose-500">
                    راجع نطاق السعر؛ لازم القيم تكون موجبة والحد الأدنى أقل من الحد الأقصى.
                  </p>
                )}
                {(category || minPrice || maxPrice) && (
                  <button
                    type="button"
                    onClick={() => { setCategory(''); setMinPrice(''); setMaxPrice(''); }}
                    className="mt-3 min-h-9 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    مسح الفلاتر
                  </button>
                )}
              </div>

              {!invalidPriceRange && sortedProducts.length > 0 ? (
                <ProductGrid products={sortedProducts} initialCount={12} step={8} resetKey={query.trim() + category + minPrice + maxPrice + sortBy} />
              ) : !invalidPriceRange ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">مفيش منتجات مطابقة للفلاتر دي.</p>
                  <button type="button" onClick={() => { setCategory(''); setMinPrice(''); setMaxPrice(''); }} className="mt-3 text-xs font-extrabold text-brand-cyan">امسح الفلاتر</button>
                </div>
              ) : null}
            </section>
          )}

          {showShops && shopResults.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">
                  متاجر مرتبطة بـ «{query.trim()}»
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {shopResults.length} متجر معروض
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {shopResults.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
              </div>
            </section>
          )}

          {!hasVisibleResults && !invalidPriceRange && (
            <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 px-5 py-12 text-center dark:border-slate-700 sm:py-16">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Store className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                ملقيناش نتائج للكلمة دي
              </h2>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">
                جرّب اسم أقصر أو كلمة مختلفة، أو اختار من عمليات البحث الشائعة.
              </p>
              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 min-h-11 rounded-xl bg-brand-cyan/10 px-5 text-sm font-bold text-brand-cyan transition-colors hover:bg-brand-cyan/15"
              >
                بحث جديد
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1400px] px-3 py-6 sm:px-5 md:px-6 md:py-10" aria-busy="true">
          <div className="mb-6 h-7 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mb-8 h-14 max-w-3xl animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <ProductGridSkeleton count={6} />
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
