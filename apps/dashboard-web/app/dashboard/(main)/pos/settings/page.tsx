import { notFound, redirect } from 'next/navigation';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';

/** نقطة توافق للروابط القديمة: إعدادات الكاشير تعيش داخل الإعدادات العامة فقط. */
export default function PosSettingsRedirect() {
  if (HIDE_UNPUBLISHED) {
    notFound();
  }
  redirect('/dashboard/settings?tab=pos_settings&from=pos');
}
