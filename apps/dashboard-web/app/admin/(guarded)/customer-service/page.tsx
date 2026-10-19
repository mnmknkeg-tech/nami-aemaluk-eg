'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Headphones, User, Clock, Trash2, Filter, Send,
  AlertTriangle, MessageCircle, HelpCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import {
  PageHeader, Panel, LoadingBlock, EmptyState, SearchInput, FilterSelect, Badge, StatChip,
  TONE_TEXT, fmtDate, type Tone,
} from '@/components/admin/ui';

const typeMeta: Record<string, { label: string; icon: React.ReactNode; tone: Tone }> = {
  COMPLAINT: { label: 'شكوى', icon: <AlertTriangle size={14} />, tone: 'red' },
  SUPPORT: { label: 'دعم', icon: <Headphones size={14} />, tone: 'cyan' },
  INQUIRY: { label: 'استفسار', icon: <HelpCircle size={14} />, tone: 'purple' },
  FEEDBACK: { label: 'ملاحظات', icon: <MessageCircle size={14} />, tone: 'green' },
};

const statusMeta: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'مفتوح', tone: 'cyan' },
  IN_PROGRESS: { label: 'قيد المعالجة', tone: 'amber' },
  RESOLVED: { label: 'تم الحل', tone: 'green' },
  CLOSED: { label: 'مغلق', tone: 'slate' },
};

const priorityMeta: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: 'منخفضة', tone: 'slate' },
  NORMAL: { label: 'عادية', tone: 'cyan' },
  HIGH: { label: 'عالية', tone: 'amber' },
  URGENT: { label: 'عاجلة', tone: 'red' },
};

export default function AdminCustomerServicePage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        apiRequest(`/support/tickets?take=100${statusFilter ? `&status=${statusFilter}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}${search ? `&q=${encodeURIComponent(search)}` : ''}`),
        apiRequest('/support/stats').catch(() => null),
      ]);
      setTickets(data?.rows || []);
      setStats(statsData);
    } catch {
      toast({ title: 'فشل تحميل التذاكر', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, toast]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) {
      toast({ title: 'اكتب الرد أولاً', variant: 'destructive' });
      return;
    }
    setReplying(true);
    try {
      await apiRequest(`/support/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      toast({ title: 'تم إرسال الرد', variant: 'success' });
      setReplyText('');
      setExpandedId(null);
      await loadTickets();
    } catch (e: any) {
      toast({ title: e?.message || 'فشل إرسال الرد', variant: 'destructive' });
    } finally { setReplying(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await apiRequest(`/support/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast({ title: 'تم تحديث الحالة', variant: 'success' });
      await loadTickets();
    } catch (e: any) {
      toast({ title: e?.message || 'فشل تحديث الحالة', variant: 'destructive' });
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    setActionLoading(id);
    try {
      await apiRequest(`/support/tickets/${id}`, { method: 'DELETE' });
      toast({ title: 'تم حذف التذكرة', variant: 'success' });
      await loadTickets();
    } catch (e: any) {
      toast({ title: e?.message || 'فشل الحذف', variant: 'destructive' });
    } finally { setActionLoading(null); }
  };

  const normalizedTickets = tickets.map((item: any) => ({
    ...item,
    _userName: item?.user?.name || item?.userName || 'زائر',
    _userEmail: item?.user?.email || item?.userEmail || '',
    _userPhone: item?.userPhone || '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Headphones}
        title="خدمة العملاء والشكاوى"
        subtitle="إدارة تذاكر الدعم والشكاوى"
        tone="cyan"
        stats={
          stats ? (
            <>
              <StatChip label="الإجمالي" value={stats.total} />
              <StatChip label="مفتوح" value={stats.open} tone="cyan" />
              <StatChip label="قيد المعالجة" value={stats.inProgress} tone="amber" />
              <StatChip label="تم الحل" value={stats.resolved} tone="green" />
              <StatChip label="مغلق" value={stats.closed} tone="slate" />
              <StatChip label="شكاوى" value={stats.complaints} tone="red" />
              <StatChip label="دعم" value={stats.support} tone="purple" />
              <StatChip label="استفسارات" value={stats.inquiries} tone="sky" />
            </>
          ) : undefined
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'كل الحالات' },
            { value: 'OPEN', label: 'مفتوح' },
            { value: 'IN_PROGRESS', label: 'قيد المعالجة' },
            { value: 'RESOLVED', label: 'تم الحل' },
            { value: 'CLOSED', label: 'مغلق' },
          ]}
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: '', label: 'كل الأنواع' },
            { value: 'COMPLAINT', label: 'شكوى' },
            { value: 'SUPPORT', label: 'دعم' },
            { value: 'INQUIRY', label: 'استفسار' },
            { value: 'FEEDBACK', label: 'ملاحظات' },
          ]}
        />
        <button
          onClick={() => loadTickets()}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs inline-flex items-center gap-2 hover:bg-slate-700 transition-all"
        >
          <Filter size={14} /> تحديث
        </button>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : normalizedTickets.length === 0 ? (
        <Panel><EmptyState icon={MessageCircle} title="لا توجد تذاكر حالياً" /></Panel>
      ) : (
        <div className="space-y-4">
          {normalizedTickets.map((item) => {
            const type = typeMeta[item.type] || typeMeta.COMPLAINT;
            const status = statusMeta[item.status] || statusMeta.OPEN;
            const priority = priorityMeta[item.priority] || priorityMeta.NORMAL;
            const isExpanded = expandedId === item.id;

            return (
              <Panel key={item.id} className="overflow-hidden hover:shadow-md transition-all">
                <div className="p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                  <div className="flex justify-between items-start mb-4 flex-row-reverse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                        <User size={18} />
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{item._userName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {item._userEmail}{item._userPhone ? ` • ${item._userPhone}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={type.tone}>{type.icon} {type.label}</Badge>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className={`text-[10px] font-black ${TONE_TEXT[priority.tone]}`}>{priority.label}</span>
                    </div>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg mb-2 text-right">{item.subject}</h3>
                  <p className="text-slate-500 font-bold text-sm leading-relaxed text-right line-clamp-2">{item.message}</p>

                  <div className="flex items-center justify-between mt-4 flex-row-reverse">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={12} /> {fmtDate(item.createdAt)}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl text-right border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-black uppercase mb-2">الرسالة كاملة</p>
                      <p className="text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{item.message}</p>
                    </div>

                    {item.adminReply && (
                      <div className="bg-emerald-50 p-4 rounded-2xl text-right border border-emerald-200">
                        <p className="text-[10px] text-emerald-600 font-black uppercase mb-2">رد الإدارة</p>
                        <p className="text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{item.adminReply}</p>
                        {item.repliedAt && <p className="text-[10px] text-slate-400 font-bold mt-2">{fmtDate(item.repliedAt)}</p>}
                      </div>
                    )}

                    {!item.adminReply && (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition-all resize-none"
                          placeholder="اكتب ردك هنا..."
                        />
                        <button
                          onClick={() => handleReply(item.id)}
                          disabled={replying}
                          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs inline-flex items-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                          <Send size={14} />
                          إرسال الرد
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-row-reverse pt-2 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 font-black ml-2">تغيير الحالة:</span>
                      {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(item.id, st)}
                          disabled={actionLoading === item.id}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all disabled:opacity-50 ${
                            item.status === st
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {statusMeta[st]?.label || st}
                        </button>
                      ))}
                      <div className="flex-1" />
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading === item.id}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
