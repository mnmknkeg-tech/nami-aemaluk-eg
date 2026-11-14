'use client';

import React from 'react';
import { XCircle, Loader2, Printer, ReceiptText, Truck, MessageCircle } from 'lucide-react';
import { parseOrderNotes } from '@/components/sales/print-utils';
import OrderReturnsPanel from '@/components/sales/OrderReturnsPanel';
import { getDeliveryAddress } from '@/lib/sales-utils';
import { isDeliveryDisabledOrder } from '@/lib/sales-utils';
import { formatAddonsCompactParts } from '@/lib/sales-utils';
import { formatVariantSelectionCompact } from '@/lib/sales-utils';
import { type Order, STATUS_META } from './salesShared';

export interface SalesOrderDrawerProps {
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  selectedOrder: Order | null;
  printInvoice: any;
  printWaybill: any;
  isRestaurant: any;
  updateStatus: any;
  updatingId: string;
}

const SalesOrderDrawer: React.FC<SalesOrderDrawerProps> = ({
  setSelectedOrder,
  selectedOrder,
  printInvoice,
  printWaybill,
  isRestaurant,
  updateStatus,
  updatingId,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => setSelectedOrder(null)}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-slate-900">
            تفاصيل الطلب{' '}
            <span className="text-slate-400 font-bold">
              #
              {String(selectedOrder.id || '')
                .slice(0, 8)
                .toUpperCase()}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => printInvoice(selectedOrder)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900"
              title="طباعة الفاتورة (80مم)"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={() => printWaybill(selectedOrder)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900"
              title="طباعة بوليصة التوصيل (A6)"
            >
              <Truck size={18} />
            </button>
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-2 hover:bg-slate-50 rounded-lg"
            >
              <XCircle size={20} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* إجراءات الحالة — حسب التحولات المسموحة من الباكند */}
          {(() => {
            const st = String(selectedOrder.status || '').toUpperCase();
            const oid = String(selectedOrder.id || '');
            const actions: Array<{
              label: string;
              status: string;
              primary?: boolean;
              danger?: boolean;
            }> = [];
            if (st === 'PENDING') {
              actions.push({ label: 'تأكيد الطلب', status: 'CONFIRMED', primary: true });
              actions.push({ label: 'رفض', status: 'CANCELLED', danger: true });
            } else if (st === 'CONFIRMED') {
              actions.push({ label: 'بدء التجهيز', status: 'PREPARING', primary: true });
              actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
            } else if (st === 'PREPARING') {
              actions.push({
                label: isRestaurant ? 'جاهز للتقديم' : 'جاهز',
                status: 'READY',
                primary: true,
              });
              actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
            } else if (st === 'READY') {
              actions.push({ label: 'تم التسليم', status: 'DELIVERED', primary: true });
              actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true });
            } else if (st === 'DELIVERED') {
              actions.push({ label: 'تسجيل مرتجع', status: 'REFUNDED' });
            }
            if (actions.length === 0) return null;
            return (
              <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 ml-auto">إجراءات الطلب:</span>
                {actions.map((a) => (
                  <button
                    key={a.status}
                    onClick={() => updateStatus(oid, a.status)}
                    disabled={updatingId === oid}
                    className={`h-8 px-3.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      a.primary
                        ? 'bg-slate-900 text-white hover:bg-slate-700'
                        : a.danger
                          ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {updatingId === oid ? <Loader2 size={13} className="animate-spin" /> : a.label}
                  </button>
                ))}
                {(selectedOrder.customerPhone ||
                  selectedOrder.customer_phone ||
                  selectedOrder.user?.phone) && (
                  <a
                    href={`https://wa.me/2${(selectedOrder.customerPhone || selectedOrder.customer_phone || selectedOrder.user?.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <MessageCircle size={13} />
                    واتساب العميل
                  </a>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-bold text-slate-400">رقم الطلب</div>
              <div className="mt-2 font-bold text-slate-900 text-sm truncate">
                #
                {String(selectedOrder.id || '')
                  .slice(0, 8)
                  .toUpperCase() || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                الحالة
              </div>
              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border ${STATUS_META[String(selectedOrder.status).toUpperCase()]?.cls || ''}`}
                >
                  {STATUS_META[String(selectedOrder.status).toUpperCase()]?.label ||
                    selectedOrder.status}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                التاريخ
              </div>
              <div className="mt-2 font-bold text-slate-900 text-sm leading-6">
                {new Date(
                  selectedOrder.createdAt || selectedOrder.created_at || Date.now()
                ).toLocaleString('ar-EG')}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                الإجمالي
              </div>
              <div className="mt-2 font-bold text-slate-900 text-sm">
                ج.م {Number(selectedOrder.total || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                الدفع
              </div>
              <div className="mt-2 font-bold text-slate-900 text-sm">
                {String((selectedOrder as any).paymentMethod || 'COD').toUpperCase() === 'COD'
                  ? 'دفع عند الاستلام'
                  : String((selectedOrder as any).paymentMethod || '').toUpperCase() || '—'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                المصدر
              </div>
              <div className="mt-2 font-bold text-slate-900 text-sm">
                {(selectedOrder as any).source === 'pos'
                  ? 'الكاشير'
                  : (selectedOrder as any).source === 'manual'
                    ? 'يدوي'
                    : 'الموقع'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <ReceiptText size={16} /> بيانات العميل
              </div>
              <div className="mt-3 space-y-2 text-sm font-bold text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">الاسم</span>
                  <span className="text-slate-900 text-left">
                    {selectedOrder.customerName ||
                      selectedOrder.customer_name ||
                      selectedOrder.user?.name ||
                      '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">الهاتف</span>
                  <span className="text-slate-900 text-left" dir="ltr">
                    {selectedOrder.customerPhone ||
                      selectedOrder.customer_phone ||
                      selectedOrder.user?.phone ||
                      selectedOrder.phone ||
                      '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">طريقة التوصيل</span>
                  <span className="text-slate-900 text-left">
                    {isDeliveryDisabledOrder(selectedOrder) ? 'استلام ذاتي' : 'عبر المندوب'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">العنوان</span>
                  <span className="text-slate-900 text-left">
                    {getDeliveryAddress(selectedOrder) || '-'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">ملاحظة العميل</span>
                  <span
                    className={`text-left font-bold ${selectedOrder.customerNote || selectedOrder.customer_note || selectedOrder.notes ? 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded' : 'text-slate-400'}`}
                  >
                    {selectedOrder.customerNote ||
                      selectedOrder.customer_note ||
                      selectedOrder.notes ||
                      'لا توجد ملاحظات'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <ReceiptText size={16} /> ملخص الفاتورة
              </div>
              {(() => {
                const _items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
                const sub = _items.reduce(
                  (s: number, it: any) =>
                    s +
                    Number(it?.quantity ?? it?.qty ?? 0) *
                      Number(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0),
                  0
                );
                const nt = parseOrderNotes(selectedOrder);
                const del = Math.max(
                  Number(selectedOrder.total || 0) - sub - nt.discount - nt.tip,
                  0
                );
                const rows: Array<{ label: string; value: number }> = [
                  { label: 'قيمة المنتجات', value: sub },
                ];
                if (nt.discount > 0) rows.push({ label: 'الخصم', value: -nt.discount });
                if (nt.tip > 0) rows.push({ label: 'إكرامية', value: nt.tip });
                if (del > 0) rows.push({ label: 'الشحن', value: del });
                return (
                  <div className="mt-3 divide-y divide-slate-50">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-semibold text-slate-500">{r.label}</span>
                        <span className="text-xs font-bold text-slate-700 tabular-nums">
                          {r.value.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-bold text-slate-900">الإجمالي</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {Number(selectedOrder.total || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">المنتجات</div>
            <div className="space-y-2">
              {(selectedOrder.items || []).map((it: any, idx: number) => {
                const name = it?.product?.name || it?.productName || it?.name || it?.title || '-';
                const variant = formatVariantSelectionCompact(
                  it?.variantSelection ?? it?.variant_selection
                );
                const addons = formatAddonsCompactParts(it?.addons ?? it?.extras ?? it?.addOns);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 rounded-lg p-3 flex-row-reverse"
                  >
                    <div className="text-right flex-1">
                      <div className="font-bold text-slate-900 text-sm">{name}</div>
                      {variant ? (
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          ({variant})
                        </div>
                      ) : null}
                      {addons.length > 0 ? (
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                          + {addons.join(' + ')}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-500 mt-0.5">
                        {Number(it?.quantity || it?.qty || 1)} × ج.م{' '}
                        {Number(it?.price || it?.unitPrice || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      ج.م{' '}
                      {(
                        Number(it?.price || it?.unitPrice || 0) *
                        Number(it?.quantity || it?.qty || 1)
                      ).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Returns Panel (from old version) */}
          <OrderReturnsPanel order={selectedOrder} />
        </div>
      </div>
    </div>
  );
};

export default SalesOrderDrawer;
