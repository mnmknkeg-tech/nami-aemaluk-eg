'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { HomePageView } from '@/components/nammy/pages/HomePageView';

export default function HomeView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <HomePageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
