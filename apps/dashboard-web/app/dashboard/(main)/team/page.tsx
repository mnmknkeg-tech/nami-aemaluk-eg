'use client';

import React, { useState } from 'react';
import { UsersRound, Plus, Pencil, Trash2, Phone, Loader2, Building2, ShieldCheck } from 'lucide-react';
import { useLocalCollection } from '@/lib/localStore';
import { useLocalCollection as useCollection } from '@/lib/localStore';

type Member = {
  id: string;
  name: string;
  phone: string;
  role: string;
  branchId: string;
  status: 'active' | 'suspended';
};

const ROLES = [
  { id: 'manager', label: 'مدير عام', desc: 'كل الصلاحيات' },
  { id: 'branch_manager', label: 'مدير فرع', desc: 'إدارة فرع محدد' },
  { id: 'accountant', label: 'محاسب', desc: 'المالية والمحاسبة' },
  { id: 'cashier', label: 'كاشير', desc: 'الكاشير والطلبات' },
  { id: 'storekeeper', label: 'أمين مخزن', desc: 'المخزون والموردين' },
  { id: 'marketer', label: 'مسوق', desc: 'التسويق والعروض' },
];

const emptyForm = { name: '', phone: '', role: 'cashier', branchId: '', status: 'active' as 'active' | 'suspended' };

export default function TeamPage() {
  const { items: members, ready, add, update, remove } = useLocalCollection<Member>('team-members');
  const { items: branches } = useCollection<{ id: string; name: string }>('branches');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<{ name: string; phone: string; role: string; branchId: string; status: 'active' | 'suspended' }>(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setForm({ ...m }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) update(editing.id, { ...form });
    else add({ ...form });
    setModalOpen(false);
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name || 'كل الفروع';
  const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label || id;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <UsersRound size={22} className="text-teal-600" />
            المستخدمون
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">فريق عملك وصلاحيات كل واحد — كل عضو يشوف اللي يخصه بس</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors">
          <Plus size={16} />
          إضافة عضو
        </button>
      </div>

      {!ready ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <UsersRound size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">لا يوجد أعضاء فريق بعد</h3>
          <p className="text-slate-400 font-medium text-sm mb-6 max-w-md mx-auto">أضف موظفيك وحدد دور كل واحد: كاشير، محاسب، مدير فرع — وكل دور له صلاحيات مختلفة.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
            <Plus size={18} />
            إضافة أول عضو
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 group hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00E5FF] to-[#BD00FF] flex items-center justify-center text-white text-xs font-black">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">{m.name}</div>
                    <span className={`text-[10px] font-bold ${m.status === 'active' ? 'text-emerald-600' : 'text-red-400'}`}>
                      {m.status === 'active' ? '● نشط' : '● موقوف'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-slate-50 rounded-lg"><Pencil size={14} className="text-slate-400" /></button>
                  <button onClick={() => { if (confirm(`إزالة "${m.name}" من الفريق؟`)) remove(m.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-2"><ShieldCheck size={12} className="text-slate-300 shrink-0" />{roleLabel(m.role)}</div>
                <div className="flex items-center gap-2"><Building2 size={12} className="text-slate-300 shrink-0" />{branchName(m.branchId)}</div>
                {m.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-300 shrink-0" />{m.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h3 className="text-base font-black text-slate-900 mb-4">{editing ? 'تعديل عضو' : 'إضافة عضو جديد'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">الاسم *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العضو"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">الهاتف</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">الدور</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">الفرع</label>
                <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                  <option value="">كل الفروع</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">الحالة</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'suspended' })}
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                  <option value="active">نشط</option>
                  <option value="suspended">موقوف</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-40 transition-colors">
                {editing ? 'حفظ التعديلات' : 'إضافة العضو'}
              </button>
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-black hover:bg-slate-100 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
