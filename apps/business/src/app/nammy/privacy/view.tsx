'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { PrivacyPageView } from '@/components/nammy/pages/PrivacyPageView';

export default function PrivacyView() {
  return (
    <NammyPageClient>
      {({ lang }) => <PrivacyPageView lang={lang} />}
    </NammyPageClient>
  );
}
