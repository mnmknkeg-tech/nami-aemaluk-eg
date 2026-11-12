'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import PagePlaceholder from '@/components/PagePlaceholder';

export default function DashboardCatchAll() {
  const pathname = usePathname();
  const segment = pathname.split('/').filter(Boolean).pop() || '';
  const titleMap: Record<string, string> = {
    sales: 'المبيعات',
    inventory: 'المخزون',
    finance: 'المالية',
    marketing: 'التسويق',
    crm: 'خدمة العملاء',
    bookings: 'الحجوزات',
    hr: 'الموارد البشرية',
    analytics: 'التحليلات',
    website: 'الموقع الإلكتروني',
    ai: 'الذكاء الاصطناعي',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
  };
  const title = titleMap[segment] || 'صفحة';
  return <PagePlaceholder title={title} />;
}
