export type DevActivityCategory = 'RETAIL' | 'RESTAURANT' | 'SERVICE' | 'ELECTRONICS' | 'FASHION' | 'FOOD' | 'HEALTH' | 'OTHER';

export interface DevActivity {
  id: string;
  title: string;
  category: DevActivityCategory;
}

export interface DevActivityGroup {
  id: string;
  title: string;
  activities: DevActivity[];
}

export interface DevBookingActivity {
  id: string;
  title: string;
  description: string;
}

export const DEV_ACTIVITY_GROUPS: DevActivityGroup[] = [
  {
    id: 'food_market',
    title: 'مطاعم وأغذية ومحلات تموين',
    activities: [
      {
        id: 'restaurant',
        title: 'مطعم / كافيه',
        category: 'RESTAURANT',
      },
      {
        id: 'grocery',
        title: 'سوبر ماركت / بقالة / عطارة',
        category: 'FOOD',
      },
    ],
  },
  {
    id: 'fashion_home',
    title: 'ملابس ومفروشات وأثاث وديكور',
    activities: [
      {
        id: 'fashion',
        title: 'ملابس / أحذية / إكسسوارات',
        category: 'FASHION',
      },
      {
        id: 'homeTextiles',
        title: 'مفروشات وسجاد وستائر',
        category: 'RETAIL',
      },
      {
        id: 'fabricStore',
        title: 'أقمشة وخامات وتفصيل',
        category: 'FASHION',
      },
      {
        id: 'curtainsBlinds',
        title: 'ستاير وبرقع وبلاك أوت',
        category: 'RETAIL',
      },
      {
        id: 'sofasUpholstery',
        title: 'كنب وانتريهات وتنجيد',
        category: 'SERVICE',
      },
      {
        id: 'mattressesBedding',
        title: 'مراتب وملايات ومستلزمات نوم',
        category: 'RETAIL',
      },
      {
        id: 'furniture',
        title: 'أثاث / معارض / ديكور',
        category: 'SERVICE',
      },
      {
        id: 'homeGoods',
        title: 'مستلزمات المنزل',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'jewelry_luxury',
    title: 'دهب ومجوهرات وساعات وهدايا',
    activities: [
      {
        id: 'goldJewelry',
        title: 'محلات دهب ومجوهرات',
        category: 'RETAIL',
      },
      {
        id: 'silverAccessories',
        title: 'فضة وإكسسوارات',
        category: 'RETAIL',
      },
      {
        id: 'watchesGifts',
        title: 'ساعات وهدايا فاخرة',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'real_estate',
    title: 'عقارات ومقاولات وخدمات عقارية',
    activities: [
      {
        id: 'realEstate',
        title: 'عقارات بيع وإيجار',
        category: 'SERVICE',
      },
      {
        id: 'lands',
        title: 'أراضي بيع وإيجار',
        category: 'SERVICE',
      },
      {
        id: 'contractors',
        title: 'مقاولون وتشطيبات',
        category: 'SERVICE',
      },
      {
        id: 'building_supplies',
        title: 'محلات مواد بناء ودهانات',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'vehicles',
    title: 'سيارات ومعارض وورش',
    activities: [
      {
        id: 'carShowroom',
        title: 'معارض سيارات بيع وتقسيط',
        category: 'RETAIL',
      },
      {
        id: 'auto_services',
        title: 'ورش وخدمات سيارات',
        category: 'SERVICE',
      },
      {
        id: 'auto_parts',
        title: 'قطع غيار وإطارات وإكسسوارات',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'agriculture',
    title: 'زراعة ومستلزمات زراعية',
    activities: [
      {
        id: 'agri_supplies',
        title: 'محلات زراعة وبذور وأسمدة',
        category: 'RETAIL',
      },
      {
        id: 'nurseries_landscaping',
        title: 'مشاتل وتنسيق حدائق',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'services',
    title: 'خدمات شركات وأفراد وصيانة',
    activities: [
      {
        id: 'serviceCompanies',
        title: 'شركات تقدم خدمات',
        category: 'SERVICE',
      },
      {
        id: 'individualTechnicians',
        title: 'أفراد ومعلمين وفنيين',
        category: 'SERVICE',
      },
      {
        id: 'workshops',
        title: 'ورش تصنيع وإصلاح',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'electronics_health',
    title: 'إلكترونيات وصحة وصيدليات',
    activities: [
      {
        id: 'electronics',
        title: 'كمبيوترات وموبايلات',
        category: 'ELECTRONICS',
      },
      {
        id: 'health',
        title: 'صيدلية / مستحضرات / أجهزة طبية',
        category: 'HEALTH',
      },
    ],
  },
  {
    id: 'factories',
    title: 'مصانع وورش إنتاج',
    activities: [
      {
        id: 'factories',
        title: 'مصنع / خط إنتاج',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'trade_companies',
    title: 'تجارة وشركات واستيراد',
    activities: [
      {
        id: 'tradeCompanies',
        title: 'شركة تجارة / استيراد / تصدير',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'tourism_travel',
    title: 'سياحة ورحلات وضيافة',
    activities: [
      {
        id: 'tourismTravel',
        title: 'شركة سياحة وسفر',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'livestock',
    title: 'الثروة الحيوانية',
    activities: [
      {
        id: 'livestock',
        title: 'مشروع ثروة حيوانية',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'fisheries',
    title: 'الثروة السمكية',
    activities: [
      {
        id: 'fisheries',
        title: 'مشروع ثروة سمكية',
        category: 'RETAIL',
      },
    ],
  },
  {
    id: 'energy',
    title: 'الطاقة والكهرباء',
    activities: [
      {
        id: 'energy',
        title: 'طاقة وكهرباء وصيانة',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'professional_services',
    title: 'الخدمات المهنية',
    activities: [
      {
        id: 'professionalServices',
        title: 'خدمات مهنية واستشارات',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'home_services',
    title: 'الخدمات المنزلية',
    activities: [
      {
        id: 'homeServices',
        title: 'خدمات منزلية وصيانة',
        category: 'SERVICE',
      },
    ],
  },
  {
    id: 'other',
    title: 'أنشطة أخرى',
    activities: [
      {
        id: 'other',
        title: 'نشاط آخر',
        category: 'OTHER',
      },
    ],
  },
];

export const DEV_BOOKING_ACTIVITIES: DevBookingActivity[] = [
  {
    id: 'clinic',
    title: 'عيادات',
    description: 'أطباء، تخصصات، كشف، عيادات فرعية، مواعيد وملفات مرضى.',
  },
  {
    id: 'salon_barber',
    title: 'صالونات وحلاقة',
    description: 'خبراء، خدمات تجميل، كراسي عمل، وباقات العناية.',
  },
  {
    id: 'wellness_spa',
    title: 'سبا وعناية صحية',
    description: 'معالجون، جلسات، غرف، ومدد راحة.',
  },
  {
    id: 'chalets_resorts',
    title: 'شاليهات ومنتجعات',
    description: 'وحدات إقامة، أيام متاحة، مواسم وأسعار، مرافق، وسياسات دخول.',
  },
  {
    id: 'hotels_rooms',
    title: 'فنادق وغرف إقامة',
    description: 'غرف، أجنحة، سعة، ليالي إقامة، ومرافق الفندقة.',
  },
  {
    id: 'restaurants_tables',
    title: 'مطاعم وحجز طاولات',
    description: 'طاولات، قاعات، مدد حجز، مناسبات، وطلبات خاصة.',
  },
  {
    id: 'events_venues',
    title: 'فعاليات وقاعات',
    description: 'قاعات، مناسبات، تذاكر، سعات، وتجهيزات.',
  },
  {
    id: 'vehicle_rental',
    title: 'تأجير سيارات ومركبات',
    description: 'سيارات، مدد تأجير، استلام وتسليم، وتأمين.',
  },
  {
    id: 'sports_trainers',
    title: 'ملاعب ومدربين',
    description: 'ملاعب، مدربين، حصص تدريب، وسعات.',
  },
  {
    id: 'education_courses',
    title: 'دورات وحصص تعليمية',
    description: 'مدرسون، كورسات، حصص، مستويات، ومواعيد.',
  },
  {
    id: 'maintenance_services',
    title: 'صيانة وزيارات منزلية',
    description: 'فنيون، زيارات، مناطق خدمة، ورسوم انتقال.',
  },
  {
    id: 'general_appointments',
    title: 'مواعيد عامة',
    description: 'حجوزات مرنة للخدمات التي تحتاج مواعيد فقط.',
  },
];
