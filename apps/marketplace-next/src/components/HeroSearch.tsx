'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** Id of the hero search block — the header becomes solid when it reaches the top. */
export const HERO_SEARCH_ID = 'hero-search';

/** Big rounded search bar that lives at the top of the home page hero. */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  return (
    <form onSubmit={submitSearch} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن شيء ما ..."
        aria-label="بحث"
        className="w-full h-11 md:h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm pr-11 pl-4 text-sm font-semibold outline-none focus:border-brand-cyan transition-all placeholder:text-slate-400"
      />
      <button
        type="submit"
        aria-label="ابحث"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-cyan transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </form>
  );
}