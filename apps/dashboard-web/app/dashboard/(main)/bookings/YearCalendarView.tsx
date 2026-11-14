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
  WEEK_DAYS_SHORT,
} from './shared';

const MotionDiv = motion.div as any;

export function YearCalendarView({
  currentDate,
  bookings,
  onDayClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onDayClick: (dateStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    bookings.forEach((b) => m.set(b.dateStr, (m.get(b.dateStr) || 0) + 1));
    return m;
  }, [bookings]);
  const todayStr = formatDateKey(new Date());

  return (
    <div
      className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-slate-50/50"
      dir="rtl"
    >
      {ARABIC_MONTHS.map((name, mi) => {
        const firstWeekday = (new Date(year, mi, 1).getDay() + 1) % 7; // 0 = السبت
        const daysInMonth = new Date(year, mi + 1, 0).getDate();
        const cells: (number | null)[] = [
          ...Array<null>(firstWeekday).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        while (cells.length % 7 !== 0) cells.push(null);
        return (
          <div key={mi} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="text-sm font-black text-slate-900 text-center mb-2">
              {name} {year}
            </div>
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 mb-1">
              {WEEK_DAYS_SHORT.map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e${i}`} />;
                const dStr = formatDateKey(new Date(year, mi, day));
                const count = countsByDate.get(dStr) || 0;
                const isToday = dStr === todayStr;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onDayClick(dStr)}
                    className={`relative h-7 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                      isToday
                        ? 'bg-slate-900 text-white shadow-sm'
                        : count > 0
                          ? 'text-pink-600 bg-pink-50 hover:bg-pink-100'
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={count > 0 ? `${count} حجز في ${dStr}` : dStr}
                  >
                    {day}
                    {count > 0 && (
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-pink-500'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * Table View — جدول الحجوزات الكامل (شيبس الحالة بعداد، بحث،
 * فرز بالأعمدة، باجينيشن، وإجراءات لكل صف: تفاصيل + طباعة فاتورة)
 * ============================================================ */
