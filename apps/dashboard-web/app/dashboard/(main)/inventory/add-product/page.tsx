'use client';

import { useRouter } from 'next/navigation';
import {
  Shirt,
  ClipboardList,
  UtensilsCrossed,
  Gamepad2,
  CreditCard,
  Package,
  CalendarClock,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';
import { PRODUCT_TYPES } from '@/config/productTypes';
import { useShop } from '@/hooks/useShop';

export default function AddProductPage() {
  const router = useRouter();
  const { shop } = useShop();
  const shopCategory = String(shop?.category || '').toUpperCase();

  return (
    <div
      className="min-h-full bg-[#F4F5F7]"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[900px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">إضافة منتج</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              اختار نوع اللي هتضيفه وابدأ — تقدر تضيف أي نوع في أي وقت
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/inventory/products')}
            className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
            title="رجوع إلى المنتجات"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {PRODUCT_TYPES.map((type) => {
            const Icon = type.icon;
            const primary = type.id === 'clothing';
            return (
              <button
                key={type.id}
                type="button"
                disabled={!type.available}
                onClick={() => type.href && router.push(type.href)}
                className={`w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-right transition-colors ${
                  type.available
                    ? 'hover:bg-slate-50 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    primary ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{type.title}</span>
                    {!type.available && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-black">
                        قريباً
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5 truncate">
                    {type.subtitle}
                  </span>
                </span>
                {type.available && <ChevronLeft size={16} className="text-slate-300 shrink-0" />}
              </button>
            );
          })}
        </div>

        {shopCategory && (
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            نشاط متجرك الحالي:{' '}
            {shopCategory === 'RESTAURANT'
              ? 'مطعم'
              : shopCategory === 'CLOTHING' || shopCategory === 'FASHION'
                ? 'ملابس'
                : shopCategory === 'CAFE'
                  ? 'كافيه'
                  : shopCategory === 'PHARMACY'
                    ? 'صيدلية'
                    : shopCategory === 'GROCERY' || shopCategory === 'FOOD'
                      ? 'بقالة'
                      : shopCategory === 'BEAUTY'
                        ? 'تجميل'
                        : shopCategory === 'ELECTRONICS'
                          ? 'إلكترونيات'
                          : 'تجزئة'}{' '}
            — بتقدر تضيف من أي نوع برضه
          </p>
        )}
      </div>
    </div>
  );
}
