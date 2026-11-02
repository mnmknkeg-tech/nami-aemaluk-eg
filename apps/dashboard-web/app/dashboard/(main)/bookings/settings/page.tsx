import { redirect } from 'next/navigation';

/**
 * تم توحيد الإعدادات بالكامل داخل لوحة الإعدادات العامة.
 * يتم التحويل تلقائياً إلى تبويب إعدادات الحجوزات في الإعدادات الموحدة.
 */
export default function BookingsSettingsRedirect() {
  redirect('/dashboard/settings?tab=booking_settings');
}
