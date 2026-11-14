'use client';

import React from 'react';
import {
  Eye,
  Loader2,
  Package2,
  Printer,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Truck,
} from 'lucide-react';
import { parseOrderNotes } from '@/components/sales/print-utils';
import { formatOrderItemsSummary } from '@/lib/sales-utils';
import { getDeliveryAddress } from '@/lib/sales-utils';
import { renderDeliveryFee } from '@/lib/sales-utils';
import { hasLocationData } from '@/lib/sales-utils';
import { isDeliveryDisabledOrder } from '@/lib/sales-utils';
import { formatAddonsCompactParts } from '@/lib/sales-utils';
import { formatVariantSelectionCompact } from '@/lib/sales-utils';
import { type FilterType, RETURNABLE_STATUSES, STATUS_META } from './salesShared';

export interface SalesOrdersListProps {
  loading: boolean;
  filteredOrders: any;
  updatingId: string;
  updateStatus: any;
  isRestaurant: any;
  openReturnModal: any;
  router: any;
  toggleSelectAll: any;
  selectedIds: Set<string>;
  paginatedOrders: any;
  showCol: any;
  expandedId: string;
  filter: FilterType;
  toggleSelect: any;
  printInvoice: any;
  printWaybill: any;
  setExpandedId: React.Dispatch<React.SetStateAction<string>>;
  totalPages: any;
  currentPage: number;
  itemsPerPage: any;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const SalesOrdersList: React.FC<SalesOrdersListProps> = ({
  loading,
  filteredOrders,
  updatingId,
  updateStatus,
  isRestaurant,
  openReturnModal,
  router,
  toggleSelectAll,
  selectedIds,
  paginatedOrders,
  showCol,
  expandedId,
  filter,
  toggleSelect,
  printInvoice,
  printWaybill,
  setExpandedId,
  totalPages,
  currentPage,
  itemsPerPage,
  setCurrentPage,
}) => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 pb-10">
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-[12px] font-bold text-slate-400">جاري تحميل الطلبات…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 md:p-12 text-center">
          <Package2 size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد طلبات</p>
        </div>
      ) : (
        <>
          {/* Mobile view */}
          <div className="space-y-3 md:hidden">
            {filteredOrders.map((order) => {
              const id = String(order.id || '');
              const status = String(order.status || '').toUpperCase();
              const meta = STATUS_META[status] || {
                label: status,
                cls: 'bg-slate-50 text-slate-600 border-slate-200',
              };
              const busy = updatingId === id;
              const canAccept = status === 'PENDING';
              const canPrepare = status === 'CONFIRMED';
              const canReady = status === 'PREPARING';
              const canDeliver = status === 'READY';
              const canReject = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(status);
              const canReturn = RETURNABLE_STATUSES.includes(status);
              const address = getDeliveryAddress(order);
              const deliveryManagedByShop = isDeliveryDisabledOrder(order);
              const hasLocation = hasLocationData(order);
              const deliveryFeeText = renderDeliveryFee(order);

              return (
                <div
                  key={id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div className="px-3.5 py-3 flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                          #{id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] font-bold text-slate-700 truncate">
                        {order.customerName || order.customer_name || order.user?.name || 'عميل'}{' '}
                        <span className="text-slate-400 font-semibold" dir="ltr">
                          {order.customerPhone ||
                            order.customer_phone ||
                            order.user?.phone ||
                            order.phone ||
                            ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold tabular-nums">
                        {new Date(order.createdAt || order.created_at || Date.now()).toLocaleString(
                          'ar-EG',
                          {
                            day: 'numeric',
                            month: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}{' '}
                        • {order.items?.length || 0} أصناف
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 font-semibold leading-5 line-clamp-2">
                        {formatOrderItemsSummary(order, undefined, true) || '—'}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-[14px] font-extrabold text-slate-900 tabular-nums">
                        {Number(order.total || 0).toLocaleString('ar-EG')}{' '}
                        <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                      </div>
                      {busy && (
                        <Loader2 size={14} className="animate-spin text-slate-400 mt-1 ml-auto" />
                      )}
                    </div>
                  </div>

                  {(canAccept || canPrepare || canReady || canDeliver || canReject || canReturn) &&
                    !busy && (
                      <div className="px-3.5 pb-3 flex gap-1.5">
                        {canAccept && (
                          <>
                            <button
                              onClick={() => updateStatus(id, 'CONFIRMED')}
                              className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-bold"
                            >
                              تأكيد
                            </button>
                            <button
                              onClick={() => updateStatus(id, 'CANCELLED')}
                              className="flex-1 h-9 rounded-lg bg-white border border-red-200 text-red-600 text-[12px] font-bold"
                            >
                              رفض
                            </button>
                          </>
                        )}
                        {canPrepare && !canAccept && (
                          <button
                            onClick={() => updateStatus(id, 'PREPARING')}
                            className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-[12px] font-bold"
                          >
                            بدء التجهيز
                          </button>
                        )}
                        {canReady && !canAccept && !canPrepare && (
                          <button
                            onClick={() => updateStatus(id, 'READY')}
                            className="flex-1 h-9 rounded-lg bg-slate-900 text-white text-[12px] font-bold"
                          >
                            {isRestaurant ? 'جاهز للتقديم' : 'جاهز'}
                          </button>
                        )}
                        {canDeliver && !canAccept && !canPrepare && !canReady && (
                          <button
                            onClick={() => updateStatus(id, 'DELIVERED')}
                            className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-bold"
                          >
                            تم التسليم
                          </button>
                        )}
                        {canReturn && (
                          <button
                            onClick={() => openReturnModal(order)}
                            className="h-9 px-3 rounded-lg bg-white border border-orange-200 text-orange-600 text-[12px] font-bold"
                          >
                            مرتجع
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/sales/${id}`)}
                          className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[12px] font-bold"
                        >
                          التفاصيل
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl mt-3 overflow-hidden">
            <table className="w-full text-right border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-3 py-2.5 w-10">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0 ? (
                        <CheckSquare size={16} className="text-slate-900" />
                      ) : (
                        <Square size={16} className="text-slate-300" />
                      )}
                    </button>
                  </th>
                  {showCol('order') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الطلب</th>
                  )}
                  {showCol('customer') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العميل</th>
                  )}
                  {showCol('items') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الأصناف</th>
                  )}
                  {showCol('status') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                  )}
                  {showCol('delivery') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">التوصيل</th>
                  )}
                  {showCol('total') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الإجمالي</th>
                  )}
                  {showCol('quick') && (
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">إجراء سريع</th>
                  )}
                  <th className="px-3 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const id = String(order.id || '');
                  const status = String(order.status || '').toUpperCase();
                  const meta = STATUS_META[status] || {
                    label: status,
                    cls: 'bg-slate-50 text-slate-600 border-slate-200',
                  };
                  const busy = updatingId === id;
                  const canAccept = status === 'PENDING';
                  const canPrepare = status === 'CONFIRMED';
                  const canReady = status === 'PREPARING';
                  const canDeliver = status === 'READY';
                  const canReject = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(status);
                  const canReturn = RETURNABLE_STATUSES.includes(status);
                  const address = getDeliveryAddress(order);
                  const deliveryManagedByShop = isDeliveryDisabledOrder(order);
                  const deliveryFeeText = renderDeliveryFee(order);
                  const expanded = expandedId === id;
                  const colCount =
                    2 +
                    ['order', 'customer', 'items', 'status', 'delivery', 'total', 'quick'].filter(
                      showCol
                    ).length;
                  // أرقام الفاتورة الحقيقية من الطلب
                  const _items = Array.isArray(order.items) ? order.items : [];
                  const itemsSubtotal = _items.reduce(
                    (s: number, it: any) =>
                      s +
                      Number(it?.quantity ?? it?.qty ?? 0) *
                        Number(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0),
                    0
                  );
                  const _notes = parseOrderNotes(order);
                  const itemsDeliveryFee = Math.max(
                    Number(order.total || 0) - itemsSubtotal - _notes.discount - _notes.tip,
                    0
                  );
                  const customerPhone =
                    order.customerPhone ||
                    order.customer_phone ||
                    order.user?.phone ||
                    order.phone ||
                    '';
                  const customerNameFull =
                    order.customerName ||
                    order.customer_name ||
                    order.user?.name ||
                    (order as any).customer?.name ||
                    '';
                  const sourceLabel =
                    order.source === 'pos'
                      ? 'من الكاشير'
                      : order.source === 'manual'
                        ? 'طلب يدوي'
                        : order.source === 'website' || !order.source
                          ? 'من الموقع'
                          : order.source;

                  return (
                    <React.Fragment key={id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${status === 'PENDING' ? 'bg-amber-50/40' : ''} ${expanded ? 'bg-slate-50/70' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <button onClick={() => toggleSelect(id)} className="p-1">
                            {selectedIds.has(id) ? (
                              <CheckSquare size={16} className="text-slate-900" />
                            ) : (
                              <Square size={16} className="text-slate-300" />
                            )}
                          </button>
                        </td>
                        {showCol('order') && (
                          <td className="px-3 py-3">
                            <div className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                              #{id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold tabular-nums">
                              {new Date(
                                order.createdAt || order.created_at || Date.now()
                              ).toLocaleString('ar-EG', {
                                day: 'numeric',
                                month: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                        )}
                        {showCol('customer') && (
                          <td className="px-3 py-3">
                            <div className="text-[12px] font-bold text-slate-800 max-w-[150px] truncate">
                              {customerNameFull || 'عميل'}
                            </div>
                            <div
                              className="text-[11px] text-slate-400 font-semibold tabular-nums"
                              dir="ltr"
                              style={{ textAlign: 'right' }}
                            >
                              {customerPhone || '—'}
                            </div>
                          </td>
                        )}
                        {showCol('items') && (
                          <td className="px-3 py-3">
                            <div
                              className="text-[11px] text-slate-600 font-semibold max-w-[220px] truncate"
                              title={formatOrderItemsSummary(order, undefined, true)}
                            >
                              {formatOrderItemsSummary(order, undefined, true) || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold">
                              {order.items?.length || 0} أصناف
                            </div>
                          </td>
                        )}
                        {showCol('status') && (
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-md border whitespace-nowrap ${meta.cls}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                        )}
                        {showCol('delivery') && (
                          <td className="px-3 py-3">
                            <div className="text-[12px] text-slate-600 font-bold whitespace-nowrap">
                              {deliveryManagedByShop ? 'استلام ذاتي' : deliveryFeeText}
                            </div>
                            {address && !deliveryManagedByShop && (
                              <div className="text-[11px] text-slate-400 font-semibold truncate max-w-[160px]">
                                {address}
                              </div>
                            )}
                          </td>
                        )}
                        {showCol('total') && (
                          <td className="px-3 py-3">
                            <div className="text-[13px] font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                              {Number(order.total || 0).toLocaleString('ar-EG')}{' '}
                              <span className="text-[10px] font-bold text-slate-400">ج.م</span>
                            </div>
                          </td>
                        )}
                        {showCol('quick') && (
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              {busy ? (
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                  <Loader2 size={13} className="animate-spin" /> جاري…
                                </span>
                              ) : (
                                <>
                                  {canAccept && (
                                    <>
                                      <button
                                        onClick={() => updateStatus(id, 'CONFIRMED')}
                                        className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                                      >
                                        تأكيد
                                      </button>
                                      <button
                                        onClick={() => updateStatus(id, 'CANCELLED')}
                                        className="h-8 px-3 rounded-lg bg-white border border-red-200 text-red-600 text-[11px] font-bold hover:bg-red-50"
                                      >
                                        رفض
                                      </button>
                                    </>
                                  )}
                                  {canPrepare && (
                                    <button
                                      onClick={() => updateStatus(id, 'PREPARING')}
                                      className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                    >
                                      تجهيز
                                    </button>
                                  )}
                                  {canReady && (
                                    <button
                                      onClick={() => updateStatus(id, 'READY')}
                                      className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                    >
                                      {isRestaurant ? 'جاهز للتقديم' : 'جاهز'}
                                    </button>
                                  )}
                                  {canDeliver && (
                                    <button
                                      onClick={() => updateStatus(id, 'DELIVERED')}
                                      className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                                    >
                                      تم التسليم
                                    </button>
                                  )}
                                  {canReturn && (
                                    <button
                                      onClick={() => openReturnModal(order)}
                                      className="h-8 px-3 rounded-lg bg-white border border-orange-200 text-orange-600 text-[11px] font-bold hover:bg-orange-50"
                                    >
                                      مرتجع
                                    </button>
                                  )}
                                  {!canAccept &&
                                    !canPrepare &&
                                    !canReady &&
                                    !canDeliver &&
                                    !canReturn && (
                                      <span className="text-[11px] font-bold text-slate-300">
                                        —
                                      </span>
                                    )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => router.push(`/dashboard/sales/${id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                              title="عرض الطلب"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => printInvoice(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                              title="طباعة الفاتورة"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => printWaybill(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                              title="طباعة بوليصة التوصيل"
                            >
                              <Truck size={15} />
                            </button>
                            <button
                              onClick={() => setExpandedId(expanded ? '' : id)}
                              className={`p-1.5 rounded-lg transition-colors ${expanded ? 'text-slate-900 bg-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                              title={expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                            >
                              <ChevronDown
                                size={15}
                                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-slate-100">
                          <td colSpan={colCount} className="px-0 py-0 bg-slate-50/60">
                            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* منتجات الطلب */}
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                  منتجات الطلب
                                </div>
                                {_items.length === 0 ? (
                                  <div className="px-4 py-4 text-[11px] text-slate-400 font-semibold">
                                    لا توجد أصناف مسجلة
                                  </div>
                                ) : (
                                  <table className="w-full text-right">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                          المنتج
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                          السعر
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                          الكمية
                                        </th>
                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-400">
                                          الإجمالي
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {_items.map((it: any, idx: number) => {
                                        const qty = Number(it?.quantity ?? it?.qty ?? 0);
                                        const unit = Number(
                                          it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0
                                        );
                                        return (
                                          <tr
                                            key={idx}
                                            className="border-b border-slate-50 last:border-0"
                                          >
                                            <td className="px-3 py-2 text-[11px] font-bold text-slate-700">
                                              <div>
                                                {it?.product?.name ||
                                                  it?.productName ||
                                                  it?.name ||
                                                  it?.title ||
                                                  '—'}
                                              </div>
                                              {formatVariantSelectionCompact(
                                                it?.variantSelection ?? it?.variant_selection
                                              ) ? (
                                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                  (
                                                  {formatVariantSelectionCompact(
                                                    it?.variantSelection ?? it?.variant_selection
                                                  )}
                                                  )
                                                </div>
                                              ) : null}
                                              {formatAddonsCompactParts(
                                                it?.addons ?? it?.extras ?? it?.addOns
                                              ).length > 0 ? (
                                                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                                  +{' '}
                                                  {formatAddonsCompactParts(
                                                    it?.addons ?? it?.extras ?? it?.addOns
                                                  ).join(' + ')}
                                                </div>
                                              ) : null}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                                              {unit.toLocaleString('ar-EG')}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                                              {qty}
                                            </td>
                                            <td className="px-3 py-2 text-[11px] font-bold text-slate-800 tabular-nums">
                                              {(qty * unit).toLocaleString('ar-EG')}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              {/* الفاتورة */}
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                  الفاتورة
                                </div>
                                <div className="px-4 py-2 divide-y divide-slate-50">
                                  {[
                                    { label: 'قيمة المنتجات', value: itemsSubtotal },
                                    _notes.discount > 0 && {
                                      label: 'الخصم',
                                      value: -_notes.discount,
                                    },
                                    _notes.tip > 0 && { label: 'إكرامية', value: _notes.tip },
                                    itemsDeliveryFee > 0 && {
                                      label: 'الشحن',
                                      value: itemsDeliveryFee,
                                    },
                                  ]
                                    .filter(Boolean)
                                    .map((r: any, i: number) => (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between py-2"
                                      >
                                        <span className="text-[11px] font-semibold text-slate-500">
                                          {r.label}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                                          {r.value.toLocaleString('ar-EG')} ج.م
                                        </span>
                                      </div>
                                    ))}
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      الإجمالي
                                    </span>
                                    <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                                      {Number(order.total || 0).toLocaleString('ar-EG')} ج.م
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      الدفع
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-700">
                                      {String(order.paymentMethod || 'COD').toUpperCase() === 'COD'
                                        ? 'دفع عند الاستلام'
                                        : String(order.paymentMethod || '').toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* العميل */}
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-700">
                                  العميل
                                </div>
                                <div className="px-4 py-2 divide-y divide-slate-50">
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      الاسم
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800">
                                      {customerNameFull || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      رقم الهاتف
                                    </span>
                                    <span
                                      className="text-[11px] font-bold text-slate-800 tabular-nums"
                                      dir="ltr"
                                    >
                                      {customerPhone || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 py-2">
                                    <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                                      العنوان
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-700 text-left">
                                      {address || 'استلام من المتجر'}
                                    </span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3 py-2">
                                    <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                                      ملاحظة العميل
                                    </span>
                                    <span
                                      className={`text-[11px] font-bold text-left ${order.customerNote || order.customer_note || order.notes ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded' : 'text-slate-400'}`}
                                    >
                                      {order.customerNote ||
                                        order.customer_note ||
                                        order.notes ||
                                        'لا توجد ملاحظات'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between py-2">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      المصدر
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                                      {sourceLabel}
                                    </span>
                                  </div>
                                </div>
                                <div className="px-4 pb-3 pt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => router.push(`/dashboard/sales/${id}`)}
                                    className="h-8 px-4 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700"
                                  >
                                    عرض
                                  </button>
                                  {customerPhone && (
                                    <a
                                      href={`https://wa.me/2${customerPhone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-8 px-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 flex items-center"
                                    >
                                      واتساب
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-xs font-bold text-slate-500">
                عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredOrders.length)} من{' '}
                {filteredOrders.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="text-xs font-bold text-slate-600 px-3">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesOrdersList;
