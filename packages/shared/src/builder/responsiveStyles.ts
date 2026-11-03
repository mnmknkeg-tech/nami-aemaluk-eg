import type { CSSProperties } from 'react';
import type { StyleProperties } from './types';

export type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveStyleMap<T extends object> {
  desktop?: T;
  tablet?: Partial<T>;
  mobile?: Partial<T>;
}

/** Merge a component's desktop styles with its active responsive overrides. */
export function mergeResponsiveStyles<T extends object>(
  styles: ResponsiveStyleMap<T> | undefined,
  viewport: ResponsiveViewport
): T {
  const desktop = styles?.desktop || ({} as T);
  const tablet = viewport === 'tablet' || viewport === 'mobile' ? styles?.tablet || {} : {};
  const mobile = viewport === 'mobile' ? styles?.mobile || {} : {};
  return { ...desktop, ...tablet, ...mobile } as T;
}

/**
 * Convert every persisted builder style supported by the schema into its CSS
 * property. This is shared by preview, published renderers, /shop and skeletons
 * so saved designs do not lose shorthand, media, typography or border settings.
 */
export function stylePropertiesToCss(
  styles: StyleProperties,
  fallbackFontFamily?: string
): CSSProperties {
  const css: CSSProperties = {
    display: styles.display,
    flexDirection: styles.flexDirection,
    justifyContent: styles.justifyContent,
    alignItems: styles.alignItems,
    flexWrap: styles.flexWrap,
    flex: styles.flex,
    gridTemplateColumns: styles.gridColumns,
    gap: styles.gap,

    width: styles.width,
    minWidth: styles.minWidth,
    maxWidth: styles.maxWidth,
    height: styles.height,
    minHeight: styles.minHeight,
    maxHeight: styles.maxHeight,

    padding: styles.padding,
    paddingTop: styles.paddingTop,
    paddingRight: styles.paddingRight,
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft,
    margin: styles.margin,
    marginTop: styles.marginTop,
    marginRight: styles.marginRight,
    marginBottom: styles.marginBottom,
    marginLeft: styles.marginLeft,

    fontFamily: styles.fontFamily || fallbackFontFamily,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    fontStyle: styles.fontStyle,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    textAlign: styles.textAlign,
    color: styles.textColor,
    textTransform: styles.textTransform,
    whiteSpace: styles.whiteSpace,

    objectFit: styles.objectFit,
    backgroundColor: styles.backgroundColor,
    backgroundImage: styles.backgroundGradient || styles.backgroundImage,
    backgroundSize: styles.backgroundSize,
    backgroundPosition: styles.backgroundPosition,

    borderWidth: styles.borderWidth,
    borderTopWidth: styles.borderTopWidth,
    borderRightWidth: styles.borderRightWidth,
    borderBottomWidth: styles.borderBottomWidth,
    borderLeftWidth: styles.borderLeftWidth,
    borderStyle: styles.borderStyle,
    borderColor: styles.borderColor,
    borderRadius: styles.borderRadius,
    borderTopLeftRadius: styles.borderTopLeftRadius,
    borderTopRightRadius: styles.borderTopRightRadius,
    borderBottomLeftRadius: styles.borderBottomLeftRadius,
    borderBottomRightRadius: styles.borderBottomRightRadius,

    boxShadow: styles.boxShadow,
    opacity: styles.opacity,
    backdropFilter: styles.backdropBlur ? `blur(${styles.backdropBlur})` : undefined,
    WebkitBackdropFilter: styles.backdropBlur ? `blur(${styles.backdropBlur})` : undefined,
    transform: styles.transform,
    transition: styles.transition,
    overflow: styles.overflow,
    textOverflow: styles.textOverflow,
    flexShrink: styles.flexShrink as any,
    position: styles.position,
    top: styles.top,
    right: styles.right,
    bottom: styles.bottom,
    left: styles.left,
    zIndex: styles.zIndex,
  };

  return Object.fromEntries(
    Object.entries(css).filter(([, value]) => value !== undefined)
  ) as CSSProperties;
}
