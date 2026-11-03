import {
  mergeResponsiveStyles,
  stylePropertiesToCss,
} from '../packages/shared/src/builder/responsiveStyles';

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
});
