import type { Metadata } from 'next';

// صفحة الخريطة نفسها client component فمش بتصدر metadata — الـ layout هنا
// هو الطريقة الرسمية في Next.js لضبط العنوان والوصف والcanonical لصفحة client.
export const metadata: Metadata = {
  title: 'الخريطة التفاعلية — كل المتاجر والأنشطة على الخريطة',
  description:
    'استكشف كل المتاجر والأنشطة التجارية المسجلة في من مكانك على الخريطة التفاعلية — حدد موقعك، اقرّب على أقرب متجر أو عيادة أو مطعم، وادخل على المتجر مباشرة.',
  alternates: { canonical: '/map' },
  robots: { index: true, follow: true },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
