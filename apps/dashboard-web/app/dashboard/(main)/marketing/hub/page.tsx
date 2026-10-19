'use client';
// مركز التسويق بقى هو الصفحة الرئيسية للتسويق — توجيه تلقائي
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketingHubRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/marketing'); }, [router]);
  return null;
}
