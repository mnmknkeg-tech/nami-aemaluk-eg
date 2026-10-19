'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Store,
  Phone,
  ArrowLeft,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { jsonRequest } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/utils';
import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface OrderData {
  id: string;
  orderNumber?: string;
  status: string;
  total: number;
  currency?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  shop?: { name: string; phone?: string; logo?: string };
  items?: OrderItem[];
  customer?: {
    name: string;
    phone: string;
    city: string;
    district?: string;
    address: string;
    notes?: string;
  };
  courier?: { name: string; phone?: string };
  deliveryFee?: number;
}

const STATUS_STEPS = [
  { key: 'PENDING', label: 'تم إنشاء الطلب', icon: Clock, color: 'amber' },
  { key: 'CONFIRMED', label: 'تم تأكيد الطلب', icon: CheckCircle, color: 'blue' },
  { key: 'PREPARING', label: 'جاري التجهيز', icon: Package, color: 'purple' },
  { key: 'OUT_FOR_DELIVERY', label: 'في الطريق إليك', icon: Truck, color: 'cyan' },
  { key: 'DELIVERED', label: 'تم التوصيل', icon: CheckCircle, color: 'green' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PREPARING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  OUT_FOR_DELIVERY: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  DELIVERED: 'bg-green-500/10 text-green-500 border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function getStatusIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status.toUpperCase());
  return idx >= 0 ? idx : 0;
}

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await jsonRequest<OrderData>(`/orders/${orderId}`);
        setOrder(data);
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل الطلب');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6" aria-busy>
        <span className="sr-only">جاري تحميل الطلب...</span>
        <PageHeaderSkeleton />
        <Skeleton className="h-32 rounded-2xl" />
        {/* Status timeline */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <Skeleton className="h-4 rounded-md flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">{error || 'لم يتم العثور على الطلب'}</h1>
        <Link href="/" className="text-brand-cyan font-bold text-sm hover:underline">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const currentStatus = String(order.status || 'PENDING').toUpperCase();
  const currentStep = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <Link href="/" className="hover:text-brand-cyan">
          الرئيسية
        </Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300">تتبع الطلب</span>
      </nav>

      {/* Order header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              طلب #
              {String(order.id || order.orderNumber || '')
                .slice(0, 8)
                .toUpperCase()}
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${
              STATUS_COLORS[currentStatus] || STATUS_COLORS.PENDING
            }`}
          >
            {isCancelled ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {isCancelled ? 'ملغي' : STATUS_STEPS[currentStep]?.label || currentStatus}
          </span>
        </div>
      </div>

      {/* Status tracker */}
      {!isCancelled && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 mb-6">
          <h2 className="text-lg font-bold mb-6">حالة الطلب</h2>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx <= currentStep;
              const isCurrent = idx === currentStep;
              const isLast = idx === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? step.color === 'amber'
                            ? 'bg-amber-500 text-white'
                            : step.color === 'blue'
                              ? 'bg-blue-500 text-white'
                              : step.color === 'purple'
                                ? 'bg-purple-500 text-white'
                                : step.color === 'cyan'
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-green-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-brand-cyan/20' : ''}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-12 ${idx < currentStep ? 'bg-brand-cyan' : 'bg-slate-200 dark:bg-slate-800'}`}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pt-2 pb-8">
                    <p className={`font-bold text-sm ${isDone ? '' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-brand-cyan font-semibold mt-1">الحالة الحالية</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Courier info */}
      {order.courier && currentStatus === 'OUT_FOR_DELIVERY' && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-cyan-500" />
            <div>
              <p className="font-bold text-sm">المندوب: {order.courier.name}</p>
              {order.courier.phone && (
                <a
                  href={`tel:${order.courier.phone}`}
                  className="text-cyan-500 text-xs font-bold hover:underline"
                >
                  {order.courier.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">المنتجات</h2>
        {order.shop && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Store className="w-4 h-4 text-brand-purple" />
            <span className="font-bold text-sm">{order.shop.name}</span>
            {order.shop.phone && (
              <a
                href={`tel:${order.shop.phone}`}
                className="mr-auto text-slate-400 hover:text-brand-cyan"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
        <div className="space-y-3">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <span className="font-bold text-sm">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {order.deliveryFee != null && (
            <div className="flex justify-between text-sm font-semibold text-slate-500">
              <span>رسوم التوصيل</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black">
            <span>الإجمالي</span>
            <span className="text-brand-cyan">{formatPrice(order.total, order.currency)}</span>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      {order.customer && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 mb-6">
          <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
            <MapPin className="w-5 h-5 text-brand-cyan" />
            بيانات التوصيل
          </h2>
          <div className="space-y-2 text-sm font-semibold">
            <div className="flex gap-2">
              <span className="text-slate-500">الاسم:</span>
              <span>{order.customer.name}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500">الهاتف:</span>
              <span dir="ltr">{order.customer.phone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500">العنوان:</span>
              <span>
                {order.customer.city}
                {order.customer.district ? ` - ${order.customer.district}` : ''} -{' '}
                {order.customer.address}
              </span>
            </div>
            {order.customer.notes && (
              <div className="flex gap-2">
                <span className="text-slate-500">ملاحظات:</span>
                <span>{order.customer.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-cyan"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
