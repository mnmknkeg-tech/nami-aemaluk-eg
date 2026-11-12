'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { Fingerprint } from 'lucide-react';

export default function BrandIdentityPage() {
  return (
    <PagePlaceholder
      icon={Fingerprint}
      title="هوية العلامة"
      description="توليد هوية بصرية متكاملة لمتجرك: شعار، ألوان، خطوط، شخصية العلامة."
      features={[
        'توليد شعار (Logo) بالذكاء الاصطناعي',
        'اختيار شخصية العلامة (Formal, Casual, Playful)',
        'توليد دليل الألوان الأساسية والثانوية',
        'توليد خطوط الهوية المتناسقة',
        'تصدير دليل الهوية البصرية',
      ]}
    />
  );
}
