import { Language, NavTabId } from './types';

/**
 * خريطة المسارات في نسخة Next.js.
 *
 * في مشروع Vite كانت الصفحات تُفتح داخل نافذة منبثقة (activePage state)،
 * وفي نسخة Next كل تبويب أصبح صفحة حقيقية برابط مستقل.
 *
 * ملاحظة آمنة: /about و /privacy و /terms مسارات موجودة أصلًا في المشروع الأساسي
 * ولازم تفضل شغالة (مرتبطة ببانر الكوكيز وبالـ Navbar القديم).
 * نسخ نمّي الجديدة منشورة تحت /nammy/* — وللاستبدال الكامل لاحقًا يكفي تغيير
 * القيم الثلاث دي إلى '/about' و '/privacy' و '/terms'.
 */
export const NAMMY_ROUTE_BY_TAB: Record<NavTabId, string> = {
  // تبويب «الرئيسية» في المصدَر كان يفتح صفحة محتواها HomePageView فوق سطح المكتب،
  // فهي دلوقتي صفحة '/home' — أما سطح المكتب نفسه (البحث + الأيقونات) فهو '/'
  home: '/home',
  solutions: '/solutions',
  activities: '/activities',
  'men-makanak': '/men-makanak',
  pricing: '/pricing',
  faq: '/faq',
  innovations: '/innovations',
  about: '/nammy/about',
  privacy: '/nammy/privacy',
  terms: '/nammy/terms',
};

/** صفحة محاور نمّي الذكي (كانت تُفتح بنافذة فوق سطح المكتب) */
export const AI_CHAT_ROUTE = '/ai-chat';

/** مسارات المشروع الأساسي الموجودة فعلًا — أزرار نمّي بتوجّه عليها */
export const AUTH_ROUTES = {
  login: '/login',
  signup: '/signup',
  newApp: '/new',
} as const;

/** عنوان وشعار كل صفحة (منسوخ من getPageTitle في App.tsx الأصلي) */
export const NAMMY_PAGE_META: Record<
  NavTabId | 'ai-chat',
  { ar: { title: string; badge?: string }; en: { title: string; badge?: string } }
> = {
  home: {
    ar: { title: 'الرئيسية | نمّي أعمالك', badge: 'من أول محل لأكبر منظومة' },
    en: { title: 'Home | نمّي أعمالك', badge: 'First Shop to Enterprise' },
  },
  solutions: {
    ar: { title: 'الحلول المتكاملة', badge: 'منظومة واحدة' },
    en: { title: 'Integrated Solutions', badge: 'Unified Platform' },
  },
  activities: {
    ar: { title: 'الأنشطة والقطاعات', badge: 'لكل نشاط حله' },
    en: { title: 'Business Sectors', badge: 'Industry Tailored' },
  },
  'men-makanak': {
    ar: { title: 'تطبيق من مكانك (Men Makanak)', badge: 'العملاء اللي حواليك' },
    en: { title: 'Men Makanak App', badge: 'Local Discovery' },
  },
  pricing: {
    ar: { title: 'الباقات والاستثمار', badge: 'خطط مرنة' },
    en: { title: 'Pricing & Plans', badge: 'Flexible' },
  },
  faq: {
    ar: { title: 'الأسئلة الشائعة', badge: 'إجابات واضحة' },
    en: { title: 'FAQ', badge: 'Direct Answers' },
  },
  innovations: {
    ar: { title: 'جديد نمّي أعمالك', badge: 'التحديثات القادمة' },
    en: { title: "What's New in Nammy", badge: 'Coming Updates' },
  },
  about: {
    ar: { title: 'من نحن', badge: 'نمّي أعمالك (Bluora)' },
    en: { title: 'About Us', badge: 'Nammy (Bluora)' },
  },
  privacy: {
    ar: { title: 'سياسة الخصوصية', badge: 'أمان 256-bit' },
    en: { title: 'Privacy Policy', badge: '256-bit Encrypted' },
  },
  terms: {
    ar: { title: 'الشروط والأحكام', badge: 'اتفاقية التشغيل' },
    en: { title: 'Terms of Service', badge: 'SLA 99.9%' },
  },
  'ai-chat': {
    ar: { title: 'مساعد نمّي الذكي', badge: 'Nammy AI' },
    en: { title: 'Nammy AI Assistant', badge: 'Nammy AI' },
  },
};

export function nammyPageTitle(tab: NavTabId | 'ai-chat', lang: Language): string {
  return NAMMY_PAGE_META[tab][lang].title;
}

export function nammyPageBadge(tab: NavTabId | 'ai-chat', lang: Language): string | undefined {
  return NAMMY_PAGE_META[tab][lang].badge;
}
