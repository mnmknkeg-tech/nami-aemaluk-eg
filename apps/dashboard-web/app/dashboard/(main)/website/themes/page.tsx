'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutTemplate,
  Sparkles,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Store,
  Utensils,
  Stethoscope,
  Scissors,
  Car,
  Hotel,
  Briefcase,
  Layers,
  Palette,
  Eye,
  PlusCircle,
  Search,
  X,
  Building2,
  ShoppingBag,
  Laptop,
} from 'lucide-react';
import { all85ActivitiesMeta } from '@/components/website-builder/data/allBusinessCatalog';
import { apiRequest } from '@/lib/auth';

export interface ThemeItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  categoryNameAr: string;
  sectorId: string;
  descriptionAr: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  supportsBooking?: boolean;
  supportsCatalog?: boolean;
  features: string[];
  previewGradient: string;
  isFlagship?: boolean;
  /** Key into themePresets in defaultTheme.ts — stored alongside template so the builder applies both layout + colour palette */
  presetKey?: string;
}

/**
 * Maps a template/site ID → its matching colour preset key in defaultTheme.ts.
 * Used by handleApplyTheme to persist both template AND colour preset together.
 */
const SITE_TO_PRESET_MAP: Record<string, string> = {
  site_restaurant_cafe: 'restaurantWarm',
  site_fashion_boutique: 'fashionChic',
  site_dental_clinic: 'clinicalClean',
  site_salon_beauty: 'beautyBlush',
  site_gym_fitness: 'gymEnergetic',
  site_grocery_supermarket: 'groceryFresh',
  site_electronics: 'techCyan',
  site_gold_jewelry: 'goldRoyalty',
  site_real_estate: 'realEstateEmerald',
  site_al_majd_auto: 'automotiveSpeed',
  site_car_rental: 'rentalAmber',
  site_furniture_home: 'furnitureWarm',
  site_travel_tourism: 'travelAzure',
  site_law_firm: 'legalNavy',
  site_accounting: 'accountingSlate',
  site_nursery_plants: 'nurseryGreen',
  site_flowers_gifts: 'flowerRose',
  site_home_services: 'homeServiceOrange',
  site_factory: 'factoryIndustrial',
  site_academy_education: 'academyIndigo',
  site_luxury: 'luxuryGold',
  site_royal_purple: 'royalPurple',
  site_modern_blue: 'modernBlue',
  // Egyptian regional presets
  site_nile_blue: 'egyptianNile',
  site_papyrus: 'egyptianPapyrus',
  site_saudi_heritage: 'saudiHeritage',
  site_saudi_modern: 'saudiModern',
};

const FLAGSHIP_THEMES: ThemeItem[] = [
  {
    id: 'site_restaurant_cafe',
    nameAr: 'لا فيلا - مطعم وكافيه',
    nameEn: 'La Villa Restaurant & Cafe',
    category: 'مطاعم وكافيهات',
    categoryNameAr: 'مطاعم وكافيهات',
    sectorId: 'food',
    descriptionAr: 'منيو طعام مقسم وجذاب، حجز طاولات فوري، طلبات دليفري واستلام سفري مع سلة سريعة.',
    badge: 'شائع ومطلوب',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    primaryColor: '#D97706',
    secondaryColor: '#92400E',
    accentColor: '#F59E0B',
    supportsBooking: true,
    supportsCatalog: true,
    features: ['منيو مقسم بالفئات', 'حجز طاولات أونلاين', 'دليفري واستلام', 'عروض الكومبو'],
    previewGradient: 'from-amber-600 via-orange-600 to-amber-900',
    icon: '🍽️',
    isFlagship: true,
  },
  {
    id: 'site_fashion_boutique',
    nameAr: 'مودا لاين - أزياء وبوتيك',
    nameEn: 'Moda Line Fashion',
    category: 'الأزياء والملابس',
    categoryNameAr: 'متاجر وأزياء',
    sectorId: 'retail',
    descriptionAr:
      'واجهة فاخرة للأزياء والملابس، فلاتر حسب المقاس واللون، وعرض صور عالية الدقة مع شراء سريع.',
    badge: 'الأكثر مبيعاً',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    primaryColor: '#E11D48',
    secondaryColor: '#881337',
    accentColor: '#FB7185',
    supportsBooking: false,
    supportsCatalog: true,
    features: ['معرض أزياء كامل', 'فلترة بالمقاس واللون', 'شراء فوري للمنتج', 'آراء وتقييمات'],
    previewGradient: 'from-rose-500 via-pink-600 to-rose-900',
    icon: '👗',
    isFlagship: true,
  },
  {
    id: 'site_dental_clinic',
    nameAr: 'مجمع النخبة الطبي والعيادات',
    nameEn: 'Elite Medical & Dental Clinic',
    category: 'العيادات والمراكز الطبية',
    categoryNameAr: 'عيادات ومراكز طبية',
    sectorId: 'clinic',
    descriptionAr:
      'مخصص للعيادات والمراكز الصحية، حجز كشوفات واستشارات، تعريف بالأطباء ومواعيد العمل.',
    badge: 'متوافق مع الحجوزات',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    primaryColor: '#0D9488',
    secondaryColor: '#115E59',
    accentColor: '#14B8A6',
    supportsBooking: true,
    supportsCatalog: false,
    features: [
      'تقويم حجز كشوفات',
      'دليل الأطباء والفريق',
      'مواعيد العمل والعنوان',
      'استشارات فورية',
    ],
    previewGradient: 'from-teal-600 via-cyan-600 to-teal-900',
    icon: '🩺',
    isFlagship: true,
  },
  {
    id: 'site_beauty_salon',
    nameAr: 'سحر الأناقة - صالون وسبا',
    nameEn: 'Glamour Salon & Spa',
    category: 'الصالونات والتجميل',
    categoryNameAr: 'صالونات وتجميل',
    sectorId: 'beauty',
    descriptionAr:
      'تصميم أنيق لصالونات التجميل والعناية، حجز باقات العرائس وجلسات السبا، ومعرض قبل وبعد.',
    badge: 'تصميم ناعم',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    primaryColor: '#9333EA',
    secondaryColor: '#581C87',
    accentColor: '#C084FC',
    supportsBooking: true,
    supportsCatalog: true,
    features: ['حجز جلسات وباقات', 'معرض أعمال وتجميل', 'أسعار الخدمات بالمدة', 'تقييمات الزبائن'],
    previewGradient: 'from-purple-600 via-fuchsia-600 to-pink-900',
    icon: '💇',
    isFlagship: true,
  },
  {
    id: 'site_electronics_store',
    nameAr: 'تيك برو - إلكترونيات وأجهزة ذكية',
    nameEn: 'TechPro Electronics',
    category: 'الإلكترونيات والتقنية',
    categoryNameAr: 'إلكترونيات وتقنية',
    sectorId: 'retail',
    descriptionAr:
      'قالب إلكترونيات وأجهزة ذكية متطور، مقارنة المواصفات الفنية، وبنرات عروض وخصومات محدودة.',
    badge: 'عصري وداكن',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    primaryColor: '#0284C7',
    secondaryColor: '#075985',
    accentColor: '#00E5FF',
    supportsBooking: false,
    supportsCatalog: true,
    features: ['جداول مواصفات تفصيلية', 'بنر عروض فلاش', 'حساب تكلفة الشحن', 'تتبع الطلب'],
    previewGradient: 'from-slate-900 via-blue-900 to-cyan-900',
    icon: '📱',
    isFlagship: true,
  },
  {
    id: 'site_hotel_resort',
    nameAr: 'ريزيدنس - فندق وإقامة فندقية',
    nameEn: 'Residence Hotel & Suites',
    category: 'الفنادق والإقامات',
    categoryNameAr: 'فنادق وإقامات',
    sectorId: 'hotel',
    descriptionAr: 'عرض الغرف والأجنحة، حجز ليالي الإقامة، استعراض مرافق الفندق والأنشطة السياحية.',
    badge: 'حجوزات غرف',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    primaryColor: '#B45309',
    secondaryColor: '#78350F',
    accentColor: '#D97706',
    supportsBooking: true,
    supportsCatalog: false,
    features: ['حجز ليالي وغرف', 'معرض صور الأجنحة', 'مرافق وخدمات الفندق', 'خرائط الموقع'],
    previewGradient: 'from-yellow-700 via-amber-800 to-stone-900',
    icon: '🏨',
    isFlagship: true,
  },
  {
    id: 'site_law_firm',
    nameAr: 'استشارات قانونية ومحاماة',
    nameEn: 'Lex Partners Law & Consulting',
    category: 'المحاماة والاستشارات',
    categoryNameAr: 'خدمات واستشارات',
    sectorId: 'services',
    descriptionAr:
      'قالب رسمي للشركات والمكاتب الاستشارية، طلب استشارة، استعراض فريق الخبراء والإنجازات.',
    badge: 'رسمي واحترافي',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    primaryColor: '#334155',
    secondaryColor: '#0F172A',
    accentColor: '#64748B',
    supportsBooking: true,
    supportsCatalog: false,
    features: ['طلب استشارة أولية', 'فريق المستشارين', 'مجالات الاختصاص', 'شهادات العملاء'],
    previewGradient: 'from-slate-800 via-slate-900 to-black',
    icon: '⚖️',
    isFlagship: true,
  },
];

// 2. Classify Sector from Category and Name
function classifySector(category: string, name: string): { sectorId: string; sectorLabel: string } {
  const text = `${category} ${name}`.toLowerCase();
  if (
    text.includes('مطعم') ||
    text.includes('كافيه') ||
    text.includes('مقهى') ||
    text.includes('حلويات') ||
    text.includes('مخبز') ||
    text.includes('شاورما') ||
    text.includes('برجر') ||
    text.includes('عصائر') ||
    text.includes('أغذية')
  ) {
    return { sectorId: 'food', sectorLabel: 'مطاعم ومقاهي' };
  }
  if (
    text.includes('عياد') ||
    text.includes('طب') ||
    text.includes('أسنان') ||
    text.includes('صيدل') ||
    text.includes('مستشفى') ||
    text.includes('علاج') ||
    text.includes('بصريات') ||
    text.includes('مختبر') ||
    text.includes('جلدية')
  ) {
    return { sectorId: 'clinic', sectorLabel: 'عيادات وصحة' };
  }
  if (
    text.includes('تجميل') ||
    text.includes('صالون') ||
    text.includes('سبا') ||
    text.includes('حلاق') ||
    text.includes('عناية') ||
    text.includes('مكياج') ||
    text.includes('أظافر')
  ) {
    return { sectorId: 'beauty', sectorLabel: 'صالونات وتجميل' };
  }
  if (
    text.includes('عقار') ||
    text.includes('مقاولات') ||
    text.includes('بناء') ||
    text.includes('سيراميك') ||
    text.includes('ديكور') ||
    text.includes('أثاث') ||
    text.includes('مطابخ') ||
    text.includes('إنارة') ||
    text.includes('رخام') ||
    text.includes('دهانات') ||
    text.includes('ستائر') ||
    text.includes('تكييف') ||
    text.includes('مصاعد') ||
    text.includes('أبواب') ||
    text.includes('حدائق') ||
    text.includes('عوازل')
  ) {
    return { sectorId: 'realestate', sectorLabel: 'عقارات ومقاولات وديكور' };
  }
  if (
    text.includes('سيار') ||
    text.includes('مركب') ||
    text.includes('تأجير') ||
    text.includes('صيانة سيارات') ||
    text.includes('قطع غيار') ||
    text.includes('إطارات') ||
    text.includes('غسيل سيارات') ||
    text.includes('سطحة') ||
    text.includes('دراجات') ||
    text.includes('معدات')
  ) {
    return { sectorId: 'auto', sectorLabel: 'سيارات وصيانة ونقل' };
  }
  if (
    text.includes('فندق') ||
    text.includes('إقام') ||
    text.includes('شقق مفروشة') ||
    text.includes('سياح') ||
    text.includes('سفر') ||
    text.includes('منتجع') ||
    text.includes('شاليه') ||
    text.includes('طيران') ||
    text.includes('حفلات') ||
    text.includes('مناسبات')
  ) {
    return { sectorId: 'hotel', sectorLabel: 'فنادق وسياحة وفعاليات' };
  }
  if (
    text.includes('محام') ||
    text.includes('قانون') ||
    text.includes('محاسب') ||
    text.includes('استشار') ||
    text.includes('تعليم') ||
    text.includes('تدريب') ||
    text.includes('ترجم') ||
    text.includes('أمن') ||
    text.includes('تنظيف') ||
    text.includes('صيانة منزلية') ||
    text.includes('لوجست') ||
    text.includes('شحن')
  ) {
    return { sectorId: 'services', sectorLabel: 'خدمات مهنية واستشارات' };
  }
  return { sectorId: 'retail', sectorLabel: 'متاجر وتجزئة' };
}

// 3. Helper to generate modern gradient matching theme's primary color
function getGradientByColor(color?: string, sectorId?: string): string {
  if (sectorId === 'food') return 'from-amber-600 via-orange-600 to-amber-900';
  if (sectorId === 'clinic') return 'from-teal-600 via-cyan-700 to-slate-900';
  if (sectorId === 'beauty') return 'from-pink-600 via-purple-700 to-slate-900';
  if (sectorId === 'realestate') return 'from-emerald-700 via-teal-800 to-slate-900';
  if (sectorId === 'auto') return 'from-blue-700 via-slate-800 to-slate-950';
  if (sectorId === 'hotel') return 'from-yellow-700 via-amber-800 to-stone-900';
  if (sectorId === 'services') return 'from-slate-700 via-slate-800 to-slate-950';

  if (!color) return 'from-slate-800 via-slate-900 to-black';
  const c = color.toLowerCase();
  if (c.includes('059669') || c.includes('15803d') || c.includes('16a34a'))
    return 'from-emerald-700 via-teal-800 to-slate-900';
  if (c.includes('ea580c') || c.includes('c2410c') || c.includes('d97706'))
    return 'from-amber-600 via-orange-700 to-stone-900';
  if (c.includes('dc2626') || c.includes('e11d48')) return 'from-rose-700 via-red-800 to-slate-900';
  if (c.includes('2563eb') || c.includes('1d4ed8') || c.includes('0284c7'))
    return 'from-blue-700 via-indigo-900 to-slate-900';
  if (c.includes('7c3aed') || c.includes('9333ea') || c.includes('db2777'))
    return 'from-purple-700 via-fuchsia-800 to-slate-900';
  return 'from-slate-800 via-slate-900 to-black';
}

// 4. Transform all 85 catalog activities into ThemeItems and merge
const ALL_CATALOG_THEMES: ThemeItem[] = (() => {
  const flagshipMap = new Map(FLAGSHIP_THEMES.map((t) => [t.id, t]));
  const list: ThemeItem[] = [...FLAGSHIP_THEMES];

  all85ActivitiesMeta.forEach((meta) => {
    if (flagshipMap.has(meta.id)) return; // Don't duplicate flagship

    const { sectorId, sectorLabel } = classifySector(meta.category, meta.name);
    const text = `${meta.category} ${meta.name} ${meta.description}`.toLowerCase();
    const supportsBooking = Boolean(
      text.includes('حجز') ||
      text.includes('استشارة') ||
      text.includes('مواعيد') ||
      text.includes('طاولات') ||
      text.includes('فندق') ||
      text.includes('عياد') ||
      text.includes('صالون') ||
      text.includes('صيانة') ||
      text.includes('تأجير') ||
      text.includes('جولة')
    );
    const supportsCatalog = Boolean(
      text.includes('متجر') ||
      text.includes('شراء') ||
      text.includes('سلة') ||
      text.includes('منتجات') ||
      text.includes('مبيعات') ||
      text.includes('كتالوج') ||
      text.includes('أزياء') ||
      text.includes('ذهب') ||
      text.includes('إلكترونيات') ||
      text.includes('أثاث') ||
      text.includes('سيراميك') ||
      text.includes('مطعم') ||
      text.includes('منيو') ||
      text.includes('قطع غيار')
    );

    list.push({
      id: meta.id,
      nameAr: meta.name,
      category: meta.category,
      categoryNameAr: sectorLabel,
      sectorId,
      descriptionAr: meta.description,
      icon: meta.icon || '🏪',
      badge: meta.badge,
      badgeColor: 'bg-white/20 text-white border-white/25',
      primaryColor: meta.primaryColor || '#2563EB',
      secondaryColor: '#1E293B',
      accentColor: meta.primaryColor || '#00E5FF',
      supportsBooking,
      supportsCatalog,
      features: meta.tags?.slice(0, 4) || [
        'متجاوب بالكامل',
        'لوحة تحكم مباشرة',
        'تهيئة محركات البحث',
      ],
      previewGradient: getGradientByColor(meta.primaryColor, sectorId),
      isFlagship: false,
    });
  });

  return list;
})();

const SECTORS = [
  { id: 'all', label: 'جميع الأنشطة (الكل)', icon: LayoutTemplate },
  { id: 'retail', label: 'متاجر وتجزئة وأزياء', icon: ShoppingBag },
  { id: 'food', label: 'مطاعم ومقاهي', icon: Utensils },
  { id: 'clinic', label: 'عيادات وصحة', icon: Stethoscope },
  { id: 'beauty', label: 'صالونات وتجميل', icon: Scissors },
  { id: 'realestate', label: 'عقارات ومقاولات وديكور', icon: Building2 },
  { id: 'auto', label: 'سيارات وصيانة ونقل', icon: Car },
  { id: 'hotel', label: 'فنادق وسياحة وفعاليات', icon: Hotel },
  { id: 'services', label: 'خدمات واستشارات', icon: Briefcase },
];

export default function ThemesGalleryPage() {
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [applyingThemeId, setApplyingThemeId] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<ThemeItem | null>(null);
  const [applyError, setApplyError] = useState('');

  // Filtered Themes based on Sector and Search query
  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_CATALOG_THEMES.filter((theme) => {
      // Sector filter
      if (selectedSector !== 'all' && theme.sectorId !== selectedSector) {
        return false;
      }
      // Search filter
      if (!q) return true;
      const haystack =
        `${theme.nameAr} ${theme.nameEn || ''} ${theme.category} ${theme.categoryNameAr} ${theme.descriptionAr} ${theme.features.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedSector, searchQuery]);

  // Sector counts
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ALL_CATALOG_THEMES.length };
    ALL_CATALOG_THEMES.forEach((t) => {
      counts[t.sectorId] = (counts[t.sectorId] || 0) + 1;
    });
    return counts;
  }, []);

  const handleApplyTheme = async (themeId: string) => {
    const theme = ALL_CATALOG_THEMES.find((item) => item.id === themeId);
    if (!theme) return;
    setApplyingThemeId(themeId);
    setApplyError('');
    const presetKey = theme.presetKey || SITE_TO_PRESET_MAP[themeId] || '';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ray_builder_selected_template', themeId);
        // Also persist the colour/typography preset so the builder applies it immediately
        if (presetKey) {
          localStorage.setItem('ray_builder_selected_preset', presetKey);
        } else {
          localStorage.removeItem('ray_builder_selected_preset');
        }
      } catch {}
    }
    try {
      // Keep the chosen theme on the shop as well as in the browser so it is
      // available after refresh, on another device, and to the publishing flow.
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          layoutConfig: {
            selectedWebsiteTemplate: themeId,
            selectedWebsitePreset: presetKey || null,
          },
        }),
      });
      router.push(
        `/dashboard/website?template=${encodeURIComponent(themeId)}${presetKey ? `&preset=${encodeURIComponent(presetKey)}` : ''}`
      );
    } catch (error: any) {
      setApplyError(error?.message || 'تعذر حفظ اختيار الثيم. تحقق من الاتصال ثم أعد المحاولة.');
    } finally {
      setApplyingThemeId(null);
    }
  };

  const handleSkipBlank = async () => {
    setApplyingThemeId('blank');
    setApplyError('');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ray_builder_selected_template', 'blank');
      } catch {}
    }
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          layoutConfig: { selectedWebsiteTemplate: 'blank', selectedWebsitePreset: null },
        }),
      });
      router.push('/dashboard/website?template=blank');
    } catch (error: any) {
      setApplyError(
        error?.message || 'تعذر حفظ اختيار القالب الفارغ. تحقق من الاتصال ثم أعد المحاولة.'
      );
    } finally {
      setApplyingThemeId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1440px] mx-auto space-y-8" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1.5">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">
              الرئيسية
            </Link>
            <span>/</span>
            <Link href="/dashboard/website" className="hover:text-slate-700 transition-colors">
              الموقع الإلكتروني
            </Link>
            <span>/</span>
            <span className="text-slate-600">قوالب وثيمات الأنشطة الجاهزة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <LayoutTemplate size={24} />
            </span>
            <span>قوالب وثيمات الأنشطة الجاهزة</span>
            <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full">
              {ALL_CATALOG_THEMES.length} نشاط جاهز
            </span>
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-2 max-w-2xl leading-relaxed">
            اختر ثيم نشاطك التجاري ليتم تطبيق الهيكل المناسب (الصفحات، القائمة، الأقسام، نماذج
            الحجز، والكتالوج) فوراً مع تجربة متجاوبة عالمية على الهواتف والشاشات.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleSkipBlank}
            disabled={applyingThemeId === 'blank'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle size={16} className="text-blue-600" />
            <span>
              {applyingThemeId === 'blank' ? 'جاري الحفظ…' : 'تخطي والبدء من الصفر (قالب فارغ)'}
            </span>
          </button>
          <Link
            href="/dashboard/website"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
          >
            <span>دخول المُنشئ</span>
            <ArrowRight size={14} className="rotate-180" />
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-4">
        {applyError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"
          >
            {applyError}
          </div>
        )}
        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search
            size={18}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن نشاطك أو مجالك (مثال: عيادة، مطعم، عقارات، مقاولات، أزياء، سيارات، صالون، فندق...)"
            className="w-full pr-11 pl-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 shadow-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sector Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SECTORS.map((sector) => {
            const active = selectedSector === sector.id;
            const SectorIcon = sector.icon;
            const count = sectorCounts[sector.id] || 0;

            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => setSelectedSector(sector.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <SectorIcon size={14} className={active ? 'text-white' : 'text-slate-400'} />
                <span>{sector.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Themes Grid */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search size={22} />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">
            لم يتم العثور على نشاط مطابق لبحثك
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            جرّب البحث بكلمات أخرى أو اختر تصنيفاً من الأقسام بالأعلى، أو ابدأ بصفحة فارغة لتصنع
            قالبك الخاص.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSector('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme) => {
            const isApplying = applyingThemeId === theme.id;

            return (
              <div
                key={theme.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col group relative"
              >
                {/* Theme Visual Header */}
                <div
                  className={`h-44 bg-gradient-to-tr ${theme.previewGradient} p-4 relative flex flex-col justify-between overflow-hidden text-white`}
                >
                  {/* Visual Glow */}
                  <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

                  {/* Top Badge & Category */}
                  <div className="flex items-center justify-between z-10">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${theme.badgeColor || 'bg-white/20 text-white border-white/20'}`}
                    >
                      {theme.badge || theme.category}
                    </span>
                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-mono">
                      <Smartphone size={11} className="text-white/80" />
                      <span>Mobile Ready</span>
                    </div>
                  </div>

                  {/* Mock Card Center */}
                  <div className="bg-white/12 backdrop-blur-md rounded-xl p-3 border border-white/15 z-10 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm shrink-0">
                        {theme.icon || '✨'}
                      </div>
                      <div className="text-xs font-extrabold truncate">{theme.nameAr}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/90 pt-0.5">
                      {theme.supportsBooking && (
                        <span className="bg-emerald-500/40 text-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          حجوزات
                        </span>
                      )}
                      {theme.supportsCatalog && (
                        <span className="bg-blue-500/40 text-blue-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                          كتالوج وسلة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Color Swatch & Category */}
                  <div className="flex items-center justify-between z-10 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span className="text-white/80 font-semibold">{theme.category}</span>
                    </div>
                    {theme.isFlagship && (
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                        قالب مميز ⭐
                      </span>
                    )}
                  </div>
                </div>

                {/* Theme Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {theme.nameAr}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md shrink-0">
                        {theme.categoryNameAr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {theme.descriptionAr}
                    </p>

                    {/* Feature Bullets */}
                    <div className="pt-2 grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-slate-600">
                      {theme.features.slice(0, 4).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTheme(theme.id)}
                      disabled={isApplying}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isApplying ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Palette size={14} className="text-[#00E5FF]" />
                          <span>استخدام هذا الثيم</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTheme(theme)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                      title="معاينة تفاصيل الثيم"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Live Theme Preview & Details */}
      {previewTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Modal Header Visual */}
            <div
              className={`h-40 bg-gradient-to-tr ${previewTheme.previewGradient} p-5 relative flex flex-col justify-between text-white`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/25">
                  {previewTheme.badge || previewTheme.category}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewTheme(null)}
                  className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                  {previewTheme.icon || '✨'}
                </div>
                <div>
                  <h3 className="text-base font-black">{previewTheme.nameAr}</h3>
                  <p className="text-xs text-white/80">{previewTheme.categoryNameAr}</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-slate-700 text-right">
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-1">وصف النشاط والقالب</h4>
                <p className="text-xs leading-relaxed font-medium text-slate-700">
                  {previewTheme.descriptionAr}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">الميزات والأقسام المتضمنة</h4>
                <div className="grid grid-cols-2 gap-2">
                  {previewTheme.features.map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100"
                    >
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">اللون الأساسي:</span>
                  <span
                    className="w-4 h-4 rounded-full border border-slate-200"
                    style={{ backgroundColor: previewTheme.primaryColor }}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                  <Smartphone size={13} />
                  <span>متوافق مع كل الهواتف</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const id = previewTheme.id;
                  setPreviewTheme(null);
                  handleApplyTheme(id);
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Palette size={15} />
                <span>تطبيق هذا الثيم والذهاب للبلدر</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTheme(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-white text-slate-600 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Skip Bar for Blank Slate */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-center sm:text-right">
          <h4 className="text-base font-bold flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles size={16} className="text-[#00E5FF]" />
            <span>هل تفضّل بناء موقعك بلمستك الخاصة من الصفر؟</span>
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            يمكنك تخطي اختيار الثيم والبدء بصفحة بيضاء فارغة، وإضافة الأقسام والبنرات والمنتجات خطوة
            بخطوة بحرية كاملة.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSkipBlank}
          disabled={applyingThemeId === 'blank'}
          className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all shrink-0 flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <PlusCircle size={16} className="text-blue-600" />
          <span>
            {applyingThemeId === 'blank' ? 'جاري الحفظ…' : 'تخطي والبدء من الصفر (قالب فارغ)'}
          </span>
        </button>
      </div>
    </div>
  );
}
