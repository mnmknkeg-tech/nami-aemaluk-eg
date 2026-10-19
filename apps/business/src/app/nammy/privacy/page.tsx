import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import PrivacyView from './view';

/**
 * نسخة «نمّي أعمالك» من سياسة الخصوصية.
 * سياسة المشروع القديمة لسا شغالة على '/privacy' (مرتبطة ببانر الكوكيز) — مفيش حذف.
 */
export const metadata: Metadata = {
  title: NAMMY_PAGE_META.privacy.ar.title,
  description: NAMMY_PAGE_META.privacy.ar.badge,
};

export default function NammyPrivacyPage() {
  return <PrivacyView />;
}
