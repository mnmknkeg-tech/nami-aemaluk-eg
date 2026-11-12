'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Repeat,
  Search,
  Loader2,
  Plus,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  PauseCircle,
  AlertCircle,
  CreditCard,
  RefreshCw,
  MoreVertical,
  Snowflake,
  Ban,
  Eye,
  User,
  Phone,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useShop } from '@/hooks/useShop';
import { useModuleGuard } from '@/hooks/useModuleGuard';

/* ============================================================
 * الاشتراكات — اشتراكات الأعضاء
 * ============================================================ */

type MemberSubscription = {
  id: string;
  shop_id: string;
  customer_id: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: string;
  price: number;
  currency: string;
  start_date: string;
  end_date: string;
  trial_end_date?: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  auto_renew: boolean;
  frozen_days: number;
  cancel_reason?: string;
  notes?: string;
  created_at: string;
  // Joined
  customer_name: string;
  customer_phone: string;
  customer_email: string;
};

type SubscriptionStats = {
  total_active: number;
  total_expired: number;
  total_frozen: number;
  total_cancelled: number;
  expiring_this_week: number;
  expiring_this_month: number;
  overdue_payments: number;
  monthly_revenue: number;
  total_revenue: number;
};

type Plan = { id: string; name: string; name_ar?: string; billing_cycle: string; price: number };

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string; icon: React.ElementType; dot: string }
> = {
  active: {
    label: 'نشط',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
  trial: {
    label: 'تجريبي',
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: Sparkles,
    dot: 'bg-sky-500',
  },
  expired: {
    label: 'منتهي',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: XCircle,
    dot: 'bg-slate-400',
  },
  frozen: {
    label: 'مجمد',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Snowflake,
    dot: 'bg-blue-500',
  },
  cancelled: {
    label: 'ملغي',
    cls: 'bg-red-50 text-red-600 border-red-200',
    icon: Ban,
    dot: 'bg-red-500',
  },
  pending: {
    label: 'معلق',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
    dot: 'bg-amber-500',
  },
};

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  paid: { label: 'مدفوع', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'معلق', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'متأخر', cls: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'مُسترد', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  waived: { label: 'مُعفى', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const CYCLE_AR: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
  quarterly: 'ربع سنوي',
  weekly: 'أسبوعي',
  custom: 'مخصص',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

function daysDiff(date: string): number {
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SubscriptionsPage() {
  const { allowed } = useModuleGuard('subscriptions');
  const { shop } = useShop();
  const shopId = shop?.id || '';

  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusTab, setStatusTab] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const [subsRes, plansRes, statsRes] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/subscriptions?limit=500`),
        apiRequest(`/shops/${shopId}/subscriptions/plans`),
        apiRequest(`/shops/${shopId}/subscriptions/stats`),
      ]);
      if (subsRes.status === 'fulfilled') {
        const d = subsRes.value?.data || subsRes.value;
        setSubscriptions(Array.isArray(d) ? d : []);
      } else {
        setError('تعذر تحميل الاشتراكات');
      }
      if (plansRes.status === 'fulfilled') {
        const d = plansRes.value?.data || plansRes.value;
        setPlans(Array.isArray(d) ? d : []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data || null);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  // Close menu on outside click
  useEffect(() => {
    const h = () => setMenuOpenId(null);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    let r = [...subscriptions];
    if (statusTab !== 'all') r = r.filter((s) => s.status === statusTab);
    if (paymentFilter) r = r.filter((s) => s.payment_status === paymentFilter);
    if (planFilter) r = r.filter((s) => s.plan_id === planFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(q) ||
          s.customer_phone.includes(q) ||
          s.plan_name.toLowerCase().includes(q) ||
          s.customer_email.toLowerCase().includes(q)
      );
    }
    return r;
  }, [subscriptions, statusTab, paymentFilter, planFilter, debouncedSearch]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusTab, paymentFilter, planFilter, debouncedSearch]);

  const counts = useMemo(
    () => ({
      all: subscriptions.length,
      active: subscriptions.filter((s) => s.status === 'active').length,
      trial: subscriptions.filter((s) => s.status === 'trial').length,
      expired: subscriptions.filter((s) => s.status === 'expired').length,
      frozen: subscriptions.filter((s) => s.status === 'frozen').length,
      cancelled: subscriptions.filter((s) => s.status === 'cancelled').length,
      pending: subscriptions.filter((s) => s.status === 'pending').length,
    }),
    [subscriptions]
  );

  const handleAction = async (sub: MemberSubscription, action: string) => {
    setActionLoading(sub.id);
    setMenuOpenId(null);
    try {
      if (action === 'freeze') {
        await apiRequest(`/shops/${shopId}/subscriptions/${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'frozen' }),
        });
      } else if (action === 'activate') {
        await apiRequest(`/shops/${shopId}/subscriptions/${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'active' }),
        });
      } else if (action === 'cancel') {
        await apiRequest(`/shops/${shopId}/subscriptions/${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } else if (action === 'mark_paid') {
        await apiRequest(`/shops/${shopId}/subscriptions/${sub.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ payment_status: 'paid' }),
        });
      }
      await load();
    } catch {
      // handle error
    } finally {
      setActionLoading(null);
    }
  };

  const exportCSV = useCallback(() => {
    const rows = [
      [
        'العضو',
        'الهاتف',
        'الباقة',
        'الدورة',
        'السعر',
        'البداية',
        'النهاية',
        'الحالة',
        'الدفع',
        'التجديد التلقائي',
      ].join(','),
      ...filtered.map((s) =>
        [
          s.customer_name,
          s.customer_phone,
          s.plan_name,
          CYCLE_AR[s.billing_cycle] || s.billing_cycle,
          s.price,
          s.start_date,
          s.end_date,
          STATUS_CONFIG[s.status]?.label || s.status,
          PAYMENT_CONFIG[s.payment_status]?.label || s.payment_status,
          s.auto_renew ? 'نعم' : 'لا',
        ].join(',')
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv;charset=utf-8;' }));
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [filtered]);

  const TABS = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'active', label: 'نشط', count: counts.active },
    { id: 'trial', label: 'تجريبي', count: counts.trial },
    { id: 'pending', label: 'معلق', count: counts.pending },
    { id: 'frozen', label: 'مجمد', count: counts.frozen },
    { id: 'expired', label: 'منتهي', count: counts.expired },
    { id: 'cancelled', label: 'ملغي', count: counts.cancelled },
  ];

  if (allowed === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (allowed === false) {
    return null;
  }

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">اشتراكات الأعضاء</h1>
              <button
                onClick={() => setGuideOpen((v) => !v)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <Info size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة اشتراكات الأعضاء الشهرية والسنوية — تجديد، تجميد، إلغاء
              {subscriptions.length > 0 && (
                <span className="font-semibold"> — {subscriptions.length} اشتراك</span>
              )}
              {stats && stats.overdue_payments > 0 && (
                <span className="text-red-600 font-semibold">
                  {' '}
                  — {stats.overdue_payments} متأخر الدفع
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Download size={13} />
              تصدير
            </button>
            <Link
              href="/dashboard/subscriptions/plans"
              className="h-10 px-4 rounded-full border border-violet-200 bg-violet-50 text-[12px] font-bold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5"
            >
              <CreditCard size={13} />
              الباقات
            </Link>
            <Link
              href="/dashboard/subscriptions/renewals"
              className="h-10 px-4 rounded-full border border-amber-200 bg-amber-50 text-[12px] font-bold text-amber-700 hover:bg-amber-100 flex items-center gap-1.5"
            >
              <Clock size={13} />
              التجديدات
            </Link>
            <Link
              href="/dashboard/subscriptions/new"
              className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Plus size={13} />
              اشتراك جديد
            </Link>
          </div>
        </div>
      </div>

      {/* دليل الاستخدام */}
      {guideOpen && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-[12px] text-violet-800">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="shrink-0 mt-0.5 text-violet-600" />
              <div>
                <p className="font-bold mb-1">🤖 نظام الاشتراكات الذكي</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>
                    أنشئ <strong>الباقات</strong> أولاً من قسم "الباقات" — شهري، سنوي، ربع سنوي
                  </li>
                  <li>
                    اضغط <strong>اشتراك جديد</strong> لربط عميل بباقة وتحديد تاريخ البداية
                  </li>
                  <li>
                    في قسم <strong>التجديدات</strong>: اشتراكات قريبة الانتهاء وإمكانية التجديد
                    الجماعي
                  </li>
                  <li>
                    يمكنك <strong>تجميد</strong> اشتراك مؤقتاً أو <strong>إلغاؤه</strong> مع حفظ
                    السبب
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] font-bold">
            <AlertCircle size={15} />
            {error}
          </div>
        </div>
      )}

      {/* فلاتر وبحث */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          {/* تابات الحالة */}
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto border-b border-slate-100">
            {TABS.map((t) => {
              const isActive = statusTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setStatusTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] tabular-nums px-1.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* بحث وفلاتر */}
          <div className="px-2 sm:px-3 pb-2 pt-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو الباقة..."
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">كل حالات الدفع</option>
              <option value="paid">مدفوع</option>
              <option value="pending">معلق</option>
              <option value="overdue">متأخر</option>
              <option value="waived">مُعفى</option>
            </select>
            {plans.length > 0 && (
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">كل الباقات</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar || p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-violet-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <Repeat size={28} className="text-violet-500" />
            </div>
            <p className="text-slate-700 font-bold text-lg">لا توجد اشتراكات</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              أنشئ باقاتك أولاً ثم اضف اشتراكات الأعضاء
            </p>
            <Link
              href="/dashboard/subscriptions/plans"
              className="px-5 py-2.5 bg-violet-600 text-white rounded-full text-sm font-bold hover:bg-violet-700"
            >
              إنشاء باقة جديدة
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3">
                    العضو
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3 hidden sm:table-cell">
                    الباقة
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3 hidden md:table-cell">
                    الفترة
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3 hidden lg:table-cell">
                    الانتهاء
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3">
                    الحالة
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3 hidden sm:table-cell">
                    الدفع
                  </th>
                  <th className="text-right text-[11px] font-black text-slate-500 px-4 py-3">
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sub) => {
                  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                  const paymentCfg = PAYMENT_CONFIG[sub.payment_status] || PAYMENT_CONFIG.pending;
                  const daysLeft = daysDiff(sub.end_date);
                  const isExpanded = expandedId === sub.id;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <React.Fragment key={sub.id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-violet-50/30' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      >
                        {/* العضو */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
                            <div>
                              <p className="text-[13px] font-bold text-slate-900 leading-tight">
                                {sub.customer_name || 'غير محدد'}
                              </p>
                              <p className="text-[11px] text-slate-400">{sub.customer_phone}</p>
                            </div>
                          </div>
                        </td>
                        {/* الباقة */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div>
                            <p className="text-[12px] font-bold text-slate-800">{sub.plan_name}</p>
                            <p className="text-[11px] text-slate-400">
                              {CYCLE_AR[sub.billing_cycle] || sub.billing_cycle}
                            </p>
                          </div>
                        </td>
                        {/* السعر */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[13px] font-black text-slate-900">
                            {fmt(sub.price)} {sub.currency}
                          </span>
                        </td>
                        {/* الانتهاء */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div>
                            <p className="text-[12px] font-bold text-slate-700">
                              {new Date(sub.end_date).toLocaleDateString('ar-EG')}
                            </p>
                            <p
                              className={`text-[11px] font-bold ${daysLeft <= 7 ? 'text-red-500' : daysLeft <= 30 ? 'text-amber-500' : 'text-slate-400'}`}
                            >
                              {daysLeft > 0
                                ? `${daysLeft} يوم متبقي`
                                : daysLeft === 0
                                  ? 'ينتهي اليوم'
                                  : `انتهى منذ ${Math.abs(daysLeft)} يوم`}
                            </p>
                          </div>
                        </td>
                        {/* الحالة */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-black ${statusCfg.cls}`}
                          >
                            <StatusIcon size={10} />
                            {statusCfg.label}
                          </span>
                        </td>
                        {/* الدفع */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-black ${paymentCfg.cls}`}
                          >
                            {paymentCfg.label}
                          </span>
                        </td>
                        {/* إجراءات */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={16} className="text-slate-400" />
                            )}
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setMenuOpenId(menuOpenId === sub.id ? null : sub.id)}
                                className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                              >
                                {actionLoading === sub.id ? (
                                  <Loader2 size={14} className="animate-spin text-violet-500" />
                                ) : (
                                  <MoreVertical size={14} className="text-slate-500" />
                                )}
                              </button>
                              {menuOpenId === sub.id && (
                                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44">
                                  {sub.status !== 'active' && (
                                    <button
                                      onClick={() => handleAction(sub, 'activate')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 size={13} /> تفعيل
                                    </button>
                                  )}
                                  {sub.status === 'active' && (
                                    <button
                                      onClick={() => handleAction(sub, 'freeze')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-blue-700 hover:bg-blue-50"
                                    >
                                      <Snowflake size={13} /> تجميد
                                    </button>
                                  )}
                                  {sub.payment_status !== 'paid' && (
                                    <button
                                      onClick={() => handleAction(sub, 'mark_paid')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <CreditCard size={13} /> تسجيل الدفع
                                    </button>
                                  )}
                                  <Link
                                    href={`/dashboard/subscriptions/${sub.id}/renew`}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-violet-700 hover:bg-violet-50"
                                  >
                                    <RefreshCw size={13} /> تجديد
                                  </Link>
                                  {sub.status !== 'cancelled' && (
                                    <button
                                      onClick={() => handleAction(sub, 'cancel')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-red-600 hover:bg-red-50"
                                    >
                                      <Ban size={13} /> إلغاء
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* صف التفاصيل */}
                      {isExpanded && (
                        <tr className="bg-violet-50/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12px]">
                              <div>
                                <p className="text-slate-400 font-bold mb-0.5">البريد الإلكتروني</p>
                                <p className="text-slate-800 font-bold">
                                  {sub.customer_email || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold mb-0.5">تاريخ البداية</p>
                                <p className="text-slate-800 font-bold">
                                  {new Date(sub.start_date).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold mb-0.5">طريقة الدفع</p>
                                <p className="text-slate-800 font-bold">
                                  {sub.payment_method || '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-bold mb-0.5">تجديد تلقائي</p>
                                <p
                                  className={`font-bold ${sub.auto_renew ? 'text-emerald-600' : 'text-slate-400'}`}
                                >
                                  {sub.auto_renew ? 'مفعّل' : 'غير مفعّل'}
                                </p>
                              </div>
                              {sub.notes && (
                                <div className="col-span-2">
                                  <p className="text-slate-400 font-bold mb-0.5">ملاحظات</p>
                                  <p className="text-slate-700">{sub.notes}</p>
                                </div>
                              )}
                              {sub.cancel_reason && (
                                <div className="col-span-2">
                                  <p className="text-slate-400 font-bold mb-0.5">سبب الإلغاء</p>
                                  <p className="text-red-600 font-bold">{sub.cancel_reason}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Link
                                href={`/dashboard/customers/${sub.customer_id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <User size={11} /> ملف العميل
                              </Link>
                              <Link
                                href={`/dashboard/subscriptions/${sub.id}/renew`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-full text-[11px] font-bold hover:bg-violet-700"
                              >
                                <RefreshCw size={11} /> تجديد الاشتراك
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-bold">
                  {filtered.length} اشتراك — صفحة {currentPage} من {totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 text-[12px] font-bold"
                  >
                    &rsaquo;
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 text-[12px] font-bold"
                  >
                    &lsaquo;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
