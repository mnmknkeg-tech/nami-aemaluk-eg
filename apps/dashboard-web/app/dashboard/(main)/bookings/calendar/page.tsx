import { redirect } from 'next/navigation';

/** التقويم تبويب داخل الصفحة الرئيسية للحجوزات */
export default function CalendarRedirect() {
  redirect('/dashboard/bookings');
}
