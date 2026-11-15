'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Check, SlidersHorizontal, SkipForward } from 'lucide-react';
import type { ActivityQuestion } from '@/lib/activityQuestions';
import type { ModuleId } from '@/lib/moduleConfig';
import type { ActivityWithGroup } from '@/lib/activities';
import { ACTIVITY_ICONS, getActivityLabel } from './constants';
import LivePreview from './LivePreview';

interface QuestionsStepProps {
  selectedActivity: ActivityWithGroup;
  questions: ActivityQuestion[];
  answers: Record<string, string[]>;
  onToggleAnswer: (q: ActivityQuestion, optionId: string) => void;
  answeredCount: number;
  previewBase: ModuleId[];
  previewAdded: ModuleId[];
  onManual: () => void;
  onSkip: () => void;
}

export default function QuestionsStep({
  selectedActivity,
  questions,
  answers,
  onToggleAnswer,
  answeredCount,
  previewBase,
  previewAdded,
  onManual,
  onSkip,
}: QuestionsStepProps) {
  if (!selectedActivity) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black mb-3">
          <span>{selectedActivity.icon || ACTIVITY_ICONS[selectedActivity.id] || '🏷️'}</span>
          {getActivityLabel(selectedActivity)}
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1.5">سؤالين سريعين ونظبطلك كل حاجة</h2>
        <p className="text-slate-400 font-bold text-xs md:text-sm">
          بناءً على إجاباتك هنفتح الأزرار اللي محتاجها فعلاً — والباقي كل هيتلاقي في الترقية لما
          تحتاجه
        </p>
      </div>

      {questions.map((q, idx) => {
        const selected = answers[q.id] || [];
        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="signup-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4 text-[#00E5FF]" />
              <h3 className="font-black text-slate-900 text-sm">{q.question}</h3>
              {selected.length > 0 && (
                <span className="mr-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  تم ✓
                </span>
              )}
            </div>
            {q.hint && <p className="text-[11px] font-bold text-slate-400 mb-3">{q.hint}</p>}
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const active = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onToggleAnswer(q, opt.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {active && <Check className="w-3.5 h-3.5 text-[#00E5FF]" strokeWidth={3} />}
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Live dashboard preview */}
      <LivePreview base={previewBase} added={previewAdded} />

      {/* Option to customize manually OR skip */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onManual}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-[#00E5FF]/60 text-slate-800 hover:bg-[#00E5FF]/10 text-xs font-black transition-all shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#00E5FF]" />
          أو اختار الأقسام يدوياً ⚙️
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 text-xs font-black transition-all"
        >
          <SkipForward className="w-4 h-4" />
          تخطي الأسئلة للأقسام الأساسية بس
        </button>
      </div>
      <p className="text-center text-[10px] font-bold text-slate-400 mt-2">
        أسئلة {answeredCount} من {questions.length} مُجابة · مش إجباري تجاوب على كله
      </p>
    </div>
  );
}
