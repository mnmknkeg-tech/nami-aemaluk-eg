'use client';

import { useRouter } from 'next/navigation';
import { NammyPageShell } from './NammyPageShell';
import { useNammyLanguage } from '@/nammy/useNammyLanguage';
import { AUTH_ROUTES } from '@/nammy/routes';
import { Language } from '@/nammy/types';

export interface NammyViewContext {
  lang: Language;
  isAr: boolean;
  /** كل أزرار «ابدأ الآن / تجربة» كانت تفتح LeadModal — بتوجّه دلوقتي لـ /signup */
  openSignup: () => void;
}

/**
 * غلاف موحّد لكل صفحات نمّي: يوفّر اللغة + إطار النافذة + توجيه أزرار الـ CTA
 * لصفحة التسجيل الحقيقية (/signup) بدل الفورم الوهمي في مشروع Vite.
 */
export function NammyPageClient({ children }: { children: (ctx: NammyViewContext) => React.ReactNode }) {
  const { lang, toggleLanguage, isAr } = useNammyLanguage();
  const router = useRouter();

  const openSignup = () => router.push(AUTH_ROUTES.signup);

  return (
    <NammyPageShell lang={lang} onToggleLanguage={toggleLanguage}>
      {children({ lang, isAr, openSignup })}
    </NammyPageShell>
  );
}
