'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  User,
  Phone,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Filter,
  CreditCard,
  Send,
  CalendarClock,
  Sparkles,
  Info,
  Download,
  Users,
  Plus,
  XCircle,
  Check,
  X,
  MessageCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useShop } from '@/hooks/useShop';

/* ============================================================
 * التجديدات — تصميم موحد متوافق مع اشتراكات الأعضاء
 * ============================================================ */

interface MemberSubscription {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
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
  days_remaining?: number;
  notes?: string;
  created_at: string;
}

const CYCLE_AR: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
  quarterly: 'ربع سنوي',
  weekly: 'أسبوعي',
  custom: 'مخصص',
};

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  paid: { label: 'مدفوع', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'معلق', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'متأخر', cls: 'bg-red-50 text-red-600 border-red-200' },
  refunded: { label: 'مُسترد', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  waived: { label: 'مُعفى', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

function daysDiff(date: string): number {
  if (!date) return 0;
  const d = new Date(date);
  const now = new Date();
  // Strip time part for pure day comparison
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RenewalsPage() {
  const { shop } = useShop();
  const shopId = shop?.id || '';

  const [subscriptions, setSubscriptions] = useState<MemberSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [windowFilter, setWindowFilter] = useState<'all' | 'due_7' | 'due_30' | 'expired' | 'renewed'>('due_7');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  // Renewal Modal
  const [renewingSub, setRenewingSub] = useState<MemberSubscription | null>(null);
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewPaymentStatus, setRenewPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');
  const [submittingRenew, setSubmittingRenew] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/shops/${shopId}/subscriptions?limit=500`);
      const items = res?.data || (Array.isArray(res) ? res : []);
      // Calculate days remaining on each
      const processed = items.map((s: MemberSubscription) => ({
        ...s,
        days_remaining: daysDiff(s.end_date),
      }));
      setSubscriptions(processed);
    } catch (err: any) {
      console.error('Failed to load renewals:', err);
      setError('تعذر تحميل بيانات التجديدات');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Statistics
  const stats = useMemo(() => {
    const due7 = subscriptions.filter(
      (s) => (s.days_remaining ?? 0) >= 0 && (s.days_remaining ?? 0) <= 7 && s.status === 'active'
    );
    const due30 = subscriptions.filter(
      (s) => (s.days_remaining ?? 0) > 7 && (s.days_remaining ?? 0) <= 30 && s.status === 'active'
    );
    const expired = subscriptions.filter(
      (s) => (s.days_remaining ?? 0) < 0 || s.status === 'expired'
    );
    const expectedRevenue = [...due7, ...expired].reduce((acc, s) => acc + (s.price || 0), 0);

    return {
      due7Count: due7.length,
      due30Count: due30.length,
      expiredCount: expired.length,
      expectedRevenue,
    };
  }, [subscriptions]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: subscriptions.length,
      due_7: subscriptions.filter(
        (s) => (s.days_remaining ?? 0) >= 0 && (s.days_remaining ?? 0) <= 7 && s.status === 'active'
      ).length,
      due_30: subscriptions.filter(
        (s) => (s.days_remaining ?? 0) >= 0 && (s.days_remaining ?? 0) <= 30 && s.status === 'active'
      ).length,
      expired: subscriptions.filter(
        (s) => (s.days_remaining ?? 0) < 0 || s.status === 'expired'
      ).length,
      renewed: subscriptions.filter((s) => s.status === 'active' && (s.days_remaining ?? 0) > 30).length,
    };
  }, [subscriptions]);

  // Filtered List
  const filtered = useMemo(() => {
    return subscriptions.filter((sub) => {
      const days = sub.days_remaining ?? 0;

      // Window tab filter
      if (windowFilter === 'due_7') {
        if (!(days >= 0 && days <= 7 && sub.status === 'active')) return false;
      } else if (windowFilter === 'due_30') {
        if (!(days >= 0 && days <= 30 && sub.status === 'active')) return false;
      } else if (windowFilter === 'expired') {
        if (!(days < 0 || sub.status === 'expired')) return false;
      } else if (windowFilter === 'renewed') {
        if (!(days > 30 && sub.status === 'active')) return false;
      }

      // Payment filter
      if (paymentFilter && sub.payment_status !== paymentFilter) return false;

      // Search query
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          sub.customer_name?.toLowerCase().includes(q) ||
          sub.plan_name?.toLowerCase().includes(q) ||
          sub.customer_phone?.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [subscriptions, windowFilter, paymentFilter, debouncedSearch]);

  const handleOpenRenewModal = (sub: MemberSubscription) => {
    setRenewingSub(sub);
    // Start date defaults to the day after end_date if in future, else today
    const nowStr = new Date().toISOString().split('T')[0];
    const defaultStart = sub.end_date && sub.end_date > nowStr ? sub.end_date : nowStr;
    setRenewStartDate(defaultStart);
    setRenewPaymentStatus('paid');
    setRenewPaymentMethod(sub.payment_method || 'cash');
  };

  const handleConfirmRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !renewingSub) return;
    setSubmittingRenew(true);

    try {
      const payload = {
        start_date: renewStartDate,
        payment_status: renewPaymentStatus,
        payment_method: renewPaymentMethod,
      };

      await apiRequest(`/shops/${shopId}/subscriptions/${renewingSub.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRenewingSub(null);
      loadSubscriptions();
    } catch (err: any) {
      alert(err?.message || 'تعذر تجديد الاشتراك');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const exportCSV = useCallback(() => {
    if (filtered.length === 0) return;
    const rows = [
      ['العضو', 'الهاتف', 'الباقة', 'السعر', 'تاريخ الانتهاء', 'الأيام المتبقية', 'حالة الدفع'].join(','),
      ...filtered.map((s) =>
        [
          s.customer_name,
          s.customer_phone || '',
          s.plan_name,
          s.price,
          s.end_date,
          s.days_remaining ?? '',
          PAYMENT_CONFIG[s.payment_status]?.label || s.payment_status,
        ].join(',')
      ),
    ].join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv;charset=utf-8;' }));
    a.download = `renewals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [filtered]);

  const getWhatsAppLink = (sub: MemberSubscription) => {
    if (!sub.customer_phone) return '';
    let phone = sub.customer_phone.replace(/\D/g, '');
    if (phone.startsWith('01')) phone = '2' + phone;
    const msg = `مرحباً ${sub.customer_name}، نود تذكيرك بأن اشتراكك في باقة (${sub.plan_name}) ينتهي في تاريخ ${sub.end_date}. نرجو التواصل معنا للتجديد لضمان استمرار الخدمة دون انقطاع. شكراً لك!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const TABS = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'due_7', label: 'خلال 7 أيام', count: counts.due_7 },
    { id: 'due_30', label: 'خلال 30 يوم', count: counts.due_30 },
    { id: 'expired', label: 'منتهية', count: counts.expired },
    { id: 'renewed', label: 'تم تجديدها مؤخراً', count: counts.renewed },
  ];

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر الصفحة */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">تجديدات الاشتراكات</h1>
              <button
                onClick={() => setGuideOpen((v) => !v)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="دليل متابعة التجديدات"
              >
                <Info size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة الاشتراكات المستحقة للتجديد — تجديد فوري، إرسال تذكيرات عبر واتساب
              {stats.due7Count > 0 && (
                <span className="text-amber-600 font-semibold"> — {stats.due7Count} مستحق هذا الأسبوع</span>
              )}
              {stats.expiredCount > 0 && (
                <span className="text-red-600 font-semibold"> — {stats.expiredCount} منتهي بحاجة لتجديد</span>
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
              href="/dashboard/subscriptions"
              className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Users size={13} />
              اشتراكات الأعضاء
            </Link>
            <Link
              href="/dashboard/subscriptions/plans"
              className="h-10 px-4 rounded-full border border-violet-200 bg-violet-50 text-[12px] font-bold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5"
            >
              <CreditCard size={13} />
              الباقات
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[12px] text-amber-900">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold mb-1">⚡ آلية متابعة التجديدات الذكية</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>الاشتراكات التي يتبقى على انتهائها 7 أيام أو أقل تُعرض كـ <strong>مستحقة قريباً</strong>.</li>
                  <li>اضغط <strong>تجديد</strong> لتسجيل دفعة جديدة وتمديد الاشتراك دورة إضافية تلقائياً.</li>
                  <li>زر <strong>واتساب</strong> ينشئ رسالة تذكير مخصصة باسم العضو وتاريخ الانتهاء بنقرة واحدة.</li>
                  <li>عند تجديد أي اشتراك يتم حفظ سجله القديم وربط التجديد الجديد به تلقائياً.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* تنبيه الخطأ */}
      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] font-bold">
            <AlertCircle size={15} />
            {error}
          </div>
        </div>
      )}

      {/* أدوات البحث والفلترة */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          {/* تابات الفترة الزمنية */}
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto border-b border-slate-100">
            {TABS.map((t) => {
              const isActive = windowFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setWindowFilter(t.id as any)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] tabular-nums px-1.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* بحث وفلتر حالة الدفع */}
          <div className="px-2 sm:px-3 pb-2 pt-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم العضو أو الهاتف أو الباقة..."
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
            </select>
            <button
              onClick={() => loadSubscriptions()}
              className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الاشتراكات المستحقة */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-20 text-center p-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-slate-800 font-bold text-lg">لا توجد اشتراكات مستحقة حالياً</p>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">
              جميع اشتراكات الأعضاء سارية ومجددة ولا توجد أي اشتراكات تتطلب تدخلاً في هذه الفترة
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {filtered.map((sub) => {
              const days = sub.days_remaining ?? 0;
              const isExpired = days < 0 || sub.status === 'expired';
              const isDueToday = days === 0;
              const isDueSoon = days > 0 && days <= 7;
              const waLink = getWhatsAppLink(sub);

              return (
                <div
                  key={sub.id}
                  className="p-4 hover:bg-slate-50/70 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Customer Info & Plan */}
                  <div className="flex items-center gap-3.5 min-w-[260px]">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isExpired
                          ? 'bg-rose-100 text-rose-700'
                          : isDueSoon || isDueToday
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {sub.customer_name ? sub.customer_name.slice(0, 2) : <User size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{sub.customer_name || 'عضو بدون اسم'}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            PAYMENT_CONFIG[sub.payment_status]?.cls || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {PAYMENT_CONFIG[sub.payment_status]?.label || sub.payment_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {sub.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {sub.customer_phone}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-semibold text-slate-600">{sub.plan_name}</span>
                        <span>•</span>
                        <span>{fmt(sub.price)} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Expiry badge */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>ينتهي: {sub.end_date}</span>
                      </div>
                      <div className="mt-1">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertCircle size={11} />
                            منتهي منذ {Math.abs(days)} يوم
                          </span>
                        ) : isDueToday ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock size={11} />
                            ينتهي اليوم!
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock size={11} />
                            متبقي {days} أيام
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            متبقي {days} يوم
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="إرسال تذكير عبر واتساب"
                      >
                        <MessageCircle size={13} />
                        تذكير
                      </a>
                    )}
                    <button
                      onClick={() => handleOpenRenewModal(sub)}
                      className="h-9 px-4 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <RefreshCw size={12} />
                      تجديد الاشتراك
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نافذة تأكيد التجديد */}
      {renewingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">تجديد اشتراك العضو</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تمديد الاشتراك لدورة جديدة وتسجيل حركة السداد
                </p>
              </div>
              <button
                onClick={() => setRenewingSub(null)}
                className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleConfirmRenew} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-xs text-slate-500 font-bold flex justify-between">
                  <span>اسم العضو:</span>
                  <span className="text-slate-900 font-black">{renewingSub.customer_name}</span>
                </div>
                <div className="text-xs text-slate-500 font-bold flex justify-between">
                  <span>الباقة:</span>
                  <span className="text-slate-900">{renewingSub.plan_name}</span>
                </div>
                <div className="text-xs text-slate-500 font-bold flex justify-between">
                  <span>قيمة التجديد:</span>
                  <span className="text-emerald-600 font-black">{fmt(renewingSub.price)} ج.م</span>
                </div>
                <div className="text-xs text-slate-500 font-bold flex justify-between">
                  <span>الانتهاء الحالي:</span>
                  <span className="text-slate-700">{renewingSub.end_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ بداية التجديد <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة الدفع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={renewPaymentStatus}
                    onChange={(e) => setRenewPaymentStatus(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="paid">مدفوع</option>
                    <option value="pending">معلق (أجل)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={renewPaymentMethod}
                    onChange={(e) => setRenewPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="cash">نقداً (كاش)</option>
                    <option value="card">بطاقة بنكية / فيزا</option>
                    <option value="wallet">محفظة إلكترونية (فودافون كاش)</option>
                    <option value="bank_transfer">تحويل بنكي / إنستاباي</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewingSub(null)}
                  className="h-10 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingRenew}
                  className="h-10 px-6 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-2"
                >
                  {submittingRenew && <Loader2 size={14} className="animate-spin" />}
                  تأكيد تمديد الاشتراك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
