'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, LocateFixed, X } from 'lucide-react';
import { LocationPicker } from '@/components/LocationPicker';
import { getResolvedLocation, savePreciseLocation, clearPreciseLocation } from '@/lib/user-location';

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
 * شيب اختيار الموقع في الهيدر — محافظة من القائمة، أو تحديد دقيق على
 * الخريطة. الاختيار بيتخزن محليًا وبيبلّغ الرئيسية وصفحات المتاجر فورًا
 * عشان ترتيب "الأقرب ليك".
 */
export function GovernoratePicker() {
  const [location, setLocation] = useState('داخل مصر');
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [isPrecise, setIsPrecise] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // آخر إحداثيات وعنوان — المرجع بيحل مشكلة الـ stale closure: كولباك
  // LocationPicker بيتنادى من نفس الـ render اللي اتسجل فيه الـ click handler،
  // فالحالة العادية بتفضل قديمة. بالـ ref بنضمن إن العنوان المُحل بيتحفظ
  // بالإحداثيات الصح في كل مرة.
  const pendingRef = useRef<{ lat: number; lng: number } | null>(null);
  const labelRef = useRef('موقعي');

  useEffect(() => {
    const load = () => {
      const resolved = getResolvedLocation();
      if (resolved) {
        setLocation(resolved.label);
        setIsPrecise(resolved.source === 'precise');
      } else {
        setLocation('داخل مصر');
        setIsPrecise(false);
      }
    };
    load();
    window.addEventListener('storage', load);
    window.addEventListener('mnmknk-location-changed', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('mnmknk-location-changed', load);
    };
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
    setIsPrecise(false);
    setOpen(false);
    try {
      if (value === 'داخل مصر') localStorage.removeItem(LOCATION_KEY);
      else localStorage.setItem(LOCATION_KEY, value);
    } catch {
      /* ignore */
    }
    // اختيار محافظة من القائمة = إلغاء التحديد الدقيق القديم —
    // الموقع الدقيق كان بياخد أولوية في القراءة فكان بيتجاهل اختيار المحافظة.
    clearPreciseLocation();
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
        <MapPin className={`w-4 h-4 ${isPrecise ? 'text-brand-purple' : 'text-brand-cyan'}`} />
        <span className="max-w-[7rem] truncate">{location}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="اختر موقعك"
          className="absolute top-full mt-2 right-0 w-60 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[95] p-1.5 animate-scale-in"
        >
          {/* تحديد دقيق على الخريطة */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMapOpen(true);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-black transition-colors bg-brand-gradient text-white hover:opacity-90 mb-1.5"
          >
            <span className="flex items-center gap-2">
              <LocateFixed className="w-4 h-4" />
              حدد موقعي على الخريطة
            </span>
          </button>

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

      {/* نافذة التحديد الدقيق على الخريطة */}
      {mapOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-cyan" />
                حدد موقعك على الخريطة
              </h3>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <LocationPicker
              onLocationSelect={(lat, lng) => {
                const coords = { lat, lng };
                pendingRef.current = coords;
                // حفظ فوري بالإحداثيات — وبأحدث عنوان معروف (لو فيه)
                savePreciseLocation({ lat, lng, label: labelRef.current });
              }}
              onAddressResolved={(addr) => {
                const label =
                  [addr.district, addr.city].filter(Boolean).join('، ') ||
                  addr.governorate ||
                  'موقعي';
                labelRef.current = label;
                // من الـ ref — آخر إحداثيات اتحصلت عليها من onLocationSelect،
                // مش من الحالة اللي ممكن تكون لسه قديمة.
                const coords = pendingRef.current;
                if (coords) {
                  savePreciseLocation({
                    lat: coords.lat,
                    lng: coords.lng,
                    label,
                    governorate: addr.governorate,
                  });
                }
              }}
            />
            <p className="text-[11px] font-bold text-slate-400 mt-3 leading-relaxed">
              الموقع بيتحفظ على جهازك بس — وبنستخدمه في ترتيب المتاجر والمنتجات الأقرب ليك.
            </p>
            <button
              type="button"
              onClick={() => setMapOpen(false)}
              className="w-full mt-3 py-3 rounded-xl bg-brand-cyan text-black font-black text-sm hover:opacity-90 transition-opacity"
            >
              تم — أغلق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
