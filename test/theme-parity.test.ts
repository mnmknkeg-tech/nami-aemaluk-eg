import {
  DEFAULT_DESIGN_TOKENS,
  defaultDesignTokens,
  normalizeDesignTokens,
  resolveTheme,
  applyThemeVariables,
  buildThemeVariablesCss,
} from '../packages/shared/src/builder';
import {
  normalizeThemeTokens,
  getMergedThemeTokens,
} from '../apps/dashboard-web/src/components/website-builder/data/themes/utils';
import { defaultDesignTokens as dashboardDefaultTokens } from '../apps/dashboard-web/src/components/website-builder/data/themes/defaultTokens';

describe('theme parity (stage 5 — single token source)', () => {
  it('has ONE canonical defaults object: editor, shared and published copies match', () => {
    // All three import paths resolve to the same source; a local copy drifting
    // away (the old published copy had amber accent) fails this instantly.
    expect(dashboardDefaultTokens).toEqual(defaultDesignTokens);
    expect(DEFAULT_DESIGN_TOKENS).toEqual(defaultDesignTokens);
    // Canonical snapshot values (editor reality):
    expect(defaultDesignTokens.colors.accent).toBe('#06b6d4');
    expect(defaultDesignTokens.colors.textSecondary).toBe('#475569');
    expect(defaultDesignTokens.colors.textMuted).toBe('#94a3b8');
    expect(defaultDesignTokens.typography.fontHeading).toBe('Tajawal, sans-serif');
    expect(defaultDesignTokens.typography.fontBody).toBe('Cairo, sans-serif');
  });

  it('editor normalizeThemeTokens and published resolveTheme agree on every input shape', () => {
    const fixtures: unknown[] = [
      undefined,
      null,
      '',
      0,
      {},
      { colors: { primary: '#123456' } },
      { typography: { fontBody: 'Noto Kufi, sans-serif' }, spacingUnit: 8 },
      { primaryColor: '#aa0000', secondaryColor: '#00aa00', accentColor: '#0000aa' },
      { primaryColor: '#aa0000', colors: { primary: '#bb1111' } },
      {
        colors: { primary: '#111111', border: '#dddddd' },
        radius: { lg: '20px' },
        shadows: { md: 'none' },
        spacingUnit: 6,
        legacyUnknownField: 'keep-me',
      },
    ];
    for (const fixture of fixtures) {
      const editor = normalizeThemeTokens(fixture as never);
      const published = resolveTheme(fixture as never);
      expect(published).toEqual(editor);
    }
  });

  it('keeps legacy flat colors working and lets explicit colors.win', () => {
    const legacy = normalizeThemeTokens({ primaryColor: '#aa0000', accentColor: '#0000aa' });
    expect(legacy.colors.primary).toBe('#aa0000');
    expect(legacy.colors.accent).toBe('#0000aa');
    expect(legacy.colors.textSecondary).toBe(defaultDesignTokens.colors.textSecondary);

    const explicit = normalizeThemeTokens({
      primaryColor: '#aa0000',
      colors: { primary: '#bb1111' },
    });
    expect(explicit.colors.primary).toBe('#bb1111');
  });

  it('returns fresh objects each call so callers cannot mutate the canonical source', () => {
    const a = normalizeDesignTokens();
    const b = normalizeDesignTokens();
    expect(a).not.toBe(b);
    expect(a.colors).not.toBe(b.colors);
    a.colors.primary = '#hack';
    expect(normalizeDesignTokens().colors.primary).toBe(defaultDesignTokens.colors.primary);
  });

  it('substitutes baked token values with canonical CSS variables in both renderers', () => {
    // Old documents have theme values baked into inline styles; the shared
    // applyThemeVariables (used by editor AND published) rewrites them live.
    const styles = {
      backgroundColor: '#06b6d4', // canonical accent
      borderColor: '#e2e8f0', // canonical border
      untouched: '13px', // not a token value — must survive verbatim
    };
    const next = applyThemeVariables(styles, undefined);
    expect(next.backgroundColor).toBe('var(--ray-color-accent)');
    expect(next.borderColor).toBe('var(--ray-color-border)');
    expect(next.untouched).toBe('13px');

    const css = buildThemeVariablesCss(null);
    expect(css).toContain('--ray-color-accent: #06b6d4');
    expect(css).toContain('--ray-font-heading: Tajawal, sans-serif');
    expect(css).toContain(':root, .ray-site-root {');
  });

  it('getMergedThemeTokens still layers presets and polish over the canonical defaults', () => {
    const merged = getMergedThemeTokens('definitely-not-a-real-preset');
    expect(merged).toEqual(defaultDesignTokens);

    const preset = getMergedThemeTokens('modernBlue');
    // Every group fully populated (editor guarantees complete tokens):
    expect(Object.keys(preset.colors)).toEqual(Object.keys(defaultDesignTokens.colors));
    expect(preset.typography.fontHeading).toBeTruthy();
    expect(preset.radius.md).toBeTruthy();
    expect(preset.spacingUnit).toBeGreaterThan(0);
  });
});
