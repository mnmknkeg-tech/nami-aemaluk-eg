'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Globe } from 'lucide-react';
import { Language } from '@/nammy/types';
import { TRANSLATIONS } from '@/nammy/translations';
import { AUTH_ROUTES } from '@/nammy/routes';

interface DesktopHeaderProps {
  lang: Language;
  onToggleLanguage: () => void;
}

/**
 * نفس DesktopHeader الأصلي حرفيًا، مع تعديلين فقط:
 * 1) زر «تسجيل الدخول» كان يفتح LoginModal وهمي → بقى Link حقيقي لـ /login.
 * 2) زر «ابدأ مجانًا» كان يفتح LeadModal وهمي → بقى Link حقيقي لـ /signup.
 *
 * اللوجو والاسم: نفس لوجو المنصة في المشروع الأساسي (public/brand/logo-business.png)
 * ونفس الاسم «نمّي أعمالك» — ما بيتترجمش للإنجليزي.
 */
export function DesktopHeader({ lang, onToggleLanguage }: DesktopHeaderProps) {
  const t = TRANSLATIONS[lang];

  return (
    <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between z-30 select-none">
      {/* اللوجو + الاسم */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/85 border border-white/90 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
          <Image
            src="/brand/logo-business.png"
            alt={t.brandName}
            fill
            sizes="40px"
            className="object-contain"
          />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{t.brandName}</span>
          <span className="text-[10px] font-bold text-slate-500">{t.tagline}</span>
        </span>
      </Link>

      {/* Action Pills & Icon-Only Language Switcher */}
      <div className="flex items-center gap-2 sm:gap-2.5 ms-auto">
        <button
          onClick={onToggleLanguage}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-indigo-600 border border-white/90 shadow-2xs hover:shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
          title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
          aria-label={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
        >
          <Globe size={16} strokeWidth={2.1} className="text-indigo-600" />
        </button>

        <Link
          href={AUTH_ROUTES.login}
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/85 hover:bg-white text-slate-800 text-xs sm:text-sm font-bold border border-white/90 shadow-2xs hover:shadow-xs transition-all active:scale-95"
        >
          {t.login}
        </Link>

        <Link
          href={AUTH_ROUTES.signup}
          className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-black shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)] transition-all active:scale-95"
        >
          {t.startFree}
        </Link>
      </div>
    </header>
  );
}
