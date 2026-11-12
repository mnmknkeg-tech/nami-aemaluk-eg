import type { Metadata } from 'next';
import { TrackBookingClient } from '@/components/TrackBookingClient';

export const metadata: Metadata = {
  title: 'تتبع الحجز',
  description: 'تابع حالة حجزك برقم الحجز بدون تسجيل دخول.',
  robots: { index: false },
};

export default function TrackBookingPage() {
  return <TrackBookingClient />;
}
