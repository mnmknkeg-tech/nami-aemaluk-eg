'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { Users, Award, Gift, Phone, MessageSquare, CreditCard } from 'lucide-react';

interface CustomersSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function CustomersSettingsTab({ shop, onSaved }: CustomersSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      loyaltyEnabled: Boolean(pd.custLoyaltyEnabled ?? true),
      loyaltyEarnPer100: String(pd.custLoyaltyEarnPer100 ?? 5),
      loyaltyPointValue: String(pd.custLoyaltyPointValue ?? 1),
      minRedeemPoints: String(pd.custMinRedeemPoints ?? 50),
      birthdayOffer: Boolean(pd.custBirthdayOffer ?? true),
      requirePhone: Boolean(pd.custRequirePhone ?? true),
      allowCredit: Boolean(pd.custAllowCredit ?? false),
      defaultCreditLimit: String(pd.custDefaultCreditLimit ?? 2000),
      welcomeMessage: String(pd.custWelcomeMessage || 'أهلاً بك في متجرنا! يسعدنا انضمامك لعائلتنا 💙'),
    }),
    [pd]
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    const isChanged = JSON.stringify(form) !== JSON.stringify(initial);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'customers_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveCustomersSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            custLoyaltyEnabled: current.loyaltyEnabled,
            custLoyaltyEarnPer100: Number(current.loyaltyEarnPer100) || 5,
            custLoyaltyPointValue: Number(current.loyaltyPointValue) || 1,
            custMinRedeemPoints: Number(current.minRedeemPoints) || 50,
            custBirthdayOffer: current.birthdayOffer,
            custRequirePhone: current.requirePhone,
            custAllowCredit: current.allowCredit,
            custDefaultCreditLimit: Number(current.defaultCreditLimit) || 0,
            custWelcomeMessage: current.welcomeMessage.trim(),
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات العملاء والولاء بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات العملاء',
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
          detail: { sectionId: 'customers_settings', handler: saveCustomersSettings },
        })
      );
    } catch {}
  }, [saveCustomersSettings]);

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
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            value ? 'right-0.5' : 'right-5.5'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">إعدادات العملاء وبرامج الولاء</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة برامج مكافآت ونقاط العملاء، الشراء بالآجل، ورسائل الترحيب
        </p>
      </div>

      {/* برنامج نقاط الولاء والمكافآت */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award size={18} className="text-[#0284C7]" />
            برنامج نقاط المكافآت والولاء (Loyalty Program)
          </CardTitle>
          <CardDescription className="text-xs">
            كافئ عملاءك بالنقاط عند كل عملية شراء لتشجيعهم على تكرار الطلب
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="تفعيل برنامج نقاط الولاء"
            desc="إضافة رصيد نقاط تلقائيًا في حساب العميل مع كل طلب مكتمل"
            value={form.loyaltyEnabled}
            onChange={(v) => setForm((f) => ({ ...f, loyaltyEnabled: v }))}
          />

          {form.loyaltyEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="loyaltyEarn" className="text-xs font-bold text-slate-700">
                  النقاط المكتسبة لكل 100 ج.م
                </Label>
                <Input
                  id="loyaltyEarn"
                  type="number"
                  min="1"
                  value={form.loyaltyEarnPer100}
                  onChange={(e) => setForm((f) => ({ ...f, loyaltyEarnPer100: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <p className="text-[10px] text-slate-400">مثال: 5 نقاط لكل 100 جنيه</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pointValue" className="text-xs font-bold text-slate-700">
                  قيمة النقطة الواحدة (ج.م)
                </Label>
                <Input
                  id="pointValue"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.loyaltyPointValue}
                  onChange={(e) => setForm((f) => ({ ...f, loyaltyPointValue: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <p className="text-[10px] text-slate-400">قيمة الخصم بالجنيه عند الاستبدال</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minRedeem" className="text-xs font-bold text-slate-700">
                  الحد الأدنى لاستبدال النقاط
                </Label>
                <Input
                  id="minRedeem"
                  type="number"
                  min="10"
                  value={form.minRedeemPoints}
                  onChange={(e) => setForm((f) => ({ ...f, minRedeemPoints: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <p className="text-[10px] text-slate-400">أقل رصيد يسمح للعميل بخصمه</p>
              </div>
            </div>
          )}

          <ToggleRow
            title="مفاجأة هدية عيد الميلاد"
            desc="إرسال كود خصم أو نقاط إضافية هدية للعميل تلقائيًا في يوم ميلاده"
            value={form.birthdayOffer}
            onChange={(v) => setForm((f) => ({ ...f, birthdayOffer: v }))}
          />
        </CardContent>
      </Card>

      {/* ضوابط التسجيل والشراء الآجل */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={18} className="text-[#0284C7]" />
            ضوابط الحسابات والشراء بالآجل (Credit Limit)
          </CardTitle>
          <CardDescription className="text-xs">
            تحديد متطلبات التسجيل وإمكانية فتح حسابات آجلة لعملاء الجملة والشركات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="إلزام تسجيل رقم الهاتف المحمول"
            desc="لا يمكن للعميل إتمام الطلب كزائر بدون تزويد رقم هاتف صحيح للتواصل"
            value={form.requirePhone}
            onChange={(v) => setForm((f) => ({ ...f, requirePhone: v }))}
          />
          <ToggleRow
            title="تمكين البيع بالآجل للعملاء المعتمدين"
            desc="إتاحة خيار الدفع على الحساب وتحديد رصيد ائتماني لكل عميل"
            value={form.allowCredit}
            onChange={(v) => setForm((f) => ({ ...f, allowCredit: v }))}
          />

          {form.allowCredit && (
            <div className="pt-2">
              <Label htmlFor="defaultCredit" className="text-xs font-bold text-slate-700 block mb-1">
                الحد الائتماني الافتراضي للعميل الجديد (ج.م)
              </Label>
              <Input
                id="defaultCredit"
                type="number"
                value={form.defaultCreditLimit}
                onChange={(e) => setForm((f) => ({ ...f, defaultCreditLimit: e.target.value }))}
                className="w-56 rounded-xl text-center text-xs font-black"
              />
            </div>
          )}

          <div className="pt-2">
            <Label htmlFor="welcomeMessage" className="text-xs font-bold text-slate-700 block mb-1">
              رسالة الترحيب التلقائية للعميل الجديد
            </Label>
            <Input
              id="welcomeMessage"
              value={form.welcomeMessage}
              onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
              className="rounded-xl text-right text-xs"
              placeholder="أهلاً بك في متجرنا..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
