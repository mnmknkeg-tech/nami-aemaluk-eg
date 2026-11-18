export interface GenericContentFieldDefinition {
  key: 'text' | 'title' | 'subtitle' | 'badge' | 'icon' | 'price';
  label: string;
  control: 'input' | 'textarea';
  rows?: number;
  placeholder?: string;
  /** A field is exposed only when the persisted node already contains this key. */
  visibility: 'when-present';
}

/**
 * The shared content controls currently implemented by ContentSection.
 * This is intentionally a UI field catalog, not a persisted-data validator:
 * unknown props and component-specific controls remain untouched.
 */
export const GENERIC_CONTENT_FIELDS: readonly GenericContentFieldDefinition[] = [
  { key: 'text', label: 'النص (Text Content)', control: 'textarea', rows: 3, visibility: 'when-present' },
  { key: 'title', label: 'العنوان الرئيسي (Title)', control: 'input', visibility: 'when-present' },
  { key: 'subtitle', label: 'العنوان الفرعي (Subtitle)', control: 'textarea', rows: 2, visibility: 'when-present' },
  { key: 'badge', label: 'الشارة (Badge)', control: 'input', visibility: 'when-present' },
  { key: 'icon', label: 'اسم الأيقونة (Icon Name)', control: 'input', placeholder: 'Star, ShieldCheck, Sparkles, Truck, Package...', visibility: 'when-present' },
  { key: 'price', label: 'السعر (Price)', control: 'input', visibility: 'when-present' },
];
