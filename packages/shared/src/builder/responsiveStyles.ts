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

export function resolveThemeFontFamily(
  node: { type: string; category?: string; props?: Record<string, any> },
  typography: { fontHeading?: string; fontBody?: string }
): string {
  const tagName = String(node.props?.tagName || node.props?.tag || '').toLowerCase();
  const isHeading =
    node.type === 'heading' || /^h[1-6]$/.test(node.type.toLowerCase()) || /^h[1-6]$/.test(tagName);
  return (isHeading ? typography.fontHeading : typography.fontBody) || 'Cairo, sans-serif';
}
export interface ResponsiveNodeStyleInput {
  id: string;
  type: string;
  category?: string;
  parentId?: string | null;
  props: Record<string, any>;
  styles: {
    desktop?: StyleProperties;
    tablet?: StyleProperties;
    mobile?: StyleProperties;
  };
}

/**
 * Shared breakpoint-aware CSS calculation for editor, /shop and published
 * renderers. Host-specific rendering remains in each renderer; responsive
 * merging and layout safety rules live here to prevent visual drift.
 */
export function computeResponsiveNodeStyles(
  node: ResponsiveNodeStyleInput,
  viewport: ResponsiveViewport,
  fontFamily?: string
): CSSProperties {
  const d = node.styles.desktop || {};
  const t = node.styles.tablet || {};
  const m = node.styles.mobile || {};
  const merged: StyleProperties = mergeResponsiveStyles(node.styles, viewport);

  const css: CSSProperties = {
    ...stylePropertiesToCss(merged, fontFamily || 'Cairo, sans-serif'),
    wordBreak: 'normal',
    overflowWrap: 'break-word',
  };

  // Keep page-level layout nodes bounded by the current viewport on every
  // breakpoint; authored desktop widths should not be clipped on small laptops.
  if (node.type === 'header' || node.category === 'section' || node.type === 'container') {
    css.maxWidth = '100%';
  }

  // Responsive Tablet Safeguards:
  if (viewport === 'tablet') {
    css.boxSizing = 'border-box';
    if (node.type === 'header' || node.category === 'section' || node.type === 'container') {
      css.maxWidth = '100%';
      if (
        css.width &&
        typeof css.width === 'string' &&
        /px$/.test(css.width) &&
        parseInt(css.width) > 640
      ) {
        css.width = '100%';
      }
      if (
        css.minWidth &&
        typeof css.minWidth === 'string' &&
        /px$/.test(css.minWidth) &&
        parseInt(css.minWidth) > 640
      ) {
        css.minWidth = '0px';
      }
      if (!t.paddingLeft && d.paddingLeft && parseInt(d.paddingLeft) > 32) {
        css.paddingLeft = '20px';
      }
      if (!t.paddingRight && d.paddingRight && parseInt(d.paddingRight) > 32) {
        css.paddingRight = '20px';
      }
      if (!t.paddingTop && d.paddingTop && parseInt(d.paddingTop) > 60) {
        css.paddingTop = '48px';
      }
      if (!t.paddingBottom && d.paddingBottom && parseInt(d.paddingBottom) > 60) {
        css.paddingBottom = '48px';
      }
    }
    if (node.type === 'heading') {
      css.wordBreak = 'normal';
      css.overflowWrap = 'break-word';
      if (!t.fontSize && d.fontSize && parseInt(d.fontSize) > 28) {
        css.fontSize = `${Math.max(20, Math.round(parseInt(d.fontSize) * 0.78))}px`;
      }
    }
    // Tablet multi-column grid collapsing (collapse 4+ cols to 2 cols)
    if (!t.gridColumns && css.gridTemplateColumns) {
      const colsStr = String(css.gridTemplateColumns);
      if (/(repeat\s*\(\s*[3-9]|1fr\s+1fr\s+1fr)/.test(colsStr)) {
        css.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        css.gap = t.gap || '16px';
      }
    }
  }

  // Responsive Mobile Safeguards for All Themes:
  if (viewport === 'mobile') {
    css.boxSizing = 'border-box';

    // Width & Min-Width Safety Clamping
    css.maxWidth = '100%';
    if (css.width && typeof css.width === 'string' && /px$/.test(css.width)) {
      const px = parseInt(css.width);
      if (px > 340) {
        css.width = '100%';
      }
    }
    if (css.minWidth && typeof css.minWidth === 'string' && /px$/.test(css.minWidth)) {
      const px = parseInt(css.minWidth);
      if (px > 280) {
        css.minWidth = '0px';
      }
    }

    // Grid Collapsing: Any multi-column desktop grid collapses to 1 column on mobile
    if (!m.gridColumns && css.gridTemplateColumns) {
      const colsStr = String(css.gridTemplateColumns);
      if (/(repeat\s*\(\s*[2-9]|1fr\s+1fr)/.test(colsStr)) {
        css.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))';
      }
    }
    if (css.gap && typeof css.gap === 'string' && parseInt(css.gap) > 20) {
      css.gap = '16px';
    }

    // Section and Container Spacing
    if (
      node.type === 'header' ||
      node.category === 'section' ||
      node.type === 'container' ||
      node.type === 'hero' ||
      node.type === 'features' ||
      node.type === 'pricing' ||
      node.type === 'products' ||
      node.type === 'footer'
    ) {
      css.maxWidth = '100%';
      css.overflowX = 'clip';

      // Clamp excessive desktop top/bottom padding
      if (!m.paddingTop && d.paddingTop && parseInt(d.paddingTop) > 36) {
        css.paddingTop = `${Math.min(36, Math.max(20, Math.round(parseInt(d.paddingTop) * 0.38)))}px`;
      }
      if (!m.paddingBottom && d.paddingBottom && parseInt(d.paddingBottom) > 36) {
        css.paddingBottom = `${Math.min(36, Math.max(20, Math.round(parseInt(d.paddingBottom) * 0.38)))}px`;
      }
      // Clamp excessive desktop horizontal padding
      if (!m.paddingLeft && d.paddingLeft && parseInt(d.paddingLeft) > 16) {
        css.paddingLeft = '14px';
      }
      if (!m.paddingRight && d.paddingRight && parseInt(d.paddingRight) > 16) {
        css.paddingRight = '14px';
      }
    }

    // Flex Layout Switching (Row -> Column on mobile for split heroes, feature splits, containers)
    if (
      merged.display === 'flex' &&
      (merged.flexDirection === 'row' || !merged.flexDirection) &&
      !m.flexDirection
    ) {
      const isHeaderBar =
        node.parentId?.includes('header') ||
        node.type === 'header' ||
        node.id?.includes('brand') ||
        node.id?.includes('toolbar') ||
        node.id?.includes('actions');
      const isInlineBadgeOrTag =
        node.id?.includes('badge') ||
        node.id?.includes('tag') ||
        node.id?.includes('star') ||
        node.id?.includes('rating') ||
        node.id?.includes('icon');
      if (!isHeaderBar && !isInlineBadgeOrTag) {
        css.flexDirection = 'column';
        if (!m.alignItems) {
          css.alignItems = 'stretch';
        }
      } else {
        css.flexWrap = 'wrap';
      }
      if (css.gap && typeof css.gap === 'string' && parseInt(css.gap) > 16) {
        css.gap = '12px';
      }
    }

    // Button Safeguards
    if (node.type === 'button') {
      css.whiteSpace = 'nowrap';
      css.flexShrink = 0;
      css.wordBreak = 'normal';
      if (!m.fontSize && (!d.fontSize || parseInt(d.fontSize) > 13)) {
        css.fontSize = '12px';
      }
      if (!m.paddingLeft && (!d.paddingLeft || parseInt(d.paddingLeft) > 12)) {
        css.paddingLeft = '12px';
      }
      if (!m.paddingRight && (!d.paddingRight || parseInt(d.paddingRight) > 12)) {
        css.paddingRight = '12px';
      }
      if (!m.paddingTop && (!d.paddingTop || parseInt(d.paddingTop) > 8)) {
        css.paddingTop = '6px';
      }
      if (!m.paddingBottom && (!d.paddingBottom || parseInt(d.paddingBottom) > 8)) {
        css.paddingBottom = '6px';
      }
    }

    // Heading Typography Safeguards
    if (node.type === 'heading') {
      css.wordBreak = 'normal';
      css.overflowWrap = 'break-word';
      if (!m.fontSize && d.fontSize) {
        const size = parseInt(d.fontSize);
        if (size >= 36) {
          css.fontSize = '22px';
          css.lineHeight = '1.3';
        } else if (size >= 28) {
          css.fontSize = '19px';
          css.lineHeight = '1.35';
        } else if (size >= 22) {
          css.fontSize = '16px';
          css.lineHeight = '1.4';
        }
      }
      if (d.lineHeight && parseInt(d.lineHeight) > 36) {
        css.lineHeight = '1.35';
      }
      if (
        node.parentId?.includes('header') ||
        node.id?.includes('brand') ||
        node.id?.includes('logo')
      ) {
        css.whiteSpace = 'nowrap';
        css.fontSize = m.fontSize || '14px';
        css.flexShrink = m.flexShrink !== undefined ? (m.flexShrink as any) : 1;
        css.overflow = m.overflow || 'hidden';
        css.textOverflow = m.textOverflow || 'ellipsis';
      }
    }

    // Paragraph Typography Safeguards
    if (node.type === 'paragraph') {
      css.wordBreak = 'normal';
      css.overflowWrap = 'break-word';
      if (!m.fontSize && d.fontSize && parseInt(d.fontSize) > 15) {
        css.fontSize = '13.5px';
        css.lineHeight = '1.55';
      }
    }

    // Only hide a node on mobile when the section explicitly opts into it.
    // Content symbols such as separators and dropdown markers are valid user content.
    if (m.display === 'none' || (node.props.mobileHidden === true && !m.display)) {
      css.display = 'none';
    }
  }

  return css;
}

/**
 * Convert every persisted builder style supported by the schema into its CSS
 * property. This is shared by preview, published renderers, /shop and skeletons
 * so saved designs do not lose shorthand, media, typography or border settings.
 */
function isCssGradient(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i.test(value.trim())
  );
}

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
    backgroundColor: isCssGradient(styles.backgroundColor) ? undefined : styles.backgroundColor,
    backgroundImage:
      styles.backgroundGradient ||
      styles.backgroundImage ||
      (isCssGradient(styles.backgroundColor) ? styles.backgroundColor : undefined),
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
