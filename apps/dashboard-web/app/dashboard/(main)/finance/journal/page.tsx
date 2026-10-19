'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, X, BookOpen, Info, CheckCircle2, Undo2, Send, RotateCcw, Lock, Unlock } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type Account = { id: string; code: string; name: string; is_group: boolean; is_system: boolean; status: string };
type Line = { account_id: string; description: string; debit: number; credit: number };
type Entry = {
  id: string; number: string; entry_date: string; description: string;
  reference: string; status: string; total_debit: number; total_credit: number;
  reversed_by_entry_id: string;
  lines: { id: string; account_id: string; account_code: string; account_name: string; description: string; debit: number; credit: number }[];
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'bg-amber-100 text-amber-700' },
  posted: { label: 'مرحَّل', cls: 'bg-emerald-100 text-emerald-700' },
  reversed: { label: 'معكوس', cls: 'bg-rose-100 text-rose-700' },
};

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), description: '', reference: '' });
  const [lines, setLines] = useState<Line[]>([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 },
  ]);

  const leafAccounts = accounts.filter(a => !a.is_group && a.status === 'active');
  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const [accRes, jeRes] = await Promise.all([
        apiRequest(`/accounting/accounts/shop/${sid}`),
        apiRequest(`/accounting/journal/shop/${sid}${filterStatus ? `?status=${filterStatus}` : ''}`),
      ]);
      const accData = Array.isArray(accRes) ? accRes : (accRes?.data || []);
      setAccounts(accData);
      setEntries(Array.isArray(jeRes) ? jeRes : (jeRes?.data || []));
    } catch { setEntries([]); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ entry_date: new Date().toISOString().slice(0, 10), description: '', reference: '' });
    setLines([
      { account_id: '', description: '', debit: 0, credit: 0 },
      { account_id: '', description: '', debit: 0, credit: 0 },
    ]);
    setEditId(null); setModal('add');
  };

  const openEdit = (e: Entry) => {
    setForm({ entry_date: e.entry_date, description: e.description, reference: e.reference || '' });
    setLines(e.lines.map(l => ({ account_id: l.account_id, description: l.description, debit: l.debit, credit: l.credit })));
    setEditId(e.id); setModal('edit');
  };

  const closeModal = () => setModal(null);

  const setLine = (i: number, patch: Partial<Line>) => setLines(prev =>
    prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
  );

  const addLine = () => setLines(prev => [...prev, { account_id: '', description: '', debit: 0, credit: 0 }]);
  const removeLine = (i: number) => setLines(prev => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));

  const save = async () => {
    if (!isBalanced) { alert('القيد غير متوازن — مجموع المدين يجب أن يساوي الدائن'); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({ ...form, lines: lines.filter(l => l.account_id) });
      if (modal === 'edit' && editId) {
        await apiRequest(`/accounting/journal/${editId}`, { method: 'PUT', body });
      } else {
        await apiRequest(`/accounting/journal/shop/${shopId}`, { method: 'POST', body });
      }
      closeModal(); await load();
    } catch (e: any) { alert(e?.message || 'حدث خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const post = async (id: string) => {
    if (!confirm('ترحيل القيد؟ لن يمكن تعديله بعد الترحيل.')) return;
    try { await apiRequest(`/accounting/journal/${id}/post`, { method: 'POST' }); await load(); }
    catch (e: any) { alert(e?.message || 'فشل الترحيل'); }
  };

  const reverse = async (id: string) => {
    if (!confirm('إنشاء قيد عكسي لهذا القيد؟')) return;
    try { await apiRequest(`/accounting/journal/${id}/reverse`, { method: 'POST' }); await load(); }
    catch (e: any) { alert(e?.message || 'فشل العكس'); }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف القيد؟')) return;
    try { await apiRequest(`/accounting/journal/${id}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { alert(e?.message || 'فشل الحذف'); }
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">القيود المحاسبية</h1>
            <p className="text-sm text-slate-500 font-bold">قيد مزدوج — كل قيد يجب أن يتوازن (مدين = دائن)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
            <option value="">كل الحالات</option>
            <option value="draft">مسودات</option>
            <option value="posted">مرحَّلة</option>
            <option value="reversed">معكوسة</option>
          </select>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
            <Plus size={16} /> قيد جديد
          </button>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
        <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800 leading-relaxed font-bold">
          القيد يتكون من سطرين على الأقل: طرف مدين وطرف دائن. لا يمكن الترحيل قبل التوازن.
          القيود المرحَّلة مقفلة للتعديل ويمكن عكسها بقيد عكسي.
        </p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">لا توجد قيود بعد — اضغط "قيد جديد"</div>
        ) : entries.map(e => {
          const sm = STATUS_META[e.status] || STATUS_META.draft;
          return (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-500">{e.number}</span>
                  <span className="font-bold text-slate-800 text-sm">{e.description}</span>
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${sm.cls}`}>{sm.label}</span>
                  {e.reference && <span className="text-[11px] text-slate-400 font-bold">مرجع: {e.reference}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">{e.entry_date}</span>
                  {e.status === 'draft' && (
                    <>
                      <button onClick={() => openEdit(e)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">تعديل</button>
                      <button onClick={() => post(e.id)} className="flex items-center gap-1 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg"><Send size={12} /> ترحيل</button>
                      <button onClick={() => remove(e.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="حذف"><Trash2 size={14} /></button>
                    </>
                  )}
                  {e.status === 'posted' && !e.reversed_by_entry_id && (
                    <button onClick={() => reverse(e.id)} className="flex items-center gap-1 text-xs font-black text-amber-700 hover:bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg"><Undo2 size={12} /> قيد عكسي</button>
                  )}
                  {e.status === 'reversed' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500"><RotateCcw size={12} /> تم عكسه</span>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 font-black border-b border-slate-100">
                    <th className="px-4 py-2 text-right">الحساب</th>
                    <th className="px-4 py-2 text-right">البيان</th>
                    <th className="px-4 py-2 text-left">مدين</th>
                    <th className="px-4 py-2 text-left">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {(e.lines || []).map(l => (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2"><span className="font-mono text-xs text-slate-400">{l.account_code}</span> <span className="font-bold text-slate-700">{l.account_name}</span></td>
                      <td className="px-4 py-2 text-slate-500 text-xs">{l.description || '—'}</td>
                      <td className="px-4 py-2 text-left font-mono tabular-nums text-slate-800 font-bold">{l.debit ? l.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
                      <td className="px-4 py-2 text-left font-mono tabular-nums text-slate-800 font-bold">{l.credit ? l.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black text-xs">
                    <td className="px-4 py-2" colSpan={2}>الإجمالي</td>
                    <td className="px-4 py-2 text-left font-mono tabular-nums">{(e.total_debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-left font-mono tabular-nums">{(e.total_credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4" onClick={ev => ev.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">{modal === 'edit' ? 'تعديل القيد' : 'قيد جديد'}</h3>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1">التاريخ</label>
                <input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-black text-slate-600 block mb-1">البيان</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="مثال: دفع إيجار شهر يناير" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-600 block mb-1">المرجع (اختياري)</label>
              <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 font-black border-b border-slate-200">
                    <th className="px-3 py-2 text-right w-2/5">الحساب</th>
                    <th className="px-3 py-2 text-right">البيان</th>
                    <th className="px-3 py-2 text-left w-28">مدين</th>
                    <th className="px-3 py-2 text-left w-28">دائن</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-1.5">
                        <select value={l.account_id} onChange={e => setLine(i, { account_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white">
                          <option value="">— اختر الحساب —</option>
                          {leafAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input value={l.description} onChange={e => setLine(i, { description: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min="0" value={l.debit || ''} onChange={e => setLine(i, { debit: Number(e.target.value) || 0, credit: 0 })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-left" dir="ltr" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min="0" value={l.credit || ''} onChange={e => setLine(i, { credit: Number(e.target.value) || 0, debit: 0 })} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-left" dir="ltr" />
                      </td>
                      <td className="px-1 py-1.5">
                        <button onClick={() => removeLine(i)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400" title="حذف السطر"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addLine} className="w-full py-2 text-xs font-black text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1.5 border-t border-slate-100">
                <Plus size={13} /> إضافة سطر
              </button>
            </div>

            <div className={`flex items-center justify-between px-4 py-3 rounded-xl font-black text-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              <div className="flex items-center gap-2">
                {isBalanced ? <CheckCircle2 size={18} /> : <Lock size={18} />}
                {isBalanced ? 'القيد متوازن' : 'القيد غير متوازن — لا يمكن الحفظ والترحيل'}
              </div>
              <div className="font-mono tabular-nums" dir="ltr">
                مدين: {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} | دائن: {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <button onClick={save} disabled={saving || !isBalanced || !form.description} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
              {modal === 'edit' ? 'حفظ التعديلات' : 'حفظ القيد (مسودة)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
