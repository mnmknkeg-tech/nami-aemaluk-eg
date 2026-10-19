'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileFooter } from '@/components/MobileFooter';
import { CartDrawer } from '@/components/CartDrawer';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Merchant sites are fully independent: /shop/[slug] pages and published
  // /site/[slug] builder sites render their own header/footer — no market chrome.
  const isMerchantSite =
    !!pathname && (pathname.startsWith('/shop/') || pathname.startsWith('/site/'));

  if (isMerchantSite) {
    return (
      <>
        <main className="min-h-screen">{children}</main>
        <CartDrawer />
      </>
    );
  }

  // Checkout is a focused, one-task flow: the market navbar, the big footer and
  // the fixed mobile bar are all distractions there (the bar also sits on top of
  // the order summary / pay button on mobile). The page renders its own compact
  // back bar, and the cart is already summarised inside it, so the drawer is
  // dropped too — otherwise "إتمام الطلب" could be re-triggered behind the modal.
  if (pathname === '/checkout') {
    return <main className="min-h-screen">{children}</main>;
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
      <CartDrawer />
    </>
  );
}
