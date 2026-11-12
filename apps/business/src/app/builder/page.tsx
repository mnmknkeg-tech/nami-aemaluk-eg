import { redirect } from 'next/navigation';
import { DASHBOARD_URL } from '@/lib/appUrls';

// The website builder lives in dashboard-web; resolve its origin instead of
// hard-coding a domain that may no longer be deployed.
export default function BuilderRedirect() {
  redirect(`${DASHBOARD_URL}/dashboard/website`);
}
