import { redirect } from 'next/navigation';
import { DASHBOARD_APP_PATH, DASHBOARD_URL } from '@/lib/appUrls';

// The merchant workspace lives in dashboard-web; resolve its origin instead of
// hard-coding a domain that may no longer be deployed.
export default function DashboardRedirect() {
  redirect(`${DASHBOARD_URL}${DASHBOARD_APP_PATH}`);
}
