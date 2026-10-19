'use client';

/**
 * تاب «المدفوعات» — المعاملات والتحصيلات وطرق الدفع.
 * كل الأرقام من بيانات حقيقية فقط:
 * - المعاملات ← /finance/transactions/shop/:sid (تُفلتر بالفترة محليًا)
 * - المحافظ ← /finance/wallets/shop/:sid (الأرصدة الحالية)
 * - طرق الدفع ← /orders/me?from&to (توزيع قيمة الطلبات على paymentMethod)
 * لا أرقام وهمية — أي مصدر فارغ يظهر بحالة فراغ عربية.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Banknote, Wallet, ListOrdered } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  type PeriodKey,
  periodRange,
  prevPeriodRange,
  periodLabel,
  inPeriod,
  buildBuckets,
  fillBuckets,
  fmt,
  fmt2,
  egp,
  KpiCard,
  ChartCard,
  SectionSkeleton,
  EmptyCard,
  ChartEmpty,
  DualAreaChart,
  Donut,
  downloadCSV,
} from './financeShared';

export type PaymentsSectionProps = {
  period: PeriodKey;
  /** يتغير عند الضغط على «تحديث» — إعادة جلب مع تغيّره */
  refreshKey?: number;
  /** تسجيل زر تصدير CSV في شريط أدوات الصفحة */
  registerExport?: (fn: (() => void) | null) => void;
  /** البحث من شريط الصفحة — يعمل على جدول المعاملات */
  searchQuery?: string;
};

type TxRow = {
  id?: string;
  type?: string;
  amount?: number;
  date?: string;
  description?: string;
  reference?: string;
  wallet_id?: string;
  walletId?: string;
};
type WalletRow = { id?: string; name?: string; type?: string; balance?: number };
type OrderRow = {
  total?: number;
  total_amount?: number;
  grand_total?: number;
  paymentMethod?: string;
  payment_method?: string;
};

const txAmountOf = (t: any) => Number(t?.amount || 0);
const sumOf = (rows: any[], f: (x: any) => number) => rows.reduce((s, x) => s + f(x), 0);
const orderTotalOf = (o: any) => Number(o?.total || o?.total_amount || o?.grand_total || 0);

/** استخراج موحّد للاستجابات — نفس نمط صفحة التقارير */
const settledData = (r: PromiseSettledResult<any>): any =>
  r.status === 'fulfilled' ? (r.value?.data !== undefined ? r.value.data : r.value) : null;
const settledList = (r: PromiseSettledResult<any>): any[] => {
  const v = settledData(r);
  return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
};

/** تسمية عربية لطرق الدفع الشائعة — القيم غير المعروفة تظهر كما وردت من الـAPI */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  cod: 'عند الاستلام',
  card: 'بطاقة',
  wallet: 'محفظة إلكترونية',
  credit: 'آجل',
  bank: 'تحويل بنكي',
  bank_transfer: 'تحويل بنكي',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
};
const methodLabel = (m: string) => PAYMENT_METHOD_LABELS[m.trim().toLowerCase()] || m;

const fmtDay = (d: string) => {
  const date = new Date(d || '');
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-EG');
};

export default function PaymentsSection({
  period,
  refreshKey,
  registerExport,
  searchQuery,
}: PaymentsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [ordersCur, setOrdersCur] = useState<OrderRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shop = await apiRequest('/shops/me');
        const sid = shop?.id;
        if (!sid || cancelled) return;
        const cur = periodRange(period);
        const ordQ = `/orders/me?limit=200&from=${encodeURIComponent(`${cur.from}T00:00:00Z`)}&to=${encodeURIComponent(
          `${cur.to}T23:59:59Z`
        )}`;
        const [txRes, walletsRes, ordCurRes] = await Promise.allSettled([
          apiRequest(`/finance/transactions/shop/${sid}`).catch(() => null),
          apiRequest(`/finance/wallets/shop/${sid}`).catch(() => null),
          apiRequest(ordQ).catch(() => null),
        ]);
        if (cancelled) return;
        setTxs(settledList(txRes));
        setWallets(settledList(walletsRes));
        setOrdersCur(settledList(ordCurRes));
      } catch {
        if (!cancelled) {
          setTxs([]);
          setWallets([]);
          setOrdersCur([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, refreshKey]);

  /* ===== حسابات الفترة الحالية والسابقة ===== */
  const cur = useMemo(() => periodRange(period), [period]);
  const prev = useMemo(() => prevPeriodRange(period), [period]);

  const periodTxs = useMemo(() => txs.filter((t) => inPeriod(t?.date, cur)), [txs, cur]);
  const inTx = useMemo(() => periodTxs.filter((t) => t?.type === 'income'), [periodTxs]);
  const outTx = useMemo(() => periodTxs.filter((t) => t?.type === 'expense'), [periodTxs]);
  const collections = useMemo(() => sumOf(inTx, txAmountOf), [inTx]);
  const payouts = useMemo(() => sumOf(outTx, txAmountOf), [outTx]);

  const prevCollections = useMemo(
    () =>
      sumOf(
        txs.filter((t) => t?.type === 'income' && inPeriod(t?.date, prev)),
        txAmountOf
      ),
    [txs, prev]
  );
  const collectionsTrend =
    prevCollections > 0 ? ((collections - prevCollections) / prevCollections) * 100 : null;
  const prevCount = useMemo(() => txs.filter((t) => inPeriod(t?.date, prev)).length, [txs, prev]);
  const countTrend = prevCount > 0 ? ((periodTxs.length - prevCount) / prevCount) * 100 : null;

  const walletsBalance = useMemo(() => sumOf(wallets, (w) => Number(w?.balance || 0)), [wallets]);
  const walletNameOf = (t: any) => {
    const id = String(t?.wallet_id || t?.walletId || '');
    const w = wallets.find((x) => String(x?.id || '') === id);
    return String(w?.name || '');
  };

  /* ===== توزيع طرق الدفع — من حقول الطلبات الحقيقية ===== */
  const methodData = useMemo(() => {
    const m = new Map<string, number>();
    ordersCur.forEach((o) => {
      const pm = String(o?.paymentMethod || o?.payment_method || 'غير محدد');
      m.set(pm, (m.get(pm) || 0) + orderTotalOf(o));
    });
    return Array.from(m.entries())
      .map(([k, value]) => ({ name: methodLabel(k), value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [ordersCur]);
  const ordersValue = useMemo(() => methodData.reduce((s, d) => s + d.value, 0), [methodData]);

  /* ===== المعاملات عبر الزمن ===== */
  const flowData = useMemo(() => {
    const bs = buildBuckets(period, cur);
    fillBuckets(periodTxs, bs, period, 'income', (t) => String(t?.date || ''), txAmountOf);
    fillBuckets(periodTxs, bs, period, 'outcome', (t) => String(t?.date || ''), txAmountOf);
    return bs.map((b) => ({ label: b.label, a: Number(b.income || 0), b: Number(b.outcome || 0) }));
  }, [period, cur, periodTxs]);
  const hasFlowSeries = flowData.some((d) => d.a !== 0 || d.b !== 0);

  /* ===== جدول أحدث المعاملات + البحث ===== */
  const filteredTxs = useMemo(() => {
    const q = String(searchQuery || '')
      .trim()
      .toLowerCase();
    let rows = [...periodTxs].sort((a, b) =>
      String(b?.date || '').localeCompare(String(a?.date || ''))
    );
    if (q) {
      rows = rows.filter((t) => {
        const hay = [
          t?.description,
          t?.reference,
          walletNameOf(t),
          t?.type === 'income' ? 'وارد' : t?.type === 'expense' ? 'صادر' : String(t?.type || ''),
          String(Number(t?.amount || 0)),
          String(t?.date || ''),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodTxs, searchQuery, wallets]);
  const tableRows = filteredTxs.slice(0, 10);

  const hasAnyData = txs.length > 0 || wallets.length > 0 || ordersCur.length > 0;

  /* ===== تصدير CSV — المعاملات الظاهرة (بعد البحث) ===== */
  useEffect(() => {
    if (!registerExport) return;
    if (loading || !hasAnyData || filteredTxs.length === 0) {
      registerExport(null);
      return () => registerExport(null);
    }
    const fn = () => {
      const rows: (string | number)[][] = filteredTxs.map((t) => [
        String(t?.date || ''),
        String(t?.description || ''),
        walletNameOf(t) || '—',
        t?.type === 'income' ? 'وارد' : 'صادر',
        Number(t?.amount || 0),
      ]);
      downloadCSV(
        'payments-transactions.csv',
        ['التاريخ', 'الوصف', 'الطريقة', 'النوع', 'المبلغ (ج.م)'],
        rows
      );
    };
    registerExport(fn);
    return () => registerExport(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerExport, loading, hasAnyData, filteredTxs]);

  if (loading) return <SectionSkeleton />;

  if (!hasAnyData) {
    return (
      <EmptyCard
        title="لا توجد بيانات"
        hint="لا توجد معاملات أو محافظ مسجَّلة بعد — الحركات تظهر بعد أول عملية تحصيل أو صرف"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== كروت المؤشرات ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          icon={ArrowLeftRight}
          iconClass="text-slate-500"
          label="إجمالي المعاملات"
          value={`${fmt(periodTxs.length)}`}
          trendPct={countTrend ?? undefined}
          sub={`${inTx.length} وارد • ${outTx.length} صادر`}
        />
        <KpiCard
          icon={Banknote}
          iconClass="text-emerald-500"
          label="حجم التحصيلات"
          value={egp(collections)}
          valueClass="text-emerald-700"
          trendPct={collectionsTrend ?? undefined}
          sub={payouts > 0 ? `مدفوعات صادرة: ${egp(payouts)}` : undefined}
        />
        <KpiCard
          icon={Wallet}
          iconClass="text-cyan-500"
          label="رصيد المحافظ"
          value={egp(walletsBalance)}
          valueClass="text-cyan-700"
          sub={`${wallets.length} محفظة`}
        />
      </div>

      {/* ===== حركة المعاملات + طرق الدفع ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="المعاملات عبر الفترة" sub={periodLabel(period)}>
            {hasFlowSeries ? (
              <DualAreaChart
                data={flowData}
                aName="وارد"
                bName="صادر"
                aColor="#10B981"
                bColor="#F43F5E"
                gid="pay-flows"
              />
            ) : (
              <ChartEmpty hint="لا حركة معاملات في هذه الفترة" />
            )}
          </ChartCard>
        </div>
        <ChartCard title="توزيع طرق الدفع" sub={`ج.م ${fmt(ordersValue)}`}>
          {methodData.length === 0 ? (
            <ChartEmpty hint="طرق الدفع تظهر بعد تسجيل طلبات في هذه الفترة" />
          ) : (
            <Donut data={methodData} centerValue={fmt(ordersValue)} centerLabel="قيمة الطلبات" />
          )}
        </ChartCard>
      </div>

      {/* ===== أحدث المعاملات ===== */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
            <ListOrdered size={15} className="text-slate-400" /> أحدث المعاملات
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            {filteredTxs.length} من {periodTxs.length} معاملة
          </span>
        </div>
        {filteredTxs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 font-bold text-sm">لا نتائج مطابقة للبحث</p>
            <p className="text-slate-300 text-xs font-semibold mt-1">
              جرّب كلمة أخرى من الوصف أو اسم المحفظة أو المبلغ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-semibold text-slate-500">التاريخ</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">الوصف</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">الطريقة</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">الحالة</th>
                  <th className="p-4 text-xs font-semibold text-slate-500">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((t, i) => {
                  const income = t?.type === 'income';
                  return (
                    <tr
                      key={String(t?.id || i)}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="p-4 text-slate-600 text-sm whitespace-nowrap">
                        {fmtDay(String(t?.date || ''))}
                      </td>
                      <td className="p-4 text-slate-900 text-sm font-bold max-w-[220px] truncate">
                        {String(t?.description || '—')}
                      </td>
                      <td className="p-4 text-slate-600 text-sm">{walletNameOf(t) || '—'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                            income ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {income ? 'وارد' : 'صادر'}
                        </span>
                      </td>
                      <td
                        className={`p-4 text-sm font-black tabular-nums whitespace-nowrap ${
                          income ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                        dir="ltr"
                      >
                        {income ? '+' : '−'}
                        {fmt2(Number(t?.amount || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
