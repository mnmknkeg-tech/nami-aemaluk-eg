// ميتاداتا ومساعدات واجهة الحجوزات المشتركة — مصدر واحد لصفحة الحجوزات
// وصفحة تفاصيل العميل (تاب الحجوزات) عشان الحالات والأنشطة والتوقيت
// تتعرض بنفس الشكل في كل مكان.

import { BedDouble, Briefcase, CalendarDays, Stethoscope, Utensils } from 'lucide-react';

export type UnifiedStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type ActivityType = 'clinic' | 'hotel' | 'table' | 'consultation' | 'general';

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; icon: any; chip: string; dot: string }
> = {
  clinic: {
    label: 'عيادة',
    icon: Stethoscope,
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  hotel: {
    label: 'فندقة',
    icon: BedDouble,
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  table: {
    label: 'طاولة',
    icon: Utensils,
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  consultation: {
    label: 'استشارة',
    icon: Briefcase,
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  general: {
    label: 'حجز عام',
    icon: CalendarDays,
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
};

export const ACTIVITY_ORDER: ActivityType[] = [
  'clinic',
  'hotel',
  'table',
  'consultation',
  'general',
];

export const STATUS_META: Record<UnifiedStatus, { label: string; chip: string }> = {
  PENDING: { label: 'بانتظار التأكيد', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'مؤكد', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'مكتمل', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'ملغي', chip: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'منتهي', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function normStatus(s: any): UnifiedStatus {
  const v = String(s || '').toUpperCase();
  if (v === 'CONFIRMED' || v === 'COMPLETED' || v === 'CANCELLED' || v === 'EXPIRED')
    return v as UnifiedStatus;
  return 'PENDING';
}

/** آخر 9 أرقام — 01xxxxxxxxx و20xxxxxxxxx يطابقوا نفس العميل */
export function normPhoneKey(p: string): string {
  const d = String(p || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : d;
}

/**
 * تحويل timestamp بمنطقة زمنية (UTC غالبًا) إلى تاريخ ووقت القاهرة الحقيقيين.
 * الباكند بيخزن startAt/startTime بصيغة ISO UTC، وslice الخام (11,16) كان
 * بيعرض وقت أوروبا — عشان كده الحجوزات كانت بتظهر 00:30 بدل 02:30 مثلًا.
 * النص اللي مكتوب فيه منطقة زمنية بس هو اللي بيتحول؛ التواريخ الخام تفضل زي ما هي.
 */
export function cairoPartsFromIso(iso: unknown): { date: string; time: string } | null {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  if (!/[zZ]$/.test(iso.trim()) && !/[+-]\d{2}:\d{2}$/.test(iso.trim())) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d);
    return { date, time };
  } catch {
    return null;
  }
}
