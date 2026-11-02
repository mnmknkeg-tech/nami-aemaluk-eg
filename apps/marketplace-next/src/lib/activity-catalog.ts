// كتالوج أقسام الماركت — المصدر الوحيد للحقيقة (single source of truth).
//
// كل قسم بيحدد "mode" اللي بيتحكم في:
//   • شكل صفحة القسم  → app/activity/[activity]/page.tsx
//   • نوع البطاقة     → ProductCard / MenuCard / BookingCard / QuoteCard
//   • وجود السعر والسلة وشكل الزر الأساسي (CTA)
//
// query: القيمة المُرسلة للباك إند في GET /products?shopActivity=
//   الباك إند بيطابقها مع shops.activity أو shops.category (بدون حساسية لحالة الأحرف)،
//   وأكتر من قيمة مفصولة بفاصلة (,) = OR بينهم.
//
//   ⚠️ مهم جدًا: التسجيل في apps/business بيخزّن **العنوان العربي** للنشاط في shops.activity
//   (بيانات حقيقية: 'معارض سيارات' — مش 'carShowroom')، عشان كده كل قسم بيلفّ عناوين عربية.
//   مصدر العناوين: packages/shared/src/utils/businessActivityCatalog.ts
//   لو اتغيّر عنوان هناك لازم يتغيّر هنا برضه.
//   التصنيف الإنجليزي (RETAIL / RESTAURANT / ...) بيتحط كمان كخط رجعة واسع.

export type ActivityMode =
  | 'products' // منتجات بسعر + سلة
  | 'menu' // منيو مطاعم/كافيهات + فلاتر
  | 'booking' // حجز بموعد (عيادات / جيم / صالونات)
  | 'request_quote' // من غير سعر + "احجز 24 ساعة"
  | 'services' // خدمات: عرض سعر / حجز زيارة
  | 'classifieds'; // إعلانات بيع وشراء (عقارات/سيارات)

export type ActivityGroup =
  | 'food' // مطاعم وتموين
  | 'retail' // تجزئة
  | 'health' // صحة
  | 'services' // خدمات
  | 'vehicles' // سيارات
  | 'property' // عقارات
  | 'agri'; // زراعة

export type MarketActivity = {
  id: string;
  label: { ar: string; en: string };
  /** مسار صورة القسم داخل public/images/activities/ — استبدل الملف بنفس الاسم لتغييرها */
  image: string;
  /** القيمة المُرسلة في /products?shopActivity= (تدعم قيم متعددة مفصولة بفاصلة) */
  query: string;
  mode: ActivityMode;
  group: ActivityGroup;
  /** false => نخفي السعر ونستبدله بعرض "اطلب عرض سعر" */
  supportsPrice: boolean;
  /** false => نخفي زر السلة ونستخدم CTA الحجز/العرض */
  supportsCart: boolean;
  /** نص الزر الأساسي في البطاقة وصفحة القسم */
  quoteCta?: { ar: string; en: string };
  /** وحدة الحجز/العرض — مثال: ساعة / جلسة / رحلة */
  unitLabel?: { ar: string; en: string };
  /** true => القسم للتوافق مع روابط قديمة ولا يظهر في شرائط التنقل */
  hidden?: boolean;
};

type ActivitySeed = Omit<MarketActivity, 'supportsPrice' | 'supportsCart' | 'query'> & {
  query?: string;
  supportsPrice?: boolean;
  supportsCart?: boolean;
};

// القيم الافتراضية لكل وضع — بيتغير منها بس اللي القسم محتاجه.
const MODE_DEFAULTS: Record<ActivityMode, { supportsPrice: boolean; supportsCart: boolean }> = {
  products: { supportsPrice: true, supportsCart: true },
  menu: { supportsPrice: true, supportsCart: true },
  booking: { supportsPrice: true, supportsCart: false },
  request_quote: { supportsPrice: false, supportsCart: false },
  services: { supportsPrice: false, supportsCart: false },
  classifieds: { supportsPrice: true, supportsCart: false },
};

const define = (seed: ActivitySeed): MarketActivity => {
  const defaults = MODE_DEFAULTS[seed.mode];
  return {
    ...seed,
    query: seed.query ?? seed.id,
    supportsPrice: seed.supportsPrice ?? defaults.supportsPrice,
    supportsCart: seed.supportsCart ?? defaults.supportsCart,
  };
};

// ترتيب القائمة = ترتيب الظهور في شرائط التنقل والصفحة الرئيسية.
export const MARKET_ACTIVITIES: MarketActivity[] = [
  // ===== المطاعم والتموين =====
  define({
    id: 'restaurant',
    label: { ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes' },
    image: '/images/activities/restaurant.svg',
    query:
      'RESTAURANT,مطعم / كافيه,المطعم,مطعم للوجبات السريعة,مطعم الوجبات الجاهزة,عربات بيع الطعام',
    mode: 'menu',
    group: 'food',
    unitLabel: { ar: 'طبق', en: 'dish' },
  }),
  define({
    id: 'supermarket',
    label: { ar: 'سوبر ماركت', en: 'Supermarket' },
    image: '/images/activities/supermarket.svg',
    query: 'FOOD,سوبر ماركت / بقالة / عطارة',
    mode: 'products',
    group: 'food',
  }),
  define({
    id: 'bakery',
    label: { ar: 'مخابز وحلويات', en: 'Bakery & Sweets' },
    image: '/images/activities/bakery.svg',
    query: 'RESTAURANT,مخبز,متجر حلويات',
    mode: 'menu',
    group: 'food',
    unitLabel: { ar: 'قطعة', en: 'piece' },
  }),

  // ===== تجزئة =====
  define({
    id: 'fashion',
    label: { ar: 'ملابس وأزياء', en: 'Fashion' },
    image: '/images/activities/fashion.svg',
    query: 'FASHION,ملابس / أحذية / إكسسوارات,أقمشة وخامات وتفصيل',
    mode: 'products',
    group: 'retail',
  }),
  define({
    id: 'electronics',
    label: { ar: 'إلكترونيات وموبايلات', en: 'Electronics' },
    image: '/images/activities/electronics.svg',
    query: 'ELECTRONICS,كمبيوترات وموبايلات',
    mode: 'products',
    group: 'retail',
  }),
  define({
    id: 'furniture',
    label: { ar: 'أثاث وديكور', en: 'Furniture & Decor' },
    image: '/images/activities/furniture.svg',
    query:
      'أثاث / معارض / ديكور,كنب وانتريهات وتنجيد,مفروشات وسجاد وستائر,ستاير وبرقع وبلاك أوت,مراتب وملايات ومستلزمات نوم,مستلزمات المنزل',
    mode: 'request_quote',
    group: 'retail',
    quoteCta: { ar: 'احجز 24 ساعة', en: 'Book within 24h' },
    unitLabel: { ar: 'غرفة', en: 'room' },
  }),

  // ===== صحة =====
  define({
    id: 'health',
    label: { ar: 'صيدلية ومستحضرات', en: 'Pharmacy & Care' },
    image: '/images/activities/health.svg',
    query: 'HEALTH,صيدلية / مستحضرات',
    mode: 'products',
    group: 'health',
  }),
  define({
    id: 'clinics',
    label: { ar: 'عيادات ومراكز طبية', en: 'Clinics' },
    image: '/images/activities/clinic.svg',
    query: 'حجوزات ومواعيد',
    mode: 'booking',
    group: 'health',
    quoteCta: { ar: 'احجز موعد', en: 'Book appointment' },
    unitLabel: { ar: 'جلسة', en: 'session' },
  }),
  define({
    id: 'gyms',
    label: { ar: 'جيم ولياقة', en: 'Gyms & Fitness' },
    image: '/images/activities/gym.svg',
    query: 'الاشتراكات,برنامج إدارة الجيم والنوادي,برنامج إدارة الاشتراكات',
    mode: 'booking',
    group: 'health',
    quoteCta: { ar: 'اشترك الآن', en: 'Subscribe' },
    unitLabel: { ar: 'شهر', en: 'month' },
  }),

  // ===== سيارات =====
  define({
    id: 'cars',
    label: { ar: 'سيارات', en: 'Cars' },
    image: '/images/activities/cars.svg',
    query: 'معارض سيارات,ورشة وصيانة سيارات,قطع غيار سيارات',
    mode: 'classifieds',
    group: 'vehicles',
    quoteCta: { ar: 'تواصل مع المعرض', en: 'Contact showroom' },
  }),

  // ===== عقارات =====
  define({
    id: 'real-estate',
    label: { ar: 'عقارات', en: 'Real Estate' },
    image: '/images/activities/real-estate.svg',
    query: 'عقارات بيع وإيجار,أراضي وبيع وشراء',
    mode: 'classifieds',
    group: 'property',
    quoteCta: { ar: 'اطلب معاينة', en: 'Request viewing' },
  }),

  // ===== خدمات =====
  define({
    id: 'construction',
    label: { ar: 'مقاولات وتشطيبات', en: 'Construction' },
    image: '/images/activities/construction.svg',
    query: 'مقاولات وتشطيبات,مواد بناء وأدوات',
    mode: 'services',
    group: 'services',
    quoteCta: { ar: 'اطلب عرض سعر', en: 'Request a quote' },
    unitLabel: { ar: 'مشروع', en: 'project' },
  }),
  define({
    id: 'professional',
    label: { ar: 'خدمات مهنية', en: 'Professional' },
    image: '/images/activities/professional.svg',
    query: 'خدمات مهنية,شركات خدمات,شركات تجارية,مصانع وإنتاج,طاقة ومحطات',
    mode: 'services',
    group: 'services',
    quoteCta: { ar: 'اطلب عرض سعر', en: 'Request a quote' },
    unitLabel: { ar: 'ساعة', en: 'hour' },
  }),
  define({
    id: 'home',
    label: { ar: 'خدمات منزلية', en: 'Home Services' },
    image: '/images/activities/home.svg',
    query: 'خدمات منزلية,فنيين مستقلين,ورش صناعية',
    mode: 'services',
    group: 'services',
    quoteCta: { ar: 'احجز زيارة', en: 'Book a visit' },
    unitLabel: { ar: 'زيارة', en: 'visit' },
  }),

  // ===== زراعة =====
  define({
    id: 'agriculture',
    label: { ar: 'زراعة', en: 'Agriculture' },
    image: '/images/activities/agriculture.svg',
    query: 'مستلزمات زراعية,مشتل وتنسيق حدائق,ثروة حيوانية,ثروة سمكية',
    mode: 'products',
    group: 'agri',
  }),

  // ===== أسماء مستعارة للتوافق مع روابط قديمة (مش بتظهر في الشرائط) =====
  define({
    id: 'medical',
    label: { ar: 'طبي', en: 'Medical' },
    image: '/images/activities/medical.svg',
    query: 'حجوزات ومواعيد',
    mode: 'booking',
    group: 'health',
    quoteCta: { ar: 'احجز موعد', en: 'Book appointment' },
    hidden: true,
  }),
  define({
    id: 'vehicles',
    label: { ar: 'سيارات وورش', en: 'Vehicles' },
    image: '/images/activities/cars.svg',
    query: 'معارض سيارات,ورشة وصيانة سيارات,قطع غيار سيارات',
    mode: 'classifieds',
    group: 'vehicles',
    hidden: true,
  }),
  define({
    id: 'contractors',
    label: { ar: 'مقاولات', en: 'Contractors' },
    image: '/images/activities/construction.svg',
    query: 'مقاولات وتشطيبات,مواد بناء وأدوات',
    mode: 'services',
    group: 'services',
    hidden: true,
  }),
  define({
    id: 'realEstate',
    label: { ar: 'عقارات (إنجليزي)', en: 'Real Estate' },
    image: '/images/activities/real-estate.svg',
    query: 'عقارات بيع وإيجار,أراضي وبيع وشراء',
    mode: 'classifieds',
    group: 'property',
    hidden: true,
  }),
];

/** الأقسام الظاهرة في شرائط التنقل والصفحة الرئيسية (بدون الأسماء المستعارة). */
export const VISIBLE_ACTIVITIES: MarketActivity[] = MARKET_ACTIVITIES.filter((a) => !a.hidden);

/** جِب قسم بمعرّفه — بترجّع undefined لو المعرّف مش موجود. */
export function getMarketActivity(id: string): MarketActivity | undefined {
  return MARKET_ACTIVITIES.find((a) => a.id === id);
}

/** كل الأقسام الظاهرة اللي شغّالة بوضع معيّن. */
export function getActivitiesByMode(mode: ActivityMode): MarketActivity[] {
  return VISIBLE_ACTIVITIES.filter((a) => a.mode === mode);
}

/** الأقسام مجمّعة حسب المجموعة (food / retail / ...) بترتيب أول ظهور. */
export function getActivityGroupSections(): {
  group: ActivityGroup;
  activities: MarketActivity[];
}[] {
  const sections: { group: ActivityGroup; activities: MarketActivity[] }[] = [];
  for (const activity of VISIBLE_ACTIVITIES) {
    const existing = sections.find((s) => s.group === activity.group);
    if (existing) existing.activities.push(activity);
    else sections.push({ group: activity.group, activities: [activity] });
  }
  return sections;
}

// ===== الهوية البصرية لكل قسم =====
// الهيدر/الفوتر/النافبار بهوية موحدة، وكل قسم ليه لون مميز بيظهر في:
// هيدر صفحة القسم، كروت الأقسام، عناوين الأقسام في الرئيسية.

export type ActivityTheme = {
  /** اللون الأساسي (أيقونة، زر، رابط) */
  accent: string;
  /** بداية التدرج */
  from: string;
  /** نهاية التدرج */
  to: string;
  /** خلفية فاتحة للشارات والهيرو (وضع فاتح) */
  soft: string;
};

const DEFAULT_THEME: ActivityTheme = {
  accent: '#00B8D4',
  from: '#00E5FF',
  to: '#BD00FF',
  soft: '#ECFEFF',
};

const ACTIVITY_THEMES: Record<string, ActivityTheme> = {
  restaurant: { accent: '#EA580C', from: '#FB923C', to: '#EF4444', soft: '#FFF7ED' },
  supermarket: { accent: '#16A34A', from: '#4ADE80', to: '#059669', soft: '#F0FDF4' },
  fashion: { accent: '#DB2777', from: '#F472B6', to: '#8B5CF6', soft: '#FDF2F8' },
  electronics: { accent: '#2563EB', from: '#60A5FA', to: '#06B6D4', soft: '#EFF6FF' },
  furniture: { accent: '#B45309', from: '#FBBF24', to: '#B45309', soft: '#FFFBEB' },
  health: { accent: '#0D9488', from: '#2DD4BF', to: '#0284C7', soft: '#F0FDFA' },
  clinics: { accent: '#0284C7', from: '#38BDF8', to: '#4F46E5', soft: '#EFF6FF' },
  beauty: { accent: '#E11D48', from: '#FB7185', to: '#D946EF', soft: '#FFF1F2' },
  gyms: { accent: '#4D7C0F', from: '#A3E635', to: '#059669', soft: '#F7FEE7' },
  bakery: { accent: '#EA580C', from: '#FBBF24', to: '#EA580C', soft: '#FFFBEB' },
  cars: { accent: '#334155', from: '#64748B', to: '#0F172A', soft: '#F1F5F9' },
  'real-estate': { accent: '#4F46E5', from: '#818CF8', to: '#7C3AED', soft: '#EEF2FF' },
  construction: { accent: '#B45309', from: '#F59E0B', to: '#78350F', soft: '#FFFBEB' },
  professional: { accent: '#475569', from: '#94A3B8', to: '#1E3A8A', soft: '#F1F5F9' },
  home: { accent: '#059669', from: '#34D399', to: '#0D9488', soft: '#ECFDF5' },
  agriculture: { accent: '#16A34A', from: '#4ADE80', to: '#15803D', soft: '#F0FDF4' },
  // أسماء مستعارة (معرّفات قديمة في روابط المحلات)
  medical: { accent: '#0284C7', from: '#38BDF8', to: '#4F46E5', soft: '#EFF6FF' },
  vehicles: { accent: '#334155', from: '#64748B', to: '#0F172A', soft: '#F1F5F9' },
  contractors: { accent: '#B45309', from: '#F59E0B', to: '#78350F', soft: '#FFFBEB' },
  pharmacy: { accent: '#0D9488', from: '#2DD4BF', to: '#0284C7', soft: '#F0FDFA' },
  gym: { accent: '#4D7C0F', from: '#A3E635', to: '#059669', soft: '#F7FEE7' },
  realestate: { accent: '#4F46E5', from: '#818CF8', to: '#7C3AED', soft: '#EEF2FF' },
  realEstate: { accent: '#4F46E5', from: '#818CF8', to: '#7C3AED', soft: '#EEF2FF' },
};

/** هات ثيم القسم — بيرجّع الثيم الافتراضي لو المعرّف مش موجود. */
export function getActivityTheme(id: string): ActivityTheme {
  return ACTIVITY_THEMES[id] ?? DEFAULT_THEME;
}

/** أسماء المجموعات بالعربي والإنجليزي لعناوين الدليل. */
export const ACTIVITY_GROUP_LABELS: Record<ActivityGroup, { ar: string; en: string }> = {
  food: { ar: 'أكل وشرب', en: 'Food & Drink' },
  retail: { ar: 'تسوق', en: 'Shopping' },
  health: { ar: 'صحة وجمال', en: 'Health & Beauty' },
  services: { ar: 'خدمات', en: 'Services' },
  vehicles: { ar: 'سيارات', en: 'Vehicles' },
  property: { ar: 'عقارات', en: 'Property' },
  agri: { ar: 'زراعة', en: 'Agriculture' },
};
