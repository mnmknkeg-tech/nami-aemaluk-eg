import { Website } from '../../../types/builder';
import { createExtraWebsite } from './helper';
import { academyComponents } from './academy';
import { electronicsComponents } from './electronics';
import { furnitureComponents } from './furniture';
import { carRentalComponents } from './carRental';
import { flowersComponents } from './flowers';
import { accountingComponents } from './accounting';

export const extraActivityWebsites: Record<string, Website> = {
  // 13. التعليم والأكاديميات
  site_education_academy: createExtraWebsite(
    'site_education_academy',
    'tenant_rawad_academy',
    'أكاديمية الرواد للتعليم والتدريب وتطوير المهارات',
    'rawad-academy',
    'education',
    'academyIndigo',
    academyComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والمسارات',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-15T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'أكاديمية الرواد | دورات تدريبية معتمدة، ذكاء اصطناعي، وهندسة برمجيات',
          description: 'برامج تدريبية معتمدة مع مشاريع تطبيقية وضمان توظيف ودعم مهني متواصل.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 14. الإلكترونيات والتقنية
  site_electronics_tech: createExtraWebsite(
    'site_electronics_tech',
    'tenant_techzone_store',
    'تيك زون للإلكترونيات والأجهزة الذكية',
    'techzone-store',
    'ecommerce',
    'techCyan',
    electronicsComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والمتجر',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-18T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'تيك زون للإلكترونيات | آيفون، ماك بوك، أجهزة ذكية، شاشات ألعاب',
          description: 'أجهزة أصلية معتمدة بضمان سنتين وتوصيل فوري ودفع عند الاستلام 0%.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 15. المفروشات والديكور
  site_furniture_decor: createExtraWebsite(
    'site_furniture_decor',
    'tenant_iwan_furniture',
    'إيوان للمفروشات والديكور والتصميم الداخلي',
    'iwan-furniture',
    'ecommerce',
    'furnitureWarm',
    furnitureComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والمجموعات',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-22T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'إيوان للمفروشات الفاخرة | أطقم كنب، غرف نوم، وتصميم داخلي 3D',
          description: 'أرقى تشكيلات الأثاث والمفروشات الفاخرة بأخشاب طبيعية وأقمشة أوروبية مع ضمان 10 سنوات.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 16. تأجير السيارات
  site_car_rental: createExtraWebsite(
    'site_car_rental',
    'tenant_rental_pro',
    'رينتال برو لتأجير السيارات الفاخرة واليومية',
    'rentalpro-cars',
    'automotive',
    'rentalAmber',
    carRentalComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وحجز السيارات',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-03-05T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'رينتال برو لتأجير السيارات | مرسيدس، رينج روفر، سيارات اقتصادية بالمطار',
          description: 'استلام فوري من المطار، تأمين شامل 100%، كيلومتر مفتوح، وعقود إلكترونية موثقة.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 17. الزهور والهدايا
  site_flower_gifts: createExtraWebsite(
    'site_flower_gifts',
    'tenant_flora_gifts',
    'فلورا للزهور الطبيعية والشوكولاتة والهدايا',
    'flora-gifts',
    'ecommerce',
    'flowerRose',
    flowersComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وباقات الورد',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-03-10T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'فلورا للزهور والهدايا | باقات جوري طبيعي، شوكولاتة، توصيل خلال ساعتين',
          description: 'أجمل باقات الورد وتنسيقات الهدايا مع كرت إهداء وتوصيل مبرد وسريع في الرياض.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 18. المحاسبة والضرائب
  site_accounting_tax: createExtraWebsite(
    'site_accounting_tax',
    'tenant_diqqa_accounting',
    'مكتب الدقة للمحاسبة والضرائب والاستشارات المالية',
    'diqqa-accounting',
    'agency',
    'accountingSlate',
    accountingComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والخدمات المالية',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-03-12T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'مكتب الدقة للمحاسبة | مسك دفاتر، إقرارات ضريبية، امتثال ZATCA، وتدقيق مالي',
          description: 'محاسبون قانونيون مرخصون SOCPA لإدارة حسابات الشركات والامتثال للزكاة والضريبة.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),
};
