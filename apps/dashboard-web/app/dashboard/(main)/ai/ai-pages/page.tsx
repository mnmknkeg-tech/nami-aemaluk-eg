'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { FilePlus2 } from 'lucide-react';

export default function AiPagesPage() {
  return (
    <PagePlaceholder
      icon={FilePlus2}
      title="مولد صفحات AI"
      description="توليد صفحات المتجر بالذكاء الاصطناعي: صفحة رئيسية، منتجات، من نحن."
      features={[
        'توليد صفحة رئيسية متكاملة',
        'توليد صفحات المنتجات والفئات',
        'توليد صفحة من نحن واتصل بنا',
        'تخصيص المحتوى حسب النشاط',
        'معاينة وتعديل قبل النشر',
      ]}
    />
  );
}
