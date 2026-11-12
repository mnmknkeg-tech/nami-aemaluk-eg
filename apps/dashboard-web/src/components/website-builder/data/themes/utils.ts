import { DesignTokens } from '../../types/builder';
import { defaultDesignTokens } from './defaultTokens';
import { themePresets } from './presets';
import { PRESET_POLISH } from './polish';

/**
 * Returns fully resolved, non-partial DesignTokens for any preset key with
 * guaranteed fallbacks. Layers: defaults → preset tokens → per-preset polish
 * (typography/radius/shadows tuning) so every theme ships complete.
 */
export const getMergedThemeTokens = (presetKey?: string): DesignTokens => {
  const preset = presetKey && themePresets[presetKey] ? themePresets[presetKey].tokens : {};
  const polish = presetKey ? PRESET_POLISH[presetKey] : undefined;
  return {
    ...defaultDesignTokens,
    ...preset,
    colors: {
      ...defaultDesignTokens.colors,
      ...(preset.colors || {}),
    },
    typography: {
      ...defaultDesignTokens.typography,
      ...(polish?.typography || {}),
      ...(preset.typography || {}),
    },
    radius: {
      ...defaultDesignTokens.radius,
      ...(polish?.radius || {}),
      ...(preset.radius || {}),
    },
    shadows: {
      ...defaultDesignTokens.shadows,
      ...(polish?.shadows || {}),
      ...(preset.shadows || {}),
    },
    spacingUnit: preset.spacingUnit || defaultDesignTokens.spacingUnit,
  };
};

/**
 * Gets a specific theme preset by key, or returns the default preset if not found.
 */
export const getThemePreset = (presetKey: string) => {
  return themePresets[presetKey] || themePresets.modernBlue;
};

/**
 * Normalizes any theme object (partial, legacy with primaryColor, or undefined)
 * into a guaranteed, fully populated DesignTokens object.
 */
export const normalizeThemeTokens = (theme?: any): DesignTokens => {
  if (!theme || typeof theme !== 'object') return { ...defaultDesignTokens };

  const legacyPrimary = theme.primaryColor;
  const legacySecondary = theme.secondaryColor;
  const legacyAccent = theme.accentColor;

  return {
    ...defaultDesignTokens,
    ...theme,
    colors: {
      ...defaultDesignTokens.colors,
      ...(legacyPrimary ? { primary: legacyPrimary } : {}),
      ...(legacySecondary ? { secondary: legacySecondary } : {}),
      ...(legacyAccent ? { accent: legacyAccent } : {}),
      ...(theme.colors || {}),
    },
    typography: {
      ...defaultDesignTokens.typography,
      ...(theme.typography || {}),
    },
    radius: {
      ...defaultDesignTokens.radius,
      ...(theme.radius || {}),
    },
    shadows: {
      ...defaultDesignTokens.shadows,
      ...(theme.shadows || {}),
    },
    spacingUnit: theme.spacingUnit || defaultDesignTokens.spacingUnit,
  };
};
