'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { SolutionsPageView } from '@/components/nammy/pages/SolutionsPageView';

export default function SolutionsView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) => <SolutionsPageView lang={lang} onOpenDemo={openSignup} />}
    </NammyPageClient>
  );
}
