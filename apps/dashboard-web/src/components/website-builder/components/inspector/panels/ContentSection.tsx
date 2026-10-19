import React from 'react';
import { Type, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles } from 'lucide-react';
import type { InspectorPanelProps } from './types';

type ContentSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'isHero'
  | 'isHeader'
  | 'heroBadgeNode'
  | 'heroTitleNode'
  | 'heroSubtitleNode'
  | 'heroPrimaryBtnNode'
  | 'heroSecondaryBtnNode'
  | 'headerLogoNode'
  | 'headerCtaBtn'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
>;

export const ContentSection: React.FC<ContentSectionProps> = ({
  node,
  isHero,
  isHeader,
  heroBadgeNode,
  heroTitleNode,
  heroSubtitleNode,
  heroPrimaryBtnNode,
  heroSecondaryBtnNode,
  headerLogoNode,
  headerCtaBtn,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => (
  <div className="p-3">
    <button
      onClick={() => toggleAccordion('content')}
      className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <Type className="w-3.5 h-3.5 text-blue-600" />
        <span>النصوص والتحكم بالعناصر (Content & Visibility)</span>
      </div>
      {expandedSections.content ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>

    {expandedSections.content && (
      <div className="space-y-3 pt-2.5">
        {/* HERO SPECIFIC TEXTS */}
        {isHero ? (
          <>
            {heroBadgeNode && (
              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600">الشارة الترويجية (Badge Text)</label>
                  <button
                    type="button"
                    onClick={() => handlePropChange(heroBadgeNode.id, 'hidden', !heroBadgeNode.props.hidden)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
                    title={heroBadgeNode.props.hidden ? 'إظهار الشارة' : 'إخفاء الشارة'}
                  >
                    {heroBadgeNode.props.hidden ? (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{heroBadgeNode.props.hidden ? 'مخفية' : 'ظاهرة'}</span>
                  </button>
                </div>
                {!heroBadgeNode.props.hidden && (
                  <input
                    type="text"
                    value={heroBadgeNode.props.text || ''}
                    onChange={(e) => handlePropChange(heroBadgeNode.id, 'text', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-hidden focus:border-blue-500"
                    placeholder="مثال: أسطول 2025 | الفخامة بلا حدود"
                  />
                )}
              </div>
            )}

            {heroTitleNode && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">العنوان الرئيسي للهيرو (Hero Title)</label>
                <textarea
                  rows={2}
                  value={heroTitleNode.props.text || ''}
                  onChange={(e) => handlePropChange(heroTitleNode.id, 'text', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white leading-relaxed"
                  placeholder="العنوان الرئيسي..."
                />
              </div>
            )}

            {heroSubtitleNode && (
              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600">الوصف والفقرة الفرعية (Hero Subtitle)</label>
                  <button
                    type="button"
                    onClick={() => handlePropChange(heroSubtitleNode.id, 'hidden', !heroSubtitleNode.props.hidden)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
                    title={heroSubtitleNode.props.hidden ? 'إظهار الوصف' : 'إخفاء الوصف'}
                  >
                    {heroSubtitleNode.props.hidden ? (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{heroSubtitleNode.props.hidden ? 'مخفي' : 'ظاهر'}</span>
                  </button>
                </div>
                {!heroSubtitleNode.props.hidden && (
                  <textarea
                    rows={3}
                    value={heroSubtitleNode.props.text || ''}
                    onChange={(e) => handlePropChange(heroSubtitleNode.id, 'text', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-hidden focus:border-blue-500 leading-relaxed"
                    placeholder="الوصف التوضيحي..."
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {heroPrimaryBtnNode && (
                <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-600">الزر الأساسي</label>
                    <button
                      type="button"
                      onClick={() => handlePropChange(heroPrimaryBtnNode.id, 'hidden', !heroPrimaryBtnNode.props.hidden)}
                      className="cursor-pointer text-slate-400 hover:text-blue-600"
                      title={heroPrimaryBtnNode.props.hidden ? 'إظهار الزر' : 'إخفاء الزر'}
                    >
                      {heroPrimaryBtnNode.props.hidden ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                  </div>
                  {!heroPrimaryBtnNode.props.hidden && (
                    <input
                      type="text"
                      value={heroPrimaryBtnNode.props.text || ''}
                      onChange={(e) => handlePropChange(heroPrimaryBtnNode.id, 'text', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-blue-700 outline-hidden focus:border-blue-500"
                      placeholder="تصفح الأسطول"
                    />
                  )}
                </div>
              )}
              {heroSecondaryBtnNode && (
                <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-600">الزر الثانوي</label>
                    <button
                      type="button"
                      onClick={() => handlePropChange(heroSecondaryBtnNode.id, 'hidden', !heroSecondaryBtnNode.props.hidden)}
                      className="cursor-pointer text-slate-400 hover:text-blue-600"
                      title={heroSecondaryBtnNode.props.hidden ? 'إظهار الزر' : 'إخفاء الزر'}
                    >
                      {heroSecondaryBtnNode.props.hidden ? (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                  </div>
                  {!heroSecondaryBtnNode.props.hidden && (
                    <input
                      type="text"
                      value={heroSecondaryBtnNode.props.text || ''}
                      onChange={(e) => handlePropChange(heroSecondaryBtnNode.id, 'text', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 outline-hidden focus:border-blue-500"
                      placeholder="تواصل معنا"
                    />
                  )}
                </div>
              )}
            </div>
          </>
        ) : isHeader ? (
          <>
            {headerLogoNode && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم المعرض / الشعار (Logo Brand)</label>
                <input
                  type="text"
                  value={headerLogoNode.props.text || ''}
                  onChange={(e) => handlePropChange(headerLogoNode.id, 'text', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}
            {headerCtaBtn && (
              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600">زر الدعوة في الترويسة (Header CTA)</label>
                  <button
                    type="button"
                    onClick={() => handlePropChange(headerCtaBtn.id, 'hidden', !headerCtaBtn.props.hidden)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
                    title={headerCtaBtn.props.hidden ? 'إظهار الزر' : 'إخفاء الزر'}
                  >
                    {headerCtaBtn.props.hidden ? (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{headerCtaBtn.props.hidden ? 'مخفي' : 'ظاهر'}</span>
                  </button>
                </div>
                {!headerCtaBtn.props.hidden && (
                  <input
                    type="text"
                    value={headerCtaBtn.props.label || headerCtaBtn.props.text || ''}
                    onChange={(e) => {
                      const propKey = headerCtaBtn.props.label !== undefined ? 'label' : 'text';
                      handlePropChange(headerCtaBtn.id, propKey, e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-blue-700 outline-hidden focus:border-blue-500"
                  />
                )}
              </div>
            )}
          </>
        ) : (
          /* GENERIC NODE CONTENT */
          <div className="space-y-2.5">
            {/* Quick Node Visibility Switch */}
            <div className="flex items-center justify-between p-2 bg-slate-100/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-700">ظهور هذا المكوّن في الصفحة:</span>
              <button
                type="button"
                onClick={() => handlePropChange(node.id, 'hidden', !node.props.hidden)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  node.props.hidden
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
              >
                {node.props.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{node.props.hidden ? 'مخفي حالياً' : 'ظاهر للزوار'}</span>
              </button>
            </div>

            {node.props.text !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">النص (Text Content)</label>
                <textarea
                  rows={3}
                  value={node.props.text}
                  onChange={(e) => handlePropChange(node.id, 'text', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {node.props.title !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">العنوان الرئيسي (Title)</label>
                <input
                  type="text"
                  value={node.props.title}
                  onChange={(e) => handlePropChange(node.id, 'title', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {node.props.subtitle !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">العنوان الفرعي (Subtitle)</label>
                <textarea
                  rows={2}
                  value={node.props.subtitle}
                  onChange={(e) => handlePropChange(node.id, 'subtitle', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {node.props.badge !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">الشارة (Badge)</label>
                <input
                  type="text"
                  value={node.props.badge}
                  onChange={(e) => handlePropChange(node.id, 'badge', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-blue-700 font-semibold outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {node.props.icon !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم الأيقونة (Icon Name)</label>
                <input
                  type="text"
                  value={node.props.icon}
                  onChange={(e) => handlePropChange(node.id, 'icon', e.target.value)}
                  placeholder="Star, ShieldCheck, Sparkles, Truck, Package..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}

            {node.props.price !== undefined && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">السعر (Price)</label>
                <input
                  type="text"
                  value={node.props.price}
                  onChange={(e) => handlePropChange(node.id, 'price', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-blue-700 font-black outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>
    )}
  </div>
);
