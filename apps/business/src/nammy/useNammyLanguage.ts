'use client';

import { useCallback, useEffect, useState } from 'react';
import { Language } from './types';

const STORAGE_KEY = 'nammy-lang';

/**
 * لغة واجهة «نمّي أعمالك».
 *
 * في مشروع Vite كانت اللغة حالة (useState) داخل App.tsx وحسب.
 * بعد التحويل لـ Next.js الصفحات أصبحت روابط منفصلة، فحفظنا اللغة في localStorage
 * عشان تفضل محفوظة بين الصفحات، مع نفس تأثير المصدَر بالضبط:
 * مزامنة document.dir و document.lang مع اللغة المختارة.
 */
export function useNammyLanguage() {
  const [lang, setLang] = useState<Language>('ar');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ar') setLang(stored);
    } catch {
      /* localStorage غير متاح (تصفح خاص) — نبقى على العربية */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* تجاهل */
    }
  }, [lang]);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  return { lang, setLang, toggleLanguage, isAr: lang === 'ar' };
}
