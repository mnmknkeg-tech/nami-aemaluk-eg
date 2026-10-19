'use client';

/**
 * الحملات — مركز إدارة الحملات التسويقية.
 * تبويبات: الكل / النشطة / المسودة / المجدولة / المنتهية / المتوقفة.
 * إنشاء الحملة: هدف (حسب نوع النشاط) + جمهور (شرائح/وسوم نظام العملاء) + قنوات متعددة + محتوى + جدولة.
 * النتائج معروضة داخل كل صف: وصول/نقرات/تحويلات + الميزانية والعائد.
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Megaphone, Plus, Edit, Trash2, Download, X, Info, Loader2, Check,
  Target, Users, Mail, MessageSquare, Bell, TrendingUp, Link as LinkIcon, ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  type InvTab,
} from '@/components/inventory/InventoryShell';

type Campaign = {
  id: string;
  name: string;
  nameAr: string;
  type: 'email' | 'sms' | 'social' | 'push' | 'display' | 'custom';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  targetAudience: string;
  goal?: string;
  channels?: string[];
  linkUrl?: string;
  ctaLabel?: string;
  offerRef?: string;
  reach: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpa: number;
  roas: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// ─── الأهداف — تظهر حسب نوع النشاط (فاضي = لكل الأنشطة) ──────────────────
const GOALS: { id: string; label: string; cats: string[] }[] = [
  { id: 'sales', label: 'زيادة المبيعات', cats: [] },
  { id: 'new_customers', label: 'جذب عملاء جدد', cats: [] },
  { id: 'reactivate', label: 'إعادة تنشيط العملاء', cats: [] },
  { id: 'product', label: 'الترويج لمنتج', cats: ['RETAIL', 'FASHION', 'ELECTRONICS', 'FOOD', 'RESTAURANT'] },
  { id: 'service', label: 'الترويج لخدمة', cats: ['SERVICE', 'HEALTH', 'OTHER'] },
  { id: 'booking', label: 'الترويج لحجز', cats: ['SERVICE', 'HEALTH'] },
  { id: 'subscriptions', label: 'زيادة الاشتراكات', cats: ['SERVICE', 'HEALTH', 'OTHER'] },
  { id: 'bookings', label: 'زيادة الحجوزات', cats: ['SERVICE', 'HEALTH', 'OTHER'] },
  { id: 'custom', label: 'هدف مخصص', cats: [] },
];

const AUDIENCE_OPTIONS = [
  { id: 'all', label: 'جميع العملاء' },
  { id: 'new', label: 'عملاء جدد' },
  { id: 'inactive', label: 'عملاء غير نشطين' },
  { id: 'vip', label: 'عملاء مميزون' },
  { id: 'debt', label: 'لديهم مديونية' },
  { id: 'segment', label: 'شريحة معينة' },
  { id: 'tag', label: 'وسم معين' },
];

const CHANNELS = [
  { id: 'email', label: 'البريد الإلكتروني', icon: Mail },
  { id: 'sms', label: 'الرسائل النصية', icon: MessageSquare },
  { id: 'push', label: 'الإشعارات الفورية', icon: Bell },
];

const TAB_IDS = ['all', 'running', 'draft', 'scheduled', 'completed', 'paused'];
const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) => (s ? new Date(s).toLocaleDateString('ar-EG') : '—');

const STATUS_LABEL: Record<string, string> = {
  running: 'نشطة', draft: 'مسودة', scheduled: 'مجدولة', paused: 'متوقفة', completed: 'منتهية', cancelled: 'ملغاة',
};
const STATUS_TONE: Record<string, 'emerald' | 'slate' | 'red' | 'amber'> = {
  running: 'emerald', draft: 'slate', scheduled: 'amber', paused: 'amber', completed: 'slate', cancelled: 'red',
};

const emptyForm = {
  name: '', nameAr: '',
  type: 'email' as Campaign['type'],
  status: 'draft' as Campaign['status'],
  goal: '', goalCustom: '',
  audienceType: 'all',
  audienceValue: '',
  channels: ['email'] as string[],
  linkUrl: '', ctaLabel: '', offerRef: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  budget: 0,
  description: '',
};

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [tab, setTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [saving, setSaving] = useState(false);

  const [addModal, setAddModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [shopSid, setShopSid] = useState('');
  const [shopCategory, setShopCategory] = useState('');
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopSid(sid);
      setShopCategory(String(shopData?.category || ''));
      const res = await apiRequest(`/campaigns/shop/${sid}`).catch(() => []);
      const data = Array.isArray(res) ? res : res?.data || [];
      setCampaigns(data.map((c: any) => ({
        id: String(c.id), name: c.name || '---', nameAr: c.nameAr || c.name_ar || '---',
        type: c.type || 'email', status: c.status || 'draft',
        startDate: c.startDate || c.start_date || '', endDate: c.endDate || c.end_date || '',
        budget: Number(c.budget || 0), spent: Number(c.spent || 0),
        targetAudience: c.targetAudience || c.target_audience || 'all',
        goal: c.goal || '', channels: c.channels || [],
        linkUrl: c.linkUrl || '', ctaLabel: c.ctaLabel || '', offerRef: c.offerRef || '',
        reach: Number(c.reach || 0), impressions: Number(c.impressions || 0), clicks: Number(c.clicks || 0),
        conversions: Number(c.conversions || 0), ctr: Number(c.ctr || 0), cpa: Number(c.cpa || 0), roas: Number(c.roas || 0),
        description: c.description || '', createdAt: c.createdAt || '', updatedAt: c.updatedAt || '',
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // شرائح + وسوم من نظام العملاء (lazy عند الحاجة)
  useEffect(() => {
    if (!shopSid || segments.length > 0) return;
    apiRequest(`/shops/${shopSid}/segments`).then((r: any) => setSegments((Array.isArray(r) ? r : r?.data || []).map((s: any) => ({ id: String(s.id), name: s.name || '---' })))).catch(() => {});
    apiRequest(`/shops/${shopId2(shopSid)}/tags`).then((r: any) => setTags((Array.isArray(r) ? r : r?.data || []).map((t: any) => ({ id: String(t.id), name: t.name || '---' })))).catch(() => {});
  }, [shopSid, segments.length]);

  const availableGoals = useMemo(
    () => GOALS.filter((g) => g.cats.length === 0 || g.cats.includes(shopCategory)),
    [shopCategory]
  );

  const filtered = useMemo(() => {
    let result = campaigns;
    if (tab !== 'all') {
      result = result.filter((c) => (tab === 'completed' ? ['completed', 'cancelled'].includes(c.status) : c.status === tab));
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) result = result.filter((c) => c.name.toLowerCase().includes(q) || c.nameAr.includes(debouncedSearch) || (c.goal || '').includes(debouncedSearch));
    return [...result].sort((a, b) => (Date.parse(b.startDate) || 0) - (Date.parse(a.startDate) || 0));
  }, [campaigns, tab, debouncedSearch]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const tabs: InvTab[] = [
    { id: 'all', label: 'جميع الحملات', count: campaigns.length },
    { id: 'running', label: 'النشطة', count: campaigns.filter((c) => c.status === 'running').length },
    { id: 'draft', label: 'المسودة', count: campaigns.filter((c) => c.status === 'draft').length },
    { id: 'scheduled', label: 'المجدولة', count: campaigns.filter((c) => c.status === 'scheduled').length },
    { id: 'completed', label: 'المنتهية', count: campaigns.filter((c) => ['completed', 'cancelled'].includes(c.status)).length },
    { id: 'paused', label: 'المتوقفة', count: campaigns.filter((c) => c.status === 'paused').length },
  ];

  const buildAudience = () => {
    if (form.audienceType === 'segment' && form.audienceValue) {
      const seg = segments.find((s) => s.id === form.audienceValue);
      return `segment:${form.audienceValue}:${seg?.name || ''}`;
    }
    if (form.audienceType === 'tag' && form.audienceValue) {
      const tg = tags.find((t) => t.id === form.audienceValue);
      return `tag:${form.audienceValue}:${tg?.name || ''}`;
    }
    return form.audienceType;
  };

  const parseAudience = (a: string): { type: string; value: string } => {
    const parts = (a || '').split(':');
    if (parts[0] === 'segment' || parts[0] === 'tag') return { type: parts[0], value: parts[1] || '' };
    return { type: a || 'all', value: '' };
  };

  const goalLabel = (c: Campaign) => {
    if (!c.goal) return '—';
    const g = GOALS.find((x) => x.id === c.goal);
    if (g && g.id !== 'custom') return g.label;
    return c.goal === 'custom' ? 'هدف مخصص' : c.goal;
  };

  const audienceLabel = (c: Campaign) => {
    const p = parseAudience(c.targetAudience);
    if (p.type === 'segment') { const s = segments.find((x) => x.id === p.value); return `شريحة: ${c.targetAudience.split(':')[2] || s?.name || p.value}`; }
    if (p.type === 'tag') { return `وسم: ${c.targetAudience.split(':')[2] || p.value}`; }
    return AUDIENCE_OPTIONS.find((o) => o.id === p.type)?.label || p.type;
  };

  const save = async () => {
    if (!form.name && !form.nameAr) { alert('اكتب اسم الحملة'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name || form.nameAr,
        nameAr: form.nameAr || form.name,
        type: form.type,
        status: form.status,
        goal: form.goal === 'custom' ? `custom:${form.goalCustom}` : form.goal,
        targetAudience: buildAudience(),
        channels: form.channels,
        linkUrl: form.linkUrl,
        ctaLabel: form.ctaLabel,
        offerRef: form.offerRef,
        startDate: form.startDate,
        endDate: form.endDate,
        budget: form.budget,
        description: form.description,
      };
      if (editCampaign) {
        await apiRequest(`/campaigns/${editCampaign.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/campaigns', { method: 'POST', body: JSON.stringify({ ...payload, shopId: shopSid }) });
      }
      setAddModal(false); setEditCampaign(null); setForm(emptyForm); load();
    } catch { alert('حدث خطأ أثناء حفظ الحملة'); }
    finally { setSaving(false); }
  };

  const openEdit = (c: Campaign) => {
    const p = parseAudience(c.targetAudience);
    const goalRaw = c.goal || '';
    setForm({
      name: c.name, nameAr: c.nameAr, type: c.type, status: c.status,
      goal: goalRaw.startsWith('custom:') ? 'custom' : goalRaw,
      goalCustom: goalRaw.startsWith('custom:') ? goalRaw.slice(7) : '',
      audienceType: p.type, audienceValue: p.value,
      channels: c.channels?.length ? c.channels : [c.type === 'sms' ? 'sms' : c.type === 'push' ? 'push' : 'email'],
      linkUrl: c.linkUrl || '', ctaLabel: c.ctaLabel || '', offerRef: c.offerRef || '',
      startDate: c.startDate?.split('T')[0] || '', endDate: c.endDate?.split('T')[0] || '',
      budget: c.budget, description: c.description,
    });
    setEditCampaign(c);
    setAddModal(true);
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الحملة؟')) return;
    try { await apiRequest(`/campaigns/${id}`, { method: 'DELETE' }); load(); }
    catch { alert('حدث خطأ أثناء الحذف'); }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Goal', 'Audience', 'Channels', 'Status', 'Budget', 'Spent', 'Reach', 'Clicks', 'Conversions', 'ROAS', 'Start', 'End'];
    const body = filtered.map((c) => [c.name, goalLabel(c), c.targetAudience, (c.channels || []).join('+'), c.status, c.budget, c.spent, c.reach, c.clicks, c.conversions, c.roas, c.startDate, c.endDate]);
    const blob = new Blob([[headers, ...body].map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campaigns.csv';
    link.click();
  };

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);

  return (
    <InventoryPage
      title="الحملات"
      subtitle={
        <>
          مركز إدارة الحملات التسويقية — أهداف حسب نشاطك، وجمهور من شرائح عملائك
          {totalConv > 0 && <span className="text-emerald-600 font-semibold"> — {fmt(totalConv)} تحويل من {fmt(totalReach)} وصول</span>}
        </>
      }
      onInfo={() => setGuideOpen(true)}
      actions={
        <>
          <button onClick={exportCSV} className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
            <Download size={14} />
            تصدير CSV
          </button>
          <button onClick={() => { setForm(emptyForm); setEditCampaign(null); setAddModal(true); }} className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700">
            <Plus size={14} />
            حملة جديدة
          </button>
        </>
      }
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => { setTab(id); setCurrentPage(1); }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="دوّر باسم الحملة أو هدفها…"
      loading={loading}
      empty={
        <>
          <Megaphone size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد حملات في هذا القسم</p>
        </>
      }
      footer={<InvPagination page={currentPage} totalPages={totalPages} total={filtered.length} perPage={itemsPerPage} onPage={setCurrentPage} label="حملة" />}
    >
      <InvTableCard
        columns={[
          { label: 'الحملة', className: 'col-span-3' },
          { label: 'الهدف', className: 'col-span-2' },
          { label: 'الجمهور', className: 'col-span-2' },
          { label: 'القنوات', className: 'col-span-1' },
          { label: 'النتائج', className: 'col-span-2' },
          { label: 'الحالة', className: 'col-span-1' },
          { label: '', className: 'col-span-1' },
        ]}
      >
        {paginated.map((c) => (
          <InvRow key={c.id} muted={['draft', 'cancelled'].includes(c.status)}>
            <div className="col-span-3 min-w-0">
              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{c.name}</div>
              <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                {c.nameAr !== '---' ? c.nameAr : ''} {c.budget > 0 ? `• ميزانية ج.م ${fmt(c.budget)} (أُنفقت ${fmt(c.spent)})` : ''}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">{d(c.startDate)} → {d(c.endDate)}</div>
            </div>
            <div className="col-span-2 pr-4 min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                <Target size={12} className="text-slate-400" />
                {goalLabel(c)}
              </span>
              {c.offerRef && <span className="block text-[11px] text-slate-400 font-medium truncate">عرض مرتبط: {c.offerRef}</span>}
            </div>
            <div className="col-span-2 pr-4 min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 truncate">
                <Users size={12} className="text-slate-400" />
                {audienceLabel(c)}
              </span>
            </div>
            <div className="col-span-1 pr-4">
              <div className="flex gap-1">
                {(c.channels?.length ? c.channels : [c.type === 'sms' ? 'sms' : c.type === 'push' ? 'push' : 'email']).map((ch) => {
                  const meta = ch === 'sms' ? { icon: MessageSquare, cls: 'text-green-600 bg-green-50' } : ch === 'push' ? { icon: Bell, cls: 'text-purple-600 bg-purple-50' } : { icon: Mail, cls: 'text-blue-600 bg-blue-50' };
                  const Icon = meta.icon;
                  return <span key={ch} className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.cls}`} title={ch}><Icon size={11} /></span>;
                })}
              </div>
            </div>
            <div className="col-span-2 pr-4 text-xs">
              <span className="font-bold text-slate-700">{fmt(c.clicks)} نقرة</span>
              <span className="block text-[11px] text-slate-400 font-medium">
                وصول {fmt(c.reach)} • تحويل {fmt(c.conversions)}
                {c.roas > 0 ? ` • ROAS ${c.roas.toFixed(1)}x` : ''}
              </span>
            </div>
            <div className="col-span-1">
              <InvStatusPill tone={STATUS_TONE[c.status] || 'slate'}>{STATUS_LABEL[c.status] || c.status}</InvStatusPill>
            </div>
            <div className="col-span-1 flex items-center justify-end gap-1.5">
              <InvRowAction onClick={() => openEdit(c)} title="تعديل">
                <Edit size={14} />
              </InvRowAction>
              <InvRowAction onClick={() => remove(c.id)} title="حذف" danger>
                <Trash2 size={14} />
              </InvRowAction>
            </div>
          </InvRow>
        ))}
      </InvTableCard>

      {/* ═══ Add/Edit Campaign Modal ═══ */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">{editCampaign ? 'تعديل الحملة' : 'حملة جديدة'}</h2>
              <button onClick={() => setAddModal(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-5">
              {/* الأساسيات */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">اسم الحملة (إنجليزي)</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">اسم الحملة (عربي)</label>
                  <input type="text" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="عرض الصيف" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>

              {/* الهدف — حسب النشاط */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 block">
                  <Target size={14} className="text-slate-400" />
                  الهدف من الحملة {shopCategory && <span className="text-[10px] font-bold text-slate-300">(خيارات نشاطك: {shopCategory})</span>}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {availableGoals.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setForm({ ...form, goal: g.id })}
                      className={`h-9 px-3 rounded-full text-[11px] font-bold border transition-all text-right ${
                        form.goal === g.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                {form.goal === 'custom' && (
                  <input
                    type="text"
                    value={form.goalCustom}
                    onChange={(e) => setForm({ ...form, goalCustom: e.target.value })}
                    placeholder="اكتب الهدف المخصص…"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                )}
              </div>

              {/* الجمهور — من نظام العملاء */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5 block">
                    <Users size={14} className="text-slate-400" />
                    الجمهور المستهدف
                  </label>
                  <select value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value, audienceValue: '' })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    {AUDIENCE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">
                    {form.audienceType === 'segment' ? 'اختار الشريحة' : form.audienceType === 'tag' ? 'اختار الوسم' : 'تفاصيل'}
                  </label>
                  {form.audienceType === 'segment' ? (
                    <select value={form.audienceValue} onChange={(e) => setForm({ ...form, audienceValue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                      <option value="">اختار الشريحة…</option>
                      {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : form.audienceType === 'tag' ? (
                    <select value={form.audienceValue} onChange={(e) => setForm({ ...form, audienceValue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                      <option value="">اختار الوسم…</option>
                      {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : (
                    <div className="h-10 flex items-center text-xs font-bold text-slate-400">بيتحدد تلقائيًا حسب الاختيار</div>
                  )}
                </div>
              </div>

              {/* القنوات */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">قنوات الحملة (اختر واحدة أو أكثر)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    const active = form.channels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setForm({ ...form, channels: active ? form.channels.filter((x) => x !== ch.id) || [] : [...form.channels, ch.id], type: active && form.channels.length === 1 ? 'email' : (form.channels.includes(ch.id) ? form.type : ch.id as any) })}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-black transition-all ${
                          active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {active ? <Check size={14} /> : <Icon size={14} />}
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1.5">الإرسال بيتم من وحدة القناة نفسها (إيميل/SMS/إشعارات) — من غير ما تنتقل بين صفحات.</p>
              </div>

              {/* المحتوى */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5 block"><LinkIcon size={13} className="text-slate-400" />رابط الحملة (اختياري)</label>
                  <input type="text" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" dir="ltr" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">نص زر الإجراء (CTA)</label>
                  <input type="text" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="اطلب الآن" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">عرض / كوبون مرتبط (اختياري)</label>
                <input type="text" value={form.offerRef} onChange={(e) => setForm({ ...form, offerRef: e.target.value })} placeholder="SALE20 أو اسم العرض" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف / نص الحملة</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>

              {/* الجدولة + الميزانية */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البداية</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ النهاية</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الميزانية (اختياري)</label>
                  <input type="number" min={0} value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Campaign['status'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="draft">مسودة</option>
                    <option value="scheduled">مجدولة</option>
                    <option value="running">نشطة</option>
                    <option value="paused">متوقفة</option>
                    <option value="completed">منتهية</option>
                  </select>
                </div>
              </div>

              <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                {editCampaign ? 'حفظ التعديلات' : 'إنشاء الحملة'}
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
              <h2 className="text-xl font-black text-slate-900">دليل الحملات</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Info size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">إنشاء وإدارة الحملات التسويقية: هدف واضح، جمهور مستهدف من شرائح عملائك، قنوات إرسال متعددة، ومتابعة النتائج.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">الأهداف حسب نشاطك</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">النظام يفهم نوع نشاطك ويعرض الأهداف المناسبة فقط — ترويج منتج للمتاجر، حجز للعيادات والخدمات، اشتراكات للجيم وهكذا.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">النتائج</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• كل حملة بتعرض: الوصول، النقرات، التحويلات، والعائد</li>
                  <li>• الإرسال بيتم من وحدة القناة (إيميل/SMS/إشعارات) تلقائيًا</li>
                  <li>• اربط عرض أو كوبون بالحملة عشان تتتبع مبيعاتها</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}

// helper — نفس sid (موجود لوضوح الاستدعاء)
function shopId2(sid: string) { return sid; }

export default function CampaignsPageExport() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <CampaignsPage />
    </Suspense>
  );
}
