import { redirect } from 'next/navigation';

/** جدول المواعيد تبويب داخل الصفحة الرئيسية للحجوزات */
export default function AppointmentsRedirect() {
  redirect('/dashboard/bookings');
}
