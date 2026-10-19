'use client';

/**
 * تبويب حركة المخزون — يستخدم داخل صفحة المخزون (كل الحركات)
 * وداخل صفحة المخازن (حركات المخازن: مفلتر على التحويلات افتراضيًا).
 * يجمع الحركات المتاحة فعليًا: تحويلات المخازن + أوامر الشراء المستلمة + تعديلات المنتجات.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Download,
  RefreshCw,
  ArrowUpDown,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Truck,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvStatusPill,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type MovementType = 'transfer' | 'purchase' | 'adjustment';

type Movement = {
  id: string;
  ref: string;
  productName: string;
  type: MovementType;
  direction: 'in' | 'out' | 'none';
  qty: number;
  date: string;
  from?: string;
  to?: string;
};

const TYPE_LABEL: Record<MovementType, string> = {
  transfer: 'تحويل',
  purchase: 'شراء',
  adjustment: 'تعديل',
};

export default function MovementsView({ initialType }: { initialType?: MovementType }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterType, setFilterType] = useState(initialType || 'all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [prodRes, trRes, poRes] = await Promise.all([
        apiRequest(`/products/manage/by-shop/${sid}?limit=500`).catch(() => []),
        apiRequest(`/transfers/shop/${sid}`).catch(() => ({ data: [] })),
        apiRequest(`/purchase-orders/shop/${sid}`).catch(() => ({ data: [] })),
      ]);
      const prods = Array.isArray(prodRes) ? prodRes : prodRes?.products || prodRes?.data || [];
      const transfers = Array.isArray(trRes) ? trRes : trRes?.data || [];
      const orders = Array.isArray(poRes) ? poRes : poRes?.data || [];

      const entries: Movement[] = [];

      transfers.forEach((t: any) => {
        const status = String(t.status || '');
        if (status === 'cancelled') return;
        entries.push({
          id: `tr-${t.id}`,
          ref: t.transferNumber || t.transfer_number || `TR-${String(t.id).slice(0, 6)}`,
          productName: 'شحنة نقل مخزون',
          type: 'transfer',
          direction: status === 'received' ? 'in' : 'out',
          qty: Number(t.items || t.itemCount || 0),
          date: t.date || t.createdAt || new Date().toISOString(),
          from: t.fromWarehouse || t.from_warehouse,
          to: t.toWarehouse || t.to_warehouse,
        });
      });

      orders.forEach((o: any) => {
        const status = String(o.status || '');
        if (status !== 'received' && status !== 'partial') return;
        entries.push({
          id: `po-${o.id}`,
          ref: o.orderNumber || o.order_number || `PO-${String(o.id).slice(0, 6)}`,
          productName: o.supplierName || o.supplier_name || 'استلام مشتريات',
          type: 'purchase',
          direction: 'in',
          qty: Number(o.itemCount || o.items_count || 0),
          date:
            o.receivedDate ||
            o.received_date ||
            o.orderDate ||
            o.createdAt ||
            new Date().toISOString(),
          to: 'المخزون',
        });
      });

      prods
        .filter((p: any) => p.updatedAt || p.updated_at)
        .forEach((p: any) => {
          entries.push({
            id: `adj-${p.id}`,
            ref: p.sku || String(p.id).slice(0, 8),
            productName: p.name || p.title || '---',
            type: 'adjustment',
            direction: 'none',
            qty: Number(p.stock ?? p.quantity ?? 0),
            date: p.updatedAt || p.updated_at,
          });
        });

      setMovements(entries);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = movements.filter(
      (m) =>
        m.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.productName.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (filterType !== 'all') {
      result = result.filter((m) => m.type === filterType);
    }
    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'date' ? a.date : sortBy === 'qty' ? a.qty : a.ref;
      const bVal = sortBy === 'date' ? b.date : sortBy === 'qty' ? b.qty : b.ref;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return result;
  }, [movements, debouncedSearch, filterType, sortBy, sortOrder]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const exportCSV = useCallback(() => {
    const headers = ['Ref', 'Product', 'Type', 'Direction', 'Qty', 'From', 'To', 'Date'];
    const rows = filtered.map((m) => [
      m.ref,
      m.productName,
      TYPE_LABEL[m.type],
      m.direction,
      m.qty,
      m.from || '-',
      m.to || '-',
      m.date,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'stock-movements.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'stock-movements.csv');
    });
  }, [filtered]);

  const count = (t: MovementType) => movements.filter((m) => m.type === t).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${movements.length} حركة مسجلة`}>
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'كل الحركات', count: movements.length },
            { id: 'purchase', label: 'شراء / دخول', count: count('purchase') },
            { id: 'transfer', label: 'تحويل', count: count('transfer') },
            { id: 'adjustment', label: 'تعديل', count: count('adjustment') },
          ]}
          activeTab={filterType}
          onTabChange={(id) => {
            setFilterType(id);
            setCurrentPage(1);
          }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالمرجع أو الصنف…"
          filters={
            <>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
              >
                <option value="date">التاريخ</option>
                <option value="qty">الكمية</option>
                <option value="ref">المرجع</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
              >
                <ArrowUpDown size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </button>
            </>
          }
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={ArrowLeftRight} title="لا توجد حركات مخزون حالياً" />
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'المرجع', className: 'col-span-2' },
                { label: 'البيان', className: 'col-span-3' },
                { label: 'النوع', className: 'col-span-2' },
                { label: 'الكمية', className: 'col-span-2' },
                { label: 'الجهة', className: 'col-span-2' },
                { label: 'التاريخ', className: 'col-span-1' },
              ]}
            >
              {paginated.map((m) => (
                <InvRow key={m.id}>
                  <div className="col-span-2 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {m.ref}
                    </div>
                  </div>
                  <div className="col-span-3 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {m.productName}
                  </div>
                  <div className="col-span-2">
                    <InvStatusPill
                      tone={
                        m.type === 'purchase'
                          ? 'emerald'
                          : m.type === 'transfer'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {m.type === 'purchase' ? (
                        <TrendingUp size={12} />
                      ) : m.type === 'transfer' ? (
                        <Truck size={12} />
                      ) : (
                        <Minus size={12} />
                      )}
                      {TYPE_LABEL[m.type]}
                    </InvStatusPill>
                  </div>
                  <div className="col-span-2 pr-4">
                    <div
                      className={`font-bold text-xs sm:text-sm flex items-center gap-1 ${m.direction === 'in' ? 'text-emerald-600' : m.direction === 'out' ? 'text-rose-600' : 'text-slate-600'}`}
                    >
                      {m.direction === 'in' ? (
                        <TrendingUp size={13} />
                      ) : m.direction === 'out' ? (
                        <TrendingDown size={13} />
                      ) : (
                        <Package size={13} />
                      )}
                      {m.direction === 'in' ? '+' : m.direction === 'out' ? '−' : ''}
                      {m.qty.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm truncate">
                    {m.from || m.to ? `${m.from || '—'} → ${m.to || '—'}` : '—'}
                  </div>
                  <div className="col-span-1 pr-4 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                    {new Date(m.date).toLocaleDateString('ar-EG')}
                  </div>
                </InvRow>
              ))}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={itemsPerPage}
              onPage={setCurrentPage}
              label="حركة"
            />
          </>
        )}
      </div>
    </div>
  );
}
