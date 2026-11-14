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
  PX_PER_HOUR,
  GRID_START_HOUR,
  GRID_END_HOUR,
  BLOCK_MINUTES,
} from './shared';

const MotionDiv = motion.div as any;

export function TimeGrid({
  days,
  bookings,
  onSelectBooking,
  onSlotClick,
  quarterLines = false,
  pxPerHour = PX_PER_HOUR,
}: {
  days: Date[];
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  /** مسطرة ربع ساعة — لعرض اليوم، الأسبوع يكفيه خط كل ساعة */
  quarterLines?: boolean;
  pxPerHour?: number;
}) {
  const todayStr = formatDateKey(new Date());
  const showsToday = days.some((d) => formatDateKey(d) === todayStr);
  const now = useNow(showsToday);

  // توسيع المدى تلقائيًا لو فيه حجوزات قبل 8 ص أو بعد 11 م
  let startHour = GRID_START_HOUR;
  let endHour = GRID_END_HOUR;
  for (const b of bookings) {
    if (!days.some((d) => formatDateKey(d) === b.dateStr)) continue;
    const mins = timeToMinutes(b.timeStr);
    startHour = Math.min(startHour, Math.floor(mins / 60));
    endHour = Math.max(endHour, Math.ceil((mins + BLOCK_MINUTES) / 60));
  }
  startHour = Math.max(0, Math.min(23, startHour));
  endHour = Math.min(24, Math.max(endHour, startHour + 1));
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const gridHeight = ((endMinutes - startMinutes) * pxPerHour) / 60;

  const hourLines: number[] = [];
  for (let h = startHour + 1; h < endHour; h++) hourLines.push(h);
  const quarterSteps: number[] = [];
  if (quarterLines) {
    for (let m = startMinutes + 15; m < endMinutes; m += 15) {
      if (m % 60 !== 0) quarterSteps.push(m);
    }
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = showsToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  const nowTop = ((nowMinutes - startMinutes) * pxPerHour) / 60;

  // الهوفر بيقرّب لمركز الربع ساعة اللي تحت المؤشر — نفس حساب الضغط بالظبط،
  // فالوقت اللي بيظهر في البالونة هو بالحرف اللي هيتسجل.
  const [hoverSlot, setHoverSlot] = useState<{
    day: string;
    y: number;
    minutes: number;
  } | null>(null);
  const minutesFromY = (y: number): number =>
    Math.min(
      endMinutes - 15,
      Math.max(startMinutes, startMinutes + Math.floor(y / (pxPerHour / 4)) * 15)
    );

  return (
    <div className="flex" dir="rtl">
      {/* عمود الساعات — يمين الشاشة */}
      <div className="w-16 shrink-0 relative select-none" style={{ height: gridHeight }}>
        {hourLines.map((h) => (
          <span
            key={h}
            className="absolute w-full pr-2 text-left text-[10px] font-bold text-slate-400 tabular-nums"
            style={{ top: ((h * 60 - startMinutes) * pxPerHour) / 60 - 7 }}
            dir="ltr"
          >
            {fmtTime12(minutesToTime(h * 60))}
          </span>
        ))}
        <span
          className="absolute w-full pr-2 text-left text-[10px] font-bold text-slate-400 tabular-nums"
          style={{ top: 0 }}
          dir="ltr"
        >
          {fmtTime12(minutesToTime(startMinutes))}
        </span>
      </div>

      {/* أعمدة الأيام */}
      <div className="flex-1 flex border-r border-slate-200">
        {days.map((d) => {
          const dStr = formatDateKey(d);
          const dayBookings = bookings.filter((b) => b.dateStr === dStr);
          const blocks = layoutGridBlocks(dayBookings);
          const isToday = dStr === todayStr;
          return (
            <div
              key={dStr}
              className={`relative flex-1 border-l border-slate-100 cursor-pointer transition-colors ${
                isToday ? 'bg-slate-50/40' : 'hover:bg-slate-50/30'
              }`}
              style={{ height: gridHeight }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = minutesFromY(e.clientY - rect.top);
                setHoverSlot({
                  day: dStr,
                  y: ((minutes - startMinutes) * pxPerHour) / 60,
                  minutes,
                });
              }}
              onMouseLeave={() => setHoverSlot(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onSlotClick(dStr, minutesToTime(minutesFromY(e.clientY - rect.top)));
              }}
              title="اضغط على أي وقت لإضافة حجز في هذا الموعد"
            >
              {/* خطوط الساعات */}
              {hourLines.map((h) => (
                <div
                  key={`h${h}`}
                  className="absolute inset-x-0 border-t border-slate-200 pointer-events-none"
                  style={{ top: ((h * 60 - startMinutes) * pxPerHour) / 60 }}
                />
              ))}
              {/* مسطرة ربع الساعة */}
              {quarterSteps.map((m) => (
                <div
                  key={`q${m}`}
                  className="absolute inset-x-0 border-t border-slate-100 pointer-events-none"
                  style={{ top: ((m - startMinutes) * pxPerHour) / 60 }}
                />
              ))}

              {/* كروت الحجوزات — المتقاطعة تنقسم جنب بعض بأعمدة متساوية */}
              {blocks.map(({ b, start, end, col, cols }) => {
                const act = ACTIVITY_META[b.activityType];
                const top = ((start - startMinutes) * pxPerHour) / 60;
                const blockHeight = Math.max(30, ((end - start) * pxPerHour) / 60 - 2);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBooking(b);
                    }}
                    className={`absolute rounded-lg border px-1.5 py-1 overflow-hidden text-right shadow-sm hover:brightness-95 transition-all ${act.chip}`}
                    style={{
                      top,
                      height: blockHeight,
                      right: `${col * (100 / cols)}%`,
                      width: `calc(${100 / cols}% - 2px)`,
                    }}
                    title={`${b.itemName} — ${b.customerName} (${b.timeStr})`}
                  >
                    <span className="block text-[10px] font-black tabular-nums" dir="ltr">
                      {fmtTime12(b.timeStr)}
                    </span>
                    <span className="block text-[10px] font-bold truncate">{b.customerName}</span>
                    {blockHeight > 46 && 100 / cols > 55 && (
                      <span className="block text-[9px] font-semibold truncate opacity-80">
                        {b.itemName}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* مؤشر الهوفر — السطر اللي الضغط عليه هيفتح الحجز عند نفس الدقيقة */}
              {hoverSlot && hoverSlot.day === dStr && (
                <div
                  className="absolute inset-x-0 z-10 pointer-events-none"
                  style={{ top: hoverSlot.y }}
                >
                  <div className="relative border-t-2 border-dashed border-indigo-400">
                    <span
                      className="absolute right-1 -top-[9px] bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                      dir="ltr"
                    >
                      {fmtTime12(minutesToTime(hoverSlot.minutes))}
                    </span>
                  </div>
                </div>
              )}

              {/* خط الوقت اللحظي */}
              {isToday && showNow && (
                <div
                  className="absolute inset-x-0 z-10 pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div className="relative border-t-2 border-slate-900">
                    <span className="absolute -right-1.5 -top-[5px] w-3 h-3 rounded-full bg-slate-900 shadow" />
                    <span
                      className="absolute right-3 -top-[9px] bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                      dir="ltr"
                    >
                      {fmtTime12(minutesToTime(nowMinutes))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * Week View — أعمدة الأيام السبعة على شبكة المواعيد
 * ============================================================ */
