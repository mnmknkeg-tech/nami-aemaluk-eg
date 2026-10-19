'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input, Button } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { ShoppingCart, Truck, Store, Clock, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';

interface OrdersSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function OrdersSettingsTab({ shop, onSaved }: OrdersSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};
  const layout = shop?.layoutConfig || {};

  const initial = useMemo(() => ({
    minOrderAmount: Number(shop?.minOrderAmount ?? pd.minOrderAmount ?? 0),
    autoConfirmOrders: Boolean(pd.autoConfirmOrders ?? false),
    enableHomeDelivery: !Boolean(shop?.deliveryDisabled ?? shop?.delivery_disabled ?? false),
    enableStorePickup: Boolean(pd.enableStorePickup ?? true),
    deliveryFee: Number(shop?.deliveryFee ?? pd.deliveryFee ?? 30),
    freeDeliveryThreshold: Number(shop?.freeDeliveryThreshold ?? pd.freeDeliveryThreshold ?? 500),
    allowCancellation: Boolean(pd.allowOrderCancellation ?? true),
    cancellationWindowHours: Number(pd.cancellationWindowHours ?? 2),
    returnPolicyNotice: String(pd.returnPolicyNotice ?? 'الاسترجاع والاستبدال متاح خلال 14 يومًا من تاريخ الاستلام وفقًا للشروط.'),
    orderInvoiceNotes: String(pd.orderInvoiceNotes ?? 'شكرًا لتسوقكم معنا! نتمنى لكم يومًا سعيدًا.'),
  }), [shop, pd]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  // Track unsaved changes
  useEffect(() => {
    const isChanged =
      form.minOrderAmount !== initial.minOrderAmount ||
      form.autoConfirmOrders !== initial.autoConfirmOrders ||
      form.enableHomeDelivery !== initial.enableHomeDelivery ||
      form.enableStorePickup !== initial.enableStorePickup ||
      form.deliveryFee !== initial.deliveryFee ||
      form.freeDeliveryThreshold !== initial.freeDeliveryThreshold ||
      form.allowCancellation !== initial.allowCancellation ||
      form.cancellationWindowHours !== initial.cancellationWindowHours ||
      form.returnPolicyNotice !== initial.returnPolicyNotice ||
      form.orderInvoiceNotes !== initial.orderInvoiceNotes;

    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'orders_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveOrdersSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          minOrderAmount: current.minOrderAmount,
          deliveryFee: current.deliveryFee,
          freeDeliveryThreshold: current.freeDeliveryThreshold,
          deliveryDisabled: !current.enableHomeDelivery,
          pageDesign: {
            ...pd,
            minOrderAmount: current.minOrderAmount,
            autoConfirmOrders: current.autoConfirmOrders,
            enableStorePickup: current.enableStorePickup,
            deliveryFee: current.deliveryFee,
            freeDeliveryThreshold: current.freeDeliveryThreshold,
            allowOrderCancellation: current.allowCancellation,
            cancellationWindowHours: current.cancellationWindowHours,
            returnPolicyNotice: current.returnPolicyNotice,
            orderInvoiceNotes: current.orderInvoiceNotes,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الطلبات والمبيعات بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات الطلبات',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [pd, onSaved, toast]);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'orders_settings', handler: saveOrdersSettings },
        })
      );
    } catch {}
  }, [saveOrdersSettings]);

  const ToggleRow = ({
    title,
    desc,
    value,
    onChange,
  }: {
    title: string;
    desc?: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <div className="font-bold text-sm text-slate-900">{title}</div>
        {desc && <div className="text-xs text-slate-400 font-medium mt-0.5">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
          value ? 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8]' : 'bg-slate-200'
        }`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? 'right-0.5' : 'right-5.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShoppingCart size={22} className="text-indigo-600" />
          إعدادات الطلبات والمبيعات
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
          تخصيص قواعد استلام الطلبات، شروط التوصيل، الإلغاء وسياسات الاسترجاع
        </p>
      </div>

      {/* شروط وقبول الطلبات */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CheckCircle2 size={17} className="text-indigo-600" />
            استقبال وتأكيد الطلبات
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            تحديد شروط إنشاء الطلب الجديد وتدفق التأكيد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">الحد الأدنى لقيمة الطلب (ج.م)</Label>
              <Input
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) || 0 })}
                placeholder="0 = بدون حد أدنى"
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 block">لن يتمكن العميل من إتمام الشراء إذا كانت السلة أقل من هذا المبلغ.</span>
            </div>
          </div>

          <ToggleRow
            title="تأكيد الطلبات تلقائيًا فور استلامها"
            desc="عند التفعيل يتحول الطلب مباشرة إلى (مؤكد) ويبدأ التجهيز دون الحاجة للموافقة اليدوية."
            value={form.autoConfirmOrders}
            onChange={(v) => setForm({ ...form, autoConfirmOrders: v })}
          />
        </CardContent>
      </Card>

      {/* خيارات الشحن والتوصيل */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Truck size={17} className="text-indigo-600" />
            الشحن والتوصيل والاستلام
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            قواعد توصيل الطلبات للمنازل وخيارات الاستلام من المقر
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ToggleRow
            title="تفعيل التوصيل للمنازل"
            desc="إتاحة خيار شحن الطلبات إلى عناوين العملاء عبر المناديب أو شركات الشحن."
            value={form.enableHomeDelivery}
            onChange={(v) => setForm({ ...form, enableHomeDelivery: v })}
          />

          <ToggleRow
            title="إتاحة الاستلام من الفرع / المقر"
            desc="تمكين العميل من اختيار استلام طلبه بنفسه من المتجر دون احتساب رسوم توصيل."
            value={form.enableStorePickup}
            onChange={(v) => setForm({ ...form, enableStorePickup: v })}
          />

          {form.enableHomeDelivery && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">رسوم التوصيل الافتراضية (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) || 0 })}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">حد الشحن المجاني (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.freeDeliveryThreshold}
                  onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) || 0 })}
                  placeholder="0 = لا يوجد شحن مجاني"
                  className="rounded-xl border-slate-200 text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400 block">إذا تجاوز إجمالي الطلب هذا المبلغ يصبح التوصيل مجانيًا تلقائيًا.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سياسات الإلغاء والاسترجاع المطبوعة */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <RotateCcw size={17} className="text-indigo-600" />
            سياسات الإلغاء والملاحظات
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            شروط إلغاء الطلب من قبل العميل والملاحظات المرفقة بالفاتورة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ToggleRow
            title="السماح للعميل بإلغاء الطلب قبل التجهيز"
            desc="تمكين العميل من إلغاء طلبه ذاتيًا عبر صفحة تتبع الطلب خلال مهلة محددة."
            value={form.allowCancellation}
            onChange={(v) => setForm({ ...form, allowCancellation: v })}
          />

          {form.allowCancellation && (
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">مهلة الإلغاء المسموحة (بالساعات)</Label>
              <Input
                type="number"
                min="1"
                max="72"
                value={form.cancellationWindowHours}
                onChange={(e) => setForm({ ...form, cancellationWindowHours: Number(e.target.value) || 1 })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-50">
            <Label className="text-xs font-bold text-slate-800">سياسة الإرجاع والاستبدال (تظهر في صفحة الطلب والفاتورة)</Label>
            <textarea
              value={form.returnPolicyNotice}
              onChange={(e) => setForm({ ...form, returnPolicyNotice: e.target.value })}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 resize-none text-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800">ملاحظات الفاتورة الافتراضية (Footer)</Label>
            <textarea
              value={form.orderInvoiceNotes}
              onChange={(e) => setForm({ ...form, orderInvoiceNotes: e.target.value })}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 resize-none text-slate-800"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

