'use client';

import React from 'react';
import { Calendar, Clock, CheckCircle2, Wallet, Loader2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { ACTIVITY_META, STATUS_META } from '@/lib/bookings/ui';
import { BOOKING_TABS } from './meta';
import type { CustomerBooking } from './meta';

type Props = {
  stats: { total: number; upcoming: number; completed: number; value: number };
  currency: string;
  bookingTab: string;
  onBookingTabChange: (id: string) => void;
  loading: boolean;
  bookings: CustomerBooking[];
};

export default function BookingsSection({
  stats,
  currency,
  bookingTab,
  onBookingTabChange,
  loading,
  bookings,
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">سجل الحجوزات</h3>
        <span className="text-[10px] font-bold text-slate-400">مرتبط برقم موبايل العميل</span>
      </div>

      {/* كروت إحصاء الحجوزات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="border border-slate-100 bg-slate-50/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">إجمالي الحجوزات</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100/70 text-[#492770] flex items-center justify-center">
              <Calendar size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums">{stats.total}</div>
        </div>
        <div className="border border-slate-100 bg-slate-50/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">حجوزات قادمة</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums">{stats.upcoming}</div>
        </div>
        <div className="border border-slate-100 bg-slate-50/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">حجوزات مكتملة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums">{stats.completed}</div>
        </div>
        <div className="border border-slate-100 bg-slate-50/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">قيمة الحجوزات</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center">
              <Wallet size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums">
            {stats.value.toLocaleString()} {currency}
          </div>
        </div>
      </div>

      {/* تابات حالات الحجز */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
        {BOOKING_TABS.map((t) => {
          const active = bookingTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onBookingTabChange(t.id)}
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

      {/* جدول الحجوزات */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold">
              <th className="px-3 py-2.5">رقم الحجز / الخدمة</th>
              <th className="px-3 py-2.5">النشاط</th>
              <th className="px-3 py-2.5">الموعد (توقيت القاهرة)</th>
              <th className="px-3 py-2.5">الحالة</th>
              <th className="px-3 py-2.5">الدفع</th>
              <th className="px-3 py-2.5">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-purple-600" />
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    variant="mini"
                    title={
                      bookingTab === 'all'
                        ? 'لا توجد حجوزات لهذا العميل'
                        : 'لا توجد حجوزات في هذه الحالة'
                    }
                  />
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const act = ACTIVITY_META[b.activityType];
                const st = STATUS_META[b.status];
                return (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-xs"
                  >
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-900 tabular-nums">
                        #{b.bookingNumber || b.id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold">
                        {b.serviceName}
                        {b.participants > 1 ? ` ×${b.participants}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${act.chip}`}
                      >
                        {act.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-semibold tabular-nums">
                      {b.dateStr} · {b.timeStr}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-semibold">
                      {b.paymentStatus || '—'}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900 tabular-nums">
                      {b.price.toLocaleString()} {currency}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-400 font-bold">إجمالي النتائج: {bookings.length}</div>
    </div>
  );
}
