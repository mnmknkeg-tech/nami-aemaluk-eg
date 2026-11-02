import { NammyLegalSkeleton } from '@/components/ui/NammySkeleton';

/**
 * يغطي /nammy/about و /nammy/privacy و /nammy/terms (ملف واحد لكل.segment)
 */
export default function Loading() {
  return <NammyLegalSkeleton label="جارٍ تحميل الصفحة" />;
}
