'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  Loader2,
  SearchCheck,
  Store,
  Users,
  BellRing,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';

/**
 * TrackBookingClient — تتبع الحجز برقمه (BK-…) بدون تسجيل دخول.
 * GET /bookings/public/lookup — وبتتحدث لوحدها كل 30 ثانية عشان العميل
 * يشوف ترتيبه في طابور الانتظار لايف، مع تنبيه صوتي واهتزاز لما دوره يقرّب.
 */

interface LookupResult {
  bookingNumber: string;
  status: string;
  serviceName?: string;
  shopName?: string;
  bookingDate?: string;
  bookingTime?: string;
  createdAt: string;
  /** ترتيب العميل في طابور الانتظار (لو الحجز بالانتظار مفعّل) */
  queuePosition?: number | null;
  /** اسم الطبيب المعيّن (اختياري) */
  doctorName?: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'بانتظار تأكيد العيادة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'مؤكد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'تم الحضور', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  CANCELLED: { label: 'ملغي', cls: 'bg-red-50 text-red-700 border-red-200' },
  NO_SHOW: { label: 'لم يتم الحضور', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const POLL_MS = 30_000;
/** التنبيه بيبدأ قبل الدور بكم دقيقة (نفس إعداد التاجر الافتراضي) */
const TURN_SOON_MINUTES = 30;

/** بيجرس نغمتين بسيطتين عبر WebAudio — محتاج تفاعل مستخدم سابق عشان المتصفح يسمح بيه */
function playTurnAlert() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    const t0 = ctx.currentTime;
    play(880, t0, 0.25);
    play(1174, t0 + 0.3, 0.35);
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
}

function TrackBookingInner() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState(() => searchParams.get('number') ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const alertedRef = useRef<string | null>(null);

  const lookup = useCallback(
    async (bookingNumber: string, customerPhone: string, silent = false) => {
      if (!bookingNumber.trim()) return setError('اكتب رقم الحجز (BK-…)');
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ number: bookingNumber.trim() });
        if (customerPhone.trim()) params.set('phone', customerPhone.trim());
        const res = await api.get<LookupResult>(`/bookings/public/lookup?${params.toString()}`, {
          revalidate: 0,
        });
        setResult((res as any)?.data ?? res ?? null);
        setLastSynced(new Date());
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'مفيش حجز بالرقم ده');
          setResult(null);
        }
        // في التحديث الصامت بنسيب النتيجة القديمة زي ما هي — الشبكة بتنقط وتيرجع
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const initial = searchParams.get('number');
    if (initial) lookup(initial, '');
  }, [searchParams, lookup]);

  // التحديث اللايف — كل 30 ثانية والنتيجة ظاهرة والحجز لسه شغال
  useEffect(() => {
    if (!result?.bookingNumber) return;
    const id = window.setInterval(() => {
      lookup(result.bookingNumber, phone, true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [result?.bookingNumber, phone, lookup]);

  const status = result ? (STATUS_LABELS[result.status] ?? STATUS_LABELS.PENDING) : null;
  const active = result && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(result.status);
  const queuePosition =
    result?.queuePosition != null && Number(result.queuePosition) > 0
      ? Number(result.queuePosition)
      : null;

  // تنبيه قرب الدور: إما الوقت المتبقي للموعد قرب، أو الترتيب في الطابور بقى من الأوائل
  const minutesToSlot = (() => {
    if (!result?.bookingDate || !result?.bookingTime) return null;
    const [y, m, d] = result.bookingDate.split('-').map(Number);
    const [hh, mm] = (result.bookingTime || '00:00').split(':').map(Number);
    if (!y || !m || !d) return null;
    const when = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).getTime();
    if (!Number.isFinite(when)) return null;
    return Math.round((when - Date.now()) / 60000);
  })();
  const turnSoon =
    !!active &&
    ((minutesToSlot != null && minutesToSlot >= 0 && minutesToSlot <= TURN_SOON_MINUTES) ||
      (queuePosition != null && queuePosition <= 2));

  // الصوت + الاهتزاز مرة واحدة لكل حالة دخول للتنبيه
  useEffect(() => {
    if (!turnSoon || !result?.bookingNumber) return;
    if (alertedRef.current === result.bookingNumber) return;
    alertedRef.current = result.bookingNumber;
    playTurnAlert();
    try {
      navigator.vibrate?.([300, 150, 300, 150, 500]);
    } catch {}
  }, [turnSoon, result?.bookingNumber]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 py-8 sm:py-14 px-4">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center space-y-2">
          <span className="mx-auto w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center">
            <SearchCheck className="w-6 h-6 text-brand-cyan" />
          </span>
          <h1 className="text-xl font-black text-slate-900">تتبع الحجز</h1>
          <p className="text-sm font-semibold text-slate-500">
            اكتب رقم الحجز اللي ظهرلك بعد التثبيت (BK-…)
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(number, phone);
          }}
          className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-3"
        >
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-cyan"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="رقم الحجز — BK-…"
            dir="ltr"
            autoComplete="off"
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-cyan"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الموبايل (اختياري — تحقق إضافي)"
            inputMode="tel"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-black text-white py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-slate-800 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SearchCheck className="w-4 h-4" />
            )}
            {loading ? 'بنبحث…' : 'تتبع الحجز'}
          </button>
          {error && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </form>

        {result && (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-3">
            {turnSoon && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center space-y-1.5 animate-pulse">
                <BellRing className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-base font-black text-amber-700">دورك قرّب — اتجه للعيادة</p>
                {minutesToSlot != null && minutesToSlot >= 0 && (
                  <p className="text-xs font-bold text-amber-600">
                    يتبقى حوالي {minutesToSlot} دقيقة
                  </p>
                )}
              </div>
            )}
            {status && (
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-black ${status.cls}`}
              >
                {status.label}
              </span>
            )}
            <p className="font-black text-slate-900 text-lg" dir="ltr">
              {result.bookingNumber}
            </p>
            {queuePosition != null && active && (
              <div className="rounded-2xl border-2 border-brand-cyan/30 bg-brand-cyan/5 p-4 text-center">
                <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  ترتيبك في طابور الانتظار
                </p>
                <p className="font-black text-4xl text-brand-cyan leading-none mt-1">
                  {queuePosition}
                </p>
                <p className="text-xs font-bold text-slate-600 mt-1.5">
                  فيه <span className="text-brand-cyan">{queuePosition - 1}</span> قدامك
                </p>
              </div>
            )}
            <div className="space-y-1.5 text-sm font-semibold text-slate-600">
              {result.shopName && (
                <p className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  {result.shopName}
                </p>
              )}
              {result.serviceName && <p>{result.serviceName}</p>}
              {result.doctorName && <p>الطبيب: {result.doctorName}</p>}
              {result.bookingDate && (
                <p className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="ltr">
                    {result.bookingDate} · {result.bookingTime || 'طابور اليوم'}
                  </span>
                </p>
              )}
            </div>
            {active && (
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Clock className="w-3 h-3" />
                الصفحة بتتحدث لوحدها كل 30 ثانية
                {lastSynced ? ` — آخر تحديث ${lastSynced.toLocaleTimeString('ar-EG')}` : ''}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs font-bold text-slate-400">
          لو المعادلة اتغيرت أو عايز تعدّل الموعد — كلّم المتجر مباشرة.
        </p>
        <div className="text-center">
          <Link href="/" className="text-xs font-black text-brand-cyan hover:underline">
            الرجوع للسوق
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TrackBookingClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
        </div>
      }
    >
      <TrackBookingInner />
    </Suspense>
  );
}
