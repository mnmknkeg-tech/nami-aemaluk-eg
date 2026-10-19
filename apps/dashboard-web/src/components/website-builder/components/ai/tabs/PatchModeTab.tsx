import React from 'react';
import { Target, Sparkles, Send, Loader2, CheckCircle2, ChevronRight, Layers, Palette, Layout, Plus, Check } from 'lucide-react';
import { ComponentNode, Page } from '../../../types/builder';
import { PatchScope, StructuredAiPatch } from '../../../types/ai';
import { ChatMessage } from '../types';

interface PatchModeTabProps {
  selectedNode: ComponentNode | null;
  activePage: Page;
  scope: PatchScope;
  setScope: (scope: PatchScope) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  isGenerating: boolean;
  handleGeneratePatch: (text?: string) => void;
  contextualPrompts: string[];
  chatHistory: ChatMessage[];
  generatedPatch: StructuredAiPatch | null;
  handleApplyPatch: (patchToApply?: StructuredAiPatch, closeModal?: boolean) => void;
  justApplied: boolean;
  onClose?: () => void;
}

export const PatchModeTab: React.FC<PatchModeTabProps> = ({
  selectedNode,
  activePage,
  scope,
  setScope,
  prompt,
  setPrompt,
  isGenerating,
  handleGeneratePatch,
  contextualPrompts,
  chatHistory,
  generatedPatch,
  handleApplyPatch,
  justApplied,
  onClose,
}) => {
  const isHeader =
    selectedNode?.type === 'header' ||
    selectedNode?.id?.includes('header') ||
    selectedNode?.id?.includes('nav');

  return (
    <div className="space-y-4">
              {/* TARGET CAPTURED COMPONENT CARD */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-2xl border border-slate-700/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/80 border border-indigo-400/40 text-white flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                          العنصر المستهدف للتعديل:
                        </span>
                        <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">
                          {selectedNode ? selectedNode.type : 'section'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                        <span>{selectedNode ? selectedNode.name : `قسم الصفحة (${activePage.name})`}</span>
                        {selectedNode?.id && (
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            #{selectedNode.id}
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  {/* Scope Switcher Badges */}
                  <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setScope('element')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scope === 'element'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      العنصر فقط
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('section')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scope === 'section'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      القسم
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('page')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scope === 'page'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الصفحة
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope('theme')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        scope === 'theme'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      السمة
                    </button>
                  </div>
                </div>

                {/* Target Element Quick Properties Snapshot */}
                <div className="pt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span className="text-slate-400">الخصائص الحالية:</span>
                  {selectedNode?.props?.text && (
                    <span className="bg-slate-800/90 px-2 py-0.5 rounded text-slate-200 truncate max-w-[200px]">
                      النص: "{selectedNode.props.text}"
                    </span>
                  )}
                  {selectedNode?.props?.title && (
                    <span className="bg-slate-800/90 px-2 py-0.5 rounded text-slate-200 truncate max-w-[200px]">
                      العنوان: "{selectedNode.props.title}"
                    </span>
                  )}
                  {selectedNode?.props?.badgeText && (
                    <span className="bg-slate-800/90 px-2 py-0.5 rounded text-amber-300">
                      الشارة: {selectedNode.props.badgeText}
                    </span>
                  )}
                  {isHeader && (
                    <span className="bg-indigo-900/60 border border-indigo-700/50 text-indigo-200 px-2 py-0.5 rounded">
                      شريط تنقل + شعار + روابط
                    </span>
                  )}
                  <span className="text-slate-400 mr-auto text-[10px]">
                    جاهز لاستقبال أوامرك وتطبيقها مباشرة ⚡
                  </span>
                </div>
              </div>

              {/* CONVERSATIONAL CHAT TIMELINE */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 max-h-56 overflow-y-auto">
                {chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white font-medium rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-bl-xs'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 opacity-75 text-[10px]">
                        <span>{msg.sender === 'user' ? 'أنت' : 'مساعد الذكاء الاصطناعي'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>

                      {/* If message has generated patch, show rich diff summary */}
                      {msg.patch && msg.patch.diffSummary && msg.patch.diffSummary.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5 font-sans">
                          <span className="text-[11px] font-bold text-indigo-700 block">
                            ملخص التعديلات التي تم تجهيزها:
                          </span>
                          <div className="space-y-1">
                            {msg.patch.diffSummary.map((diff, dIdx) => (
                              <div key={dIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{diff}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl text-xs text-indigo-700 font-bold max-w-[80%] animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>جاري تحليل العنصر وتوليد التعديل الذكي...</span>
                  </div>
                )}
              </div>

              {/* PROMPT INPUT & SEND */}
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGeneratePatch();
                      }
                    }}
                    placeholder={`اطلب أي تعديل على "${selectedNode ? selectedNode.name : 'المكون'}" (مثال: غير اللوجو، أضف روابط جديدة، غير الخلفية لأسود وأزرار ذهبية، أضف قسم تحته...)`}
                    className="w-full bg-white border-2 border-slate-200 hover:border-indigo-300 focus:border-indigo-600 rounded-2xl p-3 pl-12 text-xs outline-none transition-all resize-none shadow-xs leading-relaxed text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleGeneratePatch()}
                    disabled={isGenerating || !prompt.trim()}
                    className="absolute left-2.5 bottom-3 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-sm"
                    title="إرسال وتوليد"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* DYNAMIC CONTEXTUAL QUICK ACTION PROMPTS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>اقتراحات فورية مخصصة لـ ({selectedNode ? selectedNode.name : 'هذا المكون'}):</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contextualPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleGeneratePatch(qp)}
                      className="text-right text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-3 py-1.5 rounded-xl transition-all border border-slate-200 hover:border-indigo-300 cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span>{qp}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* JUST APPLIED FEEDBACK BANNER */}
              {justApplied && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-emerald-800 text-xs animate-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">تم تطبيق التعديلات بنجاح على الكانفاس والمعاينة الحية!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClose?.()}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    إغلاق والعودة للكانفاس
                  </button>
                </div>
              )}
            </div>
  );
};
