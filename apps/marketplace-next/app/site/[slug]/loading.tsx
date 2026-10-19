'use client';

import React from 'react';
import { SiteSkeleton } from '@ray-eg/shared/builder';

/**
 * هيكل تحميل المسار `/site/[slug]`.
 *
 * الصفحة Server Component بتجيب الـ config من الـ API، والـ `loading.tsx`
 * بيظهر قبل ما الداتا توصل — يعني مش عارفين شكل الصفحة بعد. لذلك
 * بنعرض fallback محايد (هيرو + شبكة منتجات) بدل ما نخترع شكل.
 * بعد وصول الداتا، `SiteCartBridge` يستبدله بـ skeleton مولّد من الشجرة.
 */
export default function SiteLoading() {
  return <SiteSkeleton />;
}
