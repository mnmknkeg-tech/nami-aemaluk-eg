'use client';

import SectionError from '@/components/SectionError';

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError error={error} reset={reset} section="الإشعارات" />;
}
