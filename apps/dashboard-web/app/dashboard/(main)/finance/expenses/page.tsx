'use client';

/**
 * صفحة المصروفات — كل مصروف = قيد محاسبي (مدين على المصروف، دائن على النقدية).
 * تبويبات زمنية (تصفية عميل): جميع المصروفات | هذا الشهر | الشهر الماضي | هذه السنة
 * مع إجراء "التأثير المحاسبي" لعرض أسطر قيد اليومية لكل مصروف.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Receipt, CheckCircle2, AlertTriangle, BookOpen, Info, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvToolButton,
  InvPagination,
} from '@/components/inventory/InventoryShell';

type Account = {
  id: string; code: string; name: string; type: string;
  parent_id: string | null; is_group: boolean; is_system: boolean;
  opening_balance: number; status: string;
  debit_balance: number; credit_balance: number;
};

type JLine = { account_id: string; account_code: string; account_name: string; description: string; debit: number; credit: number };
type Entry = {
  id: string; number: string; entry_date: string; description: string;
  reference: string; status: string; total_debit: number; lines: JLine[];
};

type ExpenseRow = {
  id: string; entryId: string; number: string; date: string; description: string;
  category: string; accountName: string; amount: number; payFrom: string; status: string;
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* حدود الفترات الزمنية للتصفية — تُحسب مرة عند تحميل الصفحة */
const NOW = new Date();
const CUR_YM = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;
const PREV_DATE = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
const PREV_YM = `${PREV_DATE.getFullYear()}-${String(PREV_DATE.getMonth() + 1).padStart(2, '0')}`;
const CUR_YEAR = String(NOW.getFullYear());

const EXPENSE_DATE_TABS = [
  { id: 'all', label: 'جميع المصروفات' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'last', label: 'الشهر الماضي' },
  { id: 'year', label: 'هذه السنة' },
];

export default function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [rawEntries, setRawEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateTab, setDateTab] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [modal, setModal] = useState(false);
  const [impactEntry, setImpactEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shopId, setShopId] = useState('');
  const [form, setForm] = useState({ expenseAccountId: '', payFromAccountId: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '', reference: '' });

  const expenseAccounts = useMemo(() => accounts.filter(a => a.type === 'expense' && !a.is_group && a.status === 'active'), [accounts]);
  const cashAccounts = useMemo(() => accounts.filter(a => a.type === 'asset' && !a.is_group && a.status === 'active'
    && /نقد|نقدية|صندوق|بنك|كاش|محفظة|محفظه|cash|bank|wallet/i.test(`${a.code} ${a.name}`)), [accounts]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const [accRes, jeRes] = await Promise.all([
        apiRequest(`/accounting/accounts/shop/${sid}`),
        apiRequest(`/accounting/journal/shop/${sid}?status=posted`),
      ]);
      const accData: Account[] = Array.isArray(accRes) ? accRes : (accRes?.data || []);
      const entries: Entry[] = Array.isArray(jeRes) ? jeRes : (jeRes?.data || []);
      setAccounts(accData);
      setRawEntries(entries);
      const expenseIds = new Set(accData.filter(a => a.type === 'expense').map(a => a.id));
      const out: ExpenseRow[] = [];
      for (const e of entries) {
        for (const l of e.lines || []) {
          if (expenseIds.has(l.account_id) && Number(l.debit) > 0) {
            const counter = (e.lines || []).find(x => x.account_id !== l.account_id);
            out.push({
              id: `${e.id}-${l.account_id}`, entryId: e.id, number: e.number, date: e.entry_date,
              description: l.description || e.description, category: l.account_name, accountName: l.account_name,
              amount: Number(l.debit), payFrom: counter ? `${counter.account_code} ${counter.account_name}` : '—', status: e.status,
            });
          }
        }
      }
      setRows(out.sort((a, b) => b.date.localeCompare(a.date)));
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* تصفية زمنية عميلة ثم بحث وبند المصروف */
  const dateFiltered = useMemo(() => rows.filter(r => {
    if (dateTab === 'month') return r.date.slice(0, 7) === CUR_YM;
    if (dateTab === 'last') return r.date.slice(0, 7) === PREV_YM;
    if (dateTab === 'year') return r.date.slice(0, 4) === CUR_YEAR;
    return true;
  }), [rows, dateTab]);

  const filtered = useMemo(() => dateFiltered
    .filter(r => `${r.description} ${r.category} ${r.number}`.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .filter(r => filterCategory === 'all' || r.category === filterCategory), [dateFiltered, debouncedSearch, filterCategory]);

  const dateTabs = useMemo(() => EXPENSE_DATE_TABS.map(t => ({
    ...t,
    count: t.id === 'all' ? rows.length : rows.filter(r => (
      t.id === 'month' ? r.date.slice(0, 7) === CUR_YM
        : t.id === 'last' ? r.date.slice(0, 7) === PREV_YM
          : r.date.slice(0, 4) === CUR_YEAR
    )).length,
  })), [rows]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  useEffect(() => setCurrentPage(1), [debouncedSearch, filterCategory, dateTab]);

  const totalExpenses = filtered.reduce((s, r) => s + r.amount, 0);
  const thisMonth = filtered.filter(r => r.date.startsWith(CUR_YM)).reduce((s, r) => s + r.amount, 0);

  const openImpact = (row: ExpenseRow) => {
    const entry = rawEntries.find(e => e.id === row.entryId) || null;
    setImpactEntry(entry);
  };

  const save = async () => {
    if (!form.expenseAccountId || !form.payFromAccountId || form.amount <= 0 || !form.description) {
      setError('أكمل البند، جهة الدفع، المبلغ، والبيان'); return;
    }
    if (form.expenseAccountId === form.payFromAccountId) { setError('اختر حسابين مختلفين'); return; }
    setSaving(true); setError('');
    try {
      const created = await apiRequest(`/accounting/journal/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({
          entry_date: form.date, description: form.description, reference: form.reference || 'EXPENSE',
          lines: [
            { account_id: form.expenseAccountId, debit: Number(form.amount), credit: 0, description: form.description },
            { account_id: form.payFromAccountId, debit: 0, credit: Number(form.amount), description: form.description },
          ],
        }),
      });
      const newId = created?.data?.id || created?.id;
      if (newId) await apiRequest(`/accounting/journal/${newId}/post`, { method: 'POST' });
      setModal(false);
      await load();
    } catch (e: any) { setError(e?.message || 'تعذر حفظ المصروف'); } finally { setSaving(false); }
  };

  return (
    <InventoryPage
      title="المصروفات"
      subtitle="كل مصروف = قيد محاسبي (مدين على المصروف، دائن على النقدية)"
      actions={
        <>
          <InvToolButton onClick={() => { window.location.href = '/dashboard/finance/journal'; }}>
            <BookOpen size={14} />
            دفتر اليومية
          </InvToolButton>
          <InvToolButton primary onClick={() => { setError(''); setModal(true); }}>
            <Plus size={14} />
            مصروف جديد
          </InvToolButton>
        </>
      }
      tabs={dateTabs}
      activeTab={dateTab}
      onTabChange={setDateTab}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="ابحث بالبيان أو البند..."
      filters={
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
        >
          <option value="all">كل البنود</option>
          {expenseAccounts.map(a => <option key={a.id} value={a.name}>{a.code} — {a.name}</option>)}
        </select>
      }
      loading={loading}
      empty={filtered.length === 0 ? (
        <div>
          <Receipt size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد مصروفات مسجلة — أضف أول مصروف</p>
        </div>
      ) : undefined}
      footer={
        <InvPagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          perPage={itemsPerPage}
          onPage={setCurrentPage}
          label="مصروف"
        />
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المصروفات', val: `ج.م ${fmt(totalExpenses)}` },
          { label: 'مصروفات الشهر', val: `ج.م ${fmt(thisMonth)}` },
          { label: 'عدد القيود', val: String(filtered.length) },
          { label: 'بنود المصروفات', val: String(expenseAccounts.length) },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-right">
            <span className="text-slate-500 font-semibold text-xs">{s.label}</span>
            <div className="text-lg font-black text-slate-900 mt-1">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-sm">
            لا توجد نتائج مطابقة في هذه الفترة
          </div>
        ) : (
          <InvTableCard
            columns={[
              { label: 'التاريخ', className: 'col-span-2' },
              { label: 'رقم القيد', className: 'col-span-1' },
              { label: 'البيان', className: 'col-span-3' },
              { label: 'بند المصروف', className: 'col-span-2' },
              { label: 'دُفع من', className: 'col-span-2' },
              { label: 'المبلغ', className: 'col-span-1' },
              { label: 'إجراءات', className: 'col-span-1' },
            ]}
          >
            {paginated.map(r => (
              <InvRow key={r.id}>
                <div className="col-span-2 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString('ar-EG')}
                </div>
                <div className="col-span-1 font-mono text-xs font-bold text-slate-500 truncate">{r.number}</div>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{r.description}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700">{r.category}</span>
                </div>
                <div className="col-span-2 text-slate-600 text-xs sm:text-sm truncate">{r.payFrom}</div>
                <div className="col-span-1 font-black text-rose-600 text-xs sm:text-sm whitespace-nowrap">ج.م {fmt(r.amount)}</div>
                <div className="col-span-1 flex items-center justify-end">
                  <InvRowAction onClick={() => openImpact(r)} title="التأثير المحاسبي">
                    <Info size={14} />
                  </InvRowAction>
                </div>
              </InvRow>
            ))}
          </InvTableCard>
        )}
      </div>

      {/* Add Modal — نفس شكل الحفظ: قيد مسودة ثم ترحيل */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">مصروف جديد</h3>
              <button onClick={() => setModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">بند المصروف (حساب مدين)</label>
              <select value={form.expenseAccountId} onChange={e => setForm({ ...form, expenseAccountId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
                <option value="">— اختر بند المصروف —</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
              {expenseAccounts.length === 0 && <p className="text-[11px] font-bold text-amber-600 mt-1">أضف حسابات مصروفات من شجرة الحسابات أولًا.</p>}
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">دُفع من (حساب دائن)</label>
              <select value={form.payFromAccountId} onChange={e => setForm({ ...form, payFromAccountId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
                <option value="">— اختر النقدية / البنك —</option>
                {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1">المبلغ</label>
                <input type="number" min={0} step="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1">التاريخ</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">البيان</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: إيجار شهر يناير" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">مرجع (اختياري)</label>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="رقم فاتورة/إيصال" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" dir="ltr" />
            </div>
            <button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              حفظ وترحيل القيد
            </button>
          </div>
        </div>
      )}

      {/* Impact Modal — أسطر القيد المحاسبي */}
      {impactEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setImpactEntry(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-slate-900">التأثير المحاسبي</h3>
              <button onClick={() => setImpactEntry(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-4 text-xs font-bold">
              <span className="font-mono text-slate-500">{impactEntry.number}</span>
              <span className="text-slate-700">{impactEntry.description}</span>
              <span className="text-slate-400">{new Date(impactEntry.entry_date).toLocaleDateString('ar-EG')}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {impactEntry.status === 'posted' ? 'مرحَّل' : impactEntry.status === 'reversed' ? 'معكوس' : 'مسودة'}
              </span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 font-black border-b border-slate-200">
                    <th className="px-3 py-2 text-right">الحساب</th>
                    <th className="px-3 py-2 text-right">البيان</th>
                    <th className="px-3 py-2 text-left">مدين</th>
                    <th className="px-3 py-2 text-left">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {(impactEntry.lines || []).map((l, i) => (
                    <tr key={`${l.account_id}-${i}`} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-slate-400">{l.account_code}</span>{' '}
                        <span className="font-bold text-slate-700">{l.account_name}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{l.description || '—'}</td>
                      <td className="px-3 py-2 text-left font-mono tabular-nums font-bold text-slate-800">{l.debit ? fmt(l.debit) : '—'}</td>
                      <td className="px-3 py-2 text-left font-mono tabular-nums font-bold text-slate-800">{l.credit ? fmt(l.credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black text-xs">
                    <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                    <td className="px-3 py-2 text-left font-mono tabular-nums">{fmt((impactEntry.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0))}</td>
                    <td className="px-3 py-2 text-left font-mono tabular-nums">{fmt((impactEntry.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}
