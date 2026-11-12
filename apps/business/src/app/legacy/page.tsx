'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import {
  GrowthJourney,
  ConnectedEcosystem,
  ShopTypes,
  BeforeAfter,
  HowItWorks,
  MahallyShowcase,
} from '@/components/Sections';
import { FaqSection, FinalCta, Footer } from '@/components/MoreSections';
import { useScrollReveal, useBackToTop } from '@/lib/hooks';
import ConsentBanner from '@ray-eg/shared/components/common/ConsentBanner';
import { ChevronDown } from 'lucide-react';

/**
 * صفحة الهبوط القديمة — متوقفة عن الظهور في '/' ومحتفظ بيها كاملة على '/legacy'
 * لحد ما نتأكد من نسخة «نمّي أعمالك» الجديدة. مفيش أي حذف.
 */
export default function LegacyHomePage() {
  useScrollReveal();
  const { show, scrollToTop } = useBackToTop();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <GrowthJourney />
      <ConnectedEcosystem />
      <ShopTypes />
      <BeforeAfter />
      <HowItWorks />
      <FaqSection />
      <MahallyShowcase />
      <FinalCta />
      <Footer />
      {/* بانر الكوكيز على الصفحة الرئيسية فقط */}
      <ConsentBanner />

      {show && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-6 left-4 z-50 w-11 h-11 rounded-xl bg-[#0057FF] text-white shadow-lg shadow-blue-600/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer"
          aria-label="Back to top"
        >
          <ChevronDown className="w-5 h-5 rotate-180" />
        </button>
      )}
    </div>
  );
}
