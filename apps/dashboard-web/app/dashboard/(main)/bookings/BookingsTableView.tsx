'use client';
import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  DollarSign,
  Phone,
  MessageCircle,
  Stethoscope,
  BedDouble,
  Utensils,
  Briefcase,
  Filter,
  Search,
  X,
  Loader2,
  Info,
  AlertCircle,
  Settings,
  Check,
  Eye,
  ExternalLink,
  Sparkles,
  Printer,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { format as dfFormat, parse as dfParse, startOfWeek as dfStartOfWeek } from 'date-fns';
import { apiRequest } from '@/lib/auth';
import { addBookingViaBackend, updateBookingStatusViaBackend } from '@/lib/api/bookings';
import { readShopBookingConfig, type ShopBookingConfig } from '@ray-eg/shared/booking';
import {
  ACTIVITY_META,
  ACTIVITY_ORDER,
  STATUS_META,
  cairoPartsFromIso,
  normStatus,
  type ActivityType,
  type UnifiedStatus,
} from '@/lib/bookings/ui';
import {
  type ViewMode,
  type BookingItem,
  type GridBlock,
  ARABIC_MONTHS,
  WEEK_DAYS,
  UUID_RE,
  QUICK_TIMES,
  inferActivityType,
  getWeekNumber,
  formatDateKey,
  parseDateKey,
  timeToMinutes,
  minutesToTime,
  fmtTime12,
  paymentLabel,
  normNameKey,
  ensureBookingCustomers,
  useNow,
  layoutGridBlocks,
  waMeLink,
} from './shared';

const MotionDiv = motion.div as any;

export function BookingsTableView({
  bookings,
  typeOptions,
  onSelectBooking,
  onPrint,
}: {
  bookings: BookingItem[];
  /** الأنشطة المفعّلة من تخصيص التاجر */
  typeOptions: ActivityType[];
  onSelectBooking: (b: BookingItem) => void;
  onPrint: (b: BookingItem) => void;
}) {
  const [statusChip, setStatusChip] = useState<'all' | UnifiedStatus>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'when' | 'price' | 'customer'>('when');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };
    bookings.forEach((b) => {
      c[b.status] = (c[b.status] || 0) + 1;
    });
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = bookings.filter((b) => {
      if (statusChip !== 'all' && b.status !== statusChip) return false;
      if (typeFilter !== 'all' && b.activityType !== typeFilter) return false;
      if (q) {
        const hit =
          b.customerName.toLowerCase().includes(q) ||
          b.itemName.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          String(b.raw?.bookingNumber || '')
            .toLowerCase()
            .includes(q);
        if (!hit) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === 'when') r = a.when.localeCompare(b.when);
      else if (sortKey === 'price') r = a.price - b.price;
      else r = a.customerName.localeCompare(b.customerName, 'ar');
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [bookings, search, statusChip, typeFilter, sortKey, sortDir]);

  // الترقيم يرجع لأول صفحة عند تغيير الفلاتر
  useEffect(() => {
    setPage(1);
  }, [statusChip, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chips: Array<{ key: 'all' | UnifiedStatus; label: string; chip: string; count: number }> = [
    {
      key: 'all',
      label: 'الكل',
      chip: 'bg-slate-900 text-white border-slate-900',
      count: counts.all,
    },
    ...(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as UnifiedStatus[]).map((s) => ({
      key: s,
      label: STATUS_META[s].label,
      chip: STATUS_META[s].chip,
      count: counts[s] || 0,
    })),
    ...(counts.EXPIRED > 0
      ? [
          {
            key: 'EXPIRED' as UnifiedStatus,
            label: STATUS_META.EXPIRED.label,
            chip: STATUS_META.EXPIRED.chip,
            count: counts.EXPIRED,
          },
        ]
      : []),
  ];

  const toggleSort = (k: 'when' | 'price' | 'customer') => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  const SortTh = ({ k, label }: { k: 'when' | 'price' | 'customer'; label: string }) => (
    <th className="py-2.5 px-2">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-slate-700 transition-colors"
      >
        {label}
        {sortKey === k ? (
          sortDir === 'asc' ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )
        ) : (
          <ChevronUp size={11} className="opacity-20" />
        )}
      </button>
    </th>
  );

  return (
    <div className="p-4 sm:p-5 space-y-4" dir="rtl">
      {/* شيبس الحالة مع العداد */}
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setStatusChip(c.key)}
            className={`h-9 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              statusChip === c.key
                ? `${c.chip} shadow-sm`
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {c.label}
            <span
              className={`text-[10px] font-black ${statusChip === c.key ? 'opacity-80' : 'text-slate-400'}`}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* البحث والتصفية */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العميل / رقم العميل / رقم الحجز / الخدمة"
            className="w-full pr-9 pl-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">كل الأنشطة</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_META[t].label}
            </option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      {pageItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-bold">
          لا توجد حجوزات مطابقة لمعايير البحث
        </div>
      ) : (
        <div className="overflow-x-auto touch-auto border border-slate-100 rounded-xl">
          <table className="w-full text-right min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400">
                <th className="py-2.5 px-2">إجراءات</th>
                <th className="py-2.5 px-2">الخدمة</th>
                <SortTh k="when" label="وقت الحجز" />
                <th className="py-2.5 px-2">رقم الحجز</th>
                <th className="py-2.5 px-2">المصدر</th>
                <SortTh k="customer" label="العميل" />
                <th className="py-2.5 px-2">الحالة</th>
                <SortTh k="price" label="المبلغ" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageItems.map((b) => {
                const act = ACTIVITY_META[b.activityType];
                const st = STATUS_META[b.status];
                const pay = paymentLabel(b.paymentStatus);
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs"
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectBooking(b)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(b)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="طباعة الفاتورة"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <span className="font-bold text-slate-900">{b.itemName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-medium tabular-nums">
                      <span className="block">{b.dateStr}</span>
                      <span className="block text-[10px] text-slate-400" dir="ltr">
                        {fmtTime12(b.timeStr)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-bold tabular-nums" dir="ltr">
                      {String(b.raw?.bookingNumber || '—')}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[10px] font-bold ${b.source === 'website' ? 'text-sky-600' : 'text-slate-500'}`}
                      >
                        {b.source === 'website' ? 'الموقع' : 'داخلي'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-bold text-slate-800 block">{b.customerName}</span>
                      {b.customerPhone && (
                        <span className="text-[10px] text-slate-400 block tabular-nums" dir="ltr">
                          {b.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}
                      >
                        {st.label}
                      </span>
                      {pay && (
                        <span className="block text-[9px] font-bold text-slate-400 mt-1">
                          {pay}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-black text-slate-900 tabular-nums whitespace-nowrap">
                      {b.price > 0 ? `${b.price.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* الباجينيشن */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>إجمالي الحجوزات: {filtered.length}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="التالي"
          >
            <ChevronRight size={13} />
          </button>
          <span className="px-2 tabular-nums">
            صفحة {safePage} من {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="السابق"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Add Manual Booking Modal (حجز يدوي لجميع الأنشطة)
 * ============================================================ */

/**
 * أوقات سريعة للاختيار بنقرة — كل 30 دقيقة من 08:00 لـ 22:30.
 * الاختيار الحر بالدقائق ما زال متاحًا من حقل الوقت العادي.
 */
