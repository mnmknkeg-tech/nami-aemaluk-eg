import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import AboutView from './view';

/**
 * نسخة «نمّي أعمالك» من صفحة من نحن.
 * صفحة المشروع القديمة لسا شغالة على '/about' (مفيش حذف).
 * وللإبدال الكامل: غيّر about في src/nammy/routes.ts إلى '/about'.
 */
export const metadata: Metadata = {
  title: NAMMY_PAGE_META.about.ar.title,
  description: NAMMY_PAGE_META.about.ar.badge,
};

export default function NammyAboutPage() {
  return <AboutView />;
}
