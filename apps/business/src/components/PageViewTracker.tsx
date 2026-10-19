'use client';

import { usePathname } from 'next/navigation';
import PageVisitTracker from '@ray-eg/shared/components/common/PageVisitTracker';

/**
 * Business landing-site page-view beacon. Records every public page view so the
 * admin dashboard (/admin/visitors on dashboard-web) reports visits per page and
 * per device type.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  return (
    <PageVisitTracker
      path={pathname || '/'}
      excludePrefixes={['/api', '/_next', '/admin', '/dashboard']}
    />
  );
}

export default PageViewTracker;