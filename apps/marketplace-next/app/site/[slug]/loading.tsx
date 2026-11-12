'use client';

import React from 'react';
import { SiteSkeleton } from '@ray-eg/shared/builder';

/**
 * هيكل تحميل المسار `/site/[slug]` — الهيكل الوحيد الذي يراه الزائر.
 *
 * الصفحة Server Component بتجيب الـ config من الـ API، والـ `loading.tsx`
 * بيظهر قبل ما الداتا توصل. بعد وصول الداتا، `SiteCartBridge` بيرندر الموقع
 * الحقيقي مباشرة (Server-Rendered) — مفيش هيكل ثاني بعد كده.
 */
export default function SiteLoading() {
  return <SiteSkeleton />;
}
