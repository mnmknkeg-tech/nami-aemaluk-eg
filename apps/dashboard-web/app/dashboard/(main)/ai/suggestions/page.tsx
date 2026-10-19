'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { Lightbulb } from 'lucide-react';

export default function AiSuggestionsPage() {
  return (
    <PagePlaceholder
      icon={Lightbulb}
      title="الاقتراحات"
      description="اقتراحات ذكية لتحسين المتجر والمبيعات وتجربة العميل."
      features={[
        'اقتراحات لتحسين المنتجات والأسعار',
        'اقتراحات حملات تسويقية مناسبة',
        'اقتراحات لتحسين تجربة المستخدم',
        'تنبيهات ذكية للفرص والمخاطر',
        'توصيات حسب تحليل بيانات المتجر',
      ]}
    />
  );
}
