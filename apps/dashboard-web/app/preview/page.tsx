'use client';

import React from 'react';
import { BuilderProvider } from '@/components/website-builder/context/BuilderContext';
import { StandalonePreview } from '@/components/website-builder/components/preview/StandalonePreview';

/**
 * /preview — المعاينة الحقيقية المستقلة للموقع.
 *
 * صفحة مخصّصة تُفتح في تبويب/نافذة منفصلة خارج واجهة المحرر، و تعرض الموقع
 * كما يراه الزائر تماماً باستخدام نفس عارض المكوّنات الحقيقي
 * (ComponentRenderer) بوضع المعاينة التفاعلية. محمّلة من المسودة المحفوظة
 * في الباكند عبر BuilderProvider.
 *
 * مستقلة عن تطبيق الماركت بليس (الذي ما زال قيد التطوير) فلا تعتمد عليه.
 */
export default function PreviewPage() {
  return (
    <BuilderProvider>
      <StandalonePreview />
    </BuilderProvider>
  );
}
