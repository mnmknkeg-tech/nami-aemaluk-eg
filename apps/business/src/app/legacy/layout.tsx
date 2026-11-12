import type { Metadata } from 'next';

/** صفحة الهبوط القديمة متوقفة عن الظهور: ممنوع أرشفحتها عشان ما تزاحم الجديدة */
export const metadata: Metadata = {
  title: 'صفحة الهبوط القديمة (غير مفعلّة)',
  robots: { index: false, follow: false },
};

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
