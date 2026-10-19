import { DesignTokens } from '../../types/builder';

export interface ThemePreset {
  name: string;
  nameAr: string;
  /** تصنيف الثيم لعرضه في مجموعات (عصري / فاخر / تجاري...) */
  category?: 'modern' | 'luxury' | 'commercial' | 'services' | 'food' | 'health' | 'fashion' | 'regional';
  /** وصف تسويقي قصير يظهر في معرض الثيمات */
  descriptionAr?: string;
  /** لون مميز للمعاينة السريعة في المعرض */
  preview?: { bg?: string; card?: string };
  tokens: Partial<DesignTokens>;
}

export type PresetPolish = {
  typography?: Partial<DesignTokens['typography']>;
  radius?: DesignTokens['radius'];
  shadows?: DesignTokens['shadows'];
};
