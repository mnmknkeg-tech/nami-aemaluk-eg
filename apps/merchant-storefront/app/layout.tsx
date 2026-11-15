import type { Metadata, Viewport } from 'next';
import '../../marketplace-next/app/globals.css';

export const metadata: Metadata = {
  title: { default: 'المتجر الرسمي', template: '%s' },
  description: 'المتجر الإلكتروني الرسمي',
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff'
};

export default function MerchantStorefrontRootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}