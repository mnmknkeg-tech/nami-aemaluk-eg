'use client';

import PagePlaceholder from '@/components/PagePlaceholder';
import { MessageCircleReply } from 'lucide-react';

export default function AiRepliesPage() {
  return (
    <PagePlaceholder
      icon={MessageCircleReply}
      title="الردود التلقائية"
      description="توليد ردود تلقائية ذكية لرسائل العملاء وتذاكر الدعم الفني."
      features={[
        'ردود تلقائية على رسائل العملاء',
        'تخصيص نبرة الردود (رسمي، ودود)',
        'ردود جاهزة للأسئلة الشائعة',
        'توليد ردود حسب سياق الرسالة',
        'موافقة وتعديل قبل الإرسال',
      ]}
    />
  );
}
