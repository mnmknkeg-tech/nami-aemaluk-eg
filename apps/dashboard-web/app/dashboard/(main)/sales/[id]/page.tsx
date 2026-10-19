'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Truck, MessageCircle, Loader2, ReceiptText,
  User, Phone, MapPin, StickyNote, CreditCard, CheckCircle2, XCircle, Clock,
  Package, CircleDollarSign, Calendar, Printer,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { getDeliveryAddress, renderDeliveryFee, isDeliveryDisabledOrder } from '@/lib/sales-utils';
import { cardClass } from '@/lib/ui/tokens';
import { PrintPreviewModal, parseOrderNotes } from '@/components/sales/print-utils';

const STATUS_META: Record<string, { label: string; cls: string; color: string }> = {
  PENDING: { label: 'بانتظار التأكيد', cls: 'bg-amber-50 text-amber-800 border-amber-200', color: '#D97706' },
  CONFIRMED: { label: 'مؤكد', cls: 'bg-blue-50 text-blue-800 border-blue-200', color: '#2563EB' },
  PREPARING: { label: 'قيد التجهيز', cls: 'bg-violet-50 text-violet-800 border-violet-200', color: '#7C3AED' },
  READY: { label: 'جاهز', cls: 'bg-teal-50 text-teal-800 border-teal-200', color: '#0D9488' },
  DELIVERED: { label: 'تم التسليم', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', color: '#059669' },
  CANCELLED: { label: 'ملغي', cls: 'bg-red-50 text-red-700 border-red-200', color: '#DC2626' },
  REFUNDED: { label: 'مسترجع', cls: 'bg-orange-50 text-orange-800 border-orange-200', color: '#F59E0B' },
};
const statusMeta = (s?: string) =>
  STATUS_META[String(s || '').toUpperCase()] || { label: s || 'أخرى', cls: 'bg-slate-100 text-slate-600 border-slate-200', color: '#94A3B8' };

const LOCALE = 'ar-EG-u-nu-latn';
const money = (n?: number | string) => `${Number(n || 0).toLocaleString(LOCALE, { maximumFractionDigits: 2 })} ج.م`;
const fmtNum = (n?: number | string) => (Number(n || 0)).toLocaleString(LOCALE);
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'المتجر الإلكتروني', online: 'المتجر الإلكتروني', manual: 'طلب يدوي', pos: 'الكسير', marketplace: 'السوق',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const { shop } = useShop();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');
  const [printPreview, setPrintPreview] = useState<{ order: any; mode: 'invoice' | 'waybill' } | null>(null);

  const isRestaurant = String(shop?.category || '').toUpperCase() === 'RESTAURANT';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/orders/${id}`);
      setOrder(data || null);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل الطلب');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const updateStatus = useCallback(async (status: string) => {
    if (!order?.id) return;
    setUpdating(status);
    try {
      const upper = String(status || '').toUpperCase();
      const payload = upper === 'HANDED_TO_COURIER' ? { handedToCourier: true } : { status };
      await apiRequest(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setOrder((prev: any) => ({ ...prev, status: upper }));
      window.dispatchEvent(new Event('orders-updated'));
    } catch (e: any) {
      setError(e?.message || 'فشل تحديث الحالة');
    } finally {
      setUpdating('');
    }
  }, [id, order?.id]);

  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const subtotal = items.reduce((s, it) => s + (Number(it?.price || it?.unitPrice || 0) * Number(it?.quantity || it?.qty || 1)), 0);
  const notesMeta = parseOrderNotes(order);
  const deliveryDisabled = isDeliveryDisabledOrder(order);
  const deliveryFeeText = renderDeliveryFee(order);
  // delivery fee is whatever remains of the total after items/discount/tip
  const deliveryFee = Math.max(Number(order?.total || 0) - subtotal - notesMeta.discount - notesMeta.tip, 0);
  const total = Number(order?.total || subtotal + deliveryFee);
  const source = SOURCE_LABELS[String(order?.source || '').toLowerCase()] || order?.source || '—';
  const customerName = order?.customerName || order?.customer_name || order?.user?.name || order?.customer?.name;
  const customerPhone = order?.customerPhone || order?.customer_phone || order?.user?.phone || order?.customer?.phone;
  const customerAddress = getDeliveryAddress(order);
  const customerNote = order?.customerNote || order?.customer_note || order?.customer?.notes;
  const paymentStatus = String(order?.paymentStatus || order?.payment_status || '').toUpperCase();
  const paymentStatusLabel = paymentStatus === 'PAID' ? 'مدفوع' : paymentStatus === 'COD' ? 'كاش عند الاستلام' : paymentStatus || '—';

  const metaBits: Array<{ label: string; value: string }> = [
    { label: 'رقم الطلب', value: `#${String(order?.id || '').slice(0, 8).toUpperCase()}` },
    { label: 'تاريخ الإنشاء', value: fmtDateTime(order?.createdAt || order?.created_at) },
    { label: 'آخر تعديل', value: fmtDateTime(order?.updatedAt || order?.updated_at) },
    { label: 'مصدر الطلب', value: source },
  ];

  const statusActions = (() => {
    const st = String(order?.status || '').toUpperCase();
    const actions: Array<{ label: string; status: string; primary?: boolean; danger?: boolean }> = [];
    if (st === 'PENDING') { actions.push({ label: 'تأكيد الطلب', status: 'CONFIRMED', primary: true }); actions.push({ label: 'رفض', status: 'CANCELLED', danger: true }); }
    else if (st === 'CONFIRMED') { actions.push({ label: 'بدء التجهيز', status: 'PREPARING', primary: true }); actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true }); }
    else if (st === 'PREPARING') { actions.push({ label: isRestaurant ? 'جاهز للتقديم' : 'جاهز', status: 'READY', primary: true }); actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true }); }
    else if (st === 'READY') { actions.push({ label: 'تم التسليم', status: 'DELIVERED', primary: true }); actions.push({ label: 'إلغاء', status: 'CANCELLED', danger: true }); }
    else if (st === 'DELIVERED') { actions.push({ label: 'تسجيل مرتجع', status: 'REFUNDED' }); }
    return actions;
  })();

  const sm = statusMeta(order?.status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1200px] mx-auto">

      {/* ===== Back ===== */}
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowRight size={14} /> العودة إلى الطلبات
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className={`${cardClass} p-6 flex flex-col gap-3`}>
            <div className="h-7 w-56 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-4 w-40 bg-slate-100 rounded-md animate-pulse" />
          </div>
          <div className={`${cardClass} p-6 space-y-3`}>
            <div className="h-4 w-32 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-md animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-md animate-pulse" />
          </div>
        </div>
      ) : error || !order ? (
        <div className={`${cardClass} p-12 flex flex-col items-center text-center gap-3`}>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-400"><XCircle size={22} /></div>
          <p className="text-sm font-bold text-slate-700">{error || 'لم يتم العثور على الطلب'}</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sales')}
            className="mt-1 h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            الرجوع إلى الطلبات
          </button>
        </div>
      ) : (
        <>
          {/* ===== Order Header ===== */}
          <div className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    تفاصيل الطلب <span className="text-slate-400">#{String(order?.id || '').slice(0, 8).toUpperCase()}</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center text-[11px] font-bold rounded-full px-2.5 py-0.5 border ${sm.cls}`}>
                      {sm.label}
                    </span>
                    {paymentStatusLabel !== '—' && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border ${paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <CircleDollarSign size={12} /> {paymentStatusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPrintPreview({ order, mode: 'invoice' })}
                  className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Printer size={13} /> الفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPreview({ order, mode: 'waybill' })}
                  className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Truck size={13} /> البوليصة
                </button>
                {statusActions.map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => updateStatus(a.status)}
                    disabled={!!updating}
                    className={`h-9 px-3.5 rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${
                      a.primary ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : a.danger ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                      : 'bg-white border border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                  >
                    {updating === a.status ? <Loader2 size={13} className="animate-spin" /> : null}
                    {a.label}
                  </button>
                ))}
                {customerPhone && (
                  <a
                    href={`https://wa.me/2${String(customerPhone).replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold hover:bg-emerald-100 inline-flex items-center gap-1.5"
                  >
                    <MessageCircle size={13} /> واتساب العميل
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ===== Info grid ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {metaBits.map((m) => (
              <div key={m.label} className={`${cardClass} p-4`}>
                <div className="text-[11px] font-semibold text-slate-400">{m.label}</div>
                <div className="mt-2 text-sm font-extrabold text-slate-900 truncate">{m.value}</div>
              </div>
            ))}
          </div>
      {/* ===== Products + Summary ===== */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <div className={`${cardClass} xl:col-span-2 overflow-hidden`}>
              <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Package size={15} /></span>
                <div>
                  <h3 className="text-[14px] font-extrabold text-slate-900 leading-5">منتجات الطلب</h3>
                  <p className="text-[11px] font-medium text-slate-400 leading-4">{items.length} صنف</p>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-8 text-center text-[12px] font-semibold text-slate-400">لا توجد أصناف في هذا الطلب</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-[11px] font-semibold text-slate-400 py-2.5 pr-5">المنتج</th>
                        <th className="text-[11px] font-semibold text-slate-400 py-2.5">السعر</th>
                        <th className="text-[11px] font-semibold text-slate-400 py-2.5">الكمية</th>
                        <th className="text-[11px] font-semibold text-slate-400 py-2.5">الإجمالي</th>
                        <th className="text-[11px] font-semibold text-slate-400 py-2.5 pl-5 text-left">الوزن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => {
                        const qty = Number(it?.quantity || it?.qty || 1);
                        const price = Number(it?.price || it?.unitPrice || 0);
                        const weight = it?.weight || it?.weightKg || it?.weight_kg;
                        const name = it?.product?.name || it?.productName || it?.name || it?.title || 'منتج';
                        return (
                          <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="py-3 pr-5">
                              <span className="text-[13px] font-bold text-slate-800 block truncate max-w-[220px]">{name}</span>
                              {it?.product?.sku || it?.sku ? <span className="text-[10px] text-slate-400 block" dir="ltr">{it.product?.sku || it.sku}</span> : null}
                            </td>
                            <td className="py-3 text-[12px] font-semibold text-slate-600 tabular-nums">{money(price)}</td>
                            <td className="py-3 text-[12px] font-semibold text-slate-600 tabular-nums">{fmtNum(qty)}</td>
                            <td className="py-3 text-[13px] font-extrabold text-slate-900 tabular-nums">{money(price * qty)}</td>
                            <td className="py-3 pl-5 text-left text-[12px] font-semibold text-slate-500 tabular-nums">{weight ? `${fmtNum(weight)} كجم` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className={`${cardClass} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CircleDollarSign size={15} /></span>
                  <h3 className="text-[14px] font-extrabold text-slate-900">الملخص</h3>
                </div>
                <div className="space-y-2.5 text-[12px] font-semibold text-slate-500">
                  <div className="flex justify-between"><span>قيمة المنتجات</span><span className="text-slate-900 font-bold tabular-nums">{money(subtotal)}</span></div>
                  {notesMeta.discount > 0 && (
                    <div className="flex justify-between"><span>الخصم</span><span className="text-orange-600 font-bold tabular-nums">- {money(notesMeta.discount)}</span></div>
                  )}
                  {notesMeta.tip > 0 && (
                    <div className="flex justify-between"><span>إكرامية</span><span className="text-slate-900 font-bold tabular-nums">{money(notesMeta.tip)}</span></div>
                  )}
                  {!deliveryDisabled && deliveryFee > 0 && (
                    <div className="flex justify-between"><span>رسوم التوصيل</span><span className="text-slate-900 font-bold tabular-nums">{money(deliveryFee)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-[13px] font-extrabold text-slate-900">الإجمالي</span>
                    <span className="text-[16px] font-extrabold text-slate-900 tabular-nums">{money(total)}</span>
                  </div>
                </div>
              </div>

              {deliveryDisabled && (
                <div className={`${cardClass} p-4 flex items-start gap-3`} style={{ background: '#F0FDF4' }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700 shrink-0" style={{ background: '#D1FAE5' }}><Truck size={15} /></span>
                  <div>
                    <p className="text-[13px] font-extrabold text-emerald-800">لا يتطلب شحن</p>
                    <p className="text-[11px] font-medium text-emerald-700/80 mt-0.5 leading-5">هذا الطلب لا يتضمن أي عملية شحن، ويمكن معالجته مباشرة دون الحاجة لخدمات التوصيل.</p>
                  </div>
                </div>
              )}
              {!deliveryDisabled && deliveryFeeText && (
                <div className={`${cardClass} p-4 flex items-center gap-3`}>
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0"><Truck size={15} /></span>
                  <div>
                    <p className="text-[13px] font-extrabold text-slate-900">التوصيل عن المندوب</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">رسوم التوصيل {deliveryFeeText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
      {/* ===== Customer + Payment + Notes ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600"><User size={15} /></span>
                <h3 className="text-[14px] font-extrabold text-slate-900">تفاصيل العميل</h3>
              </div>
              <div className="space-y-3 text-[12px]">
                {customerName && <div className="flex items-center gap-2.5"><User size={14} className="text-slate-300 shrink-0" /><span className="font-bold text-slate-800">{customerName}</span></div>}
                {customerPhone && <div className="flex items-center gap-2.5"><Phone size={14} className="text-slate-300 shrink-0" /><span className="font-semibold text-slate-600" dir="ltr">{customerPhone}</span></div>}
                {customerAddress && <div className="flex items-start gap-2.5"><MapPin size={14} className="text-slate-300 shrink-0 mt-0.5" /><span className="font-semibold text-slate-600 leading-5">{customerAddress}</span></div>}
                {!customerName && !customerPhone && !customerAddress && <p className="text-slate-400 font-semibold">لا توجد بيانات عميل</p>}
              </div>
            </div>

            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CreditCard size={15} /></span>
                <h3 className="text-[14px] font-extrabold text-slate-900">الدفع</h3>
              </div>
              <div className="space-y-2.5 text-[12px] font-semibold text-slate-500">
                <div className="flex justify-between"><span>المبلغ المدفوع</span><span className="text-slate-900 font-bold tabular-nums">{money(total)}</span></div>
                <div className="flex justify-between items-center">
                  <span>حالة الدفع</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border ${paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {paymentStatus === 'PAID' ? <CheckCircle2 size={11} /> : null}
                    {paymentStatusLabel}
                  </span>
                </div>
                {order?.paymentMethod && (
                  <div className="flex justify-between"><span>طريقة الدفع</span><span className="text-slate-900 font-bold">{String(order.paymentMethod).toUpperCase()}</span></div>
                )}
              </div>
            </div>

            <div className={`${cardClass} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><StickyNote size={15} /></span>
                <h3 className="text-[14px] font-extrabold text-slate-900">ملاحظات</h3>
              </div>
              {(customerNote || order?.notes) ? (
                <p className="text-[12px] font-semibold text-slate-600 leading-6">{customerNote || order?.notes}</p>
              ) : (
                <p className="text-[12px] font-semibold text-slate-400">لا توجد ملاحظات</p>
              )}
              {order?.deliveryNote && (
                <p className="mt-3 text-[11px] font-semibold text-slate-400 leading-5">ملاحظة التوصيل: {order.deliveryNote}</p>
              )}
            </div>
          </div>

          {/* ===== Activity timeline ===== */}
          <div className={`${cardClass} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Calendar size={15} /></span>
              <h3 className="text-[14px] font-extrabold text-slate-900">نشاط الطلب</h3>
            </div>
            <div>
              {order?.deliveredAt && (
                <ActivityRow icon={CheckCircle2} color="text-emerald-600" title="تم تسليم الطلب" time={fmtDateTime(order.deliveredAt)} last={false} />
              )}
              {order?.handedToCourierAt && (
                <ActivityRow icon={Truck} color="text-indigo-600" title="سُلّم للمندوب" time={fmtDateTime(order.handedToCourierAt)} last={false} />
              )}
              <ActivityRow icon={ReceiptText} color="text-amber-500" title="جارٍ المعالجة" time={fmtDateTime(order?.updatedAt || order?.updated_at)} last={false} />
              <ActivityRow icon={Clock} color="text-slate-500" title="تم إنشاء الطلب" time={fmtDateTime(order?.createdAt || order?.created_at)} last={true} />
            </div>
          </div>
        </>
      )}

      {printPreview && (
        <PrintPreviewModal
          order={printPreview.order}
          shop={shop}
          mode={printPreview.mode}
          onClose={() => setPrintPreview(null)}
        />
      )}
    </div>
  );
}

function ActivityRow({ icon: Icon, color, title, time, last = false }: {
  icon: any; color: string; title: string; time: string; last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center ${color} shrink-0`}><Icon size={14} /></span>
        {!last && <span className="w-px flex-1 bg-slate-100 my-1" />}
      </div>
      <div className="pb-4">
        <p className="text-[13px] font-bold text-slate-800">{title}</p>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}