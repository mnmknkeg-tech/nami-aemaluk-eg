'use client';

import { usePathname } from 'next/navigation';
import PageVisitTracker from '@ray-eg/shared/components/common/PageVisitTracker';

/**
 * Mounts the shared page-view beacon inside the Next App Router so every
 * client-side navigation (not just a full page load) is recorded. The admin
 * dashboard reads these records on /admin/visitors.
 */
export function PageViewTracker({ shopId }: { shopId?: string }) {
  const pathname = usePathname();

  return (
    <PageVisitTracker
      path={pathname || '/'}
      shopId={shopId}
      excludePrefixes={[
        '/api',
        '/_next',
        '/dashboard',
        '/admin',
        '/login',
        '/signup',
        '/reset-password',
      ]}
    />
  );
}