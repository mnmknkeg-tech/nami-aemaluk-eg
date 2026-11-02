import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const commercialPresets: Record<string, ThemePreset> = {
  automotiveSpeed: {
    name: 'Automotive Carbon',
    nameAr: 'كربون ورياضي للسيارات',
    category: 'commercial',
    descriptionAr: 'سرعة وكربون لمتاجر السيارات وتأجيرها.',
    preview: { bg: '#09090b', card: '#f4f4f5' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#dc2626',
        primaryHover: '#b91c1c',
        secondary: '#09090b',
        accent: '#f97316',
        surface: '#f4f4f5',
        border: '#e4e4e7',
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
  rentalAmber: {
    name: 'Velocity Amber & Dark Carbon',
    nameAr: 'كهرماني سريع لتأجير السيارات',
    category: 'commercial',
    descriptionAr: 'كهرمان سريع لخدمات تأجير السيارات.',
    preview: { bg: '#18181b', card: '#fbfbfb' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#d97706',
        primaryHover: '#b45309',
        secondary: '#18181b',
        accent: '#eab308',
        surface: '#fbfbfb',
        border: '#f4f4f5',
      },
    },
  },
  factoryIndustrial: {
    name: 'Industrial Charcoal & Amber',
    nameAr: 'رمادي حديدي وبرتقالي صناعي للمصانع والإنتاج',
    category: 'commercial',
    descriptionAr: 'رمادي حديدي للمصانع والإنتاج الصناعي.',
    preview: { bg: '#0f172a', card: '#f8fafc' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#475569',
        primaryHover: '#334155',
        secondary: '#0f172a',
        accent: '#f97316',
        surface: '#f8fafc',
        border: '#e2e8f0',
      },
    },
  },
  travelAzure: {
    name: 'Travel Azure Ocean',
    nameAr: 'أزرق سماوي وبحري للسياحة والسفر',
    category: 'commercial',
    descriptionAr: 'أزرق بحري للسياحة والسفر.',
    preview: { bg: '#082f49', card: '#f0fdfa' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#0284c7',
        primaryHover: '#0369a1',
        secondary: '#082f49',
        accent: '#06b6d4',
        surface: '#f0fdfa',
        border: '#ccfbf1',
      },
    },
  },
};
