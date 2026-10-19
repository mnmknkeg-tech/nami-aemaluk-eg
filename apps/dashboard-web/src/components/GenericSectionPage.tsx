'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package, DollarSign, Megaphone, Users, Calendar, UserCog,
  BarChart3, Bot, Settings, Bell, Globe, CreditCard,
  TrendingUp, ShoppingCart, Truck, FileText, Tag, Percent,
  Mail, MessageSquare, Star, CalendarDays, DoorOpen, Stethoscope,
  Clock, Wallet, Receipt, BookOpen, Banknote, PiggyBank,
  Layout, Search, Newspaper, Send, Eye, Lightbulb, Sparkles,
  Zap, Gift, Repeat, RotateCcw, AlertTriangle, CheckCircle2,
  Loader2, MapPin, MoreVertical, XCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

type SectionConfig = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  apiEndpoint?: string;
  stats: { label: string; icon: LucideIcon; color: string; bg: string; compute: (data: any[]) => number | string }[];
  columns?: { key: string; label: string; render?: (item: any) => React.ReactNode }[];
  emptyMessage: string;
};

const SECTION_CONFIGS: Record<string, SectionConfig> = {
  // Sales main page is handled separately
  inventory: {
    title: 'المخزون',
    subtitle: 'إدارة المنتجات والمخزون',
    icon: Package,
    apiEndpoint: '/products/me',
    stats: [
      { label: 'إجمالي المنتجات', icon: Package, color: 'text-slate-600', bg: 'bg-slate-100', compute: (d) => d.length },
      { label: 'منتجات نشطة', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', compute: (d) => d.filter((p: any) => p.isActive !== false && p.active !== false).length },
      { label: 'مخزون منخفض', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', compute: (d) => d.filter((p: any) => Number(p.stock ?? p.quantity ?? 999) <= Number(p.lowStockThreshold ?? 5)).length },
      { label: 'قيمة المخزون', icon: DollarSign, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: (d) => `ج.م ${d.reduce((s: number, p: any) => s + Number(p.price ?? 0) * Number(p.stock ?? p.quantity ?? 0), 0).toLocaleString()}` },
    ],
    columns: [
      { key: 'name', label: 'المنتج', render: (p: any) => p?.name || p?.title || '-' },
      { key: 'price', label: 'السعر', render: (p: any) => `ج.م ${Number(p?.price ?? 0).toLocaleString()}` },
      { key: 'stock', label: 'المخزون', render: (p: any) => `${Number(p?.stock ?? p?.quantity ?? 0)}` },
      { key: 'category', label: 'الفئة', render: (p: any) => p?.category?.name || p?.categoryName || '-' },
    ],
    emptyMessage: 'لا توجد منتجات حالياً',
  },
  finance: {
    title: 'المالية',
    subtitle: 'إدارة الفواتير والحسابات المالية',
    icon: DollarSign,
    apiEndpoint: '/orders/me',
    stats: [
      { label: 'إجمالي الإيرادات', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', compute: (d) => `ج.م ${d.filter((o: any) => ['DELIVERED','CONFIRMED','PREPARING','READY'].includes(String(o.status).toUpperCase())).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0).toLocaleString()}` },
      { label: 'طلبات مكتملة', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', compute: (d) => d.filter((o: any) => String(o.status).toUpperCase() === 'DELIVERED').length },
      { label: 'قيد التحصيل', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', compute: (d) => d.filter((o: any) => ['CONFIRMED','PREPARING','READY'].includes(String(o.status).toUpperCase())).length },
      { label: 'إجمالي الطلبات', icon: Receipt, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: (d) => d.length },
    ],
    columns: [
      { key: 'id', label: 'رقم الطلب', render: (o: any) => String(o?.id || '').slice(0, 8) },
      { key: 'status', label: 'الحالة', render: (o: any) => o?.status || '-' },
      { key: 'total', label: 'الإجمالي', render: (o: any) => `ج.م ${Number(o?.total ?? 0).toLocaleString()}` },
      { key: 'date', label: 'التاريخ', render: (o: any) => new Date(o?.createdAt || o?.created_at || Date.now()).toLocaleDateString('ar-EG') },
    ],
    emptyMessage: 'لا توجد بيانات مالية حالياً',
  },
  marketing: {
    title: 'التسويق',
    subtitle: 'إدارة الحملات التسويقية والعروض',
    icon: Megaphone,
    stats: [
      { label: 'حملات نشطة', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50', compute: () => 0 },
      { label: 'كوبونات', icon: Tag, color: 'text-blue-600', bg: 'bg-blue-50', compute: () => 0 },
      { label: 'خصومات', icon: Percent, color: 'text-amber-600', bg: 'bg-amber-50', compute: () => 0 },
      { label: 'رسائل', icon: Mail, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: () => 0 },
    ],
    emptyMessage: 'لا توجد حملات تسويقية حالياً',
  },
  crm: {
    title: 'خدمة العملاء',
    subtitle: 'إدارة العملاء والمحادثات والتذاكر',
    icon: Users,
    stats: [
      { label: 'إجمالي العملاء', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', compute: () => 0 },
      { label: 'محادثات', icon: MessageSquare, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: () => 0 },
      { label: 'تذاكر', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', compute: () => 0 },
      { label: 'تقييمات', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', compute: () => 0 },
    ],
    emptyMessage: 'لا توجد بيانات عملاء حالياً',
  },
  bookings: {
    title: 'إدارة الحجوزات',
    subtitle: 'إدارة المواعيد والحجوزات',
    icon: Calendar,
    stats: [
      { label: 'حجوزات اليوم', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', compute: () => 0 },
      { label: 'مواعيد قادمة', icon: CalendarDays, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: () => 0 },
      { label: 'مكتملة', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', compute: () => 0 },
      { label: 'ملغاة', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', compute: () => 0 },
    ],
    emptyMessage: 'لا توجد حجوزات حالياً',
  },
  hr: {
    title: 'الموارد البشرية',
    subtitle: 'إدارة الموظفين والرواتب',
    icon: UserCog,
    stats: [
      { label: 'الموظفين', icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50', compute: () => 0 },
      { label: 'حاضر اليوم', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', compute: () => 0 },
      { label: 'رواتب مستحقة', icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50', compute: () => 0 },
      { label: 'إجازات', icon: CalendarDays, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: () => 0 },
    ],
    emptyMessage: 'لا توجد بيانات موظفين حالياً',
  },
  analytics: {
    title: 'التحليلات',
    subtitle: 'تقارير ومؤشرات الأداء',
    icon: BarChart3,
    apiEndpoint: '/orders/me',
    stats: [
      { label: 'إجمالي الطلبات', icon: ShoppingCart, color: 'text-slate-600', bg: 'bg-slate-100', compute: (d) => d.length },
      { label: 'متوسط الطلب', icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: (d) => d.length > 0 ? `ج.م ${Math.round(d.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0) / d.length).toLocaleString()}` : 'ج.م 0' },
      { label: 'مكتمل', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', compute: (d) => d.filter((o: any) => String(o.status).toUpperCase() === 'DELIVERED').length },
      { label: 'ملغي', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', compute: (d) => d.filter((o: any) => String(o.status).toUpperCase() === 'CANCELLED').length },
    ],
    emptyMessage: 'لا توجد بيانات تحليلية حالياً',
  },
  ai: {
    title: 'الذكاء الاصطناعي',
    subtitle: 'أدوات الذكاء الاصطناعي للمتجر',
    icon: Bot,
    stats: [
      { label: 'محتوى AI', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', compute: () => 0 },
      { label: 'صور AI', icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', compute: () => 0 },
      { label: 'تحليلات', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', compute: () => 0 },
      { label: 'أتمتة', icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', compute: () => 0 },
    ],
    emptyMessage: 'لا توجد أدوات AI مفعلة حالياً',
  },
  settings: {
    title: 'الإعدادات',
    subtitle: 'إعدادات المتجر والحساب',
    icon: Settings,
    stats: [],
    emptyMessage: '',
  },
  notifications: {
    title: 'الإشعارات',
    subtitle: 'إشعارات المتجر والنشاطات',
    icon: Bell,
    stats: [],
    emptyMessage: 'لا توجد إشعارات حالياً',
  },
};

type SubPageConfig = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyMessage: string;
};

const SUB_PAGE_CONFIGS: Record<string, SubPageConfig> = {
  // Inventory sub-pages
  'inventory/categories': { title: 'الفئات', subtitle: 'إدارة فئات المنتجات', icon: Package, emptyMessage: 'لا توجد فئات حالياً' },
  'inventory/variants': { title: 'الأنواع', subtitle: 'إدارة أنواع المنتجات', icon: Package, emptyMessage: 'لا توجد أنواع حالياً' },
  'inventory/stocktake': { title: 'جرد المخزون', subtitle: 'جرد وتسوية المخزون', icon: Package, emptyMessage: 'لا توجد عمليات جرد حالياً' },
  'inventory/suppliers': { title: 'الموردين', subtitle: 'إدارة الموردين', icon: Truck, emptyMessage: 'لا يوجد موردين حالياً' },
  'inventory/purchase-orders': { title: 'أوامر الشراء', subtitle: 'إدارة أوامر الشراء', icon: FileText, emptyMessage: 'لا توجد أوامر شراء حالياً' },
  'inventory/low-stock': { title: 'تنبيهات المخزون', subtitle: 'منتجات على وشك النفاد', icon: AlertTriangle, emptyMessage: 'لا توجد تنبيهات مخزون حالياً' },
  // Finance sub-pages
  'finance/expenses': { title: 'المصروفات', subtitle: 'إدارة المصروفات', icon: DollarSign, emptyMessage: 'لا توجد مصروفات حالياً' },
  'finance/revenue': { title: 'الإيرادات', subtitle: 'متابعة الإيرادات', icon: TrendingUp, emptyMessage: 'لا توجد إيرادات حالياً' },
  'finance/taxes': { title: 'الضرائب', subtitle: 'إدارة الضرائب', icon: Receipt, emptyMessage: 'لا توجد بيانات ضريبية حالياً' },
  'finance/cashflow': { title: 'التدفق النقدي', subtitle: 'متابعة التدفق النقدي', icon: Wallet, emptyMessage: 'لا توجد بيانات تدفق نقدي حالياً' },
  'finance/accounts': { title: 'الحسابات', subtitle: 'إدارة الحسابات المالية', icon: BookOpen, emptyMessage: 'لا توجد حسابات حالياً' },
  'finance/wallets': { title: 'المحافظ', subtitle: 'إدارة المحافظ الإلكترونية', icon: PiggyBank, emptyMessage: 'لا توجد محافظ حالياً' },
  // Marketing sub-pages
  'marketing/campaigns': { title: 'الحملات', subtitle: 'إدارة الحملات التسويقية', icon: Megaphone, emptyMessage: 'لا توجد حملات حالياً' },
  'marketing/coupons': { title: 'الكوبونات', subtitle: 'إدارة كوبونات الخصم', icon: Tag, emptyMessage: 'لا توجد كوبونات حالياً' },
  'marketing/discounts': { title: 'الخصومات', subtitle: 'إدارة الخصومات', icon: Percent, emptyMessage: 'لا توجد خصومات حالياً' },
  'marketing/messages': { title: 'الرسائل', subtitle: 'إدارة الرسائل التسويقية', icon: MessageSquare, emptyMessage: 'لا توجد رسائل حالياً' },
  'marketing/email-campaigns': { title: 'حملات الإيميل', subtitle: 'حملات البريد الإلكتروني', icon: Mail, emptyMessage: 'لا توجد حملات إيميل حالياً' },
  'marketing/sms-campaigns': { title: 'حملات SMS', subtitle: 'حملات الرسائل النصية', icon: Send, emptyMessage: 'لا توجد حملات SMS حالياً' },
  'marketing/loyalty-programs': { title: 'برامج الولاء', subtitle: 'برامج مكافآت العملاء', icon: Gift, emptyMessage: 'لا توجد برامج ولاء حالياً' },
  // CRM sub-pages
  'crm/chats': { title: 'المحادثات', subtitle: 'محادثات العملاء', icon: MessageSquare, emptyMessage: 'لا توجد محادثات حالياً' },
  'crm/tickets': { title: 'التذاكر', subtitle: 'تذاكر الدعم الفني', icon: FileText, emptyMessage: 'لا توجد تذاكر حالياً' },
  'crm/complaints': { title: 'الشكاوى', subtitle: 'شكاوى العملاء', icon: AlertTriangle, emptyMessage: 'لا توجد شكاوى حالياً' },
  'crm/reviews': { title: 'التقييمات', subtitle: 'تقييمات العملاء', icon: Star, emptyMessage: 'لا توجد تقييمات حالياً' },
  // Bookings sub-pages
  'bookings/appointments': { title: 'المواعيد', subtitle: 'إدارة المواعيد', icon: CalendarDays, emptyMessage: 'لا توجد مواعيد حالياً' },
  'bookings/calendar': { title: 'التقويم', subtitle: 'تقويم الحجوزات', icon: Calendar, emptyMessage: 'لا توجد حجوزات حالياً' },
  'bookings/tables': { title: 'الطاولات', subtitle: 'إدارة طاولات المطعم', icon: DoorOpen, emptyMessage: 'لا توجد طاولات حالياً' },
  'bookings/rooms': { title: 'الغرف', subtitle: 'إدارة الغرف', icon: DoorOpen, emptyMessage: 'لا توجد غرف حالياً' },
  'bookings/doctors': { title: 'الأطباء', subtitle: 'إدارة الأطباء', icon: Stethoscope, emptyMessage: 'لا يوجد أطباء حالياً' },
  // HR sub-pages
  'hr/attendance': { title: 'الحضور', subtitle: 'تتبع حضور الموظفين', icon: Clock, emptyMessage: 'لا توجد بيانات حضور حالياً' },
  'hr/payroll': { title: 'الرواتب', subtitle: 'إدارة الرواتب', icon: Wallet, emptyMessage: 'لا توجد رواتب حالياً' },
  'hr/leaves': { title: 'الإجازات', subtitle: 'إدارة إجازات الموظفين', icon: CalendarDays, emptyMessage: 'لا توجد طلبات إجازة حالياً' },
  'hr/tasks': { title: 'المهام', subtitle: 'إدارة مهام الموظفين', icon: CheckCircle2, emptyMessage: 'لا توجد مهام حالياً' },
  // Website sub-pages
  'website/gallery': { title: 'المعرض', subtitle: 'إدارة صور المعرض', icon: Globe, emptyMessage: 'لا توجد صور حالياً' },
  'website/pages': { title: 'الصفحات', subtitle: 'إدارة صفحات الموقع', icon: FileText, emptyMessage: 'لا توجد صفحات حالياً' },
  'website/seo': { title: 'تحسين محركات البحث', subtitle: 'إعدادات SEO', icon: Search, emptyMessage: 'لا توجد إعدادات SEO حالياً' },
  'website/blog': { title: 'المدونة', subtitle: 'إدارة مقالات المدونة', icon: Newspaper, emptyMessage: 'لا توجد مقالات حالياً' },
  'website/domains': { title: 'النطاقات', subtitle: 'إدارة النطاقات', icon: Globe, emptyMessage: 'لا توجد نطاقات حالياً' },
  // Analytics sub-pages
  'analytics/kpi': { title: 'المؤشرات', subtitle: 'مؤشرات الأداء الرئيسية', icon: BarChart3, emptyMessage: 'لا توجد مؤشرات حالياً' },
  'analytics/charts': { title: 'الرسوم البيانية', subtitle: 'الرسوم البيانية والتحليلات', icon: BarChart3, emptyMessage: 'لا توجد رسوم بيانية حالياً' },
  'analytics/sales-performance': { title: 'أداء المبيعات', subtitle: 'تحليل أداء المبيعات', icon: TrendingUp, emptyMessage: 'لا توجد بيانات أداء حالياً' },
  'analytics/visitors': { title: 'الزوار', subtitle: 'إحصائيات الزوار', icon: Eye, emptyMessage: 'لا توجد بيانات زوار حالياً' },
  // AI sub-pages
  'ai/images': { title: 'صور AI', subtitle: 'توليد صور بالذكاء الاصطناعي', icon: Sparkles, emptyMessage: 'لا توجد صور AI حالياً' },
  'ai/seo': { title: 'AI لتحسين البحث', subtitle: 'تحسين SEO بالذكاء الاصطناعي', icon: Search, emptyMessage: 'لا توجد تحليلات SEO حالياً' },
  'ai/analysis': { title: 'تحليلات AI', subtitle: 'تحليلات ذكية للبيانات', icon: Lightbulb, emptyMessage: 'لا توجد تحليلات حالياً' },
  'ai/insights': { title: 'رؤى AI', subtitle: 'رؤى ذكية للمتجر', icon: Sparkles, emptyMessage: 'لا توجد رؤى حالياً' },
  'ai/automations': { title: 'أتمتة AI', subtitle: 'أتمتة المهام بالذكاء الاصطناعي', icon: Zap, emptyMessage: 'لا توجد أتمتة حالياً' },
};

export { SECTION_CONFIGS, SUB_PAGE_CONFIGS };
export type { SectionConfig, SubPageConfig };

export default function GenericSectionPage({ sectionId }: { sectionId: string }) {
  const config = SECTION_CONFIGS[sectionId];
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!config?.apiEndpoint) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(config.apiEndpoint);
      const list = Array.isArray(res) ? res : (res?.data || res?.orders || res?.products || []);
      setData(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const Icon = config.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Icon size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{config.title}</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">{config.subtitle}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold text-right">
          {error}
        </div>
      )}

      {/* Stats */}
      {config.stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {config.stats.map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <div key={idx} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right flex flex-col items-end">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}>
                  <StatIcon size={20} />
                </div>
                <span className="text-slate-500 font-semibold text-xs mb-1">{stat.label}</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-900">{stat.compute(data)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Data table or empty state */}
      {config.columns ? (
        data.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Icon size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">{config.emptyMessage}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {config.columns.map((col) => (
                      <th key={col.key} className="p-4 text-right text-xs font-bold text-slate-500">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {config.columns!.map((col) => (
                        <td key={col.key} className="p-4 text-sm font-medium text-slate-700">
                          {col.render ? col.render(item) : (item as any)?.[col.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Icon size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">{config.emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

export function GenericSubPage({ pageId }: { pageId: string }) {
  const config = SUB_PAGE_CONFIGS[pageId];

  if (!config) {
    return (
      <div className="p-8">
        <p className="text-slate-400 font-bold text-sm">صفحة غير معروفة</p>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Icon size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{config.title}</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">{config.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Icon size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="text-slate-400 font-bold text-sm">{config.emptyMessage}</p>
      </div>
    </div>
  );
}
