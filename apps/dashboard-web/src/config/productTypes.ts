import {
  Shirt,
  ClipboardList,
  UtensilsCrossed,
  Gamepad2,
  CreditCard,
  Package,
  CalendarClock,
} from 'lucide-react';

export type ProductType = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Shirt;
  href: string | null;
  available: boolean;
};

/**
 * Product types offered when a merchant taps "إضافة منتج".
 * Shared between the inventory header dropdown and the add-product page.
 */
export const PRODUCT_TYPES: ProductType[] = [
  {
    id: 'clothing',
    title: 'منتج ملابس (ملموس)',
    subtitle: 'منتجات جاهزة يمكن شحنها أو استلامها — بالألوان والمقاسات',
    icon: Shirt,
    href: '/dashboard/inventory/add-product/clothing',
    available: true,
  },
  {
    id: 'service',
    title: 'خدمة حسب الطلب',
    subtitle: 'الخدمات التصميم والكتابة والحلاقة وغيرها',
    icon: ClipboardList,
    href: '/dashboard/inventory/add-product/service',
    available: true,
  },
  {
    id: 'restaurant',
    title: 'أكله ومشروبات',
    subtitle: 'منتجات غذائية قابلة لطلب سريع',
    icon: UtensilsCrossed,
    href: '/dashboard/inventory/add-product/restaurant',
    available: true,
  },
  {
    id: 'digital',
    title: 'منتج رقمي',
    subtitle: 'ملفات وكتب إلكترونية ودورات مسجلة',
    icon: Gamepad2,
    href: '/dashboard/inventory/add-product/digital',
    available: true,
  },
  {
    id: 'giftcard',
    title: 'بطاقة رقمية',
    subtitle: 'بطاقات مسبقة الدفع أو اشترات مرقّمة',
    icon: CreditCard,
    href: '/dashboard/inventory/add-product/giftcard',
    available: true,
  },
  {
    id: 'bundle',
    title: 'مجموعة منتجات',
    subtitle: 'منتجات متعددة تُباع كمنتج واحد',
    icon: Package,
    href: '/dashboard/inventory/add-product/bundle',
    available: true,
  },
  {
    id: 'bookings',
    title: 'حجوزات',
    subtitle: 'دورات واستشارات وخدمات طبية أو سبا',
    icon: CalendarClock,
    href: '/dashboard/inventory/add-product/bookings',
    available: true,
  },
];
