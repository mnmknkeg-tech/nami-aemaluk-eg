'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  CreditCard,
  CalendarCheck,
  ShoppingCart,
  Store,
  Printer,
  Shield,
  Share2,
  Bell,
  ChevronLeft,
  Search,
  Package,
  MapPin,
  Calculator,
  Users,
  Headset,
  UserCog,
  BarChart3,
  FileText,
  User,
  Puzzle,
  LayoutGrid,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import { isModuleEnabled } from '@/hooks/useModuleGuard';
import { TAB_MODULE_MAP } from '../SettingsModal';

interface OverviewTabProps {
  shop: any;
  onSelectTab?: (tab: string) => void;
}

type CategoryKey = 'all' | 'store' | 'operations' | 'finance' | 'customers' | 'team';

interface SettingCard {
  id: string;
  category: CategoryKey;
  categoryName: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  accent: string;
}

const BASE_SETTING_CARDS: SettingCard[] = [
  // 1. Store & System
  {
    id: 'store',
    category: 'store',
    categoryName: 'المتجر والنظام',
    title: 'المتجر والنشاط',
    description: 'اسم النشاط التجاري، الشعار، العنوان، أرقام التواصل والخريطة',
    icon: Store,
    accent: 'text-blue-600',
  },
  {
    id: 'account',
    category: 'store',
    categoryName: 'المتجر والنظام',
    title: 'الملف الشخصي والحساب',
    description: 'البيانات الشخصية لصاحب الحساب، البريد الإلكتروني وكلمة المرور',
    icon: User,
    accent: 'text-slate-700',
  },
  {
    id: 'security',
    category: 'store',
    categoryName: 'المتجر والنظام',
    title: 'الأمان وحسابات الدخول',
    description: 'الجلسات النشطة، توثيق الدخول، وسجل الأجهزة المصرح لها',
    icon: Shield,
    accent: 'text-amber-600',
  },
  {
    id: 'notifications',
    category: 'store',
    categoryName: 'المتجر والنظام',
    title: 'الإشعارات والتنبيهات',
    description: 'إشعارات المتصفح والبريد والواتساب، تنبيهات الطلبات ونفاذ المخزون',
    icon: Bell,
    accent: 'text-rose-600',
  },
  {
    id: 'receipt_theme',
    category: 'store',
    categoryName: 'المتجر والنظام',
    title: 'قالب الفاتورة والإيصال',
    description: 'تخصيص شكل إيصال الكاشير، الشعار، تذييل الفاتورة ونسبة الضريبة',
    icon: FileText,
    accent: 'text-violet-600',
  },

  // 2. Operations & Sales
  {
    id: 'orders_settings',
    category: 'operations',
    categoryName: 'العمليات والبيع',
    title: 'الطلبات والمبيعات',
    description: 'الحد الأدنى للطلب، تكاليف الشحن، الشحن المجاني وسياسة الاسترجاع',
    icon: ShoppingCart,
    accent: 'text-emerald-600',
  },
  {
    id: 'pos_settings',
    category: 'operations',
    categoryName: 'العمليات والبيع',
    title: 'الكاشير (POS)',
    description: 'طابعة الفواتير، مسح الباركود، الورديات، ودرج النقدية',
    icon: Printer,
    accent: 'text-purple-600',
  },
  {
    id: 'inventory_settings',
    category: 'operations',
    categoryName: 'العمليات والبيع',
    title: 'المخزون والمنتجات',
    description: 'حدود إعادة الطلب، تتبع التشغيلات وتواريخ الصلاحية ووحدات القياس',
    icon: Package,
    accent: 'text-amber-600',
  },
  {
    id: 'branches_settings',
    category: 'operations',
    categoryName: 'العمليات والبيع',
    title: 'الفروع والمستودعات',
    description: 'إدارة الفروع، أوامر التحويل، الاستلام من الفرع ومواعيد العمل',
    icon: MapPin,
    accent: 'text-sky-600',
  },
  {
    id: 'booking_settings',
    category: 'operations',
    categoryName: 'العمليات والبيع',
    title: 'الحجوزات والمواعيد',
    description: 'مدة الموعد، العربون المسبق، سياسة الإلغاء والتأكيد التلقائي',
    icon: CalendarCheck,
    accent: 'text-pink-600',
  },

  // 3. Finance & Accounting
  {
    id: 'payments',
    category: 'finance',
    categoryName: 'المالية والمحاسبة',
    title: 'بوابات وطرق الدفع',
    description: 'البطاقات البنكية، فودافون كاش وإنستاباي، الدفع عند الاستلام والحساب البنكي',
    icon: CreditCard,
    accent: 'text-teal-600',
  },
  {
    id: 'accounting_settings',
    category: 'finance',
    categoryName: 'المالية والمحاسبة',
    title: 'المحاسبة والضرائب',
    description: 'الرقم الضريبي، نسبة ضريبة القيمة المضافة، السجل التجاري والقيود اليومية',
    icon: Calculator,
    accent: 'text-indigo-600',
  },

  // 4. Customers & Marketing
  {
    id: 'customers_settings',
    category: 'customers',
    categoryName: 'العملاء والتسويق',
    title: 'العملاء وبرامج الولاء',
    description: 'نقاط المكافآت، الشراء بالآجل (الائتمان)، وعروض أعياد الميلاد',
    icon: Users,
    accent: 'text-cyan-600',
  },
  {
    id: 'crm_settings',
    category: 'customers',
    categoryName: 'العملاء والتسويق',
    title: 'خدمة العملاء والمحادثات',
    description: 'أوقات الاستجابة SLA، التوزيع التلقائي، والردود الآلية خارج الدوام',
    icon: Headset,
    accent: 'text-violet-600',
  },
  {
    id: 'social_media',
    category: 'customers',
    categoryName: 'العملاء والتسويق',
    title: 'منصات التواصل الاجتماعي',
    description: 'روابط حسابات التواصل (فيسبوك، إنستغرام، واتساب، تيك توك) للمتجر',
    icon: Share2,
    accent: 'text-blue-500',
  },

  // 5. Team, Analytics & Integration
  {
    id: 'hr_settings',
    category: 'team',
    categoryName: 'الفريق والتحليلات',
    title: 'فريق العمل والصلاحيات',
    description: 'أوقات الورديات، حدود خصومات الكاشير، ويوم صرف الرواتب الشهري',
    icon: UserCog,
    accent: 'text-orange-600',
  },
  {
    id: 'analytics_settings',
    category: 'team',
    categoryName: 'الفريق والتحليلات',
    title: 'التحليلات والبكسل الإعلاني',
    description: 'ربط Meta Pixel، تيك توك بيكسل، سناب شات، وتحليلات جوجل GA4',
    icon: BarChart3,
    accent: 'text-fuchsia-600',
  },
  {
    id: 'apps',
    category: 'team',
    categoryName: 'الفريق والتحليلات',
    title: HIDE_UNPUBLISHED ? 'التطبيقات والربط الخارجي' : 'التطبيقات والذكاء الاصطناعي',
    description: HIDE_UNPUBLISHED
      ? 'تطبيقات الربط الخارجي ومفاتيح API'
      : 'تطبيقات الربط الخارجي، مفاتيح API، ومساعد الذكاء الاصطناعي',
    icon: LayoutGrid,
    accent: 'text-purple-600',
  },
  {
    id: 'modules',
    category: 'team',
    categoryName: 'الفريق والتحليلات',
    title: 'إدارة الوحدات والميزات',
    description: 'تفعيل أو تعطيل الأقسام والخدمات التخصصية حسب نشاطك',
    icon: Puzzle,
    accent: 'text-slate-800',
  },
];

// Market-launch switch: local-only settings cards (finance + accounting +
// HR + analytics) are stripped from the settings hub in production builds.
const LOCAL_ONLY_CARD_IDS: ReadonlySet<string> = new Set([
  'payments',
  'accounting_settings',
  'hr_settings',
  'analytics_settings',
]);

const ALL_SETTING_CARDS: SettingCard[] = HIDE_UNPUBLISHED
  ? BASE_SETTING_CARDS.filter((card) => !LOCAL_ONLY_CARD_IDS.has(card.id))
  : BASE_SETTING_CARDS;

const BASE_CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'جميع الإعدادات' },
  { key: 'store', label: 'المتجر والنظام' },
  { key: 'operations', label: 'العمليات والبيع' },
  { key: 'finance', label: 'المالية والمحاسبة' },
  { key: 'customers', label: 'العملاء والتسويق' },
  { key: 'team', label: 'الفريق والتحليلات' },
];

// The finance & accounting category has no published cards left after launch.
const CATEGORIES = HIDE_UNPUBLISHED
  ? BASE_CATEGORIES.filter((cat) => cat.key !== 'finance')
  : BASE_CATEGORIES;

export default function OverviewTab({ shop, onSelectTab }: OverviewTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');

  const handleNavigateToTab = (tab: string) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set('tab', tab);
      router.push(`/dashboard/settings?${params.toString()}`);
    }
  };

  const status = String(shop?.status || '').toLowerCase();
  const isApproved = status === 'approved' || status === 'active';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const hasPaymentConfig =
    Boolean(String(shop?.paymentConfig?.merchantId || '').trim()) &&
    Boolean(String(shop?.paymentConfig?.publicKey || '').trim());

  const stats = [
    {
      title: 'حالة المتجر والاعتماد',
      value: isApproved ? 'نشط ومعتمد' : isPending ? 'قيد المراجعة' : isRejected ? 'مرفوض' : 'نشط',
      icon: isApproved ? CheckCircle : isPending ? Clock : isRejected ? AlertTriangle : Info,
      color: isApproved
        ? 'text-emerald-500'
        : isPending
          ? 'text-blue-500'
          : isRejected
            ? 'text-red-500'
            : 'text-slate-400',
      description: isApproved
        ? 'حسابك معتمد ويعمل بكامل صلاحياته'
        : isPending
          ? 'الحساب قيد المراجعة'
          : 'حالة الحساب نشطة',
    },
    // Market-launch switch: the gateway card points at the local-only payments
    // tab, so it is hidden in production builds (cash on delivery only).
    ...(HIDE_UNPUBLISHED
      ? []
      : [
          {
            title: 'بوابة الدفع الإلكتروني',
            value: hasPaymentConfig ? 'مفعّلة' : 'غير مربوطة بعد',
            icon: hasPaymentConfig ? CheckCircle : AlertTriangle,
            color: hasPaymentConfig ? 'text-emerald-500' : 'text-amber-500',
            description: hasPaymentConfig
              ? 'البوابة جاهزة لقبول الدفع بالبطاقات'
              : 'اربط بوابتك لقبول البطاقات والمحافظ',
          },
        ]),
    {
      title: 'نظام العمليات والمبيعات',
      value: 'مدمج وموحّد',
      icon: CalendarCheck,
      color: 'text-indigo-500',
      description: 'كافة إعدادات الأقسام متصلة مركزياً بلوحة واحدة',
    },
  ];

  const filteredCards = useMemo(() => {
    return ALL_SETTING_CARDS.filter((c) => {
      const reqMod = TAB_MODULE_MAP[c.id];
      if (reqMod && !isModuleEnabled(shop, reqMod)) {
        return false;
      }
      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
      const matchSearch =
        !searchTerm.trim() ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchTerm, shop]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            مركز الإعدادات الموحد
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-1">
            دليل شامل لكافة إعدادات المتجر والأقسام التجارية في مكان واحد
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في كافة الإعدادات..."
            className="w-full h-10 pr-9 pl-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 transition-all placeholder:text-slate-400"
          />
          <Search size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* الحالة السريعة */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{stat.title}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-lg font-black text-slate-900">{stat.value}</div>
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all whitespace-nowrap ${
              selectedCategory === cat.key
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
        <span className="text-[11px] font-bold text-slate-400 mr-auto whitespace-nowrap">
          {filteredCards.length} قسم
        </span>
      </div>

      {/* Setting Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleNavigateToTab(card.id)}
            className="group p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-right flex flex-col justify-between"
          >
            <div className="space-y-2.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {card.categoryName}
                </span>
                <ChevronLeft
                  size={16}
                  className="text-slate-300 group-hover:text-slate-800 transition-colors"
                />
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
          لم يتم العثور على أي إعدادات مطابقة لبحثك
        </div>
      )}
    </div>
  );
}
