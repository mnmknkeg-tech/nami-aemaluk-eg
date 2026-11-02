'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { MenMakanakPageView } from '@/components/nammy/pages/MenMakanakPageView';
import { MenMakanakComingSoonView } from '@/components/nammy/pages/MenMakanakComingSoonView';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

export default function MenMakanakView() {
  return (
    <NammyPageClient>
      {({ lang, openSignup }) =>
        MEN_MAKANAK_LIVE ? (
          <MenMakanakPageView lang={lang} onOpenDemo={openSignup} />
        ) : (
          // تسويق التطبيق لسه مش منشور في الإنتاج — نظهر شاشة «قيد التطوير»
          // بدل ما نعمل 404، عشان نحافظ على الـ SEO والفضول.
          <MenMakanakComingSoonView lang={lang} onOpenDemo={openSignup} />
        )
      }
    </NammyPageClient>
  );
}
