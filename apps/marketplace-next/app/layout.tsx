import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { QueryProvider } from '@/components/QueryProvider';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import { AppChrome } from '@/components/AppChrome';
import { PageViewTracker } from '@/components/PageViewTracker';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { siteConfig } from '@/lib/config';
import ConsentBanner from '@ray-eg/shared/components/common/ConsentBanner';
import BreachNotice from '@ray-eg/shared/components/common/BreachNotice';
import { backendOrigin } from '@/lib/api';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.nameArabic}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - ${siteConfig.nameArabic}`,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} - ${siteConfig.nameArabic}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preload" href="/fonts/fonts.css" as="style" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
        <link rel="dns-prefetch" href={backendOrigin()} />
        {/* PWA service worker — production only. In dev its caches keep serving
            stale pages/CSS and break hot reload. */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').catch(function (err) {
                      console.warn('SW registration failed:', err);
                    });
                  });
                }
              `,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <AppProvider>
            <CartProvider>
              <WishlistProvider>
                <PageViewTracker />
                <BreachNotice />
                <AppChrome>{children}</AppChrome>
                <PwaInstallPrompt />
                <ConsentBanner />
              </WishlistProvider>
            </CartProvider>
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
