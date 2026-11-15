'use client';

import { Search, ArrowUpDown } from 'lucide-react';

type StockTab = 'all' | 'visible' | 'hidden' | 'low';
type SortBy = 'name' | 'price' | 'stock' | 'newest';
type SortOrder = 'asc' | 'desc';

type Props = {
  stats: { total: number; active: number; lowStock: number; value: number };
  stockTab: StockTab;
  onStockTab: (id: StockTab) => void;
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  categories: { id: string; name: string }[];
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (v: SortOrder) => void;
};

export default function ProductsFilterBar({
  stats,
  stockTab,
  onStockTab,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  categories,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
}: Props) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        {/* تبويبات الحالة */}
        <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'الكل', count: stats.total },
              { id: 'visible', label: 'معروض', count: stats.active },
              { id: 'hidden', label: 'مخفي', count: stats.total - stats.active },
              { id: 'low', label: 'مخزون منخفض', count: stats.lowStock },
            ] as const
          ).map((f) => {
            const isActive = stockTab === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onStockTab(f.id)}
                className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                    isActive ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* بحث + فلاتر */}
        <div className="px-3 sm:px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="دوّر باسم المنتج أو الفئة…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="all">كل الفئات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="name">الاسم</option>
              <option value="price">السعر</option>
              <option value="stock">المخزون</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            >
              <ArrowUpDown size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
