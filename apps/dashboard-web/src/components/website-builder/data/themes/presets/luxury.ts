import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const luxuryPresets: Record<string, ThemePreset> = {
  luxuryGold: {
    name: 'Luxury Obsidian & Gold',
    nameAr: 'فخامة الأسود والذهبي',
    category: 'luxury',
    descriptionAr: 'فخامة لا مثيل لها للمجوهرات والساعات الفاخرة.',
    preview: { bg: '#18181b', card: '#fafaf9' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#b45309',
        primaryHover: '#92400e',
        secondary: '#18181b',
        accent: '#d97706',
        surface: '#fafaf9',
        border: '#e7e5e4',
      },
      typography: {
        fontHeading: 'Amiri, serif',
        fontBody: 'Cairo, sans-serif',
        scaleRatio: 1.33,
        baseFontSize: '16px',
      },
    },
  },
  goldRoyalty: {
    name: 'Gold & Black Royalty',
    nameAr: 'ذهبي وأسود ملكي للذهب والمجوهرات والساعات',
    category: 'luxury',
    descriptionAr: 'ملكية وأناقة للمجوهرات الثمينة.',
    preview: { bg: '#18181b', card: '#fffdf5' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#d97706',
        primaryHover: '#b45309',
        secondary: '#18181b',
        accent: '#f59e0b',
        surface: '#fffdf5',
        border: '#fef3c7',
        textPrimary: '#18181b',
      },
      typography: {
        fontHeading: 'Amiri, serif',
        fontBody: 'Cairo, sans-serif',
        scaleRatio: 1.33,
        baseFontSize: '16px',
      },
    },
  },
  royalPurple: {
    name: 'Royal Purple & Violet',
    nameAr: 'بنفسجي ملكي وإبداعي',
    category: 'luxury',
    descriptionAr: 'إبداع وبنفسجية للمتاجر الفاخرة.',
    preview: { bg: '#faf5ff', card: '#ffffff' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        secondary: '#1e1b4b',
        accent: '#c084fc',
        surface: '#faf5ff',
        border: '#f3e8ff',
      },
    },
  },
  furnitureWarm: {
    name: 'Warm Oak & Luxury Ochre',
    nameAr: 'خشبي وخردلي راقي للمفروشات والديكور',
    category: 'luxury',
    descriptionAr: 'دفء وخشبية للمفروشات والديكور الفاخر.',
    preview: { bg: '#292524', card: '#fffbeb' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#b45309',
        primaryHover: '#92400e',
        secondary: '#292524',
        accent: '#d97706',
        surface: '#fffbeb',
        border: '#fef3c7',
      },
    },
  },
};
