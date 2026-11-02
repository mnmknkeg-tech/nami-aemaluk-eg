'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Store, MapPin, Star, Filter, X } from 'lucide-react';
import { ShopCard } from './ShopCard';
import { VISIBLE_ACTIVITIES } from '@/lib/config';
import type { Shop } from '@/lib/services';

interface DalilClientProps {
  shops: Shop[];
}

export function DalilClient({ shops }: DalilClientProps) {
  const [city, setCity] = useState('');
  const [activity, setActivity] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() => {
    const set = new Set(shops.map((s) => s.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [shops]);

  const filtered = useMemo(() => {
    return shops.filter((s) => {
      if (city && s.city !== city) return false;
      if (activity && s.activity !== activity && s.category !== activity) return false;
      if (minRating > 0 && (s.rating || 0) < minRating) return false;
      return true;
    });
  }, [shops, city, activity, minRating]);

  const activeFilters = (city ? 1 : 0) + (activity ? 1 : 0) + (minRating > 0 ? 1 : 0);

  const clearFilters = () => {
    setCity('');
    setActivity('');
    setMinRating(0);
  };

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Filter className="w-4 h-4" />
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
        <span className="text-sm font-bold text-slate-400 mr-auto">{filtered.length} متجر</span>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 md:p-6 mb-6 space-y-4">
          {/* City filter */}
          {cities.length > 0 && (
            <div>
              <label className="block text-xs font-black mb-2 text-slate-500">المدينة</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCity('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!city ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                >
                  الكل
                </button>
                {cities.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${city === c ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity filter */}
          <div>
            <label className="block text-xs font-black mb-2 text-slate-500">النشاط</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActivity('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!activity ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
              >
                الكل
              </button>
              {VISIBLE_ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activity === a.id ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                >
                  <Image
                    src={a.image}
                    alt=""
                    width={16}
                    height={16}
                    className="w-4 h-4 rounded object-cover"
                  />
                  {a.label.ar}
                </button>
              ))}
            </div>
          </div>

          {/* Rating filter */}
          <div>
            <label className="block text-xs font-black mb-2 text-slate-500">التقييم</label>
            <div className="flex flex-wrap gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${minRating === r ? 'bg-brand-black text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-100'}`}
                >
                  {r === 0 ? (
                    'الكل'
                  ) : (
                    <>
                      <Star className="w-3 h-3 fill-current text-yellow-400" />
                      {r}+
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Store className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-black text-lg">لا توجد متاجر مطابقة</p>
          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 text-brand-cyan font-black text-sm hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      )}
    </>
  );
}
