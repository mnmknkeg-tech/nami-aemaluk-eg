'use client';

/**
 * النقدية والبنوك والمحافظ — السيولة الفعلية فقط.
 * الحسابات النقدية هي حسابات أصول من دليل الحسابات (مصدر واحد للحقيقة)،
 * وحركة كل حساب تُشتق من القيود المرحّلة، وأي عملية (تحويل/تسوية) قيد متوازن.
 */
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Edit,
  X,
  Info,
  RefreshCw,
  Landmark,
  Smartphone,
  Banknote,
  CreditCard,
  Loader2,
  ArrowLeftRight,
  Scale,
  Eye,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
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
  parent_id: string | null;
  is_group: boolean;
  is_system: boolean;
  opening_balance: number;
  status: string;
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

function kindOf(a: Account): 'cash' | 'bank' | 'mobile' | 'gateway' | 'custody' | 'other' {
  const s = `${a.code} ${a.name}`;
  if (/عهدة|عهد[ةه]|custody/i.test(s)) return 'custody';
  if (/بوابة|gateway|paymob|فوري|kashier/i.test(s)) return 'gateway';
  if (/محفظة|محفظه|فودافون|اتصالات|أورانج|اورانج|انستاباي|insta|vodafone|etisalat|wallet/i.test(s))
    return 'mobile';
  if (/بنك|bank|جاري/i.test(s)) return 'bank';
  if (/نقد|صندوق|كاش|cash/i.test(s)) return 'cash';
  return 'other';
}

const KIND_META: Record<string, { label: string; icon: any; cls: string }> = {
  cash: { label: 'نقدية / صندوق', icon: Banknote, cls: 'bg-emerald-100 text-emerald-700' },
  bank: { label: 'حساب بنكي', icon: Landmark, cls: 'bg-blue-100 text-blue-700' },
  mobile: { label: 'محفظة إلكترونية', icon: Smartphone, cls: 'bg-purple-100 text-purple-700' },
  gateway: { label: 'بوابة دفع', icon: CreditCard, cls: 'bg-cyan-100 text-cyan-700' },
  custody: { label: 'عهدة موظف', icon: Wallet, cls: 'bg-orange-100 text-orange-700' },
  other: { label: 'أصل نقدي آخر', icon: CreditCard, cls: 'bg-slate-100 text-slate-600' },
};

const SECTION_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'cash', label: 'النقدية والصناديق' },
  { id: 'bank', label: 'البنوك' },
  { id: 'mobile', label: 'المحافظ الإلكترونية' },
  { id: 'gateways', label: 'بوابات الدفع' },
  { id: 'custody', label: 'العهد' },
];

type DetailModal = { account: Account } | null;
type OpModal = { account: Account; op: 'transfer' | 'adjust' } | null;

function WalletsContent() {
  const [activeTab, setTab] = useInvSectionTab(
    SECTION_TABS.map((t) => t.id),
    'all'
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [shopId, setShopId] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', opening_balance: 0 });
  const [detail, setDetail] = useState<DetailModal>(null);
  const [opModal, setOpModal] = useState<OpModal>(null);
  const [opForm, setOpForm] = useState({
    targetId: '',
    amount: '',
    targetAmount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const balanceOf = (a: Account) => a.opening_balance + (a.debit_balance - a.credit_balance);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      setShopId(sid);
      const [accRes, jeRes] = await Promise.all([
        apiRequest(`/accounting/accounts/shop/${sid}`),
        apiRequest(`/accounting/journal/shop/${sid}?status=posted`).catch(() => ({ data: [] })),
      ]);
      const accData: Account[] = Array.isArray(accRes) ? accRes : accRes?.data || [];
      const jeData: JournalEntry[] = Array.isArray(jeRes) ? jeRes : jeRes?.data || [];
      setAccounts(accData);
      setEntries(jeData);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wallets = useMemo(
    () => accounts.filter((a) => a.type === 'asset' && !a.is_group && a.status === 'active'),
    [accounts]
  );

  const filtered = useMemo(() => {
    let list = wallets.filter((w) =>
      `${w.code} ${w.name}`.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (activeTab === 'gateways') list = list.filter((w) => kindOf(w) === 'gateway');
    else if (activeTab === 'custody') list = list.filter((w) => kindOf(w) === 'custody');
    else if (activeTab !== 'all') list = list.filter((w) => kindOf(w) === activeTab);
    return list;
  }, [wallets, debouncedSearch, activeTab]);

  /** حركة الحساب من القيود المرحّلة — نفس مصدر دفتر الأستاذ */
  const accountMovements = useCallback(
    (accountId: string) => {
      const rows: { entry: JournalEntry; line: JournalLine }[] = [];
      for (const e of entries) {
        for (const l of e.lines || []) {
          if (l.account_id === accountId) rows.push({ entry: e, line: l });
        }
      }
      rows.sort((a, b) => String(a.entry.entry_date).localeCompare(String(b.entry.entry_date)));
      let running = 0;
      return rows.map((r) => {
        running += Number(r.line.debit || 0) - Number(r.line.credit || 0);
        return { ...r, running };
      });
    },
    [entries]
  );

  const cashGroup =
    accounts.find(
      (a) =>
        a.type === 'asset' && a.is_group && /نقد|صندوق|بنك|cash|bank/i.test(`${a.code} ${a.name}`)
    ) || accounts.find((a) => a.type === 'asset' && a.is_group);
  const totalBalance = filtered.reduce((s, w) => s + balanceOf(w), 0);

  const openAdd = () => {
    setForm({ name: '', opening_balance: 0 });
    setEditItem(null);
    setError('');
    setModal('add');
  };
  const openEdit = (w: Account) => {
    setForm({ name: w.name, opening_balance: w.opening_balance });
    setEditItem(w);
    setError('');
    setModal('edit');
  };

  const save = async () => {
    if (!form.name) {
      setError('أدخل اسم الحساب');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (modal === 'edit' && editItem) {
        await apiRequest(`/accounting/accounts/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name, status: editItem.status }),
        });
      } else {
        const base = parseInt(cashGroup?.code || '1100', 10) || 1100;
        const used = new Set(accounts.map((a) => parseInt(a.code, 10) || 0));
        let candidate = base * 10 + 1;
        while (used.has(candidate)) candidate++;
        await apiRequest(`/accounting/accounts/shop/${shopId}`, {
          method: 'POST',
          body: JSON.stringify({
            code: String(candidate),
            name: form.name,
            type: 'asset',
            parent_id: cashGroup?.id || null,
            is_group: false,
            opening_balance: Number(form.opening_balance) || 0,
          }),
        });
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  /** عملية على الحساب النقدي = قيد محاسبي متوازن (تحويل بين حسابين أو تسوية رصيد) */
  const submitOp = async () => {
    if (!opModal) return;
    setSaving(true);
    setError('');
    try {
      const desc =
        opForm.description || (opModal.op === 'transfer' ? 'تحويل بين الحسابات' : 'تسوية رصيد');
      let lines: JournalLine[];
      if (opModal.op === 'transfer') {
        const amount = Number(opForm.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setError('أدخل مبلغًا صحيحًا');
          setSaving(false);
          return;
        }
        if (!opForm.targetId || opForm.targetId === opModal.account.id) {
          setError('اختر الحساب المقابل');
          setSaving(false);
          return;
        }
        const target = accounts.find((a) => a.id === opForm.targetId);
        // تحويل: خروج من الحساب ودخول للمقابل — لا يُسجل إيرادًا ولا مصروفًا
        lines = [
          {
            account_id: opForm.targetId,
            debit: amount,
            credit: 0,
            description: `تحويل من ${opModal.account.name}`,
          },
          {
            account_id: opModal.account.id,
            debit: 0,
            credit: amount,
            description: `تحويل إلى ${target?.name || ''}`,
          },
        ];
      } else {
        // تسوية: تعديل الفرق بين الدفتري والفعلي على نفس الحساب مقابل فروق التسويات
        const bal = balanceOf(opModal.account);
        const actual = Number(opForm.targetAmount);
        if (!opForm.targetAmount || !Number.isFinite(actual)) {
          setError('أدخل الرصيد الفعلي');
          setSaving(false);
          return;
        }
        const diff = Number((actual - bal).toFixed(2));
        if (Math.abs(diff) < 0.005) {
          setError('لا يوجد فرق للتسوية');
          setSaving(false);
          return;
        }
        const diffAccount = accounts.find((a) => /فروق|تسويات/i.test(a.name));
        if (!diffAccount) {
          setError('أنشئ حساب "فروق التسويات" من دليل الحسابات أولًا');
          setSaving(false);
          return;
        }
        lines =
          diff > 0
            ? [
                {
                  account_id: opModal.account.id,
                  debit: diff,
                  credit: 0,
                  description: `تسوية زيادة — ${desc}`,
                },
                {
                  account_id: diffAccount.id,
                  debit: 0,
                  credit: diff,
                  description: `تسوية — ${opModal.account.name}`,
                },
              ]
            : [
                {
                  account_id: diffAccount.id,
                  debit: Math.abs(diff),
                  credit: 0,
                  description: `تسوية — ${opModal.account.name}`,
                },
                {
                  account_id: opModal.account.id,
                  debit: 0,
                  credit: Math.abs(diff),
                  description: `تسوية نقص — ${desc}`,
                },
              ];
      }
      const created = await apiRequest(`/accounting/journal/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({
          entry_date: opForm.date,
          description: desc,
          reference: 'CASH-OP',
          lines,
        }),
      });
      const newId = created?.data?.id || created?.id;
      if (newId) await apiRequest(`/accounting/journal/${newId}/post`, { method: 'POST' });
      setOpModal(null);
      setOpForm({
        targetId: '',
        amount: '',
        targetAmount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'تعذر تنفيذ العملية');
    } finally {
      setSaving(false);
    }
  };

  const detailMovements = detail ? accountMovements(detail.account.id) : [];
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((w) => {
        const Meta = KIND_META[kindOf(w)];
        const Icon = Meta.icon;
        const bal = balanceOf(w);
        return (
          <div
            key={w.id}
            onClick={() => setDetail({ account: w })}
            className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${Meta.cls}`}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm">{w.name}</div>
                  <div className="text-[11px] font-bold text-slate-400 font-mono" dir="ltr">
                    {w.code}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(w);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                title="تعديل"
              >
                <Edit size={14} />
              </button>
            </div>
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-400">
                الرصيد الحالي — اضغط لكشف الحساب
              </div>
              <div
                className={`text-2xl font-black mt-1 ${bal < 0 ? 'text-rose-600' : 'text-slate-900'}`}
                dir="ltr"
              >
                ج.م {fmt(bal)}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className={`px-2 py-0.5 rounded-lg ${Meta.cls}`}>{Meta.label}</span>
              {w.is_system && <span className="text-slate-400">حساب أساسي</span>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">النقدية والبنوك والمحافظ</h1>
              <Info size={15} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              السيولة الفعلية — الصناديق والبنوك والمحافظ وبوابات الدفع والعهد، والأرصدة من القيود
              المرحّلة
            </p>
          </div>
        </div>
      </div>

      <SectionTabs tabs={SECTION_TABS} active={activeTab} onChange={setTab} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
        {/* Inline Stats Strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-1 mb-3 mt-1">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wallet size={13} className="text-sky-500" />
            <span className="font-bold text-slate-700">إجمالي السيولة</span>
            <span
              className={`font-black mr-0.5 ${totalBalance < 0 ? 'text-rose-600' : 'text-sky-600'}`}
            >
              ج.م {fmt(totalBalance)}
            </span>
          </span>
          <span className="hidden sm:block w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Banknote size={13} className="text-emerald-500" />
            <span className="font-bold text-slate-700">نقدية</span>
            <span className="font-black text-emerald-600 mr-0.5">
              ج.م{' '}
              {fmt(
                filtered.filter((w) => kindOf(w) === 'cash').reduce((s, w) => s + balanceOf(w), 0)
              )}
            </span>
          </span>
          <span className="hidden sm:block w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Landmark size={13} className="text-blue-500" />
            <span className="font-bold text-slate-700">بنوك</span>
            <span className="font-black text-blue-600 mr-0.5">
              ج.م{' '}
              {fmt(
                filtered.filter((w) => kindOf(w) === 'bank').reduce((s, w) => s + balanceOf(w), 0)
              )}
            </span>
          </span>
          <span className="hidden sm:block w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <CreditCard size={13} className="text-slate-400" />
            <span className="font-bold text-slate-700">عدد الحسابات</span>
            <span className="font-black text-slate-700 mr-0.5">{filtered.length}</span>
          </span>
        </div>

        <div className="mt-0">
          <InvToolbar hint="أي تغيير في الرصيد يتم بقيد محاسبي — لا تعديل يدوي على الأرصدة">
            <InvToolButton onClick={() => load()}>
              <RefreshCw size={14} />
              تحديث
            </InvToolButton>
            <InvToolButton primary onClick={openAdd}>
              <Plus size={14} />
              حساب نقدي جديد
            </InvToolButton>
          </InvToolbar>
        </div>

        <div className="mt-3">
          <InvControlsCard
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ابحث باسم الحساب…"
          />
        </div>

        {activeTab === 'gateways' || activeTab === 'custody' ? (
          <div className="mt-4">
            {!loading && filtered.length === 0 ? (
              <InvEmpty
                icon={CreditCard}
                title={
                  activeTab === 'gateways'
                    ? 'لا توجد حسابات بوابات دفع — أضف حسابًا باسم البوابة (مثال: Paymob / فوري) ليظهر هنا تلقائيًا'
                    : 'لا توجد عهد موظفين — أضف حسابًا باسم "عهدة — اسم الموظف" ليظهر هنا'
                }
              />
            ) : loading ? (
              <InvLoading />
            ) : (
              renderCards()
            )}
          </div>
        ) : loading ? (
          <div className="mt-4">
            <InvLoading />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4">
            <InvEmpty
              icon={Wallet}
              title="لا توجد حسابات — أضف صندوقًا نقديًا أو حسابًا بنكيًا للبدء"
            />
          </div>
        ) : (
          renderCards()
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">
                {modal === 'edit' ? 'تعديل الحساب' : 'حساب نقدي جديد'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">اسم الحساب</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: صندوق الفرع / فودافون كاش / بنك مصر"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
              />
            </div>
            {modal === 'add' && (
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1">
                  الرصيد الافتتاحي
                </label>
                <input
                  type="number"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                  dir="ltr"
                />
              </div>
            )}
            {modal === 'edit' && editItem && (
              <p className="text-xs font-bold text-slate-500 bg-slate-50 rounded-xl p-3">
                الأرصدة تُحدَّث تلقائيًا من القيود المحاسبية — لتغيير الرصيد استخدم تسوية أو قيدًا
                في دفتر اليومية.
              </p>
            )}
            <button
              onClick={save}
              disabled={saving || !form.name}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {modal === 'edit' ? 'حفظ التعديلات' : 'إضافة الحساب'}
            </button>
          </div>
        </div>
      )}

      {/* تفاصيل الحساب + الحركة */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900">{detail.account.name}</h3>
                <p className="text-[11px] font-bold text-slate-400 font-mono" dir="ltr">
                  {detail.account.code}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <InvToolButton
                  onClick={() => {
                    setOpModal({ account: detail.account, op: 'transfer' });
                    setDetail(null);
                  }}
                >
                  <ArrowLeftRight size={14} />
                  تحويل
                </InvToolButton>
                <InvToolButton
                  onClick={() => {
                    setOpModal({ account: detail.account, op: 'adjust' });
                    setDetail(null);
                  }}
                >
                  <Scale size={14} />
                  تسوية
                </InvToolButton>
                <button
                  onClick={() => setDetail(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {(() => {
              const bal = balanceOf(detail.account);
              const totalIn = detailMovements.reduce((s, m) => s + Number(m.line.debit || 0), 0);
              const totalOut = detailMovements.reduce((s, m) => s + Number(m.line.credit || 0), 0);
              return (
                <>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-slate-400">الرصيد الحالي</div>
                      <div
                        className={`text-base font-black mt-1 ${bal < 0 ? 'text-rose-600' : 'text-slate-900'}`}
                      >
                        ج.م {fmt(bal)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-slate-400">الرصيد الافتتاحي</div>
                      <div className="text-base font-black mt-1 text-slate-900">
                        ج.م {fmt(detail.account.opening_balance)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-slate-400">
                        إجمالي الداخل (مدين)
                      </div>
                      <div className="text-base font-black mt-1 text-emerald-600">
                        ج.م {fmt(totalIn)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-slate-400">
                        إجمالي الخارج (دائن)
                      </div>
                      <div className="text-base font-black mt-1 text-rose-600">
                        ج.م {fmt(totalOut)}
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500">
                      <div className="col-span-2 text-right">التاريخ</div>
                      <div className="col-span-2 text-right">رقم القيد</div>
                      <div className="col-span-3 text-right">البيان</div>
                      <div className="col-span-1 text-right">مدين</div>
                      <div className="col-span-1 text-right">دائن</div>
                      <div className="col-span-3 text-right">الرصيد</div>
                    </div>
                    {detailMovements.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-sm font-bold">
                        لا توجد حركات بعد — الحركات تُسجل من القيود والفواتير والمصروفات
                      </div>
                    ) : (
                      detailMovements.map((m, i) => (
                        <div
                          key={`${m.entry.id}-${i}`}
                          className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-slate-100 text-xs sm:text-sm hover:bg-slate-50"
                        >
                          <div className="col-span-2 text-slate-600">
                            {new Date(m.entry.entry_date).toLocaleDateString('ar-EG')}
                          </div>
                          <div
                            className="col-span-2 font-bold text-slate-700 font-mono text-[11px]"
                            dir="ltr"
                          >
                            {m.entry.number || '—'}
                          </div>
                          <div className="col-span-3 text-slate-600 truncate">
                            {m.line.description || m.entry.description}
                          </div>
                          <div className="col-span-1 font-bold text-emerald-600">
                            {Number(m.line.debit) > 0 ? fmt(Number(m.line.debit)) : '—'}
                          </div>
                          <div className="col-span-1 font-bold text-rose-600">
                            {Number(m.line.credit) > 0 ? fmt(Number(m.line.credit)) : '—'}
                          </div>
                          <div className="col-span-3 font-bold text-slate-900">
                            ج.م {fmt(m.running)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* تحويل / تسوية */}
      {opModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setOpModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">
                {opModal.op === 'transfer'
                  ? `تحويل من ${opModal.account.name}`
                  : `تسوية رصيد ${opModal.account.name}`}
              </h3>
              <button
                onClick={() => setOpModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">
                {error}
              </div>
            )}
            {opModal.op === 'transfer' ? (
              <>
                <div className="text-[12px] font-bold text-slate-500 bg-slate-50 rounded-xl p-3">
                  التحويل بين حسابين نقديين لا يُسجل إيرادًا ولا مصروفًا — قيد متوازن بمدين ودائن.
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">إلى حساب</label>
                  <select
                    value={opForm.targetId}
                    onChange={(e) => setOpForm({ ...opForm, targetId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                  >
                    <option value="">— اختر الحساب —</option>
                    {wallets
                      .filter((w) => w.id !== opModal.account.id)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (رصيد ج.م {fmt(balanceOf(w))})
                        </option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="text-[12px] font-bold text-slate-500 bg-slate-50 rounded-xl p-3">
                  أدخل الرصيد الفعلي بعد الجرد — يُنشأ قيد بالفرق تلقائيًا مقابل حساب "فروق
                  التسويات".
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">
                    الرصيد الدفتري
                  </label>
                  <div
                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black bg-slate-50"
                    dir="ltr"
                  >
                    ج.م {fmt(balanceOf(opModal.account))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">
                    الرصيد الفعلي
                  </label>
                  <input
                    type="number"
                    value={opForm.targetAmount ?? ''}
                    onChange={(e) =>
                      setOpForm({
                        ...opForm,
                        targetAmount: e.target.value,
                        targetId: opForm.targetId,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                    dir="ltr"
                  />
                </div>
              </>
            )}
            {opModal.op === 'transfer' && (
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1">المبلغ</label>
                <input
                  type="number"
                  value={opForm.amount}
                  onChange={(e) => setOpForm({ ...opForm, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
                  dir="ltr"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">التاريخ</label>
              <input
                type="date"
                value={opForm.date}
                onChange={(e) => setOpForm({ ...opForm, date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">
                البيان (اختياري)
              </label>
              <input
                type="text"
                value={opForm.description}
                onChange={(e) => setOpForm({ ...opForm, description: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold"
              />
            </div>
            <button
              onClick={submitOp}
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
              تنفيذ وترحيل القيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <WalletsContent />
    </Suspense>
  );
}
