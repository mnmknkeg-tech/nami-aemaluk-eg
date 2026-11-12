import { redirect } from 'next/navigation';

/** توحيد إشعارات الحجوزات مع الإشعارات العامة للمتجر */
export default function BookingsNotificationsRedirect() {
  redirect('/dashboard/notifications');
}
