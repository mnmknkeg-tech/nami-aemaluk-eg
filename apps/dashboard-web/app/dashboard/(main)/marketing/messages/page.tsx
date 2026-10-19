'use client';

/**
 * الرسائل والتواصل — صفحة موحّدة تدمج: الرسائل + حملات الإيميل + حملات SMS + الإشعارات الفورية.
 * تبويبات: كل الرسائل / البريد الإلكتروني / الرسائل النصية / الإشعارات الفورية / القوالب / سجل الإرسال.
 * الحملة الجماعية بتتعمل من صفحة الحملات — هنا إرسال مباشر وقوالب وسجل.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Mail, MessageSquare, Bell, LayoutTemplate, History, Send, Edit, Trash2,
  Download, X, Info, Loader2, User, Users, Tag,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSearchParams } from 'next/navigation';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvLoading,
  InvEmpty,
  type InvTab,
} from '@/components/inventory/InventoryShell';

type UnifiedMessage = {
  id: string;
  source: 'message' | 'email' | 'sms' | 'push';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  sub: string;
  status: string;
  tone: 'emerald' | 'slate' | 'red' | 'amber';
  recipients: number;
  opened: number;
  clicked: number;
  extra: string;
  date: string;
  raw: any;
};

const TAB_IDS = ['all', 'email', 'sms', 'push', 'templates', 'log'];
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) => (s ? new Date(s).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const statusTone = (s: string): 'emerald' | 'slate' | 'red' | 'amber' =>
  ['sent', 'delivered', 'opened'].includes(s) ? 'emerald' : s === 'failed' ? 'red' : s === 'scheduled' ? 'amber' : 'slate';
const statusLabel = (s: string) =>
  ({ draft: 'مسودة', scheduled: 'مجدول', sent: 'أُرسلت', delivered: 'وصلت', opened: 'تم الفتح', failed: 'فشل' }[s] || s);

// قوالب مدمجة — حسب القناة
type Tpl = { id: string; name: string; channel: 'email' | 'sms' | 'push'; icon: any; hint: string; subject: string; body: string };
const TEMPLATES: Tpl[] = [
  { id: 'welcome', name: 'رسالة ترحيب', channel: 'email', icon: Mail, hint: 'عميل جديد يسجل', subject: 'أهلًا بيك عندنا 👋', body: 'أهلًا {اسم العميل}! سعدنا بانضمامك. كود خصم أول طلب: WELCOME10' },
  { id: 'order_confirm', name: 'تأكيد الطلب', channel: 'sms', icon: MessageSquare, hint: 'متاجر ومطاعم', subject: 'تم تأكيد طلبك', body: 'طلبك رقم {رقم الطلب} اتأكد وهيتم تحضيره فورًا. شكرًا لثقتك!' },
  { id: 'booking_confirm', name: 'تأكيد الحجز', channel: 'sms', icon: MessageSquare, hint: 'عيادات وخدمات', subject: 'تم تأكيد حجزك', body: 'حجزك بتاريخ {التاريخ} الساعة {الوقت} اتأكد. نستقبلك على موعد التزام.' },
  { id: 'reminder', name: 'تذكير', channel: 'push', icon: Bell, hint: 'مواعيد وسلال متروكة', subject: 'تذكير سريع', body: 'عندك موعد قريب — لا تنسى! أو منتجات في سلتك مستنياك.' },
  { id: 'payment', name: 'إشعار الدفع', channel: 'email', icon: Mail, hint: 'فاتورة مدفوعة', subject: 'إيصال دفع طلبك', body: 'استلمنا مبلغ {المبلغ} بنجاح. مرفق إيصال الدفع — شكرًا لك.' },
  { id: 'shipping', name: 'إشعار الشحن', channel: 'sms', icon: MessageSquare, hint: 'طلب خرج للتوصيل', subject: 'طلبك في الطريق', body: 'طلبك خرج للتوصيل ووصل المندوب رقم {رقم المندوب}. كن متواجدًا.' },
  { id: 'delivery', name: 'إشعار الاستلام', channel: 'push', icon: Bell, hint: 'طلب تم تسليمه', subject: 'تم التسليم ✅', body: 'طلبك اتسلّم. قيّم تجربتك واحصل على 50 نقطة ولاء!' },
  { id: 'marketing', name: 'رسالة تسويقية', channel: 'email', icon: Mail, hint: 'عروض وحملات', subject: 'عرض خاص لفترة محدودة', body: 'خصم 20% على تشكيلة مختارة لفترة محدودة — تسوق الآن!' },
  { id: 'followup', name: 'رسالة متابعة', channel: 'email', icon: Mail, hint: 'عميل غير نشط', subject: 'وحشتنا 😊', body: 'من فترة ما نشوفك! جهزنا لك خصم خاص لطلبك الجديد: BACK10' },
];

const CHANNEL_META = {
  email: { label: 'إيميل', icon: Mail, cls: 'bg-blue-50 text-blue-600' },
  sms: { label: 'SMS', icon: MessageSquare, cls: 'bg-green-50 text-green-600' },
  push: { label: 'إشعار', icon: Bell, cls: 'bg-purple-50 text-purple-600' },
  in_app: { label: 'داخلي', icon: Send, cls: 'bg-slate-100 text-slate-600' },
} as const;

const SOURCE_BASE = { message: '/messages', email: '/email-campaigns', sms: '/sms-campaigns', push: '/notifications' } as const;

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'all';
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [messages, setMessages] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [smss, setSmss] = useState<any[]>([]);
  const [pushes, setPushes] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const [mRes, eRes, sRes, pRes] = await Promise.all([
        apiRequest(`/messages/shop/${sid}`).catch(() => []),
        apiRequest(`/email-campaigns/shop/${sid}`).catch(() => []),
        apiRequest(`/sms-campaigns/shop/${sid}`).catch(() => []),
        apiRequest(`/notifications/shop/${sid}`).catch(() => []),
      ]);
      const pick = (r: any) => (Array.isArray(r) ? r : r?.data || []);
      setMessages(pick(mRes));
      setEmails(pick(eRes));
      setSmss(pick(sRes));
      setPushes(pick(pRes));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows: UnifiedMessage[] = useMemo(() => {
    const out: UnifiedMessage[] = [];
    messages.forEach((m) => out.push({
      id: String(m.id), source: 'message', channel: m.type || 'in_app',
      title: m.subject || '---', sub: m.subjectAr || '',
      status: m.status || 'draft', tone: statusTone(m.status),
      recipients: Number(m.recipientCount || 0), opened: Number(m.openedCount || 0), clicked: Number(m.clickedCount || 0),
      extra: '', date: m.sentDate || m.scheduledDate || m.createdAt || '', raw: m,
    }));
    emails.forEach((m) => out.push({
      id: String(m.id), source: 'email', channel: 'email',
      title: m.subject || m.name || '---', sub: m.subjectAr || m.nameAr || '',
      status: m.status || 'draft', tone: statusTone(m.status),
      recipients: Number(m.recipientCount || 0), opened: Number(m.openedCount || 0), clicked: Number(m.clickedCount || 0),
      extra: [m.openRate ? `فتح ${m.openRate}%` : '', m.clickRate ? `نقر ${m.clickRate}%` : '', m.bounceCount ? `ارتداد ${m.bounceCount}` : ''].filter(Boolean).join(' • '),
      date: m.sentDate || m.scheduledDate || m.createdAt || '', raw: m,
    }));
    smss.forEach((m) => out.push({
      id: String(m.id), source: 'sms', channel: 'sms',
      title: m.name || '---', sub: m.nameAr || '',
      status: m.status || 'draft', tone: statusTone(m.status),
      recipients: Number(m.recipientCount || 0), opened: Number(m.deliveredCount || 0), clicked: Number(m.failedCount || 0),
      extra: m.cost ? `تكلفة ج.م ${fmt(m.cost)}` : '',
      date: m.sentDate || m.scheduledDate || m.createdAt || '', raw: m,
    }));
    pushes.forEach((m) => out.push({
      id: String(m.id), source: 'push', channel: 'push',
      title: m.title || '---', sub: m.segmentName || (m.audience === 'all' ? 'كل العملاء' : m.audience === 'specific' ? 'عملاء محددون' : 'شريحة'),
      status: m.status || 'draft', tone: statusTone(m.status),
      recipients: Number(m.sentCount || 0), opened: Number(m.openCount || 0), clicked: Number(m.clickCount || 0),
      extra: '',
      date: m.sentAt || m.scheduledAt || m.createdAt || '', raw: m,
    }));
    return out.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  }, [messages, emails, smss, pushes]);

  const filtered = useMemo(() => {
    let result = rows;
    if (tab === 'email') result = result.filter((r) => r.channel === 'email');
    else if (tab === 'sms') result = result.filter((r) => r.channel === 'sms');
    else if (tab === 'push') result = result.filter((r) => r.channel === 'push');
    else if (tab === 'log') result = result.filter((r) => ['sent', 'delivered', 'opened', 'failed'].includes(r.status));
    const q = debouncedSearch.trim().toLowerCase();
    if (q) result = result.filter((r) => r.title.toLowerCase().includes(q) || r.sub.includes(debouncedSearch));
    return result;
  }, [rows, tab, debouncedSearch]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const sentCount = rows.filter((r) => ['sent', 'delivered', 'opened'].includes(r.status)).length;

  const tabs: InvTab[] = [
    { id: 'all', label: 'كل الرسائل', count: rows.length },
    { id: 'email', label: 'البريد الإلكتروني', count: rows.filter((r) => r.channel === 'email').length },
    { id: 'sms', label: 'الرسائل النصية', count: rows.filter((r) => r.channel === 'sms').length },
    { id: 'push', label: 'الإشعارات الفورية', count: rows.filter((r) => r.channel === 'push').length },
    { id: 'templates', label: 'القوالب', count: TEMPLATES.length },
    { id: 'log', label: 'سجل الإرسال', count: sentCount },
  ];

  // ─── shop sid (للشرائح والوسوم) ──────────────────────────────────────────
  const [shopSid, setShopSid] = useState('');
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    apiRequest('/shops/me').then((s: any) => s?.id && setShopSid(s.id)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!shopSid || segments.length > 0) return;
    apiRequest(`/shops/${shopSid}/segments`).then((r: any) => setSegments((Array.isArray(r) ? r : r?.data || []).map((s: any) => ({ id: String(s.id), name: s.name || '---' })))).catch(() => {});
    apiRequest(`/shops/${shopSid}/tags`).then((r: any) => setTags((Array.isArray(r) ? r : r?.data || []).map((t: any) => ({ id: String(t.id), name: t.name || '---' })))).catch(() => {});
  }, [shopSid, segments.length]);

  // ─── compose modal ───────────────────────────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({
    channel: 'email' as 'email' | 'sms' | 'push',
    audienceType: 'all' as 'all' | 'one' | 'group' | 'segment' | 'tag',
    audienceValue: '',
    subject: '', body: '', scheduledAt: '',
  });

  const openCompose = (prefill?: Partial<typeof compose>) => {
    setCompose({ channel: 'email', audienceType: 'all', audienceValue: '', subject: '', body: '', scheduledAt: '', ...prefill });
    setComposeOpen(true);
  };

  const sendCompose = async () => {
    if (!compose.subject && !compose.body) { alert('اكتب الموضوع أو النص'); return; }
    setComposing(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const status = compose.scheduledAt ? 'scheduled' : 'draft';
      const audience = { audience: compose.audienceType, audienceValue: compose.audienceValue };
      if (compose.channel === 'email') {
        await apiRequest('/email-campaigns', { method: 'POST', body: JSON.stringify({
          name: compose.subject, nameAr: compose.subject, subject: compose.subject, subjectAr: compose.subject,
          status, scheduledDate: compose.scheduledAt, description: compose.body, ...audience, shopId: sid,
        }) });
      } else if (compose.channel === 'sms') {
        await apiRequest('/sms-campaigns', { method: 'POST', body: JSON.stringify({
          name: compose.subject || 'رسالة نصية', nameAr: compose.subject, message: compose.body, messageAr: compose.body,
          status, scheduledDate: compose.scheduledAt, ...audience, shopId: sid,
        }) });
      } else {
        // للإشعارات: القيمة المتوقعة all|segment|specific — نجيبها من نوع الجمهور
        const pushAudience = { audience: compose.audienceType === 'segment' ? 'segment' : compose.audienceType === 'all' ? 'all' : 'specific', audienceValue: compose.audienceValue };
        await apiRequest('/notifications', { method: 'POST', body: JSON.stringify({
          title: compose.subject, body: compose.body,
          segmentName: compose.audienceType === 'segment' ? compose.audienceValue : '',
          scheduledAt: compose.scheduledAt || undefined,
          ...pushAudience, shopId: sid,
        }) });
      }
      setComposeOpen(false); load();
    } catch { alert('حدث خطأ أثناء الإرسال'); }
    finally { setComposing(false); }
  };

  // ─── edit/delete (موجّه لمصدر الرسالة) ───────────────────────────────────
  const [editOpen, setEditOpen] = useState<UnifiedMessage | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '', status: 'draft', scheduledAt: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (r: UnifiedMessage) => {
    const raw = r.raw || {};
    setEditForm({
      subject: raw.subject || raw.name || raw.title || '',
      body: raw.content || raw.description || raw.message || raw.body || '',
      status: raw.status || 'draft',
      scheduledAt: (raw.scheduledDate || raw.scheduledAt || '').split('T')[0],
    });
    setEditOpen(r);
  };

  const saveEdit = async () => {
    if (!editOpen) return;
    setSavingEdit(true);
    try {
      const raw = editOpen.raw || {};
      let payload: any = {};
      if (editOpen.source === 'email') payload = { ...raw, subject: editForm.subject, name: editForm.subject, description: editForm.body, status: editForm.status, scheduledDate: editForm.scheduledAt };
      else if (editOpen.source === 'sms') payload = { ...raw, name: editForm.subject, message: editForm.body, messageAr: editForm.body, status: editForm.status, scheduledDate: editForm.scheduledAt };
      else if (editOpen.source === 'push') payload = { ...raw, title: editForm.subject, body: editForm.body, status: editForm.status, scheduledAt: editForm.scheduledAt || undefined };
      else payload = { ...raw, subject: editForm.subject, content: editForm.body, status: editForm.status, scheduledDate: editForm.scheduledAt };
      await apiRequest(`${SOURCE_BASE[editOpen.source]}/${editOpen.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setEditOpen(null); load();
    } catch { alert('حدث خطأ أثناء الحفظ'); }
    finally { setSavingEdit(false); }
  };

  const deleteRow = async (r: UnifiedMessage) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await apiRequest(`${SOURCE_BASE[r.source]}/${r.id}`, { method: 'DELETE' });
      load();
    } catch { alert('حدث خطأ أثناء الحذف'); }
  };

  const exportCSV = () => {
    const headers = ['Channel', 'Title', 'Status', 'Recipients', 'Opened', 'Clicked', 'Date'];
    const body = filtered.map((r) => [r.channel, r.title, r.status, r.recipients, r.opened, r.clicked, r.date]);
    const blob = new Blob([[headers, ...body].map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'messages.csv';
    link.click();
  };

  return (
    <InventoryPage
      title="الرسائل والتواصل"
      subtitle="الرسائل والقوالب وسجل الإرسال لكل القنوات — الإيميل والرسائل النصية والإشعارات"
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button onClick={exportCSV} className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
            <Download size={14} />
            تصدير CSV
          </button>
          <button onClick={() => openCompose()} className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700">
            <Send size={14} />
            رسالة جديدة
          </button>
        </>
      }
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => { setTab(id); setCurrentPage(1); }}
      search={tab === 'templates' ? undefined : search}
      onSearchChange={setSearch}
      searchPlaceholder="دوّر برسالة أو حملة…"
      loading={loading}
      empty={
        tab === 'log' ? (
          <>
            <History size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">مفيش رسائل مرسولة لسه</p>
          </>
        ) : (
          <>
            <Mail size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-bold text-sm">لا توجد رسائل في هذا القسم</p>
          </>
        )
      }
      footer={
        tab !== 'templates' ? (
          <InvPagination page={currentPage} totalPages={totalPages} total={filtered.length} perPage={itemsPerPage} onPage={setCurrentPage} label="رسالة" />
        ) : undefined
      }
    >
      {tab !== 'templates' ? (
        <InvTableCard
          columns={[
            { label: 'الرسالة', className: 'col-span-3' },
            { label: 'القناة', className: 'col-span-1' },
            { label: 'المستلمون', className: 'col-span-2' },
            { label: 'الحالة', className: 'col-span-2' },
            { label: 'التاريخ', className: 'col-span-2' },
            { label: 'إجراءات', className: 'col-span-2' },
          ]}
        >
          {paginated.map((r) => {
            const meta = CHANNEL_META[r.channel] || CHANNEL_META.in_app;
            const Icon = meta.icon;
            return (
              <InvRow key={`${r.source}-${r.id}`} muted={r.status === 'draft'}>
                <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{r.title}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">{r.sub}{r.extra ? ` — ${r.extra}` : ''}</div>
                  </div>
                </div>
                <div className="col-span-1">
                  <span className={`h-8 px-3 inline-flex items-center rounded-full text-[11px] font-bold ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="col-span-2 pr-4 text-slate-600 text-xs sm:text-sm">
                  {fmt(r.recipients)} مستلم
                  {(r.opened > 0 || r.clicked > 0) && (
                    <span className="block text-[11px] text-slate-400 font-medium mt-0.5">
                      فتح {fmt(r.opened)} • نقر {fmt(r.clicked)}
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <InvStatusPill tone={r.tone}>{statusLabel(r.status)}</InvStatusPill>
                </div>
                <div className="col-span-2 pr-4 text-slate-500 text-xs">{d(r.date)}</div>
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <InvRowAction onClick={() => openEdit(r)} title="تعديل">
                    <Edit size={14} />
                  </InvRowAction>
                  <InvRowAction onClick={() => deleteRow(r)} title="حذف" danger>
                    <Trash2 size={14} />
                  </InvRowAction>
                </div>
              </InvRow>
            );
          })}
        </InvTableCard>
      ) : (
        <InvTableCard
          columns={[
            { label: 'القالب', className: 'col-span-3' },
            { label: 'القناة المقترحة', className: 'col-span-2' },
            { label: 'الاستخدام', className: 'col-span-4' },
            { label: 'إجراءات', className: 'col-span-3' },
          ]}
        >
          {TEMPLATES.map((t) => {
            const meta = CHANNEL_META[t.channel];
            const Icon = t.icon;
            return (
              <InvRow key={t.id}>
                <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{t.name}</div>
                </div>
                <div className="col-span-2 pr-4">
                  <span className={`h-8 px-3 inline-flex items-center rounded-full text-[11px] font-bold ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="col-span-4 pr-4 text-slate-500 text-xs sm:text-sm truncate">{t.hint} — {t.body}</div>
                <div className="col-span-3 flex items-center justify-end">
                  <button
                    onClick={() => openCompose({ channel: t.channel, subject: t.subject, body: t.body })}
                    className="h-8 px-4 rounded-full bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Send size={12} />
                    استخدام القالب
                  </button>
                </div>
              </InvRow>
            );
          })}
        </InvTableCard>
      )}

      {/* ═══ Compose Modal ═══ */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setComposeOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">رسالة جديدة</h2>
              <button onClick={() => setComposeOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">القناة</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'email', label: 'بريد إلكتروني', icon: Mail },
                      { id: 'sms', label: 'رسالة نصية', icon: MessageSquare },
                      { id: 'push', label: 'إشعار فوري', icon: Bell },
                    ] as const
                  ).map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCompose({ ...compose, channel: c.id })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                          compose.channel === c.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={16} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">المستلمون</label>
                  <select
                    value={compose.audienceType}
                    onChange={(e) => setCompose({ ...compose, audienceType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="all">كل العملاء</option>
                    <option value="one">عميل واحد</option>
                    <option value="group">مجموعة عملاء</option>
                    <option value="segment">شريحة</option>
                    <option value="tag">وسم</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">
                    {compose.audienceType === 'one' ? 'رقم الهاتف / الإيميل' : compose.audienceType === 'group' ? 'الأرقام (مفصولة بفاصلة)' : compose.audienceType === 'segment' ? 'اختار الشريحة' : compose.audienceType === 'tag' ? 'اختار الوسم' : '—'}
                  </label>
                  {compose.audienceType === 'segment' ? (
                    <select value={compose.audienceValue} onChange={(e) => setCompose({ ...compose, audienceValue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                      <option value="">اختار الشريحة…</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : compose.audienceType === 'tag' ? (
                    <select value={compose.audienceValue} onChange={(e) => setCompose({ ...compose, audienceValue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                      <option value="">اختار الوسم…</option>
                      {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={compose.audienceValue}
                      onChange={(e) => setCompose({ ...compose, audienceValue: e.target.value })}
                      disabled={compose.audienceType === 'all'}
                      placeholder={compose.audienceType === 'one' ? '010xxxxxxxx' : ''}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-40"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الموضوع</label>
                <input type="text" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">النص</label>
                <textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">جدولة (اختياري — فاضي = مسودة)</label>
                <input type="datetime-local" value={compose.scheduledAt} onChange={(e) => setCompose({ ...compose, scheduledAt: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Users size={13} />
                حملة جماعية كبيرة؟ اعملها من صفحة الحملات عشان تتتبع نتائجها — هنا للإرسال السريع.
              </div>
              <button onClick={sendCompose} disabled={composing} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {composing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Modal ═══ */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditOpen(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">تعديل — {CHANNEL_META[editOpen.channel]?.label || ''}</h2>
              <button onClick={() => setEditOpen(null)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الموضوع / العنوان</label>
                <input type="text" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">النص</label>
                <textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="draft">مسودة</option>
                    <option value="scheduled">مجدول</option>
                    <option value="sent">أُرسلت</option>
                    <option value="failed">فشل</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الجدولة</label>
                  <input type="datetime-local" value={editForm.scheduledAt} onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <button onClick={saveEdit} disabled={savingEdit} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {savingEdit && <Loader2 size={14} className="animate-spin" />}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Guide Modal ═══ */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل الرسائل والتواصل</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Info size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">كل قنوات التواصل في مكان واحد: البريد الإلكتروني، الرسائل النصية، والإشعارات الفورية — مع قوالب جاهزة وسجل إرسال.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><LayoutTemplate size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">التبويبات</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• كل الرسائل: كل ما تم إرساله أو تحضيره من كل القنوات</li>
                  <li>• قنوات: فلترة لكل قناة على حدة</li>
                  <li>• القوالب: قوالب جاهزة لكل المناسبات — بضغطة تبقى رسالة</li>
                  <li>• سجل الإرسال: كل اللي اتبعت فعلًا مع حالاته</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Tag size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">حملة جماعية؟</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">لو ناوي حملة جماعية متتبعة بالنتائج — اعملها من صفحة الحملات. هنا للإرسال السريع والرسائل الفردية.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}
