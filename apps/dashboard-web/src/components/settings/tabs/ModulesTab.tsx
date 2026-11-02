'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  ShoppingCart,
  Camera,
  Users,
  Megaphone,
  Globe,
  BarChart3,
  Palette,
  Settings as SettingsIcon,
  LayoutGrid,
  Coins,
  UserCog,
  Clock,
  Wallet,
  Package,
  Tag,
  Monitor,
  Receipt,
  CreditCard,
  Loader2,
  Sparkles,
  ChevronDown,
  Calendar,
  ArrowLeftRight,
  Star,
  ListChecks,
  Clipboard,
  Truck,
  Scan,
  QrCode,
  Bell,
  TrendingUp,
  Briefcase,
  MessageSquare,
  Ticket,
  Headphones,
  ThumbsUp,
  StickyNote,
  Phone,
  Percent,
  Mail,
  Smartphone,
  Gift,
  Undo2,
  CalendarCheck,
  Building,
  Stethoscope,
  CalendarX,
  AlarmClock,
  Utensils,
  ShieldCheck,
  CalendarOff,
  CheckSquare,
  PieChart,
  LineChart,
  Eye,
  MousePointer,
  Pen,
  Search,
  Lightbulb,
  Brain,
  LockKeyhole,
  UnlockKeyhole,
  BookOpen,
  Repeat,
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';

interface ModulesTabProps {
  shop: any;
  onSaved: () => void;
}

import { HIDE_UNPUBLISHED } from '@/config/sidebar';

const moduleIcons: Record<string, any> = {
  overview: LayoutGrid,
  apps: LayoutGrid,
  products: Package,
  promotions: Tag,
  builder: Monitor,
  settings: SettingsIcon,
  gallery: Camera,
  reservations: Clock,
  website: Globe,
  invoice: Receipt,
  pos: ShoppingCart,
  posSettings: SettingsIcon,
  sales: CreditCard,
  customers: Users,
  reports: BarChart3,
  marketing: Megaphone,
  expenses: Coins,
  employees: UserCog,
  attendance: Clock,
  payroll: Wallet,
  orders: CreditCard,
  quotes: FileText,
  returnsReport: Undo2,
  loyalty: Star,
  subscriptions: CreditCard,
  epayment: CreditCard,
  abandonedCart: ShoppingCart,
  categories: Tag,
  variants: ListChecks,
  warehouses: Package,
  stocktake: Clipboard,
  suppliers: Truck,
  purchaseOrders: FileText,
  transfers: ArrowLeftRight,
  barcode: Scan,
  qrCode: QrCode,
  stockTracking: Package,
  lowStockAlerts: Bell,
  revenue: TrendingUp,
  profits: Coins,
  taxes: Receipt,
  journal: FileText,
  cashflow: TrendingUp,
  accounts: Briefcase,
  wallets: Wallet,
  financialReports: BarChart3,
  chats: MessageSquare,
  tickets: Ticket,
  complaints: Headphones,
  reviews: ThumbsUp,
  notes: StickyNote,
  followUps: Phone,
  contactLog: ListChecks,
  campaigns: Megaphone,
  coupons: Ticket,
  discounts: Percent,
  messages: MessageSquare,
  emailCampaigns: Mail,
  pushNotifications: Smartphone,
  smsCampaigns: Smartphone,
  loyaltyPrograms: Gift,
  seasonalOffers: Star,
  providers: Users,
  services: ListChecks,
  appointments: CalendarCheck,
  calendar: Calendar,
  rooms: Building,
  doctors: Stethoscope,
  bookingConfirm: CalendarCheck,
  bookingCancel: CalendarX,
  bookingReminder: AlarmClock,
  patient_records: FileText,
  activity_inventory: Package,
  restaurant_tables: Utensils,
  permissions: ShieldCheck,
  checkOut: Clock,
  leaves: CalendarOff,
  tasks: CheckSquare,
  kpi: TrendingUp,
  charts: PieChart,
  salesPerformance: LineChart,
  productPerformance: BarChart3,
  visitors: Eye,
  conversions: MousePointer,
  ai_theme: Palette,
  ai_pages: FileText,
  ai_brand: Sparkles,
  ai_chat: MessageSquare,
  aiContent: Pen,
  aiImages: Sparkles,
  aiSEO: Search,
  aiAnalysis: BarChart3,
  aiReplies: MessageSquare,
  aiSuggestions: Lightbulb,
  aiPages: Sparkles,
  aiDataAnalysis: Brain,
};

const MODULE_GROUPS = [
  { id: 'sales', label: 'المبيعات والطلبات', icon: CreditCard, color: '#2563EB' },
  { id: 'pos', label: 'الكاشير ومبيعات نقاط البيع', icon: ShoppingCart, color: '#0F766E' },
  { id: 'inventory', label: 'المخزون والمنتجات', icon: Package, color: '#16A34A' },
  // Market-launch switch: local-only groups are stripped in production builds.
  ...(HIDE_UNPUBLISHED
    ? []
    : [
        { id: 'finance', label: 'المالية والفواتير', icon: Receipt, color: '#7C3AED' },
        { id: 'accounting', label: 'المحاسبة والدفاتر', icon: BookOpen, color: '#16A34A' },
      ]),
  { id: 'crm', label: 'علاقات العملاء', icon: Users, color: '#DC2626' },
  { id: 'marketing', label: 'التسويق والعروض', icon: Megaphone, color: '#EA580C' },
  { id: 'bookings', label: 'الحجوزات والمواعيد', icon: Calendar, color: '#0891B2' },
  { id: 'subscriptions', label: 'الاشتراكات والعضويات', icon: Repeat, color: '#7C3AED' },
  { id: 'website', label: 'الموقع الإلكتروني والمتجر', icon: Globe, color: '#0EA5E9' },
  // Market-launch switch: local-only groups are stripped in production builds.
  ...(HIDE_UNPUBLISHED
    ? []
    : [
        { id: 'hr', label: 'الموارد البشرية', icon: UserCog, color: '#9333EA' },
        { id: 'analytics', label: 'التحليلات والتقارير', icon: BarChart3, color: '#059669' },
        { id: 'ai', label: 'مساعد الذكاء الاصطناعي', icon: Sparkles, color: '#BD00FF' },
      ]),
];

// Feature registry (simplified — mirrors React app's MODULE_REGISTRY structure)
const REGISTRY_FEATURES: Record<
  string,
  Array<{ id: string; label: string; labelAr: string; defaultEnabled?: boolean }>
> = {
  sales: [
    { id: 'orders', label: 'Orders', labelAr: 'الطلبات', defaultEnabled: true },
    { id: 'quotes', label: 'Quotes', labelAr: 'عروض الأسعار' },
    { id: 'abandonedCart', label: 'Abandoned Carts', labelAr: 'السلات المتروكة' },
    { id: 'loyalty', label: 'Loyalty Points', labelAr: 'نقاط الولاء' },
    { id: 'subscriptions', label: 'Subscriptions', labelAr: 'الاشتراكات' },
    { id: 'epayment', label: 'E-Payment', labelAr: 'الدفع الإلكتروني' },
  ],
  pos: [
    { id: 'posCheckout', label: 'Cashier', labelAr: 'الكاشير', defaultEnabled: true },
    { id: 'posShifts', label: 'Shifts', labelAr: 'الورديات' },
    { id: 'posSettings', label: 'POS Settings', labelAr: 'إعدادات الكاشير', defaultEnabled: true },
    { id: 'posReports', label: 'POS Reports', labelAr: 'تقارير الكاشير' },
  ],
  inventory: [
    { id: 'products', label: 'Products', labelAr: 'المنتجات', defaultEnabled: true },
    { id: 'categories', label: 'Categories', labelAr: 'الفئات' },
    { id: 'variants', label: 'Variants', labelAr: 'الأنواع' },
    { id: 'stocktake', label: 'Stock Take', labelAr: 'جرد المخزون' },
    { id: 'suppliers', label: 'Suppliers', labelAr: 'الموردين' },
    { id: 'purchaseOrders', label: 'Purchase Orders', labelAr: 'أوامر الشراء' },
    { id: 'warehouses', label: 'Warehouses', labelAr: 'المخازن' },
    { id: 'transfers', label: 'Transfers', labelAr: 'النقل بين المخازن' },
    { id: 'barcode', label: 'Barcode', labelAr: 'الباركود' },
    { id: 'qrCode', label: 'QR Code', labelAr: 'رمز QR' },
    { id: 'stockTracking', label: 'Stock Tracking', labelAr: 'تتبع الكميات' },
    { id: 'lowStockAlerts', label: 'Low Stock', labelAr: 'تنبيهات المخزون' },
  ],
  finance: [
    { id: 'invoice', label: 'Invoices', labelAr: 'الفواتير', defaultEnabled: true },
    { id: 'expenses', label: 'Expenses', labelAr: 'المصروفات' },
    { id: 'revenue', label: 'Revenue', labelAr: 'الإيرادات' },
    { id: 'taxes', label: 'Taxes', labelAr: 'الضرائب' },
    { id: 'cashflow', label: 'Cash Flow', labelAr: 'التدفق النقدي' },
    { id: 'accounts', label: 'Accounts', labelAr: 'الحسابات' },
    { id: 'wallets', label: 'Wallets', labelAr: 'المحافظ' },
    { id: 'profits', label: 'Profits', labelAr: 'الأرباح' },
    { id: 'journal', label: 'Journal Entries', labelAr: 'القيود اليومية' },
    { id: 'financialReports', label: 'Financial Reports', labelAr: 'التقارير المالية' },
  ],
  accounting: [
    { id: 'accounts', label: 'Chart of Accounts', labelAr: 'دليل الحسابات', defaultEnabled: true },
    { id: 'journal', label: 'Journal Entries', labelAr: 'القيود المحاسبية', defaultEnabled: true },
    { id: 'trialBalance', label: 'Trial Balance', labelAr: 'ميزان المراجعة', defaultEnabled: true },
    {
      id: 'financialReports',
      label: 'Financial Reports',
      labelAr: 'القوائم المالية',
      defaultEnabled: true,
    },
    { id: 'expenses', label: 'Expenses', labelAr: 'المصروفات', defaultEnabled: true },
    { id: 'taxes', label: 'Taxes', labelAr: 'الضرائب', defaultEnabled: true },
  ],
  crm: [
    { id: 'customers', label: 'Customers', labelAr: 'العملاء', defaultEnabled: true },
    { id: 'customerStatements', label: 'Statements', labelAr: 'كشوف الحساب', defaultEnabled: true },
    { id: 'creditLimits', label: 'Credit Limits', labelAr: 'حدود الائتمان', defaultEnabled: true },
    { id: 'customerSegments', label: 'Segments', labelAr: 'الشرائح', defaultEnabled: true },
    { id: 'customerTags', label: 'Tags', labelAr: 'الوسوم', defaultEnabled: true },
    {
      id: 'loyaltyProgram',
      label: 'Loyalty & Rewards',
      labelAr: 'الولاء والمكافآت',
      defaultEnabled: true,
    },
    { id: 'chats', label: 'Chats', labelAr: 'المحادثات' },
    { id: 'tickets', label: 'Tickets', labelAr: 'التذاكر' },
    { id: 'complaints', label: 'Complaints', labelAr: 'الشكاوى' },
    { id: 'reviews', label: 'Reviews', labelAr: 'التقييمات' },
  ],
  marketing: [
    { id: 'campaigns', label: 'Campaigns', labelAr: 'الحملات' },
    { id: 'coupons', label: 'Coupons', labelAr: 'الكوبونات' },
    { id: 'discounts', label: 'Discounts', labelAr: 'الخصومات' },
    { id: 'messages', label: 'Messages', labelAr: 'الرسائل' },
    { id: 'emailCampaigns', label: 'Email Campaigns', labelAr: 'حملات الإيميل' },
    { id: 'smsCampaigns', label: 'SMS Campaigns', labelAr: 'حملات SMS' },
    { id: 'pushNotifications', label: 'Push Notifications', labelAr: 'الإشعارات الفورية' },
    { id: 'loyaltyPrograms', label: 'Loyalty Programs', labelAr: 'برامج الولاء' },
    { id: 'seasonalOffers', label: 'Seasonal Offers', labelAr: 'العروض الموسمية' },
  ],
  bookings: [
    { id: 'reservations', label: 'Reservations', labelAr: 'الحجوزات' },
    { id: 'appointments', label: 'Appointments', labelAr: 'المواعيد' },
    { id: 'calendar', label: 'Calendar', labelAr: 'التقويم' },
    { id: 'rooms', label: 'Rooms', labelAr: 'الغرف' },
    { id: 'doctors', label: 'Doctors', labelAr: 'الأطباء' },
    { id: 'tables', label: 'Tables', labelAr: 'الطاولات' },
    { id: 'bookingsNotifications', label: 'Notifications', labelAr: 'إشعارات الحجوزات' },
    { id: 'bookingsSettings', label: 'Settings', labelAr: 'إعدادات الحجوزات' },
  ],
  subscriptions: [
    {
      id: 'subscriptionsOverview',
      label: 'Member Subscriptions',
      labelAr: 'اشتراكات الأعضاء',
      defaultEnabled: true,
    },
    {
      id: 'subscriptionPlans',
      label: 'Subscription Plans',
      labelAr: 'باقات الاشتراك',
      defaultEnabled: true,
    },
    {
      id: 'subscriptionRenewals',
      label: 'Renewals',
      labelAr: 'التجديدات',
      defaultEnabled: true,
    },
  ],
  website: [{ id: 'website', label: 'Website', labelAr: 'الموقع الإلكتروني' }],
  hr: [
    { id: 'employees', label: 'Employees', labelAr: 'الموظفين' },
    { id: 'permissions', label: 'Permissions', labelAr: 'الصلاحيات' },
    { id: 'attendance', label: 'Attendance', labelAr: 'الحضور' },
    { id: 'checkout', label: 'Check-out', labelAr: 'الانصراف' },
    { id: 'payroll', label: 'Payroll', labelAr: 'الرواتب' },
    { id: 'leaves', label: 'Leaves', labelAr: 'الإجازات' },
    { id: 'tasks', label: 'Tasks', labelAr: 'المهام' },
  ],
  analytics: [
    { id: 'allAnalytics', label: 'All Analytics', labelAr: 'كل التحليلات', defaultEnabled: true },
    { id: 'kpi', label: 'KPIs', labelAr: 'المؤشرات', defaultEnabled: true },
    { id: 'charts', label: 'Charts', labelAr: 'الرسوم البيانية', defaultEnabled: true },
    {
      id: 'salesPerformance',
      label: 'Sales Performance',
      labelAr: 'أداء المبيعات',
      defaultEnabled: true,
    },
    {
      id: 'productPerformance',
      label: 'Product Performance',
      labelAr: 'أداء المنتجات',
      defaultEnabled: true,
    },
    {
      id: 'inventoryReports',
      label: 'Inventory Reports',
      labelAr: 'تقارير المخزون',
      defaultEnabled: true,
    },
    {
      id: 'customerInsights',
      label: 'Customer Insights',
      labelAr: 'تحليلات العملاء',
      defaultEnabled: true,
    },
    {
      id: 'engagementAnalytics',
      label: 'Engagement',
      labelAr: 'تحليلات المشاركة',
      defaultEnabled: true,
    },
    { id: 'visitors', label: 'Visitors', labelAr: 'الزوار', defaultEnabled: true },
    { id: 'conversions', label: 'Conversions', labelAr: 'التحويلات', defaultEnabled: true },
    {
      id: 'returnsReport',
      label: 'Returns Reports',
      labelAr: 'تقارير المرتجعات',
      defaultEnabled: true,
    },
    {
      id: 'financeAnalytics',
      label: 'Finance Reports',
      labelAr: 'تقارير المالية',
      defaultEnabled: true,
    },
    {
      id: 'marketingAnalytics',
      label: 'Marketing Analytics',
      labelAr: 'تحليلات التسويق',
      defaultEnabled: true,
    },
    {
      id: 'operationsAnalytics',
      label: 'Operations Analytics',
      labelAr: 'تحليلات العمليات',
      defaultEnabled: true,
    },
    {
      id: 'paymentsAnalytics',
      label: 'Payments Reports',
      labelAr: 'تقارير المدفوعات',
      defaultEnabled: true,
    },
    {
      id: 'logisticsAnalytics',
      label: 'Logistics Reports',
      labelAr: 'تقارير اللوجستيات',
      defaultEnabled: true,
    },
  ],
  ai: [
    { id: 'aiContent', label: 'AI Content', labelAr: 'محتوى AI' },
    { id: 'aiImages', label: 'AI Images', labelAr: 'صور AI' },
    { id: 'aiSEO', label: 'AI SEO', labelAr: 'AI لتحسين البحث' },
    { id: 'aiAnalysis', label: 'AI Analysis', labelAr: 'تحليلات AI' },
    { id: 'aiInsights', label: 'AI Insights', labelAr: 'رؤى AI' },
    { id: 'aiAutomations', label: 'AI Automations', labelAr: 'أتمتة AI' },
  ],
};

export default function ModulesTab({ shop, onSaved }: ModulesTabProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [moduleFeatures, setModuleFeatures] = useState<Record<string, Set<string>>>({});
  const savedFeatures = (shop as any)?.layoutConfig?.enabledFeatures as
    Record<string, string[]> | undefined;

  const isFirstRender = useRef(true);

  useEffect(() => {
    const initial: Record<string, Set<string>> = {};
    const hasAnySaved = savedFeatures && Object.keys(savedFeatures).length > 0;
    for (const modId of Object.keys(REGISTRY_FEATURES)) {
      const saved = savedFeatures?.[modId];
      if (Array.isArray(saved)) {
        initial[modId] = new Set(saved);
      } else if (!hasAnySaved) {
        initial[modId] = new Set(
          REGISTRY_FEATURES[modId].filter((f) => f.defaultEnabled).map((f) => f.id)
        );
      } else {
        initial[modId] = new Set();
      }
    }
    setModuleFeatures(initial);
  }, [savedFeatures]);

  const persistFeatures = useCallback(
    async (nextFeatures: Record<string, Set<string>>, opts?: { onError?: () => void }) => {
      setSaving(true);
      try {
        const featuresObj: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(nextFeatures)) featuresObj[k] = Array.from(v);
        const previousLayout =
          (shop as any)?.layoutConfig && typeof (shop as any).layoutConfig === 'object'
            ? (shop as any).layoutConfig
            : {};

        const activeModules = Object.keys(featuresObj).filter(
          (mod) => Array.isArray(featuresObj[mod]) && featuresObj[mod].length > 0
        );

        const updatedLayout = {
          ...previousLayout,
          enabledFeatures: featuresObj,
          enabledModules: activeModules,
        };

        await apiRequest('/shops/me', {
          method: 'PATCH',
          body: JSON.stringify({
            layoutConfig: updatedLayout,
          }),
        });

        if (shop && typeof shop === 'object') {
          (shop as any).layoutConfig = updatedLayout;
        }

        try {
          const cached = JSON.parse(localStorage.getItem('ray_merchant_shop_cache') || '{}');
          localStorage.setItem(
            'ray_merchant_shop_cache',
            JSON.stringify({ ...cached, layoutConfig: updatedLayout })
          );
        } catch {}

        window.dispatchEvent(
          new CustomEvent('merchant-modules-changed', {
            detail: { enabledFeatures: featuresObj, enabledModules: activeModules },
          })
        );

        toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات اللوحة بنجاح' });
        onSaved?.();
      } catch (e: any) {
        opts?.onError?.();
        toast({
          title: 'خطأ',
          description: e?.message || 'فشل حفظ الميزات',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [shop, toast, onSaved]
  );

  const toggleFeature = (moduleId: string, featureId: string) => {
    const current = moduleFeatures[moduleId] || new Set<string>();
    const isCurrentlyEnabled = current.has(featureId);
    const featureKey = `${moduleId}:${featureId}`;
    const revert = () => {
      setModuleFeatures((prev) => {
        const next = new Set(prev[moduleId] || new Set<string>());
        if (isCurrentlyEnabled) next.add(featureId);
        else next.delete(featureId);
        return { ...prev, [moduleId]: next };
      });
    };
    if (isCurrentlyEnabled) {
      setModuleFeatures((prev) => {
        const next = new Set(prev[moduleId] || new Set<string>());
        next.delete(featureId);
        const nextState = { ...prev, [moduleId]: next };
        setTogglingFeature(featureKey);
        persistFeatures(nextState, { onError: revert }).finally(() => setTogglingFeature(null));
        return nextState;
      });
    } else {
      setModuleFeatures((prev) => {
        const next = new Set(prev[moduleId] || new Set<string>());
        next.add(featureId);
        const nextState = { ...prev, [moduleId]: next };
        setTogglingFeature(featureKey);
        persistFeatures(nextState, { onError: revert }).finally(() => setTogglingFeature(null));
        return nextState;
      });
      toast({ title: 'تم التفعيل', description: 'تم تفعيل الميزة فوراً في لوحتك' });
    }
  };

  // Emit changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      const enabledFeatures: Record<string, string[]> = {};
      for (const [moduleId, features] of Object.entries(moduleFeatures)) {
        enabledFeatures[moduleId] = Array.from(features);
      }
      const activeModules = Object.keys(enabledFeatures).filter(
        (mod) => Array.isArray(enabledFeatures[mod]) && enabledFeatures[mod].length > 0
      );
      window.dispatchEvent(
        new CustomEvent('merchant-modules-changed', {
          detail: { enabledFeatures, enabledModules: activeModules },
        })
      );
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'modules', count: 0 },
        })
      );
    } catch {}
  }, [moduleFeatures]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const coreModules = [
    { id: 'overview', label: 'النظرة العامة' },
    { id: 'products', label: 'المنتجات' },
    { id: 'promotions', label: 'العروض' },
    { id: 'builder', label: 'البولدر' },
    { id: 'settings', label: 'الإعدادات' },
  ];

  return (
    <div className="space-y-10 text-right" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl">
        <h3 className="text-3xl font-black">ترقية الأقسام</h3>
        <p className="text-sm font-bold text-slate-300 mt-3 leading-relaxed max-w-2xl">
          فعّل أو أوقف أي ميزة إضافية بنفسك فوراً — بمراجعة ولا انتظار.
        </p>
      </div>

      {/* Core Modules */}
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
            <LayoutGrid size={20} />
          </div>
          <div className="font-black text-slate-900 text-lg">الأقسام الأساسية</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {coreModules.map((m) => {
            const Icon = moduleIcons[m.id] || LayoutGrid;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{m.label}</div>
                  <div className="text-[10px] font-black text-emerald-600">أساسي</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Modules (grouped by registry) */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="font-black text-slate-900 text-lg">الأقسام الاختيارية</div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              فعّل الميزات الإضافية التي تناسب أعمالك
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {MODULE_GROUPS.map((group) => {
            const features = REGISTRY_FEATURES[group.id] || [];
            if (features.length === 0) return null;
            const isExpanded = expandedGroups.has(group.id);
            const activeCount = (moduleFeatures[group.id] || new Set()).size;
            const GroupIcon = group.icon;
            return (
              <div
                key={group.id}
                className="rounded-[2rem] border border-slate-100 overflow-hidden transition-all bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm text-white shrink-0"
                    style={{ backgroundColor: group.color }}
                  >
                    <GroupIcon size={24} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <h4 className="font-black text-slate-900 text-base">{group.label}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-black text-slate-400">
                        {features.length} ميزة
                      </span>
                      {activeCount > 0 && (
                        <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          {activeCount} مفعل
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={24}
                    className={`text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="p-4 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-2">
                    {features.map((feature) => {
                      const featureEnabled = (moduleFeatures[group.id] || new Set()).has(
                        feature.id
                      );
                      return (
                        <div
                          key={feature.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            featureEnabled
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'border-slate-100 bg-white'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              featureEnabled
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {featureEnabled ? (
                              <Check size={16} strokeWidth={3} />
                            ) : (
                              (() => {
                                const FeatureIcon = moduleIcons[feature.id] || LayoutGrid;
                                return <FeatureIcon size={16} />;
                              })()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black text-slate-900">
                              {feature.labelAr}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {featureEnabled ? 'مفعّلة' : 'موقوفة'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleFeature(group.id, feature.id)}
                            disabled={saving || togglingFeature === `${group.id}:${feature.id}`}
                            aria-label={
                              featureEnabled ? `قفل ${feature.labelAr}` : `فتح ${feature.labelAr}`
                            }
                            title={featureEnabled ? 'إيقاف الوحدة' : 'تفعيل الوحدة'}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                              featureEnabled
                                ? 'bg-white border border-red-100 text-red-600 hover:bg-red-50'
                                : 'bg-cyan-500 text-white hover:brightness-110 shadow-sm shadow-cyan-100'
                            }`}
                          >
                            {togglingFeature === `${group.id}:${feature.id}` ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : featureEnabled ? (
                              <LockKeyhole size={17} />
                            ) : (
                              <UnlockKeyhole size={17} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
