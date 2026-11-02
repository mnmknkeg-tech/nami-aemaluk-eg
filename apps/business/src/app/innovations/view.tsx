'use client';

import { NammyPageClient } from '@/components/nammy/NammyPageClient';
import { GrowthPage } from '../new/GrowthPage';

/** صفحة «جديد» القديمة داخل نافذة نمّي مثل باقي الصفحات */
export default function InnovationsView() {
  return (
    <NammyPageClient>
      {() => (
        <div className="growth-embedded">
          <GrowthPage />
        </div>
      )}
    </NammyPageClient>
  );
}
