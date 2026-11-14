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

import { printBookingInvoice } from './printBookingInvoice';

const MotionDiv = motion.div as any;

export function BookingDetailModal({
  booking,
  shopName,
  onClose,
  onUpdateStatus,
}: {
  booking: BookingItem;
  /** اسم المتجر — يظهر في فاتورة الحجز المطبوعة */
  shopName?: string;
  onClose: () => void;
  onUpdateStatus: (b: BookingItem, status: UnifiedStatus) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const act = ACTIVITY_META[booking.activityType];
  const st = STATUS_META[booking.status];

  const handleStatus = async (status: UnifiedStatus) => {
    setUpdating(true);
    await onUpdateStatus(booking, status);
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${act.chip}`}>
              {act.label}
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[220px]">
              {booking.itemName}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => printBookingInvoice(booking, shopName || '')}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="طباعة الفاتورة"
            >
              <Printer size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Details */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">حالة الحجز:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}>
                {st.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">توقيت الموعد:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {booking.dateStr} الساعة {booking.timeStr}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">المصدر:</span>
              <span className="font-bold text-slate-700">
                {booking.source === 'website' ? 'من الموقع التجاري' : 'حجز داخلي'}
              </span>
            </div>
            {booking.price > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">القيمة الإجمالية:</span>
                <span className="font-black text-slate-900 tabular-nums">
                  {booking.price.toLocaleString('en-US')} ج.م
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">عدد الأفراد:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {booking.participants || 1}
              </span>
            </div>
            {String(booking.raw?.bookingNumber || '') && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">رقم الحجز:</span>
                <span className="font-bold text-slate-900 tabular-nums" dir="ltr">
                  {String(booking.raw?.bookingNumber)}
                </span>
              </div>
            )}
            {paymentLabel(booking.paymentStatus) && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">حالة الدفع:</span>
                <span className="font-bold text-slate-700">
                  {paymentLabel(booking.paymentStatus)}
                </span>
              </div>
            )}
          </div>

          {/* بيانات العميل */}
          <div className="p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="font-bold text-slate-800">بيانات العميل</div>
            <div className="flex justify-between text-slate-600">
              <span>الاسم:</span>
              <span className="font-bold text-slate-900">{booking.customerName}</span>
            </div>
            {booking.customerPhone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">رقم الهاتف:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${booking.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="مراسلة واتساب"
                  >
                    <MessageCircle size={14} />
                  </a>
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="p-1 rounded bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone size={14} />
                  </a>
                  <span className="font-bold text-slate-900 tabular-nums" dir="ltr">
                    {booking.customerPhone}
                  </span>
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="pt-2 border-t border-slate-50 text-slate-500">
                <span className="font-semibold text-slate-700 block mb-0.5">ملاحظات:</span>
                <p className="bg-slate-50 p-2 rounded-lg text-[11px]">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Change Status Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {booking.status !== 'CONFIRMED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('CONFIRMED')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                تأكيد
              </button>
            )}
            {booking.status !== 'COMPLETED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('COMPLETED')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                إتمام
              </button>
            )}
            {booking.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('CANCELLED')}
                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Root Export with Suspense
 * ============================================================ */
