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

export function AgendaView({
  bookings,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  typeOptions,
  onSelectBooking,
}: {
  bookings: BookingItem[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (s: string) => void;
  /** الأنشطة المفعّلة من تخصيص التاجر — الفلتر يعرضها فقط */
  typeOptions: ActivityType[];
  onSelectBooking: (b: BookingItem) => void;
}) {
  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter !== 'all' && b.status !== statusFilter) return false;
        if (typeFilter !== 'all' && b.activityType !== typeFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = b.customerName.toLowerCase().includes(q);
          const matchService = b.itemName.toLowerCase().includes(q);
          const matchPhone = b.customerPhone.includes(q);
          if (!matchName && !matchService && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => b.when.localeCompare(a.when));
  }, [bookings, search, statusFilter, typeFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعميل أو الهاتف أو الخدمة..."
            className="w-full pr-9 pl-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="PENDING">بانتظار التأكيد</option>
            <option value="CONFIRMED">مؤكد</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="CANCELLED">ملغي</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-bold">
          لا توجد حجوزات مطابقة لمعايير البحث
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400">
                <th className="pb-2 pr-3">النشاط / الخدمة</th>
                <th className="pb-2">العميل</th>
                <th className="pb-2">الموعد</th>
                <th className="pb-2">السعر</th>
                <th className="pb-2">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((b) => {
                const act = ACTIVITY_META[b.activityType];
                const st = STATUS_META[b.status];
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <span className="font-bold text-slate-900">{b.itemName}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <span className="font-bold text-slate-800">{b.customerName}</span>
                        {b.customerPhone && (
                          <span className="text-[10px] text-slate-400 block" dir="ltr">
                            {b.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 font-medium tabular-nums">
                      {b.dateStr} • {b.timeStr}
                    </td>
                    <td className="py-3 font-bold text-slate-900 tabular-nums">
                      {b.price > 0 ? `${b.price.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Year View — 12 شهر مصغر، الأيام اللي فيها حجوزات معلّمة،
 * والضغط على أي يوم بينقلك لصفحة ذلك اليوم مباشرة.
 * ============================================================ */
