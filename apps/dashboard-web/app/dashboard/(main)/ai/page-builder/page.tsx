'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { LayoutTemplate } from 'lucide-react';

export default function AiPageBuilderPage() {
  return (
    <PagePlaceholder
      icon={LayoutTemplate}
      title="إنشاء الصفحات"
      description="بناء صفحات مخصصة بالذكاء الاصطناعي: صفحات هبوط، عروض، مناسبات."
      features={[
        'إنشاء صفحات هبوط (Landing Pages)',
        'صفحات العروض والمناسبات',
        'توليد محتوى الصفحة تلقائياً',
        'تخصيص التخطيط والأقسام',
        'نشر مباشر على الموقع',
      ]}
    />
  );
}
