import {
  computeResponsiveNodeStyles,
  mergeResponsiveStyles,
  stylePropertiesToCss,
} from '../packages/shared/src/builder/responsiveStyles';
import { PREVIEW_VIEWPORT_WIDTHS } from '../packages/shared/src/builder/previewViewport';

describe('shared responsive style merge used by dashboard, shared public, and marketplace renderers', () => {
  const styles = {
    desktop: { width: '100%', minHeight: '100vh', color: '#111', display: 'flex' },
    tablet: { width: '90%', color: '#222' },
    mobile: { width: '100%', minHeight: '60vh' },
  };

  it('keeps desktop styles without tablet or mobile overrides', () => {
    expect(mergeResponsiveStyles(styles, 'desktop')).toEqual(styles.desktop);
  });

  it('applies tablet overrides on tablet and inherits them on mobile', () => {
    expect(mergeResponsiveStyles(styles, 'tablet')).toEqual({
      ...styles.desktop,
      ...styles.tablet,
    });
    expect(mergeResponsiveStyles(styles, 'mobile')).toEqual({
      ...styles.desktop,
      ...styles.tablet,
      ...styles.mobile,
    });
  });

  it('maps saved shorthand, media, typography, gradient, border and effect styles to CSS', () => {
    const css = stylePropertiesToCss({
      flex: '1 1 0%',
      padding: '24px 16px',
      margin: '0 auto',
      fontStyle: 'italic',
      whiteSpace: 'nowrap',
      objectFit: 'contain',
      backgroundGradient: 'linear-gradient(90deg, #111, #222)',
      borderTopWidth: '2px',
      borderBottomLeftRadius: '18px',
      transform: 'translateY(2px)',
      transition: 'all 180ms ease',
    });

    expect(css).toMatchObject({
      flex: '1 1 0%',
      padding: '24px 16px',
      margin: '0 auto',
      fontStyle: 'italic',
      whiteSpace: 'nowrap',
      objectFit: 'contain',
      backgroundImage: 'linear-gradient(90deg, #111, #222)',
      borderTopWidth: '2px',
      borderBottomLeftRadius: '18px',
      transform: 'translateY(2px)',
      transition: 'all 180ms ease',
    });
  });

  it('applies the same width, grid and text-overflow safeguards for each renderer host', () => {
    const node = {
      id: 'brand-heading',
      type: 'heading',
      category: 'typography',
      parentId: 'header-brand',
      props: {},
      styles: {
        desktop: {
          width: '600px',
          display: 'grid',
          gridColumns: 'repeat(4, minmax(0, 1fr))',
          fontSize: '40px',
        },
      },
    } as const;

    expect(computeResponsiveNodeStyles(node, 'mobile')).toMatchObject({
      width: '100%',
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      fontSize: '14px',
      whiteSpace: 'nowrap',
      flexShrink: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    expect(computeResponsiveNodeStyles(node, 'tablet').gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))'
    );
  });

  it('uses the intended real iframe viewport widths', () => {
    expect(PREVIEW_VIEWPORT_WIDTHS).toEqual({ mobile: 390, tablet: 768, desktop: 1024 });
  });

  it('stacks mobile flex layouts while retaining explicit mobile grid overrides and image fit', () => {
    const flexNode = {
      id: 'hero-content-row',
      type: 'container',
      category: 'layout',
      parentId: null,
      props: {},
      styles: { desktop: { display: 'flex', flexDirection: 'row', gap: '18px' } },
    } as const;
    const imageNode = {
      id: 'hero-image',
      type: 'image',
      category: 'media',
      parentId: 'hero',
      props: {},
      styles: {
        desktop: { width: '720px', objectFit: 'contain' },
        mobile: { width: '100%' },
      },
    } as const;
    const overriddenGrid = {
      id: 'merchant-grid',
      type: 'products',
      category: 'section',
      parentId: null,
      props: {},
      styles: {
        desktop: { display: 'grid', gridColumns: 'repeat(4, minmax(0, 1fr))' },
        mobile: { gridColumns: 'repeat(2, minmax(0, 1fr))' },
      },
    } as const;

    expect(computeResponsiveNodeStyles(flexNode, 'mobile')).toMatchObject({
      flexDirection: 'column',
      gap: '12px',
    });
    expect(computeResponsiveNodeStyles(flexNode, 'tablet').flexDirection).toBe('row');
    expect(computeResponsiveNodeStyles(imageNode, 'mobile')).toMatchObject({
      width: '100%',
      objectFit: 'contain',
    });
    expect(computeResponsiveNodeStyles(overriddenGrid, 'mobile').gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))'
    );
  });
});
