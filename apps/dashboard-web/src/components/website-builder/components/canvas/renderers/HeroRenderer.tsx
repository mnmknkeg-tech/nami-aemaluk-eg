import React from 'react';
import { BaseRendererProps } from './types';
import { Sparkles, ArrowRight } from 'lucide-react';
import { sectionBadgeStyle, sectionHeaderWrapClass, sectionShellClass, sectionSubtitleClass, sectionTitleClass } from '@ray-eg/shared/builder';

export const HeroRenderer: React.FC<BaseRendererProps> = ({
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
  const isMobile = currentViewport === 'mobile';
  const heroStats = node.props.stats || [];
  const primaryColor = website.theme?.colors?.primary || '#2563eb';

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className={sectionShellClass}>
        <div className={isMobile ? 'flex flex-col gap-5' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center'}>
          {/* Text Column */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-7'} space-y-3 sm:space-y-6 text-right`}>
            {node.props.badge && (
              <span
                style={sectionBadgeStyle(website.theme)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{node.props.badge}</span>
              </span>
            )}

            <h1 className={`${isMobile ? 'text-2xl' : 'text-2xl sm:text-4xl lg:text-5xl'} font-black text-slate-900 leading-tight break-words`}>
              {node.props.title}
              {node.props.highlightTitle && (
                <span style={{ color: primaryColor }} className={isMobile ? 'block mt-0.5' : 'block sm:inline sm:mr-2'}>
                  {node.props.highlightTitle}
                </span>
              )}
            </h1>

            {node.props.description && (
              <p className={`${sectionSubtitleClass} text-slate-600 max-w-2xl`}>
                {node.props.description}
              </p>
            )}

            {/* Hero Action Buttons */}
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4 pt-1`}>
              {node.props.primaryCtaText && (
                <button
                  onClick={(e) => {
                    if (isInteractivePreview) {
                      e.stopPropagation();
                      handleInteraction(
                        e,
                        node.props.primaryCtaLink || '#items',
                        undefined,
                        node.props.primaryCtaText
                      );
                    }
                  }}
                  style={{
                    backgroundColor: primaryColor,
                    borderRadius: website.theme?.radius?.lg || '12px',
                  }}
                  className="w-full sm:w-auto px-5 sm:px-7 py-3 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 text-center"
                >
                  <span>{node.props.primaryCtaText}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              )}

              {node.props.secondaryCtaText && (
                <button
                  onClick={(e) => {
                    if (isInteractivePreview) {
                      e.stopPropagation();
                      handleInteraction(
                        e,
                        node.props.secondaryCtaLink || '#contact',
                        'page_contact',
                        node.props.secondaryCtaText
                      );
                    }
                  }}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer shrink-0 text-center justify-center flex items-center"
                >
                  <span>{node.props.secondaryCtaText}</span>
                </button>
              )}
            </div>

            {/* Stats Bar */}
            {heroStats.length > 0 && (
              <div className={`grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-200/80 text-center`}>
                {heroStats.map((stat: any, sIdx: number) => (
                  <div key={sIdx} className="space-y-0.5 min-w-0">
                    <div
                      style={{ color: primaryColor }}
                      className={`${isMobile ? 'text-lg' : 'text-base sm:text-2xl'} font-black font-mono truncate`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Column */}
          {node.props.imageUrl && (
            <div className={isMobile ? 'w-full' : 'lg:col-span-5 w-full'}>
              <div className={`relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-100 ${isMobile ? 'aspect-video max-h-[200px]' : 'aspect-16/10 sm:aspect-square max-h-[340px] sm:max-h-none'}`}>
                <img
                  src={node.props.imageUrl}
                  alt={node.props.title || 'صورة الواجهة'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
              </div>
            </div>
          )}
        </div>

        {renderChildren()}
      </div>
    </section>
  );
};
