'use client';

import React from 'react';
import { Info } from 'lucide-react';

/**
 * Banner for pages whose data is stored locally in the browser until the
 * backend module is wired, so merchants are never misled about persistence.
 */
export default function LocalDataNotice({ label = 'بيانات المعاينة محفوظة على جهازك مؤقتاً — سيتم ربطها بالسيرفر مع هيكلة النشاطات القادمة.' }: { label?: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 mb-4">
      <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[11px] font-bold text-amber-700 leading-relaxed">{label}</p>
    </div>
  );
}
