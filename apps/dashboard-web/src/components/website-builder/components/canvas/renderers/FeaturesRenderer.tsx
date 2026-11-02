import React from 'react';
import { BaseRendererProps } from './types';
import { ShieldCheck } from 'lucide-react';
import {
  sectionBadgeStyle,
  sectionHeaderWrapClass,
  sectionShellClass,
  sectionSubtitleClass,
  sectionTitleClass,
  responsiveGridClass,
} from '@ray-eg/shared/builder';

export const FeaturesRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  currentViewport,
}) => {
  const featuresList = node.props.features || [];
  const isMobile = currentViewport === 'mobile';

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

        {featuresList.length > 0 && (
          <div className={`${responsiveGridClass()} gap-4 sm:gap-6`}>
            {featuresList.map((feat: any, idx: number) => (
              <div
                key={feat.id || idx}
                className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 space-y-3 flex flex-col justify-between"
              >
                <div
                  style={{
                    backgroundColor: `${website.theme?.colors?.primary || '#1d4ed8'}15`,
                    color: website.theme?.colors?.primary || '#1d4ed8',
                  }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                >
                  {feat.icon ? <ShieldCheck className="w-6 h-6" /> : <span>⭐</span>}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {renderChildren()}
      </div>
    </section>
  );
};
