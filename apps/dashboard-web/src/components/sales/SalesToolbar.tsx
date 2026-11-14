'use client';

import React from 'react';
import { Search, ArrowUpDown, Columns3, RotateCcw } from 'lucide-react';
import { type FilterType, RESTAURANT_FILTERS, RETAIL_FILTERS } from './salesShared';

export interface SalesToolbarProps {
  isRestaurant: any;
  filter: FilterType;
  stats: any;
  setFilter: React.Dispatch<React.SetStateAction<FilterType>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  dateRange: 'all' | 'today' | 'week' | 'month';
  setDateRange: React.Dispatch<React.SetStateAction<'all' | 'today' | 'week' | 'month'>>;
  amountRange: 'all' | 'under100' | '100to500' | 'over500';
  setAmountRange: React.Dispatch<React.SetStateAction<'all' | 'under100' | '100to500' | 'over500'>>;
  sortBy: 'date' | 'amount' | 'status';
  setSortBy: React.Dispatch<React.SetStateAction<'date' | 'amount' | 'status'>>;
  setColsDraft: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  visibleCols: Record<string, boolean>;
  setColsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  colsOpen: boolean;
  resetCols: any;
  COL_DEFS: any;
  colsDraft: Record<string, boolean>;
  saveCols: any;
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  sortOrder: 'asc' | 'desc';
}

const SalesToolbar: React.FC<SalesToolbarProps> = ({
  isRestaurant,
  filter,
  stats,
  setFilter,
  setCurrentPage,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  amountRange,
  setAmountRange,
  sortBy,
  setSortBy,
  setColsDraft,
  visibleCols,
  setColsOpen,
  colsOpen,
  resetCols,
  COL_DEFS,
  colsDraft,
  saveCols,
  setSortOrder,
  sortOrder,
}) => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        {/* تبويبات الحالة — نصية بلا مربعات */}
        <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
          {(isRestaurant ? RESTAURANT_FILTERS : RETAIL_FILTERS).map((f) => {
            const isActive = filter === f.id;
            const count =
              f.id === 'all'
                ? stats.total
                : f.id === 'successful'
                  ? stats.successful
                  : f.id === 'rejected'
                    ? stats.rejected
                    : f.id === 'pending'
                      ? stats.pending
                      : f.id === 'confirmed'
                        ? stats.confirmed
                        : f.id === 'preparing'
                          ? stats.preparing
                          : f.id === 'ready'
                            ? stats.ready
                            : f.id === 'handed_to_courier'
                              ? stats.handedToCourier
                              : f.id === 'out_for_delivery'
                                ? stats.outForDelivery
                                : f.id === 'delivered'
                                  ? stats.delivered
                                  : f.id === 'cancelled'
                                    ? stats.cancelled
                                    : f.id === 'refunded'
                                      ? stats.refunded
                                      : 0;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setCurrentPage(1);
                }}
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
                  {count}
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
              placeholder="دوّر برقم الطلب، اسم العميل، أو رقم الموبايل…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="all">كل الفترات</option>
              <option value="today">النهاردة</option>
              <option value="week">آخر ٧ أيام</option>
              <option value="month">آخر ٣٠ يوم</option>
            </select>
            <select
              value={amountRange}
              onChange={(e) => setAmountRange(e.target.value as any)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="all">كل المبالغ</option>
              <option value="under100">أقل من ١٠٠ ج.م</option>
              <option value="100to500">١٠٠ – ٥٠٠ ج.م</option>
              <option value="over500">أكتر من ٥٠٠ ج.م</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="date">الأحدث أولاً</option>
              <option value="amount">الأعلى قيمة</option>
              <option value="status">حسب الحالة</option>
            </select>
            <div className="relative">
              <button
                onClick={() => {
                  setColsDraft(visibleCols);
                  setColsOpen(!colsOpen);
                }}
                className={`h-10 w-10 rounded-full border flex items-center justify-center transition-colors ${colsOpen ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                title="تخصيص الأعمدة"
              >
                <Columns3 size={15} />
              </button>
              {colsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColsOpen(false)} />
                  <div className="absolute top-12 left-0 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">تخصيص الأعمدة</span>
                      <button
                        onClick={resetCols}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                        title="استعادة الكل"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {COL_DEFS.map((c) => (
                        <label
                          key={c.key}
                          className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-slate-700">{c.label}</span>
                          <input
                            type="checkbox"
                            checked={colsDraft[c.key] !== false}
                            onChange={(e) =>
                              setColsDraft((p) => ({ ...p, [c.key]: e.target.checked }))
                            }
                            className="w-4 h-4 accent-slate-900"
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={saveCols}
                      className="w-full h-8 mt-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                    >
                      حفظ
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10 rounded-full border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center"
              title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
            >
              <ArrowUpDown size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesToolbar;
