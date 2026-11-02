import { Website } from '../../../types/builder';
import { createActivityWebsite } from './helper';
import { restaurantComponents } from './restaurant';
import { gymComponents } from './gym';
import { clinicComponents } from './clinic';
import { salonComponents } from './salon';
import { jewelryComponents } from './jewelry';

// Export pre-built website instances for each major activity
export const sampleActivityWebsites: Record<string, Website> = {
  // 1. المطاعم والكافيهات
  site_restaurant_cafe: createActivityWebsite(
    'site_restaurant_cafe',
    'tenant_la_villa_restaurant',
    'مطعم ومقهى لافيلا جورميه',
    'lavilla',
    'restaurant',
    'restaurantWarm',
    restaurantComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والمنيو',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'لافيلا جورميه | قائمة المنيو وحجز الطاولات والطلبات',
          description: 'مطعم ومقهى لافيلا جورميه، تجربة طعام إيطالي وعالمي فاخر وحجز طاولات.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 2. الجيم والنوادي الرياضية
  site_gym_fitness: createActivityWebsite(
    'site_gym_fitness',
    'tenant_powerfit_gym',
    'أكاديمية ونادي باور فيت Gym',
    'powerfit',
    'general',
    'gymEnergetic',
    gymComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وباقات الاشتراكات',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-01T08:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'باور فيت جيم | اشتراكات اللياقة والحديد وتجربة مجانية',
          description: 'أكاديمية ونادي باور فيت الرياضي، باقات اشتراك مرنة ومدربين معتمدين.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 3. العيادات والمراكز الطبية
  site_clinic_hospital: createActivityWebsite(
    'site_clinic_hospital',
    'tenant_zaha_clinic',
    'مجمع زها الطبي التخصصي',
    'zaha-clinic',
    'clinic_health',
    'clinicalClean',
    clinicComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وحجز المواعيد',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-04-12T14:20:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'مجمع زها الطبي | حجز مواعيد الأطباء والتخصصات الطبية',
          description: 'حجز مواعيد عيادات الأسنان، الجلدية، الباطنية، والأطفال في مجمع زها الطبي.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 4. الصالونات ومراكز التجميل
  site_salon_beauty: createActivityWebsite(
    'site_salon_beauty',
    'tenant_lotus_beauty',
    'صالون ومشاغل لوتس بيوتي VIP',
    'lotus-beauty',
    'agency',
    'beautyBlush',
    salonComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية والخدمات',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-02-15T09:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'لوتس سبا وبيوتي لاونج | حجز جلسات الشعر والميك آب والعروس',
          description: 'صالون ومشاغل لوتس بيوتي للتجميل والعناية بالشعر والبشرة وباقات العرائس.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),

  // 5. الذهب والمجوهرات
  site_gold_jewelry: createActivityWebsite(
    'site_gold_jewelry',
    'tenant_zumurrud_jewelry',
    'دار الزمرد للذهب والمجوهرات والساعات',
    'zumurrud-gold',
    'ecommerce',
    'goldRoyalty',
    jewelryComponents,
    [
      {
        id: 'page_home',
        name: 'الرئيسية وكتالوج الذهب',
        slug: 'home',
        rootNodeId: 'page_root',
        createdAt: '2025-01-10T12:00:00Z',
        updatedAt: '2025-05-15T12:00:00Z',
        metadata: {
          title: 'دار الزمرد للمجوهرات | أطقم ذهب عيار 21 وسبائك وساعات',
          description: 'متجر دار الزمرد للذهب الخالص، سبائك استثمارية، أطقم شبكات، وساعات فاخرة.',
          slug: 'home',
          isHomePage: true,
        },
      },
    ]
  ),
};
