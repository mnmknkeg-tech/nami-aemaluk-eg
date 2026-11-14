/** Shared types, constants, and pure helpers for the bookings page and its sub-components. */
import { useState, useEffect } from 'react';
import { format as dfFormat, parse as dfParse } from 'date-fns';
import { apiRequest } from '@/lib/auth';
import { normPhoneKey, type ActivityType, type UnifiedStatus } from '@/lib/bookings/ui';

export type ViewMode = 'month' | 'week' | 'day' | 'year' | 'table' | 'agenda';

export type BookingItem = {
  id: string;
  source: 'website' | 'internal';
  status: UnifiedStatus;
  activityType: ActivityType;
  itemName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  when: string;
  dateStr: string;
  timeStr: string;
  price: number;
  participants: number;
  paymentStatus?: string;
  notes?: string;
  queuePosition?: number;
  doctorName?: string;
  raw?: any;
};

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const WEEK_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inferActivityType(raw: any): ActivityType {
  const t = String(
    raw?.bookingActivityType || raw?.metadata?.bookingActivityType || raw?.type || ''
  ).toLowerCase();
  const name = String(raw?.itemName || raw?.serviceName || '').toLowerCase();
  if (
    t.includes('clinic') ||
    name.includes('عيادة') ||
    name.includes('دكتور') ||
    name.includes('كشف') ||
    name.includes('طبيب')
  )
    return 'clinic';
  if (
    t.includes('hotel') ||
    t.includes('boarding') ||
    name.includes('فندق') ||
    name.includes('إيواء') ||
    name.includes('استضافة')
  )
    return 'hotel';
  if (
    t.includes('table') ||
    t.includes('restaurant') ||
    name.includes('طاولة') ||
    name.includes('مطعم') ||
    name.includes('عشاء') ||
    name.includes('غداء')
  )
    return 'table';
  if (t.includes('consult') || name.includes('استشارة') || name.includes('جلسة'))
    return 'consultation';
  return 'general';
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatDateKey(d: Date): string {
  return dfFormat(d, 'yyyy-MM-dd');
}

export function parseDateKey(s: string): Date {
  return dfParse(s, 'yyyy-MM-dd', new Date());
}

export function timeToMinutes(t: string): number {
  const [h, m] = String(t || '').split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

export function minutesToTime(min: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function fmtTime12(hhmm: string): string {
  const min = timeToMinutes(hhmm);
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 || 12;
  return `${h}:${String(min % 60).padStart(2, '0')} ${h24 < 12 ? 'ص' : 'م'}`;
}

export function paymentLabel(ps?: string): string {
  const v = String(ps || '').trim();
  if (!v) return '';
  const u = v.toUpperCase();
  if (u === 'PAID') return 'مدفوع';
  if (u === 'UNPAID') return 'غير مدفوع';
  if (u.includes('DEPOSIT')) return 'عربون محجوز';
  return v;
}

export function normNameKey(n: string): string {
  return String(n || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/* ============================================================
 * عملاء الحجوزات → صفحة العملاء (من الموقع أو اليدوي)
 * ============================================================ */

const syncedCustomerKeys = new Set<string>();
let bookingCustomersCache: { at: number; phones: Set<string>; names: Set<string> } | null = null;

export async function ensureBookingCustomers(shopId: string, items: BookingItem[]): Promise<void> {
  if (!shopId) return;
  const candidates = new Map<string, { name: string; phone: string; src: string }>();
  for (const b of items) {
    const name = (b.customerName || '').trim();
    if (!name || name === 'عميل') continue;
    const phone = (b.customerPhone || '').trim();
    const key = phone ? `p:${normPhoneKey(phone)}` : `n:${normNameKey(name)}`;
    if (syncedCustomerKeys.has(key) || candidates.has(key)) continue;
    candidates.set(key, { name, phone, src: b.source });
  }
  if (candidates.size === 0) return;

  try {
    if (!bookingCustomersCache || Date.now() - bookingCustomersCache.at > 5 * 60000) {
      const res = await apiRequest<any>(`/shops/${shopId}/customers?limit=500`);
      const list = Array.isArray(res)
        ? res
        : res?.data?.customers || res?.data || res?.customers || [];
      const phones = new Set<string>();
      const names = new Set<string>();
      (Array.isArray(list) ? list : []).forEach((c: any) => {
        if (c?.phone) phones.add(normPhoneKey(String(c.phone)));
        if (c?.name) names.add(normNameKey(String(c.name)));
      });
      bookingCustomersCache = { at: Date.now(), phones, names };
    }

    for (const [key, c] of candidates) {
      syncedCustomerKeys.add(key);
      const exists = c.phone
        ? bookingCustomersCache.phones.has(normPhoneKey(c.phone))
        : bookingCustomersCache.names.has(normNameKey(c.name));
      if (exists) continue;
      apiRequest(`/shops/${shopId}/customers`, {
        method: 'POST',
        body: JSON.stringify({
          name: c.name,
          ...(c.phone ? { phone: c.phone } : {}),
          source: 'bookings',
          notes:
            c.src === 'website' ? 'اتضاف تلقائيًا من حجز على الموقع' : 'اتضاف تلقائيًا من حجز يدوي',
        }),
      })
        .then((res: any) => {
          if (res?.raw?.created !== false && c.phone) {
            bookingCustomersCache?.phones.add(normPhoneKey(c.phone));
          }
        })
        .catch(() => {});
    }
  } catch {}
}

export function useNow(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export type GridBlock = { b: BookingItem; start: number; end: number; col: number; cols: number };

export function layoutGridBlocks(items: BookingItem[]): GridBlock[] {
  const intervals = items
    .map((b) => ({
      b,
      start: timeToMinutes(b.timeStr),
      end: timeToMinutes(b.timeStr) + BLOCK_MINUTES,
    }))
    .sort((x, y) => x.start - y.start || x.end - y.end);
  const colEnds: number[] = [];
  const placed = intervals.map((it) => {
    let col = colEnds.findIndex((end) => end <= it.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(it.end);
    } else {
      colEnds[col] = it.end;
    }
    return { ...it, col };
  });
  const cols = Math.max(1, colEnds.length);
  return placed.map((p) => ({ ...p, cols }));
}

export const QUICK_TIMES: string[] = Array.from({ length: 30 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export function waMeLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export const PX_PER_HOUR = 64;
export const GRID_START_HOUR = 8;
export const GRID_END_HOUR = 24;
export const BLOCK_MINUTES = 60;
export const WEEK_DAYS_SHORT = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
