import { STATUS_META, type ActivityType, type UnifiedStatus } from '@/lib/bookings/ui';

export type ShopCustomer = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  customerType: string;
  companyName: string;
  taxNumber: string;
  status: string;
  address: string;
  city: string;
  country: string;
  branch: string;
  source: string;
  segmentId: string;
  tags: string[];
  notes: string;
  shippingAddresses: { label: string; address: string; city: string; phone: string }[];
  archived: boolean;
  loyaltyBalance: number;
  balanceDue: number;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  createdAt: string;
};

export type ActivityRow = {
  id: string;
  status?: string;
  total: number;
  method?: string;
  source?: string;
  createdAt: string;
  itemsCount?: number;
  shippingMethod?: string;
  paymentStatus?: string;
};

export const SOURCE_LABELS: Record<string, string> = {
  pos: 'الكاشير',
  website: 'المتجر الإلكتروني',
  bookings: 'الحجوزات',
  services: 'الخدمات',
  manual: 'إضافة يدوية',
  import: 'استيراد',
  app: 'تطبيق العميل',
  customer: 'المتجر الإلكتروني',
};

export const ORDER_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'new', label: 'جديد' },
  { id: 'processing', label: 'جاري التجهيز' },
  { id: 'ready', label: 'جاهز' },
  { id: 'delivering', label: 'جاري التوصيل' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'refunding', label: 'قيد الاسترجاع' },
  { id: 'partial_refund', label: 'مسترجع جزئياً' },
];

/* ============================================================
 * الحجوزات — تاب سجل حجوزات العميل
 * الحجوزات مربوطة بالعميل بالتليفون (مش بـ ID) والباكند
 * بيدعم فلتر phone بمقارنة آخر 9 أرقام (01x = 20x).
 * ============================================================ */

export type CustomerBooking = {
  id: string;
  bookingNumber: string;
  status: UnifiedStatus;
  activityType: ActivityType;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  price: number;
  participants: number;
  paymentStatus: string;
};

export const BOOKING_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'PENDING', label: STATUS_META.PENDING.label },
  { id: 'CONFIRMED', label: STATUS_META.CONFIRMED.label },
  { id: 'COMPLETED', label: STATUS_META.COMPLETED.label },
  { id: 'CANCELLED', label: STATUS_META.CANCELLED.label },
];
