/**
 * Egyptian geography helpers — offline fallback for address resolution.
 *
 * Nominatim reverse geocoding sometimes fails (rate limits, network hiccups),
 * and when it does the address form used to stay empty and the save failed.
 * With this table we can always guess the governorate (and often the city)
 * from coordinates alone, so choosing a spot on the map NEVER dead-ends.
 */

export interface EgGovernorate {
  /** الاسم الرسمي بالمحافظة */
  name: string;
  /** مركز المحافظة */
  lat: number;
  lng: number;
  /** أسماء شائعة بديلة للمطابقة النصية */
  aliases?: string[];
}

/** مراكز المحافظات المصرية الـ27 — دقة كافية لتخمين المحافظة من الإحداثيات. */
export const EG_GOVERNORATES: EgGovernorate[] = [
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { name: 'الجيزة', lat: 30.0131, lng: 31.2089 },
  { name: 'الإسكندرية', lat: 31.2001, lng: 29.9187, aliases: ['اسكندرية', 'الاسكندريه', 'إسكندرية'] },
  { name: 'القليوبية', lat: 30.175, lng: 31.2, aliases: ['قلوبية'] },
  { name: 'الدقهلية', lat: 31.04, lng: 31.38, aliases: ['دقهلية'] },
  { name: 'الشرقية', lat: 30.55, lng: 31.7, aliases: ['شرقية'] },
  { name: 'الغربية', lat: 30.875, lng: 31.03, aliases: ['غربية'] },
  { name: 'المنوفية', lat: 30.6, lng: 30.95, aliases: ['منوفية'] },
  { name: 'البحيرة', lat: 31.1, lng: 30.45, aliases: ['بحيرة'] },
  { name: 'كفر الشيخ', lat: 31.25, lng: 30.95, aliases: ['كفرالشيخ'] },
  { name: 'دمياط', lat: 31.42, lng: 31.81 },
  { name: 'بورسعيد', lat: 31.265, lng: 32.3, aliases: ['بور سعيد'] },
  { name: 'الإسماعيلية', lat: 30.6, lng: 32.27, aliases: ['اسماعيلية', 'الاسماعيليه'] },
  { name: 'السويس', lat: 29.97, lng: 32.55 },
  { name: 'شمال سيناء', lat: 30.93, lng: 33.8, aliases: ['العريش'] },
  { name: 'جنوب سيناء', lat: 28.05, lng: 34.27, aliases: ['شرم الشيخ', 'شرم'] },
  { name: 'الفيوم', lat: 29.31, lng: 30.84, aliases: ['فيوم'] },
  { name: 'بني سويف', lat: 29.08, lng: 31.1, aliases: ['بنى سويف'] },
  { name: 'المنيا', lat: 28.1, lng: 30.75, aliases: ['منيا'] },
  { name: 'أسيوط', lat: 27.18, lng: 31.18, aliases: ['اسيوط', 'الاسيوط'] },
  { name: 'سوهاج', lat: 26.55, lng: 31.7 },
  { name: 'قنا', lat: 26.16, lng: 32.72 },
  { name: 'الأقصر', lat: 25.69, lng: 32.64, aliases: ['اقصر', 'الاقصر'] },
  { name: 'أسوان', lat: 24.09, lng: 32.9, aliases: ['اسوان', 'الاسوان'] },
  { name: 'البحر الأحمر', lat: 27.22, lng: 33.77, aliases: ['الغردقة', 'غردقة', 'شرم'] },
  { name: 'مطروح', lat: 31.35, lng: 27.24, aliases: ['مرسى مطروح'] },
  { name: 'الوادي الجديد', lat: 25.5, lng: 29.5, aliases: ['الخارجة', 'خارجة'] },
];

/** تطبيع بسيط للنص العربي: إزالة ال التعريف والهمزات والمسافات. */
export function normalizeArabic(value: string): string {
  return String(value || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ال(?=[شفقكهنمولبتصرديدجاوعي])/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** مطابقة اسم المحافظة مع تجاهل اختلافات الهمزة/ال/التبديل. */
export function matchGovernorateName(input: string): EgGovernorate | null {
  const norm = normalizeArabic(input);
  if (!norm) return null;
  for (const g of EG_GOVERNORATES) {
    if (normalizeArabic(g.name) === norm) return g;
    if (g.aliases?.some((a) => normalizeArabic(a) === norm)) return g;
  }
  // مطابقة جزئية (مثلا "محافظة القاهرة")
  for (const g of EG_GOVERNORATES) {
    const n = normalizeArabic(g.name);
    if (n.length >= 4 && (norm.includes(n) || n.includes(norm))) return g;
  }
  return null;
}

const R = 6371; // نصف قطر الأرض بالكيلومتر

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** تنسيق المسافة للعرض: متر للأقل من كيلو، وإلا كم. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return `${Math.round(km * 1000)} م`;
  if (km < 10) return `${km.toFixed(1)} كم`;
  return `${Math.round(km)} كم`;
}

const OUTSIDE_EGYPT_KM = 220; // أبعد نقطتين داخل مصر بينهما ~1500 كم، فالحدودهامنطقة واسعة

/**
 * تخمين المحافظة (والحي/المدينة المركزية) من الإحداثيات — بدون أي شبكة.
 * يعيد null لو الإحداثيات خارج مصر تمامًا.
 */
export function guessGovernorate(
  lat: number,
  lng: number
): { governorate: string; city: string; distanceKm: number } | null {
  let best: EgGovernorate | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const g of EG_GOVERNORATES) {
    const km = haversineKm({ lat, lng }, { lat: g.lat, lng: g.lng });
    if (km < bestKm) {
      bestKm = km;
      best = g;
    }
  }
  if (!best || bestKm > OUTSIDE_EGYPT_KM) return null;
  return { governorate: best.name, city: best.name, distanceKm: bestKm };
}
