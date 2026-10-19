// ===== بيانات صفحة «نمّي أعمالك» — الأنواع =====
// منسوخة حرفيًا من مشروع Vite الأصلي (نمي اعمالك جديد/src/types/index.ts)

export type NavTabId =
  | 'home'
  | 'solutions'
  | 'activities'
  | 'men-makanak'
  | 'pricing'
  | 'faq'
  | 'innovations'
  | 'about'
  | 'privacy'
  | 'terms';

export type Language = 'ar' | 'en';

export interface NavTabItem {
  id: NavTabId;
  label: string;
  iconName: string;
  badge?: string;
  tagline: string;
}

export interface PromptSuggestion {
  id: string;
  query: string;
  queryEn: string;
  icon: string;
  category: string;
  aiResponse: {
    headline: string;
    description: string;
    metric?: {
      label: string;
      value: string;
      change: string;
    };
    actionText: string;
    actionType: 'discount' | 'report' | 'product' | 'growth' | 'chat';
    details: string[];
  };
  aiResponseEn: {
    headline: string;
    description: string;
    metric?: {
      label: string;
      value: string;
      change: string;
    };
    actionText: string;
    actionType: 'discount' | 'report' | 'product' | 'growth' | 'chat';
    details: string[];
  };
}

export interface SectorActivity {
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  taglineEn: string;
  icon: string;
  description: string;
  descriptionEn: string;
  categoryGroup?: 'retail' | 'service' | 'enterprise';
}

export interface CommerceTemplate {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  icon: string;
  badge: string;
  badgeEn: string;
  highlightColor: string;
}

export interface FaqItem {
  id: string;
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
}
