'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { DesktopHeader } from './DesktopHeader';
import { NammyBackground } from './NammyBackground';
import { AUTH_ROUTES } from '@/nammy/routes';
import { Language } from '@/nammy/types';
import { TRANSLATIONS } from '@/nammy/translations';

interface NammyPageShellProps {
  lang: Language;
  onToggleLanguage: () => void;
  children: React.ReactNode;
}

/**
 * إطار صفحة «نمّي أعمالك» بعد تحويله من IndependentPageModal (نافذة منبثقة في Vite)
 * إلى صفحة Next.js حقيقية. اللغة تُمرّر من الصفحة نفسها (نفس تدفق البيانات في Vite).
 *
 * - نفس شكل شريط النافذة الأصلي: رجوع + تكبير + زر «ابدأ مجانًا».
 * - زر الرجوع كان يقفل النافذة (onClose) → بقى رابط رجوع للرئيسية '/'.
 * - زر «ابدأ مجانًا» كان يفتح LeadModal → بقى يوجه لصفحة التسجيل الموجودة /signup.
 */
export function NammyPageShell({ lang, onToggleLanguage, children }: NammyPageShellProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const t = TRANSLATIONS[lang];
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <NammyBackground />

      <DesktopHeader lang={lang} onToggleLanguage={onToggleLanguage} />

      {/* إطار النافذة: محله مكان IndependentPageModal */}
      <main className="flex-1 flex items-start justify-center px-2 sm:px-4 md:px-6 pt-1 pb-8 sm:pt-2">
        <div
          className={`w-full flex flex-col rounded-3xl border border-slate-200/90 shadow-[0_25px_80px_rgba(15,23,42,0.35)] bg-white overflow-hidden ${
            isMaximized ? 'min-h-[96vh]' : 'min-h-[88vh] max-w-5xl'
          }`}
        >
          {/* شريط علوي نظيف (بدون شعار — اللوجو هيتضاف لاحقًا) */}
          <div
            onDoubleClick={() => setIsMaximized(!isMaximized)}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 select-none cursor-default"
          >
            <Link
              href="/"
              className="w-9 h-9 rounded-2xl bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all active:scale-90 shadow-2xs hover:shadow-xs group"
              title={isAr ? 'العودة' : 'Back'}
              aria-label={t.backToMain}
            >
              <BackIcon size={18} strokeWidth={2.4} className="transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Link
                href={AUTH_ROUTES.signup}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all active:scale-95"
              >
                <span>{isAr ? 'ابدأ مجاناً' : 'Get Started'}</span>
              </Link>

              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title={isMaximized ? t.restore : t.maximize}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {/* نفس الـ canvas الأصلي بنفس الـ padding */}
          <div className="flex-1 p-4 sm:p-8 md:p-10 space-y-8 bg-[#FAFAFA]/60">{children}</div>
        </div>
      </main>
    </div>
  );
}
