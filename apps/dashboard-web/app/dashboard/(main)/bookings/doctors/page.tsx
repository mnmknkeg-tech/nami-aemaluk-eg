import { redirect } from 'next/navigation';

/** الأطباء والمقدمون تبويب داخل الصفحة الرئيسية للحجوزات */
export default function DoctorsRedirect() {
  redirect('/dashboard/bookings');
}
