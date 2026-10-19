'use client';

import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, MapPin, Phone, User, Star, Loader2 } from 'lucide-react';
import { useLocalCollection } from '@/lib/localStore';

type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  type: 'main' | 'sub';
  monthlyTarget: string;
  status: 'active' | 'paused';
};

const emptyForm = { name: '', address: '', phone: '', manager: '', type: 'sub' as 'main' | 'sub', monthlyTarget: '', status: 'active' as 'active' | 'paused' };

export default function BranchesPage() {
  const { items: branches, ready, add, update, remove } = useLocalCollection<Branch>('branches');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<{
    name: string; address: string; phone: string; manager: string;
    type: 'main' | 'sub'; monthlyTarget: string; status: 'active' | 'paused';
  }>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ ...b }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setTimeout(() => {
      if (editing) update(editing.id, { ...form, monthlyTarget: form.monthlyTarget || '0' });
      else add({ ...form, monthlyTarget: form.monthlyTarget || '0' });
      setSaving(false);
      setModalOpen(false);
    }, 250);
  };

  const activeCount = branches.filter((b) => b.status === 'active').length;
  const totalTarget = branches.reduce((s, b) => s + Number(b.monthlyTarget || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Building2 size={22} className="text-blue-600" />
            إدارة الفروع
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">سجّل فروعك وادارها من مكان واحد — المتابعة المالية والمخزنية لكل فرع</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors">
          <Plus size={16} />
          إضافة فرع
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'إجمالي الفروع', value: branches.length, icon: Building2, cls: 'text-blue-600 bg-blue-50' },
          { label: 'فروع نشطة', value: activeCount, icon: Star, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'الفرع الرئيسي', value: branches.filter((b) => b.type === 'main').length, icon: Star, cls: 'text-amber-600 bg-amber-50' },
          { label: 'مستهدف شهري مجمع', value: `ج.م ${totalTarget.toLocaleString()}`, icon: Star, cls: 'text-cyan-600 bg-cyan-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.cls}`}>
              <s.icon size={16} />
            </div>
            <div className="text-lg font-black text-slate-900">{s.value}</div>
            <div className="text-[10px] font-bold text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Branch list */}
      {!ready ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد فروع مسجلة بعد</h3>
          <p className="text-slate-400 font-medium text-sm mb-6 max-w-md mx-auto">ابدأ بإضافة الفرع الرئيسي ثم باقي الفروع لتتابع أداء كل موقع على حدة.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
            <Plus size={18} />
            إضافة أول فرع
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-4 group hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${b.type === 'main' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Building2 size={17} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      {b.name}
                      {b.type === 'main' && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">رئيسي</span>}
                    </div>
                    <span className={`text-[10px] font-bold ${b.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {b.status === 'active' ? '● نشط' : '● متوقف'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-slate-50 rounded-lg"><Pencil size={14} className="text-slate-400" /></button>
                  <button onClick={() => { if (confirm(`حذف فرع "${b.name}"؟`)) remove(b.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] font-bold text-slate-500">
                {b.address && <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-300 shrink-0" />{b.address}</div>}
                {b.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-300 shrink-0" />{b.phone}</div>}
                {b.manager && <div className="flex items-center gap-2"><User size={12} className="text-slate-300 shrink-0" />{b.manager}</div>}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-50">
                  <span className="text-slate-400">المستهدف الشهري</span>
                  <span className="text-slate-900 font-black">ج.م {Number(b.monthlyTarget || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h3 className="text-base font-black text-slate-900 mb-4">{editing ? 'تعديل الفرع' : 'إضافة فرع جديد'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">اسم الفرع *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: فرع مدينة نصر"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">النوع</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'main' | 'sub' })}
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                    <option value="sub">فرع فرعي</option>
                    <option value="main">رئيسي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'paused' })}
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                    <option value="active">نشط</option>
                    <option value="paused">متوقف</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">العنوان</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="العنوان بالتفصيل"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">الهاتف</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx"
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">مدير الفرع</label>
                  <input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder="اسم المسؤول"
                    className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">المستهدف الشهري (ج.م)</label>
                <input type="number" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} placeholder="0"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'حفظ التعديلات' : 'إضافة الفرع'}
              </button>
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-black hover:bg-slate-100 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
