'use client';
// اندمجت في صفحة الرسائل والتواصل — توجيه تلقائي
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketingMessagesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/marketing/messages?tab=push'); }, [router]);
  return null;
}
