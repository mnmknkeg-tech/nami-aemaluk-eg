import React from 'react';
import { ArrowRight, Check, Layers } from 'lucide-react';
import type { ActivityTemplateMeta } from '../../data/allActivityTemplates';

type Props = {
  template: ActivityTemplateMeta;
  isCurrent: boolean;
  isActivationKey: (key: string) => boolean;
  onSelect: () => void;
};

export const ActivityTemplateCard: React.FC<Props> = ({
  template,
  isCurrent,
  isActivationKey,
  onSelect,
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={isCurrent}
    aria-current={isCurrent ? 'true' : undefined}
    aria-label={`${template.name}${isCurrent ? '، القالب النشط' : '، تطبيق القالب'}`}
    onKeyDown={(event) => {
      if (isActivationKey(event.key)) {
        event.preventDefault();
        onSelect();
      }
    }}
    onClick={onSelect}
    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer relative group ${
      isCurrent
        ? 'bg-blue-50/90 border-blue-500 shadow-md ring-1 ring-blue-500/50'
        : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-blue-300 hover:shadow-md'
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <div
          style={{ backgroundColor: `${template.primaryColor}15` }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border border-slate-100"
        >
          {template.icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
              {template.name}
            </h4>
            <span
              style={{ backgroundColor: template.primaryColor }}
              className="w-2 h-2 rounded-full shrink-0"
              title="لون السمة الأساسي"
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{template.category}</span>
        </div>
      </div>

      {isCurrent ? (
        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>النشط الآن</span>
        </span>
      ) : (
        <span className="opacity-100 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          تطبيق القالب
        </span>
      )}
    </div>

    <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
      {template.description}
    </p>

    {template.tags && template.tags.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 3).map((feat, idx) => (
          <span
            key={idx}
            className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[150px]"
          >
            ✓ {feat}
          </span>
        ))}
      </div>
    )}

    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-500">
      <span className="flex items-center gap-1">
        <Layers className="w-3 h-3 text-slate-400" />
        <span>قالب متكامل مع الصفحات</span>
      </span>
      <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
        <span>معاينة وتطبيق</span>
        <ArrowRight className="w-3 h-3 rotate-180" />
      </span>
    </div>
  </div>
);
