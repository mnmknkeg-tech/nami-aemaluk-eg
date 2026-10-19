'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText, RefreshCw, Trash2, CheckCircle2, Clock3, Wrench, XCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, SearchInput, EmptyState, BTN_GHOST,
  fmtDate,
} from '@/components/admin/ui';

type TicketStatus = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

const STATUS_FILTERS: { value: TicketStatus; label: string }[] = [
  { value: 'ALL', label: 'الكل' },
  { value: 'PENDING', label: 'جديد' },
  { value: 'IN_PROGRESS', label: 'قيد المعالجة' },
  { value: 'RESOLVED', label: 'تم الحل' },
  { value: 'REJECTED', label: 'مرفوض' },
];

export default function AdminContentPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TicketStatus>('ALL');

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await apiRequest(`/feedback?take=50&skip=0&status=${status}&q=${encodeURIComponent(q)}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحميل المحتوى', variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [status]);

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((x) => {
      const comment = String(x?.comment || x?.content || x?.text || '').toLowerCase();
      const uName = String(x?.user?.name || x?.userName || x?.user_name || '').toLowerCase();
      const uEmail = String(x?.user?.email || x?.userEmail || x?.user_email || '').toLowerCase();
      return comment.includes(query) || uName.includes(query) || uEmail.includes(query);
    });
  }, [items, q]);

  const setTicketStatus = async (id: string, next: string) => {
    try {
      await apiRequest(`/feedback/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setItems((prev) => prev.map((x) => (String(x?.id) === String(id) ? { ...x, status: next } : x)));
      toast({ title: 'تم تحديث الحالة', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحديث الحالة', variant: 'destructive' });
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await apiRequest(`/feedback/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => String(x?.id) !== String(id)));
      toast({ title: 'تم الحذف', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل الحذف', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="إدارة المحتوى"
        subtitle="مراجعة وإدارة تذاكر المحتوى"
        tone="purple"
        actions={
          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className={BTN_GHOST}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            تحديث
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2 p-5">
          <SearchInput
            value={q}
            onChange={setQ}
            onSubmit={() => loadData(true)}
            placeholder="ابحث في المحتوى..."
          />
        </Panel>

        <Panel className="p-5">
          <div className="text-slate-500 text-xs font-black uppercase tracking-wider mb-3">الحالة</div>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`px-3 py-2 rounded-2xl text-xs font-black transition-colors ${
                  status === s.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {loading ? (
        <Panel><LoadingBlock /></Panel>
      ) : (
        <Panel>
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="لا توجد تذاكر" />
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((x) => {
                const created = new Date(x?.createdAt || x?.created_at || 0);
                const createdText = !Number.isNaN(created.getTime()) ? fmtDate(created) : '';
                const userName = x?.user?.name || x?.userName || x?.user_name || 'مستخدم';
                const userEmail = x?.user?.email || x?.userEmail || x?.user_email || '';
                const msg = x?.comment || x?.content || x?.text || '';
                const st = String(x?.status || 'PENDING').toUpperCase();

                return (
                  <div key={String(x?.id)} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border ${
                              st === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : st === 'IN_PROGRESS'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : st === 'REJECTED'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {st === 'RESOLVED'
                              ? <CheckCircle2 size={14} />
                              : st === 'IN_PROGRESS'
                                ? <Wrench size={14} />
                                : st === 'REJECTED'
                                  ? <XCircle size={14} />
                                  : <Clock3 size={14} />}
                            {STATUS_FILTERS.find((s) => s.value === st)?.label || 'جديد'}
                          </span>
                          <div className="text-slate-800 font-black text-sm">{userName}</div>
                          {userEmail && <div className="text-slate-400 font-bold text-xs">{userEmail}</div>}
                          {createdText && <div className="text-slate-400 font-bold text-xs">{createdText}</div>}
                        </div>
                        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-slate-700 font-bold text-sm leading-7">
                          {msg || '—'}
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2">
                        <button
                          onClick={() => setTicketStatus(String(x?.id), 'IN_PROGRESS')}
                          className="px-4 py-2 rounded-2xl text-xs font-black bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100"
                        >
                          قيد المعالجة
                        </button>
                        <button
                          onClick={() => setTicketStatus(String(x?.id), 'RESOLVED')}
                          className="px-4 py-2 rounded-2xl text-xs font-black bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        >
                          تم الحل
                        </button>
                        <button
                          onClick={() => setTicketStatus(String(x?.id), 'REJECTED')}
                          className="px-4 py-2 rounded-2xl text-xs font-black bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                        >
                          رفض
                        </button>
                        <button
                          onClick={() => deleteTicket(String(x?.id))}
                          className="px-4 py-2 rounded-2xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
