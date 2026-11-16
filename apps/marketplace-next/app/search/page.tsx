'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { AlertCircle, Search, Store, X } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductGridSkeleton } from '@/components/Skeleton';
import { jsonRequest } from '@/lib/api';
import type { Product } from '@/lib/services';

const QUICK_SEARCHES = ['موبايلات', 'ملابس', 'أحذية', 'ساعات', 'عطور'];

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQuery = params.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const requestSequence = useRef(0);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = ++requestSequence.current;

    if (!trimmed) {
      setResults([]);
      setStatus('idle');
      return;
    }

    // Wait until typing pauses; this avoids sending one request per keystroke.
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const data = await jsonRequest<any>(
          `/search/products?q=${encodeURIComponent(trimmed)}&limit=48`
        );
        if (requestId !== requestSequence.current) return;

        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setResults(Array.isArray(items) ? items : []);
        setStatus('success');
      } catch {
        if (requestId !== requestSequence.current) return;
        setResults([]);
        setStatus('error');
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
      // Ignore a response from an older query if it finishes after this one.
      requestSequence.current += 1;
    };
  }, [query]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setStatus('idle');
    router.replace('/search');
  };

  const chooseQuickSearch = (term: string) => {
    setQuery(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

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
          اكتب اسم المنتج وشوف الخيارات المتاحة من المتاجر.
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
            placeholder="بتدور على منتج إيه؟"
            aria-label="ابحث عن منتج"
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
        <section aria-live="polite">
          {results.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">
                    نتائج «{query.trim()}»
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {results.length} نتيجة معروضة
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-cyan/10 px-3 py-1.5 text-[10px] font-bold text-brand-cyan sm:text-xs">
                  <Store className="h-3.5 w-3.5" />
                  منتجات الماركت
                </span>
              </div>
              <ProductGrid
                products={results}
                initialCount={12}
                step={8}
                resetKey={query.trim()}
              />
            </>
          ) : (
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
