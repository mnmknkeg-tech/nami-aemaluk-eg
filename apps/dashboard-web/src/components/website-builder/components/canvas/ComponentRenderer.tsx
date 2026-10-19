import React from 'react';
import { useBuilder } from '../../context/BuilderContext';
import { StyleProperties, ViewportBreakpoint } from '../../types/builder';
import { BaseRendererProps } from './renderers/types';
import { HeaderRenderer } from './renderers/HeaderRenderer';
import { HeroRenderer } from './renderers/HeroRenderer';
import { ProductsRenderer } from './renderers/ProductsRenderer';
import { PricingRenderer } from './renderers/PricingRenderer';
import { AuthRenderer } from './renderers/AuthRenderer';
import { FeaturesRenderer } from './renderers/FeaturesRenderer';
import { FormRenderer } from './renderers/FormRenderer';
import { FooterRenderer } from './renderers/FooterRenderer';
import { FaqRenderer } from './renderers/FaqRenderer';
import { ContactRenderer } from './renderers/ContactRenderer';
import { UtilityRenderers } from './renderers/UtilityRenderers';
import { BasicElementsRenderer } from './renderers/BasicElementsRenderer';

export interface ComponentRendererProps {
  nodeId: string;
  isInteractivePreview?: boolean;
  overrideViewport?: ViewportBreakpoint;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  nodeId,
  isInteractivePreview = false,
  overrideViewport,
}) => {
  const {
    website,
    selectedNodeId,
    hoveredNodeId,
    selectNode,
    setHoveredNode,
    viewport,
    activePage,
    switchPage,
    cartCount,
    setIsCartOpen,
    addToCart,
  } = useBuilder();

  const node = website.components[nodeId];
  if (!node || node.isHidden || node.props?.hidden) return null;

  const isSelected = selectedNodeId === node.id && !isInteractivePreview;
  const isHovered = hoveredNodeId === node.id && !isSelected && !isInteractivePreview;
  const currentViewport = overrideViewport || viewport;

  // Compute responsive styles merged by current breakpoint
  const getComputedStyles = (): React.CSSProperties => {
    const d = node.styles.desktop || {};
    const t = node.styles.tablet || {};
    const m = node.styles.mobile || {};

    let merged: StyleProperties = { ...d };
    if (currentViewport === 'tablet') {
      merged = { ...merged, ...t };
    } else if (currentViewport === 'mobile') {
      merged = { ...merged, ...t, ...m };
    }

    const css: React.CSSProperties = {
      display: merged.display,
      flexDirection: merged.flexDirection,
      justifyContent: merged.justifyContent,
      alignItems: merged.alignItems,
      flexWrap: merged.flexWrap,
      gridTemplateColumns: merged.gridColumns,
      gap: merged.gap,

      width: merged.width,
      minWidth: merged.minWidth,
      maxWidth: merged.maxWidth,
      height: merged.height,
      minHeight: merged.minHeight,
      maxHeight: merged.maxHeight,

      paddingTop: merged.paddingTop,
      paddingRight: merged.paddingRight,
      paddingBottom: merged.paddingBottom,
      paddingLeft: merged.paddingLeft,

      marginTop: merged.marginTop,
      marginRight: merged.marginRight,
      marginBottom: merged.marginBottom,
      marginLeft: merged.marginLeft,

      fontFamily: merged.fontFamily || website.theme?.typography?.fontBody || 'Cairo, sans-serif',
      fontSize: merged.fontSize,
      fontWeight: merged.fontWeight as any,
      lineHeight: merged.lineHeight,
      letterSpacing: merged.letterSpacing,
      textAlign: merged.textAlign,
      color: merged.textColor,
      textTransform: merged.textTransform,

      backgroundColor: merged.backgroundColor,
      backgroundImage: merged.backgroundImage,
      backgroundSize: merged.backgroundSize,
      backgroundPosition: merged.backgroundPosition,

      borderWidth: merged.borderWidth,
      borderStyle: merged.borderStyle,
      borderColor: merged.borderColor,
      borderRadius: merged.borderRadius,

      boxShadow: merged.boxShadow,
      opacity: merged.opacity,
      backdropFilter: merged.backdropBlur ? `blur(${merged.backdropBlur})` : undefined,
      WebkitBackdropFilter: merged.backdropBlur ? `blur(${merged.backdropBlur})` : undefined,
      overflow: merged.overflow,
      textOverflow: merged.textOverflow,
      flexShrink: merged.flexShrink as any,
      wordBreak: 'normal',
      overflowWrap: 'break-word',
      position: merged.position,
      top: merged.top,
      right: merged.right,
      bottom: merged.bottom,
      left: merged.left,
      zIndex: merged.zIndex,
    };

    // Responsive Tablet Safeguards:
    if (currentViewport === 'tablet') {
      css.boxSizing = 'border-box';
      if (node.type === 'header' || node.category === 'section' || node.type === 'container') {
        css.maxWidth = '100%';
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
    if (currentViewport === 'mobile') {
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

      // Hide desktop nav separators & desktop nav paragraphs on mobile
      if (
        (typeof node.props.text === 'string' &&
          (node.props.text.includes('•') ||
            node.props.text.includes('|') ||
            node.props.text.includes('▾'))) ||
        ((node.parentId?.includes('header') ||
          node.parentId?.includes('sec_') ||
          node.id?.includes('nav')) &&
          (node.type === 'paragraph' || node.id?.includes('nav') || node.category === 'navigation'))
      ) {
        css.display = 'none';
      }
    }

    return css;
  };

  // Smart Navigation and Action handler for preview mode
  const handleInteraction = (
    e: React.MouseEvent,
    overrideUrl?: string,
    overridePageId?: string,
    overrideText?: string
  ) => {
    if (!isInteractivePreview) return;

    const url = (
      overrideUrl ??
      node.props.url ??
      node.props.href ??
      node.props.link ??
      node.props.linkUrl ??
      node.props.targetUrl ??
      ''
    ).trim();

    const pageId = (
      overridePageId ??
      node.props.pageId ??
      node.props.targetPage ??
      node.props.targetPageId ??
      ''
    ).trim();

    const text = (
      overrideText ??
      node.props.text ??
      node.props.title ??
      node.props.label ??
      ''
    ).trim();

    // 1. Explicit Page ID Match
    if (pageId) {
      const pageMatch = website.pages.find((p) => p.id === pageId || p.slug === pageId);
      if (pageMatch) {
        e.preventDefault();
        e.stopPropagation();
        switchPage(pageMatch.id);
        return;
      }
    }

    // 2. URL / Anchor Link Processing
    if (url) {
      if (url.startsWith('#')) {
        const anchorName = url.replace(/^#+/, '').trim().toLowerCase();

        // Check if this anchor maps to a dedicated page
        const matchedPage = website.pages.find(
          (p) =>
            p.slug.toLowerCase() === anchorName ||
            p.id.toLowerCase() === anchorName ||
            p.id.toLowerCase() === `page_${anchorName}` ||
            (anchorName.includes('service') && p.slug.includes('service')) ||
            (anchorName.includes('contact') && p.slug.includes('contact')) ||
            (anchorName.includes('about') && p.slug.includes('about'))
        );

        if (matchedPage && matchedPage.id !== activePage.id) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(matchedPage.id);
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        const targetElement =
          document.getElementById(anchorName) ||
          document.getElementById(`gen_${anchorName}`) ||
          document.getElementById(`comp_${anchorName}`) ||
          document.getElementById(`tmpl_${anchorName}`) ||
          document.querySelector(`[id*="${anchorName}"]`);

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      const cleanSlug = url.replace(/^[#/]+/, '').toLowerCase().trim();
      const pageBySlug = website.pages.find(
        (p) =>
          p.slug.toLowerCase() === cleanSlug ||
          p.id.toLowerCase() === cleanSlug ||
          p.id.toLowerCase() === `page_${cleanSlug}` ||
          p.name.trim().toLowerCase() === cleanSlug
      );

      if (pageBySlug && pageBySlug.id !== activePage.id) {
        e.preventDefault();
        e.stopPropagation();
        switchPage(pageBySlug.id);
        return;
      }

      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('tel:') ||
        url.startsWith('mailto:')
      ) {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    // 3. Keyword / Text Mapping for Pages and Sections
    if (text) {
      const pageByExactName = website.pages.find((p) => p.name.trim() === text);
      if (pageByExactName && activePage.id !== pageByExactName.id) {
        e.preventDefault();
        e.stopPropagation();
        switchPage(pageByExactName.id);
        return;
      }

      const lowerText = text.toLowerCase();

      // Home
      if (lowerText.includes('رئيسية') || lowerText.includes('home')) {
        const home = website.pages.find((p) => p.slug === 'home' || p.id === 'page_home' || p.metadata?.isHomePage);
        if (home) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(home.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      // Services / Products / Menu / Pricing / Fleet / Catalog
      if (
        lowerText.includes('خدمات') ||
        lowerText.includes('منتجات') ||
        lowerText.includes('منيو') ||
        lowerText.includes('قائمة') ||
        lowerText.includes('أصناف') ||
        lowerText.includes('وجبات') ||
        lowerText.includes('عربيات') ||
        lowerText.includes('سيارات') ||
        lowerText.includes('باقات') ||
        lowerText.includes('اشتراك') ||
        lowerText.includes('عضويات') ||
        lowerText.includes('مشاريع') ||
        lowerText.includes('وحدات') ||
        lowerText.includes('شقق') ||
        lowerText.includes('فلل') ||
        lowerText.includes('أسعار') ||
        lowerText.includes('تسوق') ||
        lowerText.includes('متجر') ||
        lowerText.includes('عروض') ||
        lowerText.includes('خصومات')
      ) {
        const targetPage = website.pages.find(
          (p) =>
            p.id === 'page_services' ||
            p.slug === 'services' ||
            p.slug === 'menu' ||
            p.slug === 'products' ||
            p.slug === 'catalog' ||
            p.name.includes('خدمات') ||
            p.name.includes('منتجات') ||
            p.name.includes('منيو') ||
            p.name.includes('عروض')
        );
        if (targetPage && targetPage.id !== activePage.id) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(targetPage.id);
          return;
        }
        const sec =
          document.querySelector('[id*="items"]') ||
          document.querySelector('[id*="grid"]') ||
          document.querySelector('[id*="menu"]') ||
          document.querySelector('[id*="product"]') ||
          document.querySelector('[id*="service"]') ||
          document.querySelector('[id*="pricing"]');
        if (sec) {
          e.preventDefault();
          e.stopPropagation();
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // About / Story / Trainers / Reviews / Features
      if (
        lowerText.includes('من نحن') ||
        lowerText.includes('عن الشركة') ||
        lowerText.includes('عن المنشأة') ||
        lowerText.includes('قصتنا') ||
        lowerText.includes('كباتن') ||
        lowerText.includes('مدرب') ||
        lowerText.includes('فريق') ||
        lowerText.includes('أطباء') ||
        lowerText.includes('آراء') ||
        lowerText.includes('تقييم') ||
        lowerText.includes('ذواقة') ||
        lowerText.includes('عملاء') ||
        lowerText.includes('مميزات') ||
        lowerText.includes('لماذا')
      ) {
        const targetPage = website.pages.find(
          (p) =>
            p.id === 'page_about' ||
            p.slug === 'about' ||
            p.name.includes('من نحن') ||
            p.name.includes('قصت')
        );
        if (targetPage && targetPage.id !== activePage.id) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(targetPage.id);
          return;
        }
        const sec =
          document.querySelector('[id*="feature"]') ||
          document.querySelector('[id*="review"]') ||
          document.querySelector('[id*="testimonial"]') ||
          document.querySelector('[id*="about"]') ||
          document.querySelector('[id*="team"]');
        if (sec) {
          e.preventDefault();
          e.stopPropagation();
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // Contact / Book / Table / Consultation / Branches / Schedule / Form
      if (
        lowerText.includes('تواصل') ||
        lowerText.includes('اتصل') ||
        lowerText.includes('حجز') ||
        lowerText.includes('احجز') ||
        lowerText.includes('طاولة') ||
        lowerText.includes('كشف') ||
        lowerText.includes('موعد') ||
        lowerText.includes('جلسة') ||
        lowerText.includes('استشارة') ||
        lowerText.includes('فروع') ||
        lowerText.includes('ساعات العمل') ||
        lowerText.includes('جدول')
      ) {
        const targetPage = website.pages.find(
          (p) =>
            p.id === 'page_contact' ||
            p.slug === 'contact' ||
            p.name.includes('تواصل') ||
            p.name.includes('حجز')
        );
        if (targetPage && targetPage.id !== activePage.id) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(targetPage.id);
          return;
        }
        const sec =
          document.querySelector('[id*="form"]') ||
          document.querySelector('[id*="contact"]') ||
          document.querySelector('[id*="book"]') ||
          document.querySelector('[id*="table"]') ||
          document.querySelector('[id*="consultation"]');
        if (sec) {
          e.preventDefault();
          e.stopPropagation();
          sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // Login / Account
      if (lowerText.includes('دخول') || lowerText.includes('حسابي') || lowerText.includes('تسجيل')) {
        const loginPage = website.pages.find(
          (p) => p.slug === 'login' || p.id.includes('login') || p.name.includes('تسجيل')
        );
        if (loginPage && loginPage.id !== activePage.id) {
          e.preventDefault();
          e.stopPropagation();
          switchPage(loginPage.id);
          return;
        }
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isInteractivePreview) {
      handleInteraction(e);
      return;
    }
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isInteractivePreview) return;
    e.stopPropagation();
    setHoveredNode(node.id);
  };

  const handleMouseLeave = () => {
    if (isInteractivePreview) return;
    setHoveredNode(null);
  };

  const outlineClass = isInteractivePreview
    ? ''
    : isSelected
      ? 'ring-2 ring-blue-600 ring-offset-2 relative z-20'
      : isHovered
        ? 'ring-1 ring-blue-300 ring-offset-1 relative'
        : '';

  const renderChildren = () => {
    if (!node.childrenIds || node.childrenIds.length === 0) return null;
    return node.childrenIds.map((childId) => (
      <ComponentRenderer
        key={childId}
        nodeId={childId}
        isInteractivePreview={isInteractivePreview}
        overrideViewport={overrideViewport}
      />
    ));
  };

  const baseProps: BaseRendererProps = {
    node,
    website,
    currentViewport,
    isInteractivePreview,
    outlineClass,
    getComputedStyles,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    renderChildren,
    handleInteraction,
    switchPage,
    activePageId: activePage.id,
    overrideViewport,
  };

  // Delegate rendering by component type
  switch (node.type) {
    case 'header':
      return (
        <HeaderRenderer
          {...baseProps}
          cartCount={cartCount}
          setIsCartOpen={setIsCartOpen}
        />
      );

    case 'hero':
      return <HeroRenderer {...baseProps} />;

    case 'products':
      return <ProductsRenderer {...baseProps} addToCart={addToCart} />;

    case 'pricing':
      return <PricingRenderer {...baseProps} />;

    case 'auth':
    case 'auth_login':
    case 'auth_register':
      return <AuthRenderer {...baseProps} />;

    case 'features':
      return <FeaturesRenderer {...baseProps} />;

    case 'form':
      return <FormRenderer {...baseProps} />;

    case 'footer':
      return <FooterRenderer {...baseProps} />;

    case 'faq':
      return <FaqRenderer {...baseProps} />;

    case 'contact':
    case 'contact-section':
      return <ContactRenderer {...baseProps} />;

    case 'testimonials':
    case 'gallery':
    case 'team':
    case 'stats':
    case 'services':
    case 'services-grid':
    case 'spacer':
    case 'divider':
    case 'trust-badges':
    case 'trust_badges':
    case 'before-after':
    case 'before_after':
    case 'promo-banner':
    case 'promo_banner':
    case 'announcement-bar':
    case 'announcement_bar':
    case 'whatsapp-float':
    case 'whatsapp_button':
    case 'mobile_footer':
      return <UtilityRenderers {...baseProps} />;

    default:
      return (
        <BasicElementsRenderer
          {...baseProps}
          cartCount={cartCount}
          setIsCartOpen={setIsCartOpen}
          addToCart={addToCart}
        />
      );
  }
};
