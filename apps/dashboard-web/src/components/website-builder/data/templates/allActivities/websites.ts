import { Website } from '../../../types/builder';
import { ActivityTemplateMeta } from './types';
import { createTemplateWebsite } from './helper';
import { realEstateComponents } from './realEstate';
import { fashionComponents } from './fashion';
import { groceryComponents } from './grocery';
import { homeServicesComponents } from './homeServices';
import { travelComponents } from './travel';
import { lawComponents } from './law';
import { sampleActivityWebsites } from '../sampleActivities';
import { sampleWebsites } from '../automotive';
import { mockTenants } from '../../mockTenants';
import { extraActivityWebsites, extraTemplatesMeta } from '../extraActivities';
import { all85ActivitiesMeta, generateActivityWebsite } from '../../allBusinessCatalog';

export const allActivityWebsites: Record<string, Website> = {
  // 1. المطاعم والكافيهات
  ...sampleActivityWebsites,

  // 6. العقارات والاستثمار
  site_afaq_real_estate: createTemplateWebsite(
    'site_afaq_real_estate',
    'tenant_afaq_real_estate',
    'مجموعة آفاق للتطوير والاستثمار العقاري',
    'afaq-properties',
    'real_estate',
    'realEstateEmerald',
    realEstateComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والمشاريع',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-10T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'مجموعة آفاق العقارية | فلل وقصور وأبراج سكنية وتجارية',
          description: 'مشاريع عقارية فاخرة في القاهرة الجديدة والعاصمة الإدارية مع خطط دفع مرنة ومعاينة ميدانية.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 7. السيارات الفاخرة
  site_al_majd_auto: sampleWebsites['site_al_majd_auto'],

  // 8. الأزياء والبوتيك
  site_opal_fashion: createTemplateWebsite(
    'site_opal_fashion',
    'tenant_opal_fashion',
    'بوتيك أوبال للأزياء والعبايات',
    'opal-boutique',
    'ecommerce',
    'beautyBlush',
    fashionComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والتشكيلة',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-20T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'بوتيك أوبال للأزياء | فساتين سهرة وعبايات فاخرة',
          description: 'تصاميم أزياء حصرية وأقمشة حرير وكريب إيطالي مع شحن فوري.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 9. السوبرماركت والتموين
  site_al_waha_grocery: createTemplateWebsite(
    'site_al_waha_grocery',
    'tenant_al_waha_grocery',
    'أسواق ومخابز الواحة المركزية',
    'alwaha-market',
    'ecommerce',
    'freshGrocery',
    groceryComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والعروض',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-03-01T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'أسواق الواحة | خضار وفواكه طازجة ولحوم ومقاضي بتوصيل 30 دقيقة',
          description: 'تسوق مقاضي البيت التموينية أونلاين وتصلك طازجة إلى باب بيتك.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 10. الصيانة المنزلية
  site_sarh_home_services: createTemplateWebsite(
    'site_sarh_home_services',
    'tenant_sarh_home_services',
    'شركة الصرح للصيانة والتشغيل المنزلي',
    'sarh-services',
    'agency',
    'clinicalClean',
    homeServicesComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وطلب الفني',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-05T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'الصرح للصيانة المنزلية | صيانة تكييف وسباكة وكهرباء',
          description: 'فنيين معتمدين وطوارئ صيانة منزلية بضمان 30 يوماً.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 11. السياحة والسفر
  site_ofok_travel: createTemplateWebsite(
    'site_ofok_travel',
    'tenant_ofok_travel',
    'وكالة الأفق للسياحة والسفر',
    'ofok-travel',
    'agency',
    'travelAzure',
    travelComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وبكجات السفر',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-01-25T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'وكالة الأفق للسياحة والسفر | بكجات المالديف وسويسرا والبوسنة',
          description: 'حجوزات طيران وفنادق 5 نجوم وبكجات سياحية عائلية وشهر عسل.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 12. المحاماة والاستشارات القانونية
  site_nukhba_law: createTemplateWebsite(
    'site_nukhba_law',
    'tenant_nukhba_law',
    'مكتب النخبة للمحاماة والاستشارات',
    'nukhba-law',
    'agency',
    'legalNavy',
    lawComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وحجز استشارة',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-01-05T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'مكتب النخبة للمحاماة | استشارات قانونية، عقود شركات، وتحكيم تجاري',
          description: 'محامون معتمدون في الرياض KAFD لصياغة العقود وتأسيس الشركات والتمثيل القضائي.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 13-18. الأنشطة الإضافية الجديدة المكتملة
  ...extraActivityWebsites,
};

// Auto-generate website trees for all 85 catalog activities if not already customized
all85ActivitiesMeta.forEach((meta) => {
  if (!allActivityWebsites[meta.id]) {
    allActivityWebsites[meta.id] = generateActivityWebsite(meta);
  }
});

// ==========================================
// قوالب الأنشطة الناقصة (مطلوبة من activitiesRegistry كـ defaultWebsiteId)
// ==========================================
const missingRegistrySiteMetas: ActivityTemplateMeta[] = [
  {
    id: 'site_supermarket_grocery',
    tenantId: 'tenant_al_waha_grocery',
    name: 'سوبرماركت البقالة والتموين المنزلي',
    category: 'البقالة والتموين',
    icon: '🛒',
    badge: 'خضار وفواكه طازجة ومقاضي بتوصيل سريع',
    themeKey: 'groceryFresh',
    primaryColor: '#16a34a',
    description: 'قالب سوبرماركت متكامل: مقاضي منزلية، خضار وفواكه يومية، ألبان ولحوم، وعروض أسبوعية بتوصيل لحد باب البيت.',
    tags: ['سوبرماركت', 'مقاضي', 'توصيل سريع', 'عروض أسبوعية'],
  },
  {
    id: 'site_fashion_apparel',
    tenantId: 'tenant_opal_fashion',
    name: 'أوبال للأزياء والملابس الجاهزة',
    category: 'الأزياء والملابس',
    icon: '👗',
    badge: 'أحدث صيحات الموضة للرجال والنساء والأطفال',
    themeKey: 'fashionChic',
    primaryColor: '#db2777',
    description: 'قالب أزياء أنيق: كولكشن الموسم الجديد، ملابس كاجوال وفخمة، أحذية وحقائب، مع تجربة تسوق سلسة وشحن لكل المحافظات.',
    tags: ['أزياء', 'موضة', 'كولكشن جديد', 'شحن لكل المحافظات'],
  },
  {
    id: 'site_gold_jewelry',
    tenantId: 'tenant_zumurrud_jewelry',
    name: 'الزمرد للمجوهرات والذهب والمصاغ',
    category: 'الذهب والمجوهرات',
    icon: '💎',
    badge: 'ذهب عيار 18 و21 ومجوهرات ماسية بضمان مصنع',
    themeKey: 'goldRoyalty',
    primaryColor: '#d97706',
    description: 'قالب مجوهرات فخم: شغل مصنع، سلاسل وخواتم وأطقم زفاف، مجوهرات ماسية بشهادات أصالة، وشنطة كماليات متنوعة.',
    tags: ['ذهب', 'مجوهرات', 'أطقم زفاف', 'شهادات أصالة'],
  },
  {
    id: 'site_real_estate',
    tenantId: 'tenant_afaq_real_estate',
    name: 'آفاق للتطوير والاستثمار العقاري',
    category: 'العقارات',
    icon: '🏢',
    badge: 'شقق وفيلات ومحلات للبيع والإيجار',
    themeKey: 'realEstateEmerald',
    primaryColor: '#059669',
    description: 'قالب عقاري متكامل: وحدات سكنية وتجارية للبيع والإيجار، معاينات بالفيديو، حجز جولات ميدانية، وحاسبة أقساط.',
    tags: ['عقارات', 'شقق للبيع', 'إيجارات', 'استثمار عقاري'],
  },
  {
    id: 'site_auto_service_parts',
    tenantId: 'tenant_auto_service_parts',
    name: 'مركز خدمة السيارات وقطع الغيار الأصلية',
    category: 'خدمة السيارات',
    icon: '🔧',
    badge: 'صيانة شاملة وقطع غيار أصلية بضمان معتمد',
    themeKey: 'automotiveSpeed',
    primaryColor: '#dc2626',
    description: 'قالب مركز سيارات: صيانة دورية، ميكانيكا وكهرباء، قطع غيار أصلية وبديل، زيوت وفلاتر، مع حجز موعد صيانة أونلاين.',
    tags: ['صيانة سيارات', 'قطع غيار', 'زيوت وفلاتر', 'حجز موعد'],
  },
  {
    id: 'site_agriculture_nursery',
    tenantId: 'tenant_oasis_nursery',
    name: 'واحة الزراعة والمشاتل ومستلزمات الحدائق',
    category: 'الزراعة والمشاتل',
    icon: '🌱',
    badge: 'شتلات ونباتات زينة وأسمدة ومستلزمات زراعية',
    themeKey: 'nurseryGreen',
    primaryColor: '#15803d',
    description: 'قالب زراعي: مشاتل وشتلات مثمرة، نباتات زينة داخلية وخارجية، أسمدة ومبيدات، أدوات حدائق، مع استشارات زراعية.',
    tags: ['مشاتل', 'شتلات', 'أسمدة', 'نباتات زينة'],
  },
  {
    id: 'site_factories_production',
    tenantId: 'tenant_sharq_factory',
    name: 'الشرق للمصانع والإنتاج والتوريدات',
    category: 'المصانع والإنتاج',
    icon: '🏭',
    badge: 'إنتاج وتصنيع وتوريدات بالجملة بأسعار مصانع',
    themeKey: 'factoryIndustrial',
    primaryColor: '#374151',
    description: 'قالب مصنعي B2B: خطوط إنتاج، تصنيع حسب الطلب، توريدات جملة للتجار والموزعين، وعروض أسعار مخصصة للمشاريع.',
    tags: ['مصانع', 'تصنيع', 'توريدات جملة', 'B2B'],
  },
];
missingRegistrySiteMetas.forEach((meta) => {
  allActivityWebsites[meta.id] = generateActivityWebsite(meta);
});

// Metadata for UI Switcher (Full 85 Activities Catalog)
export const activityTemplatesMeta: ActivityTemplateMeta[] = all85ActivitiesMeta;
