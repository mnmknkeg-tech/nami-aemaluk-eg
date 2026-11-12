'use client';

import { Filter, Search } from 'lucide-react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

type PosCategory = { id: string; name: string };

type PosProductToolbarProps = {
  isArabic: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  categories: PosCategory[];
  categoryFilter: string;
  setCategoryFilter: Dispatch<SetStateAction<string>>;
  showCategoryFilter: boolean;
  setShowCategoryFilter: Dispatch<SetStateAction<boolean>>;
};

export default function PosProductToolbar({
  isArabic,
  searchInputRef,
  search,
  setSearch,
  categories,
  categoryFilter,
  setCategoryFilter,
  showCategoryFilter,
  setShowCategoryFilter,
}: PosProductToolbarProps) {
  return (
    <>
      <div className="flex-1 relative min-w-[150px]">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={isArabic ? 'بحث عن منتج... (F2)' : 'Search products... (F2)'}
          className="w-full bg-slate-50 border rounded-2xl py-2.5 md:py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-[#BD00FF] text-sm md:text-base"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryFilter((value) => !value)}
            className={`p-2.5 md:p-3 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all ${categoryFilter !== 'all' ? 'bg-[#BD00FF]/10 border-[#BD00FF] text-[#BD00FF]' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
            title={isArabic ? 'تصنيفات' : 'Categories'}
          >
            <Filter size={16} />
            <span className="hidden md:inline">
              {categoryFilter === 'all'
                ? isArabic
                  ? 'الكل'
                  : 'All'
                : categories.find((category) => category.id === categoryFilter)?.name || '...'}
            </span>
          </button>

          {showCategoryFilter && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto min-w-[180px]">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setShowCategoryFilter(false);
                }}
                className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 ${categoryFilter === 'all' ? 'text-[#BD00FF]' : 'text-slate-700'}`}
              >
                {isArabic ? 'كل التصنيفات' : 'All categories'}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(category.id);
                    setShowCategoryFilter(false);
                  }}
                  className={`w-full text-right px-4 py-2.5 text-xs font-black hover:bg-slate-50 border-t border-slate-50 ${categoryFilter === category.id ? 'text-[#BD00FF]' : 'text-slate-700'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
