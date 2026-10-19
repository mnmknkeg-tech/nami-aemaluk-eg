'use client';
// اندمجت في صفحة العروض والخصومات — توجيه تلقائي
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketingOffersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/marketing/offers?tab=seasonal'); }, [router]);
  return null;
}
