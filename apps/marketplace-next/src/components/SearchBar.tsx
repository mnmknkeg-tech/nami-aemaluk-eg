'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, X, Store, Package } from 'lucide-react';
import { api } from '@/lib/api';

interface SearchResult {
  type: 'shop' | 'product';
  id: string;
  name: string;
  slug?: string;
  image?: string;
  subtitle?: string;
}

interface SearchBarProps {
  /** Renders the input at full width (used inside the header menu drawer). */
  fullWidth?: boolean;
}

export function SearchBar({ fullWidth = false }: SearchBarProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [shopsRes, productsRes] = await Promise.all([
          api
            .get<any>(`/search/shops?q=${encodeURIComponent(query)}&limit=5`, { revalidate: 0 })
            .catch((): any => ({ data: [] })),
          api
            .get<any>(`/search/products?q=${encodeURIComponent(query)}&limit=5`, { revalidate: 0 })
            .catch((): any => ({ data: [] })),
        ]);
        const shopsList: any[] = Array.isArray(shopsRes)
          ? shopsRes
          : (shopsRes?.data ?? shopsRes?.items ?? []);
        const productsList: any[] = Array.isArray(productsRes)
          ? productsRes
          : (productsRes?.data ?? productsRes?.items ?? []);
        const shopResults: SearchResult[] = shopsList.map((s: any) => ({
          type: 'shop' as const,
          id: s.id,
          name: s.name,
          slug: s.slug,
          image: s.logo,
          subtitle: s.city || s.activity,
        }));
        const productResults: SearchResult[] = productsList.map((p: any) => ({
          type: 'product' as const,
          id: p.id,
          name: p.name,
          image: p.imageUrl || p.images?.[0],
          subtitle: p.price ? `${p.price} ${p.currency || 'ج.م'}` : undefined,
        }));
        setResults([...shopResults, ...productResults]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    if (result.type === 'shop' && result.slug) {
      router.push(`/shop/${result.slug}`);
    } else if (result.type === 'product') {
      router.push(`/product/${result.id}`);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="بحث..."
          className={`bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-brand-cyan rounded-lg pr-9 pl-3 py-2 text-sm font-semibold outline-none transition-all ${
            fullWidth ? 'w-full' : 'w-36 md:w-48 focus:w-56 md:focus:w-64'
          }`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 min-w-[300px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[90]">
          {loading ? (
            <div className="p-4 text-center text-sm font-semibold text-slate-500">
              جاري البحث...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm font-semibold text-slate-500">
              لا توجد نتائج
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-right"
                >
                  <div className="relative w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.image ? (
                      <Image
                        src={r.image}
                        alt={r.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : r.type === 'shop' ? (
                      <Store className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{r.name}</div>
                    {r.subtitle && (
                      <div className="text-xs font-semibold text-slate-500 truncate">
                        {r.subtitle}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
                    {r.type === 'shop' ? 'متجر' : 'منتج'}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                  setOpen(false);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full p-3 text-center text-sm font-bold text-brand-cyan hover:bg-brand-cyan/5 transition-colors border-t border-slate-100 dark:border-slate-800"
              >
                عرض كل النتائج
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
