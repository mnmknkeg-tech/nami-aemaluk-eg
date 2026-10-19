import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const foodRetailPresets: Record<string, ThemePreset> = {
  restaurantWarm: {
    name: 'Warm Gourmet Amber',
    nameAr: 'برتقالي ودافئ للمطاعم والكافيهات',
    category: 'food',
    descriptionAr: 'دفء وبرتقالي للمطاعم والكافيهات.',
    preview: { bg: '#1c1917', card: '#fffbeb' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#ea580c', // Orange Red
        primaryHover: '#c2410c',
        secondary: '#1c1917', // Warm Stone Dark
        accent: '#f59e0b', // Amber
        surface: '#fffbeb',
        border: '#fef3c7',
        textPrimary: '#1c1917',
      },
      typography: {
        fontHeading: 'Tajawal, sans-serif',
        fontBody: 'Cairo, sans-serif',
        scaleRatio: 1.25,
        baseFontSize: '16px',
      },
    },
  },
  groceryFresh: {
    name: 'Fresh Market Green',
    nameAr: 'أخضر ليموني منعش للسوبرماركت والتموين',
    category: 'food',
    descriptionAr: 'انتعاش أخضر للسوبرماركت والتموين.',
    preview: { bg: '#14532d', card: '#f0fdf4' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#16a34a',
        primaryHover: '#15803d',
        secondary: '#14532d',
        accent: '#84cc16',
        surface: '#f0fdf4',
        border: '#dcfce7',
      },
    },
  },
  flowerRose: {
    name: 'Rose Romance & Botanical Emerald',
    nameAr: 'وردي رومانسي وزيتي للزهور والهدايا',
    category: 'food',
    descriptionAr: 'وردي رومانسي للزهور والهدايا.',
    preview: { bg: '#1c1917', card: '#fff1f2' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#e11d48',
        primaryHover: '#be123c',
        secondary: '#1c1917',
        accent: '#059669',
        surface: '#fff1f2',
        border: '#ffe4e6',
      },
    },
  },
};
