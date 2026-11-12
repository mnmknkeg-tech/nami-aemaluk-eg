'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { ClipboardList, Trash2, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type OrderFormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';

export type OrderFormField = {
  id: string;
  label: string; // عنوان الحقل (سؤال للعميل)
  type: OrderFormFieldType; // default 'text'
  options?: string[]; // only used when type === 'select'
  required: boolean; // default false
};

type OrderFormFieldsBuilderProps = {
  value: OrderFormField[];
  onChange: (next: OrderFormField[]) => void;
};

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  'w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold focus:outline-none focus:border-teal-400';

const SELECT_CLS =
  'h-10 w-36 shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-[13px] font-semibold focus:outline-none focus:border-teal-400';

const TYPE_OPTIONS: Array<{ value: OrderFormFieldType; label: string }> = [
  { value: 'text', label: 'نص قصير' },
  { value: 'textarea', label: 'نص طويل' },
  { value: 'number', label: 'رقم' },
  { value: 'date', label: 'تاريخ' },
  { value: 'select', label: 'قائمة اختيار' },
  { value: 'file', label: 'إرفاق ملف / تصميم' },
];

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Field card                                                          */
/* ------------------------------------------------------------------ */

type FieldCardProps = {
  field: OrderFormField;
  onUpdate: (patch: Partial<Omit<OrderFormField, 'id'>>) => void;
  onRemove: () => void;
};

function FieldCard({ field, onUpdate, onRemove }: FieldCardProps): JSX.Element {
  const [optionDraft, setOptionDraft] = useState('');
  const options = field.options ?? [];

  const addOption = () => {
    const option = optionDraft.trim();
    if (!option) return;
    if (!options.includes(option)) {
      onUpdate({ options: [...options, option] });
    }
    setOptionDraft('');
  };

  const removeOption = (option: string) => {
    onUpdate({ options: options.filter((o) => o !== option) });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* الصف الأول: عنوان الحقل + النوع + الحذف */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="مثال: رقم الهاتف / العنوان / لون الشعر..."
          className={INPUT_CLS}
        />
        <select
          value={field.type}
          onChange={(e) => onUpdate({ type: e.target.value as OrderFormFieldType })}
          className={SELECT_CLS}
          aria-label="نوع الحقل"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف الحقل"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* الصف الثاني: إجباري؟ */}
      <div className="mt-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-slate-600">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-4 w-4 rounded accent-teal-600"
          />
          إجباري؟
        </label>
      </div>

      {/* محرر الخيارات (للقوائم فقط) */}
      {field.type === 'select' ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={optionDraft}
              onChange={(e) => setOptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="اكتب الخيار ثم اضغط Enter"
              className="h-9 w-full px-3 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold focus:outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={addOption}
              className="h-9 shrink-0 rounded-xl bg-teal-600 px-3 text-xs font-bold text-white transition-colors hover:bg-teal-700 focus:outline-none"
            >
              ＋ إضافة خيار
            </button>
          </div>
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {options.map((option, index) => (
                <span
                  key={`${option}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700"
                >
                  {option}
                  <button
                    type="button"
                    onClick={() => removeOption(option)}
                    aria-label={`حذف الخيار ${option}`}
                    className="text-teal-400 transition-colors hover:text-teal-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

export function OrderFormFieldsBuilder({
  value,
  onChange,
}: OrderFormFieldsBuilderProps): JSX.Element {
  const addField = () => {
    const field: OrderFormField = { id: makeId(), label: '', type: 'text', required: false };
    onChange([...value, field]);
  };

  const updateField = (id: string, patch: Partial<Omit<OrderFormField, 'id'>>) => {
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
          <ClipboardList className="h-8 w-8 text-slate-300" />
          <p className="text-[13px] font-bold text-slate-400">أضف أول حقل لنموذج الطلب</p>
          <button
            type="button"
            onClick={addField}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[13px] font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none"
          >
            ＋ حقل جديد
          </button>
        </div>
      ) : (
        value.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            onUpdate={(patch) => updateField(field.id, patch)}
            onRemove={() => removeField(field.id)}
          />
        ))
      )}

      {/* زر إضافة حقل جديد — مرئي دائمًا */}
      <button
        type="button"
        onClick={addField}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-[13px] font-bold text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600 focus:outline-none"
      >
        ＋ حقل جديد
      </button>
    </div>
  );
}
