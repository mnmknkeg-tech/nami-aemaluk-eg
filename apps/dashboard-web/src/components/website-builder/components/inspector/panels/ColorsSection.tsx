import React from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import type { InspectorPanelProps } from './types';

const BRAND_PALETTES = [
  { name: 'كحلي ملكي', bg: '#0f172a', text: '#ffffff', accent: '#3b82f6' },
  { name: 'أبيض ثلجي ناصع', bg: '#ffffff', text: '#0f172a', accent: '#1d4ed8' },
  { name: 'رمادي عصري ناعم', bg: '#f8fafc', text: '#1e293b', accent: '#2563eb' },
  { name: 'أسود أوبسيديان فاخر', bg: '#090d16', text: '#f1f5f9', accent: '#38bdf8' },
  { name: 'تدرج كحلي أزرق', bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', text: '#ffffff', accent: '#60a5fa' },
];

type ColorsSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'parentSection'
  | 'isHero'
  | 'heroPrimaryBtnNode'
  | 'heroTitleNode'
  | 'heroSubtitleNode'
  | 'currentStyles'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handleStyleChange'
>;

export const ColorsSection: React.FC<ColorsSectionProps> = ({
  node,
  parentSection,
  isHero,
  heroPrimaryBtnNode,
  heroTitleNode,
  heroSubtitleNode,
  currentStyles,
  expandedSections,
  toggleAccordion,
  handleStyleChange,
}) => (
  <div className="p-3">
    <button
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
        {/* SECTION PRESET PALETTES */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1.5">أنماط ألوان جاهزة للقسم (One-Click Palettes)</label>
          <div className="grid grid-cols-2 gap-1.5">
            {BRAND_PALETTES.map((pal, pIdx) => (
              <button
                key={pIdx}
                onClick={() => {
                  handleStyleChange(parentSection.id, 'backgroundColor', pal.bg);
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
                <div className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ background: pal.bg }} />
                <span className="text-[10px] font-bold text-slate-700 truncate">{pal.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* INDIVIDUAL COLOR PICKERS */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">لون خلفية العنصر</label>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
              <input
                type="color"
                value={currentStyles.backgroundColor?.startsWith('#') ? currentStyles.backgroundColor : '#ffffff'}
                onChange={(e) => handleStyleChange(node.id, 'backgroundColor', e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] font-mono text-slate-600 truncate">{currentStyles.backgroundColor || 'Default'}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">لون النص (Text Color)</label>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
              <input
                type="color"
                value={currentStyles.textColor?.startsWith('#') ? currentStyles.textColor : '#0f172a'}
                onChange={(e) => handleStyleChange(node.id, 'textColor', e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] font-mono text-slate-600 truncate">{currentStyles.textColor || '#0f172a'}</span>
            </div>
          </div>
        </div>

        {/* PRIMARY BUTTON STYLING (IF HERO) */}
        {isHero && heroPrimaryBtnNode && (
          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-blue-900 block">لون وتصميم الزر الأساسي</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">لون الزر</label>
                <input
                  type="color"
                  value={heroPrimaryBtnNode.styles.desktop?.backgroundColor || '#1d4ed8'}
                  onChange={(e) => handleStyleChange(heroPrimaryBtnNode.id, 'backgroundColor', e.target.value)}
                  className="w-full h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">استدارة الحواف</label>
                <input
                  type="text"
                  value={heroPrimaryBtnNode.styles.desktop?.borderRadius || '8px'}
                  onChange={(e) => handleStyleChange(heroPrimaryBtnNode.id, 'borderRadius', e.target.value)}
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
