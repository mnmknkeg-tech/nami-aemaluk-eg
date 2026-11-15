import type { ActivityWithGroup } from '@/lib/activities';

// كود الدولة — مصر هو الافتراضي، والتاجر يقدر يغيّره من القائمة
// (الباك اند بيشترط صيغة E.164: +20XXXXXXXXXX)
export const DIAL_CODES = [
  { code: '+20', country: 'مصر' },
  { code: '+966', country: 'السعودية' },
  { code: '+971', country: 'الإمارات' },
  { code: '+965', country: 'الكويت' },
  { code: '+974', country: 'قطر' },
  { code: '+973', country: 'البحرين' },
  { code: '+968', country: 'عُمان' },
  { code: '+962', country: 'الأردن' },
  { code: '+961', country: 'لبنان' },
  { code: '+218', country: 'ليبيا' },
  { code: '+212', country: 'المغرب' },
  { code: '+216', country: 'تونس' },
  { code: '+90', country: 'تركيا' },
];

/**
 * يحوّل رقم الموبايل المدخل إلى صيغة E.164 المطلوبة من الباك اند.
 * يدعم: الرقم المحلي (01012345678)، الرقم بكود الدولة (201012345678)،
 * البادئة الدولية (00201012345678)، والصيغة الدولية (+201012345678).
 */
export function toE164(dialCode: string, raw: string): string {
  const dial = dialCode.replace(/\D/g, '');
  const trimmed = (raw || '').trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+')) return '+' + digits; // مكتوب بصيغة دولية بالفعل
  if (digits.startsWith('00')) return '+' + digits.slice(2); // بادئة دولية 00...
  digits = digits.replace(/^0+/, ''); // نشيل الصفر في أول الرقم المحلي
  if (dial && digits.startsWith(dial)) return '+' + digits; // المستخدم كتب كود الدولة نفسه
  return '+' + dial + digits;
}

export const isValidE164 = (v: string) => /^\+[1-9]\d{7,14}$/.test(v);

// أيقونة خاصة بكل نشاط
export const ACTIVITY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  grocery: '🛒',
  fashion: '👗',
  homeTextiles: '🧵',
  fabricStore: '🧶',
  curtainsBlinds: '🪟',
  sofasUpholstery: '🛋️',
  mattressesBedding: '🛏️',
  furniture: '🪑',
  homeGoods: '🏺',
  goldJewelry: '💍',
  silverAccessories: '📿',
  watchesGifts: '⌚',
  realEstate: '🏠',
  lands: '🌍',
  contractors: '🏗️',
  building_supplies: '🧱',
  carShowroom: '🚗',
  auto_services: '🔧',
  auto_parts: '⚙️',
  agri_supplies: '🌾',
  nurseries_landscaping: '🌱',
  livestock: '🐄',
  fisheries: '🐟',
  energy: '⚡',
  serviceCompanies: '🏢',
  individualTechnicians: '🛠️',
  workshops: '🏭',
  electronics: '📱',
  health: '💊',
  bookings: '📅',
  factories: '🏭',
  tradeCompanies: '📦',
  tourismTravel: '✈️',
  professionalServices: '💼',
  homeServices: '🧹',
  other: '🏷️',
};

export type Step = 'account' | 'activity' | 'questions' | 'modules' | 'data';

export const getActivityLabel = (a?: ActivityWithGroup) => a?.title || a?.id || '';

export interface SignupFormData {
  shopName: string;
  phone: string;
  email: string;
  password: string;
  governorate: string;
  city: string;
  shopPhone: string;
  addressDetailed: string;
  shopDescription: string;
  openingHours: string;
}

// Arabic labels for the live dashboard preview
export const MODULE_PREVIEW: Record<string, { label: string; icon: string }> = {
  core: { label: 'لوحة التحكم', icon: '📊' },
  sales: { label: 'المبيعات والطلبات', icon: '🛒' },
  pos: { label: 'الكاشير', icon: '🧾' },
  inventory: { label: 'المخزون', icon: '📦' },
  bookings: { label: 'الحجوزات', icon: '📅' },
  website: { label: 'متجر أونلاين', icon: '🌐' },
  marketing: { label: 'التسويق', icon: '📣' },
  customers: { label: 'العملاء', icon: '🤝' },
  crm: { label: 'العملاء', icon: '🤝' },
};
