import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const modernPresets: Record<string, ThemePreset> = {
  modernBlue: {
    name: 'Modern Tech Blue',
    nameAr: 'أزرق تقني عصري',
    category: 'modern',
    descriptionAr: 'ثيم عصري نظيف للمتاجر التقنية والإلكترونيات.',
    preview: { bg: '#f0f9ff', card: '#ffffff' },
    tokens: defaultDesignTokens,
  },
  techCyan: {
    name: 'Cyber Cyan & Electric Blue',
    nameAr: 'أزرق سيان وتقني للإلكترونيات والموبايل',
    category: 'modern',
    descriptionAr: 'ثيم سيان كهربائي متجر الهواتف والإلكترونيات.',
    preview: { bg: '#e0f2fe', card: '#ffffff' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#0284c7',
        primaryHover: '#0369a1',
        secondary: '#0c4a6e',
        accent: '#38bdf8',
        surface: '#f0f9ff',
        border: '#e0f2fe',
      },
    },
  },
  academyIndigo: {
    name: 'Academic Indigo & Violet',
    nameAr: 'نيلي وأكاديمي متقدم للتعليم والتدريب',
    category: 'modern',
    descriptionAr: 'ثيم أكاديمي للتدريب والتعليم الإلكتروني.',
    preview: { bg: '#eef2ff', card: '#ffffff' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#4f46e5',
        primaryHover: '#4338ca',
        secondary: '#1e1b4b',
        accent: '#06b6d4',
        surface: '#eef2ff',
        border: '#e0e7ff',
      },
      typography: {
        fontHeading: 'Tajawal, sans-serif',
        fontBody: 'Cairo, sans-serif',
        scaleRatio: 1.25,
        baseFontSize: '16px',
      },
    },
  },
};
