export const siteConfig = {
  name: 'mnmknk',
  nameArabic: 'من مكانك',
  nameBusiness: 'MNMKNK Business',
  description: 'منصة تسويق ومبيعات للأنشطة التجارية - اكتشف المتاجر والمنتجات والعروض',
  url: 'https://mnmknk.com',
  ogImage: '/og-image.png',
  locale: 'ar',
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  themeColor: '#1A1A1A',
  keywords: ['تسويق', 'متاجر', 'منتجات', 'عروض', 'من مكانك', 'mnmknk', 'مصر', 'تجارة الكترونية'],
  businessUrl: process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business-blond-psi.vercel.app',
  dashboardUrl:
    process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard-web-three-kappa.vercel.app',
};

export const navLinks = [
  { href: '/', label: { ar: 'الرئيسية', en: 'Home' } },
  { href: '/offers', label: { ar: 'العروض', en: 'Offers' } },
  { href: '/map', label: { ar: 'الخريطة', en: 'Map' } },
  { href: '/dalil', label: { ar: 'الأقسام', en: 'Categories' } },
];

// الأنشطة/الأقسام — المصدر الوحيد للحقيقة في src/lib/activity-catalog.ts
//
// activities        = كل الأقسام + الأسماء المستعارة القديمة (لازم تفضل كده
//                     عشان generateStaticParams و metadata يشتغلوا مع أي رابط قديم).
// VISIBLE_ACTIVITIES = الأقسام الظاهرة في الشرائط والقوائم (بدون الأسماء المستعارة).
export {
  MARKET_ACTIVITIES as activities,
  VISIBLE_ACTIVITIES,
  getMarketActivity,
  getActivitiesByMode,
  getActivityGroupSections,
} from './activity-catalog';

export type { ActivityMode, ActivityGroup, MarketActivity } from './activity-catalog';
