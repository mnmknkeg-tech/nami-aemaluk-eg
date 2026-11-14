/**
 * Shared types + module-level constants for the sales orders page.
 * Moved verbatim from the page so extracted components import them without cycles.
 */

import { formatOrderItemsSummary } from '@/lib/sales-utils';

export type Order = {
  id: string;
  status: string;
  total: number;
  items?: any[];
  createdAt?: string;
  created_at?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  deliveryAddress?: string;
  delivery_address?: string;
  deliveryAddressManual?: string;
  delivery_address_manual?: string;
  customerNote?: string;
  customer_note?: string;
  notes?: string;
  user?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  phone?: string;
  source?: string;
  paymentMethod?: string;
};

export type FilterType =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'handed_to_courier'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected'
  | 'refunded'
  | 'successful';

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: {
    label: 'بانتظار التأكيد',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'مؤكد',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  PREPARING: {
    label: 'قيد التجهيز',
    cls: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-600',
  },
  READY: { label: 'جاهز', cls: 'bg-teal-50 text-teal-800 border-teal-200', dot: 'bg-teal-600' },
  HANDED_TO_COURIER: {
    label: 'مع المندوب',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  OUT_FOR_DELIVERY: {
    label: 'خارج للتوصيل',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-600',
  },
  DELIVERED: {
    label: 'تم التسليم',
    cls: 'bg-green-50 text-green-800 border-green-200',
    dot: 'bg-green-600',
  },
  CANCELLED: {
    label: 'ملغي',
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
  },
  REJECTED: { label: 'مرفوض', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  REFUNDED: {
    label: 'مرتجع',
    cls: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
};

// الحالات اللي يسمح فيها بعمل مرتجع (كامل أو جزئي)
export const RETURNABLE_STATUSES = [
  'CONFIRMED',
  'PREPARING',
  'READY',
  'HANDED_TO_COURIER',
  'DELIVERED',
];

export const RESTAURANT_FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'successful', label: 'ناجح' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'preparing', label: 'قيد التجهيز' },
  { id: 'ready', label: 'جاهز للتقديم' },
  { id: 'handed_to_courier', label: 'سُلّم للمندوب' },
  { id: 'delivered', label: 'تم التوصيل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'rejected', label: 'مرفوض' },
  { id: 'refunded', label: 'مسترجع' },
];

export const RETAIL_FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'successful', label: 'ناجح' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'confirmed', label: 'مؤكد' },
  { id: 'preparing', label: 'قيد التجهيز' },
  { id: 'ready', label: 'جاهز' },
  { id: 'out_for_delivery', label: 'خرج للتوصيل' },
  { id: 'delivered', label: 'تم التوصيل' },
  { id: 'cancelled', label: 'ملغي' },
  { id: 'rejected', label: 'مرفوض' },
  { id: 'refunded', label: 'مسترجع' },
];

export function formatItemsSummary(order: Order): string {
  return formatOrderItemsSummary(order, undefined, true) || '-';
}
