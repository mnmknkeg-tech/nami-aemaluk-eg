'use client';

/**
 * صفحة التسويات المالية — مطابقة وتسوية الخزائن والبنوك والمحافظ وبوابات الدفع والعهد.
 * لا يوجد API مخصص: كل تسوية = قيد يومية بوسم وصف يبدأ بـ [تسوية] (وسم [مراجعة] = بانتظار المراجعة).
 * التبويبات: تسوية جديدة | مسودة | بانتظار المراجعة | معتمدة | السجل
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, Info, Send, Eye, ScrollText, Loader2, CheckCircle2, ShieldCheck, Scale, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvToolbar,
  InvToolButton,
  InvStatusPill,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

/* ------------------------------ أدوات مساعدة ------------------------------ */
const num = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money2 = (n: number) => num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('ar-EG');
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const listOf = (res: any): any[] =>
  Array.isArray(res) ? res : (res?.data || res?.items || res?.rows || []);
const round2 = (n: number) => Math.round(n * 100) / 100;

type Account = {
  id: string; code: string; name: string; type: string;
  is_group: boolean; status: string;
  opening_balance: number; debit_balance: number; credit_balance: number;
};
type JLine = { account_id: string; account_code?: string; account_name?: string; description?: string; debit: number; credit: number };
type JEntry = {
  id: string; number?: string; entry_number?: string;
  entry_date?: string; date?: string;
  description: string; reference?: string; status: string; lines: JLine[];
};

type SettleKind = 'draft' | 'review' | 'approved' | 'reversed';

type SettleRow = JEntry & { kind: SettleKind; settleType: string; reason: string };

const SETTLE_TYPES = ['خزينة', 'بنك', 'محفظة', 'بوابة دفع', 'عهدة', 'فروق نقدية'];

/** حسابات مالية للتسوية: أصول مطابقة للنقدية/البنوك/المحافظ/العهد */
const FIN_ACCOUNT_REGEX = /نقد|نقدية|صندوق|بنك|كاش|محفظة|محفظه|عهدة|عهد|cash|bank|wallet|custody/i;
const COUNTER_ACCOUNT_NAME = 'فروق التسويات';
const SETTLE_PREFIX = '[تسوية]';
const REVIEW_TAG = '[مراجعة]';

const entryNumber = (e: JEntry) => e.number || e.entry_number || '—';
const entryDate = (e: JEntry) => e.entry_date || e.date || '';

const kindOf = (e: JEntry): SettleKind => {
  if (e.status === 'posted') return 'approved';
  if (e.status === 'reversed') return 'reversed';
  return (e.description || '').includes(REVIEW_TAG) ? 'review' : 'draft';
};

const parseSettleType = (desc: string): string => {
  const clean = (desc || '').replace(REVIEW_TAG, '').trim();
  const m = clean.match(/^\[تسوية\]\s*(.*)$/);
  if (!m) return '—';
  const rest = m[1];
  const idx = rest.indexOf('—');
  return (idx >= 0 ? rest.slice(0, idx) : rest).trim() || '—';
};

const parseSettleReason = (desc: string): string => {
  const clean = (desc || '').replace(REVIEW_TAG, '').trim();
  const idx = clean.indexOf('—');
  return idx >= 0 ? clean.slice(idx + 1).trim() : '';
};

const KIND_META: Record<SettleKind, { label: string; tone: 'emerald' | 'slate' | 'red' | 'amber' }> = {
  draft: { label: 'مسودة', tone: 'slate' },
  review: { label: 'بانتظار المراجعة', tone: 'amber' },
  approved: { label: 'معتمدة', tone: 'emerald' },
  reversed: { label: 'معكوسة', tone: 'red' },
};

/* ------------------------------ الصفحة ------------------------------ */
const SETTLEMENT_TABS = [
  { id: 'new', label: 'تسوية جديدة' },
  { id: 'draft', label: 'مسودة' },
  { id: 'review', label: 'بانتظار المراجعة' },
  { id: 'approved', label: 'معتمدة' },
  { id: 'history', label: 'السجل' },
];

const SETTLEMENT_SUBTITLES: Record<string, string> = {
  new: 'قيد تسوية متوازن: الفرق على الحساب المالي ومقابله فروق التسويات',
  draft: 'تسويات محفوظة كمسودات — قابلة للترحيل',
  review: 'تسويات بانتظار مراجعة واعتماد الإدارة',
  approved: 'تسويات معتمدة ومُرحَّلة على دفتر الأستاذ',
  history: 'سجل التسويات المعكوسة',
};

export default function SettlementsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <SettlementsPageContent />
    </Suspense>
  );
}

function SettlementsPageContent() {
  const router = useRouter();
  const [activeTab, setTab] = useInvSectionTab(SETTLEMENT_TABS.map(t => t.id), 'new');
  const [entries, setEntries] = useState<JEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const [jeRes, accRes] = await Promise.all([
        apiRequest(`/accounting/journal/shop/${sid}`),
        apiRequest(`/accounting/accounts/shop/${sid}`),
      ]);
      setEntries(listOf(jeRes) as JEntry[]);
      const accData: Account[] = Array.isArray(accRes) ? accRes : (accRes?.data || []);
      setAccounts(accData);
      setError('');
    } catch {
      setEntries([]);
      setError('تعذر تحميل بيانات التسويات');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const settlements = useMemo<SettleRow[]>(() => entries
    .filter(e => (e.description || '').trim().startsWith(SETTLE_PREFIX))
    .map(e => ({ ...e, kind: kindOf(e), settleType: parseSettleType(e.description), reason: parseSettleReason(e.description) }))
    .sort((a, b) => entryDate(b).localeCompare(entryDate(a)))
  , [entries]);

  const counts = useMemo(() => ({
    draft: settlements.filter(s => s.kind === 'draft').length,
    review: settlements.filter(s => s.kind === 'review').length,
    approved: settlements.filter(s => s.kind === 'approved').length,
    history: settlements.filter(s => s.kind === 'reversed').length,
  }), [settlements]);

  const tabsWithCounts = useMemo(() => SETTLEMENT_TABS.map(t => (
    t.id === 'draft' ? { ...t, count: counts.draft }
      : t.id === 'review' ? { ...t, count: counts.review }
        : t.id === 'approved' ? { ...t, count: counts.approved }
          : t.id === 'history' ? { ...t, count: counts.history }
            : t
  )), [counts]);

  const postSettlement = useCallback(async (id: string) => {
    if (!confirm('ترحيل قيد التسوية؟ لن يمكن تعديله بعد الترحيل.')) return;
    try { await apiRequest(`/accounting/journal/${id}/post`, { method: 'POST' }); await load(); }
    catch (e: any) { alert(e?.message || 'فشل الترحيل'); }
  }, [load]);

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">التسويات المالية</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{SETTLEMENT_SUBTITLES[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* تبويبات القسم */}
      <SectionTabs tabs={tabsWithCounts} active={activeTab} onChange={setTab} />

      {/* لافتة المبدأ المحاسبي */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 leading-relaxed font-bold">
            لا يتغير أي رصيد بدون حركة مسجلة — كل تسوية قيد محاسبي متوازن
          </p>
        </div>
      </div>

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
            {error}
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <NewSettlementView
          accounts={accounts}
          loading={loading}
          shopId={shopId}
          onSaved={load}
          goTab={setTab}
        />
      )}
      {(activeTab === 'draft' || activeTab === 'review' || activeTab === 'approved' || activeTab === 'history') && (
        <SettlementListTab
          kind={activeTab === 'history' ? 'reversed' : (activeTab as SettleKind)}
          rows={settlements.filter(s => s.kind === (activeTab === 'history' ? 'reversed' : activeTab))}
          loading={loading}
          onPost={postSettlement}
          onRefresh={load}
          onViewJournal={() => router.push('/dashboard/finance/journal')}
        />
      )}
    </div>
  );
}

/* ------------------------------ تبويب تسوية جديدة ------------------------------ */
function NewSettlementView({ accounts, loading, shopId, onSaved, goTab }: {
  accounts: Account[];
  loading: boolean;
  shopId: string;
  onSaved: () => Promise<void>;
  goTab: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    settleType: SETTLE_TYPES[0],
    finAccountId: '',
    actual: '',
    reason: '',
    date: todayISO(),
    instant: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const finAccounts = useMemo(() => accounts.filter(a =>
    a.type === 'asset' && !a.is_group && a.status === 'active' &&
    FIN_ACCOUNT_REGEX.test(`${a.code} ${a.name}`)
  ), [accounts]);

  const counterAccount = useMemo(
    () => accounts.find(a => (a.name || '').includes(COUNTER_ACCOUNT_NAME)),
    [accounts]
  );

  const selectedAcc = accounts.find(a => a.id === form.finAccountId);
  const bookBalance = selectedAcc
    ? round2(num(selectedAcc.opening_balance) + num(selectedAcc.debit_balance) - num(selectedAcc.credit_balance))
    : 0;
  const diff = form.actual === ''
    ? 0
    : round2(num(form.actual) - bookBalance);
  const diffSign = diff > 0 ? 1 : diff < 0 ? -1 : 0;

  const canSubmit = Boolean(form.finAccountId && form.reason.trim() && counterAccount && diffSign !== 0 && shopId);

  const submit = async () => {
    if (!form.finAccountId) { setError('اختر الحساب المالي'); return; }
    if (!counterAccount) { setError(`حساب "${COUNTER_ACCOUNT_NAME}" غير موجود — أنشئه من دليل الحسابات أولًا`); return; }
    if (!form.reason.trim()) { setError('سبب التسوية مطلوب'); return; }
    if (diffSign === 0) { setError('لا يوجد فرق بين الرصيد الدفتري والفعلي'); return; }
    setSaving(true); setError('');
    try {
      const amt = Math.abs(diff);
      const description = `${SETTLE_PREFIX} ${form.settleType} — ${form.reason.trim()}${form.instant ? '' : ` ${REVIEW_TAG}`}`;
      const lines = diffSign > 0
        ? [
          { account_id: form.finAccountId, debit: amt, credit: 0, description: form.reason.trim() },
          { account_id: counterAccount.id, debit: 0, credit: amt, description: form.reason.trim() },
        ]
        : [
          { account_id: form.finAccountId, debit: 0, credit: amt, description: form.reason.trim() },
          { account_id: counterAccount.id, debit: amt, credit: 0, description: form.reason.trim() },
        ];
      const created = await apiRequest(`/accounting/journal/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({ entry_date: form.date, description, reference: 'SETTLEMENT', lines }),
      });
      const newId = created?.data?.id || created?.id;
      if (form.instant && newId) {
        await apiRequest(`/accounting/journal/${newId}/post`, { method: 'POST' });
      }
      setForm({ settleType: SETTLE_TYPES[0], finAccountId: '', actual: '', reason: '', date: todayISO(), instant: false });
      await onSaved();
      goTab(form.instant ? 'approved' : 'review');
    } catch (e: any) {
      setError(e?.message || 'تعذر حفظ التسوية');
    } finally { setSaving(false); }
  };

  if (loading) return <InvLoading />;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint="الفرق يُسجل على الحساب المالي ومقابله حساب فروق التسويات — القيد متوازن دائمًا" />

      {!counterAccount && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[12px] font-bold">
          <Info size={14} className="shrink-0" />
          حساب &quot;{COUNTER_ACCOUNT_NAME}&quot; غير موجود في دليل الحسابات — أنشئه أولًا من دليل الحسابات (لن تُنشئه الصفحة تلقائيًا)
          <button
            onClick={() => router.push('/dashboard/finance/accounts')}
            className="h-8 px-3 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold border border-amber-200"
          >
            فتح دليل الحسابات
          </button>
        </div>
      )}

      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-slate-500" />
          <h2 className="font-black text-slate-900 text-sm">قيد تسوية جديد</h2>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2">
            <Info size={14} /> {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">نوع التسوية</label>
            <select
              value={form.settleType}
              onChange={e => setForm({ ...form, settleType: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white"
            >
              {SETTLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">الحساب المالي</label>
            <select
              value={form.finAccountId}
              onChange={e => setForm({ ...form, finAccountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white"
            >
              <option value="">— خزينة / بنك / محفظة —</option>
              {finAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
            {finAccounts.length === 0 && (
              <p className="text-[11px] font-bold text-amber-600 mt-1">لا توجد حسابات نقدية/بنوك — أضِفها من دليل الحسابات.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">الرصيد الدفتري (محسوب)</label>
            <div className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-700 bg-slate-50" dir="ltr">
              {selectedAcc ? money2(bookBalance) : '—'}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">رصيد افتتاحي + مدين - دائن</p>
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">الرصيد الفعلي (جرد / كشف)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.actual}
              onChange={e => setForm({ ...form, actual: e.target.value })}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">الفرق (محسوب)</label>
            <div className={`w-full border rounded-xl px-3 py-2.5 text-sm font-black flex items-center gap-2 ${
              diffSign > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : diffSign < 0 ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              {diffSign > 0 ? <ArrowUpRight size={15} /> : diffSign < 0 ? <ArrowDownRight size={15} /> : null}
              <span dir="ltr">{form.actual === '' ? '—' : money2(diff)}</span>
              {diffSign > 0 && <span className="text-[11px]">(زيادة تُدين)</span>}
              {diffSign < 0 && <span className="text-[11px]">(نقص يُدائن)</span>}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-600 block mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value || todayISO() })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-black text-slate-600 block mb-1">سبب التسوية *</label>
            <input
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="مثال: عجز نقدية بعد الجرد / فروق عمولات بوابة الدفع"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.instant}
              onChange={e => setForm({ ...form, instant: e.target.checked })}
              className="w-4 h-4"
            />
            اعتماد فوري (ترحيل القيد مباشرة — بدونها تُحفظ بانتظار المراجعة)
          </label>
        </div>
        <button
          onClick={submit}
          disabled={saving || !canSubmit}
          className="mt-5 w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          حفظ التسوية
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ تبويبات القوائم ------------------------------ */
function SettlementListTab({ kind, rows, loading, onPost, onRefresh, onViewJournal }: {
  kind: SettleKind;
  rows: SettleRow[];
  loading: boolean;
  onPost: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onViewJournal: () => void;
}) {
  const meta = KIND_META[kind];
  const emptyTexts: Record<SettleKind, string> = {
    draft: 'لا توجد مسودات تسويات',
    review: 'لا توجد تسويات بانتظار المراجعة',
    approved: 'لا توجد تسويات معتمدة بعد — أنشئ تسوية من تبويب "تسوية جديدة"',
    reversed: 'لا توجد تسويات معكوسة في السجل',
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${rows.length} تسوية`}>
        <InvToolButton onClick={() => onRefresh()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton primary onClick={onViewJournal}>
          <ScrollText size={14} />
          دفتر اليومية
        </InvToolButton>
      </InvToolbar>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : rows.length === 0 ? (
          <InvEmpty icon={ScrollText} title={emptyTexts[kind]} />
        ) : (
          <InvTableCard
            columns={[
              { label: 'رقم القيد', className: 'col-span-1' },
              { label: 'التاريخ', className: 'col-span-2' },
              { label: 'النوع', className: 'col-span-1' },
              { label: 'الحساب', className: 'col-span-2' },
              { label: 'الفرق', className: 'col-span-2' },
              { label: 'السبب', className: 'col-span-2' },
              { label: 'الحالة', className: 'col-span-1' },
              { label: 'إجراءات', className: 'col-span-1' },
            ]}
          >
            {rows.map(s => {
              const finLine = (s.lines || []).find(l => !(l.account_name || '').includes(COUNTER_ACCOUNT_NAME))
                || (s.lines || [])[0];
              const debit = num(finLine?.debit);
              const credit = num(finLine?.credit);
              const signed = debit > 0 ? debit : -credit;
              return (
                <InvRow key={s.id}>
                  <div className="col-span-1 font-mono text-xs font-bold text-slate-500 truncate">{entryNumber(s)}</div>
                  <div className="col-span-2 text-slate-600 text-xs sm:text-sm whitespace-nowrap">{fmtDate(entryDate(s))}</div>
                  <div className="col-span-1 text-slate-700 text-xs sm:text-sm truncate">{s.settleType}</div>
                  <div className="col-span-2 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {finLine ? `${finLine.account_code || ''} ${finLine.account_name || ''}`.trim() : '—'}
                    </div>
                  </div>
                  <div className={`col-span-2 font-bold text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 ${
                    signed > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {signed > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {money2(Math.abs(signed))}
                  </div>
                  <div className="col-span-2 min-w-0">
                    <div className="text-xs sm:text-sm text-slate-600 truncate">{s.reason || s.description}</div>
                  </div>
                  <div className="col-span-1">
                    <InvStatusPill tone={meta.tone}>{meta.label}</InvStatusPill>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1.5">
                    {(s.kind === 'draft' || s.kind === 'review') && (
                      <InvRowAction onClick={() => onPost(s.id)} title="ترحيل">
                        <Send size={14} />
                      </InvRowAction>
                    )}
                    {s.kind === 'approved' && (
                      <span className="h-8 w-8 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-600" title="معتمدة">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                    <InvRowAction onClick={onViewJournal} title="عرض القيد">
                      <Eye size={14} />
                    </InvRowAction>
                  </div>
                </InvRow>
              );
            })}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
