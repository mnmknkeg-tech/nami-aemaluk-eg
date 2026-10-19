'use client';

/**
 * مركز التسويق — الصفحة الرئيسية لقسم التسويق (بدل الترويج والـ hub القديمين).
 * تبويبات: نظرة عامة (لوحة الحملات والقنوات) + بانرات الموقع (الترويج القديم كاملًا).
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Megaphone, RefreshCw, Info, X, Download, TrendingUp, TrendingDown, Plus, Edit, Trash2,
  Mail, MessageSquare, Bell, Tag, CalendarHeart, Percent, Users, Activity, Target,
  Check, Loader2, Search, Send, Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import Link from 'next/link';
import {
  INV_PAGE_FONT,
  SectionTabs,
  useInvSectionTab,
  InvControlsCard,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvToolbar,
  InvToolButton,
  InvLoading,
  InvEmpty,
  InvBulkBar,
} from '@/components/inventory/InventoryShell';

type HubCampaign = {
  id: string; name: string;
  channel: 'email' | 'sms' | 'push' | 'coupon' | 'seasonal' | 'discount';
  status: 'active' | 'scheduled' | 'paused' | 'ended';
  sentCount: number; openCount: number; clickCount: number; revenue: number;
  startDate: string; endDate: string;
};
type HubData = {
  totalCampaigns: number; activeCampaigns: number; totalReach: number;
  totalEngagement: number; totalRevenue: number; avgROI: number;
  campaigns: HubCampaign[]; channelStats: { channel: string; count: number; reach: number; revenue: number }[];
};

type Promotion = {
  id: string; name: string; nameAr: string;
  type: 'banner' | 'popup' | 'slider' | 'sidebar' | 'custom';
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string; endDate: string; priority: number; targetAudience: string;
  impressions: number; clicks: number; conversions: number; ctr: number;
  description: string; imageUrl: string;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) => (s ? new Date(s).toLocaleDateString('ar-EG') : '—');

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; cls: string; href: string }> = {
  email: { label: 'إيميل', icon: Mail, cls: 'bg-blue-50 text-blue-600', href: '/dashboard/marketing/messages?tab=email' },
  sms: { label: 'SMS', icon: MessageSquare, cls: 'bg-green-50 text-green-600', href: '/dashboard/marketing/messages?tab=sms' },
  push: { label: 'إشعار', icon: Bell, cls: 'bg-purple-50 text-purple-600', href: '/dashboard/marketing/messages?tab=push' },
  coupon: { label: 'كوبون', icon: Tag, cls: 'bg-amber-50 text-amber-600', href: '/dashboard/marketing/offers?tab=coupons' },
  seasonal: { label: 'موسمي', icon: CalendarHeart, cls: 'bg-pink-50 text-pink-600', href: '/dashboard/marketing/offers?tab=seasonal' },
  discount: { label: 'خصم', icon: Percent, cls: 'bg-cyan-50 text-cyan-600', href: '/dashboard/marketing/offers?tab=discounts' },
};

const SECTION_TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'promotions', label: 'بانرات الموقع' },
];

// ═══════════════════════════ نظرة عامة ═══════════════════════════
function HubOverview({ guideOpen, setGuideOpen }: { guideOpen: boolean; setGuideOpen: (v: boolean) => void }) {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const res = await apiRequest(`/marketing/hub/shop/${sid}`).catch(() => null);
      if (!res) { setData(null); setLoading(false); return; }
      setData({
        totalCampaigns: Number(res?.totalCampaigns ?? 0), activeCampaigns: Number(res?.activeCampaigns ?? 0),
        totalReach: Number(res?.totalReach ?? 0), totalEngagement: Number(res?.totalEngagement ?? 0),
        totalRevenue: Number(res?.totalRevenue ?? 0), avgROI: Number(res?.avgROI ?? 0),
        campaigns: (res?.campaigns || []).map((c: any) => ({
          id: String(c.id), name: c.name || '---', channel: c.channel || 'email', status: c.status || 'active',
          sentCount: Number(c.sentCount ?? 0), openCount: Number(c.openCount ?? 0), clickCount: Number(c.clickCount ?? 0),
          revenue: Number(c.revenue ?? 0), startDate: c.startDate || '', endDate: c.endDate || '',
        })),
        channelStats: (res?.channelStats || []).map((cs: any) => ({
          channel: cs.channel || 'email', count: Number(cs.count ?? 0), reach: Number(cs.reach ?? 0), revenue: Number(cs.revenue ?? 0),
        })),
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const exportCSV = () => {
    if (!data) return;
    const headers = ['Campaign', 'Channel', 'Status', 'Sent', 'Opened', 'Clicked', 'Revenue'];
    const rows = data.campaigns.map((c) => [c.name, c.channel, c.status, c.sentCount, c.openCount, c.clickCount, c.revenue]);
    const blob = new Blob([[headers, ...rows].map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'marketing-hub.csv';
    link.click();
  };

  const STATUS_TONE: Record<string, 'emerald' | 'slate' | 'red' | 'amber'> = { active: 'emerald', scheduled: 'amber', paused: 'amber', ended: 'slate' };
  const STATUS_LABEL: Record<string, string> = { active: 'نشطة', scheduled: 'مجدولة', paused: 'متوقفة', ended: 'منتهية' };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar
        hint={
          data ? (
            <>
              {fmt(data.totalCampaigns)} حملة • {fmt(data.activeCampaigns)} نشطة • وصول {fmt(data.totalReach)} • تفاعل {fmt(data.totalEngagement)}
              {data.totalRevenue > 0 && <span className="text-emerald-600"> — إيرادات ج.م {fmt(data.totalRevenue)}</span>}
              {data.avgROI !== 0 && <span className={data.avgROI >= 0 ? 'text-emerald-600' : 'text-red-500'}> • ROI {data.avgROI.toFixed(1)}%</span>}
            </>
          ) : undefined
        }
      >
        <InvToolButton onClick={refresh}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </InvToolButton>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
      </InvToolbar>

      <div className="mt-4">
        {/* اختصارات القنوات — أزرار دائرية تصل لكل أقسام التسويق */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/dashboard/marketing/campaigns" className="h-10 px-4 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
            <Plus size={14} />
            إنشاء حملة تسويقية
          </Link>
          <Link href="/dashboard/marketing/offers" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <Percent size={14} />
            إنشاء عرض ترويجي
          </Link>
          <Link href="/dashboard/marketing/offers?tab=coupons" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <Tag size={14} />
            كوبون تخفيض
          </Link>
          <Link href="/dashboard/marketing/messages" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <Send size={14} />
            إرسال رسالة مباشرة
          </Link>
          <Link href="/dashboard/marketing/loyalty-programs" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <Sparkles size={14} />
            برامج ولاء العملاء
          </Link>
        </div>

        {loading ? (
          <InvLoading />
        ) : !data || data.campaigns.length === 0 ? (
          <div className="space-y-6">
            {/* بطاقات الميزات التسويقية المتكاملة */}
            <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
              <div className="max-w-2xl">
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-3">
                  منظومة التسويق الذكي
                </span>
                <h2 className="text-xl font-black mb-2">أدوات تسويقية متكاملة لمضاعفة مبيعات متجرك</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ابدأ حملاتك الإعلانية عبر قنوات متعددة، قدّم عروضًا وكوبونات تجذب عملاءك، فعّل برامج الولاء لزيادة تكرار الشراء، وتواصل بذكاء مع عملائك في كل مرحلة.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/marketing/campaigns" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Megaphone size={20} />
                </div>
                <h3 className="font-black text-sm text-slate-900 mb-1">الحملات الإعلانية</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  أطلق حملاتك عبر الإيميل، الرسائل النصية، والإشعارات الموجهة لشرائح عملاء محددة.
                </p>
                <span className="text-xs font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                  بدء حملة جديدة ←
                </span>
              </Link>

              <Link href="/dashboard/marketing/offers" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all group">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Percent size={20} />
                </div>
                <h3 className="font-black text-sm text-slate-900 mb-1">العروض والخصومات</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  أنشئ كوبونات تخفيض، خصومات على أقسام ومنتجات محددة، وعروض المواسم والأعياد.
                </p>
                <span className="text-xs font-bold text-amber-600 group-hover:underline flex items-center gap-1">
                  إدارة العروض ←
                </span>
              </Link>

              <Link href="/dashboard/marketing/messages" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all group">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <MessageSquare size={20} />
                </div>
                <h3 className="font-black text-sm text-slate-900 mb-1">الرسائل والتواصل</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  تواصل عبر SMS وبريد إلكتروني بقوالب جاهزة لتأكيد الطلبات والحجوزات والتذكيرات.
                </p>
                <span className="text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                  إرسال رسائل ←
                </span>
              </Link>

              <Link href="/dashboard/marketing/loyalty-programs" className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-purple-300 hover:shadow-sm transition-all group">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-black text-sm text-slate-900 mb-1">برامج الولاء والمكافآت</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  امنح عملاءك نقاطًا مع كل طلب ومستويات ولاء حصرية لزيادة تكرار الشراء.
                </p>
                <span className="text-xs font-bold text-purple-600 group-hover:underline flex items-center gap-1">
                  إعداد نظام الولاء ←
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* أداء القنوات */}
            {data.channelStats.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
                <h2 className="font-bold text-slate-900 text-sm mb-4">أداء قنوات التواصل</h2>
                <div className="space-y-3">
                  {data.channelStats.map((cs, i) => {
                    const config = CHANNEL_CONFIG[cs.channel] || CHANNEL_CONFIG.email;
                    const Icon = config.icon;
                    const maxRevenue = Math.max(...data.channelStats.map((c) => c.revenue), 1);
                    const widthPct = (cs.revenue / maxRevenue) * 100;
                    return (
                      <Link key={i} href={config.href} className="flex items-center gap-3 group">
                        <div className={`p-2 rounded-lg ${config.cls} shrink-0`}><Icon size={16} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{config.label} — {cs.count} حملة</span>
                            <span className="text-xs font-bold text-slate-900">{fmt(cs.revenue)} ج.م</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00E5FF] rounded-full transition-all" style={{ width: `${Math.max(widthPct, 2)}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 shrink-0 w-16 text-left">{fmt(cs.reach)} وصول</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* الحملات */}
            <InvTableCard
              columns={[
                { label: 'الحملة', className: 'col-span-3' },
                { label: 'القناة', className: 'col-span-2' },
                { label: 'الحالة', className: 'col-span-2' },
                { label: 'وصلت', className: 'col-span-1' },
                { label: 'فتحت', className: 'col-span-1' },
                { label: 'نقرت', className: 'col-span-1' },
                { label: 'الإيرادات', className: 'col-span-2' },
              ]}
            >
              {data.campaigns.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Megaphone size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm">لا توجد حملات — <Link href="/dashboard/marketing/campaigns" className="text-[#0098a8] underline">ابدأ حملتك الأولى</Link></p>
                </div>
              ) : (
                data.campaigns.slice(0, 15).map((c) => {
                  const config = CHANNEL_CONFIG[c.channel] || CHANNEL_CONFIG.email;
                  const Icon = config.icon;
                  return (
                    <InvRow key={c.id}>
                      <Link href="/dashboard/marketing/campaigns" className="col-span-3 font-bold text-slate-900 text-xs sm:text-sm truncate hover:text-teal-600">{c.name}</Link>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold ${config.cls}`}>
                          <Icon size={12} />
                          {config.label}
                        </span>
                      </div>
                      <div className="col-span-2"><InvStatusPill tone={STATUS_TONE[c.status] || 'slate'}>{STATUS_LABEL[c.status] || c.status}</InvStatusPill></div>
                      <div className="col-span-1 pr-3 text-slate-600 text-xs font-semibold">{fmt(c.sentCount)}</div>
                      <div className="col-span-1 pr-3 text-slate-600 text-xs font-semibold">{fmt(c.openCount)}</div>
                      <div className="col-span-1 pr-3 text-slate-600 text-xs font-semibold">{fmt(c.clickCount)}</div>
                      <div className="col-span-2 pr-4 font-bold text-emerald-600 text-xs sm:text-sm">{fmt(c.revenue)} ج.م</div>
                    </InvRow>
                  );
                })
              )}
            </InvTableCard>
          </>
        )}
      </div>

      {/* Guide */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل مركز التسويق</h2>
              <button onClick={() => setGuideOpen(false)} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2"><Info size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">وظيفة الصفحة</h3></div>
                <p className="text-sm text-slate-600 leading-relaxed">نقطة البداية لكل التسويق: نظرة على الحملات والقنوات والإيرادات، واختصارات لكل الأدوات.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-slate-700" /><h3 className="font-bold text-slate-900">الأقسام الخمسة</h3></div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• مركز التسويق: النظرة العامة + بانرات الموقع</li>
                  <li>• الحملات: إنشاء ومتابعة الحملات</li>
                  <li>• العروض والخصومات: خصومات وكوبونات وموسمية</li>
                  <li>• الرسائل والتواصل: إيميل وSMS وإشعارات وقوالب</li>
                  <li>• برامج الولاء: النقاط والمستويات والمكافآت</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════ بانرات الموقع (الترويج) ═══════════════════════════
function PromotionsView() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editPromotion, setEditPromotion] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '', nameAr: '', type: 'banner' as Promotion['type'], status: 'active' as Promotion['status'],
    startDate: new Date().toISOString().split('T')[0], endDate: '', priority: 1,
    targetAudience: 'all', description: '', imageUrl: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const res = await apiRequest(`/promotions/shop/${sid}`).catch(() => []);
      const data = Array.isArray(res) ? res : res?.data || [];
      setPromotions(data.map((p: any) => ({
        id: String(p.id), name: p.name || '---', nameAr: p.nameAr || p.name_ar || '---',
        type: p.type || 'banner', status: p.status || 'active',
        startDate: p.startDate || p.start_date || '', endDate: p.endDate || p.end_date || '',
        priority: Number(p.priority || 1), targetAudience: p.targetAudience || p.target_audience || 'all',
        impressions: Number(p.impressions || 0), clicks: Number(p.clicks || 0), conversions: Number(p.conversions || 0),
        ctr: Number(p.ctr || 0), description: p.description || '', imageUrl: p.imageUrl || p.image_url || '',
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPromotions(); }, [loadPromotions]);

  const filtered = useMemo(() => {
    let result = promotions.filter((p) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.nameAr.includes(debouncedSearch)
    );
    if (filterStatus !== 'all') result = result.filter((p) => p.status === filterStatus);
    if (filterType !== 'all') result = result.filter((p) => p.type === filterType);
    return result;
  }, [promotions, debouncedSearch, filterStatus, filterType]);

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((p) => p.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} ترويج؟`)) return;
    alert(`تم حذف ${selectedIds.size} ترويج`);
    setSelectedIds(new Set());
    loadPromotions();
  };

  const handleSave = async (isEdit: boolean) => {
    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      if (isEdit && editPromotion) {
        await apiRequest(`/promotions/${editPromotion.id}`, { method: 'PUT', body: JSON.stringify(formData) });
        setEditModal(false); setEditPromotion(null);
      } else {
        await apiRequest('/promotions', { method: 'POST', body: JSON.stringify({ ...formData, shopId: sid }) });
        setAddModal(false);
      }
      setFormData(emptyForm);
      loadPromotions();
    } catch { alert('حدث خطأ أثناء الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الترويج؟')) return;
    try { await apiRequest(`/promotions/${id}`, { method: 'DELETE' }); loadPromotions(); }
    catch { alert('حدث خطأ أثناء الحذف'); }
  };

  const openEdit = (p: Promotion) => {
    setEditPromotion(p);
    setFormData({
      name: p.name, nameAr: p.nameAr, type: p.type, status: p.status,
      startDate: p.startDate?.split('T')[0] || '', endDate: p.endDate?.split('T')[0] || '',
      priority: p.priority, targetAudience: p.targetAudience, description: p.description, imageUrl: p.imageUrl,
    });
    setEditModal(true);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Type', 'Status', 'Start', 'End', 'Priority', 'Impressions', 'Clicks', 'Conversions', 'CTR'];
    const rows = filtered.map((p) => [p.name, p.type, p.status, p.startDate, p.endDate, p.priority, p.impressions, p.clicks, p.conversions, p.ctr]);
    const blob = new Blob([[headers, ...rows].map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'promotions.csv';
    link.click();
  };

  const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
    banner: { label: 'بانر', cls: 'bg-blue-50 text-blue-600' },
    popup: { label: 'نافذة', cls: 'bg-purple-50 text-purple-600' },
    slider: { label: 'شريط', cls: 'bg-green-50 text-green-600' },
    sidebar: { label: 'جانبي', cls: 'bg-amber-50 text-amber-600' },
    custom: { label: 'مخصص', cls: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
      <InvToolbar hint={`${promotions.length} ترويج • ${promotions.filter((p) => p.status === 'active').length} نشط`}>
        <InvToolButton onClick={exportCSV}>
          <Download size={14} />
          تصدير CSV
        </InvToolButton>
        <InvToolButton primary onClick={() => { setFormData(emptyForm); setAddModal(true); }}>
          <Plus size={14} />
          ترويج جديد
        </InvToolButton>
      </InvToolbar>

      <div className="mt-3">
        <InvControlsCard
          tabs={[
            { id: 'all', label: 'الكل', count: promotions.length },
            { id: 'active', label: 'نشط', count: promotions.filter((p) => p.status === 'active').length },
            { id: 'inactive', label: 'غير نشط', count: promotions.filter((p) => p.status === 'inactive').length },
            { id: 'scheduled', label: 'مجدول', count: promotions.filter((p) => p.status === 'scheduled').length },
          ]}
          activeTab={filterStatus}
          onTabChange={(id) => { setFilterStatus(id); setCurrentPage(1); }}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="دوّر باسم الترويج…"
          filters={
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
            >
              <option value="all">كل الأنواع</option>
              <option value="banner">بانر</option>
              <option value="popup">نافذة منبثقة</option>
              <option value="slider">شريط</option>
              <option value="sidebar">شريط جانبي</option>
              <option value="custom">مخصص</option>
            </select>
          }
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <InvLoading />
        ) : filtered.length === 0 ? (
          <InvEmpty icon={Megaphone} title="لا توجد ترويجات" />
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-3">
                <InvBulkBar>
                  <span>{selectedIds.size} ترويج محدد</span>
                  <button onClick={bulkDelete} className="h-8 px-3 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold flex items-center gap-1.5">
                    <Trash2 size={13} />
                    حذف
                  </button>
                </InvBulkBar>
              </div>
            )}

            <InvTableCard
              headerExtra={
                <div className="col-span-1 flex items-center">
                  <button onClick={toggleSelectAll} className="p-1" title="تحديد الكل">
                    {selectedIds.size === paginated.length && paginated.length > 0 ? (
                      <Check size={16} className="text-[#00E5FF]" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                    )}
                  </button>
                </div>
              }
              columns={[
                { label: 'الترويج', className: 'col-span-3' },
                { label: 'النوع', className: 'col-span-1' },
                { label: 'الفترة', className: 'col-span-2' },
                { label: 'الأداء', className: 'col-span-2' },
                { label: 'CTR', className: 'col-span-1' },
                { label: 'الحالة', className: 'col-span-1' },
                { label: 'إجراءات', className: 'col-span-1' },
              ]}
            >
              {paginated.map((p) => {
                const typeConfig = TYPE_CONFIG[p.type] || TYPE_CONFIG.custom;
                return (
                  <InvRow key={p.id} muted={p.status === 'inactive'}>
                    <div className="col-span-1 flex items-center">
                      <button onClick={() => toggleSelect(p.id)} className="p-1">
                        {selectedIds.has(p.id) ? (
                          <Check size={16} className="text-[#00E5FF]" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-3 min-w-0 pr-2">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{p.name}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5 truncate">{p.nameAr} • أولوية {p.priority}</div>
                    </div>
                    <div className="col-span-1">
                      <span className={`h-8 px-3 inline-flex items-center rounded-full text-[11px] font-bold ${typeConfig.cls}`}>{typeConfig.label}</span>
                    </div>
                    <div className="col-span-2 pr-4 text-slate-500 text-xs">{d(p.startDate)} → {d(p.endDate)}</div>
                    <div className="col-span-2 pr-4 text-xs">
                      <span className="font-bold text-slate-700">{fmt(p.impressions)} مشاهدة</span>
                      <span className="block text-[11px] text-slate-400 font-medium">{fmt(p.clicks)} نقرة • {fmt(p.conversions)} تحويل</span>
                    </div>
                    <div className="col-span-1 pr-3 font-bold text-slate-700 text-xs">{p.ctr.toFixed(1)}%</div>
                    <div className="col-span-1">
                      <InvStatusPill tone={p.status === 'active' ? 'emerald' : p.status === 'scheduled' ? 'amber' : 'slate'}>
                        {p.status === 'active' ? 'نشط' : p.status === 'scheduled' ? 'مجدول' : 'غير نشط'}
                      </InvStatusPill>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      <InvRowAction onClick={() => openEdit(p)} title="تعديل"><Edit size={14} /></InvRowAction>
                      <InvRowAction onClick={() => handleDelete(p.id)} title="حذف" danger><Trash2 size={14} /></InvRowAction>
                    </div>
                  </InvRow>
                );
              })}
            </InvTableCard>

            <InvPagination page={currentPage} totalPages={totalPages} total={filtered.length} perPage={itemsPerPage} onPage={setCurrentPage} label="ترويج" />
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(addModal || editModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setAddModal(false); setEditModal(false); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">{editModal ? 'تعديل الترويج' : 'ترويج جديد'}</h2>
              <button onClick={() => { setAddModal(false); setEditModal(false); }} className="p-2 hover:bg-slate-50 rounded-lg"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (إنجليزي)</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Promotion Name" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الاسم (عربي)</label>
                  <input type="text" value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} placeholder="اسم الترويج" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">النوع</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Promotion['type'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="banner">بانر</option>
                    <option value="popup">نافذة منبثقة</option>
                    <option value="slider">شريط</option>
                    <option value="sidebar">شريط جانبي</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الحالة</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Promotion['status'] })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="scheduled">مجدول</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">الأولوية</label>
                  <input type="number" min={1} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ البدء</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1 block">تاريخ النهاية</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الجمهور المستهدف</label>
                <select value={formData.targetAudience} onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="all">الكل</option>
                  <option value="new">جدد</option>
                  <option value="returning">عائدين</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">رابط الصورة</label>
                <input type="text" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://…" dir="ltr" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">الوصف</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200" />
              </div>
              <button onClick={() => handleSave(!!editModal)} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {editModal ? 'حفظ التعديلات' : 'إضافة الترويج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════ الصفحة الرئيسية ═══════════════════════════
function MarketingCenterContent() {
  const [activeTab, setTab] = useInvSectionTab(SECTION_TABS.map((t) => t.id), 'overview');
  const [guideOpen, setGuideOpen] = useState(false);

  const subtitle: Record<string, string> = {
    overview: 'لوحة تحكم موحدة لكل أدوات التسويق — الحملات والعروض والرسائل والولاء',
    promotions: 'بانرات ونوافذ الموقع الترويجية — بمشاهدات ونقرات وتحويلات',
  };

  return (
    <div className="min-h-full bg-[#F4F5F7] text-slate-900" style={INV_PAGE_FONT}>
      {/* الهيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">مركز التسويق</h1>
              <button onClick={() => setGuideOpen(true)} className="p-1 rounded-full text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
                <Info size={15} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle[activeTab]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/marketing/campaigns" className="h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors bg-slate-900 text-white hover:bg-slate-700">
              <Plus size={14} />
              حملة جديدة
            </Link>
            <Link href="/dashboard/marketing/offers" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
              <Percent size={14} />
              عرض جديد
            </Link>
            <Link href="/dashboard/marketing/messages" className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5">
              <Mail size={14} />
              رسالة
            </Link>
          </div>
        </div>
      </div>

      <SectionTabs tabs={SECTION_TABS} active={activeTab} onChange={setTab} />

      {activeTab === 'overview' && <HubOverview guideOpen={guideOpen} setGuideOpen={setGuideOpen} />}
      {activeTab === 'promotions' && <PromotionsView />}
    </div>
  );
}

export default function MarketingCenterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <MarketingCenterContent />
    </Suspense>
  );
}
