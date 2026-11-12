import React from 'react';
import { Palette, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { InspectorPanelProps } from './types';

const BRAND_PALETTES = [
  { name: 'كحلي ملكي', bg: '#0f172a', text: '#ffffff', accent: '#3b82f6' },
  { name: 'أبيض ثلجي ناصع', bg: '#ffffff', text: '#0f172a', accent: '#1d4ed8' },
  { name: 'رمادي عصري ناعم', bg: '#f8fafc', text: '#1e293b', accent: '#2563eb' },
  { name: 'أسود أوبسيديان فاخر', bg: '#090d16', text: '#f1f5f9', accent: '#38bdf8' },
  {
    name: 'تدرج كحلي أزرق',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
    text: '#ffffff',
    accent: '#60a5fa',
  },
];

type ColorsSectionProps = Pick<
  InspectorPanelProps,
  | 'parentSection'
  | 'sectionStyles'
  | 'isHero'
  | 'heroPrimaryBtnNode'
  | 'heroTitleNode'
  | 'heroSubtitleNode'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
  | 'handleStyleChange'
>;

export const ColorsSection: React.FC<ColorsSectionProps> = ({
  parentSection,
  sectionStyles,
  isHero,
  heroPrimaryBtnNode,
  heroTitleNode,
  heroSubtitleNode,
  expandedSections,
  toggleAccordion,
  handlePropChange,
  handleStyleChange,
}) => {
  const isTransparent = Boolean(
    parentSection.props?.transparent || sectionStyles?.backgroundColor === 'transparent'
  );

  const toggleTransparent = () => {
    const next = !isTransparent;
    handlePropChange(parentSection.id, 'transparent', next);
    if (next) {
      handleStyleChange(parentSection.id, 'backgroundColor', 'transparent');
      handleStyleChange(parentSection.id, 'backgroundImage', undefined);
    } else {
      handleStyleChange(parentSection.id, 'backgroundColor', '#ffffff');
    }
  };

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => toggleAccordion('colors')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-blue-600" />
          <span>الألوان والمظهر (Colors & Appearance)</span>
        </div>
        {expandedSections.colors ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.colors && (
        <div className="space-y-3 pt-2.5">
          {/* SECTION TRANSPARENCY TOGGLE */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 block">
                خلفية القسم شفافة (دمج مع خلفية الموقع)
              </span>
              <span className="text-[10px] text-slate-500 block">
                تدمج هذا القسم مع خلفية الصفحة والأقسام المجاورة
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-pressed={isTransparent}
              onClick={toggleTransparent}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isTransparent
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isTransparent ? 'شفاف (مفعّل)' : 'شفاف'}
            </button>
          </div>

          {/* SECTION PRESET PALETTES */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1.5">
              أنماط ألوان جاهزة للقسم (One-Click Palettes)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {BRAND_PALETTES.map((pal, pIdx) => (
                <button
                  type="button"
                  key={pIdx}
                  onClick={() => {
                    handlePropChange(parentSection.id, 'transparent', false);
                    handleStyleChange(parentSection.id, 'backgroundColor', pal.bg);
                    // The palette owns the section background: drop a stale
                    // background image so gradient palettes visibly apply
                    // instead of hiding behind the previous image.
                    handleStyleChange(parentSection.id, 'backgroundImage', undefined);
                    handleStyleChange(parentSection.id, 'textColor', pal.text);
                    if (heroTitleNode) handleStyleChange(heroTitleNode.id, 'textColor', pal.text);
                    if (heroSubtitleNode)
                      handleStyleChange(
                        heroSubtitleNode.id,
                        'textColor',
                        pal.bg.includes('#0') ? '#94a3b8' : '#475569'
                      );
                  }}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 text-right transition-colors cursor-pointer"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ background: pal.bg }}
                  />
                  <span className="text-[10px] font-bold text-slate-700 truncate">{pal.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CUSTOM BACKGROUND COLOR PICKER */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <label className="text-[10px] font-bold text-slate-600 block">لون خلفية مخصص</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={
                  sectionStyles?.backgroundColor && sectionStyles.backgroundColor !== 'transparent'
                    ? sectionStyles.backgroundColor
                    : '#ffffff'
                }
                onChange={(e) => {
                  handlePropChange(parentSection.id, 'transparent', false);
                  handleStyleChange(parentSection.id, 'backgroundColor', e.target.value);
                }}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
              />
              <input
                type="text"
                dir="ltr"
                value={sectionStyles?.backgroundColor || ''}
                placeholder="#ffffff أو transparent"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'transparent') {
                    handlePropChange(parentSection.id, 'transparent', true);
                  } else {
                    handlePropChange(parentSection.id, 'transparent', false);
                  }
                  handleStyleChange(parentSection.id, 'backgroundColor', val);
                }}
                className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-xs text-slate-800 outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* PRIMARY BUTTON STYLING (IF HERO) */}
          {isHero && heroPrimaryBtnNode && (
            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-blue-900 block">
                لون وتصميم الزر الأساسي
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">لون الزر</label>
                  <input
                    type="color"
                    value={heroPrimaryBtnNode.styles.desktop?.backgroundColor || '#1d4ed8'}
                    onChange={(e) =>
                      handleStyleChange(heroPrimaryBtnNode.id, 'backgroundColor', e.target.value)
                    }
                    className="w-full h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-0.5">استدارة الحواف</label>
                  <input
                    type="text"
                    value={heroPrimaryBtnNode.styles.desktop?.borderRadius || '8px'}
                    onChange={(e) =>
                      handleStyleChange(heroPrimaryBtnNode.id, 'borderRadius', e.target.value)
                    }
                    className="w-full bg-white border border-slate-200 rounded p-1 text-center font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
