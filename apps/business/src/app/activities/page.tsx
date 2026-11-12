import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import ActivitiesView from './view';

export const metadata: Metadata = {
  title: NAMMY_PAGE_META.activities.ar.title,
  // الوصف مأخوذ من نص المصدَر نفسه (badge) — مفيش نصوص مختلعة
  description: NAMMY_PAGE_META.activities.ar.badge,
};

export default function ActivitiesPage() {
  return <ActivitiesView />;
}
