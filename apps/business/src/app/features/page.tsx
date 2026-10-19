import { Metadata } from 'next';
import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  ShoppingCart, Package, Calendar, BarChart3, Users, Wallet,
  Smartphone, Globe, Shield, Zap, Star, ArrowLeft,
} from 'lucide-react';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';

export const metadata: Metadata = {
  title: 'المميزات',
  description: 'تعرّف على كل المميزات التي تقدمها منصة نمّي أعمالك لإدارة متجرك أو نشاطك التجاري.',
  alternates: { canonical: '/features' },
};

type FeatureGroup = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  /** Market-launch switch: local-only groups are hidden in production. */
  localOnly?: boolean;
  features: string[];
};

const featureGroups: FeatureGroup[] = [
  {
    title: 'إدارة المبيعات',
    icon: ShoppingCart,
    features: [
      'إدارة الطلبات والتوصيل',
      'مرتجعات واستبدالات',
      'دفع إلكتروني ونقدي',
      'سلة مشتريات للعملاء',
      'حالات الطلب والتتبع',
    ],
  },
  {
    title: 'الكاشير (POS)',
    icon: ShoppingCart,
    features: [
      'نقطة بيع متكاملة (POS)',
      'فواتير الكاشير الفورية',
      'إدارة الورديات',
      'مرتجعات الكاشير والموقع',
      'تقارير الكاشير اليومية',
    ],
  },
  {
    title: 'إدارة المخزون',
    icon: Package,
    features: [
      'تتبع المنتجات والكميات',
      'تنبيهات نقص المخزون',
      'إدارة الفئات والمتغيرات',
      'باركود وQR Code',
      'مستودعات متعددة',
    ],
  },
  {
    title: 'الحجوزات والمواعيد',
    icon: Calendar,
    features: [
      'حجوزات للعيادات والصالونات',
      'إدارة الموظفين والمواعيد',
      'تأكيد وإلغاء الحجوزات',
      'تذكيرات تلقائية',
      'جداول ومرافق',
    ],
  },
  {
    title: 'التقارير والتحليلات',
    icon: BarChart3,
    // Market-launch switch: analytics is local-only for now.
    localOnly: true,
    features: [
      'تقارير المبيعات اليومية',
      'تحليل أداء المنتجات',
      'إحصائيات العملاء',
      'تقارير الأرباح والخسائر',
      'لوحات تحكم تفاعلية',
    ],
  },
  {
    title: 'إدارة العملاء',
    icon: Users,
    features: [
      'قاعدة بيانات عملاء كاملة',
      'تاريخ المشتريات',
      'نظام نقاط الولاء',
      'تذاكر وشكاوى',
      'مراجعات وتقييمات',
    ],
  },
  {
    title: 'الإدارة المالية',
    icon: Wallet,
    // Market-launch switch: finance & accounting are local-only for now.
    localOnly: true,
    features: [
      'فواتير إلكترونية',
      'مصروفات ومشتريات',
      'ضرائب وتقارير ضريبية',
      'محفظة إلكترونية',
      'تقارير مالية شاملة',
    ],
  },
];

// Market-launch switch: local-only feature groups (finance + accounting +
// analytics) are not advertised in production builds.
const visibleFeatureGroups = HIDE_UNPUBLISHED
  ? featureGroups.filter((group) => !group.localOnly)
  : featureGroups;

export default function FeaturesPage() {
  return (
    <div className="min-h-screen pt-16">
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            مميزات <span className="text-gradient">نمّي أعمالك</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            كل الأدوات التي تحتاجها لإدارة عملك في منصة واحدة متكاملة
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-16">
          {visibleFeatureGroups.map((group) => (
            <div key={group.title} className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-brand-cyan/10 rounded-2xl flex items-center justify-center">
                  <group.icon className="w-8 h-8 text-brand-cyan" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">{group.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-slate-600 font-medium">
                      <Star className="w-4 h-4 text-brand-cyan flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-brand-black text-white text-center">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">جرب كل هذه المميزات مجاناً</h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-gradient text-white font-bold text-lg hover:shadow-glow-cyan transition-all"
          >
            ابدأ مجاناً
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}
