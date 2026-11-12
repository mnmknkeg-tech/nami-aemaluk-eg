'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { AboutPageView } from '@/components/nammy/pages/AboutPageView';

export default function AboutView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <AboutPageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
