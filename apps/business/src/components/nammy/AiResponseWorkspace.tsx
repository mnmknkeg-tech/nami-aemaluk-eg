'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  ArrowLeft, 
  Send, 
  Check
} from 'lucide-react';
import { PromptSuggestion, Language } from '@/nammy/types';

interface AiResponseWorkspaceProps {
  initialQuery: string;
  initialSuggestion?: PromptSuggestion | null;
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const AiResponseWorkspace: React.FC<AiResponseWorkspaceProps> = ({
  initialQuery,
  initialSuggestion,
  lang,
  onOpenDemo,
}) => {
  const isAr = lang === 'ar';
  const [chatInput, setChatInput] = useState('');
  const [actionApplied, setActionApplied] = useState(false);
  
  const initialText = initialSuggestion 
    ? (isAr ? initialSuggestion.aiResponse.description : initialSuggestion.aiResponseEn.description)
    : (isAr 
        ? `حللت طلبك «${initialQuery}». نظام نمّي مهيأ لأتمتة هذا الإجراء فوراً ومزامنته مع نقاط البيع والمتجر الإلكتروني.`
        : `Processed request "${initialQuery}". Nammy Business OS is ready to automate this action and sync across your registers.`);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'user', text: initialQuery },
    { sender: 'ai', text: initialText }
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: isAr 
            ? `تم استيعاب «${userMsg}». يمكن لمساعد نمّي تنفيذ هذا التعديل تلقائياً على كافة الفروع دون أي تدخل يدوي مع تفعيل الفوترة الفورية.`
            : `Understood "${userMsg}". Nammy AI can execute this operational update across all branches with immediate sync and tax logging.`,
        }
      ]);
    }, 600);
  };

  const metric = initialSuggestion ? (isAr ? initialSuggestion.aiResponse.metric : initialSuggestion.aiResponseEn.metric) : null;
  const headline = initialSuggestion ? (isAr ? initialSuggestion.aiResponse.headline : initialSuggestion.aiResponseEn.headline) : null;
  const details = initialSuggestion ? (isAr ? initialSuggestion.aiResponse.details : initialSuggestion.aiResponseEn.details) : [];
  const actionText = initialSuggestion ? (isAr ? initialSuggestion.aiResponse.actionText : initialSuggestion.aiResponseEn.actionText) : (isAr ? 'تنفيذ الإجراء الآن' : 'Apply Action Now');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* AI Assistant Identification Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Outline Icon without background box */}
          <div className="text-amber-500">
            <Bot size={30} strokeWidth={2.1} />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900">
              {isAr ? 'المساعد التجاري الذكي (Nammy AI)' : 'Nammy Intelligent Assistant'}
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isAr ? 'متصل بقواعد بيانات متجرك ونقاط البيع الفورية' : 'Connected to live store databases and registers'}
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenDemo(isAr ? 'تفعيل مساعد نمّي AI' : 'Activate Nammy AI')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 active:scale-95"
        >
          {isAr ? 'ربط مع متجري' : 'Connect Store'}
        </button>
      </div>

      {/* Primary Intelligence Output Card */}
      {metric && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-bold block">
              {metric.label}
            </span>
            <span className="text-2xl font-black text-amber-600 tabular-nums block mt-1">
              {metric.value}
            </span>
            <span className="text-[10px] text-emerald-600 font-black block mt-0.5">
              {metric.change}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-bold block">
              {isAr ? 'زمن التنفيذ المقترح' : 'Execution Time'}
            </span>
            <span className="text-2xl font-black text-slate-900 tabular-nums block mt-1">
              {isAr ? 'فوري' : 'Instant'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {isAr ? 'بدون توقف الكاشير' : 'Zero terminal downtime'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-bold block">
              {isAr ? 'قنوات المزامنة' : 'Channels Synced'}
            </span>
            <span className="text-2xl font-black text-slate-900 tabular-nums block mt-1">100%</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {isAr ? 'الفروع والمتجر وتطبيقات التوصيل' : 'POS, online store & apps'}
            </span>
          </div>
        </div>
      )}

      {/* Suggested Action Execution */}
      {headline && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="font-black text-sm text-slate-900">
            {headline}
          </h4>
          
          <div className="space-y-2">
            {details.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>{d}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setActionApplied(true);
                setTimeout(() => {
                  setActionApplied(false);
                  onOpenDemo(headline || initialQuery);
                }, 400);
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              {actionApplied ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>{isAr ? 'تم بدء التهيئة ونقلك للوحة التحكم...' : 'Launching setup wizard...'}</span>
                </>
              ) : (
                <>
                  <span>{actionText}</span>
                  <ArrowLeft size={13} className="rtl:inline-block ltr:rotate-180" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Follow-up Chat Stream */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-black text-slate-700">
          {isAr ? 'حوار مستمر مع نمّي:' : 'Continuous Dialogue:'}
        </h4>
        
        <div className="space-y-2.5 max-h-52 overflow-y-auto p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                  m.sender === 'user'
                    ? 'bg-amber-500 text-white rounded-tr-none font-bold'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none font-medium'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input for follow-up */}
        <form onSubmit={handleSendChat} className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isAr ? 'اكتب استفساراً إضافياً...' : 'Ask a follow-up question...'}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:border-amber-500 focus:outline-none shadow-2xs"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-xs active:scale-95"
          >
            <Send size={15} className="rtl:rotate-180" />
          </button>
        </form>
      </div>

    </div>
  );
};
