'use client';

import { usePathname } from 'next/navigation';
import { HomeSkeleton } from '@/components/ui/Skeleton';
import { NammyDesktopSkeleton } from '@/components/ui/NammySkeleton';

/**
 * loading.tsx الجذري بيغطي أي مسار مالوش loading.tsx خاص بيه.
 * '/' بقت سطح مكتب «نمّي أعمالك» (خلفية + launcher)، فبنعرض الهيكل المناسب
 * للروح الجديدة؛ وباقي المسارات (legacy / dashboard / builder / map ...)
 * بتفضل على نفس HomeSkeleton القديمة بالظبط.
 */
export default function RootLoading() {
  const pathname = usePathname();
  return pathname === '/' ? <NammyDesktopSkeleton /> : <HomeSkeleton />;
}

