import { ThemePreset } from '../types';
import { defaultDesignTokens } from '../defaultTokens';

export const fashionPresets: Record<string, ThemePreset> = {
  fashionChic: {
    name: 'Fashion Rose & Noir',
    nameAr: 'وردي عصري وأنيق للأزياء والملابس',
    category: 'fashion',
    descriptionAr: 'أناقة وأزياء للمتاجر الأزياء والملابس.',
    preview: { bg: '#0f172a', card: '#fff1f2' },
    tokens: {
      colors: {
        ...defaultDesignTokens.colors,
        primary: '#e11d48',
        primaryHover: '#be123c',
        secondary: '#0f172a',
        accent: '#fb7185',
        surface: '#fff1f2',
        border: '#ffe4e6',
      },
    },
  },
};
