'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Edit, Trash2, X, ChevronDown, ChevronLeft, FolderTree, Info, ShieldCheck, Wallet } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type Account = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  is_group: boolean;
  is_system: boolean;
  opening_balance: number;
  status: string;
  debit_balance: number;
  credit_balance: number;
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  asset: { label: 'أصول', color: 'bg-blue-100 text-blue-700' },
  liability: { label: 'التزامات', color: 'bg-amber-100 text-amber-700' },
  equity: { label: 'حقوق ملكية', color: 'bg-purple-100 text-purple-700' },
  revenue: { label: 'إيرادات', color: 'bg-emerald-100 text-emerald-700' },
  expense: { label: 'مصروفات', color: 'bg-rose-100 text-rose-700' },
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', type: 'asset' as Account['type'],
    parent_id: '', is_group: false, opening_balance: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const res = await apiRequest(`/accounting/accounts/shop/${sid}`);
      const data: Account[] = Array.isArray(res) ? res : (res?.data || []);
      setAccounts(data);
      setExpanded(new Set(data.filter(a => a.is_group && !a.parent_id).map(a => a.id)));
    } catch { setAccounts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const childrenOf = (parentId: string | null) =>
    accounts.filter(a => (a.parent_id || null) === (parentId || null));

  const netBalance = (a: Account) => {
    const raw = (a.type === 'asset' || a.type === 'expense')
      ? a.debit_balance - a.credit_balance
      : a.credit_balance - a.debit_balance;
    return a.opening_balance + raw;
  };

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const nextCode = (parentCode: string | null) => {
    if (!parentCode) {
      const roots = accounts.filter(a => !a.parent_id).map(a => parseInt(a.code) || 0);
      return String(Math.max(1000, ...roots.map(r => Math.floor(r / 1000) * 1000 + 1000)));
    }
    const base = parseInt(parentCode) || 0;
    const used = new Set(accounts.map(a => parseInt(a.code) || 0));
    let candidate = base * 10;
    while (used.has(candidate)) candidate++;
    return String(candidate);
  };

  const openAdd = (parentId?: string) => {
    const parent = parentId ? accounts.find(a => a.id === parentId) : null;
    setForm({
      code: nextCode(parent?.code || null),
      name: '', type: parent?.type || 'asset',
      parent_id: parentId || '', is_group: false, opening_balance: 0,
    });
    setEditItem(null); setModal('add');
  };

  const openEdit = (a: Account) => {
    setEditItem(a);
    setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id || '', is_group: a.is_group, opening_balance: a.opening_balance });
    setModal('edit');
  };

  const closeModal = () => setModal(null);

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'edit' && editItem) {
        await apiRequest(`/accounting/accounts/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name, parent_id: form.parent_id || null, status: 'active' }),
        });
      } else {
        await apiRequest(`/accounting/accounts/shop/${shopId}`, {
          method: 'POST',
          body: JSON.stringify({
            code: form.code, name: form.name, type: form.type,
            parent_id: form.parent_id || undefined,
            is_group: form.is_group,
            opening_balance: Number(form.opening_balance) || 0,
          }),
        });
      }
      closeModal(); await load();
    } catch (e: any) { alert(e?.message || 'حدث خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const remove = async (a: Account) => {
    if (!confirm(`حذف الحساب "${a.name}"؟`)) return;
    try {
      await apiRequest(`/accounting/accounts/${a.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) { alert(e?.message || 'تعذر الحذف'); }
  };

  const renderRow = (a: Account, depth: number): React.ReactNode[] => {
    const kids = childrenOf(a.id);
    const isOpen = expanded.has(a.id);
    const meta = TYPE_META[a.type] || TYPE_META.asset;
    const bal = netBalance(a);
    const rows: React.ReactNode[] = [];
    rows.push(
      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5" style={{ paddingRight: depth * 22 }}>
            {a.is_group ? (
              <button onClick={() => toggle(a.id)} className="p-0.5 hover:bg-slate-200 rounded">
                {isOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
              </button>
            ) : <span className="w-5" />}
            <span className="font-mono text-xs text-slate-500 font-bold">{a.code}</span>
            <span className="font-bold text-slate-800 text-sm">{a.name}</span>
            {a.is_group && <span className="text-[10px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 font-bold">مجموعة</span>}
            {a.is_system && <ShieldCheck size={13} className="text-emerald-500" aria-label="حساب نظامي" />}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${meta.color}`}>{meta.label}</span>
        </td>
        <td className="px-3 py-2.5 text-left font-mono text-sm text-slate-700 font-bold tabular-nums">{bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            {!a.is_group && (
              <button onClick={() => openAdd(a.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="إضافة حساب فرعي"><Plus size={14} /></button>
            )}
            <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600" title="تعديل"><Edit size={14} /></button>
            {!a.is_system && (
              <button onClick={() => remove(a)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="حذف"><Trash2 size={14} /></button>
            )}
          </div>
        </td>
      </tr>
    );
    if (a.is_group && isOpen) {
      for (const kid of kids) rows.push(...renderRow(kid, depth + 1));
    }
    return rows;
  };

  const roots = childrenOf(null);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <FolderTree size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">دليل الحسابات</h1>
            <p className="text-sm text-slate-500 font-bold">شجرة الحسابات الهرمية — الأصول، الالتزامات، حقوق الملكية، الإيرادات والمصروفات</p>
          </div>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
          <Plus size={16} /> حساب جديد
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 leading-relaxed font-bold">
          كل حساب يمكن أن يحتوي حسابات فرعية (اضغط السهم للتوسيع). الحسابات النظامية
          <ShieldCheck size={13} className="inline text-emerald-500 mx-1" />
          محمية من الحذف. رصيد الحساب يُحسب تلقائيًا من القيود المرحَّلة.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-right text-xs font-black text-slate-500">الحساب</th>
                <th className="px-3 py-3 text-right text-xs font-black text-slate-500">النوع</th>
                <th className="px-3 py-3 text-left text-xs font-black text-slate-500">الرصيد</th>
                <th className="px-3 py-3 text-right text-xs font-black text-slate-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {roots.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16 text-slate-400 font-bold">لا توجد حسابات — اضغط "حساب جديد" للبدء (سيتم إنشاء دليل حسابات افتراضي تلقائيًا)</td></tr>
              ) : roots.flatMap(a => renderRow(a, 0))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">{modal === 'edit' ? 'تعديل حساب' : 'حساب جديد'}</h3>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">كود الحساب</label>
              <input value={form.code} disabled={modal === 'edit'} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-slate-50 disabled:opacity-60" dir="ltr" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">اسم الحساب</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: النقدية بالصندوق" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
            </div>
            {modal === 'add' && (
              <>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">النوع</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Account['type'] })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">الحساب الأب (اختياري)</label>
                  <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
                    <option value="">— بدون (حساب رئيسي) —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isGroup" checked={form.is_group} onChange={e => setForm({ ...form, is_group: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="isGroup" className="text-sm font-bold text-slate-700">حساب مجموعة (لا تُسجل عليه قيود)</label>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1">رصيد افتتاحي</label>
                  <input type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" dir="ltr" />
                </div>
              </>
            )}
            <button onClick={save} disabled={saving || !form.name} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              {modal === 'edit' ? 'حفظ التعديلات' : 'إضافة الحساب'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}