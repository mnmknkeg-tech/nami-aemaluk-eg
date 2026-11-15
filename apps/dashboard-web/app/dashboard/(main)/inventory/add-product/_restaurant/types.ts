export const RESTAURANT_SIZE_NONE = '__NONE__';

export const GOOGLE_PRODUCT_CATEGORIES = [
  'المأكولات والمشروبات والتبغ',
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'الفن والترفيه',
  'تجاري وصناعي',
  'كاميرات وأجهزة بصرية',
  'ملابس وإكسسوارات',
  'إلكترونيات',
  'الأثاث',
  'الصحة والجمال',
  'الحديقة والمنزل',
  'الرضيع والطفل',
  'أجهزة',
  'وسائط',
  'المركبات وقطع الغيار',
  'المستلزمات المكتبية',
];

export type AddonItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  imageUploadFile: File | null;
  hasSmall: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

export type MenuVariantItem = {
  id: string;
  name: string;
  hasSmall: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

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
