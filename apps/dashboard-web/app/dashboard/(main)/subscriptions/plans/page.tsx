'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  Repeat,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  Info,
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Layers,
  Star,
  Copy,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useShop } from '@/hooks/useShop';

/* ============================================================
 * باقات الاشتراك — تصميم موحد متوافق مع اشتراكات الأعضاء
 * ============================================================ */

interface SubscriptionPlan {
  id: string;
  shop_id?: string;
  name: string;
  name_ar?: string;
  description?: string;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'custom';
  duration_days: number;
  price: number;
  currency: string;
  features?: string[] | any;
  max_members?: number;
  trial_days: number;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  color?: string;
  active_members?: number;
  created_at?: string;
  updated_at?: string;
}

const CYCLE_CONFIG: Record<string, { label: string; days: number }> = {
  monthly: { label: 'شهري', days: 30 },
  quarterly: { label: 'ربع سنوي (3 شهور)', days: 90 },
  yearly: { label: 'سنوي (سنة كاملة)', days: 365 },
  weekly: { label: 'أسبوعي', days: 7 },
  custom: { label: 'مخصص', days: 30 },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function SubscriptionPlansPage() {
  const { shop } = useShop();
  const shopId = shop?.id || '';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusTab, setStatusTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [cycleFilter, setCycleFilter] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    price: 0,
    currency: 'EGP',
    billing_cycle: 'monthly' as SubscriptionPlan['billing_cycle'],
    duration_days: 30,
    trial_days: 0,
    features_input: '',
    max_members: '',
    is_active: true,
    is_featured: false,
    color: 'emerald',
  });

  const loadPlans = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/shops/${shopId}/subscriptions/plans`);
      const items = res?.data || (Array.isArray(res) ? res : []);
      // Normalize features if returned as JSON string
      const normalized = items.map((p: any) => ({
        ...p,
        features: Array.isArray(p.features)
          ? p.features
          : typeof p.features === 'string'
          ? (() => { try { return JSON.parse(p.features); } catch { return []; } })()
          : [],
      }));
      setPlans(normalized);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
      setError('تعذر تحميل باقات الاشتراك');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Statistics
  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.is_active).length;
    const totalSubscribers = plans.reduce((acc, p) => acc + (p.active_members || 0), 0);
    const avgPrice = total > 0 ? plans.reduce((acc, p) => acc + p.price, 0) / total : 0;
    return { total, active, totalSubscribers, avgPrice };
  }, [plans]);

  // Filtered plans
  const filtered = useMemo(() => {
    let r = [...plans];
    if (statusTab === 'active') r = r.filter((p) => p.is_active);
    if (statusTab === 'inactive') r = r.filter((p) => !p.is_active);
    if (cycleFilter) r = r.filter((p) => p.billing_cycle === cycleFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.name_ar?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [plans, statusTab, cycleFilter, debouncedSearch]);

  const counts = useMemo(
    () => ({
      all: plans.length,
      active: plans.filter((p) => p.is_active).length,
      inactive: plans.filter((p) => !p.is_active).length,
    }),
    [plans]
  );

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      const feats = Array.isArray(plan.features) ? plan.features.join('\n') : '';
      setFormData({
        name: plan.name,
        name_ar: plan.name_ar || '',
        description: plan.description || '',
        price: plan.price,
        currency: plan.currency || 'EGP',
        billing_cycle: plan.billing_cycle,
        duration_days: plan.duration_days || CYCLE_CONFIG[plan.billing_cycle]?.days || 30,
        trial_days: plan.trial_days || 0,
        features_input: feats,
        max_members: plan.max_members ? String(plan.max_members) : '',
        is_active: plan.is_active,
        is_featured: plan.is_featured || false,
        color: plan.color || 'emerald',
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        price: 0,
        currency: 'EGP',
        billing_cycle: 'monthly',
        duration_days: 30,
        trial_days: 0,
        features_input: 'دخول صالة الألعاب الرياضية\nخزانة خاصة\nاستشارة مجانية مع المدرب',
        max_members: '',
        is_active: true,
        is_featured: false,
        color: 'emerald',
      });
    }
    setIsModalOpen(true);
  };

  const handleCycleChange = (cycle: SubscriptionPlan['billing_cycle']) => {
    setFormData((prev) => ({
      ...prev,
      billing_cycle: cycle,
      duration_days: CYCLE_CONFIG[cycle]?.days || prev.duration_days,
    }));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSubmitting(true);

    const feats = formData.features_input
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload: any = {
      name: formData.name,
      billing_cycle: formData.billing_cycle,
      duration_days: Number(formData.duration_days) || 30,
      price: Number(formData.price),
      currency: formData.currency || 'EGP',
      trial_days: Number(formData.trial_days) || 0,
      features: feats,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      color: formData.color,
    };

    if (formData.name_ar.trim()) payload.name_ar = formData.name_ar.trim();
    if (formData.description.trim()) payload.description = formData.description.trim();
    if (formData.max_members) payload.max_members = Number(formData.max_members);

    try {
      if (editingPlan) {
        await apiRequest(`/shops/${shopId}/subscriptions/plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/shops/${shopId}/subscriptions/plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء حفظ الباقة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    if (!shopId) return;
    setActionLoading(plan.id);
    try {
      await apiRequest(`/shops/${shopId}/subscriptions/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      loadPlans();
    } catch (err: any) {
      alert(err?.message || 'تعذر تحديث حالة الباقة');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!shopId) return;
    setActionLoading(id);
    try {
      await apiRequest(`/shops/${shopId}/subscriptions/plans/${id}`, {
        method: 'DELETE',
      });
      setDeleteConfirmId(null);
      loadPlans();
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف الباقة (قد تكون مرتبطة باشتراكات قائمة)');
    } finally {
      setActionLoading(null);
    }
  };

  const TABS = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'active', label: 'نشطة', count: counts.active },
    { id: 'inactive', label: 'موقوفة', count: counts.inactive },
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
              <h1 className="text-xl font-bold text-slate-900">باقات الاشتراك</h1>
              <button
                onClick={() => setGuideOpen((v) => !v)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="دليل باقات الاشتراك"
              >
                <Info size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة قوالب باقات الاشتراك (شهري، سنوي، ربع سنوي) والأسعار والمميزات
              {plans.length > 0 && <span className="font-semibold"> — {plans.length} باقة</span>}
              {stats.active > 0 && (
                <span className="text-emerald-600 font-semibold"> — {stats.active} نشطة</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/subscriptions"
              className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Users size={13} />
              اشتراكات الأعضاء
            </Link>
            <Link
              href="/dashboard/subscriptions/renewals"
              className="h-10 px-4 rounded-full border border-amber-200 bg-amber-50 text-[12px] font-bold text-amber-700 hover:bg-amber-100 flex items-center gap-1.5"
            >
              <Clock size={13} />
              التجديدات
            </Link>
            <button
              onClick={() => handleOpenModal()}
              className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={13} />
              باقة جديدة
            </button>
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
                <p className="font-bold mb-1">💡 نصائح لإنشاء باقات اشتراك ناجحة</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>حدد <strong>دورة الفوترة</strong> بدقة (شهري 30 يوم، ربع سنوي 90 يوم، سنوي 365 يوم).</li>
                  <li>حدد <strong>مميزات الباقة</strong> كل ميزة في سطر منفصل لتظهر بشكل جذاب للعملاء.</li>
                  <li>يمكنك تفعيل <strong>الفترة التجريبية</strong> (مثل 7 أيام مجانية) لجذب مشتركين جدد.</li>
                  <li>الباقات الموقوفة لن تظهر في قائمة إنشاء الاشتراكات الجديدة لكن الاشتراكات الحالية تظل سارية.</li>
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
          {/* تابات الحالة */}
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto border-b border-slate-100">
            {TABS.map((t) => {
              const isActive = statusTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setStatusTab(t.id as any)}
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

          {/* بحث وقائمة الدورات */}
          <div className="px-2 sm:px-3 pb-2 pt-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الباقة أو الوصف..."
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="h-10 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">كل دورات الفوترة</option>
              <option value="monthly">شهري</option>
              <option value="quarterly">ربع سنوي</option>
              <option value="yearly">سنوي</option>
              <option value="weekly">أسبوعي</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
        </div>
      </div>

      {/* قائمة الباقات */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-violet-500" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-20 text-center p-6">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-violet-500" />
            </div>
            <p className="text-slate-800 font-bold text-lg">لا توجد باقات اشتراك حالياً</p>
            <p className="text-slate-400 text-sm mt-1 mb-5 max-w-sm">
              أنشئ باقاتك لتتمكن من تسجيل اشتراكات العملاء وإدارة التجديدات بسهولة
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
            >
              <Plus size={15} />
              إضافة أول باقة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features : [];
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    plan.is_featured
                      ? 'border-violet-300 ring-2 ring-violet-500/10'
                      : plan.is_active
                      ? 'border-slate-200'
                      : 'border-slate-200 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div>
                    {/* Top Row: Tags + Featured */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                            plan.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {plan.is_active ? 'نشطة' : 'موقوفة'}
                        </span>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {CYCLE_CONFIG[plan.billing_cycle]?.label || plan.billing_cycle}
                        </span>
                        {plan.trial_days > 0 && (
                          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {plan.trial_days} يوم تجريبي
                          </span>
                        )}
                      </div>
                      {plan.is_featured && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          مميزة
                        </span>
                      )}
                    </div>

                    {/* Plan Title & Description */}
                    <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                      <span>{plan.name_ar || plan.name}</span>
                    </h3>
                    {plan.name_ar && plan.name && plan.name_ar !== plan.name && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{plan.name}</p>
                    )}
                    {plan.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                    )}

                    {/* Price Tag */}
                    <div className="my-4 pt-3 border-t border-slate-100 flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900 tracking-tight">
                        {fmt(plan.price)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {plan.currency || 'EGP'} / {CYCLE_CONFIG[plan.billing_cycle]?.label.split(' ')[0] || 'دورة'}
                      </span>
                    </div>

                    {/* Features List */}
                    {features.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        <div className="text-[11px] font-bold text-slate-400">المميزات المضمنة:</div>
                        <ul className="space-y-1">
                          {features.slice(0, 4).map((f: string, i: number) => (
                            <li key={i} className="text-xs text-slate-700 flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                          {features.length > 4 && (
                            <li className="text-[11px] text-slate-400 font-bold pr-5">
                              + {features.length - 4} مميزات أخرى
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <Users size={14} className="text-slate-400" />
                      <span>{plan.active_members || 0} مشترك</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(plan)}
                        disabled={actionLoading === plan.id}
                        className={`h-8 px-3 rounded-full text-xs font-bold transition-all ${
                          plan.is_active
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {plan.is_active ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button
                        onClick={() => handleOpenModal(plan)}
                        className="h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        تعديل
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(plan.id)}
                        className="w-8 h-8 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all"
                        title="حذف الباقة"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نافذة إضافة / تعديل الباقة */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingPlan ? 'تعديل باقة الاشتراك' : 'إنشاء باقة اشتراك جديدة'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  حدد مدة الباقة، سعرها، مميزاتها وشروط التجديد
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الباقة بالعربية <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الباقة الذهبية الشهرية، باقة VIP"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    دورة الفوترة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.billing_cycle}
                    onChange={(e) => handleCycleChange(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="monthly">شهري (30 يوم)</option>
                    <option value="quarterly">ربع سنوي (90 يوم)</option>
                    <option value="yearly">سنوي (365 يوم)</option>
                    <option value="weekly">أسبوعي (7 أيام)</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المدة الفعلية (بالأيام) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    السعر (ج.م) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أيام تجريبية مجانية (اختياري)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.trial_days}
                    onChange={(e) => setFormData({ ...formData, trial_days: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف الباقة (اختياري)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر لمزايا الباقة ولمن تناسب..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المميزات المضمنة (ميزة في كل سطر)
                </label>
                <textarea
                  rows={3}
                  value={formData.features_input}
                  onChange={(e) => setFormData({ ...formData, features_input: e.target.value })}
                  placeholder="دخول الصالة الرياضية&#10;خزانة مخصصة&#10;استشارة تدريب مجانية"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">باقة نشطة ومتاحة للاشتراك</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">تمييز كـ "الباقة المميزة" ⭐</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-6 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingPlan ? 'حفظ التعديلات' : 'إنشاء الباقة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* تأكيد الحذف */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center border border-slate-200 shadow-xl">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">حذف باقة الاشتراك</h3>
            <p className="text-xs text-slate-500 mb-5">
              هل أنت متأكد من حذف هذه الباقة؟ إذا كانت هناك اشتراكات نشطة مرتبطة بها، فلن يسمح النظام بحذفها.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-9 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeletePlan(deleteConfirmId)}
                className="h-9 px-5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
