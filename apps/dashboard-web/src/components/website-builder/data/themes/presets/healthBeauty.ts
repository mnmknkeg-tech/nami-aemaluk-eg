import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const healthBeautyPresets: Record<string, ThemePreset> = {
  clinicalClean: {
    name: 'Clinical Teal',
    nameAr: 'سماوي ونقي للمراكز الطبية',
    category: 'health',
    descriptionAr: 'نقاء وطبية للمراكز الطبية والعيادات.',
    preview: { bg: '#164e63', card: '#f0fdfa' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#0891b2',
        primaryHover: '#0e7490',
        secondary: '#164e63',
        accent: '#38bdf8',
        surface: '#f0fdfa',
        border: '#ccfbf1',
      },
    },
  },
  beautyBlush: {
    name: 'Beauty Blush & Lavender',
    nameAr: 'زهري ناعم ولافندر للصالونات ومراكز التجميل',
    category: 'health',
    descriptionAr: 'نعومة وتجميل للصالونات ومراكز التجميل.',
    preview: { bg: '#831843', card: '#fdf2f8' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#db2777',
        primaryHover: '#be185d',
        secondary: '#831843',
        accent: '#f472b6',
        surface: '#fdf2f8',
        border: '#fce7f3',
      },
    },
  },
  gymEnergetic: {
    name: 'High-Octane Gym Yellow & Carbon',
    nameAr: 'أصفر نيون وأسود كربوني للجيم واللياقة',
    category: 'health',
    descriptionAr: 'طاقة ونيون للجيم ومراكز اللياقة.',
    preview: { bg: '#09090b', card: '#fafaf9' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#eab308',
        primaryHover: '#ca8a04',
        secondary: '#09090b',
        accent: '#facc15',
        surface: '#fafaf9',
        border: '#e7e5e4',
        textPrimary: '#09090b',
      },
      radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
    },
  },
};
