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

export function MonthCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onDayClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onDayClick: (dateStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate calendar grid:
  // Saturday is index 0 in our RTL grid
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 1) % 7; // 0 = Saturday, 6 = Friday

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Prepare 6 rows of 7 days = 42 days total
  const gridCells: Array<{
    dayNumber: number;
    monthType: 'prev' | 'current' | 'next';
    fullDate: Date;
    dateStr: string;
    weekNumber: number;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'prev',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'current',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Next month leading days (to fill 5 or 6 weeks)
  const remaining = 42 - gridCells.length;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'next',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Split into 6 rows
  const weeks: (typeof gridCells)[] = [];
  for (let i = 0; i < 42; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  // Group bookings by date string
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingItem[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.dateStr) || [];
      arr.push(b);
      map.set(b.dateStr, arr);
    });
    return map;
  }, [bookings]);

  const todayStr = formatDateKey(new Date());

  return (
    <div className="overflow-x-auto touch-auto">
      <div className="min-w-[760px]">
        {/* Table Header: السبت إلى الجمعة */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-extrabold text-slate-700 py-3">
          {WEEK_DAYS.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>

        {/* Table Body: 6 rows */}
        <div className="divide-y divide-slate-200">
          {weeks.map((week, wIdx) => {
            const rowWeekNum = week[0].weekNumber;
            return (
              <div
                key={wIdx}
                className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-200 min-h-[110px] sm:min-h-[125px]"
              >
                {week.map((cell, cIdx) => {
                  const dayBookings = bookingsByDate.get(cell.dateStr) || [];
                  const isToday = cell.dateStr === todayStr;
                  const isHighlighted =
                    isToday || (cell.monthType === 'current' && cell.dayNumber === 16); // exact yellow tint like screenshot

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => onDayClick(cell.dateStr)}
                      className={`relative p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                        cell.monthType !== 'current'
                          ? 'bg-slate-50/40 text-slate-300'
                          : isHighlighted
                            ? 'bg-[#FEF9C3]/80 hover:bg-[#FEF9C3]' // Exact warm amber/yellow highlight as in screenshot
                            : 'bg-white hover:bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      {/* Cell Header: Day number + Week label (only on first cell of row or Saturday) */}
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-xs font-extrabold tabular-nums ${
                            cell.monthType !== 'current'
                              ? 'text-slate-400'
                              : isToday
                                ? 'text-slate-900 font-black'
                                : 'text-slate-700'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Week Label (36 أسبوع) shown on the Saturday cell (first cell in RTL row) like screenshot */}
                        {cIdx === 0 && (
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                            {rowWeekNum} أسبوع
                          </span>
                        )}
                      </div>

                      {/* Booking Pills / Events */}
                      <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-none">
                        {dayBookings.slice(0, 3).map((b) => {
                          const act = ACTIVITY_META[b.activityType];
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBooking(b);
                              }}
                              className={`w-full text-right px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 border transition-transform hover:scale-[1.02] ${act.chip}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.dot}`} />
                              <span className="truncate">{b.itemName}</span>
                              <span className="text-[9px] text-slate-500 mr-auto shrink-0 tabular-nums">
                                {b.timeStr}
                              </span>
                            </button>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] font-bold text-slate-500 text-center">
                            +{dayBookings.length - 3} أخرى
                          </div>
                        )}
                      </div>

                      {/* Quick Add icon on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 flex items-center justify-end">
                        <Plus size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * TimeGrid — شبكة المواعيد (اليوم/الأسبوع)
 * صفحة مسطّرة: خط كل ربع ساعة في عرض اليوم، خط أسود يحاكي الوقت
 * اللحظي ويتحدّث كل 30 ثانية، والضغط على أي وقت فاضي يفتح نموذج
 * حجز جديد مُعبأ مسبقًا بهذا التاريخ والوقت.
 * ============================================================ */

/** العرض البصري الافتراضي للحجز داخل الشبكة — مش مدة حقيقية من الباكند */

/** خطاف الوقت اللحظي — يحدّث كل 30 ثانية فقط لما العرض فيه النهاردة */
