import { redirect } from 'next/navigation';

/** الغرف والقاعات تبويب داخل الصفحة الرئيسية للحجوزات */
export default function RoomsRedirect() {
  redirect('/dashboard/bookings');
}
