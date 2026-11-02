import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import FaqView from './view';

export const metadata: Metadata = {
  title: NAMMY_PAGE_META.faq.ar.title,
  description: NAMMY_PAGE_META.faq.ar.badge,
};

export default function FaqPage() {
  return <FaqView />;
}
