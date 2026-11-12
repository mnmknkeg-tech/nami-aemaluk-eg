'use client';

/**
 * دفتر الأستاذ — حركة أي حساب من القيود المرحّلة الفعلية.
 * مش نظام بيانات منفصل: كل صف هنا سطر من قيد مرحَّل، والرصيد الجاري
 * يُحسب حسب طبيعة الحساب (مدين/دائن).
 */
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, RefreshCw, Download, Info } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  INV_PAGE_FONT,
  InvTableCard,
  InvRow,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  is_group?: boolean;
  opening_balance: number;
  debit_balance: number;
  credit_balance: number;
};

type JournalLine = {
  account_id: string;
  account_name?: string;
  account_code?: string;
  debit: number;
  credit: number;
  description?: string;
};

type JournalEntry = {
  id: string;
  number: string;
  entry_date: string;
  description: string;
  reference?: string;
  status: string;
  lines: JournalLine[];
};

type LedgerRow = {
  entryId: string;
  date: string;
  number: string;
  description: string;
  debit: number;
  credit: number;
  running: number;
};

/** الحسابات اللي طبيعتها دائن — الرصيد يتزايد بالدائن وينقص بالمدين */
const CREDIT_NATURED = new Set(['liability', 'equity', 'revenue']);

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function LedgerContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      const [accRes, jeRes] = await Promise.all([
        apiRequest(`/accounting/accounts/shop/${sid}`),
        apiRequest(`/accounting/journal/shop/${sid}?status=posted`).catch(() => ({ data: [] })),
      ]);
      const accData: Account[] = Array.isArray(accRes) ? accRes : accRes?.data || [];
      const jeData: JournalEntry[] = Array.isArray(jeRes) ? jeRes : jeRes?.data || [];
      setAccounts(accData);
      setEntries(jeData);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAccount = accounts.find((a) => a.id === accountId) || null;

  const rows = useMemo<LedgerRow[]>(() => {
    if (!selectedAccount) return [];
    const creditNatured = CREDIT_NATURED.has(selectedAccount.type);
    const all: LedgerRow[] = [];
    for (const e of entries) {
      for (const l of e.lines || []) {
        if (l.account_id !== selectedAccount.id) continue;
        const debit = Number(l.debit || 0);
        const credit = Number(l.credit || 0);
        all.push({
          entryId: e.id,
          date: e.entry_date || '',
          number: e.number || '—',
          description: l.description || e.description || '',
          debit,
          credit,
          running: 0,
        });
      }
    }
    all.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    // الرصيد الافتتاحي: افتتاحي الحساب + صافي الحركة قبل بداية الفترة
    const from = fromDate || '';
    const to = toDate || '';
    let opening = Number(selectedAccount.opening_balance || 0);
    const inPeriod: LedgerRow[] = [];
    for (const r of all) {
      const d = String(r.date).split('T')[0];
      if (from && d < from) {
        opening += creditNatured ? r.credit - r.debit : r.debit - r.credit;
      } else if (!to || d <= to) {
        inPeriod.push(r);
      }
    }
    let running = opening;
    for (const r of inPeriod) {
      running += creditNatured ? r.credit - r.debit : r.debit - r.credit;
      r.running = running;
    }
    return inPeriod;
  }, [selectedAccount, entries, fromDate, toDate]);

  const totals = useMemo(
    () => ({
      debit: rows.reduce((s, r) => s + r.debit, 0),
      credit: rows.reduce((s, r) => s + r.credit, 0),
    }),
    [rows]
  );
  const closing =
    rows.length > 0
      ? rows[rows.length - 1].running
      : selectedAccount
        ? Number(selectedAccount.opening_balance || 0)
        : 0;

  const openingBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    const creditNatured = CREDIT_NATURED.has(selectedAccount.type);
    let opening = Number(selectedAccount.opening_balance || 0);
    if (!fromDate) return opening;
    for (const e of entries) {
      for (const l of e.lines || []) {
        if (l.account_id !== selectedAccount.id) continue;
        const d = String(e.entry_date || '').split('T')[0];
        if (d && d < fromDate) {
          opening += creditNatured
            ? Number(l.credit || 0) - Number(l.debit || 0)
            : Number(l.debit || 0) - Number(l.credit || 0);
        }
      }
    }
    return opening;
  }, [selectedAccount, entries, fromDate]);

  const exportCSV = useCallback(() => {
    if (!selectedAccount) return;
    const headers = ['Date', 'Entry #', 'Description', 'Debit', 'Credit', 'Balance'];
    const body = rows.map((r) => [
      r.date,
      r.number,
      (r.description || '').replace(/[,\n]/g, ' '),
      r.debit,
      r.credit,
      r.running.toFixed(2),
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: `ledger-${selectedAccount.code}.csv`, headers, rows: [...body] },
        'csv'
      );
      downloadBlob(blob, `ledger-${selectedAccount.code}.csv`);
    });
  }, [rows, selectedAccount]);

  const firstDayOfYear = () => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  };

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">دفتر الأستاذ</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              حركة أي حساب من القيود المرحّلة الفعلية — مدين ودائن ورصيد جاري
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
            {error}
            <button onClick={() => setError('')} className="p-1 rounded hover:bg-red-100">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        {/* أدوات العرض */}
        <div className="bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-2.5">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-700 bg-white focus:outline-none flex-1 min-w-[240px]"
          >
            <option value="">— اختر الحساب —</option>
            {accounts
              .filter((a) => !a.is_group)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="من تاريخ"
            className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="إلى تاريخ"
            className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
          />
          {!fromDate && (
            <InvToolButton onClick={() => setFromDate(firstDayOfYear())}>
              من بداية السنة
            </InvToolButton>
          )}
          <InvToolButton onClick={() => load()}>
            <RefreshCw size={14} />
            تحديث
          </InvToolButton>
        </div>

        {!loading && selectedAccount && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">الرصيد الافتتاحي</div>
              <div className="text-lg font-black text-slate-900">ج.م {fmt(openingBalance)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">إجمالي المدين</div>
              <div className="text-lg font-black text-emerald-600">ج.م {fmt(totals.debit)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">إجمالي الدائن</div>
              <div className="text-lg font-black text-rose-600">ج.م {fmt(totals.credit)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">الرصيد الختامي</div>
              <div
                className={`text-lg font-black ${closing < 0 ? 'text-rose-600' : 'text-slate-900'}`}
              >
                ج.م {fmt(closing)}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <InvLoading />
          ) : !selectedAccount ? (
            <InvEmpty icon={BookOpen} title="اختر حسابًا من القائمة لعرض كشف حركته الكامل" />
          ) : rows.length === 0 ? (
            <InvEmpty
              icon={BookOpen}
              title="لا توجد حركات مرحّلة على هذا الحساب في الفترة المحددة"
            />
          ) : (
            <>
              <InvTableCard
                columns={[
                  { label: 'التاريخ', className: 'col-span-2' },
                  { label: 'رقم القيد', className: 'col-span-2' },
                  { label: 'البيان', className: 'col-span-3' },
                  { label: 'مدين', className: 'col-span-1' },
                  { label: 'دائن', className: 'col-span-1' },
                  { label: 'الرصيد الجاري', className: 'col-span-3' },
                ]}
              >
                {rows.map((r, i) => (
                  <InvRow key={`${r.entryId}-${i}`}>
                    <div className="col-span-2 text-slate-600 text-xs sm:text-sm">
                      {r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '—'}
                    </div>
                    <div
                      className="col-span-2 font-bold text-slate-700 text-xs font-mono"
                      dir="ltr"
                    >
                      {r.number}
                    </div>
                    <div className="col-span-3 text-slate-600 text-xs sm:text-sm truncate">
                      {r.description || '—'}
                    </div>
                    <div className="col-span-1 font-bold text-emerald-600 text-xs sm:text-sm">
                      {r.debit > 0 ? fmt(r.debit) : '—'}
                    </div>
                    <div className="col-span-1 font-bold text-rose-600 text-xs sm:text-sm">
                      {r.credit > 0 ? fmt(r.credit) : '—'}
                    </div>
                    <div className="col-span-3 font-bold text-slate-900 text-xs sm:text-sm">
                      ج.م {fmt(r.running)}
                    </div>
                  </InvRow>
                ))}
              </InvTableCard>

              <div className="mt-4">
                <InvToolbar hint={`${rows.length} حركة في الفترة`}>
                  <InvToolButton onClick={exportCSV}>
                    <Download size={14} />
                    تصدير CSV
                  </InvToolButton>
                </InvToolbar>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}
