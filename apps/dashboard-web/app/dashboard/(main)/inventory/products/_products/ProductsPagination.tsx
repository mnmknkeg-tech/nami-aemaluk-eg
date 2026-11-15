'use client';

import type { Dispatch, SetStateAction } from 'react';

type Props = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalCount: number;
  onPageChange: Dispatch<SetStateAction<number>>;
  onItemsPerPageChange: (n: number) => void;
};

export default function ProductsPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalCount,
  onPageChange,
  onItemsPerPageChange,
}: Props) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
      <div className="text-sm text-slate-500">
        عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
        {Math.min(currentPage * itemsPerPage, totalCount)} من {totalCount}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          السابق
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                currentPage === pageNum
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
        >
          التالي
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">عرض</label>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <label className="text-sm text-slate-500">لكل صفحة</label>
      </div>
    </div>
  );
}
