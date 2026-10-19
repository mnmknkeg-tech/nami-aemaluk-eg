import { ThemePreset } from '../types';
import { modernPresets } from './modern';
import { luxuryPresets } from './luxury';
import { commercialPresets } from './commercial';
import { realEstatePresets } from './realEstate';
import { healthBeautyPresets } from './healthBeauty';
import { foodRetailPresets } from './foodRetail';
import { fashionPresets } from './fashion';
import { servicesPresets } from './services';
import { regionalPresets } from './regional';

export const themePresets: Record<string, ThemePreset> = {
  ...modernPresets,
  ...luxuryPresets,
  ...commercialPresets,
  ...realEstatePresets,
  ...healthBeautyPresets,
  ...foodRetailPresets,
  ...fashionPresets,
  ...servicesPresets,
  ...regionalPresets,
};

export * from './modern';
export * from './luxury';
export * from './commercial';
export * from './realEstate';
export * from './healthBeauty';
export * from './foodRetail';
export * from './fashion';
export * from './services';
export * from './regional';
