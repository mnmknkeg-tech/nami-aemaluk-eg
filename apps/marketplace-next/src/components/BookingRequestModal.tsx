'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { resolveProductImage } from '@/lib/product-image';
import type { Product } from '@/lib/services';
import type { CommerceDecision } from '@/lib/commerce';
import { cn } from '@/lib/utils';

type BookingResult = {
  bookingNumber?: string;
  queuePosition?: number | null;
  id?: string;
};

interface PublicBookingService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  productId?: string;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-cyan';

/**
 * نافذة الحجز / طلب عرض السعر.
 * بتجيب المواعيد المتاحة فعلاً من GET /bookings/public/slots لما المنتج
 * يكون قابل للحجز (لخدمة مرتبطة بيه في booking_services) — بتوقيت القاهرة.
 * ولو مفيش خدمة مربوطة، بيقع لنفس مسار النص الحر القديم،
 * وبيثبّت الحجز بـ POST /bookings/guest — بيوصّل التاجر في لوحته فوراً.
 */
export function BookingRequestModal({
  open,
  onClose,
  decision,
  shopId,
  shopName,
  product,
  shopSlug,
}: {
  open: boolean;
  onClose: () => void;
  decision: CommerceDecision;
  shopId: string;
  shopName?: string;
  product?: Product;
  shopSlug?: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => todayPlus(1));
  const [time, setTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [linkedService, setLinkedService] = useState<PublicBookingService | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const isAppointment = decision.booking === 'appointment';

  // المنتج القابل للحجز بيرتبط بخدمة حجز حقيقية — بنجيبها مرة واحدة لما المودال يفتح.
  useEffect(() => {
    if (!open || !isAppointment || !shopSlug || !product?.id) {
      setLinkedService(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<any>(
          `/bookings/public/services?slug=${encodeURIComponent(shopSlug)}&productId=${encodeURIComponent(product.id)}`,
          { revalidate: 0 }
        );
        if (cancelled) return;
        const services: PublicBookingService[] = (res as any)?.data?.services ?? [];
        const match =
          services.find((s) => s.productId === product.id) ??
          (services.length === 1 ? services[0] : null);
        setLinkedService(match);
      } catch {
        if (!cancelled) setLinkedService(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAppointment, shopSlug, product?.id]);

  // المواعيد المتاحة فعلاً لليوم المختار (بتوقيت القاهرة من الخادم).
  const loadSlots = useCallback(async () => {
    if (!linkedService?.id || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await api.get<AvailableSlot[]>(
        `/bookings/public/slots?serviceId=${encodeURIComponent(linkedService.id)}&date=${date}`,
        { revalidate: 0 }
      );
      const list = (res as any)?.data ?? res;
      setSlots(Array.isArray(list) ? list.filter((s: AvailableSlot) => s.available) : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [linkedService?.id, date]);

  useEffect(() => {
    if (open && linkedService) loadSlots();
  }, [open, linkedService, loadSlots]);

  useEffect(() => {
    if (open) return;
    setResult(null);
    setError(null);
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const image = product ? resolveProductImage(product) : undefined;
  const useRealSlots = Boolean(linkedService) && isAppointment;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    if (name.trim().length < 2) return setError('اكتب اسمك من فضلك');
    if (phone.replace(/\D/g, '').length < 10) return setError('رقم الموبايل مش مظبوط');
    if (useRealSlots && !time) return setError('اختار الموعد المتاح');

    setSubmitting(true);
    try {
      const res = await api.post<BookingResult>('/bookings/guest', {
        shopId,
        itemId: product?.id,
        itemName: linkedService?.name ?? product?.name ?? shopName,
        itemImage: image,
        itemPrice: linkedService?.price ?? product?.price ?? 0,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        notes: notes.trim() || undefined,
        serviceId: linkedService?.id || undefined,
        bookingActivityType: isAppointment ? 'APPOINTMENT' : 'QUOTE',
        bookingDate: isAppointment ? date : undefined,
        bookingTime: isAppointment ? time : undefined,
        metadata: {
          source: 'marketplace',
          windowHours: decision.bookingWindowHours,
          queueEnabled: decision.queueEnabled,
        },
      });
      setResult((res as any)?.data ?? res ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مش قادرين نبعث الطلب دلوقتي، جرّب تاني');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (!submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-brand-cyan" />
            </span>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                {decision.ctaLabel}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {shopName ?? product?.name ?? 'المتجر'}
                {!isAppointment && ` · يرد خلال ${decision.bookingWindowHours} ساعة`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-black text-slate-900 dark:text-white mb-1">تم إرسال طلبك</p>
            {result.bookingNumber && (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                رقم الحجز: <span className="text-brand-cyan">{result.bookingNumber}</span>
              </p>
            )}
            {result.queuePosition != null && result.queuePosition > 0 && (
              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                ترتيبك {result.queuePosition} — فيه {result.queuePosition - 1} قدامك
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-brand-black text-white py-3 font-black text-sm"
            >
              تمام
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                الاسم
              </label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك بالكامل"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                رقم الموبايل
              </label>
              <input
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
              />
            </div>

            {isAppointment && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                    اليوم
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={date}
                    min={todayPlus(0)}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                    الوقت
                  </label>
                  {useRealSlots ? (
                    slotsLoading ? (
                      <div className={cn(inputClass, 'flex items-center gap-2 text-slate-400')}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        بنجيب المواعيد…
                      </div>
                    ) : slots.length > 0 ? (
                      <select
                        className={inputClass}
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      >
                        <option value="">اختار الموعد</option>
                        {slots.map((s) => (
                          <option key={s.startTime} value={s.startTime}>
                            {s.startTime} – {s.endTime}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-500">
                        مفيش مواعيد متاحة في اليوم ده
                      </div>
                    )
                  ) : (
                    <input
                      type="time"
                      className={inputClass}
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            {useRealSlots && slots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {slots.slice(0, 12).map((s) => {
                  const active = s.startTime === time;
                  return (
                    <button
                      key={s.startTime}
                      type="button"
                      onClick={() => setTime(s.startTime)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-black border transition-all',
                        active
                          ? 'border-brand-cyan bg-brand-cyan text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-cyan'
                      )}
                      dir="ltr"
                    >
                      {s.startTime}
                    </button>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5">
                ملاحظة (اختياري)
              </label>
              <textarea
                className={cn(inputClass, 'min-h-[70px] resize-none')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي تفاصيل تحب تخبرها للمتجر"
                rows={2}
              />
            </div>

            {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-black text-white py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'بنبعث…' : decision.ctaLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
