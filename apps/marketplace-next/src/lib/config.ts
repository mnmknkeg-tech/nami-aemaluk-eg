export const siteConfig = {
  name: 'mnmknk',
  nameArabic: 'من مكانك',
  nameBusiness: 'MNMKNK Business',
  description:
    'من مكانك: أول منصة مصرية بتجمع كل حاجة في مكان واحد — تسوّق منتجات بالسعر والسلة، اطلب من مطاعمك المفضلة، احجز مواعيد عياداتك وجيمك، واطلب أي خدمة لحد باب البيت.',
  url: process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'https://nami-aemaluk-marketplace-eg.vercel.app',
  ogImage: '/og-image.png',
  locale: 'ar',
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  themeColor: '#F97316',
  keywords: ['تسويق', 'متاجر', 'منتجات', 'عروض', 'من مكانك', 'mnmknk', 'مصر', 'تجارة الكترونية'],
  // روابط تطبيقات التجار — الـ defaults لازم تكون deployments حية (القديمة
  // business-blond-psi / dashboard-web-three-kappa بقت بترجع 404 وكسرت
  // كل روابط «التاجر» في الفوتر). لو env متعرّف بيغلبها.
  businessUrl: process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://nami-aemaluk-eg-nami-eg.vercel.app',
  dashboardUrl:
    process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://nami-aemaluk-eg-dashboard-web.vercel.app',
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
