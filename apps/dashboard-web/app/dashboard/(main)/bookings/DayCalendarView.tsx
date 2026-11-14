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

export function DayCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onSlotClick,
  onAddBooking,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onAddBooking: () => void;
}) {
  const dayBookings = bookings.filter((b) => b.dateStr === formatDateKey(currentDate));

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            {currentDate.toLocaleDateString('ar-EG', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            إجمالي {dayBookings.length} موعد مسجل • اضغط على أي وقت في المسطرة لإضافة حجز عند هذا
            الموعد
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBooking}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
        >
          <Plus size={13} />
          إضافة موعد
        </button>
      </div>
      <div className="overflow-y-auto max-h-[640px]">
        <TimeGrid
          days={[currentDate]}
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          onSlotClick={onSlotClick}
          quarterLines
          pxPerHour={72}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * Agenda View Component (قائمة البحث والتصفية)
 * ============================================================ */
