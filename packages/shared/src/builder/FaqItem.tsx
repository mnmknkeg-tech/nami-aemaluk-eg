import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { resolveTheme } from './theme';

/** Reusable accordion row used by the published site's FAQ section. */
export const FaqItem: React.FC<{
  question: string;
  answer: string;
  theme: ReturnType<typeof resolveTheme>;
}> = ({ question, answer, theme }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
      style={{ borderColor: open ? theme.colors.primary + '40' : undefined }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-bold text-slate-900 flex-1">{question}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: open ? theme.colors.primary : '#f1f5f9',
            color: open ? '#fff' : '#64748b',
          }}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
};
