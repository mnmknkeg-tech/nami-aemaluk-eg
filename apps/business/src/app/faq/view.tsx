'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { FaqPageView } from '@/components/nammy/pages/FaqPageView';

export default function FaqView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <FaqPageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
