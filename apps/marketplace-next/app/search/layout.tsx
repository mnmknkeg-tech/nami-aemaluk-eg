import type { Metadata } from 'next';

// صفحة نتائج البحث — بيئتها سلسلة استعلامات مخصصة لكل زائر، فبتتعمل noindex
// (أفضل ممارسة SEO) لتجنب إغراق نتائج جوجل بصفحات شبه مكررة.
export const metadata: Metadata = {
  title: 'البحث في من مكانك',
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
