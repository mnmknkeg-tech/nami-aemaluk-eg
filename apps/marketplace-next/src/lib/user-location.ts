'use client';

import { useEffect, useState } from 'react';
import { matchGovernorateName } from '@/lib/eg-geo';

/**
 * موقع المستخدم على مستوى التطبيق — بييجي من مصدرين بالترتيب:
 *
 * 1) تحديد دقيق من الخريطة (`mnmknk:user-location`) — من شيب الموقع أو
 *    محدد الموقع المحسّن في العناوين/الشيك أوت.
 * 2) اختيار المحافظة من شيب الهيدر (`mnmknk_location`) — بيتحول لمركز
 *    المحافظة من جدول الإحداثيات المحلي.
 *
 * وبيتخزن في المتصفح بس — مش محتاج تسجيل دخول — وبيستخدم في ترتيب
 * "الأقرب ليك" في الرئيسية وصفحات المتاجر.
 */

export interface ResolvedLocation {
  lat: number;
  lng: number;
  /** نص مختصر للعرض: حي/مدينة أو اسم المحافظة */
  label: string;
  /** التفصيل: دقيق من الخريطة ولا مركز محافظة */
  source: 'precise' | 'governorate';
}

const PRECISE_KEY = 'mnmknk:user-location';
const GOV_KEY = 'mnmknk_location';

type Listener = () => void;
const listeners = new Set<Listener>();

function readPrecise(): { lat: number; lng: number; label?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PRECISE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lng !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function readGovernorate(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(GOV_KEY) || null;
  } catch {
    return null;
  }
}

/** الموقع الفعلي المستخدم: الدقيق أولاً وإلا مركز المحافظة، أو null. */
export function getResolvedLocation(): ResolvedLocation | null {
  const precise = readPrecise();
  if (precise) {
    return {
      lat: precise.lat,
      lng: precise.lng,
      label: precise.label || readGovernorate() || 'موقعي',
      source: 'precise',
    };
  }
  const gov = readGovernorate();
  if (gov && gov !== 'داخل مصر') {
    const g = matchGovernorateName(gov);
    if (g) {
      return { lat: g.lat, lng: g.lng, label: gov, source: 'governorate' };
    }
  }
  return null;
}

export function notifyLocationChanged(): void {
  listeners.forEach((cb) => cb());
  // حدث DOM عام — أي مكوّن (مثل شيب الهيدر) يقدر يستمع له
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mnmknk-location-changed'));
  }
}

export function subscribeLocation(cb: Listener): () => void {
  listeners.add(cb);
  // الاستماع لتغيير التخزين من تابات تانية كمان
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', cb);
    };
  }
  return () => listeners.delete(cb);
}

/** حفظ موقع دقيق من الخريطة — وبيعمل إشعار لكل المستمعين. */
export function savePreciseLocation(loc: {
  lat: number;
  lng: number;
  label?: string;
  governorate?: string;
}): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRECISE_KEY, JSON.stringify({ ...loc, savedAt: Date.now() }));
    if (loc.governorate) window.localStorage.setItem(GOV_KEY, loc.governorate);
  } catch {}
  notifyLocationChanged();
}

export function clearPreciseLocation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PRECISE_KEY);
  } catch {}
  notifyLocationChanged();
}

/** React hook — الموقع الحالي مع تحديث فوري من أي مكوّن. */
export function useUserLocation(): ResolvedLocation | null {
  const [loc, setLoc] = useState<ResolvedLocation | null>(null);
  useEffect(() => {
    setLoc(getResolvedLocation());
    return subscribeLocation(() => setLoc(getResolvedLocation()));
  }, []);
  return loc;
}
