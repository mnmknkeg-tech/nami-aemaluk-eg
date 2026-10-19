'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { TermsPageView } from '@/components/nammy/pages/TermsPageView';

export default function TermsView() {
  return (
    <NammyPageClient>
      {({ lang }) => <TermsPageView lang={lang} />}
    </NammyPageClient>
  );
}
