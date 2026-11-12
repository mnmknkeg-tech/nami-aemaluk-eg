'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShop } from '@/hooks/useShop';
import type { LucideIcon } from 'lucide-react';
import type { SidebarSection } from '@/config/sidebar';

// ═══════════════════════════════════════════════════════════════
// بيئة النشاط التجاري — كل نشاط له بيئته الخاصة (مصطلحات، أقسام، ميزات)
// الهدف: لما صاحب مطعم يدخل يلاقي النظام معمول للمطعم بس،
// وصاحب صيدلية يلاقي النظام معمول للصيدلية بس... وهكذا.
// ═══════════════════════════════════════════════════════════════

export type ActivityId =
  | 'restaurant'
  | 'cafe'
  | 'grocery'
  | 'clothing'
  | 'electronics'
  | 'pharmacy'
  | 'beauty'
  | 'service'
  | 'furniture'
  | 'retail'
  // أنشطة كتالوج التسجيل الكامل — لكل نشاط بيئته الخاصة
  | 'homeTextiles'
  | 'fabricStore'
  | 'curtainsBlinds'
  | 'sofasUpholstery'
  | 'mattressesBedding'
  | 'homeGoods'
  | 'goldJewelry'
  | 'silverAccessories'
  | 'watchesGifts'
  | 'realEstate'
  | 'lands'
  | 'contractors'
  | 'carShowroom'
  | 'livestock'
  | 'fisheries'
  | 'energy'
  | 'serviceCompanies'
  | 'individualTechnicians'
  | 'workshops'
  | 'bookings'
  | 'factories'
  | 'tradeCompanies'
  | 'tourismTravel'
  | 'professionalServices'
  | 'homeServices'
  | 'fashion'
  | 'vehicles'
  | 'agriculture'
  | 'services'
  | 'health'
  | 'other';

export type ActivityFeatures = {
  trackStock: boolean;
  showVariants: boolean;
  showAddonsManager: boolean;
  showImageMapEditor: boolean;
  showBookings: boolean;
};

export type InventoryTerms = {
  pageTitle: string;
  pageSubtitle: string;
  addItemButton: string;
  searchPlaceholder: string;
  emptyText: string;
  deleteConfirm: string;
  statsTotal: string;
  statsActive: string;
  statsLowStock: string;
  statsValue: string;
  colItem: string;
  colStock: string;
  sortStockLabel: string;
  modalNewTitle: string;
  modalEditTitle: string;
  nameLabel: string;
  stockFieldLabel: string;
  categoriesPageTitle: string;
  categoriesPageSubtitle: string;
  variantsPageTitle: string;
};

export type ItemLabelOverride = { labelAr: string };
export type SectionTitleOverride = { titleAr?: string; title?: string };

export type ActivityTailoring = {
  hiddenSections: string[];
  sectionTitles: Record<string, SectionTitleOverride>;
  hiddenItems: Record<string, string[]>;
  itemLabels: Record<string, ItemLabelOverride>;
};

// ═══════════════════════════════════════════════════════════════
// مصطلحات الحجوزات — كل نشاط بيحجز حاجة مختلفة
// ═══════════════════════════════════════════════════════════════

export type BookingNotificationSample = {
  title: string;
  desc: string;
  tone: 'blue' | 'green' | 'red' | 'amber';
};

export type BookingTerms = {
  /** تاب مقدّمي الخدمة/الأطباء/فريق العمل */
  providersTabLabel: string;
  providersSubtitle: string;
  /** تاب الغرف والقاعات */
  roomsTabLabel: string;
  roomsSubtitle: string;
  /** تاب الطاولات والأماكن */
  tablesTabLabel: string;
  tablesSubtitle: string;
  appointmentsTabLabel: string;
  activityNamePlaceholder: string;
  /** إشعارات تجريبية داخلية مخصصة للنشاط */
  demoNotifications: BookingNotificationSample[];
};

const BASE_BOOKING_TERMS: BookingTerms = {
  providersTabLabel: 'مقدمو الخدمة',
  providersSubtitle: 'إدارة مقدمي الخدمة',
  roomsTabLabel: 'الغرف والقاعات',
  roomsSubtitle: 'إدارة الغرف والقاعات',
  tablesTabLabel: 'الطاولات والأماكن',
  tablesSubtitle: 'إدارة الطاولات والأماكن',
  appointmentsTabLabel: 'جدول المواعيد',
  activityNamePlaceholder: 'مثال: عيادة الدكتور أحمد',
  demoNotifications: [
    { title: 'حجز جديد', desc: 'عميل جديد حجز موعد عند ٣ مساءً', tone: 'blue' },
    { title: 'تم تأكيد حجز', desc: 'تم تأكيد حجز السيد أحمد محمد', tone: 'green' },
    { title: 'إلغاء حجز', desc: 'تم إلغاء حجز السيدة سارة علي', tone: 'red' },
    { title: 'تذكير موعد', desc: 'موعد بعد ٣٠ دقيقة مع السيد خالد', tone: 'amber' },
  ],
};

function makeBookingTerms(overrides?: Partial<BookingTerms>): BookingTerms {
  return { ...BASE_BOOKING_TERMS, ...(overrides || {}) };
}

// ═══════════════════════════════════════════════════════════════
// أمثلة النشاط — تستخدم في الحالات الفاضية والنصائح
// عشان التاجر يلاقي أمثلة من نشاطه هو (طبق للمطعم، دواء للصيدلية...)
// ═══════════════════════════════════════════════════════════════

export type ActivitySamples = {
  /** كلمة مفردة للحاجة اللي بيبيعها: صنف / مشروب / خدمة... */
  itemWord: string;
  /** الجمع: أصناف / مشروبات / خدمات... */
  plural: string;
  /** مثال واقعي من النشاط */
  exampleItem: string;
};

export type ActivityEnvironment = {
  id: ActivityId;
  nameAr: string;
  emoji: string;
  headerBadgeClass: string;
  /** وصف قصير يظهر في لوحة النظرة العامة يخص النشاط */
  tagline: string;
  features: ActivityFeatures;
  terms: InventoryTerms;
  bookingTerms: BookingTerms;
  samples: ActivitySamples;
  addProductPath: string;
  tailoring: ActivityTailoring;
};

const BASE_TERMS: InventoryTerms = {
  pageTitle: 'المخزون',
  pageSubtitle: 'إدارة المنتجات والمخزون',
  addItemButton: 'إضافة منتج',
  searchPlaceholder: 'بحث عن منتج...',
  emptyText: 'لا توجد منتجات',
  deleteConfirm: 'هل أنت متأكد من حذف هذا المنتج؟',
  statsTotal: 'إجمالي المنتجات',
  statsActive: 'منتجات نشطة',
  statsLowStock: 'مخزون منخفض',
  statsValue: 'قيمة المخزون',
  colItem: 'المنتج',
  colStock: 'المخزون',
  sortStockLabel: 'المخزون',
  modalNewTitle: 'إضافة منتج',
  modalEditTitle: 'تعديل منتج',
  nameLabel: 'اسم المنتج',
  stockFieldLabel: 'المخزون',
  categoriesPageTitle: 'الفئات',
  categoriesPageSubtitle: 'نظم منتجاتك في فئات لتسهيل التصفح',
  variantsPageTitle: 'الأنواع والمتغيرات',
};

const NO_STOCK_TERMS: Partial<InventoryTerms> = {
  statsValue: 'متوسط السعر',
  colStock: '',
  stockFieldLabel: '',
};

function makeTerms(overrides?: Partial<InventoryTerms>): InventoryTerms {
  return { ...BASE_TERMS, ...(overrides || {}) };
}

function makeEnv(
  base: Omit<ActivityEnvironment, 'terms' | 'bookingTerms' | 'samples'> & {
    terms: Partial<InventoryTerms>;
    bookingTerms?: Partial<BookingTerms>;
    samples?: Partial<ActivitySamples>;
  }
): ActivityEnvironment {
  const { terms, bookingTerms, samples, ...rest } = base;
  return {
    ...rest,
    terms: makeTerms(terms),
    bookingTerms: makeBookingTerms(bookingTerms),
    samples: {
      itemWord: 'منتج',
      plural: 'المنتجات',
      exampleItem: 'منتج تجريبي',
      ...(samples || {}),
    },
  };
}

const INVENTORY_SECTION = 'inventory';

// ═══════════════════════════════════════════════════════════════
// تعريف بيئات الأنشطة الأساسية
// ═══════════════════════════════════════════════════════════════

const BASE_ENVIRONMENTS: Record<string, ActivityEnvironment> = {
  restaurant: makeEnv({
    id: 'restaurant',
    nameAr: 'مطعم / كافيه',
    emoji: '🍽️',
    headerBadgeClass: 'bg-amber-500',
    tagline: 'منيو، طاولات، طلبات وإضافات — كل اللي يخص مطعمك في مكان واحد',
    features: {
      trackStock: false,
      showVariants: false,
      showAddonsManager: true,
      showImageMapEditor: false,
      showBookings: true,
    },
    terms: {
      ...NO_STOCK_TERMS,
      pageTitle: 'المنيو',
      pageSubtitle: 'إدارة أصناف المنيو والأقسام',
      addItemButton: 'إضافة صنف',
      searchPlaceholder: 'بحث عن صنف...',
      emptyText: 'لا توجد أصناف في المنيو',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الصنف؟',
      statsTotal: 'إجمالي الأصناف',
      statsActive: 'أصناف متاحة',
      colItem: 'الصنف',
      modalNewTitle: 'إضافة صنف',
      modalEditTitle: 'تعديل صنف',
      nameLabel: 'اسم الصنف',
      categoriesPageTitle: 'أقسام المنيو',
      categoriesPageSubtitle: 'نظم أصناف المنيو — مقبلات، أطباق رئيسية، حلويات ومشروبات',
    },
    addProductPath: '/dashboard/inventory/add-product/restaurant',
    samples: { itemWord: 'صنف', plural: 'الأصناف', exampleItem: 'بيتزا مارغريتا' },
    bookingTerms: {
      roomsTabLabel: 'القاعات والعائلات',
      roomsSubtitle: 'إدارة قاعات المطعم والجلسات العائلية',
      tablesTabLabel: 'الطاولات',
      tablesSubtitle: 'إدارة طاولات المطعم وأماكن الجلوس',
      activityNamePlaceholder: 'مثال: مطعم كشري الشام',
      demoNotifications: [
        {
          title: 'حجز طاولة جديد',
          desc: 'عميل حجز طاولة لأربعة أشخاص الساعة ٩ مساءً',
          tone: 'blue',
        },
        { title: 'تم تأكيد حجز', desc: 'تم تأكيد حجز طاولة السيد أحمد محمد', tone: 'green' },
        { title: 'إلغاء حجز', desc: 'تم إلغاء حجز طاولة السيدة سارة علي', tone: 'red' },
        { title: 'تذكير بحجز', desc: 'حجز طاولة بعد ٣٠ دقيقة — جهز الطاولة', tone: 'amber' },
      ],
    },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        inventory: { titleAr: 'المنيو والأقسام', title: 'Menu' },
        website: { titleAr: 'موقع المطعم' },
      },
      hiddenItems: {
        bookings: ['rooms', 'doctors'],
        [INVENTORY_SECTION]: [
          'variants',
          'stocktake',
          'warehouses',
          'transfers',
          'barcode',
          'qrCode',
          'stockTracking',
          'lowStockAlerts',
        ],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'المنيو' },
        'inventory.addProduct': { labelAr: 'إضافة صنف' },
        'inventory.categories': { labelAr: 'أقسام المنيو' },
        'bookings.tables': { labelAr: 'الطاولات والقاعات' },
        'website.commercial-builder': { labelAr: 'بولدر موقع المطعم' },
      },
    },
  }),

  cafe: makeEnv({
    id: 'cafe',
    nameAr: 'مقهى',
    emoji: '☕',
    headerBadgeClass: 'bg-amber-600',
    tagline: 'مشروبات، مأكولات خفيفة وطاولات — كل اللي يخص مقهاك في مكان واحد',
    features: {
      trackStock: false,
      showVariants: false,
      showAddonsManager: true,
      showImageMapEditor: false,
      showBookings: true,
    },
    terms: {
      ...NO_STOCK_TERMS,
      pageTitle: 'قائمة المشروبات',
      pageSubtitle: 'إدارة مشروبات واصناف المقهى',
      addItemButton: 'إضافة مشروب',
      searchPlaceholder: 'بحث عن مشروب...',
      emptyText: 'لا توجد مشروبات في القائمة',
      deleteConfirm: 'هل أنت متأكد من حذف هذا المشروب؟',
      statsTotal: 'إجمالي الأصناف',
      statsActive: 'أصناف متاحة',
      colItem: 'الصنف',
      modalNewTitle: 'إضافة مشروب',
      modalEditTitle: 'تعديل صنف',
      nameLabel: 'اسم الصنف',
      categoriesPageTitle: 'أقسام القائمة',
      categoriesPageSubtitle: 'نظم قائمة المقهى — قهوة، مشروبات باردة، حلويات وساندوتشات',
    },
    addProductPath: '/dashboard/inventory/add-product/cafe',
    samples: { itemWord: 'مشروب', plural: 'المشروبات', exampleItem: 'آيس لاتيه كراميل' },
    bookingTerms: {
      roomsTabLabel: 'الجلسات',
      roomsSubtitle: 'إدارة جلسات المقهى الداخلية والخارجية',
      tablesTabLabel: 'الطاولات',
      tablesSubtitle: 'إدارة طاولات المقهى',
      activityNamePlaceholder: 'مثال: مقهى الأنس',
      demoNotifications: [
        {
          title: 'حجز طاولة جديد',
          desc: 'عميل حجز طاولة جلوس على التراس الساعة ٦ مساءً',
          tone: 'blue',
        },
        { title: 'تم تأكيد حجز', desc: 'تم تأكيد حجز السيد أحمد محمد', tone: 'green' },
        { title: 'إلغاء حجز', desc: 'تم إلغاء حجز السيدة سارة علي', tone: 'red' },
        { title: 'تذكير بحجز', desc: 'حجز تراس بعد ٣٠ دقيقة — جهز الطاولة', tone: 'amber' },
      ],
    },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        inventory: { titleAr: 'قائمة المقهى', title: 'Cafe Menu' },
        website: { titleAr: 'موقع المقهى' },
      },
      hiddenItems: {
        bookings: ['rooms', 'doctors'],
        [INVENTORY_SECTION]: [
          'variants',
          'stocktake',
          'warehouses',
          'transfers',
          'barcode',
          'qrCode',
          'stockTracking',
          'lowStockAlerts',
        ],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'قائمة المشروبات' },
        'inventory.addProduct': { labelAr: 'إضافة مشروب' },
        'inventory.categories': { labelAr: 'أقسام القائمة' },
        'bookings.tables': { labelAr: 'الطاولات والقاعات' },
        'website.commercial-builder': { labelAr: 'بولدر موقع المقهى' },
      },
    },
  }),

  grocery: makeEnv({
    id: 'grocery',
    nameAr: 'سوبر ماركت وبقالة',
    emoji: '🛒',
    headerBadgeClass: 'bg-emerald-500',
    tagline: 'بضائع يومية، أقسام طازجة وعروض — كل اللي يخص بقالتك في مكان واحد',
    features: {
      trackStock: true,
      showVariants: false,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {
      pageTitle: 'البضائع',
      pageSubtitle: 'إدارة بضائع السوبر ماركت والأقسام',
      addItemButton: 'إضافة بضاعة',
      searchPlaceholder: 'بحث عن بضاعة...',
      emptyText: 'لا توجد بضائع',
      deleteConfirm: 'هل أنت متأكد من حذف هذه البضاعة؟',
      statsTotal: 'إجمالي البضائع',
      statsActive: 'بضائع نشطة',
      colItem: 'البضاعة',
      modalNewTitle: 'إضافة بضاعة',
      modalEditTitle: 'تعديل بضاعة',
      nameLabel: 'اسم البضاعة',
      categoriesPageTitle: 'أقسام البضائع',
      categoriesPageSubtitle: 'نظم أقسام السوبر ماركت — خضار وفاكهة، ألبان، معلبات ومنظفات',
    },
    addProductPath: '/dashboard/inventory/add-product/grocery',
    samples: { itemWord: 'بضاعة', plural: 'البضائع', exampleItem: 'أرز أبو كاس ٥ كيلو' },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        inventory: { titleAr: 'البضائع والأقسام', title: 'Goods' },
        website: { titleAr: 'متجرك الإلكتروني' },
      },
      hiddenItems: {
        [INVENTORY_SECTION]: ['variants'],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'البضائع' },
        'inventory.addProduct': { labelAr: 'إضافة بضاعة' },
        'inventory.categories': { labelAr: 'الأقسام' },
        'website.commercial-builder': { labelAr: 'بولدر المتجر' },
      },
    },
  }),

  clothing: makeEnv({
    id: 'clothing',
    nameAr: 'ملابس وأزياء',
    emoji: '👗',
    headerBadgeClass: 'bg-pink-500',
    tagline: 'مقاسات، ألوان وكوليكشنات — كل اللي يخص متجر ملابسك في مكان واحد',
    features: {
      trackStock: true,
      showVariants: true,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {
      pageTitle: 'قطع الملابس',
      pageSubtitle: 'إدارة القطع والمقاسات والألوان',
      addItemButton: 'إضافة قطعة',
      searchPlaceholder: 'بحث عن قطعة...',
      emptyText: 'لا توجد قطع',
      deleteConfirm: 'هل أنت متأكد من حذف هذه القطعة؟',
      statsTotal: 'إجمالي القطع',
      statsActive: 'قطع نشطة',
      colItem: 'القطعة',
      modalNewTitle: 'إضافة قطعة',
      modalEditTitle: 'تعديل قطعة',
      nameLabel: 'اسم القطعة',
      categoriesPageTitle: 'الكوليكشنات والأقسام',
      categoriesPageSubtitle: 'نظم القطع — رجالي، حريمي، أطفال، أحذية وإكسسوارات',
      variantsPageTitle: 'المقاسات والألوان',
    },
    addProductPath: '/dashboard/inventory/add-product/clothing',
    samples: { itemWord: 'قطعة', plural: 'القطع', exampleItem: 'تيشيرت قطني أوفر سايز' },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        website: { titleAr: 'متجر الملابس' },
      },
      hiddenItems: {},
      itemLabels: {
        'inventory.addProduct': { labelAr: 'إضافة قطعة' },
        'inventory.variants': { labelAr: 'المقاسات والألوان' },
        'website.commercial-builder': { labelAr: 'بولدر المتجر' },
      },
    },
  }),

  electronics: makeEnv({
    id: 'electronics',
    nameAr: 'إلكترونيات',
    emoji: '📱',
    headerBadgeClass: 'bg-blue-500',
    tagline: 'أجهزة، موديلات ومواصفات — كل اللي يخص متجر إلكترونياتك في مكان واحد',
    features: {
      trackStock: true,
      showVariants: true,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {
      pageTitle: 'الأجهزة والمنتجات',
      pageSubtitle: 'إدارة الأجهزة والموديلات والمخزون',
      addItemButton: 'إضافة جهاز',
      searchPlaceholder: 'بحث عن جهاز...',
      emptyText: 'لا توجد أجهزة',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الجهاز؟',
      statsTotal: 'إجمالي الأجهزة',
      statsActive: 'أجهزة نشطة',
      colItem: 'الجهاز',
      modalNewTitle: 'إضافة جهاز',
      modalEditTitle: 'تعديل جهاز',
      nameLabel: 'اسم الجهاز',
      categoriesPageTitle: 'فئات الأجهزة',
      categoriesPageSubtitle: 'نظم الأجهزة — موبايلات، لابتوبات، سماعات وإكسسوارات',
      variantsPageTitle: 'الموديلات والخيارات',
    },
    addProductPath: '/dashboard/inventory/add-product/electronics',
    samples: { itemWord: 'جهاز', plural: 'الأجهزة', exampleItem: 'سماعة بلوتوث لاسلكية' },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        website: { titleAr: 'متجر الإلكترونيات' },
      },
      hiddenItems: {},
      itemLabels: {
        'inventory.addProduct': { labelAr: 'إضافة جهاز' },
        'inventory.variants': { labelAr: 'الموديلات والخيارات' },
        'website.commercial-builder': { labelAr: 'بولدر المتجر' },
      },
    },
  }),

  pharmacy: makeEnv({
    id: 'pharmacy',
    nameAr: 'صيدلية',
    emoji: '💊',
    headerBadgeClass: 'bg-teal-500',
    tagline: 'أدوية ومستحضرات، أقسام دوائية وتنبيهات نفاد — كل اللي يخص صيدليتك',
    features: {
      trackStock: true,
      showVariants: false,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {
      pageTitle: 'الأدوية والمستحضرات',
      pageSubtitle: 'إدارة أدوية ومستحضرات الصيدلية',
      addItemButton: 'إضافة صنف صيدلي',
      searchPlaceholder: 'بحث عن دواء أو مستحضر...',
      emptyText: 'لا توجد أصناف',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الصنف؟',
      statsTotal: 'إجمالي الأصناف',
      statsActive: 'أصناف نشطة',
      colItem: 'الصنف',
      modalNewTitle: 'إضافة صنف صيدلي',
      modalEditTitle: 'تعديل صنف',
      nameLabel: 'اسم الصنف',
      categoriesPageTitle: 'الأقسام الدوائية',
      categoriesPageSubtitle: 'نظم الأصناف — أدوية بوصفة، مسكنات، فيتامينات ومستحضرات تجميل',
    },
    addProductPath: '/dashboard/inventory/add-product/pharmacy',
    samples: { itemWord: 'صنف', plural: 'الأصناف', exampleItem: 'بنادول اكسترا ٢٤ قرص' },
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        website: { titleAr: 'موقع الصيدلية' },
      },
      hiddenItems: {
        [INVENTORY_SECTION]: ['variants', 'qrCode'],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'الأدوية والمستحضرات' },
        'inventory.addProduct': { labelAr: 'إضافة صنف صيدلي' },
        'inventory.categories': { labelAr: 'الأقسام الدوائية' },
        'website.commercial-builder': { labelAr: 'بولدر موقع الصيدلية' },
      },
    },
  }),

  beauty: makeEnv({
    id: 'beauty',
    nameAr: 'تجميل وعناية',
    emoji: '✨',
    headerBadgeClass: 'bg-fuchsia-500',
    tagline: 'خدمات، مواعيد وفريق عمل — كل اللي يخص صالونك في مكان واحد',
    features: {
      trackStock: false,
      showVariants: false,
      showAddonsManager: false,
      showImageMapEditor: false,
      showBookings: true,
    },
    terms: {
      ...NO_STOCK_TERMS,
      pageTitle: 'الخدمات',
      pageSubtitle: 'إدارة خدمات التجميل والعناية',
      addItemButton: 'إضافة خدمة',
      searchPlaceholder: 'بحث عن خدمة...',
      emptyText: 'لا توجد خدمات',
      deleteConfirm: 'هل أنت متأكد من حذف هذه الخدمة؟',
      statsTotal: 'إجمالي الخدمات',
      statsActive: 'خدمات نشطة',
      colItem: 'الخدمة',
      modalNewTitle: 'إضافة خدمة',
      modalEditTitle: 'تعديل خدمة',
      nameLabel: 'اسم الخدمة',
      categoriesPageTitle: 'أقسام الخدمات',
      categoriesPageSubtitle: 'نظم خدماتك — شعر، مكياج، عناية بالبشرة وأظافر',
    },
    addProductPath: '/dashboard/inventory/add-product/beauty',
    samples: { itemWord: 'خدمة', plural: 'الخدمات', exampleItem: 'جلسة سشوار وكيراتين' },
    bookingTerms: {
      providersTabLabel: 'فريق العمل',
      providersSubtitle: 'إدارة فريق الصالون — خبيرات ومتخصصين',
      appointmentsTabLabel: 'مواعيد الحجز',
      activityNamePlaceholder: 'مثال: صالون ليلى للتجميل',
      demoNotifications: [
        { title: 'حجز جلسة جديد', desc: 'عميلة حجزت جلسة سشوار الساعة ٥ مساءً', tone: 'blue' },
        { title: 'تم تأكيد حجز', desc: 'تم تأكيد حجز السيدة سارة علي', tone: 'green' },
        { title: 'إلغاء حجز', desc: 'تم إلغاء جلسة مكياج السيدة منى', tone: 'red' },
        { title: 'تذكير بجلسة', desc: 'جلسة عناية بالبعد ٣٠ دقيقة — جهز الأدوات', tone: 'amber' },
      ],
    },
    tailoring: {
      hiddenSections: [],
      sectionTitles: {
        inventory: { titleAr: 'الخدمات والحجوزات', title: 'Services' },
        website: { titleAr: 'موقع الصالون' },
      },
      hiddenItems: {
        bookings: ['rooms', 'tables'],
        [INVENTORY_SECTION]: [
          'variants',
          'stocktake',
          'suppliers',
          'purchaseOrders',
          'warehouses',
          'transfers',
          'barcode',
          'qrCode',
          'stockTracking',
          'lowStockAlerts',
        ],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'الخدمات' },
        'inventory.addProduct': { labelAr: 'إضافة خدمة' },
        'inventory.categories': { labelAr: 'أقسام الخدمات' },
        'bookings.doctors': { labelAr: 'فريق العمل' },
        'bookings.appointments': { labelAr: 'مواعيد الحجز' },
        'website.commercial-builder': { labelAr: 'بولدر موقع الصالون' },
      },
    },
  }),

  service: makeEnv({
    id: 'service',
    nameAr: 'خدمات وعيادات',
    emoji: '🩺',
    headerBadgeClass: 'bg-sky-500',
    tagline: 'خدمات، مواعيد ومقدمو خدمة — كل اللي يخص نشاطك في مكان واحد',
    features: {
      trackStock: false,
      showVariants: false,
      showAddonsManager: false,
      showImageMapEditor: false,
      showBookings: true,
    },
    terms: {
      ...NO_STOCK_TERMS,
      pageTitle: 'الخدمات',
      pageSubtitle: 'إدارة الخدمات ومواعيدها وأسعارها',
      addItemButton: 'إضافة خدمة',
      searchPlaceholder: 'بحث عن خدمة...',
      emptyText: 'لا توجد خدمات',
      deleteConfirm: 'هل أنت متأكد من حذف هذه الخدمة؟',
      statsTotal: 'إجمالي الخدمات',
      statsActive: 'خدمات نشطة',
      colItem: 'الخدمة',
      modalNewTitle: 'إضافة خدمة',
      modalEditTitle: 'تعديل خدمة',
      nameLabel: 'اسم الخدمة',
      categoriesPageTitle: 'تخصصات الخدمات',
      categoriesPageSubtitle: 'نظم خدماتك حسب التخصص — استشارات، جلسات علاج وفحوصات',
    },
    addProductPath: '/dashboard/inventory/add-product/service',
    samples: { itemWord: 'خدمة', plural: 'الخدمات', exampleItem: 'استشارة طبية أولى' },
    bookingTerms: {
      providersTabLabel: 'مقدمو الخدمة',
      providersSubtitle: 'إدارة الأطباء ومقدمي الخدمة',
      roomsTabLabel: 'غرف العلاج',
      roomsSubtitle: 'إدارة غرف العلاج والفحص',
      activityNamePlaceholder: 'مثال: عيادة الدكتور أحمد',
      demoNotifications: [
        { title: 'حجز معاد جديد', desc: 'عميل حجز معاد استشارة الساعة ٤ مساءً', tone: 'blue' },
        { title: 'تم تأكيد معاد', desc: 'تم تأكيد معاد السيد أحمد محمد', tone: 'green' },
        { title: 'إلغاء معاد', desc: 'تم إلغاء معاد السيدة سارة علي', tone: 'red' },
        { title: 'تذكير بمعاد', desc: 'معاد بعد ٣٠ دقيقة — جهز غرفة الفحص', tone: 'amber' },
      ],
    },
    tailoring: {
      hiddenSections: [],
      sectionTitles: {
        inventory: { titleAr: 'الخدمات والمواعيد', title: 'Services' },
        website: { titleAr: 'موقع الخدمات' },
      },
      hiddenItems: {
        bookings: ['tables'],
        [INVENTORY_SECTION]: [
          'variants',
          'stocktake',
          'suppliers',
          'purchaseOrders',
          'warehouses',
          'transfers',
          'barcode',
          'qrCode',
          'stockTracking',
          'lowStockAlerts',
        ],
      },
      itemLabels: {
        'inventory.products': { labelAr: 'الخدمات' },
        'inventory.addProduct': { labelAr: 'إضافة خدمة' },
        'inventory.categories': { labelAr: 'تخصصات الخدمات' },
        'bookings.doctors': { labelAr: 'مقدمو الخدمة' },
        'bookings.rooms': { labelAr: 'الغرف والعيادات' },
        'bookings.appointments': { labelAr: 'جدول المواعيد' },
        'website.commercial-builder': { labelAr: 'بولدر موقع الخدمات' },
      },
    },
  }),

  furniture: makeEnv({
    id: 'furniture',
    nameAr: 'أثاث وديكور',
    emoji: '🛋️',
    headerBadgeClass: 'bg-orange-500',
    tagline: 'قطع أثاث، غرف ومجالس — كل اللي يخص معرض أثاثك في مكان واحد',
    features: {
      trackStock: true,
      showVariants: true,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {
      pageTitle: 'قطع الأثاث',
      pageSubtitle: 'إدارة قطع الأثاث والديكور',
      addItemButton: 'إضافة قطعة أثاث',
      searchPlaceholder: 'بحث عن قطعة أثاث...',
      emptyText: 'لا توجد قطع أثاث',
      deleteConfirm: 'هل أنت متأكد من حذف هذه القطعة؟',
      statsTotal: 'إجمالي القطع',
      statsActive: 'قطع نشطة',
      colItem: 'القطعة',
      modalNewTitle: 'إضافة قطعة أثاث',
      modalEditTitle: 'تعديل قطعة',
      nameLabel: 'اسم القطعة',
      categoriesPageTitle: 'أقسام الأثاث',
      categoriesPageSubtitle: 'نظم المعروضات — كنب، غرف نوم، سجاد وديكورات',
    },
    samples: { itemWord: 'قطعة أثاث', plural: 'قطع الأثاث', exampleItem: 'كنب زاوية ثلاثي' },
    addProductPath: '/dashboard/inventory/add-product/retail',
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {
        website: { titleAr: 'معرض الأثاث' },
      },
      hiddenItems: {},
      itemLabels: {
        'inventory.addProduct': { labelAr: 'إضافة قطعة أثاث' },
        'website.commercial-builder': { labelAr: 'بولدر المعرض' },
      },
    },
  }),

  retail: makeEnv({
    id: 'retail',
    nameAr: 'متجر تجزئة',
    emoji: '🏪',
    headerBadgeClass: 'bg-slate-900',
    tagline: 'منتجات، مخزون وطلبات — كل اللي يخص متجرك في مكان واحد',
    features: {
      trackStock: true,
      showVariants: true,
      showAddonsManager: false,
      showImageMapEditor: true,
      showBookings: false,
    },
    terms: {},
    samples: { itemWord: 'منتج', plural: 'المنتجات', exampleItem: 'قميص قطني' },
    addProductPath: '/dashboard/inventory/add-product/retail',
    tailoring: {
      hiddenSections: ['bookings'],
      sectionTitles: {},
      hiddenItems: {},
      itemLabels: {},
    },
  }),
};

// ═══════════════════════════════════════════════════════════════
// اشتقاق بيئات أنشطة الكتالوج الكامل من البيئات الأساسية
// (يجب أن تكون بعد BASE_ENVIRONMENTS لتجنب Temporal Dead Zone)
// ═══════════════════════════════════════════════════════════════

type DeriveOverrides = {
  id: ActivityId;
  nameAr: string;
  emoji: string;
  headerBadgeClass?: string;
  tagline?: string;
  samples?: Partial<ActivitySamples>;
  features?: Partial<ActivityFeatures>;
  terms?: Partial<InventoryTerms>;
  /** تسميات إضافية للسايدبار تدمج فوق وراثة البيئة الأساسية */
  tailoringLabels?: Record<string, ItemLabelOverride>;
};

function deriveFrom(baseId: string, o: DeriveOverrides): ActivityEnvironment {
  const base = BASE_ENVIRONMENTS[baseId] || BASE_ENVIRONMENTS['retail'];
  const features = { ...base.features, ...(o.features || {}) };
  const w = o.samples?.itemWord || base.samples.itemWord;
  const plural = o.samples?.plural || base.samples.plural;

  const terms: Partial<InventoryTerms> = {
    addItemButton: `إضافة ${w}`,
    searchPlaceholder: `بحث عن ${w}...`,
    emptyText: `لا توجد ${plural}`,
    deleteConfirm: `هل أنت متأكد من حذف «${w}»؟`,
    statsTotal: `إجمالي ${plural}`,
    statsActive: `${plural} نشطة`,
    colItem: `ال${w}`,
    sortStockLabel: 'الكمية',
    ...(o.terms || {}),
  };

  const itemLabels: Record<string, ItemLabelOverride> = {
    'inventory.addProduct': { labelAr: `إضافة ${w}` },
    ...(o.tailoringLabels || {}),
  };

  return {
    ...base,
    id: o.id,
    nameAr: o.nameAr,
    emoji: o.emoji,
    headerBadgeClass: o.headerBadgeClass || base.headerBadgeClass,
    tagline: o.tagline || `${o.nameAr} — كل اللي يخص نشاطك في مكان واحد`,
    features,
    terms: makeTerms({ ...terms, ...(o.terms || {}) }),
    bookingTerms: makeBookingTerms(base.bookingTerms),
    samples: {
      itemWord: w,
      plural,
      exampleItem: o.samples?.exampleItem || base.samples.exampleItem,
    },
    tailoring: {
      ...base.tailoring,
      itemLabels,
    },
  };
}

const DERIVED_ENVIRONMENTS: Record<string, ActivityEnvironment> = {
  // ═══════════════════════════════════════════════════════════
  // أنشطة كتالوج التسجيل الكامل — كل نشاط ببيئته الخاصة
  // ═══════════════════════════════════════════════════════════

  homeTextiles: deriveFrom('clothing', {
    id: 'homeTextiles',
    nameAr: 'مفروشات وسجاد وستائر',
    emoji: '🛏️',
    headerBadgeClass: 'bg-rose-400',
    tagline: 'مقاسات وخامات وتفصيل — كل اللي يخص مفروشاتك في مكان واحد',
    samples: { itemWord: 'قطعة مفروشات', plural: 'المفروشات', exampleItem: 'طقم سرير مزدوج قطن' },
    terms: { categoriesPageTitle: 'أقسام المفروشات', variantsPageTitle: 'المقاسات والخامات' },
  }),

  fabricStore: deriveFrom('clothing', {
    id: 'fabricStore',
    nameAr: 'أقمشة وخامات وتفصيل',
    emoji: '🧵',
    headerBadgeClass: 'bg-violet-500',
    tagline: 'خامات بالمتر وباترونات وتفصيل — كل اللي يخص محلك في مكان واحد',
    samples: { itemWord: 'قماش', plural: 'الأقمشة', exampleItem: 'قطين مصري فاخر بالمتر' },
    terms: { categoriesPageTitle: 'أنواع الأقمشة', variantsPageTitle: 'الخامات والألوان' },
  }),

  curtainsBlinds: deriveFrom('homeTextiles', {
    id: 'curtainsBlinds',
    nameAr: 'ستاير وبرقع وبلاك أوت',
    emoji: '🪟',
    headerBadgeClass: 'bg-indigo-400',
    samples: { itemWord: 'ستارة', plural: 'الستائر', exampleItem: 'بلاك أوت مقاس بالمتر' },
    terms: { categoriesPageTitle: 'أقسام الستائر' },
  }),

  sofasUpholstery: deriveFrom('furniture', {
    id: 'sofasUpholstery',
    nameAr: 'كنب وانتريهات وتنجيد',
    emoji: '🪑',
    headerBadgeClass: 'bg-amber-700',
    tagline: 'تنجيد وإنتاج وترميم — كل اللي يخص شغلك في مكان واحد',
    features: { trackStock: false, showVariants: true },
    samples: {
      itemWord: 'طلب تنجيد',
      plural: 'طلبات التنجيد',
      exampleItem: 'إعادة تنجيد كنب ثلاثي',
    },
  }),

  mattressesBedding: deriveFrom('homeTextiles', {
    id: 'mattressesBedding',
    nameAr: 'مراتب وملايات ومستلزمات نوم',
    emoji: '🛌',
    headerBadgeClass: 'bg-sky-400',
    samples: { itemWord: 'مرتبة', plural: 'المراتب', exampleItem: 'مرتبة طبية ١٦٠×٢٠٠' },
    terms: { categoriesPageTitle: 'أقسام النوم', variantsPageTitle: 'المقاسات والصلابة' },
  }),

  homeGoods: deriveFrom('retail', {
    id: 'homeGoods',
    nameAr: 'مستلزمات المنزل',
    emoji: '🏠',
    headerBadgeClass: 'bg-teal-600',
    samples: {
      itemWord: 'أداة منزلية',
      plural: 'الأدوات المنزلية',
      exampleItem: 'طقم أواني جرانيت ٩ قطع',
    },
    terms: { categoriesPageTitle: 'أقسام المنزل' },
  }),

  goldJewelry: deriveFrom('retail', {
    id: 'goldJewelry',
    nameAr: 'محلات دهب ومجوهرات',
    emoji: '💍',
    headerBadgeClass: 'bg-yellow-500',
    tagline: 'عيارات وأوزان ومصوغات — كل اللي يخص محل الذهب في مكان واحد',
    samples: { itemWord: 'قطعة ذهب', plural: 'المصوغات', exampleItem: 'غويشة عيار ٢١' },
    terms: { categoriesPageTitle: 'أقسام المصوغات', variantsPageTitle: 'العيارات والأوزان' },
  }),

  silverAccessories: deriveFrom('goldJewelry', {
    id: 'silverAccessories',
    nameAr: 'فضة وإكسسوارات',
    emoji: '🥈',
    headerBadgeClass: 'bg-slate-400',
    samples: { itemWord: 'قطعة فضة', plural: 'قطع الفضة', exampleItem: 'حلق فضة عيار ٩٢٥' },
  }),

  watchesGifts: deriveFrom('goldJewelry', {
    id: 'watchesGifts',
    nameAr: 'ساعات وهدايا فاخرة',
    emoji: '⌚',
    headerBadgeClass: 'bg-zinc-700',
    samples: { itemWord: 'هدية فاخرة', plural: 'الهدايا', exampleItem: 'ساعة رجالي جلد أصلي' },
  }),

  realEstate: deriveFrom('service', {
    id: 'realEstate',
    nameAr: 'عقارات بيع وإيجار',
    emoji: '🏢',
    headerBadgeClass: 'bg-cyan-700',
    tagline: 'وحدات وعروض وعملاء — كل اللي يخص مكتب العقارات في مكان واحد',
    features: {
      trackStock: false,
      showVariants: false,
      showBookings: true,
      showImageMapEditor: false,
    },
    samples: {
      itemWord: 'وحدة عقارية',
      plural: 'الوحدات',
      exampleItem: 'شقة ٣ غرف بالتجمع الخامس',
    },
    terms: { pageTitle: 'الوحدات', categoriesPageTitle: 'مناطق العروض' },
  }),

  lands: deriveFrom('realEstate', {
    id: 'lands',
    nameAr: 'أراضي وبيع وشراء',
    emoji: '🗺️',
    headerBadgeClass: 'bg-lime-600',
    samples: { itemWord: 'قطعة أرض', plural: 'الأراضي', exampleItem: 'أرض ٤٠٠ متر بالشيخ زايد' },
  }),

  contractors: deriveFrom('service', {
    id: 'contractors',
    nameAr: 'مقاولات وتشطيبات',
    emoji: '🏗️',
    headerBadgeClass: 'bg-orange-600',
    tagline: 'أعمال ومشاريع وموردون — كل اللي يخص شركتك في مكان واحد',
    features: { trackStock: false, showVariants: false, showBookings: false },
    samples: { itemWord: 'أعمال', plural: 'الأعمال', exampleItem: 'تشطيب شقة كامل بالدهانات' },
    terms: { pageTitle: 'الأعمال', pageSubtitle: 'إدارة أعمال المقاولات والتسعير' },
  }),

  carShowroom: deriveFrom('electronics', {
    id: 'carShowroom',
    nameAr: 'معارض سيارات',
    emoji: '🚗',
    headerBadgeClass: 'bg-red-500',
    tagline: 'سيارات، موديلات وحالات — كل اللي يخص معرضك في مكان واحد',
    samples: { itemWord: 'سيارة', plural: 'السيارات', exampleItem: 'هيونداي إلنترا HD ٢٠٢٦' },
    terms: { categoriesPageTitle: 'فئات السيارات', variantsPageTitle: 'الموديلات وسنة الصنع' },
  }),

  livestock: deriveFrom('retail', {
    id: 'livestock',
    nameAr: 'ثروة حيوانية',
    emoji: '🐄',
    headerBadgeClass: 'bg-stone-500',
    samples: { itemWord: 'رأس ماشية', plural: 'الماشية', exampleItem: 'عجل بلدي ٣٠٠ كيلو' },
    terms: { categoriesPageTitle: 'أقسام الماشية' },
  }),

  fisheries: deriveFrom('grocery', {
    id: 'fisheries',
    nameAr: 'ثروة سمكية',
    emoji: '🐟',
    headerBadgeClass: 'bg-blue-400',
    samples: {
      itemWord: 'بضاعة سمكية',
      plural: 'البضائع السمكية',
      exampleItem: 'بلطي طازج بالكيلو',
    },
    terms: { categoriesPageTitle: 'أنواع الأسماك' },
  }),

  energy: deriveFrom('service', {
    id: 'energy',
    nameAr: 'طاقة ومحطات',
    emoji: '⚡',
    headerBadgeClass: 'bg-yellow-500',
    features: { trackStock: false, showVariants: false, showBookings: false },
    samples: {
      itemWord: 'حل طاقة',
      plural: 'حلول الطاقة',
      exampleItem: 'نظام طاقة شمسية ٥ كيلووات',
    },
    terms: { pageTitle: 'حلول الطاقة' },
  }),

  serviceCompanies: deriveFrom('service', {
    id: 'serviceCompanies',
    nameAr: 'شركات خدمات',
    emoji: '🧰',
    headerBadgeClass: 'bg-slate-600',
    samples: { itemWord: 'عقد خدمة', plural: 'عقود الخدمة', exampleItem: 'عقد نظافة وتأمين شهري' },
    terms: { pageTitle: 'العقود والخدمات', categoriesPageTitle: 'أنواع العقود' },
  }),

  individualTechnicians: deriveFrom('service', {
    id: 'individualTechnicians',
    nameAr: 'فنيين مستقلين',
    emoji: '🔧',
    headerBadgeClass: 'bg-orange-700',
    samples: {
      itemWord: 'خدمة صيانة',
      plural: 'خدمات الصيانة',
      exampleItem: 'تصليح تكييف بالمنزل',
    },
    terms: { pageTitle: 'خدمات الصيانة' },
  }),

  workshops: deriveFrom('contractors', {
    id: 'workshops',
    nameAr: 'ورش صناعية',
    emoji: '⚙️',
    headerBadgeClass: 'bg-gray-600',
    samples: { itemWord: 'أمر تشغيل', plural: 'أوامر التشغيل', exampleItem: 'خراطة قطعة غيار' },
  }),

  bookings: deriveFrom('service', {
    id: 'bookings',
    nameAr: 'حجوزات ومواعيد',
    emoji: '📅',
    headerBadgeClass: 'bg-violet-600',
    samples: { itemWord: 'موعد', plural: 'المواعيد', exampleItem: 'استشارة أولى ٣٠ دقيقة' },
  }),

  tradeCompanies: deriveFrom('retail', {
    id: 'tradeCompanies',
    nameAr: 'شركات تجارية',
    emoji: '📦',
    headerBadgeClass: 'bg-emerald-700',
    tagline: 'بضائع جملة وموردين وعملاء — كل اللي يخص شركتك في مكان واحد',
    samples: { itemWord: 'صنف جملة', plural: 'أصناف الجملة', exampleItem: 'كرتونة معلبات ٢٤ وحدة' },
    terms: { pageTitle: 'أصناف الجملة', variantsPageTitle: 'الباكدجات والكراتين' },
  }),

  factories: deriveFrom('tradeCompanies', {
    id: 'factories',
    nameAr: 'مصانع وإنتاج',
    emoji: '🏭',
    headerBadgeClass: 'bg-zinc-500',
    samples: {
      itemWord: 'منتج إنتاج',
      plural: 'منتجات الإنتاج',
      exampleItem: 'دفعة تغليف جملة ١٠٠٠ وحدة',
    },
  }),

  tourismTravel: deriveFrom('service', {
    id: 'tourismTravel',
    nameAr: 'سياحة وسفر',
    emoji: '✈️',
    headerBadgeClass: 'bg-sky-500',
    tagline: 'رحلات وبرامج وحجوزات — كل اللي يخص شركتك في مكان واحد',
    features: { trackStock: false, showVariants: false, showBookings: true },
    samples: { itemWord: 'رحلة', plural: 'الرحلات', exampleItem: 'رحلة شرم الشيخ ٥ أيام' },
    terms: { pageTitle: 'الرحلات والبرامج', categoriesPageTitle: 'وجهات الرحلات' },
  }),
};

export const ACTIVITY_ENVIRONMENTS: Record<ActivityId, ActivityEnvironment> = {
  ...BASE_ENVIRONMENTS,
  ...DERIVED_ENVIRONMENTS,

  professionalServices: deriveFrom('service', {
    id: 'professionalServices',
    nameAr: 'خدمات مهنية',
    emoji: '💼',
    headerBadgeClass: 'bg-indigo-500',
    samples: {
      itemWord: 'خدمة مهنية',
      plural: 'الخدمات المهنية',
      exampleItem: 'مراجعة حسابات شهرية',
    },
  }),

  homeServices: deriveFrom('individualTechnicians', {
    id: 'homeServices',
    nameAr: 'خدمات منزلية',
    emoji: '🛠️',
    headerBadgeClass: 'bg-teal-700',
    samples: {
      itemWord: 'خدمة منزلية',
      plural: 'الخدمات المنزلية',
      exampleItem: 'تنظيف واجهات عمارات',
    },
  }),

  other: deriveFrom('retail', {
    id: 'other',
    nameAr: 'نشاط آخر',
    emoji: '🗂️',
    headerBadgeClass: 'bg-slate-500',
  }),

  // ═══════════════════════════════════════════════════════════
  // معرفات بديلة موجودة في كتالوج التسجيل — نفس البيئة باسم مختلف
  // ═══════════════════════════════════════════════════════════

  fashion: deriveFrom('clothing', {
    id: 'fashion',
    nameAr: 'ملابس / أحذية / إكسسوارات',
    emoji: '👗',
    headerBadgeClass: 'bg-pink-500',
  }),

  vehicles: deriveFrom('carShowroom', {
    id: 'vehicles',
    nameAr: 'سيارات ووسائل نقل',
    emoji: '🚙',
    headerBadgeClass: 'bg-red-400',
    samples: { itemWord: 'مركبة', plural: 'المركبات', exampleItem: 'نقل ثقيل قطر ٢٠٢٤' },
  }),

  agriculture: deriveFrom('livestock', {
    id: 'agriculture',
    nameAr: 'زراعة ومحاصيل',
    emoji: '🌾',
    headerBadgeClass: 'bg-green-600',
    samples: { itemWord: 'محصول', plural: 'المحاصيل', exampleItem: 'طماطم بلدي بالكرتونة' },
    terms: { categoriesPageTitle: 'أقسام المحاصيل' },
  }),

  services: deriveFrom('serviceCompanies', {
    id: 'services',
    nameAr: 'خدمات متنوعة',
    emoji: '🧰',
    headerBadgeClass: 'bg-slate-600',
  }),

  health: deriveFrom('pharmacy', {
    id: 'health',
    nameAr: 'صيدلية / مستحضرات',
    emoji: '💊',
    headerBadgeClass: 'bg-teal-500',
  }),
} as unknown as Record<ActivityId, ActivityEnvironment>;

// ═══════════════════════════════════════════════════════════════
// ربط تصنيف المتجر بالنشاط
// ═══════════════════════════════════════════════════════════════

export const CATEGORY_TO_ACTIVITY: Record<string, ActivityId> = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  GROCERY: 'grocery',
  FOOD: 'grocery',
  CLOTHING: 'clothing',
  FASHION: 'clothing',
  ELECTRONICS: 'electronics',
  PHARMACY: 'pharmacy',
  BEAUTY: 'beauty',
  SERVICE: 'service',
  HEALTH: 'service',
  HOTEL: 'service',
  FURNITURE: 'furniture',
  RETAIL: 'retail',
  OTHER: 'retail',
};

export function resolveActivity(category?: string | null): ActivityEnvironment {
  const key = String(category || '')
    .trim()
    .toUpperCase();
  return ACTIVITY_ENVIRONMENTS[CATEGORY_TO_ACTIVITY[key] || 'retail'];
}

/** شكل المتجر كما يرجع من /shops/me */
type ShopLike =
  | {
      category?: string | null;
      activity?: string | null;
      layoutConfig?: { activityId?: string } | null;
    }
  | null
  | undefined;

/**
 * حل بيئة النشاط من المتجر نفسه:
 * 1) layoutConfig.activityId أو shops.activity (النشاط المختار وقت التسجيل — دقيق)
 * 2) التصنيف العام category كاحتياطي للمتاجر القديمة
 */
export function resolveShopActivity(shop: ShopLike): ActivityEnvironment {
  const raw = String(shop?.layoutConfig?.activityId || shop?.activity || '').trim();
  if (raw && ACTIVITY_ENVIRONMENTS[raw as ActivityId]) {
    return ACTIVITY_ENVIRONMENTS[raw as ActivityId];
  }
  return resolveActivity(shop?.category);
}

/** اسم جمع لعناصر النشاط (أصناف / بضائع / خدمات...) مشتق من الإحصائيات */
export function activityItemsPlural(env: ActivityEnvironment): string {
  return env.terms.statsTotal.replace(/^إجمالي\s+/, '') || 'المنتجات';
}

// ═══════════════════════════════════════════════════════════════
// تطبيق البيئة على أقسام السايدبار
// ═══════════════════════════════════════════════════════════════

export function applyActivityToSidebar(
  sections: SidebarSection[],
  env: ActivityEnvironment,
  options?: {
    forceVisibleSections?: string[];
    customHiddenItems?: string[];
    enabledFeatures?: Record<string, string[]>;
  }
): SidebarSection[] {
  const forceVisible = new Set(options?.forceVisibleSections || []);
  const hiddenSections = new Set(env.tailoring.hiddenSections);
  const customHidden = new Set(options?.customHiddenItems || []);

  const result: SidebarSection[] = [];
  for (const section of sections) {
    if (hiddenSections.has(section.id) && !forceVisible.has(section.id)) continue;

    const titleOverride = env.tailoring.sectionTitles[section.id];
    const hiddenForSection = env.tailoring.hiddenItems[section.id];
    const sectionEnabledFeatures = options?.enabledFeatures?.[section.id];

    const items = section.items
      .filter((item) => {
        if (customHidden.has(item.id) || customHidden.has(`${section.id}:${item.id}`)) return false;
        const isExplicitlyEnabledFeature =
          Array.isArray(sectionEnabledFeatures) && sectionEnabledFeatures.includes(item.id);
        if (hiddenForSection?.includes(item.id) && !isExplicitlyEnabledFeature) return false;
        return true;
      })
      .map((item) => {
        const override = env.tailoring.itemLabels[`${section.id}.${item.id}`];
        return override ? { ...item, labelAr: override.labelAr } : item;
      });

    result.push({
      ...section,
      titleAr: titleOverride?.titleAr ?? section.titleAr,
      title: titleOverride?.title ?? section.title,
      items,
    });
  }
  return result.filter((s) => s.items.length > 0);
}

// ═══════════════════════════════════════════════════════════════
// هوك جلب بيئة النشاط الحالي
// ═══════════════════════════════════════════════════════════════

export function useActivityEnvironment() {
  const { shop, loading, error, refetch } = useShop();
  const env = useMemo(() => resolveShopActivity(shop), [shop]);
  return { env, shop, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════
// حارس الميزات — يمنع فتح صفحات لا تناسب النشاط حتى بالرابط المباشر
// مثال: مطعم يحاول فتح صفحة المقاسات والألوان → يرجع للمنيو تلقائياً
// ═══════════════════════════════════════════════════════════════

export function useActivityFeatureGuard(
  feature: keyof ActivityFeatures,
  redirectTo = '/dashboard/inventory'
): boolean {
  const router = useRouter();
  const { env } = useActivityEnvironment();
  const allowed = Boolean(env.features[feature]);

  useEffect(() => {
    if (!allowed) {
      router.replace(redirectTo);
    }
  }, [allowed, redirectTo, router]);

  return allowed;
}
