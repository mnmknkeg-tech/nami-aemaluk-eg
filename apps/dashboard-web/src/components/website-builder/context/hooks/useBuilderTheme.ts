import { useCallback } from 'react';
import { DesignTokens, Website } from '../../types/builder';
import { defaultDesignTokens, normalizeThemeTokens } from '../../data/defaultTheme';
import { loadThemePreset } from '../../data/registry';

type ThemeStyleUpdate = {
  property: string;
  nextValue: unknown;
  previousValues: readonly unknown[];
};

/**
 * Old builder documents do not record which styles came from theme tokens.
 * Infer that provenance by comparing each value to the previous token-derived
 * value; an unset property can still be initialized by the theme. This keeps
 * existing documents compatible without adding metadata to component nodes.
 */
const updateThemeDerivedStyles = (
  component: Website['components'][string],
  updates: ThemeStyleUpdate[]
): { component: Website['components'][string]; changed: boolean } => {
  const desktop = (component.styles?.desktop || {}) as Record<string, unknown>;
  const nextDesktop: Record<string, unknown> = { ...desktop };
  let changed = false;

  updates.forEach(({ property, nextValue, previousValues }) => {
    const currentValue = desktop[property];
    const isUnset = currentValue === undefined;
    const wasDerivedFromPreviousTheme = previousValues.includes(currentValue);
    if ((isUnset || wasDerivedFromPreviousTheme) && currentValue !== nextValue) {
      nextDesktop[property] = nextValue;
      changed = true;
    }
  });

  if (!changed) return { component, changed: false };
  return {
    component: {
      ...component,
      styles: {
        ...component.styles,
        desktop: nextDesktop as NonNullable<typeof component.styles>['desktop'],
      },
    },
    changed: true,
  };
};

const presetHeroColors: Record<string, { hero: string; title: string; subtitle: string }> = {
  luxuryGold: { hero: '#090d16', title: '#f8fafc', subtitle: '#94a3b8' },
  automotiveSpeed: { hero: '#09090b', title: '#ffffff', subtitle: '#a1a1aa' },
  realEstateEmerald: { hero: '#f0fdf4', title: '#064e3b', subtitle: '#047857' },
  clinicalClean: { hero: '#f0fdfa', title: '#164e63', subtitle: '#0e7490' },
  modernBlue: { hero: '#f8fafc', title: '#0f172a', subtitle: '#475569' },
};

const knownPresetHeroValues = (property: 'hero' | 'title' | 'subtitle') =>
  Object.values(presetHeroColors).map((colors) => colors[property]);

export const useBuilderTheme = (
  website: Website,
  recordHistory: (actionDesc: string, newWebsite: Website) => void,
  websiteRef?: { current: Website },
  setTemplateError: (message: string | null) => void = () => undefined
) => {
  const updateThemeToken = useCallback(
    (category: keyof DesignTokens, key: string, value: any) => {
      const currentWebsite = websiteRef?.current ?? website;
      const currentTheme = normalizeThemeTokens(currentWebsite.theme);
      const updatedTheme: DesignTokens = {
        ...currentTheme,
        [category]: {
          ...((currentTheme[category] || {}) as any),
          [key]: value,
        },
      };
      const updatedComponents = { ...currentWebsite.components };
      let hasModifiedComponents = false;

      if (category === 'colors' && key === 'primary') {
        const previousPrimary = currentTheme.colors?.primary || defaultDesignTokens.colors.primary;
        Object.keys(updatedComponents).forEach((id) => {
          const comp = updatedComponents[id];
          const updates: ThemeStyleUpdate[] = [];
          if (
            comp.type === 'button' &&
            (comp.props?.variant === 'primary' || id.includes('primary') || id.includes('cta'))
          ) {
            updates.push(
              { property: 'backgroundColor', nextValue: value, previousValues: [previousPrimary] },
              {
                property: 'boxShadow',
                nextValue: `0 10px 15px -3px ${value}40`,
                previousValues: [`0 10px 15px -3px ${previousPrimary}40`],
              }
            );
          }
          if (comp.type === 'badge' || id.includes('badge')) {
            updates.push(
              {
                property: 'backgroundColor',
                nextValue: `${value}18`,
                previousValues: [`${previousPrimary}18`],
              },
              { property: 'textColor', nextValue: value, previousValues: [previousPrimary] }
            );
          }
          if (id === 'nav_link_1') {
            updates.push({
              property: 'textColor',
              nextValue: value,
              previousValues: [previousPrimary],
            });
          }
          const result = updateThemeDerivedStyles(comp, updates);
          if (result.changed) {
            updatedComponents[id] = result.component;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'typography' && (key === 'fontHeading' || key === 'fontBody')) {
        const previousFont = currentTheme.typography?.[key] || defaultDesignTokens.typography[key];
        Object.keys(updatedComponents).forEach((id) => {
          const comp = updatedComponents[id];
          if (
            comp.category !== 'typography' &&
            comp.type !== 'heading' &&
            comp.type !== 'paragraph'
          ) {
            return;
          }
          const isHeading = comp.type === 'heading' || id.includes('title') || id.includes('logo');
          if ((key === 'fontHeading') !== isHeading) return;
          const result = updateThemeDerivedStyles(comp, [
            { property: 'fontFamily', nextValue: value, previousValues: [previousFont] },
          ]);
          if (result.changed) {
            updatedComponents[id] = result.component;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'radius') {
        const previousRadiusValues = Object.values(currentTheme.radius || {});
        const previousRadius = currentTheme.radius?.lg || defaultDesignTokens.radius.lg;
        Object.keys(updatedComponents).forEach((id) => {
          const comp = updatedComponents[id];
          if (comp.type !== 'button') return;
          const result = updateThemeDerivedStyles(comp, [
            {
              property: 'borderRadius',
              nextValue: value,
              previousValues: previousRadiusValues.length ? previousRadiusValues : [previousRadius],
            },
          ]);
          if (result.changed) {
            updatedComponents[id] = result.component;
            hasModifiedComponents = true;
          }
        });
      }

      const newWebsite: Website = {
        ...currentWebsite,
        theme: updatedTheme,
        components: hasModifiedComponents ? updatedComponents : currentWebsite.components,
      };
      recordHistory(`تحديث متغير التصميم (${String(category)}.${key})`, newWebsite);
    },
    [website, websiteRef, recordHistory]
  );

  const applyThemePreset = useCallback(
    (presetKey: string) => {
      let preset: ReturnType<typeof loadThemePreset>['preset'];
      try {
        preset = loadThemePreset(presetKey).preset;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Unable to load theme preset "${presetKey}".`;
        console.error('[WebsiteBuilder] Theme preset application failed.', {
          presetId: presetKey,
          error,
        });
        setTemplateError(message);
        return;
      }
      const currentWebsite = websiteRef?.current ?? website;
      const previousTheme = normalizeThemeTokens(currentWebsite.theme);
      const updatedTheme: DesignTokens = {
        ...defaultDesignTokens,
        ...currentWebsite.theme,
        ...preset.tokens,
        colors: {
          ...defaultDesignTokens.colors,
          ...(currentWebsite.theme?.colors || {}),
          ...(preset.tokens.colors || {}),
        },
        typography: {
          ...defaultDesignTokens.typography,
          ...(currentWebsite.theme?.typography || {}),
          ...(preset.tokens.typography || {}),
        },
        radius: {
          ...defaultDesignTokens.radius,
          ...(currentWebsite.theme?.radius || {}),
          ...(preset.tokens.radius || {}),
        },
        shadows: {
          ...defaultDesignTokens.shadows,
          ...(currentWebsite.theme?.shadows || {}),
          ...(preset.tokens.shadows || {}),
        },
      };
      const newPrimary = updatedTheme.colors.primary;
      const newRadius = updatedTheme.radius?.lg || '10px';
      const newHeadingFont = updatedTheme.typography?.fontHeading || 'Tajawal, sans-serif';
      const newBodyFont = updatedTheme.typography?.fontBody || 'Cairo, sans-serif';
      const previousPrimary = previousTheme.colors.primary;
      const previousRadius = previousTheme.radius?.lg || defaultDesignTokens.radius.lg;
      const previousBadgeRadius = previousTheme.radius?.full || defaultDesignTokens.radius.full;
      const previousRadiusValues = Object.values(previousTheme.radius || {});
      const updatedComponents = { ...currentWebsite.components };
      let hasModifiedComponents = false;

      Object.keys(updatedComponents).forEach((id) => {
        const comp = updatedComponents[id];
        const updates: ThemeStyleUpdate[] = [];
        if (
          comp.category === 'typography' ||
          comp.type === 'heading' ||
          comp.type === 'paragraph'
        ) {
          const isHeading = comp.type === 'heading' || id.includes('title') || id.includes('logo');
          updates.push({
            property: 'fontFamily',
            nextValue: isHeading ? newHeadingFont : newBodyFont,
            previousValues: [
              isHeading ? previousTheme.typography.fontHeading : previousTheme.typography.fontBody,
            ],
          });
        }
        if (
          comp.type === 'button' &&
          (comp.props?.variant === 'primary' ||
            id.includes('primary') ||
            id.includes('cta') ||
            id.includes('book'))
        ) {
          updates.push(
            {
              property: 'backgroundColor',
              nextValue: newPrimary,
              previousValues: [previousPrimary],
            },
            {
              property: 'borderRadius',
              nextValue: newRadius,
              previousValues: previousRadiusValues.length ? previousRadiusValues : [previousRadius],
            },
            {
              property: 'boxShadow',
              nextValue: `0 10px 15px -3px ${newPrimary}40`,
              previousValues: [`0 10px 15px -3px ${previousPrimary}40`],
            }
          );
        }
        if (
          comp.type === 'button' &&
          (comp.props?.variant === 'outline' ||
            comp.props?.variant === 'secondary' ||
            id.includes('secondary'))
        ) {
          updates.push({
            property: 'borderRadius',
            nextValue: newRadius,
            previousValues: previousRadiusValues.length ? previousRadiusValues : [previousRadius],
          });
        }
        if (comp.type === 'badge' || id.includes('badge')) {
          updates.push(
            {
              property: 'backgroundColor',
              nextValue: `${newPrimary}18`,
              previousValues: [`${previousPrimary}18`],
            },
            { property: 'textColor', nextValue: newPrimary, previousValues: [previousPrimary] },
            {
              property: 'borderRadius',
              nextValue: updatedTheme.radius.full || '9999px',
              previousValues: [previousBadgeRadius],
            }
          );
        }
        if (id === 'nav_link_1') {
          updates.push({
            property: 'textColor',
            nextValue: newPrimary,
            previousValues: [previousPrimary],
          });
        }

        const heroColors = presetHeroColors[presetKey];
        if (heroColors) {
          if (comp.id === 'comp_hero') {
            updates.push({
              property: 'backgroundColor',
              nextValue: heroColors.hero,
              previousValues: knownPresetHeroValues('hero'),
            });
          }
          if (comp.id === 'hero_title') {
            updates.push({
              property: 'textColor',
              nextValue: heroColors.title,
              previousValues: knownPresetHeroValues('title'),
            });
          }
          if (comp.id === 'hero_subtitle') {
            updates.push({
              property: 'textColor',
              nextValue: heroColors.subtitle,
              previousValues: knownPresetHeroValues('subtitle'),
            });
          }
        }

        const result = updateThemeDerivedStyles(comp, updates);
        if (result.changed) {
          updatedComponents[id] = result.component;
          hasModifiedComponents = true;
        }
      });

      const newWebsite: Website = {
        ...currentWebsite,
        theme: updatedTheme,
        components: hasModifiedComponents ? updatedComponents : currentWebsite.components,
      };
      recordHistory(`تطبيق سمة التصميم (${preset.nameAr})`, newWebsite);
      setTemplateError(null);
    },
    [website, websiteRef, recordHistory, setTemplateError]
  );

  return {
    updateThemeToken,
    applyThemePreset,
  };
};
