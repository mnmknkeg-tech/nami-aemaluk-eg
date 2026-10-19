import type { Metadata } from 'next';
import { NAMMY_PAGE_META } from '@/nammy/routes';
import MenMakanakView from './view';

// ملاحظة: الصفحة تفضل شغالة ومفهرسة (SEO) في كل البيئات. الفرق بين اللوكل
// والمنشور جوا الـ view (MEN_MAKANAK_LIVE): كامل محتوى التطوير في اللوكل،
// وشاشة «قيد التطوير» في المنشور — عشان ميظهرش 404 لو حد بحث عن من مكانك.
export const metadata: Metadata = {
  title: NAMMY_PAGE_META['men-makanak'].ar.title,
  description: NAMMY_PAGE_META['men-makanak'].ar.badge,
};

export default function MenMakanakPage() {
  return <MenMakanakView />;
}
