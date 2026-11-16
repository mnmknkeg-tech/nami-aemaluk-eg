'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';

/** Id of the hero search block — the header becomes solid when it reaches the top. */
export const HERO_SEARCH_ID = 'hero-search';

/** Mobile-first marketplace search entry point. */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <section aria-label="البحث عن المنتجات" className="w-full">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-bold text-brand-cyan mb-0.5">
            من مكانك.. اختار اللي محتاجه
          </p>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
            بتدور على إيه النهارده؟
          </h2>
        </div>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-cyan/10 px-3 py-1.5 text-[11px] font-bold text-brand-cyan">
          <Search className="h-3.5 w-3.5" />
          بحث سريع
        </span>
      </div>

      <form
        role="search"
        onSubmit={submitSearch}
        className="group relative rounded-[1.35rem] bg-gradient-to-l from-brand-cyan/35 via-brand-cyan/10 to-amber-400/30 p-[1px] shadow-[0_8px_28px_rgba(15,23,42,0.07)] transition-shadow focus-within:shadow-[0_10px_34px_rgba(15,23,42,0.12)]"
      >
        <div className="relative flex min-h-14 items-center rounded-[calc(1.35rem-1px)] bg-white px-3 dark:bg-slate-900 sm:min-h-[3.75rem] sm:px-4">
          <Search
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-brand-cyan"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج بالاسم..."
            aria-label="ابحث عن منتج"
            autoComplete="off"
            enterKeyHint="search"
            className="h-14 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-white sm:h-[3.75rem] sm:text-[15px]"
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            aria-label="ابحث الآن"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 active:translate-y-0 dark:bg-brand-cyan dark:text-slate-950 dark:hover:bg-brand-cyan/90 sm:h-11 sm:px-4 sm:text-sm"
          >
            <span>ابحث</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </form>
      <p className="mt-2 px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
        اكتب اسم المنتج أو جزءًا منه للوصول لنتائج أسرع
      </p>
    </section>
  );
}
