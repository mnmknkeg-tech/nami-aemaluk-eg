'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Clock, Loader2, SearchCheck, Store, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * TrackBookingClient — تتبع الحجز برقمه (BK-…) بدون تسجيل دخول.
 * GET /bookings/public/lookup — العميل بيفقد الرقم بسرعة لو مش قادر يتابع.
 */

interface LookupResult {
  bookingNumber: string;
  status: string;
  serviceName?: string;
  shopName?: string;
  bookingDate?: string;
  bookingTime?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'بانتظار تأكيد العيادة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'مؤكد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'تم الحضور', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  CANCELLED: { label: 'ملغي', cls: 'bg-red-50 text-red-700 border-red-200' },
  NO_SHOW: { label: 'لم يتم الحضور', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function TrackBookingInner() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState(() => searchParams.get('number') ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const lookup = useCallback(async (bookingNumber: string, customerPhone: string) => {
    if (!bookingNumber.trim()) return setError('اكتب رقم الحجز (BK-…)');
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ number: bookingNumber.trim() });
      if (customerPhone.trim()) params.set('phone', customerPhone.trim());
      const res = await api.get<LookupResult>(`/bookings/public/lookup?${params.toString()}`, {
        revalidate: 0,
      });
      setResult((res as any)?.data ?? res ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مفيش حجز بالرقم ده');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = searchParams.get('number');
    if (initial) lookup(initial, '');
  }, [searchParams, lookup]);

  const status = result ? (STATUS_LABELS[result.status] ?? STATUS_LABELS.PENDING) : null;

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
            <div className="space-y-1.5 text-sm font-semibold text-slate-600">
              {result.shopName && (
                <p className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  {result.shopName}
                </p>
              )}
              {result.serviceName && <p>{result.serviceName}</p>}
              {result.bookingDate && (
                <p className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="ltr">
                    {result.bookingDate} · {result.bookingTime}
                  </span>
                </p>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-400">
              آخر تحديث: {new Date(result.createdAt).toLocaleString('ar-EG')}
            </p>
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
