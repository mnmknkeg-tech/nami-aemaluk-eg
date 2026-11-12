import React from 'react';
import { BaseRendererProps } from './types';
import { CheckCircle } from 'lucide-react';
import {
  sectionBadgeStyle,
  sectionHeaderWrapClass,
  sectionShellClass,
  sectionSubtitleClass,
  sectionTitleClass,
  responsiveGridClass,
  cardBaseStyle,
} from '@ray-eg/shared/builder';

export const PricingRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  isInteractivePreview,
  handleInteraction,
  currentViewport,
}) => {
  const tiersList = node.props.tiers || [];
  const isMobile = currentViewport === 'mobile';
  const themeColors = website.theme?.colors;
  const themeCardStyle: React.CSSProperties = cardBaseStyle(website.theme);

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className={`${sectionShellClass} text-center`}>
        {(node.props.title || node.props.badge) && (
          <div className={sectionHeaderWrapClass}>
            {node.props.badge && (
              <span
                style={sectionBadgeStyle(website.theme)}
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
              >
                {node.props.badge}
              </span>
            )}
            {node.props.title && (
              <h2 className={`${sectionTitleClass} text-slate-900`}>{node.props.title}</h2>
            )}
            {node.props.subtitle && (
              <p className={`${sectionSubtitleClass} text-slate-600`}>{node.props.subtitle}</p>
            )}
          </div>
        )}

        {tiersList.length > 0 && (
          <div className={`${responsiveGridClass()} gap-6 items-stretch`}>
            {tiersList.map((tier: any, idx: number) => {
              const isPopular = Boolean(tier.isPopular || tier.badge);
              return (
                <div
                  key={tier.id || idx}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between relative transition-all duration-300 ${isPopular ? 'border-blue-600 shadow-xl ring-2 ring-blue-600/30 z-10' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                  style={themeCardStyle}
                >
                  {tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md">
                      {tier.badge}
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{tier.title}</h3>
                      {tier.description && (
                        <p className="text-xs text-slate-500 mt-1">{tier.description}</p>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 py-2">
                      <span
                        style={{ color: website.theme?.colors?.primary || '#1d4ed8' }}
                        className="text-3xl font-black font-mono"
                      >
                        {tier.price}
                      </span>
                      {tier.period && (
                        <span className="text-xs text-slate-500 font-medium">/{tier.period}</span>
                      )}
                    </div>

                    {tier.features && (
                      <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                        {tier.features.map((feat: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      if (isInteractivePreview) {
                        e.stopPropagation();
                        handleInteraction(e, '/contact', 'page_contact', tier.ctaText || 'اشتراك');
                      }
                    }}
                    style={{
                      backgroundColor: isPopular
                        ? website.theme?.colors?.primary || '#1d4ed8'
                        : '#0f172a',
                      borderRadius: website.theme?.radius?.lg || '10px',
                    }}
                    className="w-full mt-6 py-3 text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer text-center"
                  >
                    {tier.ctaText || 'اختيار الخطة والبدء'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {renderChildren()}
      </div>
    </section>
  );
};
