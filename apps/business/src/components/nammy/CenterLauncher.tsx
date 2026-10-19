'use client';

import React, { useState } from 'react';
import {
  Home,
  Layers,
  Store,
  MapPin,
  BadgePercent,
  HelpCircle,
  ArrowUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { NavTabId, Language, PromptSuggestion } from '@/nammy/types';
import { PROMPT_SUGGESTIONS } from '@/nammy/landingData';
import { TRANSLATIONS } from '@/nammy/translations';
import { MEN_MAKANAK_LIVE } from '@/nammy/menMakanak';

interface CenterLauncherProps {
  lang: Language;
  onOpenPage: (tabId: NavTabId) => void;
  onOpenAiChat: (query: string, suggestion?: PromptSuggestion) => void;
}

export const CenterLauncher: React.FC<CenterLauncherProps> = ({
  lang,
  onOpenPage,
  onOpenAiChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = TRANSLATIONS[lang];
  const isAr = lang === 'ar';

  // 7 Primary Icons without box wrappers, each with its own signature vibrant palette & depth
  const launcherIcons: {
    id: NavTabId;
    label: string;
    icon: any;
    colorClass: string;
    hoverGlow: string;
    /** true = لسه مش منشور — يظهر بشارة «قريبًا» ومش بيفتح حاجة */
    soon?: boolean;
  }[] = [
    {
      id: 'home',
      label: t.home,
      icon: Home,
      colorClass:
        'text-amber-500 hover:text-amber-600 drop-shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)]',
    },
    {
      id: 'solutions',
      label: t.solutions,
      icon: Layers,
      colorClass:
        'text-emerald-500 hover:text-emerald-600 drop-shadow-[0_4px_10px_rgba(16,185,129,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(16,185,129,0.5)]',
    },
    {
      id: 'activities',
      label: t.activities,
      icon: Store,
      colorClass:
        'text-violet-600 hover:text-violet-700 drop-shadow-[0_4px_10px_rgba(139,92,246,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(139,92,246,0.5)]',
    },
    {
      id: 'men-makanak',
      label: t.menMakanak,
      icon: MapPin,
      colorClass: 'text-rose-500 hover:text-rose-600 drop-shadow-[0_4px_10px_rgba(244,63,94,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(244,63,94,0.5)]',
      // لسه مش منشور في الإنتاج — الزر يفضل ظاهر بس «قريبًا» ومش بيفتح صفحة.
      soon: !MEN_MAKANAK_LIVE,
    },
    {
      id: 'pricing',
      label: t.pricing,
      icon: BadgePercent,
      colorClass:
        'text-orange-500 hover:text-orange-600 drop-shadow-[0_4px_10px_rgba(249,115,22,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(249,115,22,0.5)]',
    },
    {
      id: 'faq',
      label: t.faq,
      icon: HelpCircle,
      colorClass: 'text-sky-500 hover:text-sky-600 drop-shadow-[0_4px_10px_rgba(14,165,233,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(14,165,233,0.5)]',
    },
    {
      id: 'innovations',
      label: t.innovations,
      icon: Sparkles,
      colorClass:
        'text-fuchsia-500 hover:text-fuchsia-600 drop-shadow-[0_4px_10px_rgba(217,70,239,0.35)]',
      hoverGlow: 'hover:drop-shadow-[0_8px_16px_rgba(217,70,239,0.5)]',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const matched = PROMPT_SUGGESTIONS.find(
      (s) =>
        searchQuery.includes(s.query) ||
        s.query.includes(searchQuery) ||
        searchQuery.toLowerCase().includes(s.queryEn.toLowerCase())
    );

    onOpenAiChat(searchQuery, matched);
  };

  const handlePromptClick = (suggestion: PromptSuggestion) => {
    const q = isAr ? suggestion.query : suggestion.queryEn;
    setSearchQuery(q);
    onOpenAiChat(q, suggestion);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center px-3 sm:px-4 z-20 transition-all duration-300">
      {/* 6 Icons: Floating DIRECTLY without white wrappers/boxes, vibrant distinctive colors (معموله منغير غلاف حولها) */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-7 mb-4 sm:mb-5 flex-wrap">
        {launcherIcons.map((item) => {
          const Icon = item.icon;
          const soon = item.soon === true;
          return (
            <button
              key={item.id}
              onClick={() => onOpenPage(item.id)}
              title={soon ? (isAr ? 'قريبًا' : 'Coming soon') : undefined}
              className={`group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 active:scale-90`}
            >
              {/* Direct Floating Icon without box wrapper ("منغير غلاف حولها") */}
              <div
                className={`p-2 transition-all duration-200 ${item.colorClass} ${item.hoverGlow}`}
              >
                <Icon
                  size={32}
                  strokeWidth={2.1}
                  className="sm:w-9 sm:h-9 transition-transform group-hover:scale-110"
                />
              </div>

              {/* Refined label text with soft desktop pill */}
              <span className="relative text-[11px] sm:text-xs font-black text-slate-800 bg-white/75 hover:bg-white backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs group-hover:shadow-xs transition-all tracking-tight">
                {item.label}
                {soon && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-l from-sky-500 to-cyan-400 text-white text-[8px] font-black px-1.5 py-[1px] shadow-sm">
                    {isAr ? 'قريبًا' : 'Soon'}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sleek Search Pill */}
      <div className="w-full max-w-xl">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex items-center bg-white/95 hover:bg-white rounded-full p-1.5 sm:p-2 shadow-[0_12px_36px_rgba(15,23,42,0.1)] border border-white hover:border-amber-200 transition-all duration-200"
        >
          {/* Sparkle icon */}
          <div className="px-2.5 flex items-center text-amber-500">
            <Sparkles size={17} className="text-amber-500" />
          </div>

          {/* Search input field */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full py-1.5 sm:py-2 px-1 text-slate-800 placeholder-slate-400 font-semibold text-xs sm:text-sm bg-transparent focus:outline-none"
          />

          {/* Warm Amber Round Up-Arrow Submit Button */}
          <button
            type="submit"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
            title={isAr ? 'إرسال' : 'Send'}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
          </button>
        </form>

        {/* Suggestion Pills underneath: All 7 Ready-Made AI Store Models */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          <span className="text-[10px] text-slate-700 font-black ml-1 bg-white/60 px-2 py-0.5 rounded-full">
            {t.tryPrompts}
          </span>
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => handlePromptClick(s)}
              className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-white/80 hover:bg-white text-slate-800 hover:text-amber-600 border border-white/90 shadow-2xs hover:shadow-xs cursor-pointer transition-all duration-150 hover:scale-105"
            >
              {isAr ? s.query : s.queryEn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
