'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import {
  isCompleteChildBasedHero,
  resolveHeroContent,
} from '@ray-eg/shared/builder/heroCompatibility';
import { sectionBadgeStyle, sectionShellClass, sectionSubtitleClass } from '@ray-eg/shared/builder';

interface PublishedHeroSectionProps {
  node: any;
  style: React.CSSProperties;
  theme: any;
  viewport: 'mobile' | 'desktop' | string;
  website: any;
  followLink: (source: Record<string, any>) => boolean;
  scrollTo: (id: string) => void;
  renderChildren: () => React.ReactNode;
}

export function PublishedHeroSection({
  node,
  style,
  theme,
  viewport,
  website,
  followLink,
  scrollTo,
  renderChildren,
}: PublishedHeroSectionProps) {
  const isMobile = viewport === 'mobile';
  const content = resolveHeroContent(node as any, website.components as any);
  const heroStats = content.stats || [];
  const primaryColor = theme?.colors?.primary || '#2563eb';
  const hasCompleteChildContent = isCompleteChildBasedHero(content);
  const mediaType = node.props?.mediaType === 'video' ? 'video' : 'image';
  const imageUrl = node.props?.imageUrl || content.imageUrl;
  const videoUrl = node.props?.videoUrl;
  const mediaUrl = mediaType === 'video' ? videoUrl : imageUrl;
  const hasTextContent = Boolean(
    content.badge ||
    content.title ||
    content.description ||
    content.primaryCtaText ||
    content.secondaryCtaText ||
    heroStats.length
  );
  const heightPreset = String(node.props?.bannerHeight || 'medium');
  const bannerHeights: Record<string, { desktop: number; mobile: number }> = {
    small: { desktop: 220, mobile: 180 },
    medium: { desktop: 340, mobile: 260 },
    large: { desktop: 520, mobile: 360 },
  };
  const bannerHeight = bannerHeights[heightPreset] || bannerHeights.medium;

  const handleCta = (link?: string) => {
    const target = String(link || '');
    // Destinations configured in the builder win, exactly like the button case.
    if (followLink({ url: target })) return;
    if (target.startsWith('#')) {
      scrollTo(target.slice(1));
    } else if (/^(?:https?:|tel:|mailto:|\/\/)/i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  // Mode 1 — media-only banner: a full-bleed image/video with no baked text.
  if (mediaUrl && (node.props?.bannerMediaOnly || !hasTextContent)) {
    const mediaHeight = isMobile ? bannerHeight.mobile : bannerHeight.desktop;
    return (
      <section
        id={node.id}
        style={{
          ...style,
          position: 'relative',
          width: '100%',
          height: `${mediaHeight}px`,
          minHeight: `${mediaHeight}px`,
          maxHeight: 'none',
          padding: 0,
          overflow: 'hidden',
        }}
        className="relative"
      >
        {mediaType === 'video' ? (
          <video
            src={videoUrl}
            poster={imageUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={content.title || 'فيديو البنر'}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={imageUrl}
            alt={content.title || 'صورة البنر'}
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
      </section>
    );
  }

  // Mode 2 — complete child-based hero: the children are the whole story.
  if (hasCompleteChildContent) {
    return (
      <section
        id={node.id}
        style={{
          ...style,
          ...(node.props?.bannerHeight
            ? { minHeight: `${isMobile ? bannerHeight.mobile : bannerHeight.desktop}px` }
            : {}),
        }}
      >
        {renderChildren()}
      </section>
    );
  }

  // Mode 3 — classic two-column hero: text column + media column.
  return (
    <section
      id={node.id}
      style={{
        ...style,
        ...(node.props?.bannerHeight
          ? { minHeight: `${isMobile ? bannerHeight.mobile : bannerHeight.desktop}px` }
          : {}),
      }}
    >
      <div className={sectionShellClass}>
        <div
          className={
            isMobile
              ? 'flex flex-col gap-5'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center'
          }
        >
          <div
            className={`${isMobile ? 'w-full' : 'lg:col-span-7'} space-y-3 sm:space-y-6 text-right`}
          >
            {content.badge && !content.childContent.badge && (
              <span
                style={sectionBadgeStyle(theme as any)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{content.badge}</span>
              </span>
            )}

            {!content.childContent.title && (
              <h1
                className={`${isMobile ? 'text-2xl' : 'text-2xl sm:text-4xl lg:text-5xl'} font-black text-slate-900 leading-tight break-words`}
              >
                {content.title}
                {content.highlightTitle && (
                  <span
                    style={{ color: primaryColor }}
                    className={isMobile ? 'block mt-0.5' : 'block sm:inline sm:mr-2'}
                  >
                    {content.highlightTitle}
                  </span>
                )}
              </h1>
            )}

            {content.description && !content.childContent.description && (
              <p className={`${sectionSubtitleClass} text-slate-600 max-w-2xl`}>
                {content.description}
              </p>
            )}

            <div
              className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4 pt-1`}
            >
              {content.primaryCtaText && !content.childContent.primaryCta && (
                <button
                  onClick={() => handleCta(content.primaryCtaLink || '#items')}
                  style={{
                    backgroundColor: primaryColor,
                    borderRadius: theme?.radius?.lg || '12px',
                  }}
                  className="w-full sm:w-auto px-5 sm:px-7 py-3 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 text-center"
                >
                  <span>{content.primaryCtaText}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              )}

              {content.secondaryCtaText && !content.childContent.secondaryCta && (
                <button
                  onClick={() => handleCta(content.secondaryCtaLink || '#contact')}
                  className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer shrink-0 text-center justify-center flex items-center"
                >
                  <span>{content.secondaryCtaText}</span>
                </button>
              )}
            </div>

            {heroStats.length > 0 && !content.childContent.stats && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-200/80 text-center">
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

          {mediaUrl && (mediaType === 'video' || !content.childContent.image) && (
            <div className={isMobile ? 'w-full' : 'lg:col-span-5 w-full'}>
              <div
                className={`relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-100 ${isMobile ? 'aspect-video max-h-[200px]' : 'aspect-16/10 sm:aspect-square max-h-[340px] sm:max-h-none'}`}
              >
                {mediaType === 'video' ? (
                  <video
                    src={videoUrl}
                    poster={imageUrl || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={content.title || 'فيديو البنر'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt={content.title || 'صورة الواجهة'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
              </div>
            </div>
          )}
        </div>

        {renderChildren()}
      </div>
    </section>
  );
}
