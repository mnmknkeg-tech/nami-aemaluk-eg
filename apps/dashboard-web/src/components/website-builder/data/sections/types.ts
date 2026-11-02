import { BusinessActivity, ComponentNode } from '../../types/builder';

export type SectionCategory =
  | 'navbar'
  | 'hero'
  | 'product_detail'
  | 'about'
  | 'features'
  | 'stats'
  | 'steps'
  | 'logos'
  | 'gallery'
  | 'pricing'
  | 'team'
  | 'tabs'
  | 'accordion'
  | 'testimonials'
  | 'contact'
  | 'cta'
  | 'content'
  | 'footer'
  | 'mobile_footer'
  | 'auth';

export interface SectionCategoryDef {
  id: SectionCategory;
  nameAr: string;
  nameEn: string;
}

export const sectionCategoriesList: SectionCategoryDef[] = [
  { id: 'navbar', nameAr: 'شريط التنقل', nameEn: 'Navigation Bar' },
  { id: 'hero', nameAr: 'هيرو والواجهة الرئيسية', nameEn: 'Hero' },
  { id: 'product_detail', nameAr: 'صفحة وتفاصيل المنتج', nameEn: 'Product Details' },
  { id: 'about', nameAr: 'من نحن وقصة الشركة', nameEn: 'About Us' },
  { id: 'features', nameAr: 'المميزات والخدمات', nameEn: 'Features' },
  { id: 'stats', nameAr: 'إحصائيات وأرقام', nameEn: 'Stats & Metrics' },
  { id: 'steps', nameAr: 'خطوات وطريقة العمل', nameEn: 'How it Works' },
  { id: 'logos', nameAr: 'الشركاء والعلامات التجارية', nameEn: 'Partners & Brands' },
  { id: 'gallery', nameAr: 'معرض الصور والأسطول', nameEn: 'Gallery' },
  { id: 'pricing', nameAr: 'الأسعار والباقات', nameEn: 'Pricing' },
  { id: 'auth', nameAr: 'تسجيل الدخول وعضويات العملاء', nameEn: 'Auth & Login' },
  { id: 'team', nameAr: 'أعضاء الفريق والخبراء', nameEn: 'Team' },
  { id: 'tabs', nameAr: 'علامات التبويب', nameEn: 'Tabs' },
  { id: 'accordion', nameAr: 'الأسئلة الشائعة (FAQ)', nameEn: 'Accordion' },
  { id: 'testimonials', nameAr: 'الآراء والتقييمات', nameEn: 'Testimonials' },
  { id: 'contact', nameAr: 'التواصل والحجز', nameEn: 'Contact' },
  { id: 'cta', nameAr: 'اتخاذ إجراء وعروض حصرية', nameEn: 'Call to Action' },
  { id: 'content', nameAr: 'المحتوى والقصة', nameEn: 'Content' },
  { id: 'footer', nameAr: 'ذيل الصفحة (الفوتر)', nameEn: 'Footer' },
  { id: 'mobile_footer', nameAr: 'فوتر الموبايل (شريط سفلي ثابت)', nameEn: 'Mobile Footer' },
];

export interface SectionTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: SectionCategory;
  activity: BusinessActivity;
  style: 'modern' | 'minimal' | 'luxury' | 'corporate' | 'creative' | 'split' | 'clean';
  thumbnail?: string;
  wireframeType?: string;
  descriptionAr: string;
  tags: string[];
  nodes: Record<string, ComponentNode>;
  rootNodeId: string;
}
