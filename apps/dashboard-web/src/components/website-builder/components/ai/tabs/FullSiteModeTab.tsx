import React from 'react';
import { Flame, Wand2, Loader2, Sparkles, CheckCircle2, Check } from 'lucide-react';
import { Website } from '../../../types/builder';
import { FullSiteExample } from '../types';

interface FullSiteModeTabProps {
  fullSitePrompt: string;
  setFullSitePrompt: (p: string) => void;
  animationStyle: string;
  setAnimationStyle: (s: string) => void;
  isBuildingFullSite: boolean;
  generatedSite: Website | null;
  handleGenerateFullSite: () => void;
  handleApplyFullSite: () => void;
  fullSiteExamples: FullSiteExample[];
}

export const FullSiteModeTab: React.FC<FullSiteModeTabProps> = ({
  fullSitePrompt,
  setFullSitePrompt,
  animationStyle,
  setAnimationStyle,
  isBuildingFullSite,
  generatedSite,
  handleGenerateFullSite,
  handleApplyFullSite,
  fullSiteExamples,
}) => {
  return (
                <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl text-blue-900 text-xs leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm text-blue-950">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>توليد موقع كامل من الصفر بأحدث تقنيات 2026</span>
                </div>
                اكتب فكرة موقعك بالتفصيل (مثل: موقع يجمع بين العقارات، معارض الديكور، والمقاولات)، وسيتم بناء شريط تنقل، وقسم ترحيبي، وشبكة ميزات Bento Grid، ومعرض خدمات، وتقييمات، ونموذج حجز متكامل.
              </div>

              {/* Animation Style Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  نمط الأنيميشن والمظهر البصري:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAnimationStyle('modern_glass')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      animationStyle === 'modern_glass'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ✨ زجاجي عصري (Modern Glass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimationStyle('luxury_gold')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      animationStyle === 'luxury_gold'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    👑 أسود وذهبي فاخر (Luxury Gold)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimationStyle('cyberpunk_neon')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      animationStyle === 'cyberpunk_neon'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ نيون متوهج (Cyberpunk Neon)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimationStyle('minimal_clean')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      animationStyle === 'minimal_clean'
                        ? 'bg-slate-100 border-slate-500 text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🤍 أبيض نقي بسيط (Minimal Clean)
                  </button>
                </div>
              </div>

              {/* Full Site Prompt */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  برومبت تصميم الموقع الكامل:
                </label>
                <textarea
                  rows={4}
                  value={fullSitePrompt}
                  onChange={(e) => setFullSitePrompt(e.target.value)}
                  placeholder="صف موقع أحلامك، مثال: صمم موقعاً يربط بين معارض السيارات والعقارات والمقاولات والديكورات، مع بطاقات ثلاثية الأبعاد، وحاسبة أسعار ذكية، ونموذج حجز VIP..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Ready Prompt Presets */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  قوالب برومبت متقدمة جاهزة للتوليد
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {fullSiteExamples.map((ex, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setFullSitePrompt(ex.prompt);
                        setAnimationStyle(ex.style);
                      }}
                      className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-right transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{ex.title}</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                          {ex.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ex.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Site Summary */}
              {generatedSite && (
                <div className="p-4 bg-slate-950 rounded-2xl text-slate-200 space-y-3 font-mono text-xs border border-blue-500/40 animate-in fade-in">
                  <div className="flex items-center justify-between text-emerald-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>تم توليد هيكل الموقع الكامل بنجاح ({generatedSite.name})</span>
                    </span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                      {generatedSite.pages.length} صفحات + {Object.keys(generatedSite.components).length} مكونات
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs font-sans space-y-1">
                    <p className="text-blue-300 font-bold">المكونات المتضمنة في الموقع:</p>
                    <p className="text-[11px] text-slate-400">
                      ✓ شريط تنقل ذكي • قسم Hero ترحيبي • شبكة Bento Grid • معرض عروض وأسطول • آراء وتقييمات العملاء • أسئلة شائعة FAQ • استمارة حجز • فوتر متعدد القنوات
                    </p>
                  </div>
                </div>
              )}
            </div>
  );
};
