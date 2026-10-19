'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type AuditEntry = {
  id: string; shop_id: string; user_id: string; user_name: string;
  action: string; entity_type: string; entity_id: string;
  summary: string; created_at: string;
};

const ACTION_AR: Record<string, { label: string; cls: string }> = {
  create: { label: 'إنشاء', cls: 'bg-blue-100 text-blue-700' },
  update: { label: 'تعديل', cls: 'bg-amber-100 text-amber-700' },
  post: { label: 'ترحيل', cls: 'bg-emerald-100 text-emerald-700' },
  reverse: { label: 'عكس', cls: 'bg-purple-100 text-purple-700' },
  cancel: { label: 'إلغاء', cls: 'bg-rose-100 text-rose-700' },
  delete: { label: 'حذف', cls: 'bg-rose-100 text-rose-700' },
  close: { label: 'إقفال', cls: 'bg-rose-100 text-rose-700' },
  reopen: { label: 'إعادة فتح', cls: 'bg-amber-100 text-amber-700' },
  generate: { label: 'توليد', cls: 'bg-teal-100 text-teal-700' },
  submit: { label: 'تقديم', cls: 'bg-emerald-100 text-emerald-700' },
};

const TYPE_AR: Record<string, string> = {
  journal: 'قيد', invoice: 'فاتورة', payment: 'دفعة', period: 'فترة',
  tax_return: 'إقرار ضريبي', tax_rate: 'نسبة ضريبة', account: 'حساب', entity: 'عميل/مورد',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async (t = typeFilter, a = actionFilter) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const params = new URLSearchParams();
      if (t) params.set('type', t);
      if (a) params.set('action', a);
      const res = await apiRequest(`/accounting/audit-log/shop/${sid}?${params.toString()}`);
      setEntries(Array.isArray(res) ? res : (res?.data || []));
    } catch { setEntries([]); } finally { setLoading(false); }
  }, [typeFilter, actionFilter]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center text-white">
            <History size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">سجل التغييرات (Audit Log)</h1>
            <p className="text-sm text-slate-500 font-bold">كل عملية: مين عملها وإمتى — مرجع قانوني للمراجعة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); load(e.target.value, actionFilter); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); load(typeFilter, e.target.value); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-white">
            <option value="">كل العمليات</option>
            {Object.entries(ACTION_AR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => load()} className="flex items-center gap-2 border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50">
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-500" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">لا سجلات بعد — أي عملية ترحيل/إقفال هتظهر هنا</div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-black">
                <th className="px-3 py-3 text-right">الوقت</th>
                <th className="px-3 py-3 text-right">النوع</th>
                <th className="px-3 py-3 text-right">العملية</th>
                <th className="px-3 py-3 text-right">الوصف</th>
                <th className="px-3 py-3 text-right">المستخدم</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(a => {
                const act = ACTION_AR[a.action] || { label: a.action, cls: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-bold" dir="ltr">{new Date(a.created_at).toLocaleString('ar-EG')}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-700">{TYPE_AR[a.entity_type] || a.entity_type}</td>
                    <td className="px-3 py-2.5"><span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${act.cls}`}>{act.label}</span></td>
                    <td className="px-3 py-2.5 text-slate-700 font-bold">{a.summary || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-bold font-mono" dir="ltr">{a.user_id ? a.user_id.slice(0, 8) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}