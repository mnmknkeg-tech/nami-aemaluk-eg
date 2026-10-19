'use client';

/**
 * صفحة العملاء والمدينون — مركز الذمم المدينة.
 * التبويبات: العملاء | كشف الحساب | أعمار الديون
 * المصدر: /accounting/entities (party نوع customer) + أعمار الديون + فواتير البيع + سندات القبض.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Plus, RefreshCw, Info, X, Phone, ScrollText, Loader2, AlertTriangle,
  FileText, CheckCircle2, Clock, Wallet,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvToolbar,
  InvToolButton,
  InvPagination,
  InvLoading,
  InvEmpty,
} from '@/components/inventory/InventoryShell';

/* ------------------------------ أدوات مساعدة ------------------------------ */
const num = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (n: number) => `ج.م ${num(n).toLocaleString('en-US')}`;
const fmtDate = (d: string) => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('ar-EG');
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const listOf = (res: any): any[] =>
  Array.isArray(res) ? res : (res?.data || res?.items || res?.rows || []);
const normName = (s: string) => (s || '').trim().replace(/\s+/g, ' ');

type Party = {
  id: string; name: string; nameEn: string; taxId: string;
  phone: string; email: string; address: string; creditLimit: number;
};
type Inv = {
  id: string; number: string; type: string; date: string; dueDate: string;
  status: string; entityId: string; entityName: string; total: number; paid: number;
};
type Pay = {
  id: string; number: string; type: string; date: string; amount: number;
  method: string; reference: string; status: string; entityId: string; entityName: string;
};
type AgingRow = {
  entityId: string; name: string;
  current: number; b30: number; b60: number; b90: number; b90p: number; total: number;
};

function mapParty(s: any): Party {
  return {
    id: String(s?.id ?? ''),
    name: s?.name || s?.name_ar || s?.nameAr || '---',
    nameEn: s?.name_en || s?.nameEn || '',
    taxId: s?.tax_id || s?.taxId || '',
    phone: s?.phone || '',
    email: s?.email || '',
    address: s?.address || '',
    creditLimit: num(s?.credit_limit ?? s?.creditLimit),
  };
}

function mapInvoice(s: any): Inv {
  return {
    id: String(s?.id ?? ''),
    number: s?.number || s?.invoice_number || '',
    type: s?.invoice_type || s?.type || '',
    date: s?.invoice_date || s?.date || s?.created_at || '',
    dueDate: s?.due_date || s?.dueDate || '',
    status: s?.status || '',
    entityId: String(s?.entity_id ?? s?.entityId ?? ''),
    entityName: s?.entity_name || s?.entityName || '',
    total: num(s?.total_amount ?? s?.total ?? s?.amount),
    paid: num(s?.paid_amount ?? s?.paid),
  };
}

function mapPayment(s: any): Pay {
  return {
    id: String(s?.id ?? ''),
    number: s?.number || s?.payment_number || '',
    type: s?.payment_type || s?.type || '',
    date: s?.payment_date || s?.date || s?.created_at || '',
    amount: num(s?.amount),
    method: s?.method || '',
    reference: s?.reference || '',
    status: s?.status || '',
    entityId: String(s?.entity_id ?? s?.entityId ?? ''),
    entityName: s?.entity_name || s?.entityName || '',
  };
}

/** خرائط أعمار الديون — دفاعية: current/30/60/90/90+ بأي تسمية، وفوقيًا أو داخل buckets */
function mapAging(s: any): AgingRow {
  const src: any = s?.buckets && typeof s.buckets === 'object' ? s.buckets : s;
  const g = (...keys: string[]): number => {
    for (const k of keys) {
      const v = src?.[k];
      if (v !== undefined && v !== null && v !== '') return num(v);
    }
    return 0;
  };
  const current = g('current', 'bucket_current', 'days_current', 'd0', '0');
  const b30 = g('30', 'd30', 'bucket_30', 'days_30', 'days_1_30');
  const b60 = g('60', 'd60', 'bucket_60', 'days_60', 'days_31_60');
  const b90 = g('90', 'd90', 'bucket_90', 'days_90', 'days_61_90');
  const b90p = g('90+', '90plus', 'over90', 'over_90', 'bucket_90_plus', 'days_90_plus', 'days_over_90');
  const sum = current + b30 + b60 + b90 + b90p;
  const total = g('total', 'outstanding', 'total_outstanding', 'total_due', 'balance') || sum;
  return {
    entityId: String(s?.entity_id ?? s?.entityId ?? ''),
    name: s?.entity_name || s?.entityName || s?.name || '---',
    current, b30, b60, b90, b90p, total,
  };
}

/* ------------------------------ الصفحة ------------------------------ */
const RECEIVABLE_TABS = [
  { id: 'customers', label: 'العملاء' },
  { id: 'statement', label: 'كشف الحساب' },
  { id: 'aging', label: 'أعمار الديون' },
];

const RECEIVABLE_SUBTITLES: Record<string, string> = {
  customers: 'ملفات العملاء والحدود الائتمانية والأرصدة المستحقة',
  statement: 'كشف حساب العميل: فواتير البيع والتحصيلات والرصيد الجاري',
  aging: 'أعمار الديون: توزيع المديونية على الفترات الزمنية',
};

export default function ReceivablesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <ReceivablesPageContent />
    </Suspense>
  );
}

function ReceivablesPageContent() {
  const [activeTab, setTab] = useInvSectionTab(RECEIVABLE_TABS.map(t => t.id), 'customers');
  const searchParams = useSearchParams();
  const entityParam = searchParams.get('entity') || '';

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">العملاء والمدينون</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{RECEIVABLE_SUBTITLES[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* تبويبات القسم */}
      <SectionTabs tabs={RECEIVABLE_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'customers' && <CustomersView />}
      {activeTab === 'statement' && <StatementView initialEntity={entityParam} />}
      {activeTab === 'aging' && <AgingView />}
    </div>
  );
}

/* ------------------------------ تبويب العملاء ------------------------------ */
type CustomerRow = Party & { invoiceCount: number; paid: number; balance: number };

function CustomersView() {
  const router = useRouter();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', taxId: '', creditLimit: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [entRes, agingRes, invRes] = await Promise.all([
        apiRequest(`/accounting/entities/shop/${sid}`),
        apiRequest(`/accounting/aging/shop/${sid}?entity_type=customer`).catch(() => null),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => null),
      ]);
      const customers: Party[] = listOf(entRes)
        .filter((p: any) => p?.id && (!p.entity_type || p.entity_type === 'customer'))
        .map(mapParty);
      const agingRows: AgingRow[] = agingRes ? listOf(agingRes).map(mapAging) : [];
      const invoices: Inv[] = invRes ? listOf(invRes).map(mapInvoice) : [];
      const agingById = new Map(agingRows.filter(a => a.entityId).map(a => [a.entityId, a]));
      const agingByName = new Map(agingRows.map(a => [normName(a.name), a]));
      const out: CustomerRow[] = customers.map(c => {
        const mine = invoices.filter(i =>
          i.type === 'sale' && i.status !== 'cancelled' &&
          ((i.entityId && i.entityId === c.id) || (!!i.entityName && normName(i.entityName) === normName(c.name)))
        );
        const paid = mine.reduce((s, i) => s + i.paid, 0);
        const total = mine.reduce((s, i) => s + i.total, 0);
        const aged = agingById.get(c.id) || agingByName.get(normName(c.name));
        return { ...c, invoiceCount: mine.length, paid, balance: aged ? aged.total : (total - paid) };
      });
      setRows(out);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const filtered = useMemo(() => rows.filter(c =>
    !debouncedSearch ||
    c.name.includes(debouncedSearch) ||
    c.nameEn.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.phone.includes(debouncedSearch)
  ), [rows, debouncedSearch]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const totalOutstanding = filtered.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);

  const addCustomer = async () => {
    if (!form.name.trim()) { setFormError('اسم العميل مطلوب'); return; }
    setSaving(true); setFormError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setFormError('تعذر تحديد المتجر'); return; }
      const body: Record<string, unknown> = { entity_type: 'customer', name: form.name.trim() };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.email.trim()) body.email = form.email.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.taxId.trim()) body.tax_id = form.taxId.trim();
      body.credit_limit = num(form.creditLimit);
      await apiRequest(`/accounting/entities/shop/${sid}`, { method: 'POST', body: JSON.stringify(body) });
      setAddModal(false);
      setForm({ name: '', phone: '', email: '', address: '', taxId: '', creditLimit: '' });
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'تعذر إضافة العميل');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${filtered.length} عميل • إجمالي المستحق ${money(totalOutstanding)} • إجمالي المدفوع ${money(totalPaid)}`}>
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton primary onClick={() => { setFormError(''); setAddModal(true); }}>
          <Plus size={14} />
          إضافة عميل
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="بحث بالاسم أو الهاتف..."
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={Users} title="لا يوجد عملاء مسجلون — أضف أول عميل">
            <InvToolButton primary onClick={() => { setFormError(''); setAddModal(true); }}>
              <Plus size={14} />
              إضافة عميل
            </InvToolButton>
          </InvEmpty>
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'العميل', className: 'col-span-3' },
                { label: 'الحد الائتماني', className: 'col-span-2' },
                { label: 'الفواتير', className: 'col-span-1' },
                { label: 'المدفوع', className: 'col-span-2' },
                { label: 'الرصيد المستحق', className: 'col-span-2' },
                { label: 'إجراءات', className: 'col-span-2' },
              ]}
            >
              {paginated.map(c => (
                <InvRow key={c.id} muted={c.balance <= 0}>
                  <div className="col-span-3 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{c.name}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      {c.phone ? (<><Phone size={11} /> {c.phone}</>) : (c.nameEn || '—')}
                    </div>
                  </div>
                  <div className="col-span-2 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                    {c.creditLimit > 0 ? money(c.creditLimit) : '—'}
                  </div>
                  <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">{c.invoiceCount}</div>
                  <div className="col-span-2 font-bold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">{money(c.paid)}</div>
                  <div className={`col-span-2 font-bold text-xs sm:text-sm whitespace-nowrap ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {money(c.balance)}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <InvRowAction
                      onClick={() => router.push(`/dashboard/finance/receivables?tab=statement&entity=${c.id}`)}
                      title="كشف الحساب"
                    >
                      <ScrollText size={14} />
                    </InvRowAction>
                  </div>
                </InvRow>
              ))}
            </InvTableCard>

            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={perPage}
              onPage={setCurrentPage}
              label="عميل"
            />
          </>
        )}
      </div>

      {/* نافذة إضافة عميل */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إضافة عميل</h2>
              <button onClick={() => setAddModal(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-bold text-slate-700 mb-1 block">اسم العميل *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="الاسم كما يظهر في الفواتير" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الهاتف</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الرقم الضريبي</label>
                <input type="text" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} placeholder="الرقم الضريبي" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الحد الائتماني</label>
                <input type="number" min={0} value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" dir="ltr" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-bold text-slate-700 mb-1 block">العنوان</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div className="col-span-2">
                <button onClick={addCustomer} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  حفظ العميل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ تبويب كشف الحساب ------------------------------ */
type StatementLine = {
  id: string; kind: 'invoice' | 'receipt'; date: string; ref: string;
  debit: number; credit: number; balance: number;
};

function StatementView({ initialEntity }: { initialEntity: string }) {
  const [parties, setParties] = useState<Party[]>([]);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [payments, setPayments] = useState<Pay[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (preferred: string) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [entRes, invRes, payRes] = await Promise.all([
        apiRequest(`/accounting/entities/shop/${sid}`),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => null),
        apiRequest(`/accounting/payments/shop/${sid}`).catch(() => null),
      ]);
      const ps: Party[] = listOf(entRes)
        .filter((p: any) => p?.id && (!p.entity_type || p.entity_type === 'customer'))
        .map(mapParty);
      setParties(ps);
      setInvoices(invRes ? listOf(invRes).map(mapInvoice) : []);
      setPayments(payRes ? listOf(payRes).map(mapPayment) : []);
      setSelected(preferred && ps.some(p => p.id === preferred) ? preferred : (ps[0]?.id || ''));
    } catch { setParties([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(initialEntity); }, [load, initialEntity]);

  const selectedParty = useMemo(() => parties.find(p => p.id === selected), [parties, selected]);

  const lines = useMemo<StatementLine[]>(() => {
    if (!selectedParty) return [];
    const match = (eid: string, ename: string) =>
      (!!eid && eid === selectedParty.id) || (!!ename && normName(ename) === normName(selectedParty.name));
    const raw: Omit<StatementLine, 'balance'>[] = [];
    invoices
      .filter(i => i.type === 'sale' && i.status !== 'cancelled' && match(i.entityId, i.entityName))
      .forEach(i => raw.push({ id: `inv-${i.id}`, kind: 'invoice', date: i.date, ref: `فاتورة بيع ${i.number || ''}`.trim(), debit: i.total, credit: 0 }));
    payments
      .filter(p => p.type === 'receipt' && match(p.entityId, p.entityName))
      .forEach(p => raw.push({
        id: `pay-${p.id}`, kind: 'receipt', date: p.date,
        ref: `سند قبض ${p.number || ''}${p.method ? ` — ${p.method}` : ''}`.trim(),
        debit: 0, credit: p.amount,
      }));
    raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    return raw.map(r => { running += r.debit - r.credit; return { ...r, balance: running }; });
  }, [invoices, payments, selectedParty]);

  const totals = useMemo(() => ({
    invoices: lines.reduce((s, l) => s + l.debit, 0),
    receipts: lines.reduce((s, l) => s + l.credit, 0),
  }), [lines]);
  const balance = totals.invoices - totals.receipts;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={selectedParty ? `كشف حساب: ${selectedParty.name}` : 'اختر عميلًا لعرض كشف حسابه'}>
        <InvToolButton onClick={() => load(initialEntity || selected)}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          filters={
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none min-w-[220px]"
            >
              <option value="">— اختر العميل —</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          }
        />
      </div>

      {selectedParty && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي الفواتير</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{money(totals.invoices)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي التحصيلات</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{money(totals.receipts)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-500">الرصيد</span>
            </div>
            <div className={`text-lg sm:text-xl font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {money(balance)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : !selectedParty ? (
          <InvEmpty icon={Users} title="اختر عميلًا من القائمة لعرض كشف الحساب" />
        ) : lines.length === 0 ? (
          <InvEmpty icon={ScrollText} title="لا توجد حركات لهذا العميل بعد" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'التاريخ', className: 'col-span-2' },
              { label: 'البيان', className: 'col-span-3' },
              { label: 'النوع', className: 'col-span-2' },
              { label: 'مدين (فواتير)', className: 'col-span-2' },
              { label: 'دائن (تحصيلات)', className: 'col-span-2' },
              { label: 'الرصيد', className: 'col-span-1' },
            ]}
          >
            {lines.map(l => (
              <InvRow key={l.id}>
                <div className="col-span-2 text-slate-600 text-xs sm:text-sm whitespace-nowrap">{fmtDate(l.date)}</div>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{l.ref}</div>
                </div>
                <div className="col-span-2">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
                    l.kind === 'invoice'
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                  }`}>
                    {l.kind === 'invoice' ? 'فاتورة بيع' : 'سند قبض'}
                  </span>
                </div>
                <div className="col-span-2 font-semibold text-rose-600 text-xs sm:text-sm whitespace-nowrap">
                  {l.debit ? money(l.debit) : '—'}
                </div>
                <div className="col-span-2 font-semibold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">
                  {l.credit ? money(l.credit) : '—'}
                </div>
                <div className="col-span-1 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                  {l.balance.toLocaleString('en-US')}
                </div>
              </InvRow>
            ))}
          </InvTableCard>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ تبويب أعمار الديون ------------------------------ */
function AgingView() {
  const [asOf, setAsOf] = useState(todayISO());
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const res = await apiRequest(`/accounting/aging/shop/${sid}?entity_type=customer&as_of=${asOf}`);
      setRows(listOf(res).map(mapAging));
    } catch { setRows([]); } finally { setLoading(false); }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  const totalDue = rows.reduce((s, r) => s + r.total, 0);
  const lateDue = rows.reduce((s, r) => s + r.b30 + r.b60 + r.b90 + r.b90p, 0);
  const withBalance = rows.filter(r => r.total > 0).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`كما في ${fmtDate(asOf)}`}>
        <input
          type="date"
          value={asOf}
          onChange={e => setAsOf(e.target.value || todayISO())}
          className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
          title="تاريخ أعمار الديون"
        />
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
      </InvToolbar>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-rose-500" />
            <span className="text-xs font-bold text-slate-500">إجمالي المستحق</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600">{money(totalDue)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-red-500" />
            <span className="text-xs font-bold text-slate-500">متأخر +30 يوم</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-red-600">{money(lateDue)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-500">عملاء عليهم أرصدة</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{withBalance}</div>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : rows.length === 0 ? (
          <InvEmpty icon={FileText} title="لا توجد أرصدة مستحقة على العملاء" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'العميل', className: 'col-span-3' },
              { label: 'الحالية', className: 'col-span-2' },
              { label: 'حتى 30 يوم', className: 'col-span-2' },
              { label: '31-60', className: 'col-span-1' },
              { label: '61-90', className: 'col-span-1' },
              { label: '+90', className: 'col-span-1' },
              { label: 'الإجمالي', className: 'col-span-2' },
            ]}
          >
            {rows.map(r => (
              <InvRow key={`${r.entityId}-${r.name}`} muted={r.total <= 0}>
                <div className="col-span-3 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{r.name}</div>
                </div>
                <div className="col-span-2 text-slate-700 text-xs sm:text-sm whitespace-nowrap">{money(r.current)}</div>
                <div className={`col-span-2 text-xs sm:text-sm whitespace-nowrap ${r.b30 > 0 ? 'font-bold text-amber-600' : 'text-slate-500'}`}>{money(r.b30)}</div>
                <div className={`col-span-1 text-xs sm:text-sm whitespace-nowrap ${r.b60 > 0 ? 'font-bold text-rose-600' : 'text-slate-500'}`}>{money(r.b60)}</div>
                <div className={`col-span-1 text-xs sm:text-sm whitespace-nowrap ${r.b90 > 0 ? 'font-bold text-rose-600' : 'text-slate-500'}`}>{money(r.b90)}</div>
                <div className={`col-span-1 text-xs sm:text-sm whitespace-nowrap ${r.b90p > 0 ? 'font-bold text-red-600' : 'text-slate-500'}`}>{money(r.b90p)}</div>
                <div className={`col-span-2 font-bold text-xs sm:text-sm whitespace-nowrap ${r.total > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {money(r.total)}
                </div>
              </InvRow>
            ))}
            <div className="grid grid-cols-12 px-4 py-3 items-center bg-slate-50 border-t border-slate-200">
              <div className="col-span-5 text-xs font-black text-slate-600">الإجمالي</div>
              <div className="col-span-2 text-xs font-black text-slate-900 whitespace-nowrap">{money(rows.reduce((s, r) => s + r.current, 0))}</div>
              <div className="col-span-2 text-xs font-black text-amber-600 whitespace-nowrap">{money(rows.reduce((s, r) => s + r.b30, 0))}</div>
              <div className="col-span-1 text-xs font-black text-rose-600 whitespace-nowrap">{money(rows.reduce((s, r) => s + r.b60, 0))}</div>
              <div className="col-span-1 text-xs font-black text-rose-600 whitespace-nowrap">{money(rows.reduce((s, r) => s + r.b90, 0))}</div>
              <div className="col-span-1 text-xs font-black text-red-600 whitespace-nowrap">{money(rows.reduce((s, r) => s + r.b90p, 0))}</div>
            </div>
          </InvTableCard>
        )}
      </div>
    </div>
  );
}
