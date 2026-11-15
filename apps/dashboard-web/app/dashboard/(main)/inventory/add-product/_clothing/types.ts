export type FashionSizeItem = { label: string; price: string };

export type AddonItem = {
  id: string;
  name: string;
  price: string;
  imagePreviews: string[];
  imageUrls: string[];
  imageUploadFiles: File[];
  selectedColors: Array<{ name: string; value: string }>;
  customColor: string;
  selectedSizes: string[];
  customSize: string;
};

export type PackOptionItem = { id: string; qty: string; price: string };

export const presetColors: Array<{ name: string; value: string }> = [
  { name: 'أسود', value: '#111827' },
  { name: 'أبيض', value: '#ffffff' },
  { name: 'رمادي', value: '#9ca3af' },
  { name: 'أحمر', value: '#ef4444' },
  { name: 'وردي', value: '#ec4899' },
  { name: 'بنفسجي', value: '#a855f7' },
  { name: 'أزرق', value: '#3b82f6' },
  { name: 'سماوي', value: '#06b6d4' },
  { name: 'أخضر', value: '#22c55e' },
  { name: 'أصفر', value: '#eab308' },
  { name: 'برتقالي', value: '#f97316' },
  { name: 'بني', value: '#a16207' },
];

export const presetSizes: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const GOOGLE_PRODUCT_CATEGORIES = [
  'ملابس وإكسسوارات',
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'الفن والترفيه',
  'تجاري وصناعي',
  'كاميرات وأجهزة بصرية',
  'إلكترونيات',
  'المأكولات والمشروبات والتبغ',
  'الأثاث',
  'الصحة والجمال',
  'الحديقة والمنزل',
  'الرضيع والطفل',
  'أجهزة',
  'وسائط',
  'المركبات وقطع الغيار',
  'المستلزمات المكتبية',
];

export const parseNumberInput = (value: any) => {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const cleaned = raw
    .replace(/[٠-٩۰-۹]/g, (d) => {
      const map: Record<string, string> = {
        '٠': '0',
        '١': '1',
        '٢': '2',
        '٣': '3',
        '٤': '4',
        '٥': '5',
        '٦': '6',
        '٧': '7',
        '٨': '8',
        '٩': '9',
        '۰': '0',
        '۱': '1',
        '۲': '2',
        '۳': '3',
        '۴': '4',
        '۵': '5',
        '۶': '6',
        '۷': '7',
        '۸': '8',
        '۹': '9',
      };
      return map[d] || d;
    })
    .replace(/[٬،]/g, '')
    .replace(/[٫]/g, '.')
    .replace(/\s+/g, '');
  return Number(cleaned);
};
