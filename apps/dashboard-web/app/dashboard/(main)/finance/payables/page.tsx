'use client';

/**
 * صفحة الموردون والدائنون — مركز الذمم الدائنة.
 * التبويبات: الموردون | كشف الحساب | أعمار الديون
 * قائمة الموردين موحدة مع قسم المخزون (/suppliers) — لا يوجد مخزن موردين منفصل هنا.
 * المصدر المحاسبي: /accounting/entities (vendor) + أعمار الديون + فواتير الشراء + سندات الدفع.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Truck, RefreshCw, Info, Phone, ScrollText, FileText, CheckCircle2, Clock, Wallet, ExternalLink,
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

/** صف موحد: من مخزون الموردين أو من الكيانات المحاسبية */
type VendorRow = {
  id: string; name: string; nameEn: string; phone: string; email: string;
  source: 'inventory' | 'accounting';
  invoiceCount: number; paid: number; balance: number;
};
type VendorInv = {
  id: string; number: string; type: string; date: string; status: string;
  entityId: string; entityName: string; total: number; paid: number;
};
type VendorPay = {
  id: string; number: string; type: string; date: string; amount: number;
  method: string; status: string; entityId: string; entityName: string;
};
type AgingRow = {
  entityId: string; name: string;
  current: number; b30: number; b60: number; b90: number; b90p: number; total: number;
};

function mapVendorInvoice(s: any): VendorInv {
  return {
    id: String(s?.id ?? ''),
    number: s?.number || s?.invoice_number || '',
    type: s?.invoice_type || s?.type || '',
    date: s?.invoice_date || s?.date || s?.created_at || '',
    status: s?.status || '',
    entityId: String(s?.entity_id ?? s?.entityId ?? ''),
    entityName: s?.entity_name || s?.entityName || '',
    total: num(s?.total_amount ?? s?.total ?? s?.amount),
    paid: num(s?.paid_amount ?? s?.paid),
  };
}

function mapVendorPayment(s: any): VendorPay {
  return {
    id: String(s?.id ?? ''),
    number: s?.number || s?.payment_number || '',
    type: s?.payment_type || s?.type || '',
    date: s?.payment_date || s?.date || s?.created_at || '',
    amount: num(s?.amount),
    method: s?.method || '',
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

/** تحميل قائمة الموردين الموحدة: مخزون الموردين أصلًا + كيانات محاسبية زائدة (دمج بالاسم) */
async function loadVendorUnion(sid: string): Promise<VendorRow[]> {
  const [supRes, entRes] = await Promise.all([
    apiRequest(`/suppliers/shop/${sid}`).catch(() => null),
    apiRequest(`/accounting/entities/shop/${sid}`).catch(() => null),
  ]);
  const suppliers = supRes ? listOf(supRes) : [];
  const entities = entRes ? listOf(entRes).filter((e: any) => e?.entity_type === 'vendor') : [];
  const rows: VendorRow[] = [];
  const seen = new Set<string>();
  for (const s of suppliers) {
    const name = s?.nameAr || s?.name_ar || s?.name || '---';
    const key = normName(name);
    if (!s?.id || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: String(s.id), name, nameEn: s?.name || '', phone: s?.phone || '', email: s?.email || '',
      source: 'inventory', invoiceCount: 0, paid: 0, balance: 0,
    });
  }
  for (const e of entities) {
    const name = e?.name || e?.name_ar || e?.nameAr || '---';
    const key = normName(name);
    if (!e?.id || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: String(e.id), name, nameEn: e?.name_en || e?.nameEn || '', phone: e?.phone || '', email: e?.email || '',
      source: 'accounting', invoiceCount: 0, paid: 0, balance: 0,
    });
  }
  return rows;
}

/* ------------------------------ الصفحة ------------------------------ */
const PAYABLES_TABS = [
  { id: 'suppliers', label: 'الموردون' },
  { id: 'statement', label: 'كشف الحساب' },
  { id: 'aging', label: 'أعمار الديون' },
];

const PAYABLES_SUBTITLES: Record<string, string> = {
  suppliers: 'ملف المورد الموحد مع المخزون — المستحق ومدفوعات الشراء',
  statement: 'كشف حساب المورد: فواتير الشراء والمدفوعات والرصيد الجاري',
  aging: 'أعمار الديون: توزيع المستحقات على الفترات الزمنية',
};

export default function PayablesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <PayablesPageContent />
    </Suspense>
  );
}

function PayablesPageContent() {
  const [activeTab, setTab] = useInvSectionTab(PAYABLES_TABS.map(t => t.id), 'suppliers');
  const searchParams = useSearchParams();
  const entityParam = searchParams.get('entity') || '';

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">الموردون والدائنون</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{PAYABLES_SUBTITLES[activeTab]}</p>
          </div>
        </div>
      </div>

      {/* تبويبات القسم */}
      <SectionTabs tabs={PAYABLES_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'suppliers' && <SuppliersUnionView />}
      {activeTab === 'statement' && <VendorStatementView initialEntity={entityParam} />}
      {activeTab === 'aging' && <VendorAgingView />}
    </div>
  );
}

/* ------------------------------ تبويب الموردون ------------------------------ */
function SuppliersUnionView() {
  const router = useRouter();
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [union, agingRes, invRes] = await Promise.all([
        loadVendorUnion(sid),
        apiRequest(`/accounting/aging/shop/${sid}?entity_type=vendor`).catch(() => null),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => null),
      ]);
      const agingRows: AgingRow[] = agingRes ? listOf(agingRes).map(mapAging) : [];
      const agingById = new Map(agingRows.filter(a => a.entityId).map(a => [a.entityId, a]));
      const agingByName = new Map(agingRows.map(a => [normName(a.name), a]));
      const invoices: VendorInv[] = invRes ? listOf(invRes).map(mapVendorInvoice) : [];
      const out = union.map(v => {
        const mine = invoices.filter(i =>
          i.type === 'purchase' && i.status !== 'cancelled' &&
          ((i.entityId && i.entityId === v.id) || (!!i.entityName && normName(i.entityName) === normName(v.name)))
        );
        const paid = mine.reduce((s, i) => s + i.paid, 0);
        const total = mine.reduce((s, i) => s + i.total, 0);
        const aged = agingById.get(v.id) || agingByName.get(normName(v.name));
        return { ...v, invoiceCount: mine.length, paid, balance: aged ? aged.total : (total - paid) };
      });
      setRows(out);
    } catch { setRows([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const filtered = useMemo(() => rows.filter(v =>
    !debouncedSearch ||
    v.name.includes(debouncedSearch) ||
    v.nameEn.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    v.phone.includes(debouncedSearch) ||
    v.email.toLowerCase().includes(debouncedSearch.toLowerCase())
  ), [rows, debouncedSearch]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const totalOutstanding = filtered.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${filtered.length} مورد • إجمالي المستحق ${money(totalOutstanding)} • إجمالي المدفوع ${money(totalPaid)}`}>
        <InvToolButton onClick={() => load()}>
          <RefreshCw size={14} />
          تحديث
        </InvToolButton>
        <InvToolButton primary onClick={() => router.push('/dashboard/inventory/suppliers')} title="نفس بيانات المورد موحدة بين القسمين">
          <ExternalLink size={14} />
          إدارة الموردين (المخزون)
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[12px] font-bold">
        <Info size={14} className="shrink-0" />
        لا تُضاف الموردين من هنا — نفس بيانات المورد موحدة بين القسمين، أضِفهم من صفحة الموردين بالمخزون
      </div>

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
          <InvEmpty icon={Truck} title="لا يوجد موردين — أضِفهم من صفحة الموردين بالمخزون">
            <InvToolButton primary onClick={() => router.push('/dashboard/inventory/suppliers')}>
              <ExternalLink size={14} />
              الانتقال إلى الموردين
            </InvToolButton>
          </InvEmpty>
        ) : (
          <>
            <InvTableCard
              columns={[
                { label: 'المورد', className: 'col-span-3' },
                { label: 'الهاتف', className: 'col-span-2' },
                { label: 'فواتير الشراء', className: 'col-span-1' },
                { label: 'المدفوع', className: 'col-span-2' },
                { label: 'الرصيد المستحق', className: 'col-span-2' },
                { label: 'إجراءات', className: 'col-span-2' },
              ]}
            >
              {paginated.map(v => (
                <InvRow key={`${v.source}-${v.id}`} muted={v.balance <= 0}>
                  <div className="col-span-3 min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{v.name}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {v.email || v.nameEn || (v.source === 'inventory' ? 'ملف المخزون' : 'كيان محاسبي')}
                    </div>
                  </div>
                  <div className="col-span-2 text-slate-600 text-xs sm:text-sm flex items-center gap-1 truncate">
                    {v.phone ? (<><Phone size={11} /> {v.phone}</>) : '—'}
                  </div>
                  <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">{v.invoiceCount}</div>
                  <div className="col-span-2 font-bold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">{money(v.paid)}</div>
                  <div className={`col-span-2 font-bold text-xs sm:text-sm whitespace-nowrap ${v.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {money(v.balance)}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <InvRowAction
                      onClick={() => router.push(`/dashboard/finance/payables?tab=statement&entity=${v.id}`)}
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
              label="مورد"
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ تبويب كشف الحساب ------------------------------ */
type VendorStatementLine = {
  id: string; kind: 'invoice' | 'payment'; date: string; ref: string;
  debit: number; credit: number; balance: number;
};

function VendorStatementView({ initialEntity }: { initialEntity: string }) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [invoices, setInvoices] = useState<VendorInv[]>([]);
  const [payments, setPayments] = useState<VendorPay[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (preferred: string) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [union, invRes, payRes] = await Promise.all([
        loadVendorUnion(sid),
        apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => null),
        apiRequest(`/accounting/payments/shop/${sid}`).catch(() => null),
      ]);
      setVendors(union);
      setInvoices(invRes ? listOf(invRes).map(mapVendorInvoice) : []);
      setPayments(payRes ? listOf(payRes).map(mapVendorPayment) : []);
      setSelected(preferred && union.some(v => v.id === preferred) ? preferred : (union[0]?.id || ''));
    } catch { setVendors([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(initialEntity); }, [load, initialEntity]);

  const selectedVendor = useMemo(() => vendors.find(v => v.id === selected), [vendors, selected]);

  const lines = useMemo<VendorStatementLine[]>(() => {
    if (!selectedVendor) return [];
    const match = (eid: string, ename: string) =>
      (!!eid && eid === selectedVendor.id) || (!!ename && normName(ename) === normName(selectedVendor.name));
    const raw: Omit<VendorStatementLine, 'balance'>[] = [];
    invoices
      .filter(i => i.type === 'purchase' && i.status !== 'cancelled' && match(i.entityId, i.entityName))
      .forEach(i => raw.push({ id: `inv-${i.id}`, kind: 'invoice', date: i.date, ref: `فاتورة شراء ${i.number || ''}`.trim(), debit: i.total, credit: 0 }));
    payments
      .filter(p => p.type === 'payment' && match(p.entityId, p.entityName))
      .forEach(p => raw.push({
        id: `pay-${p.id}`, kind: 'payment', date: p.date,
        ref: `سند دفع ${p.number || ''}${p.method ? ` — ${p.method}` : ''}`.trim(),
        debit: 0, credit: p.amount,
      }));
    raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    return raw.map(r => { running += r.debit - r.credit; return { ...r, balance: running }; });
  }, [invoices, payments, selectedVendor]);

  const totals = useMemo(() => ({
    invoices: lines.reduce((s, l) => s + l.debit, 0),
    payments: lines.reduce((s, l) => s + l.credit, 0),
  }), [lines]);
  const balance = totals.invoices - totals.payments;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={selectedVendor ? `كشف حساب: ${selectedVendor.name}` : 'اختر موردًا لعرض كشف حسابه'}>
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
              <option value="">— اختر المورد —</option>
              {vendors.map(v => <option key={`${v.source}-${v.id}`} value={v.id}>{v.name}</option>)}
            </select>
          }
        />
      </div>

      {selectedVendor && (
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي فواتير الشراء</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{money(totals.invoices)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-500">إجمالي المدفوعات</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{money(totals.payments)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-500">الرصيد المستحق</span>
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
        ) : !selectedVendor ? (
          <InvEmpty icon={Truck} title="اختر موردًا من القائمة لعرض كشف الحساب" />
        ) : lines.length === 0 ? (
          <InvEmpty icon={ScrollText} title="لا توجد حركات لهذا المورد بعد" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'التاريخ', className: 'col-span-2' },
              { label: 'البيان', className: 'col-span-3' },
              { label: 'النوع', className: 'col-span-2' },
              { label: 'مدين (فواتير)', className: 'col-span-2' },
              { label: 'دائن (مدفوعات)', className: 'col-span-2' },
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
                    {l.kind === 'invoice' ? 'فاتورة شراء' : 'سند دفع'}
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
function VendorAgingView() {
  const [asOf, setAsOf] = useState(todayISO());
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const res = await apiRequest(`/accounting/aging/shop/${sid}?entity_type=vendor&as_of=${asOf}`);
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
            <span className="text-xs font-bold text-slate-500">إجمالي المستحق للموردين</span>
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
            <Truck size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-500">موردون لهم أرصدة</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{withBalance}</div>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : rows.length === 0 ? (
          <InvEmpty icon={FileText} title="لا توجد أرصدة مستحقة للموردين" />
        ) : (
          <InvTableCard
            columns={[
              { label: 'المورد', className: 'col-span-3' },
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
