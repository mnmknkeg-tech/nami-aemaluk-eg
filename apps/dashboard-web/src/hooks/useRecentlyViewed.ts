'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { sidebarSections } from '@/config/sidebar';

/* ============================================================
 * آخر ما اطّلع عليه — تتبع حقيقي لآخر الصفحات اللي دخلها التاجر
 * يتم التسجيل تلقائياً من الـ layout عند كل تنقل، ويُخزَّن محلياً
 * (localStorage) لكل متصفح، مع استنتاج الاسم العربي من إعدادات
 * القوائم الجانبية (sidebarSections) حسب المسار.
 * ============================================================ */

const STORAGE_KEY = 'recently-viewed-v1';
const MAX_ITEMS = 8;

export type RecentlyViewedItem = {
  href: string;
  labelAr: string;
  visitedAt: number;
};

// خريطة مسار -> اسم عربي من القوائم الجانبية (مطابقة تامة أو بالبادئة)
const PATH_LABELS: { href: string; labelAr: string }[] = sidebarSections
  .flatMap((s) => s.items.map((it) => ({ href: it.href, labelAr: it.labelAr })))
  .sort((a, b) => b.href.length - a.href.length);

export function labelForPath(path: string): string {
  const exact = PATH_LABELS.find((p) => p.href === path);
  if (exact) return exact.labelAr;
  const prefix = PATH_LABELS.find((p) => path.startsWith(p.href + '/'));
  return prefix?.labelAr || 'الصفحة';
}

function readStore(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeStore(items: RecentlyViewedItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // التخزين المحلي غير متاح — تجاهل بهدوء
  }
}

/** يسجّل زيارة المسار الحالي في localStorage (يُستخدم داخل الـ layout) */
export function trackVisit(path: string) {
  // الرئيسية نفسها والخروج مش صفحات "اطّلع عليها"
  if (!path || path === '/dashboard' || path.startsWith('/login')) return;
  const current = readStore();
  const filtered = current.filter((it) => it.href !== path);
  const next = [{ href: path, labelAr: labelForPath(path), visitedAt: Date.now() }, ...filtered];
  writeStore(next);
  window.dispatchEvent(new Event('recently-viewed-updated'));
}

/** يرجّع قائمة آخر ما اطّلع عليه (حقيقية من تتبع الزيارات) */
export function useRecentlyViewed(): RecentlyViewedItem[] {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  const refresh = useCallback(() => setItems(readStore()), []);

  useEffect(() => {
    refresh();
    window.addEventListener('recently-viewed-updated', refresh);
    window.addEventListener('orders-updated', refresh);
    return () => {
      window.removeEventListener('recently-viewed-updated', refresh);
      window.removeEventListener('orders-updated', refresh);
    };
  }, [refresh]);

  return items;
}

/** كومبوننت خفي — يتعلّق في الـ layout ويسجّل كل تنقل */
export function RecentlyViewedTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackVisit(pathname);
  }, [pathname]);

  return null;
}
