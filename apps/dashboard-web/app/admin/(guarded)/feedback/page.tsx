'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare, User, Clock, CheckCircle2, Sparkles, Trash2, MessageCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, Badge, fmtDate, type Tone,
} from '@/components/admin/ui';

const FEEDBACK_STATUS: Record<string, { label: string; tone: Tone }> = {
  RESOLVED: { label: 'تم الحل', tone: 'green' },
  IN_PROGRESS: { label: 'قيد المعالجة', tone: 'sky' },
  REJECTED: { label: 'مرفوض', tone: 'red' },
  PENDING: { label: 'جديد', tone: 'amber' },
};

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actingId, setActingId] = useState('');

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/feedback');
      setFeedback(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: 'فشل تحميل التقييمات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeedback(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التقييم؟')) return;
    try {
      await apiRequest(`/feedback/${id}`, { method: 'DELETE' });
      toast({ title: 'تم الحذف', variant: 'success' });
      setFeedback((prev) => prev.filter((f) => String(f?.id) !== String(id)));
    } catch {
      toast({ title: 'فشل الحذف', variant: 'destructive' });
    }
  };

  // تحديث حالة التقييم (تم الحل / قيد المعالجة) بدون إعادة تحميل كامل
  const handleStatus = async (id: string, next: string) => {
    setActingId(String(id));
    try {
      await apiRequest(`/feedback/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setFeedback((prev) => prev.map((f) => (String(f?.id) === String(id) ? { ...f, status: next } : f)));
      toast({ title: next === 'RESOLVED' ? 'تم تحديد التقييم كمعالج' : 'تم تحديث الحالة', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحديث الحالة', variant: 'destructive' });
    } finally {
      setActingId('');
    }
  };

  const normalizeItem = (item: any) => {
    const userName = item?.user?.name || item?.userName || item?.user_name || 'مستخدم مجهول';
    const userEmail = item?.user?.email || item?.userEmail || item?.user_email || '';
    const content = item?.comment || item?.content || item?.text || '';
    const createdAt = item?.createdAt || item?.created_at || new Date().toISOString();
    const status = String(item?.status || item?.state || item?.ticketStatus || 'PENDING').toUpperCase();
    return { ...item, user_name: userName, user_email: userEmail, content, created_at: createdAt, status };
  };

  const normalizedFeedback = feedback.map(normalizeItem);
  const filtered = normalizedFeedback
    .filter((f) => statusFilter === 'all' || f.status === statusFilter)
    .filter((f) =>
      !search ||
      String(f.user_name).toLowerCase().includes(search.toLowerCase()) ||
      String(f.content).toLowerCase().includes(search.toLowerCase())
    );

  const statusCounts = normalizedFeedback.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="التقييمات والملاحظات"
        subtitle="آراء وملاحظات المستخدمين ومتابعة معالجتها"
        tone="cyan"
        actions={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="ابحث..."
            className="min-w-[220px]"
          />
        }
      />

      {/* فلتر الحالة بعدد كل نوع */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'الكل', tone: 'slate' as Tone },
          ...Object.entries(FEEDBACK_STATUS).map(([value, meta]) => ({ value, label: meta.label, tone: meta.tone })),
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-colors ${
              statusFilter === s.value
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {s.label}
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                statusFilter === s.value ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.value === 'all' ? normalizedFeedback.length : (statusCounts[s.value] || 0)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <Panel><EmptyState icon={MessageCircle} title="لا توجد تقييمات" /></Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const statusMeta = FEEDBACK_STATUS[item.status] || FEEDBACK_STATUS.PENDING;
            const busy = actingId === String(item.id);
            return (
              <Panel key={item.id} className="p-6 md:p-8 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-5 flex-row-reverse gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <User size={18} />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{item.user_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.user_email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-2">
                      <Clock size={12} /> {fmtDate(item.created_at)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-5 text-right">
                  <p className="text-slate-700 font-bold leading-relaxed">{item.content}</p>
                </div>

                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="flex gap-2">
                    {item.status !== 'RESOLVED' && (
                      <button
                        disabled={busy}
                        onClick={() => handleStatus(String(item.id), 'RESOLVED')}
                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                        title="تحديد كمعالج"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    {item.status !== 'IN_PROGRESS' && (
                      <button
                        disabled={busy}
                        onClick={() => handleStatus(String(item.id), 'IN_PROGRESS')}
                        className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-black hover:bg-sky-100 disabled:opacity-50"
                        title="نقل لقيد المعالجة"
                      >
                        قيد المعالجة
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(String(item.id))}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-cyan-600 uppercase tracking-wider">
                    <Sparkles size={12} /> تنبيه ذكي
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
