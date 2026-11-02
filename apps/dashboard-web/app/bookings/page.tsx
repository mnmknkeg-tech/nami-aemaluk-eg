import { redirect } from 'next/navigation';

export default function BookingsRootRedirect() {
  redirect('/dashboard/bookings');
}
