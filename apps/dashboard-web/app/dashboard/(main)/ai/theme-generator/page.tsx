'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { Palette } from 'lucide-react';

export default function ThemeGeneratorPage() {
  return (
    <PagePlaceholder
      icon={Palette}
      title="مولد الثيم"
      description="توليد ثيم متجرك بالكامل بالذكاء الاصطناعي: ألوان، خطوط، تصميم."
      features={[
        'توليد ألوان متناسقة تلقائياً',
        'اختيار الخطوط المناسبة للنشاط',
        'تخصيص شكل الأزرار والبطاقات',
        'معاينة فورية للتغييرات',
        'حفظ قوالب ثيم جاهزة',
      ]}
    />
  );
}
