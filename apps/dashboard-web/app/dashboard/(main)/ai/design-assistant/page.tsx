'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { Wand2 } from 'lucide-react';

export default function DesignAssistantPage() {
  return (
    <PagePlaceholder
      icon={Wand2}
      title="مساعد التصميم"
      description="مساعد ذكي لتعديل تصميم المتجر بالأوامر النصية والمعاينة الفورية."
      features={[
        'تعديل التصميم بالأوامر النصية',
        'معاينة قبل/بعد فورية',
        'تطبيق أنماط جاهزة (Modern, Luxury, Glass)',
        'تعديل الألوان والمسافات والخطوط',
        'حفظ التغييرات والتراجع',
      ]}
    />
  );
}
