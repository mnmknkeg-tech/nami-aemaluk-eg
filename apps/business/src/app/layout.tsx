import type { Metadata, Viewport } from 'next';
import './globals.css';
import BreachNotice from '@ray-eg/shared/components/common/BreachNotice';
import { PageViewTracker } from '@/components/PageViewTracker';

export const metadata: Metadata = {
  title: {
    default: 'نمّي أعمالك — منصة إدارة الأعمال للمتاجر والخدمات',
    template: '%s | نمّي أعمالك',
  },
  description: 'منصة متكاملة لإدارة متجرك أو نشاطك التجاري — مبيعات، مخزون، حجوزات، تقارير، وتسويق في مكان واحد.',
  keywords: ['إدارة الأعمال', 'متجر إلكتروني', 'نقاط بيع', 'حجوزات', 'مخزون', 'تقارير', 'مصر'],
  authors: [{ name: 'من مكانك' }],
  creator: 'من مكانك',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/brand/logo-business.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/logo-business.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/brand/logo-business.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'نمّي أعمالك',
  },
};

export const viewport: Viewport = {
  themeColor: '#00E5FF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preload" href="/fonts/fonts.css" as="style" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="bg-white text-slate-900">
        <PageViewTracker />
        <BreachNotice />
        {children}
      </body>
    </html>
  );
}
