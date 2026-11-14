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

export function QueueTodayPanel({
  items,
  onStatusChange,
}: {
  items: BookingItem[];
  onStatusChange: (backendId: string, status: string) => void | Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const setStatus = async (item: BookingItem, status: string) => {
    const backendId = item.id.startsWith('web-') ? item.id.slice(4) : item.id;
    setBusyId(item.id);
    try {
      await onStatusChange(backendId, status);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-amber-600" />
          <span className="text-sm font-extrabold text-amber-800">
            طابور اليوم — الحجز بالانتظار ({items.length})
          </span>
        </div>
        <span className="text-[10px] font-bold text-amber-500">
          مرتبين بالترتيب — اللي عليه الدور الأول معلّم
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => {
          const isNext = idx === 0;
          const busy = busyId === item.id;
          const waText = `مرحبًا ${item.customerName}، دورك قرّب في طابور الانتظار — نرجو التوجه إلينا خلال 30 دقيقة تقريبًا.${
            item.raw?.bookingNumber ? ` رقم حجزك: ${item.raw.bookingNumber}.` : ''
          }`;
          const waHref = item.customerPhone ? waMeLink(item.customerPhone, waText) : null;
          return (
            <div
              key={item.id}
              className={`flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 ${
                isNext ? 'bg-amber-50/60' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                  isNext ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}
                title="ترتيب في الطابور"
              >
                <span className="text-sm font-black leading-none">{item.queuePosition}</span>
                <span className="text-[8px] font-bold opacity-80">
                  {isNext ? 'الدور عليه' : 'في الانتظار'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {item.customerName}
                  {item.doctorName && (
                    <span className="inline-flex items-center gap-1 mr-2 text-[10px] font-bold text-cyan-600">
                      <Stethoscope size={11} />
                      {item.doctorName}
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {item.itemName}
                  {item.raw?.bookingNumber ? ` · ${item.raw.bookingNumber}` : ''}
                  {item.notes ? ` · ${item.notes}` : ''}
                </p>
              </div>
              {item.customerPhone && (
                <a
                  href={`tel:${item.customerPhone}`}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                  title={`اتصال ${item.customerName}`}
                >
                  <Phone size={14} />
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-extrabold flex items-center gap-1.5 shrink-0"
                  title="إشعار العميل إن دوره قرّب عبر واتساب"
                >
                  <MessageCircle size={13} />
                  إشعار العميل
                </a>
              )}
              {item.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus(item, 'CONFIRMED')}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                >
                  {busy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  بدأ الدور
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(item, 'COMPLETED')}
                className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-extrabold flex items-center gap-1.5 disabled:opacity-60 shrink-0"
              >
                <CheckCircle2 size={12} />
                تم
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * طباعة فاتورة الحجز — إيصال RTL جاهز للطباعة يُفتح في iframe
 * مخفي ويُرسل للطابعة مباشرة (بدون صفحات منبثقة يحجبها المتصفح).
 * ============================================================ */
