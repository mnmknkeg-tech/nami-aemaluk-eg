import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const servicesPresets: Record<string, ThemePreset> = {
  nurseryGreen: {
    name: 'Botanical Oasis Green',
    nameAr: 'أخضر نباتي وطبيعي للمشاتل والزراعة',
    category: 'services',
    descriptionAr: 'أخضر نباتي للمشاتل والزراعة.',
    preview: { bg: '#064e3b', card: '#ecfdf5' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#059669',
        primaryHover: '#047857',
        secondary: '#064e3b',
        accent: '#34d399',
        surface: '#ecfdf5',
        border: '#d1fae5',
      },
    },
  },
  homeServiceOrange: {
    name: 'Home Service Amber & Steel',
    nameAr: 'برتقالي ورمادي فولاذي للخدمات المنزلية والصيانة',
    category: 'services',
    descriptionAr: 'خدمات منزلية وصيانة ببراعة.',
    preview: { bg: '#1e293b', card: '#fff7ed' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#f97316',
        primaryHover: '#ea580c',
        secondary: '#1e293b',
        accent: '#fb923c',
        surface: '#fff7ed',
        border: '#ffedd5',
      },
    },
  },
  legalNavy: {
    name: 'Prestigious Legal Navy',
    nameAr: 'كحلي وذهبي وقور للمحاماة والاستشارات المهنية',
    category: 'services',
    descriptionAr: 'كحلي وقور للمحاماة والاستشارات.',
    preview: { bg: '#0f172a', card: '#f8fafc' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#1e3a8a',
        primaryHover: '#172554',
        secondary: '#0f172a',
        accent: '#d97706',
        surface: '#f8fafc',
        border: '#e2e8f0',
      },
    },
  },
  accountingSlate: {
    name: 'Executive Slate & Financial Blue',
    nameAr: 'كحلي وفيروزي مالي للمحاسبة والضرائب',
    category: 'services',
    descriptionAr: 'مالي ومحاسبي بالدقة والروعة.',
    preview: { bg: '#042f2e', card: '#f0fdfa' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#0f766e',
        primaryHover: '#115e59',
        secondary: '#042f2e',
        accent: '#0d9488',
        surface: '#f0fdfa',
        border: '#ccfbf1',
      },
    },
  },
};
