'use client';

import { useState } from 'react';
import { OrderFormFieldsBuilder, type OrderFormField } from './OrderFormFieldsBuilder';
import type { ChangeEvent, JSX, KeyboardEvent } from 'react';
import {
  Calendar,
  ChevronDown,
  GitFork,
  GripVertical,
  Info,
  List,
  Minus,
  Plus,
  Shirt,
  Trash2,
  X,
  FileText,
  Download,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CustomField = { id: string; key: string; value: string };

export type ProductOption = { id: string; name: string; values: string[] };

export type DigitalProductFile = {
  id: string;
  name: string;
  url?: string;
  fileSize?: string;
  downloadLimit?: number | null;
  expiryDays?: number | null;
};

export type ProductExtraData = {
  // الملفات الرقمية
  digitalFiles?: DigitalProductFile[];
  // نموذج الطلب (للخدمات)
  orderFormFields?: OrderFormField[];
  // أساسيات موسّعة (تُحفظ في extra_data)
  costPrice?: number | null;
  brand?: string;
  googleCategory?: string;
  localCategory?: string;
  youtubeUrl?: string;
  // المعلومات المتقدمة
  calories?: number | null; // السعرات الحرارية
  subtitle?: string; // العنوان الفرعي
  promoTitle?: string; // العنوان الترويجي
  // التخفيضات
  discountPrice?: number | null;
  discountStart?: string; // yyyy-mm-dd
  discountEnd?: string;
  // قنوات عرض المنتج
  channelWebsite?: boolean; // default true
  channelApp?: boolean; // default false
  // خيارات شراء المنتج
  allowFileAttachment?: boolean;
  allowCustomerNote?: boolean;
  vatApplicable?: boolean; // المنتج خاضع لضريبة القيمة المضافة
  // الوسوم
  tags?: string[];
  // الشحن
  requiresShipping?: boolean; // default true
  // المخزون
  trackInventory?: boolean; // تتبع مخزون الباقة
  stockQuantity?: number | null;
  weightGrams?: number | null;
  weightUnit?: 'جرام' | 'كيلوجرام' | 'رطل' | 'أونصة'; // default 'جرام'
  maxQtyPerCustomer?: number | null;
  sku?: string;
  barcode?: string;
  mpn?: string;
  gtin?: string;
  allowQtySelector?: boolean; // تحديد كمية الشراء (default true)
  // بيانات SEO
  seoTitle?: string;
  seoSlug?: string;
  seoDescription?: string;
  // الكميات
  unlimitedStock?: boolean; // كمية لا محدودة (default true)
  warehouseQty?: number | null; // كمية الفرع الرئيسي (للعرض فقط)
  // خيارات المنتج
  productOptions?: ProductOption[];
  // الحقول المخصصة
  customFields?: CustomField[];
  // الإشعارات
  lowStockNotifyQty?: number | null; // نبهني عند وصول الكمية إلى
  backInStockMinQty?: number | null; // default 15
  backInStockPercent?: number | null; // default 100
};

/** القيم الافتراضية للبيانات الموسّعة للمنتج */
export function defaultExtraData(): ProductExtraData {
  return {
    channelWebsite: true,
    channelApp: false,
    requiresShipping: true,
    vatApplicable: true,
    allowQtySelector: true,
    unlimitedStock: true,
    warehouseQty: 0,
    productOptions: [],
    orderFormFields: [],
    customFields: [],
    digitalFiles: [],
    backInStockMinQty: 15,
    backInStockPercent: 100,
    tags: [],
    weightGrams: null,
    weightUnit: 'جرام',
  };
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  'w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-teal-400 transition-colors';

const LABEL_CLS = 'text-xs font-bold text-slate-500';

const HELPER_CLS = 'text-[11px] leading-relaxed text-slate-400';

const HEADER_ACTION_CLS =
  'flex h-7 shrink-0 items-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 text-[11px] font-bold text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none';

const VAR_CHIP_CLS =
  'rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 focus:outline-none';

const STEPPER_BTN_CLS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus:outline-none';

type VarChip = { label: string; variable: string };

/** شرائح المتغيرات تحت العنوان الفرعي والعنوان الترويجي */
const PROMO_VAR_CHIPS: VarChip[] = [
  { label: 'نسبة الخصم: {percent}', variable: '{percent}' },
  { label: 'مبلغ الخصم: {discount}', variable: '{discount}' },
  { label: 'العلامة التجارية: {brand}', variable: '{brand}' },
];

/** شرائح المتغيرات تحت عنوان الصفحة ووصف الصفحة */
const PAGE_VAR_CHIPS: VarChip[] = [
  { label: '{Name}', variable: '{Name}' },
  { label: '{Category}', variable: '{Category}' },
  { label: '{Brand}', variable: '{Brand}' },
];

/** شرائح المتغيرات تحت الرابط المخصص */
const SLUG_VAR_CHIPS: VarChip[] = [...PAGE_VAR_CHIPS, { label: '{SKU}', variable: '{SKU}' }];

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** شريحة صغيرة تُعرض داخل حقل الإدخال (لغة / رمز / وحدة) */
function Chip({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="flex h-6 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-bold text-slate-500">
      {children}
    </span>
  );
}

/** شريحة اللغة "AR ⌄" داخل حقول النصوص الترويجية */
function LangChip(): JSX.Element {
  return (
    <Chip>
      AR
      <ChevronDown size={10} className="text-slate-400" aria-hidden />
    </Chip>
  );
}

/** تسمية حقل: أيقونة معلومات أو نجمة حمراء للحقول المطلوبة */
function FieldLabel({ label, required }: { label: string; required?: boolean }): JSX.Element {
  return (
    <span className="flex items-center gap-1">
      <span className={LABEL_CLS}>{label}</span>
      {required ? (
        <span aria-hidden className="text-[13px] font-bold leading-none text-red-500">
          *
        </span>
      ) : (
        <Info size={13} className="shrink-0 text-slate-300" aria-hidden />
      )}
    </span>
  );
}

function Field({
  label,
  helper,
  required,
  chips,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  chips?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block space-y-1.5">
        <FieldLabel label={label} required={required} />
        {children}
      </label>
      {chips ? <div className="mt-1.5">{chips}</div> : null}
      {helper ? <span className={`${HELPER_CLS} mt-1 block`}>{helper}</span> : null}
    </div>
  );
}

function CheckboxField({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 accent-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      </label>
      {helper ? <p className={`${HELPER_CLS} mt-1 pr-7`}>{helper}</p> : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  rightChip,
}: {
  value: number | null | undefined;
  onChange: (next: number | null) => void;
  suffix?: string;
  placeholder?: string;
  rightChip?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        className={`${INPUT_CLS}${suffix ? (suffix === '%' ? ' pl-8' : ' pl-14') : ''}${
          rightChip ? ' pr-10' : ''
        }`}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
      />
      {rightChip ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <Chip>{rightChip}</Chip>
        </span>
      ) : null}
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
          <Chip>{suffix}</Chip>
        </span>
      ) : null}
    </div>
  );
}

/** حقل نصي مع شريحة اللغة "AR ⌄" على الحافة اليمنى */
function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <div className="relative">
      <input
        type="text"
        className={`${INPUT_CLS} pr-14`}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <LangChip />
      </span>
    </div>
  );
}

/** حقل تاريخ مع أيقونة تقويم إرشادية على الحافة اليمنى */
function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}): JSX.Element {
  return (
    <div className="relative">
      <input
        type="date"
        className={`${INPUT_CLS} pr-9`}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      <Calendar
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300"
        aria-hidden
      />
    </div>
  );
}

/** شرائح متغيرات قابلة للنقر تُلحق قيمتها بالنص */
function VarChips({ chips, onPick }: { chips: VarChip[]; onPick: (variable: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <button key={chip.label} type="button" onClick={() => onPick(chip.variable)} className={VAR_CHIP_CLS}>
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-3 bg-[#E0F7F6]/50 hover:bg-[#E0F7F6]/80 px-4 py-3 text-right transition-colors focus:outline-none"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-teal-500 font-bold select-none text-base">❖</span>
          <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action ? (
            <div
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {action}
            </div>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-teal-600 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </div>
      </div>
      {open ? <div className="space-y-3 bg-white p-4">{children}</div> : null}
    </div>
  );
}

/** صف خيار منتج: اسم الخيار + محرر قيم بوسوم + حذف */
function OptionRow({
  option,
  onChange,
  onDelete,
}: {
  option: ProductOption;
  onChange: (next: ProductOption) => void;
  onDelete: () => void;
}): JSX.Element {
  const [draft, setDraft] = useState('');

  const addValue = () => {
    const val = draft.trim();
    setDraft('');
    if (!val || option.values.includes(val)) return;
    onChange({ ...option, values: [...option.values, val] });
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <FieldLabel label="اسم الخيار" />
          <input
            type="text"
            className={INPUT_CLS}
            value={option.name}
            placeholder="مثال: نوع الورق أو المقاس"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...option, name: e.target.value })
            }
          />
        </div>
        <button
          type="button"
          aria-label="حذف الخيار"
          onClick={onDelete}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 focus:outline-none"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="space-y-1">
        <FieldLabel label="القيم" />
        <input
          type="text"
          className={INPUT_CLS}
          value={draft}
          placeholder="اكتب قيمة ثم اضغط Enter"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addValue();
            }
          }}
        />
        {option.values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {option.values.map((val) => (
              <span
                key={val}
                className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700"
              >
                {val}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...option, values: option.values.filter((v) => v !== val) })
                  }
                  aria-label={`حذف القيمة ${val}`}
                  className="text-teal-400 transition-colors hover:text-teal-700"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const SECTION_TITLES = [
  'المعلومات المتقدمة',
  'التخفيضات',
  'قنوات عرض المنتج',
  'خيارات شراء المنتج',
  'الوسوم',
  'الشحن',
  'المخزون',
  'بيانات SEO',
  'الكميات',
  'الخيارات',
  'نموذج الطلب',
  'الملفات',
  'الحقول المخصصة',
  'الإشعارات',
] as const;

type SectionId = (typeof SECTION_TITLES)[number];

export function ExtendedProductSections({
  value,
  onChange,
  showOrderForm = true,
  showCalories = false,
  showProductOptions = true,
  showShipping = true,
  showInventory = true,
  showQuantities = true,
  showFiles = false,
  showNotifications = true,
}: {
  value: ProductExtraData;
  onChange: (next: ProductExtraData) => void;
  showOrderForm?: boolean;
  showCalories?: boolean;
  showProductOptions?: boolean;
  showShipping?: boolean;
  showInventory?: boolean;
  showQuantities?: boolean;
  showFiles?: boolean;
  showNotifications?: boolean;
}): JSX.Element {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(SECTION_TITLES)
  );

  const toggle = (id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const set = <K extends keyof ProductExtraData>(field: K, next: ProductExtraData[K]) => {
    onChange({ ...value, [field]: next });
  };

  const isOpen = (id: SectionId) => openSections.has(id);

  const appendVar = (
    field: 'subtitle' | 'promoTitle' | 'seoTitle' | 'seoSlug' | 'seoDescription',
    variable: string
  ) => {
    const current = value[field] ?? '';
    const next =
      current && !current.endsWith(' ') ? `${current} ${variable}` : current + variable;
    set(field, next);
  };

  const tagInputId = 'ext-tags-input';

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const tags = value.tags ?? [];
    if (tags.includes(tag)) return;
    set('tags', [...tags, tag]);
    const input = document.getElementById(tagInputId) as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const removeTag = (tag: string) => {
    set(
      'tags',
      (value.tags ?? []).filter((t) => t !== tag)
    );
  };

  const addProductOption = () => {
    set('productOptions', [
      ...(value.productOptions ?? []),
      { id: makeId(), name: '', values: [] },
    ]);
  };

  const updateProductOption = (id: string, next: ProductOption) => {
    set(
      'productOptions',
      (value.productOptions ?? []).map((o) => (o.id === id ? next : o))
    );
  };

  const removeProductOption = (id: string) => {
    set(
      'productOptions',
      (value.productOptions ?? []).filter((o) => o.id !== id)
    );
  };

  const unlimitedStock = value.unlimitedStock ?? true;
  const warehouseQty = value.warehouseQty ?? 0;

  return (
    <div className="space-y-3" dir="rtl">
      {/* 1. المعلومات المتقدمة */}
      <Section
        title="المعلومات المتقدمة"
        open={isOpen('المعلومات المتقدمة')}
        onToggle={() => toggle('المعلومات المتقدمة')}
      >
        {showCalories ? (
          <Field label="السعرات الحرارية">
            <NumberInput
              value={value.calories}
              onChange={(next) => set('calories', next)}
              suffix="سعرة"
              placeholder="0"
            />
          </Field>
        ) : null}
        <Field
          label="العنوان الفرعي"
          chips={
            <VarChips chips={PROMO_VAR_CHIPS} onPick={(v) => appendVar('subtitle', v)} />
          }
        >
          <TextField
            value={value.subtitle ?? ''}
            onChange={(next) => set('subtitle', next)}
            placeholder="يظهر تحت اسم المنتج في صفحة المنتج"
          />
        </Field>
        <Field
          label="العنوان الترويجي"
          chips={
            <VarChips chips={PROMO_VAR_CHIPS} onPick={(v) => appendVar('promoTitle', v)} />
          }
        >
          <TextField
            value={value.promoTitle ?? ''}
            onChange={(next) => set('promoTitle', next)}
            placeholder="مثال: الأكثر مبيعاً"
          />
        </Field>
      </Section>

      {/* 2. التخفيضات */}
      <Section title="التخفيضات" open={isOpen('التخفيضات')} onToggle={() => toggle('التخفيضات')}>
        <Field label="السعر المخفض">
          <NumberInput
            value={value.discountPrice}
            onChange={(next) => set('discountPrice', next)}
            rightChip="#"
            placeholder="0.00"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="تاريخ بداية التخفيض">
            <DateInput
              value={value.discountStart ?? ''}
              onChange={(next) => set('discountStart', next)}
            />
          </Field>
          <Field label="تاريخ نهاية التخفيض">
            <DateInput
              value={value.discountEnd ?? ''}
              onChange={(next) => set('discountEnd', next)}
            />
          </Field>
        </div>
      </Section>

      {/* 3. قنوات عرض المنتج */}
      <Section
        title="قنوات عرض المنتج"
        open={isOpen('قنوات عرض المنتج')}
        onToggle={() => toggle('قنوات عرض المنتج')}
      >
        <CheckboxField
          label="موقع المتجر"
          checked={value.channelWebsite ?? false}
          onChange={(next) => set('channelWebsite', next)}
        />
        <CheckboxField
          label="تطبيق المتجر"
          checked={value.channelApp ?? false}
          onChange={(next) => set('channelApp', next)}
        />
      </Section>

      {/* 4. خيارات شراء المنتج */}
      <Section
        title="خيارات شراء المنتج"
        open={isOpen('خيارات شراء المنتج')}
        onToggle={() => toggle('خيارات شراء المنتج')}
      >
        <CheckboxField
          label="إتاحة إرفاق ملف عند الطلب"
          checked={value.allowFileAttachment ?? false}
          onChange={(next) => set('allowFileAttachment', next)}
        />
        <CheckboxField
          label="إتاحة كتابة ملاحظة"
          checked={value.allowCustomerNote ?? false}
          onChange={(next) => set('allowCustomerNote', next)}
        />
        <CheckboxField
          label="المنتج خاضع لضريبة القيمة المضافة"
          checked={value.vatApplicable ?? false}
          onChange={(next) => set('vatApplicable', next)}
        />
      </Section>

      {/* 5. الوسوم */}
      <Section title="الوسوم" open={isOpen('الوسوم')} onToggle={() => toggle('الوسوم')}>
        <div className="flex gap-2">
          <input
            id={tagInputId}
            type="text"
            className={INPUT_CLS}
            placeholder="اكتب وسمًا ثم اضغط Enter"
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(e.currentTarget.value);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById(tagInputId) as HTMLInputElement | null;
              if (input) addTag(input.value);
            }}
            className="h-10 shrink-0 rounded-xl bg-teal-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-teal-700 focus:outline-none"
          >
            إضافة
          </button>
        </div>
        {(value.tags ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(value.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-100"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`حذف الوسم ${tag}`}
                  className="text-teal-400 transition-colors hover:text-teal-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </Section>

      {/* 6. الشحن */}
      {showShipping ? (
        <Section title="الشحن" open={isOpen('الشحن')} onToggle={() => toggle('الشحن')}>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'يتطلب شحن', val: true },
              { label: 'لا يتطلب شحن', val: false },
            ].map((opt) => (
              <label key={opt.label} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="ext-requires-shipping"
                  checked={(value.requiresShipping ?? true) === opt.val}
                  onChange={() => set('requiresShipping', opt.val)}
                  className="h-4 w-4 accent-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <span className="text-[13px] font-semibold text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </Section>
      ) : null}

      {/* 7. المخزون */}
      {showInventory ? (
        <Section title="المخزون" open={isOpen('المخزون')} onToggle={() => toggle('المخزون')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="وزن المنتج *" required>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={INPUT_CLS}
                    value={value.weightGrams ?? ''}
                    placeholder="0"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      set('weightGrams', raw === '' ? null : Number(raw));
                    }}
                  />
                </div>
                <select
                  value={value.weightUnit || 'جرام'}
                  onChange={(e) => set('weightUnit', e.target.value as any)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 focus:outline-none focus:border-teal-400 shrink-0"
                >
                  <option value="جرام">جرام</option>
                  <option value="كيلوجرام">كيلوجرام</option>
                  <option value="رطل">رطل</option>
                  <option value="أونصة">أونصة</option>
                </select>
              </div>
            </Field>
            <Field label="أقصى كمية لكل عميل">
              <NumberInput
                value={value.maxQtyPerCustomer}
                onChange={(next) => set('maxQtyPerCustomer', next)}
                placeholder="0"
              />
            </Field>
            <Field label="رمز التخزين SKU">
              <input
                type="text"
                className={INPUT_CLS}
                value={value.sku ?? ''}
                onChange={(e) => set('sku', e.target.value)}
              />
            </Field>
            <Field label="الباركود">
              <input
                type="text"
                className={INPUT_CLS}
                value={value.barcode ?? ''}
                onChange={(e) => set('barcode', e.target.value)}
              />
            </Field>
            <Field label="رمز MPN">
              <input
                type="text"
                className={INPUT_CLS}
                value={value.mpn ?? ''}
                onChange={(e) => set('mpn', e.target.value)}
              />
            </Field>
            <Field label="رمز GTIN">
              <input
                type="text"
                className={INPUT_CLS}
                value={value.gtin ?? ''}
                onChange={(e) => set('gtin', e.target.value)}
              />
            </Field>
          </div>
          <CheckboxField
            label="تحديد كمية الشراء"
            helper="يتيح للعميل اختيار الكمية التي يريد شراءها عبر عدَّاد يظهر في صفحة المنتج."
            checked={value.allowQtySelector ?? false}
            onChange={(next) => set('allowQtySelector', next)}
          />
        </Section>
      ) : null}

      {/* 8. بيانات SEO */}
      <Section title="بيانات SEO" open={isOpen('بيانات SEO')} onToggle={() => toggle('بيانات SEO')}>
        <Field
          label="عنوان الصفحة"
          chips={<VarChips chips={PAGE_VAR_CHIPS} onPick={(v) => appendVar('seoTitle', v)} />}
        >
          <TextField
            value={value.seoTitle ?? ''}
            onChange={(next) => set('seoTitle', next)}
            placeholder="{اسم المنتج} - {التصنيف} | {اسم المتجر}"
          />
        </Field>
        <Field
          label="رابط مخصص"
          chips={<VarChips chips={SLUG_VAR_CHIPS} onPick={(v) => appendVar('seoSlug', v)} />}
        >
          <div
            dir="ltr"
            className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-teal-400"
          >
            <span className="flex select-none items-center border-e border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-400">
              ar/p/
            </span>
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                className="h-10 w-full bg-transparent pl-3 pr-14 text-[13px] font-semibold text-slate-900 focus:outline-none"
                value={value.seoSlug ?? ''}
                onChange={(e) => set('seoSlug', e.target.value)}
                placeholder="product-slug"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <LangChip />
              </span>
            </div>
          </div>
        </Field>
        <Field
          label="وصف الصفحة"
          chips={
            <VarChips chips={PAGE_VAR_CHIPS} onPick={(v) => appendVar('seoDescription', v)} />
          }
        >
          <div className="relative">
            <textarea
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white pl-3 pr-14 py-2 text-[13px] font-semibold leading-relaxed text-slate-900 focus:outline-none focus:border-teal-400"
              value={value.seoDescription ?? ''}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
            <span className="pointer-events-none absolute right-2 top-2 flex items-center">
              <LangChip />
            </span>
          </div>
        </Field>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className={`${LABEL_CLS} mb-1`}>معاينة</p>
          <p dir="ltr" className="truncate text-[12px] font-semibold text-slate-400">
            https://yourstore.com/ar/p/{value.seoSlug?.trim() || '...'}
          </p>
        </div>
      </Section>

      {/* 9. الكميات */}
      {showQuantities ? (
        <Section title="الكميات" open={isOpen('الكميات')} onToggle={() => toggle('الكميات')}>
          <CheckboxField
            label="كمية لا محدودة"
            checked={unlimitedStock}
            onChange={(next) => set('unlimitedStock', next)}
          />
          {unlimitedStock ? null : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="الفرع أو المستودع">
                <select defaultValue="الرئيسي" className={INPUT_CLS}>
                  <option value="الرئيسي">الرئيسي</option>
                </select>
              </Field>
              <Field label="الكمية">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="إنقاص الكمية"
                    onClick={() => set('warehouseQty', Math.max(0, warehouseQty - 1))}
                    className={STEPPER_BTN_CLS}
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <div className="flex h-10 min-w-14 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-bold tabular-nums text-slate-900">
                    {warehouseQty}
                  </div>
                  <button
                    type="button"
                    aria-label="زيادة الكمية"
                    onClick={() => set('warehouseQty', warehouseQty + 1)}
                    className={STEPPER_BTN_CLS}
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
              </Field>
            </div>
          )}
        </Section>
      ) : null}

      {/* 10. الخيارات */}
      {showProductOptions ? (
        <Section
          title="الخيارات"
          open={isOpen('الخيارات')}
          onToggle={() => toggle('الخيارات')}
          action={
            <button type="button" onClick={addProductOption} className={HEADER_ACTION_CLS}>
              <span aria-hidden>＋</span>
              إضافة خيار
            </button>
          }
        >
          {(value.productOptions ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-8 text-center bg-slate-50/50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-300 mb-1">
                <Shirt size={32} className="text-slate-300" aria-hidden />
              </div>
              <p className="text-[13px] font-bold text-slate-400">لا توجد خيارات منتج</p>
            </div>
          ) : (
            (value.productOptions ?? []).map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onChange={(next) => updateProductOption(option.id, next)}
                onDelete={() => removeProductOption(option.id)}
              />
            ))
          )}
        </Section>
      ) : null}

      {/* 11. نموذج الطلب */}
      {showOrderForm ? (
        <Section
          title="نموذج الطلب"
          open={isOpen('نموذج الطلب')}
          onToggle={() => toggle('نموذج الطلب')}
          action={
            <button
              type="button"
              onClick={() => {
                const newField: OrderFormField = {
                  id: makeId(),
                  label: '',
                  type: 'text',
                  required: false,
                };
                set('orderFormFields', [...(value.orderFormFields ?? []), newField]);
              }}
              className={HEADER_ACTION_CLS}
            >
              <span aria-hidden>＋</span>
              حقل جديد
            </button>
          }
        >
          <OrderFormFieldsBuilder
            value={value.orderFormFields ?? []}
            onChange={(fields) => set('orderFormFields', fields)}
          />
        </Section>
      ) : null}

      {/* 12. الملفات */}
      {showFiles ? (
        <Section
          title="الملفات"
          open={isOpen('الملفات')}
          onToggle={() => toggle('الملفات')}
          action={
            <button
              type="button"
              onClick={() => {
                const newFile: DigitalProductFile = {
                  id: makeId(),
                  name: '',
                  url: '',
                  downloadLimit: null,
                  expiryDays: null,
                };
                set('digitalFiles', [...(value.digitalFiles ?? []), newFile]);
              }}
              className={HEADER_ACTION_CLS}
            >
              <span aria-hidden>＋</span>
              إضافة ملف
            </button>
          }
        >
          {(value.digitalFiles ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-8 text-center bg-slate-50/50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-300 mb-1">
                <Download size={32} className="text-slate-300" aria-hidden />
              </div>
              <p className="text-[13px] font-bold text-slate-400">لا توجد ملفات مرفقة بعد</p>
              <p className="text-[11px] text-slate-400">
                أضف ملفات أو روابط رقمية ليتم تسليمها تلقائياً للعميل بعد الدفع
              </p>
            </div>
          ) : (
            (value.digitalFiles ?? []).map((file) => (
              <div
                key={file.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 space-y-1 text-right">
                    <FieldLabel label="اسم الملف المعروض للعميل" required />
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={file.name}
                      placeholder="مثال: كتاب البرمجة بصيغة PDF أو دورة التصميم"
                      onChange={(e) =>
                        set(
                          'digitalFiles',
                          (value.digitalFiles ?? []).map((f) =>
                            f.id === file.id ? { ...f, name: e.target.value } : f
                          )
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'digitalFiles',
                        (value.digitalFiles ?? []).filter((f) => f.id !== file.id)
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:text-red-500 bg-white"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1 text-right">
                    <FieldLabel label="رابط التحميل أو الملف" required />
                    <input
                      type="url"
                      dir="ltr"
                      className={INPUT_CLS}
                      value={file.url ?? ''}
                      placeholder="https://drive.google.com/..."
                      onChange={(e) =>
                        set(
                          'digitalFiles',
                          (value.digitalFiles ?? []).map((f) =>
                            f.id === file.id ? { ...f, url: e.target.value } : f
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <FieldLabel label="أقصى مرات تحميل" />
                    <input
                      type="number"
                      min="1"
                      className={INPUT_CLS}
                      value={file.downloadLimit ?? ''}
                      placeholder="غير محدود"
                      onChange={(e) =>
                        set(
                          'digitalFiles',
                          (value.digitalFiles ?? []).map((f) =>
                            f.id === file.id
                              ? {
                                  ...f,
                                  downloadLimit: e.target.value ? Number(e.target.value) : null,
                                }
                              : f
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <FieldLabel label="صلاحية الرابط (أيام)" />
                    <input
                      type="number"
                      min="1"
                      className={INPUT_CLS}
                      value={file.expiryDays ?? ''}
                      placeholder="دائم"
                      onChange={(e) =>
                        set(
                          'digitalFiles',
                          (value.digitalFiles ?? []).map((f) =>
                            f.id === file.id
                              ? {
                                  ...f,
                                  expiryDays: e.target.value ? Number(e.target.value) : null,
                                }
                              : f
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </Section>
      ) : null}

      {/* 13. الحقول المخصصة */}
      <Section
        title="الحقول المخصصة"
        open={isOpen('الحقول المخصصة')}
        onToggle={() => toggle('الحقول المخصصة')}
        action={
          <button
            type="button"
            onClick={() =>
              set('customFields', [
                ...(value.customFields ?? []),
                { id: makeId(), key: '', value: '' },
              ])
            }
            className={HEADER_ACTION_CLS}
          >
            <span aria-hidden>＋</span>
            إضافة القسم
            <ChevronDown size={12} className="text-teal-600" />
          </button>
        }
      >
        {(value.customFields ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-8 text-center bg-slate-50/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-300 mb-1">
              <GitFork size={32} className="text-slate-300" aria-hidden />
            </div>
            <p className="text-[13px] font-bold text-slate-400">لم تُضَف أقسام بعد</p>
          </div>
        ) : (
          (value.customFields ?? []).map((field) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <FieldLabel label="المفتاح" />
                <input
                  type="text"
                  className={INPUT_CLS}
                  value={field.key}
                  placeholder="مثال: صيغة الملف"
                  onChange={(e) =>
                    set(
                      'customFields',
                      (value.customFields ?? []).map((cf) =>
                        cf.id === field.id ? { ...cf, key: e.target.value } : cf
                      )
                    )
                  }
                />
              </div>
              <div className="flex-1 space-y-1">
                <FieldLabel label="القيمة" />
                <input
                  type="text"
                  className={INPUT_CLS}
                  value={field.value}
                  placeholder="مثال: PDF + فيديو مسجل"
                  onChange={(e) =>
                    set(
                      'customFields',
                      (value.customFields ?? []).map((cf) =>
                        cf.id === field.id ? { ...cf, value: e.target.value } : cf
                      )
                    )
                  }
                />
              </div>
              <button
                type="button"
                aria-label="حذف الحقل المخصص"
                onClick={() =>
                  set(
                    'customFields',
                    (value.customFields ?? []).filter((cf) => cf.id !== field.id)
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </Section>

      {/* 14. الإشعارات */}
      {showNotifications ? (
        <Section title="الإشعارات" open={isOpen('الإشعارات')} onToggle={() => toggle('الإشعارات')}>
          <Field label="نبّهني عند وصول كمية المنتج إلى">
            <NumberInput
              value={value.lowStockNotifyQty}
              onChange={(next) => set('lowStockNotifyQty', next)}
              suffix="قطعة"
              placeholder="0"
            />
          </Field>
          <Field
            label="إشعار العملاء المشتركين في 'أعلمني عند التوفر' عند توفر كمية أكبر من"
            helper="لتجنب إرسال الإشعارات عند توفر كمية محدودة لا تكفي جميع المشتركين، سيتم الإشعار فقط عند توفر كمية أكبر من هذه القيمة. القيمة الافتراضية 15."
          >
            <NumberInput
              value={value.backInStockMinQty}
              onChange={(next) => set('backInStockMinQty', next)}
              suffix="قطعة"
              placeholder="15"
            />
          </Field>
          <Field label="نسبة العملاء المُراد إشعارهم">
            <NumberInput
              value={value.backInStockPercent}
              onChange={(next) => set('backInStockPercent', next)}
              suffix="%"
              placeholder="100"
            />
          </Field>
        </Section>
      ) : null}
    </div>
  );
}

export default ExtendedProductSections;
