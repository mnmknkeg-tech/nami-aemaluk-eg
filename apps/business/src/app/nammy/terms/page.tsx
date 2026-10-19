import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import TermsView from './view';

/**
 * نسخة «نمّي أعمالك» من الشروط والأحكام.
 * صفحة الشروط القديمة لسا شغالة على '/terms' — مفيش حذف.
 */
export const metadata: Metadata = {
  title: NAMMY_PAGE_META.terms.ar.title,
  description: NAMMY_PAGE_META.terms.ar.badge,
};

export default function NammyTermsPage() {
  return <TermsView />;
}
