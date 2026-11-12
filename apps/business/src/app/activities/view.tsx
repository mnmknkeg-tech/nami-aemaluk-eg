'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { ActivitiesPageView } from '@/components/nammy/pages/ActivitiesPageView';

export default function ActivitiesView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <ActivitiesPageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
