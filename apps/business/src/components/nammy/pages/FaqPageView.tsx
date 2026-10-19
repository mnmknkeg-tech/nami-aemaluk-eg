'use client';

import React, { useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { Language } from '@/nammy/types';
import { FAQ_ITEMS } from '@/nammy/landingData';

interface FaqPageViewProps {
  lang: Language;
  onOpenDemo: (ctx?: string) => void;
}

export const FaqPageView: React.FC<FaqPageViewProps> = ({ lang, onOpenDemo }) => {
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const isAr = lang === 'ar';

  return (
    <div className="space-y-10 max-w-3xl mx-auto">
      
      {/* Header Statement */}
      <div className="text-start space-y-3">
        <span className="text-xs font-black text-amber-600 uppercase tracking-wider">
          {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          {isAr ? (
            <>
              كل ما تحتاج معرفته{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                قبل أن تبدأ
              </span>
            </>
          ) : (
            <>
              Everything you need to know{' '}
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border-b-2 border-amber-400 inline-block">
                before you launch
              </span>
            </>
          )}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed">
          {isAr ? 'إجابات مباشرة ومفصلة حول المنصة، نقاط البيع، الرسوم، والربط التقني.' : 'Direct, practical answers regarding POS rollout, hardware, gateways, and support.'}
        </p>
      </div>

      {/* Questions Accordion List */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const q = isAr ? item.question : item.questionEn;
          const a = isAr ? item.answer : item.answerEn;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition-all duration-200"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                  {q}
                </span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-slate-500 shrink-0 transition-transform ${
                  isOpen ? 'rotate-180 text-amber-600 bg-amber-50' : 'bg-slate-100'
                }`}>
                  <ChevronDown size={16} />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in">
                  {a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Box - Outline Icon without boxy container */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-start shadow-md">
        <div className="flex items-center gap-3.5">
          {/* Outline Icon without background box container */}
          <div className="shrink-0 text-amber-400">
            <MessageSquare size={28} strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base">
              {isAr ? 'هل تحتاج إجابة مخصصة لمتجرك؟' : 'Need custom consultation for your shop?'}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {isAr ? 'فريق الدعم الفني والاستشارات التجارية متاح 24/7 لمساعدتك' : 'Our merchant onboarding advisors are on standby 24/7'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenDemo(isAr ? 'طلب استشارة للدعم الفني' : 'Merchant Support Ticket')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer transition-colors shadow-xs active:scale-95 shrink-0"
        >
          {isAr ? 'تحدث مع مستشار' : 'Chat With Advisor'}
        </button>
      </div>

    </div>
  );
};
