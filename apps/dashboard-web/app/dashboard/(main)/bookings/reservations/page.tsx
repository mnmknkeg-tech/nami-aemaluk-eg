import { redirect } from 'next/navigation';

/** الحجوزات تبويب داخل الصفحة الرئيسية للحجوزات */
export default function ReservationsRedirect() {
  redirect('/dashboard/bookings');
}
