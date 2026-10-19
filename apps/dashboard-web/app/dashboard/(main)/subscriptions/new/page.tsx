'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Loader2,
  DollarSign,
  Plus,
  Search,
  Sparkles,
  Info,
  ChevronDown,
  Repeat,
  Users,
  Clock,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Plan {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  duration_days: number;
  trial_days?: number;
  features?: string[];
}

const CYCLE_AR: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
  quarterly: 'ربع سنوي',
  weekly: 'أسبوعي',
  custom: 'مخصص',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function NewSubscriptionPage() {
  const router = useRouter();
  const { shop } = useShop();
  const shopId = shop?.id || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [autoRenew, setAutoRenew] = useState(true);
  const [notes, setNotes] = useState('');

  // Quick Customer Creation
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!shopId) return;
    setLoadingInitial(true);
    setError('');
    try {
      const [custRes, plansRes] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/customers?limit=100`),
        apiRequest(`/shops/${shopId}/subscriptions/plans`),
      ]);

      if (custRes.status === 'fulfilled') {
        const val = custRes.value;
        const cList = val?.data || (Array.isArray(val) ? val : []);
        setCustomers(cList);
      }

      if (plansRes.status === 'fulfilled') {
        const val = plansRes.value;
        const pList = val?.data || (Array.isArray(val) ? val : []);
        const activePlans = pList.filter((p: any) => p.is_active !== false);
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setSelectedPlanId(activePlans[0].id);
          setCustomPrice(activePlans[0].price);
        }
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setError('تعذر تحميل البيانات الأولية');
    } finally {
      setLoadingInitial(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setCustomPrice(plan.price);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !newCustomerName.trim()) return;

    setCreatingCustomer(true);
    try {
      const res = await apiRequest(`/shops/${shopId}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
        }),
      });

      const customer = res?.data || res?.customer || res;
      if (customer && customer.id) {
        setCustomers((prev) => [customer, ...prev]);
        setSelectedCustomerId(customer.id);
        setShowQuickCustomer(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
      } else {
        alert('تم الحفظ لكن تعذر تحديد العضو تلقائياً');
      }
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء حفظ العضو الجديد');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!selectedCustomerId || !selectedPlanId) {
      alert('يرجى اختيار العضو المشترك وباقة الاشتراك');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customer_id: selectedCustomerId,
        plan_id: selectedPlanId,
        start_date: startDate,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        auto_renew: autoRenew,
      };

      if (notes.trim()) payload.notes = notes.trim();

      await apiRequest(`/shops/${shopId}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      router.push('/dashboard/subscriptions');
    } catch (err: any) {
      alert(err?.message || 'فشل تسجيل الاشتراك');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  );

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
              <h1 className="text-xl font-bold text-slate-900">تسجيل اشتراك جديد</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ربط عضو بإحدى الباقات المفعلة وتحديد تاريخ البداية وخطة السداد
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
              href="/dashboard/subscriptions/plans"
              className="h-10 px-4 rounded-full border border-violet-200 bg-violet-50 text-[12px] font-bold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5"
            >
              <CreditCard size={13} />
              الباقات
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6">
        {loadingInitial ? (
          <div className="bg-white p-16 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500">جاري تحميل الباقات وقائمة الأعضاء...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* بطاقة اختيار العضو */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User size={16} className="text-violet-600" />
                  بيانات العضو المشترك <span className="text-red-500">*</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomer(!showQuickCustomer)}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>عضو جديد سريع</span>
                </button>
              </div>

              {/* فورم العضو السريع */}
              {showQuickCustomer && (
                <div className="p-4 bg-violet-50/60 border border-violet-200 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-violet-800">إضافة عضو جديد سريعاً:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="اسم العضو *"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <input
                      type="text"
                      placeholder="رقم الهاتف"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={creatingCustomer || !newCustomerName.trim()}
                      onClick={handleCreateCustomer}
                      className="h-9 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {creatingCustomer && <Loader2 size={12} className="animate-spin" />}
                      <span>حفظ واختيار العضو</span>
                    </button>
                  </div>
                </div>
              )}

              {/* اختيار وبحث العضو */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن العضو بالاسم أو الهاتف..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full h-10 pr-9 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300 text-slate-900"
                >
                  <option value="">-- اضغط لاختيار العضو المشترك --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* بطاقة اختيار الباقة */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard size={16} className="text-violet-600" />
                اختيار باقة الاشتراك <span className="text-red-500">*</span>
              </h3>

              {plans.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-500 mb-3 font-bold">لا توجد باقات اشتراك مضافة حتى الآن</p>
                  <Link
                    href="/dashboard/subscriptions/plans"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-bold"
                  >
                    <Plus size={13} />
                    <span>إنشاء أول باقة</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => handlePlanChange(plan.id)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">
                            {plan.name_ar || plan.name}
                          </span>
                          {isSelected && <CheckCircle2 size={16} className="text-emerald-600" />}
                        </div>
                        <p className="text-lg font-black text-slate-900">
                          {fmt(plan.price)} <span className="text-xs font-bold text-slate-500">{plan.currency || 'EGP'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 font-bold">
                          دورة: {CYCLE_AR[plan.billing_cycle] || plan.billing_cycle} ({plan.duration_days} يوم)
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* بطاقة التواريخ والدفع */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-violet-600" />
                تفاصيل السعر والدفع والمدة
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ بدء الاشتراك <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المحصّل ({selectedPlan?.currency || 'EGP'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="سعر الباقة"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="cash">نقداً (كاش)</option>
                    <option value="card">بطاقة بنكية / فيزا</option>
                    <option value="wallet">محفظة إلكترونية (فودافون كاش)</option>
                    <option value="bank_transfer">تحويل بنكي / إنستاباي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة دفع الاشتراك الأول
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="paid">مدفوع بالكامل الآن</option>
                    <option value="pending">آجل / معلق</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <label htmlFor="autoRenew" className="text-xs font-bold text-slate-700 cursor-pointer">
                    تفعيل التجديد التلقائي للاشتراك بعد نهاية المدة
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية (أهداف المتدرب، قياسات، خصم خاص...)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالعضو أو الاتفاق..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href="/dashboard/subscriptions"
                className="h-10 px-5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={submitting || !selectedCustomerId || !selectedPlanId}
                className="h-10 px-6 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>تأكيد وتسجيل الاشتراك</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
