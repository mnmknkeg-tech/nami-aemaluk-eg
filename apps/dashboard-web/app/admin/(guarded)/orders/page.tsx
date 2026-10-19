'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard, ShoppingBag, UserPlus, Filter,
  TrendingUp, Package,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { fetchAdminOrders } from '@/lib/api/orders';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, FilterSelect,
  Pagination, AdminTable, TH, TD, TR, StatChip, Badge, formatEGP, fmtDate, type Tone,
} from '@/components/admin/ui';

const asCleanText = (v: any) => {
  const s = typeof v === 'string' ? v : (v == null ? '' : String(v));
  const t = s.trim();
  return t ? t : '';
};

const formatVariantSelectionCompact = (raw: any) => {
  if (!raw || typeof raw !== 'object') return '';
  const kind = asCleanText(raw?.kind).toLowerCase();
  if (kind === 'pack') return asCleanText(raw?.label || raw?.packName);
  if (kind === 'fashion') {
    const color = asCleanText(raw?.colorName || raw?.color || raw?.colorValue);
    const size = asCleanText(raw?.size);
    return [color, size].filter(Boolean).join(' ');
  }
  const size = asCleanText(raw?.sizeLabel || raw?.sizeName || raw?.size);
  const type = asCleanText(raw?.typeLabel || raw?.typeName || raw?.type);
  return [type, size].filter(Boolean).join(' ');
};

const formatAddonsCompactParts = (raw: any): string[] => {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : null);
  if (!Array.isArray(list) || list.length === 0) return [];
  return list.map((a: any) => {
    if (typeof a === 'string') return asCleanText(a);
    if (!a || typeof a !== 'object') return '';
    const name = asCleanText(a?.optionName || a?.name || a?.title || a?.label);
    const size = asCleanText(a?.variantLabel || a?.variant || a?.size || a?.sizeLabel);
    const priceRaw = typeof a?.price === 'number' ? a.price : Number(a?.price ?? NaN);
    const priceText = Number.isFinite(priceRaw) && priceRaw >= 0 ? ` ج.م ${Math.round(priceRaw * 100) / 100}` : '';
    const core = [name, size].filter(Boolean).join(' ');
    return core ? `${core}${priceText}`.trim() : '';
  }).filter(Boolean);
};

const formatOrderItemsFull = (order: any) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) return '';
  const parts = items.map((it: any) => {
    const name = asCleanText(it?.product?.name || it?.name || it?.title);
    const qty = Number(it?.quantity || it?.qty || 1);
    const qtyText = Number.isFinite(qty) && qty > 1 ? ` × ${qty}` : '';
    const unitPrice = Number(it?.price ?? it?.unitPrice ?? it?.unit_price ?? 0);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const lineTotal = Number.isFinite(unitPrice) ? unitPrice * safeQty : NaN;
    const priceText = (() => {
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return '';
      const useTotal = Number.isFinite(lineTotal) && safeQty > 1;
      const n = useTotal ? lineTotal : unitPrice;
      return ` ج.م ${Math.round(n * 100) / 100}`;
    })();
    const variantText = formatVariantSelectionCompact(it?.variantSelection ?? it?.variant_selection);
    const addonsParts = formatAddonsCompactParts(it?.addons ?? it?.extras ?? it?.addOns);
    const core = [name, variantText].filter(Boolean).join(' ');
    const base = [core ? `${core}${qtyText}` : '', priceText].filter(Boolean).join('');
    const addons = addonsParts.length ? ` + ${addonsParts.join(' + ')}` : '';
    return `${base}${addons}`.trim();
  }).filter(Boolean);
  return parts.join(' + ');
};

const ORDER_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DELIVERED: { label: 'تم التوصيل', tone: 'green' },
  READY: { label: 'جاهز', tone: 'sky' },
  PREPARING: { label: 'قيد التحضير', tone: 'amber' },
  CONFIRMED: { label: 'مؤكد', tone: 'amber' },
  CANCELLED: { label: 'ملغي', tone: 'red' },
  PENDING: { label: 'قيد المراجعة', tone: 'amber' },
};

const parseCodLocation = (notes: any) => {
  try {
    const raw = typeof notes === 'string' ? notes : '';
    const prefix = 'COD_LOCATION:';
    const start = raw.indexOf(prefix);
    if (start < 0) return null;
    const after = raw.slice(start + prefix.length);
    const nl = after.search(/\r?\n/);
    const json = (nl === -1 ? after : after.slice(0, nl)).trim();
    if (!json) return null;
    const parsed = JSON.parse(json);
    const lat = Number(parsed?.coords?.lat);
    const lng = Number(parsed?.coords?.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng, note: parsed?.note, address: parsed?.address };
  } catch { return null; }
};

const getDeliveryFeeFromNotes = (notes: any): number | null => {
  const raw = typeof notes === 'string' ? notes : '';
  if (!raw) return null;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const feeLine = lines.find((l) => l.toUpperCase().startsWith('DELIVERY_FEE:'));
  if (!feeLine) return null;
  const value = feeLine.split(':').slice(1).join(':').trim();
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { orders } = await fetchAdminOrders({ limit: 200 });
        setOrders(Array.isArray(orders) ? orders : []);
      } catch { setOrders([]); }
      finally { setLoading(false); }
    };
    loadOrders();
  }, []);

  useEffect(() => {
    const loadCouriers = async () => {
      try {
        const data = await apiRequest('/couriers');
        setCouriers(Array.isArray(data) ? data : []);
      } catch { setCouriers([]); }
    };
    loadCouriers();
  }, []);

  const editDeliveryFee = async (order: any) => {
    const current = getDeliveryFeeFromNotes(order?.notes);
    const raw = window.prompt('رسوم التوصيل (ج.م):', current != null ? String(current) : '');
    if (raw == null) return;
    const fee = Number(String(raw).trim());
    if (Number.isNaN(fee) || fee < 0) return;
    try {
      const updated = await apiRequest(`/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryFee: fee }),
      });
      setOrders((prev) => prev.map((o) => (String(o.id) === String(updated?.id) ? { ...o, ...updated } : o)));
      toast({ title: 'تم تحديث رسوم التوصيل', variant: 'success' });
    } catch {
      toast({ title: 'فشل تحديث الرسوم', variant: 'destructive' });
    }
  };

  const assignCourier = async (order: any) => {
    if (!couriers.length) {
      window.alert('لا يوجد مندوبون. أنشئ مندوباً من صفحة التوصيل.');
      return;
    }
    const current = order?.courier?.id ? String(order.courier.id) : '';
    const options = couriers.map((c) => `${c.id}::${c.name || c.email || c.phone || c.id}`).join('\n');
    const raw = window.prompt(`اختر مندوب:\n${options}`, current);
    if (!raw) return;
    const courierId = String(raw).split('::')[0].trim();
    if (!courierId) return;
    try {
      const updated = await apiRequest(`/orders/${order.id}/courier`, {
        method: 'PATCH',
        body: JSON.stringify({ courierId }),
      });
      setOrders((prev) => prev.map((o) => (String(o.id) === String(updated?.id) ? { ...o, ...updated } : o)));
      toast({ title: 'تم تعيين المندوب', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تعيين المندوب', variant: 'destructive' });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchTerm ||
        String(order?.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(order?.shop?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || String(order?.status || '').toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const paginatedOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders.reduce((s, o) => s + Number(o?.total || 0), 0),
    delivered: orders.filter((o) => String(o?.status || '').toUpperCase() === 'DELIVERED').length,
    pending: orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(String(o?.status || '').toUpperCase())).length,
  }), [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="إدارة العمليات"
        subtitle="عرض وإدارة جميع الطلبات على المنصة"
        tone="amber"
        stats={
          <>
            <StatChip label="إجمالي الطلبات" value={stats.total} icon={ShoppingBag} />
            <StatChip label="الإيرادات" value={formatEGP(stats.revenue)} icon={TrendingUp} tone="cyan" />
            <StatChip label="تم التوصيل" value={stats.delivered} icon={Package} tone="green" />
            <StatChip label="قيد التنفيذ" value={stats.pending} icon={Filter} tone="amber" />
          </>
        }
      />

      <Panel>
        <div className="flex flex-col md:flex-row gap-3 p-5 border-b border-slate-100">
          <SearchInput
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setPage(0); }}
            placeholder="ابحث برقم العملية أو اسم المتجر..."
          />
          <FilterSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(0); }}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'PENDING', label: 'قيد المراجعة' },
              { value: 'CONFIRMED', label: 'مؤكد' },
              { value: 'PREPARING', label: 'قيد التحضير' },
              { value: 'READY', label: 'جاهز' },
              { value: 'DELIVERED', label: 'تم التوصيل' },
              { value: 'CANCELLED', label: 'ملغي' },
            ]}
          />
        </div>

        {loading ? (
          <LoadingBlock />
        ) : paginatedOrders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="لا توجد طلبات" />
        ) : (
          <>
            <div className="hidden lg:block">
              <AdminTable
                minW="min-w-[1080px]"
                head={
                  <>
                    <th className={TH}>رقم العملية</th>
                    <th className={TH}>التاريخ</th>
                    <th className={TH}>المنتجات</th>
                    <th className={TH}>المبلغ</th>
                    <th className={TH}>التوصيل</th>
                    <th className={TH}>الدفع</th>
                    <th className={TH}>الموقع</th>
                    <th className={TH}>المندوب</th>
                    <th className={TH}>الحالة</th>
                  </>
                }
              >
                {paginatedOrders.map((order) => {
                  const meta = ORDER_STATUS_META[String(order?.status || '').toUpperCase()] || ORDER_STATUS_META.PENDING;
                  const itemsText = formatOrderItemsFull(order);
                  const fee = getDeliveryFeeFromNotes(order.notes);
                  const loc = parseCodLocation(order.notes);
                  return (
                    <tr key={order.id} className={TR}>
                      <td className={TD + ' font-black text-slate-900'}>#{String(order.id || '').slice(0, 8)}</td>
                      <td className={TD + ' text-slate-500 text-sm'}>{fmtDate(order?.createdAt)}</td>
                      <td className={TD + ' text-slate-700 font-bold text-xs max-w-[420px]'}>
                        <div className="whitespace-normal break-words" title={itemsText || ''}>
                          {itemsText || '-'}
                        </div>
                      </td>
                      <td className={TD}>
                        <span className="text-cyan-700 font-black">{formatEGP(order?.total)}</span>
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => editDeliveryFee(order)}
                          className="text-slate-700 font-black text-xs hover:text-cyan-600 transition-colors"
                        >
                          {fee == null ? 'تحديد' : `${fee} ج.م`}
                        </button>
                      </td>
                      <td className={TD}>
                        <span className="text-slate-700 font-black text-xs">
                          {String(order?.paymentMethod || order?.payment_method || '-')}
                        </span>
                      </td>
                      <td className={TD}>
                        {loc ? (
                          <a
                            href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-700 font-black text-xs hover:underline"
                          >
                            فتح الخريطة
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">-</span>
                        )}
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => assignCourier(order)}
                          className="inline-flex items-center gap-2 text-slate-700 font-black text-xs hover:text-cyan-600 transition-colors"
                        >
                          <UserPlus size={14} />
                          {order?.courier?.name || 'تعيين'}
                        </button>
                      </td>
                      <td className={TD}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </AdminTable>
            </div>

            {/* كروت الموبايل — بديل الجدول على الشاشات الصغيرة */}
            <div className="lg:hidden space-y-3 p-4">
              {paginatedOrders.map((order) => {
                const meta = ORDER_STATUS_META[String(order?.status || '').toUpperCase()] || ORDER_STATUS_META.PENDING;
                const fee = getDeliveryFeeFromNotes(order.notes);
                const loc = parseCodLocation(order.notes);
                const itemsText = formatOrderItemsFull(order);
                return (
                  <div key={order.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-black text-sm">#{String(order.id || '').slice(0, 8)}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 font-bold">{fmtDate(order?.createdAt)}</div>
                    {itemsText && (
                      <div className="text-xs text-slate-700 font-bold whitespace-normal break-words">{itemsText}</div>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">المبلغ:</span>
                        <span className="text-cyan-700 font-black">{formatEGP(order?.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الرسوم:</span>
                        <button onClick={() => editDeliveryFee(order)} className="text-slate-700 font-black hover:text-cyan-600">
                          {fee == null ? 'تحديد' : `${fee} ج.م`}
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الدفع:</span>
                        <span className="text-slate-700 font-black">{String(order?.paymentMethod || order?.payment_method || '-')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">المندوب:</span>
                        <button onClick={() => assignCourier(order)} className="inline-flex items-center gap-1 text-slate-700 font-black hover:text-cyan-600">
                          <UserPlus size={10} />
                          {order?.courier?.name || 'تعيين'}
                        </button>
                      </div>
                    </div>
                    {loc && (
                      <a
                        href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-700 font-black hover:underline text-xs block"
                      >
                        فتح الخريطة
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredOrders.length}
          unit="طلب"
          onPage={setPage}
        />
      </Panel>
    </div>
  );
}
