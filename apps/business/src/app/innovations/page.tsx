import type { Metadata } from 'next';
import InnovationsView from './view';
import '../new/growth.css';
import './embedded.css';

export const metadata: Metadata = {
  title: 'جديد نمّي أعمالك | كل ما تحتاجه في مكان واحد',
  description: 'صفحة الجديد: تجربة أفضل وإمكانيات أوسع — من المتجر والدفع إلى الشحن والتوصيل.',
  alternates: { canonical: '/innovations' },
};

/**
 * مسار /innovations يعرض صفحة «جديد» القديمة (GrowthPage من /new)
 * لكن داخل نافذة نمّي (NammyPageShell) مثل باقي الصفحات.
 */
export default function InnovationsPage() {
  return <InnovationsView />;
}
