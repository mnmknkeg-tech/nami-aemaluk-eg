import { useCallback } from 'react';
import { DesignTokens, Website } from '../../types/builder';
import { defaultDesignTokens, themePresets, normalizeThemeTokens } from '../../data/defaultTheme';

export const useBuilderTheme = (
  website: Website,
  recordHistory: (actionDesc: string, newWebsite: Website) => void
) => {
  const updateThemeToken = useCallback(
    (category: keyof DesignTokens, key: string, value: any) => {
      const currentTheme = normalizeThemeTokens(website.theme);
      const updatedTheme: DesignTokens = {
        ...currentTheme,
        [category]: {
          ...((currentTheme[category] || {}) as any),
          [key]: value,
        },
      };

      // Propagate design token changes to components
      const updatedComponents = { ...website.components };
      let hasModifiedComponents = false;

      if (category === 'colors') {
        const primaryColor = key === 'primary' ? value : updatedTheme.colors?.primary || '#1d4ed8';

        Object.keys(updatedComponents).forEach((id) => {
          const comp = { ...updatedComponents[id] };
          let modified = false;

          // Primary Buttons & Action CTAs
          if (
            comp.type === 'button' &&
            (comp.props?.variant === 'primary' || id.includes('primary') || id.includes('cta'))
          ) {
            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                backgroundColor: primaryColor,
                boxShadow: `0 10px 15px -3px ${primaryColor}40`,
              },
            };
            modified = true;
          }

          // Badges & Accents
          if (comp.type === 'badge' || id.includes('badge')) {
            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                backgroundColor: `${primaryColor}18`,
                textColor: primaryColor,
              },
            };
            modified = true;
          }

          // Active Navigation link
          if (id === 'nav_link_1') {
            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                textColor: primaryColor,
              },
            };
            modified = true;
          }

          if (modified) {
            updatedComponents[id] = comp;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'typography') {
        // Handle all typography keys: fontHeading, fontBody, scaleRatio, baseFontSize
        const headingFont =
          key === 'fontHeading'
            ? value
            : updatedTheme.typography?.fontHeading || 'Tajawal, sans-serif';
        const bodyFont =
          key === 'fontBody' ? value : updatedTheme.typography?.fontBody || 'Cairo, sans-serif';
        const scaleRatio =
          key === 'scaleRatio' ? value : updatedTheme.typography?.scaleRatio || 1.2;
        const baseFontSize =
          key === 'baseFontSize' ? value : updatedTheme.typography?.baseFontSize || '16px';

        Object.keys(updatedComponents).forEach((id) => {
          const comp = { ...updatedComponents[id] };
          if (
            comp.category === 'typography' ||
            comp.type === 'heading' ||
            comp.type === 'paragraph'
          ) {
            const isHeading =
              comp.type === 'heading' || id.includes('title') || id.includes('logo');
            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                fontFamily: isHeading ? headingFont : bodyFont,
              },
            };
            // Apply scaleRatio and baseFontSize changes to text elements
            if (comp.type === 'heading' || id.includes('title') || id.includes('logo')) {
              comp.styles = {
                ...comp.styles,
                desktop: {
                  ...comp.styles.desktop,
                  fontSize: baseFontSize,
                },
              };
            }
            updatedComponents[id] = comp;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'radius') {
        const newRadius = value;
        Object.keys(updatedComponents).forEach((id) => {
          const comp = { ...updatedComponents[id] };
          if (comp.type === 'button') {
            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                borderRadius: newRadius,
              },
            };
            updatedComponents[id] = comp;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'shadows') {
        const shadowKey = key; // e.g. 'sm', 'md', 'lg', 'glow'
        const newShadow = value;

        Object.keys(updatedComponents).forEach((id) => {
          const comp = { ...updatedComponents[id] };
          let modified = false;

          // Apply shadows to common elements with shadow support
          if (comp.styles?.desktop) {
            // Buttons, cards, images, containers often use shadows
            const shadowProp = shadowKey === 'glow' ? 'boxShadow' : 'boxShadow';

            comp.styles = {
              ...comp.styles,
              desktop: {
                ...comp.styles.desktop,
                [shadowProp]: newShadow,
              },
            };
            modified = true;
          }

          if (modified) {
            updatedComponents[id] = comp;
            hasModifiedComponents = true;
          }
        });
      } else if (category === 'spacingUnit') {
        const newSpacingUnit = value;

        Object.keys(updatedComponents).forEach((id) => {
          const comp = { ...updatedComponents[id] };
          let modified = false;

          // Apply spacing unit to components that use spacing values
          if (comp.styles?.desktop) {
            // Apply to margin, padding, and related properties
            const spacingProps = ['padding', 'margin', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];

            for (const prop of spacingProps) {
              if (comp.styles.desktop[prop] !== undefined) {
                // Scale the value by the new spacing unit
                // For simplicity, we'll apply a multiplier based on the change
                // This is a simplified approach - in production you'd want a more sophisticated mapping
                const value = comp.styles.desktop[prop];
                if (typeof value === 'string') {
                  // If the value ends with 'px', multiply the number part
                  const match = value.match(/^(\d+)(px|rem|em|%)?$/);
                  if (match && match[1]) {
                    const num = parseInt(match[1], 10);
                    const unit = match[2] || 'px';
                    // Apply a simple scaling factor
                    const scaled = Math.round(num * (newSpacingUnit / 8) * 10) / 10;
                    comp.styles = {
                      ...comp.styles,
                      desktop: {
                        ...comp.styles.desktop,
                        [prop]: scaled + (unit || 'px'),
                      },
                    };
                    modified = true;
                    break;
                  }
                }
              }
            }
          }

          if (modified) {
            updatedComponents[id] = comp;
            hasModifiedComponents = true;
          }
        });
      }

      const newWebsite: Website = {
        ...website,
        theme: updatedTheme,
        components: hasModifiedComponents ? updatedComponents : website.components,
      };

      recordHistory(`تحديث متغير التصميم (${String(category)}.${key})`, newWebsite);
    },
    [website, recordHistory]
  );

  const applyThemePreset = useCallback(
    (presetKey: string) => {
      const preset = themePresets[presetKey];
      if (!preset) return;

      const updatedTheme: DesignTokens = {
        ...defaultDesignTokens,
        ...website.theme,
        ...preset.tokens,
        colors: {
          ...defaultDesignTokens.colors,
          ...(website.theme?.colors || {}),
          ...(preset.tokens.colors || {}),
        },
        typography: {
          ...defaultDesignTokens.typography,
          ...(website.theme?.typography || {}),
          ...(preset.tokens.typography || {}),
        },
        radius: {
          ...defaultDesignTokens.radius,
          ...(website.theme?.radius || {}),
          ...(preset.tokens.radius || {}),
        },
        shadows: {
          ...defaultDesignTokens.shadows,
          ...(website.theme?.shadows || {}),
          ...(preset.tokens.shadows || {}),
        },
      };

      const newColors = updatedTheme.colors;
      const newRadius = updatedTheme.radius?.lg || '10px';
      const newHeadingFont = updatedTheme.typography?.fontHeading || 'Tajawal, sans-serif';
      const newBodyFont = updatedTheme.typography?.fontBody || 'Cairo, sans-serif';

      const updatedComponents = { ...website.components };

      Object.keys(updatedComponents).forEach((id) => {
        const comp = { ...updatedComponents[id] };
        let modified = false;

        // Update typography
        if (
          comp.category === 'typography' ||
          comp.type === 'heading' ||
          comp.type === 'paragraph'
        ) {
          const isHeading = comp.type === 'heading' || id.includes('title') || id.includes('logo');
          comp.styles = {
            ...comp.styles,
            desktop: {
              ...comp.styles.desktop,
              fontFamily: isHeading ? newHeadingFont : newBodyFont,
            },
          };
          modified = true;
        }

        // Update primary buttons & CTAs
        if (
          comp.type === 'button' &&
          (comp.props?.variant === 'primary' ||
            id.includes('primary') ||
            id.includes('cta') ||
            id.includes('book'))
        ) {
          comp.styles = {
            ...comp.styles,
            desktop: {
              ...comp.styles.desktop,
              backgroundColor: newColors.primary,
              borderRadius: newRadius,
              boxShadow: `0 10px 15px -3px ${newColors.primary}40`,
            },
          };
          modified = true;
        }

        // Update secondary/outline buttons
        if (
          comp.type === 'button' &&
          (comp.props?.variant === 'outline' ||
            comp.props?.variant === 'secondary' ||
            id.includes('secondary'))
        ) {
          comp.styles = {
            ...comp.styles,
            desktop: {
              ...comp.styles.desktop,
              borderRadius: newRadius,
            },
          };
          modified = true;
        }

        // Update badges
        if (comp.type === 'badge' || id.includes('badge')) {
          comp.styles = {
            ...comp.styles,
            desktop: {
              ...comp.styles.desktop,
              backgroundColor: `${newColors.primary}18`,
              textColor: newColors.primary,
              borderRadius: updatedTheme.radius.full || '9999px',
            },
          };
          modified = true;
        }

        // Update active nav link
        if (id === 'nav_link_1') {
          comp.styles = {
            ...comp.styles,
            desktop: {
              ...comp.styles.desktop,
              textColor: newColors.primary,
            },
          };
          modified = true;
        }

        // Theme-specific section color themes
        const heroColorMap: Record<string, { hero: string; title: string; subtitle: string }> = {
          luxuryGold: { hero: '#090d16', title: '#f8fafc', subtitle: '#94a3b8' },
          automotiveSpeed: { hero: '#09090b', title: '#ffffff', subtitle: '#a1a1aa' },
          realEstateEmerald: { hero: '#f0fdf4', title: '#064e3b', subtitle: '#047857' },
          clinicalClean: { hero: '#f0fdfa', title: '#164e63', subtitle: '#0e7490' },
          modernBlue: { hero: '#f8fafc', title: '#0f172a', subtitle: '#475569' },
        };

        if (heroColorMap[presetKey]) {
          const colors = heroColorMap[presetKey];
          if (comp.id === 'comp_hero') {
            comp.styles = {
              ...comp.styles,
              desktop: { ...comp.styles.desktop, backgroundColor: colors.hero },
            };
            modified = true;
          }
          if (comp.id === 'hero_title') {
            comp.styles = {
              ...comp.styles,
              desktop: { ...comp.styles.desktop, textColor: colors.title },
            };
            modified = true;
          }
          if (comp.id === 'hero_subtitle') {
            comp.styles = {
              ...comp.styles,
              desktop: { ...comp.styles.desktop, textColor: colors.subtitle },
            };
            modified = true;
          }
        }

        if (modified) {
          updatedComponents[id] = comp;
        }
        });

        // Apply spacingUnit to all components
        const spacingUnit = updatedTheme.spacingUnit || 8;

        Object.keys(updatedComponents).forEach((id) => {
        const comp = { ...updatedComponents[id] };
        let modified = false;

        // Apply spacingUnit to margin and padding values
        if (comp.styles?.desktop) {
          const spacingProps = ['padding', 'margin', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];

          for (const prop of spacingProps) {
            if (comp.styles.desktop[prop] !== undefined) {
              const value = comp.styles.desktop[prop];
              if (typeof value === 'string') {
                const match = value.match(/^(\d+)(px|rem|em|%)?$/);
                if (match && match[1]) {
                  const num = parseInt(match[1], 10);
                  const unit = match[2] || 'px';
                  const scaled = Math.round(num * (spacingUnit / 8) * 10) / 10;
                  comp.styles = {
                    ...comp.styles,
                    desktop: {
                      ...comp.styles.desktop,
                      [prop]: scaled + (unit || 'px'),
                    },
                  };
                  modified = true;
                  break;
                }
              }
            }
          }
        }

        if (modified) {
          updatedComponents[id] = comp;
        }
        });

        const newWebsite: Website = {
        ...website,
        theme: updatedTheme,
        components: updatedComponents,
      };

      recordHistory(`تطبيق سمة التصميم (${preset.nameAr})`, newWebsite);
    },
    [website, recordHistory]
  );

  return {
    updateThemeToken,
    applyThemePreset,
  };
};
