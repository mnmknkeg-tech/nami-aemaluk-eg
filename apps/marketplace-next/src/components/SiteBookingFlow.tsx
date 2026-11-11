'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Loader2,
  MessageCircle,
  Phone,
  SearchCheck,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { buildWhatsAppLink } from '@ray-eg/shared/builder';
import { cn } from '@/lib/utils';

/**
 * SiteBookingFlow — تدفّق الحجز الحقيقي على الموقع المنشور.
 *
 * بيجيب الخدمات القابلة للحجز من GET /bookings/public/services، والمواعيد
 * المتاحة فعلاً من GET /bookings/public/slots (بتوقيت القاهرة)، وبيثبّت الحجز
 * بـ POST /bookings/guest — نفس مسار الحجز الضيف في الباك إند.
 */

export interface PublicBookingService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  capacity: number;
  productId?: string;
}

export interface PublicBookingSettings {
  workStart: string;
  workEnd: string;
  slotDuration: number;
  advanceDays: number;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface BookingResult {
  bookingNumber?: string;
  id?: string;
}

const SERVICE_DAYS = 14;

function dayChip(date: Date): {
  value: string;
  dayName: string;
  dayNum: number;
  monthName: string;
} {
  const value = date.toISOString().slice(0, 10);
  return {
    value,
    dayName: date.toLocaleDateString('ar-EG', { weekday: 'short' }),
    dayNum: date.getDate(),
    monthName: date.toLocaleDateString('ar-EG', { month: 'short' }),
  };
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SiteBookingFlow({
  slug,
  shopId,
  shopName,
  shopPhone,
  services,
  settings,
  initialServiceId,
}: {
  slug: string;
  shopId: string;
  shopName: string;
  shopPhone?: string;
  services: PublicBookingService[];
  settings: PublicBookingSettings;
  initialServiceId?: string;
}) {
  const days = useMemo(() => {
    const advance = Math.min(Math.max(settings.advanceDays || 14, 1), 90);
    const count = Math.min(advance, SERVICE_DAYS);
    return Array.from({ length: count }, (_, i) =>
      dayChip(new Date(Date.now() + (i + 1) * 86400000))
    );
  }, [settings.advanceDays]);

  const [serviceId, setServiceId] = useState<string | undefined>(() => {
    // The ?service= ref can be a booking service id OR the backing catalog
    // product id (product cards link by product id).
    const ref = initialServiceId;
    if (ref && services.some((s) => s.id === ref || s.productId === ref)) return ref;
    return services.length === 1 ? services[0].id : undefined;
  });
  const [date, setDate] = useState<string>(days[0]?.value ?? todayPlus(1));
  const [time, setTime] = useState<string>('');
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [copied, setCopied] = useState(false);

  const service = services.find((s) => s.id === serviceId || s.productId === serviceId);

  const loadSlots = useCallback(async () => {
    if (!service?.id || !date) {
      setSlots(null);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await api.get<AvailableSlot[]>(
        `/bookings/public/slots?serviceId=${encodeURIComponent(service.id)}&date=${date}`,
        { revalidate: 0 }
      );
      const list = (res as any)?.data ?? res;
      setSlots(Array.isArray(list) ? list : []);
      setTime('');
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [service?.id, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const availableSlots = (slots ?? []).filter((s) => s.available);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!service) return setError('اختار الخدمة الأول');
    if (!time) return setError('اختار الوقت المناسب من المواعيد المتاحة');
    if (name.trim().length < 2) return setError('اكتب اسمك من فضلك');
    if (phone.replace(/\D/g, '').length < 10) return setError('رقم الموبايل مش مظبوط');

    setSubmitting(true);
    try {
      const res = await api.post<BookingResult>('/bookings/guest', {
        shopId,
        itemId: service.productId || undefined,
        itemName: service.name,
        itemPrice: service.price || 0,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        notes: notes.trim() || undefined,
        serviceId: service.id,
        bookingDate: date,
        bookingTime: time,
        bookingActivityType: 'APPOINTMENT',
        metadata: { source: 'site-booking-page', siteSlug: slug },
      });
      setResult((res as any)?.data ?? res ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مش قادرين نثبّت الحجز دلوقتي، جرّب تاني');
    } finally {
      setSubmitting(false);
    }
  };

  const waLink = shopPhone
    ? buildWhatsAppLink(
        shopPhone,
        `مرحبًا، عندي حجز برقم ${result?.bookingNumber ?? ''} في ${shopName}`
      )
    : null;

  if (result) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 text-center space-y-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
        <div>
          <p className="text-lg font-black text-slate-900">تم تثبيت طلب حجزك</p>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {service?.name} — {date}
            {time ? ` · ${time}` : ''}
          </p>
        </div>
        {result.bookingNumber && (
          <div className="mx-auto max-w-xs rounded-2xl bg-white border border-emerald-200 p-4">
            <p className="text-[11px] font-bold text-slate-400 mb-1">احتفظ برقم الحجز</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-black text-xl text-slate-900 tracking-wide" dir="ltr">
                {result.bookingNumber}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.bookingNumber || '');
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  } catch {}
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                aria-label="نسخ رقم الحجز"
                title="نسخ رقم الحجز"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {copied && <p className="text-[10px] font-bold text-emerald-600 mt-1">تم النسخ</p>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
          <Link
            href={`/bookings/track?number=${encodeURIComponent(result.bookingNumber || '')}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3 font-black text-sm hover:bg-slate-800"
          >
            <SearchCheck className="w-4 h-4" />
            تتبع حالة الحجز
          </Link>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white py-3 font-black text-sm hover:bg-emerald-600"
            >
              <MessageCircle className="w-4 h-4" />
              تأكيد عبر واتساب
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setName('');
            setPhone('');
            setNotes('');
            setTime('');
          }}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4"
        >
          حجز موعد آخر
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* اختيار الخدمة */}
      <section>
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
          <CalendarCheck className="w-4 h-4 text-brand-cyan" />
          1. اختار الخدمة
        </h2>
        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-600">
              مفيش خدمات حجز متاحة منشورة حالياً — تواصل مع {shopName} مباشرة
            </p>
            {waLink && (
              <a
                href={
                  buildWhatsAppLink(shopPhone!, `مرحبًا، أريد الاستفسار عن خدمات ${shopName}`) ||
                  '#'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-4 py-2.5 text-sm font-black hover:bg-emerald-600"
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const active = svc.id === serviceId;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setServiceId(svc.id)}
                  className={cn(
                    'text-right p-4 rounded-2xl border transition-all space-y-1.5',
                    active
                      ? 'border-brand-cyan bg-brand-cyan/5 ring-2 ring-brand-cyan/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-sm text-slate-900">{svc.name}</span>
                    {svc.price > 0 && (
                      <span className="font-black text-sm text-brand-cyan shrink-0">
                        {formatPrice(svc.price)}
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-xs font-semibold text-slate-500 line-clamp-2">
                      {svc.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                    {svc.durationMinutes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {svc.durationMinutes} دقيقة
                      </span>
                    )}
                    {svc.capacity > 1 && <span>حتى {svc.capacity} أفراد</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* اختيار اليوم */}
      {service && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
            <CalendarDays className="w-4 h-4 text-brand-cyan" />
            2. اختار اليوم
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {days.map((d) => {
              const active = d.value === date;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDate(d.value)}
                  className={cn(
                    'shrink-0 snap-start w-[68px] rounded-2xl border py-2.5 flex flex-col items-center gap-0.5 transition-all',
                    active
                      ? 'border-brand-cyan bg-brand-cyan text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-bold',
                      active ? 'text-white/80' : 'text-slate-400'
                    )}
                  >
                    {d.dayName}
                  </span>
                  <span className="text-lg font-black leading-none">{d.dayNum}</span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold',
                      active ? 'text-white/80' : 'text-slate-400'
                    )}
                  >
                    {d.monthName}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* اختيار الوقت */}
      {service && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
            <Clock className="w-4 h-4 text-brand-cyan" />
            3. المواعيد المتاحة ({settings.workStart}–{settings.workEnd})
          </h2>
          {slotsLoading ? (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              بنجيب المواعيد المتاحة…
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm font-bold text-slate-500">
              مفيش مواعيد متاحة في اليوم ده — جرّب يوم تاني.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableSlots.map((s) => {
                const active = s.startTime === time;
                return (
                  <button
                    key={s.startTime}
                    type="button"
                    onClick={() => setTime(s.startTime)}
                    className={cn(
                      'py-2.5 rounded-xl border text-sm font-black transition-all',
                      active
                        ? 'border-brand-cyan bg-brand-cyan text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-cyan hover:text-brand-cyan'
                    )}
                    dir="ltr"
                  >
                    {s.startTime}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* بيانات الحاجز */}
      {service && time && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <User className="w-4 h-4 text-brand-cyan" />
            4. بياناتك
          </h2>
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
          >
            <div className="rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 px-3.5 py-2.5 text-xs font-bold text-slate-600 flex items-center justify-between">
              <span>{service.name}</span>
              <span dir="ltr">
                {date} · {time}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-cyan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم بالكامل"
                autoComplete="name"
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-cyan"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
              />
            </div>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-cyan min-h-[64px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات (اختياري) — مثال: زيارة أولى، عندي حساسية…"
              rows={2}
            />
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-black text-white py-3.5 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-slate-800 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {submitting ? 'بنثبّت الحجز…' : 'تثبيت الحجز'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
