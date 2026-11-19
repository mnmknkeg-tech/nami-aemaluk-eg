import type { DesignTokens } from './types';

// ============================================================
// designTokens — THE single canonical source for builder design tokens.
//
// The dashboard theme presets/polish layer (apps/…/data/themes) and the
// published renderer (NodeView → resolveTheme) both build on THIS object.
// Never fork a copy: the previous published-side duplicate had silently
// drifted (amber accent, different grays and font stacks than the editor).
// ============================================================

/** Canonical defaults — identical in the editor canvas and published output. */
export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#1d4ed8', // Royal Blue
    primaryHover: '#1e40af',
    secondary: '#0f172a', // Deep Slate
    accent: '#06b6d4', // Modern Cyan/Teal
    background: '#ffffff',
    surface: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    fontHeading: 'Tajawal, sans-serif',
    fontBody: 'Cairo, sans-serif',
    scaleRatio: 1.25,
    baseFontSize: '16px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
    glow: '0 0 20px rgba(29, 78, 216, 0.25)',
  },
  spacingUnit: 4,
};

/**
 * Normalize any theme payload (full, partial, legacy flat colors, or junk)
 * into a guaranteed, fully populated DesignTokens object. Unknown extra
 * top-level fields survive so old documents keep their shape. Every call
 * returns a fresh object — callers may treat the result as mutable.
 */
export function normalizeDesignTokens(theme?: unknown): DesignTokens {
  if (!theme || typeof theme !== 'object') {
    return {
      colors: { ...defaultDesignTokens.colors },
      typography: { ...defaultDesignTokens.typography },
      radius: { ...defaultDesignTokens.radius },
      shadows: { ...defaultDesignTokens.shadows },
      spacingUnit: defaultDesignTokens.spacingUnit,
    };
  }
  const t = theme as Record<string, unknown>;
  const legacyPrimary = t.primaryColor;
  const legacySecondary = t.secondaryColor;
  const legacyAccent = t.accentColor;
  const isGroup = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const groups = ['colors', 'typography', 'radius', 'shadows'] as const;
  const merged = {
    ...defaultDesignTokens,
    ...t,
  } as Record<string, unknown>;
  for (const group of groups) {
    merged[group] = {
      ...(defaultDesignTokens[group] as Record<string, unknown>),
      ...(isGroup(t[group]) ? t[group] : {}),
    };
  }
  const colors = merged.colors as Record<string, unknown>;
  const groupColors = isGroup(t.colors) ? t.colors : {};
  if (legacyPrimary && !('primary' in groupColors)) {
    colors.primary = legacyPrimary;
  }
  if (legacySecondary && !('secondary' in groupColors)) {
    colors.secondary = legacySecondary;
  }
  if (legacyAccent && !('accent' in groupColors)) {
    colors.accent = legacyAccent;
  }
  merged.spacingUnit = (t.spacingUnit as number) || defaultDesignTokens.spacingUnit;
  return merged as unknown as DesignTokens;
}
