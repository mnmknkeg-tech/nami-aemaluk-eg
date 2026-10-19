'use client';

import React from 'react';
import { useActivityEnvironment } from '@/config/activityEnvironment';

/**
 * بلاطة هوية النشاط — بتظهر إيموجي النشاط بلونه الخاص
 * بتستخدم في هيدر كل صفحات اللوحة عشان كل صفحة تبان جزء من بيئة النشاط
 */
export default function ActivityIconTile({
  size = 'w-12 h-12',
  emojiSize = 'text-2xl',
  rounded = 'rounded-xl',
}: {
  size?: string;
  emojiSize?: string;
  rounded?: string;
}) {
  const { env } = useActivityEnvironment();
  return (
    <div className={`${size} ${rounded} ${env.headerBadgeClass} flex items-center justify-center shrink-0`}>
      <span className={`${emojiSize} leading-none`}>{env.emoji}</span>
    </div>
  );
}

export { ActivityIconTile };
