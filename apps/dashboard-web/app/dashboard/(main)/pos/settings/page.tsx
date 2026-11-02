import { redirect } from 'next/navigation';

/** نقطة توافق للروابط القديمة: إعدادات الكاشير تعيش داخل الإعدادات العامة فقط. */
export default function PosSettingsRedirect() {
  redirect('/dashboard/settings?tab=pos_settings&from=pos');
}
