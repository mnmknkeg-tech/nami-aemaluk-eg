'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  CreditCard,
  Phone,
  User,
  Mail,
  MessageCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { SiteShopContext, SiteSubscriptionPlan } from './types';

interface SiteSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: (Partial<SiteSubscriptionPlan> & { title?: string; price?: number | string; period?: string }) | null;
  shop: SiteShopContext;
  availablePlans?: SiteSubscriptionPlan[];
  onSuccess?: (subscription: any) => void;
}

export const SiteSubscriptionModal: React.FC<SiteSubscriptionModalProps> = ({
  isOpen,
  onClose,
  plan,
  shop,
  availablePlans = [],
  onSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plan?.id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  // Sync selected plan on open or plan prop change
  useEffect(() => {
    if (plan?.id) {
      setSelectedPlanId(plan.id);
    } else if (availablePlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(availablePlans[0].id);
    }
    if (isOpen) {
      setError('');
      setSuccessData(null);
    }
  }, [plan, isOpen, availablePlans]);

  if (!isOpen) return null;

  // Determine current active plan details
  const activePlan = availablePlans.find((p) => p.id === selectedPlanId) || plan;
  const planName = activePlan?.nameAr || activePlan?.name || (activePlan as any)?.title || 'باقة الاشتراك';
  const planPrice = activePlan?.price !== undefined ? activePlan.price : 0;
  const cycleLabel =
    activePlan?.billingCycle === 'yearly'
      ? 'سنوياً'
      : activePlan?.billingCycle === 'quarterly'
      ? 'ربع سنوي (3 شهور)'
      : activePlan?.billingCycle === 'weekly'
      ? 'أسبوعياً'
      : (activePlan as any)?.period || 'شهرياً';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('يرجى إدخال اسمك الكريم');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setError('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        plan_id: activePlan?.id || '',
        plan_name: planName,
        plan_price: typeof planPrice === 'string' ? parseFloat(planPrice) || 0 : planPrice,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      // Call public subscribe endpoint
      const res = await fetch(`/api/v1/public/shops/${shop.id}/subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'تعذر تسجيل الاشتراك، يرجى المحاولة لاحقاً');
      }

      setSuccessData(json.data);
      if (onSuccess) {
        onSuccess(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة الاشتراك');
    } finally {
      setSubmitting(false);
    }
  };

  const waNumber = (shop.whatsapp || shop.phone || '').replace(/[^0-9]/g, '');
  const waConfirmLink = waNumber
    ? `https://wa.me/${waNumber.startsWith('2') ? waNumber : `2${waNumber}`}?text=${encodeURIComponent(
        `مرحباً ${shop.name}، قمت للتو بالاشتراك في (${planName}) عبر الموقع باسم ${customerName} ورقم الهاتف ${customerPhone}. أود تأكيد التفعيل.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header */}
        <div className="relative bg-gradient-to-l from-slate-900 to-slate-800 text-white p-6 sm:p-7">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2 text-amber-400 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>اشتراك مباشر عبر الموقع الرسمي</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black">{shop.name}</h3>
          <p className="text-slate-300 text-xs mt-1">
            اختر بياناتك لإتمام اشتراكك وسنقوم بالتواصل معك وتفعيل عضويتك فوراً
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 max-h-[80vh] overflow-y-auto">
          {successData ? (
            /* Success State */
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-2xl font-black text-slate-900">تم تسجيل اشتراكك بنجاح!</h4>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  أهلاً بك <strong className="text-slate-900">{customerName}</strong>، تم استلام طلب عضويتك في{' '}
                  <strong className="text-blue-600">{planName}</strong> وتوثيقه لدى إدارة المتجر.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-700 space-y-2 text-right">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">الباقة المختارة:</span>
                  <span className="font-bold text-slate-900">{planName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">القيمة:</span>
                  <span className="font-black text-emerald-600 text-sm font-mono">
                    {planPrice} {activePlan?.currency || 'ج.م'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">الفترة:</span>
                  <span className="font-medium text-slate-800">{cycleLabel}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">رقم الهاتف المسجل:</span>
                  <span className="font-mono text-slate-900">{customerPhone}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {waConfirmLink && (
                  <a
                    href={waConfirmLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>تأكيد فوري عبر واتساب المتجر</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  إغلاق والعودة للموقع
                </button>
              </div>
            </div>
          ) : (
            /* Subscription Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Plan Summary Card */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 block">الباقة المحددة</span>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">{planName}</h4>
                  <span className="text-xs text-slate-500">{cycleLabel}</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-2xl font-black text-blue-700">{planPrice}</span>
                  <span className="text-xs text-slate-500 font-sans block">{activePlan?.currency || 'ج.م'}</span>
                </div>
              </div>

              {/* Multiple plans switcher if shop has multiple active plans */}
              {availablePlans.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تغيير الباقة</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameAr || p.name} — {p.price} {p.currency} (
                        {p.billingCycle === 'yearly'
                          ? 'سنوي'
                          : p.billingCycle === 'quarterly'
                          ? 'ربع سنوي'
                          : 'شهري'}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Inputs */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم بالكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسمك الكريم"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف / الواتساب <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 01012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Preferred Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الدفع المفضلة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'في المقر / كاش', icon: ShieldCheck },
                      { id: 'wallet', label: 'محفظة ذكية', icon: Phone },
                      { id: 'card', label: 'بطاقة بنكية', icon: CreditCard },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === pm.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <pm.icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات أو مواعيد مفضلة <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أي استفسار أو رغبة محددة تود إبلاغ الإدارة بها..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold leading-relaxed">
                  {error}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تسجيل الاشتراك...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد الاشتراك الآن</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
