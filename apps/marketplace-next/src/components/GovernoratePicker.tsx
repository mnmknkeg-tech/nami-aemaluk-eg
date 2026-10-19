'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';

export const LOCATION_KEY = 'mnmknk_location';

export const GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'بني سويف',
  'الفيوم',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
];

/**
 * Location picker chip (governorate) used inside the header.
 * The selection is stored in localStorage so it survives page reloads.
 */
export function GovernoratePicker() {
  const [location, setLocation] = useState('داخل مصر');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) setLocation(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (value: string) => {
    setLocation(value);
    setOpen(false);
    try {
      localStorage.setItem(LOCATION_KEY, value);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="اختر موقعك"
        className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-brand-cyan transition-colors shadow-sm"
      >
        <MapPin className="w-4 h-4 text-brand-cyan" />
        <span className="max-w-[7rem] truncate">{location}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="اختر موقعك"
          className="absolute top-full mt-2 right-0 w-56 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[95] p-1.5 animate-scale-in"
        >
          {['داخل مصر', ...GOVERNORATES].map((g) => (
            <button
              key={g}
              type="button"
              role="option"
              aria-selected={location === g}
              onClick={() => select(g)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                location === g
                  ? 'text-brand-cyan bg-brand-cyan/5'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 opacity-60" />
                {g}
              </span>
              {location === g && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}