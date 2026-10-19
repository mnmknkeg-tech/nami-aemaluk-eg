'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, FileBarChart, RefreshCw, TrendingUp, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type StatementLine = { code: string; name: string; type: string; amount: number };
type IncomeStatement = {
  shop_id: string; from_date: string; to_date: string;
  revenue: StatementLine[]; expenses: StatementLine[];
  total_revenue: number; total_expenses: number; net_profit: number;
};
type BalanceSheet = {
  shop_id: string; as_of: string;
  assets: StatementLine[]; liabilities: StatementLine[]; equity: StatementLine[];
  net_profit: number; total_assets: number; total_liabilities: number; total_equity: number;
  is_balanced: boolean;
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

type ReportTab = 'income' | 'balance' | 'revenue' | 'cashflow' | 'equity';

function FinancialReportsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ReportTab>((searchParams?.get('tab') as ReportTab) || 'income');
  const [income, setIncome] = useState<IncomeStatement | null>(null);
  const [balance, setBalance] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async (f = from, t = to) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const params = new URLSearchParams();
      if (f) params.set('from', f);
      if (t) params.set('to', t);
      const [incRes, balRes] = await Promise.all([
        apiRequest(`/accounting/reports/income-statement/shop/${sid}?${params.toString()}`),
        apiRequest(`/accounting/reports/balance-sheet/shop/${sid}?asOf=${encodeURIComponent(t)}`),
      ]);
      setIncome(incRes?.data || incRes || null);
      setBalance(balRes?.data || balRes || null);
    } catch { setIncome(null); setBalance(null); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const LineRow = ({ l, color }: { l: StatementLine; color?: string }) => (
    <tr className="border-b border-slate-50">
      <td className="px-3 py-2 font-mono text-xs text-slate-400 font-bold">{l.code}</td>
      <td className="px-3 py-2 font-bold text-slate-700 text-sm">{l.name}</td>
      <td className={`px-3 py-2 text-left font-mono tabular-nums font-bold text-sm ${color || 'text-slate-800'}`}>{fmt(l.amount)}</td>
    </tr>
  );

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
            <FileBarChart size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">القوائم المالية</h1>
            <p className="text-sm text-slate-500 font-bold">تتولد تلقائيًا من القيود المرحَّلة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
          <button onClick={() => load(from, to)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('income')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm ${tab === 'income' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <TrendingUp size={16} /> قائمة الدخل
        </button>
        <button onClick={() => setTab('balance')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm ${tab === 'balance' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <Landmark size={16} /> الميزانية العمومية
        </button>
        <button onClick={() => setTab('revenue')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm ${tab === 'revenue' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <TrendingUp size={16} /> الإيرادات والنمو
        </button>
        <button onClick={() => setTab('cashflow')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm ${tab === 'cashflow' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <TrendingUp size={16} /> التدفقات النقدية
        </button>
        <button onClick={() => setTab('equity')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm ${tab === 'equity' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          <Landmark size={16} /> حقوق الملكية
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-slate-200"><Loader2 size={28} className="animate-spin text-amber-500" /></div>
      ) : tab === 'income' && income ? (
        <IncomeView income={income} LineRow={LineRow} />
      ) : tab === 'balance' && balance ? (
        <BalanceView balance={balance} LineRow={LineRow} />
      ) : tab === 'revenue' ? (
        <RevenueView />
      ) : tab === 'cashflow' ? (
        <CashflowView from={from} to={to} />
      ) : tab === 'equity' ? (
        <EquityView from={from} to={to} />
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">لا بيانات — سجّل ورحّل قيودًا أولًا</div>
      )}
    </div>
  );
}

function IncomeView({ income, LineRow }: { income: IncomeStatement; LineRow: React.ComponentType<{ l: StatementLine; color?: string }> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 font-black text-emerald-800 text-sm">الإيرادات ({income.from_date} → {income.to_date})</div>
        <table className="w-full">
          <tbody>
            {income.revenue?.length ? income.revenue.map(l => <LineRow key={l.code} l={l} color="text-emerald-700" />) : (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400 font-bold text-sm">لا إيرادات في الفترة</td></tr>
            )}
            <tr className="bg-emerald-50 font-black">
              <td className="px-3 py-2.5" colSpan={2}>إجمالي الإيرادات</td>
              <td className="px-3 py-2.5 text-left font-mono tabular-nums text-emerald-800">{fmt(income.total_revenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 font-black text-rose-800 text-sm">المصروفات</div>
        <table className="w-full">
          <tbody>
            {income.expenses?.length ? income.expenses.map(l => <LineRow key={l.code} l={l} color="text-rose-700" />) : (
              <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400 font-bold text-sm">لا مصروفات في الفترة</td></tr>
            )}
            <tr className="bg-rose-50 font-black">
              <td className="px-3 py-2.5" colSpan={2}>إجمالي المصروفات</td>
              <td className="px-3 py-2.5 text-left font-mono tabular-nums text-rose-800">{fmt(income.total_expenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={`lg:col-span-2 rounded-2xl p-5 flex items-center justify-between border ${income.net_profit >= 0 ? 'bg-emerald-600 border-emerald-700' : 'bg-rose-600 border-rose-700'} text-white`}>
        <span className="font-black text-lg">{income.net_profit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}</span>
        <span className="font-mono font-black text-2xl tabular-nums" dir="ltr">{fmt(Math.abs(income.net_profit))} EGP</span>
      </div>
    </div>
  );
}

function BalanceView({ balance, LineRow }: { balance: BalanceSheet; LineRow: React.ComponentType<{ l: StatementLine; color?: string }> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 font-black text-blue-800 text-sm">الأصول (حتى {balance.as_of})</div>
          <table className="w-full">
            <tbody>
              {balance.assets?.length ? balance.assets.map(l => <LineRow key={l.code} l={l} />) : (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400 font-bold text-sm">لا أصول</td></tr>
              )}
              <tr className="bg-blue-50 font-black">
                <td className="px-3 py-2.5" colSpan={2}>إجمالي الأصول</td>
                <td className="px-3 py-2.5 text-left font-mono tabular-nums text-blue-800">{fmt(balance.total_assets)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 font-black text-amber-800 text-sm">الالتزامات</div>
          <table className="w-full">
            <tbody>
              {balance.liabilities?.length ? balance.liabilities.map(l => <LineRow key={l.code} l={l} />) : (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400 font-bold text-sm">لا التزامات</td></tr>
              )}
              <tr className="bg-amber-50 font-black">
                <td className="px-3 py-2.5" colSpan={2}>إجمالي الالتزامات</td>
                <td className="px-3 py-2.5 text-left font-mono tabular-nums text-amber-800">{fmt(balance.total_liabilities)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 font-black text-purple-800 text-sm">حقوق الملكية</div>
          <table className="w-full">
            <tbody>
              {balance.equity?.length ? balance.equity.map(l => <LineRow key={l.code} l={l} />) : null}
              <tr className="border-b border-slate-50">
                <td className="px-3 py-2 font-mono text-xs text-slate-400 font-bold">—</td>
                <td className="px-3 py-2 font-bold text-slate-700 text-sm">صافي ربح الفترة (متراكم)</td>
                <td className={`px-3 py-2 text-left font-mono tabular-nums font-bold text-sm ${balance.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(balance.net_profit)}</td>
              </tr>
              <tr className="bg-purple-50 font-black">
                <td className="px-3 py-2.5" colSpan={2}>إجمالي حقوق الملكية</td>
                <td className="px-3 py-2.5 text-left font-mono tabular-nums text-purple-800">{fmt(balance.total_equity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className={`rounded-xl p-4 flex items-center gap-3 border ${balance.is_balanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
        <Landmark size={18} className={balance.is_balanced ? 'text-emerald-500' : 'text-rose-500'} />
        <span className={`font-black text-sm ${balance.is_balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
          {balance.is_balanced
            ? 'الميزانية متوازنة: الأصول = الالتزامات + حقوق الملكية ✓'
            : 'الميزانية غير متوازنة — تأكد من ترحيل كل القيود'}
        </span>
        <span className="font-mono text-xs font-bold text-slate-500 mr-auto" dir="ltr">
          {fmt(balance.total_assets)} = {fmt(balance.total_liabilities + balance.total_equity)}
        </span>
      </div>
    </div>
  );
}

// ═══ تابة «الإيرادات والنمو» — محتوى صفحة الإيرادات السابقة مدموج هنا ═══
type RevPeriod = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all';

function revPeriodRange(p: RevPeriod): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (dt: Date) => dt.toISOString().split('T')[0];
  switch (p) {
    case 'this_month': return { from: d(new Date(y, m, 1)), to: d(new Date(y, m + 1, 0)) };
    case 'last_month': return { from: d(new Date(y, m - 1, 1)), to: d(new Date(y, m, 0)) };
    case 'this_year': return { from: d(new Date(y, 0, 1)), to: d(new Date(y, 11, 31)) };
    case 'last_year': return { from: d(new Date(y - 1, 0, 1)), to: d(new Date(y - 1, 11, 31)) };
    default: return { from: '', to: d(now) };
  }
}

const REV_PERIODS: { key: RevPeriod; label: string }[] = [
  { key: 'this_month', label: 'هذا الشهر' },
  { key: 'last_month', label: 'الشهر الماضي' },
  { key: 'this_year', label: 'هذه السنة' },
  { key: 'last_year', label: 'السنة الماضية' },
  { key: 'all', label: 'الكل' },
];

function RevenueView() {
  const [current, setCurrent] = useState<IncomeStatement | null>(null);
  const [previous, setPrevious] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<RevPeriod>('this_year');

  const load = useCallback(async (p: RevPeriod) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const cur = revPeriodRange(p);
      const q = (f: string, t: string) => { const ps = new URLSearchParams(); if (f) ps.set('from', f); if (t) ps.set('to', t); return ps.toString(); };
      let prev: { from: string; to: string } | null = null;
      if (cur.from && cur.to) {
        const [fy, fm, fd] = cur.from.split('-').map(Number);
        const [ty, tm, td] = cur.to.split('-').map(Number);
        const len = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000) + 1;
        const pe = new Date(Date.UTC(fy, fm - 1, fd - 1));
        const ps = new Date(pe.getTime() - (len - 1) * 86400000);
        prev = { from: ps.toISOString().split('T')[0], to: pe.toISOString().split('T')[0] };
      }
      const [curRes, prevRes] = await Promise.all([
        apiRequest(`/accounting/reports/income-statement/shop/${sid}?${q(cur.from, cur.to)}`),
        prev ? apiRequest(`/accounting/reports/income-statement/shop/${sid}?${q(prev.from, prev.to)}`).catch(() => null) : Promise.resolve(null),
      ]);
      setCurrent(curRes?.data || curRes || null);
      setPrevious(prevRes ? (prevRes?.data || prevRes) : null);
    } catch { setCurrent(null); setPrevious(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const revenueLines = current?.revenue || [];
  const totalRevenue = revenueLines.reduce((s, l) => s + Number(l.amount || 0), 0);
  const prevRevenue = (previous?.revenue || []).reduce((s, l) => s + Number(l.amount || 0), 0);
  const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const maxLine = Math.max(1, ...revenueLines.map((l) => Math.abs(Number(l.amount || 0))));

  const exportRevenueCSV = () => {
    const rows = [['Code', 'Account', 'Amount'], ...revenueLines.map((l) => [l.code, l.name, l.amount])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'revenue.csv';
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* اختيار الفترة + تصدير */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {REV_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-black transition-colors ${period === p.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={exportRevenueCSV} className="flex items-center gap-1.5 px-4 h-10 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50">
          تصدير CSV
        </button>
      </div>

      {/* كروت المؤشرات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">إجمالي الإيرادات</p>
          <p className="text-xl font-black text-slate-900" dir="ltr">{fmt(totalRevenue)} <span className="text-xs">EGP</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">الفترة السابقة</p>
          <p className="text-xl font-black text-slate-600" dir="ltr">{fmt(prevRevenue)} <span className="text-xs">EGP</span></p>
        </div>
        <div className={`rounded-2xl border p-4 ${growth >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className="text-xs font-bold text-slate-400 mb-1">نسبة النمو</p>
          <p className={`flex items-center gap-1.5 text-xl font-black ${growth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
            {growth >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            {Math.abs(growth).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* بنود الإيرادات مع أعمدة نسبية */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 font-black text-emerald-800 text-sm">
          بنود الإيرادات {current ? `(${current.from_date} → ${current.to_date})` : ''}
        </div>
        {revenueLines.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-sm">لا إيرادات في الفترة — سجّل وارحّل قيودًا أولًا</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {revenueLines.map((l) => {
              const amt = Number(l.amount || 0);
              const pct = (Math.abs(amt) / maxLine) * 100;
              return (
                <div key={l.code} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 text-sm">
                      <span className="font-mono text-[11px] text-slate-400 mr-1.5">{l.code}</span>
                      {l.name}
                    </span>
                    <span className="font-mono tabular-nums font-black text-emerald-700 text-sm" dir="ltr">{fmt(amt)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ تابة «التدفقات النقدية» — النقد الداخل والخارج في الفترة ═══
function CashflowView({ from, to }: { from: string; to: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const res = await apiRequest(`/finance/reports/cashflow/shop/${sid}?${q.toString()}`).catch(() => null);
      setReport(res?.data || res || null);
    } catch { setReport(null); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-slate-200"><Loader2 size={28} className="animate-spin text-amber-500" /></div>;
  }

  // خرائط دفاعية — شكل الرد ممكن يكون totals أو series
  const inflow = Number(report?.total_inflow ?? report?.inflow ?? report?.cash_in ?? 0);
  const outflow = Number(report?.total_outflow ?? report?.outflow ?? report?.cash_out ?? 0);
  const net = Number(report?.net_cashflow ?? report?.net ?? (inflow - outflow));
  const hasData = Boolean(report) && (inflow > 0 || outflow > 0 || net !== 0);
  const operating = Number(report?.operating ?? 0);
  const investing = Number(report?.investing ?? 0);
  const financing = Number(report?.financing ?? 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400 font-bold text-sm">لا حركات نقدية في الفترة ({from || 'البداية'} → {to || 'اليوم'})</p>
        <p className="text-slate-400 text-xs font-bold mt-2">التدفقات تتولد من التحصيلات والمدفوعات والمصروفات المرحّلة</p>
      </div>
    );
  }

  const maxVal = Math.max(inflow, outflow, 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">النقد الداخل</p>
          <p className="text-xl font-black text-emerald-700" dir="ltr">{fmt(inflow)} <span className="text-xs">EGP</span></p>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(inflow / maxVal) * 100}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">النقد الخارج</p>
          <p className="text-xl font-black text-rose-700" dir="ltr">{fmt(outflow)} <span className="text-xs">EGP</span></p>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${(outflow / maxVal) * 100}%` }} />
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${net >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className="text-xs font-bold text-slate-400 mb-1">صافي التغير في النقدية</p>
          <p className={`text-xl font-black ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">{fmt(net)} <span className="text-xs">EGP</span></p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-black text-slate-700 text-sm">تفصيل الأنشطة</div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-slate-50">
              <td className="px-4 py-3 font-bold text-slate-700 text-sm">التدفقات من التشغيل</td>
              <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-sm text-slate-800">{fmt(operating)}</td>
            </tr>
            <tr className="border-b border-slate-50">
              <td className="px-4 py-3 font-bold text-slate-700 text-sm">التدفقات من الاستثمار</td>
              <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-sm text-slate-800">{fmt(investing)}</td>
            </tr>
            <tr className="border-b border-slate-50">
              <td className="px-4 py-3 font-bold text-slate-700 text-sm">التدفقات من التمويل</td>
              <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-sm text-slate-800">{fmt(financing)}</td>
            </tr>
            {(operating === 0 && investing === 0 && financing === 0) && (
              <tr>
                <td colSpan={2} className="px-4 py-3 text-center text-slate-400 text-xs font-bold">
                  تفصيل الأنشطة يكتمل عند تسجيل حركات أصول وتمويل — حاليًا التدفقات تشغيلية بالكامل
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══ تابة «حقوق الملكية» — التغير في حقوق الملكية خلال الفترة ═══
function EquityView({ from, to }: { from: string; to: string }) {
  const [balance, setBalance] = useState<BalanceSheet | null>(null);
  const [income, setIncome] = useState<IncomeStatement | null>(null);
  const [prevIncome, setPrevIncome] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      // الفترة السابقة المماثلة
      let prevQ = '';
      if (from && to) {
        const [fy, fm, fd] = from.split('-').map(Number);
        const [ty, tm, td] = to.split('-').map(Number);
        const len = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000) + 1;
        const pe = new Date(Date.UTC(fy, fm - 1, fd - 1));
        const ps = new Date(pe.getTime() - (len - 1) * 86400000);
        prevQ = `from=${ps.toISOString().split('T')[0]}&to=${pe.toISOString().split('T')[0]}`;
      }
      const [balRes, incRes, prevRes] = await Promise.all([
        apiRequest(`/accounting/reports/balance-sheet/shop/${sid}?asOf=${encodeURIComponent(to || new Date().toISOString().slice(0, 10))}`),
        apiRequest(`/accounting/reports/income-statement/shop/${sid}?${q.toString()}`),
        prevQ ? apiRequest(`/accounting/reports/income-statement/shop/${sid}?${prevQ}`).catch(() => null) : Promise.resolve(null),
      ]);
      setBalance(balRes?.data || balRes || null);
      setIncome(incRes?.data || incRes || null);
      setPrevIncome(prevRes ? (prevRes?.data || prevRes) : null);
    } catch { setBalance(null); setIncome(null); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-slate-200"><Loader2 size={28} className="animate-spin text-amber-500" /></div>;
  }

  const capital = (balance?.equity || []).filter(l => /رأس المال|capital/i.test(l.name)).reduce((s, l) => s + Number(l.amount || 0), 0);
  const retained = (balance?.equity || []).filter(l => !/رأس المال|capital/i.test(l.name)).reduce((s, l) => s + Number(l.amount || 0), 0);
  const periodProfit = income?.net_profit ?? 0;
  const prevProfit = prevIncome?.net_profit ?? 0;
  const profitChange = prevProfit !== 0 ? ((periodProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0;
  const totalEquity = balance?.total_equity ?? (capital + retained + periodProfit);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">رأس المال</p>
          <p className="text-lg font-black text-slate-900" dir="ltr">{fmt(capital)} <span className="text-xs">EGP</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">أرباح/خسائر متراكمة</p>
          <p className={`text-lg font-black ${retained >= 0 ? 'text-slate-900' : 'text-rose-700'}`} dir="ltr">{fmt(retained)} <span className="text-xs">EGP</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">صافي ربح الفترة</p>
          <p className={`text-lg font-black ${periodProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">{fmt(periodProfit)} <span className="text-xs">EGP</span></p>
          {prevProfit !== 0 && (
            <p className={`text-[11px] font-bold mt-1 ${profitChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profitChange >= 0 ? '↑' : '↓'} {Math.abs(profitChange).toFixed(1)}% عن الفترة السابقة
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-400 mb-1">المسحوبات</p>
          <p className="text-lg font-black text-slate-900" dir="ltr">{fmt(0)} <span className="text-xs">EGP</span></p>
          <p className="text-[11px] font-bold text-slate-400 mt-1">تظهر عند تسجيل قيود المسحوبات</p>
        </div>
      </div>
      <div className={`rounded-2xl p-5 flex items-center justify-between border ${totalEquity >= 0 ? 'bg-purple-600 border-purple-700' : 'bg-rose-600 border-rose-700'} text-white`}>
        <span className="font-black text-lg">إجمالي حقوق الملكية (حتى {to || 'اليوم'})</span>
        <span className="font-mono font-black text-2xl tabular-nums" dir="ltr">{fmt(totalEquity)} EGP</span>
      </div>
    </div>
  );
}

export default function FinancialReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <FinancialReportsContent />
    </Suspense>
  );
}
