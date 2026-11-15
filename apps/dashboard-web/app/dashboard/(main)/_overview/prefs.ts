'use client';

import type { OverviewPrefs } from './types';

/* ============================================================
 * تخصيص النظرة العامة — إظهار/إخفاء كل قسم على حدة
 * ============================================================ */

/* ============================================================
 * تخصيص النظرة العامة — إظهار/إخفاء كل قسم على حدة
 * ============================================================ */

/** كل أقسام الصفحة القابلة للتخصيص — بالترتيب نفسه اللي بتظهر بيه في اللوحة */
export const OVERVIEW_SECTIONS: { id: string; label: string }[] = [
  { id: 'recent', label: 'آخر ما اطّلع عليه' },
  { id: 'performance', label: 'أداء المتجر (الرسم البياني)' },
  { id: 'kpi:Revenue', label: 'مؤشر الإيرادات الإجمالية' },
  { id: 'kpi:Orders', label: 'مؤشر الطلبات' },
  { id: 'kpi:Bookings', label: 'مؤشر الحجوزات والمواعيد' },
  { id: 'kpi:Customers', label: 'مؤشر العملاء' },
  { id: 'kpi:Views', label: 'مؤشر زوار المتجر' },
  { id: 'activity', label: 'أحدث الطلبات والحجوزات' },
  { id: 'shopStats', label: 'التقييم والمتابعون' },
  { id: 'quickActions', label: 'الإجراءات السريعة' },
  { id: 'notifications', label: 'آخر الإشعارات' },
  { id: 'sessions', label: 'آخر جلسات الدخول' },
  { id: 'distribution', label: 'توزيع الطلبات' },
  { id: 'topProducts', label: 'الأكثر مبيعًا' },
];

const overviewPrefsKey = (userKey: string) => `ray_overview_sections_v1:${userKey}`;

export function readOverviewPrefs(userKey: string): OverviewPrefs {
  try {
    const raw = localStorage.getItem(overviewPrefsKey(userKey));
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [],
      forced: Array.isArray(parsed?.forced) ? parsed.forced : [],
    };
  } catch {
    return { hidden: [], forced: [] };
  }
}

export function writeOverviewPrefs(userKey: string, p: OverviewPrefs) {
  try {
    localStorage.setItem(overviewPrefsKey(userKey), JSON.stringify(p));
  } catch {}
}
