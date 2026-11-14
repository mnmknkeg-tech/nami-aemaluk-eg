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

import { TimeGrid } from './TimeGrid';

const MotionDiv = motion.div as any;

export function WeekCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onSlotClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
}) {
  // بداية الأسبوع السبت عبر date-fns (weekStartsOn: 6)
  const startOfWeek = dfStartOfWeek(currentDate, { weekStartsOn: 6 });

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const todayStr = formatDateKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-3 text-xs font-extrabold text-slate-700 pr-16">
        {days.map((d, i) => (
          <div key={i} className="space-y-1">
            <div>{WEEK_DAYS[i]}</div>
            <div
              className={`text-base font-black tabular-nums ${formatDateKey(d) === todayStr ? 'text-indigo-600' : 'text-slate-900'}`}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <TimeGrid
            days={days}
            bookings={bookings}
            onSelectBooking={onSelectBooking}
            onSlotClick={onSlotClick}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Day View — صفحة اليوم المسطّرة (خط كل ربع ساعة + الوقت اللحظي)
 * ============================================================ */
