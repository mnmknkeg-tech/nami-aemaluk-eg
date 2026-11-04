jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (callback: (...args: any[]) => any) => callback,
}));

import { defaultDesignTokens } from '../apps/dashboard-web/src/components/website-builder/data/defaultTheme';
import { useBuilderTheme } from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderTheme';
import { Website } from '../apps/dashboard-web/src/components/website-builder/types/builder';

const baseWebsite = (components: Record<string, any>) =>
  ({
    id: 'site',
    name: 'Test site',
    theme: defaultDesignTokens,
    components,
  }) as unknown as Website;

describe('builder theme style protection', () => {
  it('keeps mobile overrides intact while applying theme-derived desktop values', () => {
    const website = baseWebsite({
      comp_hero: {
        id: 'comp_hero',
        name: 'Hero',
        type: 'hero',
        category: 'section',
        parentId: null,
        childrenIds: [],
        props: {},
        styles: {
          desktop: { backgroundColor: '#f8fafc' },
          mobile: { backgroundColor: '#f8fafc', paddingTop: '17px' },
        },
      },
    });
    const recordHistory = jest.fn();
    useBuilderTheme(website, recordHistory).applyThemePreset('luxuryGold');
    const result = recordHistory.mock.calls[0][1] as Website;
    expect(result.components.comp_hero.styles.desktop.backgroundColor).toBe('#090d16');
    expect(result.components.comp_hero.styles.mobile).toEqual({
      backgroundColor: '#f8fafc',
      paddingTop: '17px',
    });
  });
  it('preserves manual preset overrides and updates only styles inferred from the previous theme', () => {
    const website = baseWebsite({
      manualPrimary: {
        id: 'manualPrimary',
        name: 'Manual primary',
        type: 'button',
        category: 'content',
        parentId: 'parent',
        childrenIds: [],
        props: { variant: 'primary' },
        styles: {
          desktop: {
            backgroundColor: '#7c3aed',
            boxShadow: '0 10px 15px -3px #1d4ed840',
            borderRadius: '16px',
            padding: '12px 18px',
            height: '48px',
            display: 'inline-flex',
          },
        },
      },
      derivedPrimary: {
        id: 'derivedPrimary',
        name: 'Derived primary',
        type: 'button',
        category: 'content',
        parentId: 'parent',
        childrenIds: [],
        props: { variant: 'primary' },
        styles: {
          desktop: {
            backgroundColor: '#1d4ed8',
            boxShadow: '0 10px 15px -3px #1d4ed840',
            borderRadius: '16px',
          },
        },
      },
      manualHeading: {
        id: 'manualHeading',
        name: 'Manual heading',
        type: 'heading',
        category: 'typography',
        parentId: 'parent',
        childrenIds: [],
        props: {},
        styles: { desktop: { fontFamily: 'Georgia, serif', padding: '4px' } },
      },
      derivedHeading: {
        id: 'derivedHeading',
        name: 'Derived heading',
        type: 'heading',
        category: 'typography',
        parentId: 'parent',
        childrenIds: [],
        props: {},
        styles: { desktop: { fontFamily: 'Tajawal, sans-serif' } },
      },
    });
    const recordHistory = jest.fn();

    useBuilderTheme(website, recordHistory).applyThemePreset('egyptianNile');

    const result = recordHistory.mock.calls[0][1] as Website;
    expect(result.components.manualPrimary.styles.desktop).toMatchObject({
      backgroundColor: '#7c3aed',
      boxShadow: '0 10px 15px -3px #0e749040',
      borderRadius: '20px',
      padding: '12px 18px',
      height: '48px',
      display: 'inline-flex',
    });
    expect(result.components.derivedPrimary.styles.desktop).toMatchObject({
      backgroundColor: '#0e7490',
      boxShadow: '0 10px 15px -3px #0e749040',
      borderRadius: '20px',
    });
    expect(result.components.manualHeading.styles.desktop).toMatchObject({
      fontFamily: 'Georgia, serif',
      padding: '4px',
    });
    expect(result.components.derivedHeading.styles.desktop.fontFamily).toBe(
      'Cairo, Tajawal, sans-serif'
    );
    expect(result.components.manualPrimary.parentId).toBe('parent');
    expect(result.components.manualPrimary.childrenIds).toEqual([]);
  });

  it('allows a token change to refresh a prior-token style without overwriting manual values', () => {
    const website = baseWebsite({
      manualButton: {
        id: 'manualButton',
        name: 'Manual button',
        type: 'button',
        category: 'content',
        parentId: null,
        childrenIds: [],
        props: { variant: 'primary' },
        styles: {
          desktop: {
            backgroundColor: '#db2777',
            boxShadow: 'custom shadow',
            padding: '10px',
          },
        },
      },
      tokenButton: {
        id: 'tokenButton',
        name: 'Token button',
        type: 'button',
        category: 'content',
        parentId: null,
        childrenIds: [],
        props: { variant: 'primary' },
        styles: {
          desktop: {
            backgroundColor: defaultDesignTokens.colors.primary,
            boxShadow: `0 10px 15px -3px ${defaultDesignTokens.colors.primary}40`,
            padding: '10px',
          },
        },
      },
    });
    const recordHistory = jest.fn();

    useBuilderTheme(website, recordHistory).updateThemeToken('colors', 'primary', '#16a34a');

    const result = recordHistory.mock.calls[0][1] as Website;
    expect(result.components.manualButton.styles.desktop).toMatchObject({
      backgroundColor: '#db2777',
      boxShadow: 'custom shadow',
      padding: '10px',
    });
    expect(result.components.tokenButton.styles.desktop).toMatchObject({
      backgroundColor: '#16a34a',
      boxShadow: '0 10px 15px -3px #16a34a40',
      padding: '10px',
    });
  });
});
