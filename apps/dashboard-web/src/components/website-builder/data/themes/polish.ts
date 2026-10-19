import { DesignTokens } from '../../types/builder';
import { PresetPolish } from './types';

export const serifHeading = 'Amiri, Cairo, serif';
export const sharpRadius: DesignTokens['radius'] = { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' };
export const softRadius: DesignTokens['radius'] = { sm: '10px', md: '16px', lg: '24px', xl: '32px', full: '9999px' };

export const boldShadows: DesignTokens['shadows'] = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.10)',
  md: '0 6px 14px rgba(0, 0, 0, 0.16), 0 2px 5px rgba(0, 0, 0, 0.08)',
  lg: '0 16px 34px rgba(0, 0, 0, 0.22), 0 6px 12px rgba(0, 0, 0, 0.08)',
  glow: '0 0 26px rgba(0, 0, 0, 0.35)',
};

export const elegantShadows: DesignTokens['shadows'] = {
  sm: '0 1px 2px rgba(24, 24, 27, 0.06)',
  md: '0 6px 16px rgba(24, 24, 27, 0.10), 0 2px 6px rgba(24, 24, 27, 0.05)',
  lg: '0 18px 36px rgba(24, 24, 27, 0.14), 0 6px 12px rgba(24, 24, 27, 0.06)',
  glow: '0 0 28px rgba(217, 119, 6, 0.28)',
};

export const PRESET_POLISH: Record<string, PresetPolish> = {
  modernBlue: {
    shadows: {
      sm: '0 1px 2px rgba(29, 78, 216, 0.06)',
      md: '0 4px 10px rgba(29, 78, 216, 0.10), 0 2px 4px rgba(29, 78, 216, 0.05)',
      lg: '0 14px 28px rgba(29, 78, 216, 0.14), 0 5px 10px rgba(29, 78, 216, 0.06)',
      glow: '0 0 24px rgba(29, 78, 216, 0.30)',
    },
  },
  luxuryGold: { radius: softRadius, shadows: elegantShadows },
  automotiveSpeed: { typography: { fontHeading: 'Tajawal, sans-serif', scaleRatio: 1.2 }, shadows: boldShadows },
  realEstateEmerald: { typography: { fontHeading: 'Tajawal, sans-serif' }, shadows: elegantShadows },
  clinicalClean: { typography: { fontHeading: 'IBM Plex Sans Arabic, sans-serif' }, radius: softRadius },
  royalPurple: { typography: { fontHeading: 'Tajawal, sans-serif', scaleRatio: 1.3 }, radius: softRadius },
  restaurantWarm: { radius: softRadius },
  groceryFresh: { typography: { fontHeading: 'Almarai, sans-serif' }, radius: softRadius },
  fashionChic: { typography: { fontHeading: serifHeading, scaleRatio: 1.33 }, radius: softRadius },
  goldRoyalty: { radius: softRadius, shadows: elegantShadows },
  beautyBlush: { typography: { fontHeading: 'Tajawal, sans-serif' }, radius: softRadius },
  gymEnergetic: { typography: { fontHeading: 'Tajawal, sans-serif', scaleRatio: 1.2 }, shadows: boldShadows },
  nurseryGreen: { typography: { fontHeading: 'Almarai, sans-serif' }, radius: softRadius },
  techCyan: { typography: { fontHeading: 'IBM Plex Sans Arabic, sans-serif', scaleRatio: 1.2 } },
  homeServiceOrange: { typography: { fontHeading: 'Tajawal, sans-serif' } },
  travelAzure: { radius: softRadius },
  legalNavy: { typography: { fontHeading: serifHeading, scaleRatio: 1.2 } },
  factoryIndustrial: { radius: sharpRadius, shadows: boldShadows },
  academyIndigo: { radius: softRadius },
  furnitureWarm: { typography: { fontHeading: serifHeading, scaleRatio: 1.33 }, radius: softRadius, shadows: elegantShadows },
  flowerRose: { typography: { fontHeading: 'Tajawal, sans-serif' }, radius: softRadius },
  accountingSlate: { typography: { fontHeading: 'IBM Plex Sans Arabic, sans-serif' } },
  rentalAmber: { radius: sharpRadius, shadows: boldShadows },
};
