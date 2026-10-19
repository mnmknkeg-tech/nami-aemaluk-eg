'use client';

import React, { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, Percent, Info, Loader2 } from 'lucide-react';
import { useLocalCollection } from '@/lib/localStore';
import LocalDataNotice from '@/components/LocalDataNotice';

type Tier = {
  id: string;
  name: string;
  discount: string;
  minQty: string;
  segment: string;
};

const SEGMENTS = ['عملاء الجملة', 'الموزعين', 'المؤسسات', 'شرائح مخصصة'];

export default function WholesalePricingPage() {
  const { items: tiers, ready, add, remove } = useLocalCollection<Tier>('wholesale-tiers');
  const [form, setForm] = useState({ name: '', discount: '', minQty: '', segment: SEGMENTS[0] });

  useEffect(() => {
    // seed with sensible defaults the first time
    if (ready && tiers.length === 0 && !window.localStorage.getItem('nami-local-wholesale-tiers-seeded')) {
      add({ name: 'جملة نصف', discount: '10', minQty: '10', segment: SEGMENTS[0] });
      add({ name: 'جملة كاملة', discount: '20', minQty: '50', segment: 'الموزعين' });
      window.localStorage.setItem('nami-local-wholesale-tiers-seeded', '1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    add({ ...form, discount: form.discount || '0', minQty: form.minQty || '0' });
    setForm({ name: '', discount: '', minQty: '', segment: SEGMENTS[0] });
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Tags size={22} className="text-cyan-600" />
          أسعار الجملة
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1">شرائح تسعير للجملة — كل شريحة ليها نسبة خصم وحد أدنى للكمية</p>
      </div>

      <LocalDataNotice />

      {/* Add tier */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 mb-1">اسم الشريحة</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: جملة نصف"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">خصم %</label>
            <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="10"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">أقل كمية</label>
            <input type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} placeholder="10"
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 mb-1">الشريحة المستهدفة</label>
            <select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })}
              className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors">
            <Plus size={14} />
            إضافة
          </button>
        </div>
      </div>

      {/* Tiers list */}
      {!ready ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : tiers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Tags size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">لا توجد شرائح جملة بعد</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {tiers.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-4 group flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black text-sm">
                  -{t.discount}%
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">{t.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Percent size={10} />
                    أقل كمية: {t.minQty} · {t.segment}
                  </div>
                </div>
              </div>
              <button onClick={() => { if (confirm(`حذف شريحة "${t.name}"؟`)) remove(t.id); }}
                className="p-2 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-4">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
          الشرائح دي هتتربط بشرائح العملاء الموجودة عندك في «الشرائح» — العميل اللي في شريحة جملة بياخد الخصم أوتوماتيك على الكميات الكبيرة.
        </p>
      </div>
    </div>
  );
}
