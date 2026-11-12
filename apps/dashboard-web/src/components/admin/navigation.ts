'use client';

import {
  BarChart3,
  Bell,
  CreditCard,
  Eye,
  FileText,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Percent,
  ScrollText,
  Settings,
  ShieldAlert,
  Store,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/admin/finance', label: 'مالية المنصة', icon: Wallet },
  { href: '/admin/tax', label: 'الالتزامات الضريبية', icon: Percent },
  { href: '/admin/approvals', label: 'الموافقات', icon: ShieldAlert },
  { href: '/admin/shops', label: 'المتاجر', icon: Store },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/orders', label: 'العمليات', icon: CreditCard },
  { href: '/admin/delivery', label: 'التوصيل', icon: Truck },
  { href: '/admin/feedback', label: 'التقييمات', icon: MessageSquare },
  { href: '/admin/customer-service', label: 'خدمة العملاء', icon: Headphones },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart3 },
  { href: '/admin/visitors', label: 'زيارات الموقع', icon: Eye },
  { href: '/admin/audit-log', label: 'سجل العمليات', icon: ScrollText },
  { href: '/admin/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/admin/content', label: 'المحتوى', icon: FileText },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];
