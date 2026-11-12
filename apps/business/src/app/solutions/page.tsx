import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import SolutionsView from './view';

export const metadata: Metadata = {
  title: NAMMY_PAGE_META.solutions.ar.title,
  // الوصف من نص المصدَر نفسه (badge) — مفيش نصوص مختلعة
  description: NAMMY_PAGE_META.solutions.ar.badge,
};

export default function SolutionsPage() {
  return <SolutionsView />;
}
