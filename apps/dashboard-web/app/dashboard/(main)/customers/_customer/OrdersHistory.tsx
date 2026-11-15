'use client';

import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { ORDER_TABS } from './meta';
import type { ActivityRow } from './meta';

type Props = {
  orderTab: string;
  onOrderTabChange: (id: string) => void;
  orderSearch: string;
  onOrderSearchChange: (v: string) => void;
  loading: boolean;
  orders: ActivityRow[];
  currency: string;
  onNewOrder: () => void;
};

export default function OrdersHistory({
  orderTab,
  onOrderTabChange,
  orderSearch,
  onOrderSearchChange,
  loading,
  orders,
  currency,
  onNewOrder,
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">سجل الطلبات</h3>
      </div>

      {/* تابات الحالات كالصورة 2 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
        {ORDER_TABS.map((t) => {
          const active = orderTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOrderTabChange(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                active
                  ? 'bg-[#492770] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* شريط البحث في الطلبات */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          value={orderSearch}
          onChange={(e) => onOrderSearchChange(e.target.value)}
          placeholder="بحث برقم الطلب..."
          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      {/* جدول الطلبات كالصورة 2 */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
              <th className="px-3 py-2.5">رقم الطلب / السعر</th>
              <th className="px-3 py-2.5">تاريخ الإنشاء / نوع السجل</th>
              <th className="px-3 py-2.5">الحالة</th>
              <th className="px-3 py-2.5">الشحن</th>
              <th className="px-3 py-2.5">الدفع / حالة الدفع</th>
              <th className="px-3 py-2.5">المجموع / السلة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-purple-600" />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState variant="mini" title="لا توجد طلبات مطابقة في هذا التصنيف" />
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-xs"
                >
                  <td className="px-3 py-3 font-bold text-slate-900 tabular-nums">
                    #{String(o.id).slice(0, 8)}
                  </td>
                  <td className="px-3 py-3 text-slate-500 font-semibold">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {o.status || 'جديد'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 font-semibold">مندوب</td>
                  <td className="px-3 py-3 text-slate-700 font-semibold">
                    {o.paymentStatus || 'الدفع عند الاستلام'}
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-900 tabular-nums">
                    {Number(o.total || 0).toLocaleString()} {currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* أزرار أسفل سجل الطلبات كالصورة 2 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOrderTabChange('all')}
            className="h-8 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            عرض الكل
          </button>
          <button
            type="button"
            onClick={onNewOrder}
            className="h-8 px-4 rounded-full bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e]"
          >
            إنشاء طلب للعميل
          </button>
        </div>
        <div className="text-xs text-slate-400 font-bold">إجمالي النتائج: {orders.length}</div>
      </div>
    </div>
  );
}
