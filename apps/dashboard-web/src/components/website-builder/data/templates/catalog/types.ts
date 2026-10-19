import { ActivityTemplateMeta } from '../allActivities/types';

export interface BusinessActivityDetail extends ActivityTemplateMeta {
  subdomain: string;
  businessActivity: string;
  categoryGroup: 'real_estate_living' | 'automotive' | 'retail_gold' | 'food_beverage' | 'health_beauty' | 'professional_corporate';
  hero: {
    badge: string;
    title: string;
    highlightTitle: string;
    description: string;
    primaryCta: string;
    primaryCtaTarget: string;
    secondaryCta: string;
    secondaryCtaTarget: string;
    stats: Array<{ label: string; value: string }>;
    heroImage: string;
  };
  features: Array<{
    title: string;
    description: string;
    iconName: string;
  }>;
  itemsSectionTitle: string;
  itemsSectionSubtitle: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    price: string;
    badge: string;
    imageUrl: string;
    features: string[];
    buttonText: string;
  }>;
  formSection: {
    title: string;
    subtitle: string;
    buttonText: string;
    fields: Array<{ name: string; label: string; type: string; placeholder: string; required: boolean; options?: string[] }>;
  };
  reviews: Array<{
    name: string;
    role: string;
    rating: number;
    comment: string;
    avatar: string;
  }>;
}
