import React, { useState } from 'react';
import { BaseRendererProps } from './types';
import { ChevronDown } from 'lucide-react';
import { sectionShellClass, sectionHeaderWrapClass, sectionSubtitleClass, sectionTitleClass, cardBaseStyle } from '@ray-eg/shared/builder';

export const FaqRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
}) => {
  const [openFaqItems, setOpenFaqItems] = useState<Record<string, boolean>>({});
  const themeColors = website.theme?.colors;
  const themeCardStyle: React.CSSProperties = cardBaseStyle(website.theme);
  const themeMutedStyle: React.CSSProperties = { color: themeColors?.textSecondary || '#475569' };

  const items: any[] = node.props.items || [
    {
      q: 'كيف أطلب؟',
      a: 'اختر منتجاتك وأضفها للسلة ثم أتم الطلب، سنتواصل معك لتأكيد التوصيل.',
    },
    { q: 'هل الدفع آمن؟', a: 'نعم، ندعم الدفع عند الاستلام بدون أي رسوم إضافية.' },
    { q: 'ما مدة التوصيل؟', a: 'من 2-5 أيام عمل حسب موقعك.' },
  ];

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className={`${sectionShellClass} text-right`}>
        <div className={sectionHeaderWrapClass}>
          <h2
            style={{ color: themeColors?.textPrimary }}
            className={`${sectionTitleClass} text-slate-900`}
          >
            {node.props.title || 'الأسئلة الشائعة'}
          </h2>
          <p style={themeMutedStyle} className={`${sectionSubtitleClass} text-slate-600`}>
            {node.props.subtitle || 'إجابات على أكثر الأسئلة شيوعاً'}
          </p>
        </div>
        <div className="space-y-3">
          {items.map((f: any, i: number) => {
            const itemKey = `${node.id}-${i}`;
            const isOpen = Boolean(openFaqItems[itemKey]);
            return (
              <div key={i} style={themeCardStyle} className="border overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-4 cursor-pointer text-right transition-colors hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFaqItems((previous) => ({ ...previous, [itemKey]: !isOpen }));
                  }}
                >
                  <ChevronDown
                    style={{ color: themeColors?.textMuted }}
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                  <span
                    style={{ color: themeColors?.textPrimary }}
                    className="font-semibold text-sm flex-1 text-right pr-2"
                  >
                    {f.q}
                  </span>
                </button>
                {isOpen && (
                  <div style={themeMutedStyle} className="px-4 pb-4 text-sm leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {renderChildren()}
    </section>
  );
};
