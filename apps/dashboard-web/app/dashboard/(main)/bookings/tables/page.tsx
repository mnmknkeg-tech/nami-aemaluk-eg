import { redirect } from 'next/navigation';

/** الطاولات والأماكن تبويب داخل الصفحة الرئيسية للحجوزات */
export default function TablesRedirect() {
  redirect('/dashboard/bookings');
}
