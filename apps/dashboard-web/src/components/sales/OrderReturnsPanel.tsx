'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type Props = {
  order: any;
  shopId?: string;
};

const OrderReturnsPanel: React.FC<Props> = ({ order, shopId }) => {
  const orderId = String(order?.id || '').trim();
  const orderItems = Array.isArray(order?.items) ? order.items : [];

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [returnsList, setReturnsList] = useState<any[]>([]);

  const [reason, setReason] = useState('');
  const [returnToStock, setReturnToStock] = useState(true);
  const [qtyByOrderItemId, setQtyByOrderItemId] = useState<Record<string, string>>({});

  const returnedQtyByOrderItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of returnsList || []) {
      const items = Array.isArray(r?.items) ? r.items : [];
      for (const it of items) {
        const k = String(it?.orderItemId || it?.order_item_id || '').trim();
        const q = Number(it?.quantity || 0);
        if (!k) continue;
        map.set(k, (map.get(k) || 0) + (Number.isFinite(q) ? q : 0));
      }
    }
    return map;
  }, [returnsList]);

  const computeRemainingQty = (orderItem: any) => {
    const id = String(orderItem?.id || '').trim();
    const sold = Math.max(0, Math.floor(Number(orderItem?.quantity || 0)));
    const returned = Math.max(0, Math.floor(Number(returnedQtyByOrderItemId.get(id) || 0)));
    return Math.max(0, sold - returned);
  };

  const refresh = async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const sid = shopId || (await apiRequest('/shops/me'))?.id;
      if (!sid) { setReturnsList([]); return; }
      const data = await apiRequest(`/shops/${sid}/orders/${orderId}/returns`);
      setReturnsList(Array.isArray(data) ? data : (data?.returns ? data.returns : []));
    } catch (e: any) {
      setError(String(e?.message || 'فشل تحميل المرتجعات'));
      setReturnsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    setReason('');
    setReturnToStock(true);
    setQtyByOrderItemId({});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const canCreate = useMemo(() => {
    if (!orderId || creating) return false;
    return orderItems.some((it: any) => computeRemainingQty(it) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, creating, orderItems, returnedQtyByOrderItemId]);

  const createReturn = async () => {
    if (!orderId || !canCreate) return;

    const itemsPayload = orderItems
      .map((it: any) => {
        const id = String(it?.id || '').trim();
        if (!id) return null;
        const remaining = computeRemainingQty(it);
        const raw = qtyByOrderItemId[id];
        const n = raw == null || raw === '' ? NaN : Number(raw);
        const qty = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        if (qty <= 0) return null;
        if (qty > remaining) return { orderItemId: id, quantity: remaining };
        return { orderItemId: id, quantity: qty };
      })
      .filter(Boolean) as Array<{ orderItemId: string; quantity: number }>;

    if (itemsPayload.length === 0) {
      setError('حدد كمية المرتجع');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const sid = shopId || (await apiRequest('/shops/me'))?.id;
      if (!sid) { setError('لم يتم العثور على المتجر'); return; }
      await apiRequest(`/shops/${sid}/orders/${orderId}/returns`, {
        method: 'POST',
        body: JSON.stringify({
          returnToStock: returnToStock === true,
          reason: String(reason || '').trim() || undefined,
          items: itemsPayload,
        }),
      });
      setReason('');
      setQtyByOrderItemId({});
      try { window.dispatchEvent(new Event('orders-updated')); } catch {}
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || 'فشل إنشاء المرتجع'));
    } finally {
      setCreating(false);
    }
  };

  if (!orderId) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw size={16} className="text-slate-600" />
          <div className="text-xs font-black text-slate-700 uppercase tracking-widest">المرتجعات</div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs flex items-center gap-1.5 hover:bg-slate-100 transition-all"
          disabled={loading}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          تحديث
        </button>
      </div>

      {error ? (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
          {error}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {(returnsList || []).length === 0 && !loading ? (
          <div className="text-slate-500 font-bold text-xs">لا توجد مرتجعات لهذا الطلب</div>
        ) : null}

        {(returnsList || []).map((r: any) => (
          <div key={String(r?.id)} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-slate-900 font-black text-xs">مرتجع #{String(r?.id || '').slice(0, 6).toUpperCase()}</div>
              <div className="text-slate-500 font-bold text-[10px]">
                {r?.createdAt ? new Date(r.createdAt).toLocaleString('ar-EG') : '-'}
              </div>
            </div>
            <div className="mt-1 text-slate-700 font-bold text-[11px]">
              الإجمالي: ج.م {Number(r?.totalAmount || 0).toLocaleString()}
            </div>
            {r?.reason ? <div className="mt-1 text-slate-600 font-bold text-[10px] whitespace-pre-wrap">{String(r.reason)}</div> : null}
            <div className="mt-2 space-y-1">
              {(Array.isArray(r?.items) ? r.items : []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="text-slate-700 font-bold text-[10px] truncate">{it?.product?.name || it?.name || 'منتج'}</div>
                  <div className="text-slate-500 font-black text-[10px] shrink-0">
                    {Number(it?.quantity || 0)} × ج.م {Number(it?.unitPrice || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="text-slate-900 font-black text-xs mb-2">إنشاء مرتجع جديد</div>

        <label className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-2">
          <input
            type="checkbox"
            checked={returnToStock}
            onChange={(e) => setReturnToStock(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          إرجاع للمخزون
        </label>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="سبب المرتجع (اختياري)"
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
          rows={2}
        />

        <div className="mt-3 space-y-2">
          {orderItems.map((it: any, idx: number) => {
            const id = String(it?.id || '').trim();
            const name = it?.product?.name || it?.name || it?.title || `منتج ${idx + 1}`;
            const remaining = computeRemainingQty(it);
            const value = qtyByOrderItemId[id] ?? '';
            const disabled = remaining <= 0 || creating;

            return (
              <div key={id || idx} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-slate-900 font-bold text-xs truncate">{name}</div>
                  <div className="text-slate-500 font-black text-[10px] mt-0.5">متاح للإرجاع: {remaining}</div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  value={value}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = (e.target as any).value;
                    setQtyByOrderItemId((prev) => ({ ...prev, [id]: next }));
                  }}
                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-slate-900 font-black text-xs text-center outline-none disabled:opacity-50"
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={createReturn}
          disabled={!canCreate}
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-800 transition-all"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          إنشاء المرتجع
        </button>
      </div>
    </div>
  );
};

export default OrderReturnsPanel;
