'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { PricingPageView } from '@/components/nammy/pages/PricingPageView';

export default function PricingView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <PricingPageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
