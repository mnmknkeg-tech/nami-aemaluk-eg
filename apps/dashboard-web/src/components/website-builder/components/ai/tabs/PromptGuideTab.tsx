import React from 'react';
import { Zap, Check, Copy, ArrowRight } from 'lucide-react';
import { PromptMasterFormula } from '../types';

interface PromptGuideTabProps {
  promptMasterFormulas: PromptMasterFormula[];
  copiedFormula: string | null;
  handleCopyFormula: (text: string, id: string) => void;
  setFullSitePrompt: (p: string) => void;
  setActiveTab: (t: 'patch' | 'full_site' | 'prompt_guide') => void;
}

export const PromptGuideTab: React.FC<PromptGuideTabProps> = ({
  promptMasterFormulas,
  copiedFormula,
  handleCopyFormula,
  setFullSitePrompt,
  setActiveTab,
}) => {
  return (
                <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-purple-900 text-xs leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm text-purple-950">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>دليل كتابة البرومبت الاحترافي للحصول على أفضل النتائج</span>
                </div>
                للحصول على موقع متكامل بأنيميشن وحركات جديدة، ركز دائماً على تحديد: (1) الهوية والألوان، (2) هيكل المكونات المطلوبة، (3) نوعية التفاعل والأنيميشن، (4) الصفحات الفرعية.
              </div>

              <div className="space-y-3">
                {promptMasterFormulas.map((formula) => (
                  <div
                    key={formula.id}
                    className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-300">{formula.name}</span>
                      <button
                        onClick={() => handleCopyFormula(formula.template, formula.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/60 text-slate-200 text-xs transition-colors cursor-pointer"
                      >
                        {copiedFormula === formula.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الصيغة</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded-xl border border-slate-800/80 leading-relaxed select-text">
                      {formula.template}
                    </pre>

                    <button
                      onClick={() => {
                        setFullSitePrompt(formula.template);
                        setActiveTab('full_site');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>استخدام هذه الصيغة في التوليد المباشر</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
  );
};
