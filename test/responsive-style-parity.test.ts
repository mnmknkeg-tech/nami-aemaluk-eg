import {
  computeThemeResponsiveNodeStyles,
  computeResponsiveNodeStyles,
  computeWebsiteRootStyles,
  resolveThemeFontFamily,
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
    const customizedFlexNode = {
      id: 'merchant-hero-layout',
      type: 'container',
      category: 'layout',
      parentId: null,
      props: {},
      styles: {
        desktop: { display: 'flex', flexDirection: 'row', paddingLeft: '32px', fontSize: '24px' },
        mobile: { flexDirection: 'row', paddingLeft: '8px', gap: '6px', fontSize: '18px' },
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
    expect(computeResponsiveNodeStyles(customizedFlexNode, 'mobile')).toMatchObject({
      flexDirection: 'row',
      paddingLeft: '8px',
      gap: '6px',
      fontSize: '18px',
    });
    expect(
      computeThemeResponsiveNodeStyles(customizedFlexNode, 'mobile', {
        fontHeading: 'Tajawal, sans-serif',
        fontBody: 'Cairo, sans-serif',
      })
    ).toMatchObject({
      flexDirection: 'row',
      paddingLeft: '8px',
      gap: '6px',
      fontSize: '18px',
    });
  });
});

describe('shared style conversion for theme backgrounds and typography', () => {
  it('keeps solid background colors as colors', () => {
    expect(stylePropertiesToCss({ backgroundColor: '#123456' } as any)).toMatchObject({
      backgroundColor: '#123456',
    });
  });
  it('renders legacy gradients saved in backgroundColor as background images', () => {
    const css = stylePropertiesToCss({
      backgroundColor: 'linear-gradient(135deg, #000 0%, #fff 100%)',
    } as any);
    expect(css.backgroundColor).toBeUndefined();
    expect(css.backgroundImage).toMatch(/^linear-gradient/);
  });
  it('does not promote arbitrary non-gradient values to background images', () => {
    const css = stylePropertiesToCss({ backgroundColor: 'var(--merchant-color)' } as any);
    expect(css.backgroundColor).toBe('var(--merchant-color)');
    expect(css.backgroundImage).toBeUndefined();
  });
  it('retains an explicit gradient style when a solid background is also present', () => {
    expect(
      stylePropertiesToCss({
        backgroundColor: '#123456',
        backgroundGradient: 'radial-gradient(circle, #fff, #000)',
      } as any)
    ).toMatchObject({
      backgroundColor: '#123456',
      backgroundImage: 'radial-gradient(circle, #fff, #000)',
    });
  });
  it('composes an authored background image above an authored gradient instead of dropping one', () => {
    const css = stylePropertiesToCss({
      backgroundImage: 'url("https://cdn.example.com/bg.webp")',
      backgroundGradient: 'linear-gradient(90deg, #111, #222)',
    } as any);
    expect(css.backgroundImage).toBe(
      'url("https://cdn.example.com/bg.webp"), linear-gradient(90deg, #111, #222)'
    );
  });
  it('composes an image above a legacy gradient stored in backgroundColor', () => {
    const css = stylePropertiesToCss({
      backgroundColor: 'linear-gradient(135deg, #000 0%, #fff 100%)',
      backgroundImage: 'url("https://cdn.example.com/bg.webp")',
    } as any);
    expect(css.backgroundColor).toBeUndefined();
    expect(css.backgroundImage).toBe(
      'url("https://cdn.example.com/bg.webp"), linear-gradient(135deg, #000 0%, #fff 100%)'
    );
  });
  it('keeps a lone background image or gradient untouched by the composer', () => {
    const image = stylePropertiesToCss({
      backgroundImage: 'url("https://cdn.example.com/bg.webp")',
    } as any);
    expect(image.backgroundImage).toBe('url("https://cdn.example.com/bg.webp")');
    const gradient = stylePropertiesToCss({
      backgroundGradient: 'linear-gradient(90deg, #111, #222)',
    } as any);
    expect(gradient.backgroundImage).toBe('linear-gradient(90deg, #111, #222)');
    const neither = stylePropertiesToCss({ backgroundColor: '#ffffff' } as any);
    expect(neither.backgroundImage).toBeUndefined();
  });
});

describe('theme typography font selection', () => {
  const typography = { fontHeading: 'Tajawal, sans-serif', fontBody: 'Cairo, sans-serif' };
  it.each(['heading', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])(
    'uses the configured heading font for %s nodes',
    (type) => {
      expect(resolveThemeFontFamily({ type }, typography)).toBe(typography.fontHeading);
    }
  );
  it('uses the configured body font for paragraph nodes', () => {
    expect(resolveThemeFontFamily({ type: 'paragraph', category: 'typography' }, typography)).toBe(
      typography.fontBody
    );
  });
  it('uses a safe default when typography settings are missing', () => {
    expect(resolveThemeFontFamily({ type: 'heading' }, {})).toBe('Cairo, sans-serif');
  });
});

describe('theme-aware responsive style parity', () => {
  const node = {
    id: 'hero-title',
    type: 'heading',
    category: 'typography',
    props: { tag: 'h1' },
    styles: {
      desktop: {
        width: '680px',
        fontSize: '48px',
        padding: '24px',
        backgroundColor: 'linear-gradient(90deg, #123, #456)',
      },
      mobile: { width: '100%', fontSize: '24px' },
    },
  } as const;
  const typography = {
    fontHeading: 'Tajawal, sans-serif',
    fontBody: 'Cairo, sans-serif',
  };

  it.each(['desktop', 'tablet', 'mobile'] as const)(
    'uses the same responsive styles and heading font for %s across hosts',
    (viewport) => {
      const expected = computeResponsiveNodeStyles(
        node,
        viewport,
        resolveThemeFontFamily(node, typography)
      );

      expect(computeThemeResponsiveNodeStyles(node, viewport, typography)).toEqual(expected);
    }
  );

  it('shares theme background, typography, direction and viewport baseline between public hosts', () => {
    const theme = {
      colors: { background: '#faf7f0', textPrimary: '#241a17' },
      typography: { fontBody: 'Cairo, sans-serif' },
    };

    expect(computeWebsiteRootStyles(theme, 'rtl')).toEqual({
      backgroundColor: '#faf7f0',
      color: '#241a17',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      minHeight: '100vh',
    });
  });
});
