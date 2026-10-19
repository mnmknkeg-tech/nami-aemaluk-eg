import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { WireframeProps } from './types';

export const HeroWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'hero') {
    if (type === 'hero-slider') {
      return (
        <div className="relative w-full h-44 bg-zinc-600 rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4 text-white shadow-xs select-none">
          {/* Subtle background curved shapes */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-500/30 to-zinc-800/40 pointer-events-none" />
          <div className="absolute w-24 h-24 rounded-full bg-white/10 -top-6 left-1/3 blur-xs" />
          <div className="absolute w-40 h-40 rounded-full bg-black/10 -bottom-10 right-1/4" />

          {/* Side navigation arrows */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80">
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white/80">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          {/* Headline */}
          <h4 className="text-sm font-bold text-white z-10 drop-shadow-xs">
            التميز يبدأ من التفاصيل الصغيرة
          </h4>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3 z-10">
            <span className="bg-white text-zinc-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-xs">
              تواصل معنا
            </span>
            <span className="bg-zinc-700/80 border border-white/30 text-white text-[10px] font-medium px-3 py-1 rounded-full">
              اقرأ المزيد
            </span>
          </div>

          {/* Pagination dots */}
          <div className="absolute bottom-2.5 flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
          </div>
        </div>
      );
    }

    if (type === 'hero-coach') {
      return (
        <div className="relative w-full h-44 bg-zinc-600 rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4 text-white shadow-xs select-none">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-600 to-zinc-800/70 pointer-events-none" />
          <div className="absolute w-20 h-20 rounded-full bg-white/10 top-2 left-1/4 blur-xs" />

          {/* Side navigation arrows */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/90">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90">
            <ChevronRight className="w-5 h-5" />
          </div>

          {/* Headline */}
          <h4 className="text-xs font-bold text-white z-10">استشارات رياضية مع مدربين متخصصين</h4>
          <p className="text-[9px] text-zinc-300 mt-1 max-w-[200px] z-10 line-clamp-1">
            خطط تدريب وتغذية مدروسة تناسب مستوى لياقتك وأهدافك
          </p>

          {/* Action Button */}
          <div className="mt-2.5 z-10">
            <span className="bg-lime-600 text-white text-[10px] font-bold px-3 py-1 rounded-md shadow-xs">
              اطلب استشارة
            </span>
          </div>

          {/* Pagination dots */}
          <div className="absolute bottom-2.5 flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
          </div>
        </div>
      );
    }
  }

  return null;
};
