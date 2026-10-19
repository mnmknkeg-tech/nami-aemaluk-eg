import {
  Utensils, ShoppingBag, Scissors, Stethoscope, Car, Home as HomeIcon,
  Wrench, GraduationCap, Dumbbell, Ticket, Package, Building2,
  Store, ShoppingCart, CalendarCheck, Palette, BarChart3,
  LayoutDashboard, Smartphone, Shield,
  LucideIcon,
} from 'lucide-react';
import { HIDE_UNPUBLISHED } from '@/lib/moduleConfig';

export interface Industry {
  icon: LucideIcon;
  label: string;
}

export interface Solution {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  /** false = local-only / not yet released (hidden in production builds) */
  localOnly?: boolean;
}

export const industries: Industry[] = [
  { icon: Utensils, label: 'مطاعم' },
  { icon: ShoppingBag, label: 'تجزئة' },
  { icon: Scissors, label: 'صالونات' },
  { icon: Stethoscope, label: 'عيادات' },
  { icon: Car, label: 'سيارات' },
  { icon: HomeIcon, label: 'عقارات' },
  { icon: Wrench, label: 'خدمات' },
  { icon: GraduationCap, label: 'تعليم' },
  { icon: Dumbbell, label: 'رياضة' },
  { icon: Ticket, label: 'فعاليات' },
  { icon: Package, label: 'جملة' },
  { icon: Building2, label: 'شركات' },
];

export const solutions: Solution[] = (
  [
    { icon: Store, title: 'المتجر الإلكتروني', desc: 'متجر متكامل لإدارة منتجاتك وطلباتك', href: '/#products' },
    { icon: ShoppingCart, title: 'نقطة البيع (POS)', desc: 'حوّل أي موبايل لكاشير ذكي لمحلك', href: '/#products' },
    { icon: CalendarCheck, title: 'الحجوزات والمواعيد', desc: 'نظام حجز ذكي للعيادات والصالونات', href: '/#products' },
    { icon: Palette, title: 'مصمم الصفحات', desc: 'صمم متجرك بالسحب والإفلات بدون برمجة', href: '/#products' },
    {
      icon: BarChart3,
      title: 'التحليلات والتقارير',
      desc: 'تقارير مفصلة عن المبيعات والعملاء',
      href: '/#products',
      // Market-launch switch: analytics is local-only for now.
      localOnly: true,
    },
    { icon: LayoutDashboard, title: 'لوحة التحكم', desc: 'إدارة كل جوانب نشاطك من مكان واحد', href: '/#products' },
    { icon: Smartphone, title: 'تطبيق الموبايل', desc: 'أدر أعمالك من أي مكان وفي أي وقت', href: '/#products' },
    { icon: Shield, title: 'الأمان والحماية', desc: 'حماية متقدمة لبياناتك وبيانات عملائك', href: '/#products' },
  ] as Solution[]
).filter((solution) => !HIDE_UNPUBLISHED || !solution.localOnly);

