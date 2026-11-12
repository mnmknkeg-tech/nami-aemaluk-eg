import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const realEstatePresets: Record<string, ThemePreset> = {
  realEstateEmerald: {
    name: 'Real Estate Emerald',
    nameAr: 'زمردي راقي للعقارات',
    category: 'commercial',
    descriptionAr: 'زمردي راقي للعقارات والاستثمار العقاري.',
    preview: { bg: '#064e3b', card: '#f0fdf4' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#047857',
        primaryHover: '#065f46',
        secondary: '#064e3b',
        accent: '#10b981',
        surface: '#f0fdf4',
        border: '#d1fae5',
      },
    },
  },
};
