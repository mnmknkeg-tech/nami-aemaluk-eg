import type { ComponentCategory, ComponentType } from './types';
import { COMPONENT_REGISTRY, resolveComponentType } from './componentRegistry';
import { isSafeExternalUrl } from './linkDestinations';

// ============================================================
// componentPropsSchema — the behavior layer of the Component Registry
//
// Identity metadata (labels, versions, aliases) lives in
// componentRegistry.ts. This module adds the three behavior tables the
// editor needs before rendering or persisting a node:
//   • DEFAULT_PROPS        — what a freshly inserted component starts with
//   • PROPS_SCHEMA         — typed field definitions with validation rules
//   • CATEGORY_PARENT_RULES / overrides — which parents may contain what
//
// Everything here is evidence-aligned: field keys mirror the generic
// content fields the persisted templates actually carry (text, title,
// subtitle, badge, icon, price) plus the link fields the renderers read
// (url/href). Unknown components and legacy aliases always fall back to
// permissive behavior so old documents never break.
// ============================================================

export type PropFieldKind =
  'text' | 'textarea' | 'number' | 'color' | 'boolean' | 'url' | 'image' | 'icon' | 'enum';

export interface PropFieldRule {
  /** Must be present and non-empty after trimming. */
  required?: boolean;
  min?: number;
  max?: number;
  /** Regular expression the string value must match. */
  pattern?: string;
  /** Allowed values for enum fields. */
  options?: readonly string[];
  /** Arabic message shown when the pattern/URL rule fails. */
  message?: string;
}

export interface PropFieldSchema {
  key: string;
  kind: PropFieldKind;
  label: string;
  rules?: PropFieldRule;
}

export type PropIssueCode = 'required' | 'min' | 'max' | 'pattern' | 'option' | 'unsafe-url';

export interface PropIssue {
  key: string;
  code: PropIssueCode;
  message: string;
}

const SECTION_FIELDS: readonly PropFieldSchema[] = [
  { key: 'title', kind: 'text', label: 'العنوان' },
  { key: 'subtitle', kind: 'textarea', label: 'العنوان الفرعي' },
];

const LINK_FIELD: PropFieldSchema = {
  key: 'url',
  kind: 'url',
  label: 'الرابط',
  rules: {
    pattern: '^(?:#|/|\\?|https?://|mailto:|tel:)',
    message: 'الروابط الخارجية يجب أن تبدأ بـ https:// أو http:// فقط',
  },
};

const PRICING_FIELDS: readonly PropFieldSchema[] = [
  ...SECTION_FIELDS,
  { key: 'price', kind: 'number', label: 'السعر', rules: { min: 0 } },
];

/** Per-component field schemas. Only documented, observed keys. */
export const PROPS_SCHEMA: Partial<Record<ComponentType, readonly PropFieldSchema[]>> = {
  heading: [{ key: 'text', kind: 'textarea', label: 'نص العنوان' }],
  paragraph: [{ key: 'text', kind: 'textarea', label: 'النص' }],
  badge: [{ key: 'text', kind: 'text', label: 'نص الشارة' }],
  button: [{ key: 'text', kind: 'text', label: 'نص الزر', rules: { required: true } }, LINK_FIELD],
  image: [
    { key: 'url', kind: 'image', label: 'رابط الصورة' },
    { key: 'alt', kind: 'text', label: 'الوصف البديل' },
  ],
  input: [{ key: 'placeholder', kind: 'text', label: 'النص الإرشادي' }],
  spacer: [{ key: 'height', kind: 'number', label: 'الارتفاع (px)', rules: { min: 0, max: 400 } }],
  whatsapp_button: [{ key: 'phone', kind: 'text', label: 'رقم الواتساب' }],
  'whatsapp-float': [{ key: 'phone', kind: 'text', label: 'رقم الواتساب' }],
  hero: SECTION_FIELDS,
  features: SECTION_FIELDS,
  bento: SECTION_FIELDS,
  'bento-grid': SECTION_FIELDS,
  services: SECTION_FIELDS,
  'services-grid': SECTION_FIELDS,
  products: SECTION_FIELDS,
  pricing: PRICING_FIELDS,
  testimonials: SECTION_FIELDS,
  gallery: SECTION_FIELDS,
  team: SECTION_FIELDS,
  stats: SECTION_FIELDS,
  faq: SECTION_FIELDS,
  cta: SECTION_FIELDS,
  contact: SECTION_FIELDS,
  'contact-section': SECTION_FIELDS,
  footer: SECTION_FIELDS,
  'trust-badges': SECTION_FIELDS,
  trust_badges: SECTION_FIELDS,
  'promo-banner': SECTION_FIELDS,
  promo_banner: SECTION_FIELDS,
};

/** What a freshly inserted component starts with (primitives only — composite
 * sections come from the template library with their own defaults). */
export const DEFAULT_PROPS: Partial<Record<ComponentType, Readonly<Record<string, unknown>>>> = {
  heading: Object.freeze({ text: 'عنوان جديد' }),
  paragraph: Object.freeze({ text: 'اكتب النص هنا...' }),
  badge: Object.freeze({ text: 'جديد' }),
  button: Object.freeze({ text: 'اضغط هنا' }),
  image: Object.freeze({ url: '', alt: '' }),
  spacer: Object.freeze({ height: 32 }),
  input: Object.freeze({ placeholder: 'اكتب هنا...' }),
};

/**
 * Default parent-category rules: for each child category, which parent
 * categories may contain it. Missing entry = unrestricted (never blocks
 * legacy or unknown components).
 */
const CATEGORY_PARENT_RULES: Partial<Record<ComponentCategory, readonly ComponentCategory[]>> = {
  // Sections and navigation attach to page roots and layout containers.
  section: ['layout'],
  navigation: ['layout'],
  auth: ['layout'],
  commerce: ['layout'],
  // Page-level building blocks can nest anywhere structured content lives.
  layout: ['layout', 'section', 'navigation', 'commerce', 'interactive', 'auth'],
  typography: ['layout', 'section', 'navigation', 'commerce', 'interactive', 'auth', 'forms'],
  media: ['layout', 'section', 'navigation', 'commerce', 'interactive', 'auth', 'forms'],
  action: ['layout', 'section', 'navigation', 'commerce', 'interactive', 'auth', 'forms'],
  forms: ['layout', 'section', 'interactive', 'auth'],
  interactive: ['layout', 'section', 'navigation'],
  // Legacy saved category retained for old documents.
  form: ['layout', 'section', 'interactive', 'auth'],
};

/** Per-component exceptions over the category rules (empty = no exceptions). */
const COMPONENT_PARENT_OVERRIDES: Partial<Record<ComponentType, boolean>> = {};

/**
 * True when `parentType` may contain a child of `childType`.
 * Unknown or legacy-alias types resolve first; anything still unknown is
 * allowed so persisted documents with unrecognized keys are never broken.
 */
export function canParentAcceptChild(parentType: string, childType: string): boolean {
  const parent = resolveComponentType(parentType);
  const child = resolveComponentType(childType);
  if (!parent || !child) return true;

  const override = COMPONENT_PARENT_OVERRIDES[child];
  if (typeof override === 'boolean') return override;

  const childDef = COMPONENT_REGISTRY[child];
  const allowedCategories = CATEGORY_PARENT_RULES[childDef.category];
  if (!allowedCategories) return true;

  const parentCategory = COMPONENT_REGISTRY[parent].category;
  return allowedCategories.includes(parentCategory);
}

/** Field schema for a component type (canonical, alias-aware). */
export function getPropFieldSchema(type: string): readonly PropFieldSchema[] | undefined {
  const canonicalType = resolveComponentType(type);
  return canonicalType ? PROPS_SCHEMA[canonicalType] : undefined;
}

/** Frozen default props for a component type, or undefined when none exist. */
export function defaultPropsFor(type: string): Readonly<Record<string, unknown>> | undefined {
  const canonicalType = resolveComponentType(type);
  return canonicalType ? DEFAULT_PROPS[canonicalType] : undefined;
}

/** Merge registered defaults under the given props without overriding them. */
export function withDefaultProps(
  type: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const defaults = defaultPropsFor(type);
  return defaults ? { ...defaults, ...props } : props;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/**
 * Validate the given props against the component schema. Only schema
 * fields actually present in `props` are checked — the validator never
 * invents or strips data, mirroring the audit's evidence-not-authority rule.
 */
export function validatePropsAgainstSchema(
  type: string,
  props: Record<string, unknown>
): PropIssue[] {
  const schema = getPropFieldSchema(type);
  if (!schema) return [];

  const issues: PropIssue[] = [];
  for (const field of schema) {
    if (!(field.key in props)) continue;
    const value = props[field.key];
    const rules = field.rules;

    const isEmpty =
      value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    if (rules?.required && isEmpty) {
      issues.push({ key: field.key, code: 'required', message: `${field.label} مطلوب` });
      continue;
    }
    if (isEmpty) continue;

    if (field.kind === 'number') {
      const num = asNumber(value);
      if (num === undefined) {
        issues.push({
          key: field.key,
          code: 'pattern',
          message: `${field.label} يجب أن يكون رقمًا`,
        });
        continue;
      }
      if (rules?.min !== undefined && num < rules.min) {
        issues.push({
          key: field.key,
          code: 'min',
          message: `${field.label} يجب ألا يقل عن ${rules.min}`,
        });
      }
      if (rules?.max !== undefined && num > rules.max) {
        issues.push({
          key: field.key,
          code: 'max',
          message: `${field.label} يجب ألا يتجاوز ${rules.max}`,
        });
      }
      continue;
    }

    if (typeof value === 'string') {
      if (rules?.pattern && !new RegExp(rules.pattern).test(value)) {
        issues.push({
          key: field.key,
          code: field.kind === 'url' ? 'unsafe-url' : 'pattern',
          message: rules.message || `${field.label} بصيغة غير صالحة`,
        });
        continue;
      }
      if (rules?.options && !rules.options.includes(value)) {
        issues.push({
          key: field.key,
          code: 'option',
          message: `${field.label} يجب أن يكون أحد الخيارات المتاحة`,
        });
      }
      if (
        field.kind === 'url' &&
        /^(?:https?:\/\/|\/\/)/i.test(value) &&
        !isSafeExternalUrl(value)
      ) {
        issues.push({
          key: field.key,
          code: 'unsafe-url',
          message: 'رابط غير آمن — الاستضافة الخارجية https فقط',
        });
      }
    }
  }
  return issues;
}
