'use client';

import React from 'react';
import { 
  Tv, 
  UserCheck, 
  Building, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { NavTabId, Language } from '@/nammy/types';
import { TRANSLATIONS } from '@/nammy/translations';

interface DesktopShortcutsProps {
  lang: Language;
  onOpenPage: (tabId: NavTabId) => void;
  onOpenDemo: (ctx?: string) => void;
}

export const DesktopShortcuts: React.FC<DesktopShortcutsProps> = ({
  lang,
  onOpenPage,
  onOpenDemo,
}) => {
  const t = TRANSLATIONS[lang];

  // Floating shortcuts without white wrapper boxes, with individual vibrant palettes
  const leftShortcuts = [
    {
      id: 'demo',
      label: t.liveDemo,
      icon: Tv,
      color: 'text-amber-500 hover:text-amber-600 drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]',
      action: () => onOpenDemo(t.liveDemo),
    },
    {
      id: 'advisor',
      label: t.advisor,
      icon: UserCheck,
      color: 'text-emerald-500 hover:text-emerald-600 drop-shadow-[0_4px_8px_rgba(16,185,129,0.4)]',
      action: () => onOpenDemo(t.advisor),
    },
    {
      id: 'about',
      label: t.aboutUs,
      icon: Building,
      color: 'text-violet-600 hover:text-violet-700 drop-shadow-[0_4px_8px_rgba(139,92,246,0.4)]',
      action: () => onOpenPage('about'),
    },
  ];

  const rightShortcuts = [
    {
      id: 'privacy',
      label: t.privacy,
      icon: ShieldCheck,
      color: 'text-sky-500 hover:text-sky-600 drop-shadow-[0_4px_8px_rgba(14,165,233,0.4)]',
      action: () => onOpenPage('privacy'),
    },
    {
      id: 'terms',
      label: t.terms,
      icon: FileText,
      color: 'text-rose-500 hover:text-rose-600 drop-shadow-[0_4px_8px_rgba(244,63,94,0.4)]',
      action: () => onOpenPage('terms'),
    },
  ];

  const allShortcuts = [...leftShortcuts, ...rightShortcuts];

  return (
    <>
      {/* Desktop Left Column: Floating Icons DIRECTLY on the background without wrapper box ("منغير غلاف حولها") */}
      <div className="hidden lg:flex flex-col gap-6 absolute top-24 left-6 z-20 select-none">
        {leftShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="group flex flex-col items-center gap-1 focus:outline-none cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
            >
              {/* Direct icon without enclosing card box */}
              <div className={`p-1.5 transition-all ${item.color}`}>
                <Icon size={26} strokeWidth={2.1} />
              </div>
              <span className="text-[11px] font-black text-slate-800 bg-white/80 hover:bg-white backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs group-hover:shadow-xs transition-all">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop Right Column: Floating Icons DIRECTLY on the background without wrapper box */}
      <div className="hidden lg:flex flex-col gap-6 absolute top-24 right-6 z-20 select-none">
        {rightShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="group flex flex-col items-center gap-1 focus:outline-none cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
            >
              {/* Direct icon without enclosing card box */}
              <div className={`p-1.5 transition-all ${item.color}`}>
                <Icon size={26} strokeWidth={2.1} />
              </div>
              <span className="text-[11px] font-black text-slate-800 bg-white/80 hover:bg-white backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs group-hover:shadow-xs transition-all whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Friendly Bottom Quick-Dock: Vibrant and neat */}
      <div className="flex lg:hidden fixed bottom-3 inset-x-2 z-30 justify-center pointer-events-none select-none">
        <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-white/90 shadow-lg overflow-x-auto max-w-full no-scrollbar">
          {allShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-white text-slate-800 text-[11px] font-black shadow-2xs whitespace-nowrap shrink-0 active:scale-90 transition-transform"
              >
                <Icon size={14} className={item.color.split(' ')[0]} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
