'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileFooter } from '@/components/MobileFooter';
import { CartDrawer } from '@/components/CartDrawer';

/** هل الهوست ده هوست الماركت الرئيسي؟ (نطاقات المنصة + localhost + IP + معاينات Vercel)
 *  أي هوست تاني = موقع تاجر على دومين فرعي (store.ray.eg) أو دومين مخصص —
 *  والميدلوير بيعمل rewrite داخلي لـ /site/:slug من غير تغيير الـ URL، فالمسار
 *  لوحده مش كافي للتمييز هنا. */
function isMainMarketHost(hostname: string): boolean {
  const h = (hostname || '').toLowerCase().replace(/:$/, '');
  if (!h) return true; // احتياط: غيّر حاجة = ورّي الكروم
  if (/^(www\.)?(ray\.eg|mnmknk\.com)$/.test(h)) return true;
  if (/^(www\.)?nami-aemaluk-marketplace-eg\.vercel\.app$/.test(h)) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true; // سيرفر تطوير بـ IP
  if (h.endsWith('.vercel.app')) return true; // معاينات النشر
  return false;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Merchant sites are fully independent: /shop/[slug] pages and published
  // /site/[slug] builder sites render their own header/footer — no market chrome.
  const isMerchantCheckout = !!pathname && /^\/(shop|site)\/[^/]+\/checkout\/?$/.test(pathname);
  const isMerchantSite =
    !!pathname && (pathname.startsWith('/shop/') || pathname.startsWith('/site/'));
  const isLegacyShop = !!pathname && pathname.startsWith('/shop/');

  // موقع تاجر على دومينه الفرعي/المخصص: الـ URL في المتصفح مش /site/* أصلًا،
  // فبنحسم من الهوست. SSR بيرسم الكروم مؤقتًا لحد أول render على الكلاينت.
  const [onMerchantHost, setOnMerchantHost] = React.useState(false);
  React.useEffect(() => {
    setOnMerchantHost(!isMainMarketHost(window.location.hostname));
  }, []);

  if (isMerchantCheckout || pathname === '/checkout') {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isMerchantSite || onMerchantHost) {
    return (
      <>
        <main className="min-h-screen">{children}</main>
        {isLegacyShop && <CartDrawer />}
      </>
    );
  }

  // صفحة «قيد التطوير» بتصميمها الخاص بالكامل (full-screen) — مفيش هيدر ولا
  // فوتر للمتجر حولاها. بتظهر نضيفة من غير أي Chrome.
  if (pathname === '/coming-soon') {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {/* The mobile bar is ~64px tall but its centre cart button is pulled up
          with -mt-6, so its real footprint is ~88px. Reserve enough room
          (plus the iOS home-indicator inset) so the last product row's price
          is never hidden behind the bar. */}
      <main className="min-h-screen pb-28 lg:pb-0">{children}</main>
      <Footer />
      <MobileFooter />
      {/* The market CartDrawer must be mounted on every market page — the
          header cart button (mobile + desktop) only calls setCartOpen(true),
          and previously the drawer existed on /shop/* pages only, so the
          button silently did nothing on home/dalil/offers/restaurants. */}
      <CartDrawer />
    </>
  );
}
