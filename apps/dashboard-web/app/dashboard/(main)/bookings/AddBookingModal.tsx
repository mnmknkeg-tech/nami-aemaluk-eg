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

export function AddBookingModal({
  initialDate,
  initialTime,
  shopId,
  enabledActivities,
  onClose,
  onSuccess,
}: {
  initialDate: string;
  /** وقت مبدئي من الضغط على شبكة اليوم/الأسبوع — فاضي = الافتراضي بعد ٣٠ دقيقة */
  initialTime?: string;
  shopId?: string;
  /** الأنشطة المفعّلة من تخصيص التاجر — الشبكة تعرضها فقط وتختار الأول افتراضيًا */
  enabledActivities: ActivityType[];
  onClose: () => void;
  onSuccess: (b: BookingItem) => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>(enabledActivities[0] || 'general');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [bookingDate, setBookingDate] = useState(initialDate || formatDateKey(new Date()));
  // Walk-in default: ~30 minutes from now, rounded to 5 minutes — the
  // secretary usually registers a client standing right there.
  // أو الوقت اللي اتضغط عليه من شبكة اليوم/الأسبوع (initialTime)
  const [bookingTime, setBookingTime] = useState(
    () =>
      initialTime ||
      (() => {
        const d = new Date(Date.now() + 30 * 60000);
        d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })()
  );
  const [price, setPrice] = useState('200');
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // الحجز اليدوي حر: الاسم والخدمة بس المطلوبين — التليفون اختياري،
    // وأي تاريخ (قديم أو جديد) وأي وقت بيتسجلوا زي ما هما بدون قيود.
    if (!customerName.trim() || !itemName.trim()) {
      alert('يرجى كتابة اسم العميل واسم الخدمة/الحجز');
      return;
    }
    if (customerPhone.trim() && customerPhone.replace(/\D/g, '').length < 10) {
      alert('رقم الهاتف ناقص — أكمله صح أو سيبه فاضي');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shopId: shopId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        itemName: itemName.trim(),
        bookingDate,
        bookingTime,
        itemPrice: Number(price) || 0,
        participants: Number(participants) || 1,
        notes: notes.trim(),
        bookingActivityType: activityType,
        status: 'CONFIRMED',
        // علامة إدخال يدوي — بنطلب من الباكند تسجيل الموعد كما هو بالظبط
        // بدون إعادة جدولة أو فحص ازدحام (القيود للموقع العام مش لليدوي)
        metadata: { source: 'dashboard-manual', manual: true, exactSlot: true },
      };

      const res = await addBookingViaBackend(payload);

      // الحجز اليدوي بيتسجل على الموعد المطلوب بالظبط — الباكند مش بيحوّله
      // ولا بيأجّله حتى لو الفترة مزنوقة بالكامل (القيود للموقع العام بس).
      // عرض الوقت المطلوب نفسه فورًا؛ إعادة التحميل بعدها هتجيب القيمة
      // المعتمدة من السيرفر ولو اختلفة لأي سبب.
      const newBooking: BookingItem = {
        id: `int-${res.id || Date.now()}`,
        source: 'internal',
        status: 'CONFIRMED',
        activityType,
        itemName: payload.itemName,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        when: `${bookingDate}T${bookingTime}:00`,
        dateStr: bookingDate,
        timeStr: bookingTime,
        price: payload.itemPrice,
        participants: payload.participants,
        notes: payload.notes,
        raw: res,
      };

      onSuccess(newBooking);
    } catch (err: any) {
      alert(err?.message || 'تعذر إضافة الحجز');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-slate-700" />
            <h3 className="text-base font-extrabold text-slate-900">إضافة حجز يدوي جديد</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نوع النشاط */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              نوع الحجز / النشاط
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {enabledActivities.map((t) => {
                const act = ACTIVITY_META[t];
                const Icon = act.icon;
                const isSelected = activityType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-bold leading-tight">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* اسم الخدمة */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              اسم الخدمة أو الحجز *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="مثال: كشف أسنان، إقامة جناح قطط، طاولة 4 أفراد..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              required
            />
          </div>

          {/* بيانات العميل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم العميل *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="محمد أحمد"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                رقم الهاتف <span className="text-slate-400 font-medium">(اختياري)</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 text-right"
                dir="ltr"
              />
            </div>
          </div>

          {/* التاريخ والوقت — اليدوي حر تمامًا */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ الحجز</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                أي تاريخ — قديم أو جديد، من غير قيود
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">وقت الموعد</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                أي وقت — بيتسجل زي ما دخّلته بالظبط
              </p>
            </div>
          </div>

          {/* أوقات سريعة — نقرة واحدة بدل الكتابة */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              أوقات سريعة <span className="text-slate-400 font-medium">(اختيار بنقرة)</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
              {QUICK_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBookingTime(t)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                    bookingTime === t
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                  dir="ltr"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* السعر والعدد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">السعر (ج.م)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                عدد الأفراد / الحيوانات
              </label>
              <input
                type="number"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                min="1"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالحجز أو العميل..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              تأكيد وحفظ الحجز
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
 * Booking Detail & Actions Modal
 * ============================================================ */
