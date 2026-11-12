'use client';

import { useRouter } from 'next/navigation';
import { DesktopHeader } from './DesktopHeader';
import { DesktopShortcuts } from './DesktopShortcuts';
import { CenterLauncher } from './CenterLauncher';
import { NammyBackground } from './NammyBackground';
import { useNammyLanguage } from '@/nammy/useNammyLanguage';
import { AI_CHAT_ROUTE, AUTH_ROUTES, NAMMY_ROUTE_BY_TAB } from '@/nammy/routes';
import { NavTabId, PromptSuggestion } from '@/nammy/types';

/**
 * سطح المكتب الرئيسي لـ«نمّي أعمالك» — محل صفحة الهبوط القديمة في '/'.
 *
 * فروق التحويل عن App.tsx في Vite:
 * - فتح الصفحات كان activePage + نافذة منبثقة → بقى router.push على مسارات حقيقية.
 * - LeadModal / LoginModal الوهميين → توجيه لصفحتي /signup و /login الحقيقيتين.
 */
export function NammyDesktop() {
  const router = useRouter();
  const { lang, toggleLanguage } = useNammyLanguage();

  const handleOpenPage = (pageId: NavTabId) => {
    router.push(NAMMY_ROUTE_BY_TAB[pageId]);
  };

  const handleOpenAiChat = (query: string, suggestion?: PromptSuggestion) => {
    const params = new URLSearchParams({ q: query });
    if (suggestion) params.set('s', suggestion.id);
    router.push(`${AI_CHAT_ROUTE}?${params.toString()}`);
  };

  // «تجربة حية» / «تحدث مع مستشار» / كل أزرار CTA → صفحة التسجيل الحقيقية
  const handleOpenDemo = () => {
    router.push(AUTH_ROUTES.signup);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <NammyBackground />

      {/* Top Header Bar: Logo, Language Toggle, Login & Start Free */}
      <DesktopHeader lang={lang} onToggleLanguage={toggleLanguage} />

      {/* Desktop Shortcuts (أيقونات جانبية على الديسكتوب + شريط سفلي على المحمول) */}
      <DesktopShortcuts lang={lang} onOpenPage={handleOpenPage} onOpenDemo={handleOpenDemo} />

      {/* Main Center Launcher */}
      <main className="flex-1 flex flex-col items-center justify-start pt-5 sm:pt-9 md:pt-12 pb-16 sm:pb-8">
        <CenterLauncher lang={lang} onOpenPage={handleOpenPage} onOpenAiChat={handleOpenAiChat} />
      </main>
    </div>
  );
}
