'use client';

import { Lock, Check, SkipForward } from 'lucide-react';
import {
  BOOKING_ACTIVITIES,
  MODULE_DEFINITIONS,
  withoutLocalOnly,
  type ModuleId,
} from '@/lib/moduleConfig';
import { getBaseModules } from '@/lib/activityQuestions';
import type { ActivityWithGroup } from '@/lib/activities';
import LivePreview from './LivePreview';

interface ModulesStepProps {
  selectedActivity: ActivityWithGroup;
  manualModules: ModuleId[];
  onToggleModule: (id: ModuleId) => void;
  skipped: boolean;
  previewBase: ModuleId[];
  previewAdded: ModuleId[];
  onResetToBase: () => void;
}

export default function ModulesStep({
  selectedActivity,
  manualModules,
  onToggleModule,
  skipped,
  previewBase,
  previewAdded,
  onResetToBase,
}: ModulesStepProps) {
  if (!selectedActivity) return null;
  const BASE = getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id));
  const baseSet = new Set<string>(BASE.map(String));
  const options = withoutLocalOnly(MODULE_DEFINITIONS.filter((m) => m.optional));
  const isActive = (id: ModuleId) => manualModules.map(String).includes(String(id));
  const activeCount = options.filter((m) => isActive(m.id)).length;
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="signup-card p-5 md:p-8 text-center">
        <h2 className="text-xl font-black text-slate-900 mb-1">اختار الأقسام اللي تناسبك</h2>
        <p className="text-slate-400 font-bold text-xs mb-6">
          {skipped
            ? 'تخطيت الأسئلة — فعّل بنفسك الأقسام والأزرار اللي محتاجها، والأساسيات متفعّلة لوحدها'
            : 'دي الأقسام اللي اخترناها من إجاباتك — عدّل عليها براحتك قبل ما تكمل'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-right">
          {options.map((m) => {
            const Icon = m.icon;
            const active = isActive(m.id);
            const isBase = baseSet.has(String(m.id));
            return (
              <button
                key={String(m.id)}
                type="button"
                disabled={isBase}
                aria-pressed={active || isBase}
                title={isBase ? 'أساسي لنشاطك — مفعّل دائمًا' : undefined}
                onClick={() => onToggleModule(m.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                  isBase
                    ? 'border-slate-900/10 bg-slate-50 cursor-default'
                    : active
                      ? 'border-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_8px_24px_-8px_rgba(0,229,255,0.5)]'
                      : 'border-slate-100 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${m.color}1A`, color: m.color }}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-sm text-slate-900 truncate">
                    {m.nameAr || m.name}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 truncate">
                    {isBase ? 'أساسي لنشاطك — مفعّل دائمًا' : m.descriptionAr || m.description}
                  </span>
                </span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    active || isBase
                      ? 'bg-[#00E5FF] border-[#00E5FF] text-white'
                      : 'border-slate-200 text-transparent'
                  }`}
                >
                  {isBase ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-bold text-slate-300 mt-4">
          {activeCount} قسم اختياري مفعّل · الأساسيات ({BASE.length}) بتتضاف تلقائيًا مع الاعتماديات
        </p>
      </div>

      <LivePreview
        base={previewBase}
        added={previewAdded}
        sticky={false}
        hint="الأزرار السماوية هي اللي ضفتها بنفسك — أي قسم تقفله بيتشال هو وكل الأزرار اللي بتعتمد عليه"
      />

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onResetToBase}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 text-xs font-black transition-all"
        >
          <SkipForward className="w-4 h-4" />
          صفّر اختياراتي — الأساسيات بس
        </button>
        <p className="text-[10px] font-bold text-slate-300 mt-2">
          {skipped
            ? 'الأساسيات متفعّلة — زوّد عليها اللي يناسبك'
            : 'مش إجباري تعدّل — كمل زي ما هي'}
        </p>
      </div>
    </div>
  );
}
