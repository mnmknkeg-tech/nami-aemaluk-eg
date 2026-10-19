'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input, Button } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import {
  Clock, Shield, Bell, CreditCard, XCircle,
  CalendarCheck, RotateCcw, MessageCircle, DollarSign,
} from 'lucide-react';

interface BookingSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function BookingSettingsTab({ shop, onSaved }: BookingSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(() => ({
    bookingSlotDuration: Number(pd.bookingSlotDuration || 30),
    bookingAdvanceDays: Number(pd.bookingAdvanceDays || 14),
    bookingAutoConfirm: Boolean(pd.bookingAutoConfirm ?? false),
    bookingPreventDuplicates: Boolean(pd.bookingPreventDuplicates ?? true),
    bookingRequirePhoneVerify: Boolean(pd.bookingRequirePhoneVerify ?? false),
    bookingNotifyOwner: Boolean(pd.bookingNotifyOwner ?? true),
    bookingNotifyCustomer: Boolean(pd.bookingNotifyCustomer ?? true),
    bookingNotifyWhatsapp: Boolean(pd.bookingNotifyWhatsapp ?? true),
    bookingWorkStart: String(pd.bookingWorkStart || '09:00'),
    bookingWorkEnd: String(pd.bookingWorkEnd || '21:00'),
    bookingMaxPerSlot: Number(pd.bookingMaxPerSlot || 1),
    bookingAllowCancellation: Boolean(pd.bookingAllowCancellation ?? true),
    bookingCancelWindowHours: Number(pd.bookingCancelWindowHours || 24),
    bookingPreventSameDayCancel: Boolean(pd.bookingPreventSameDayCancel ?? true),
    bookingRequireDeposit: Boolean(pd.bookingRequireDeposit ?? false),
    bookingDepositPercent: Number(pd.bookingDepositPercent || 25),
    bookingAllowPayAtVenue: Boolean(pd.bookingAllowPayAtVenue ?? true),
    bookingShowPrices: Boolean(pd.bookingShowPrices ?? true),
    bookingShowAvailableOnly: Boolean(pd.bookingShowAvailableOnly ?? true),
  }), [pd]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  // Track changes for save master button
  useEffect(() => {
    const isChanged =
      form.bookingSlotDuration !== initial.bookingSlotDuration ||
      form.bookingAdvanceDays !== initial.bookingAdvanceDays ||
      form.bookingAutoConfirm !== initial.bookingAutoConfirm ||
      form.bookingPreventDuplicates !== initial.bookingPreventDuplicates ||
      form.bookingRequirePhoneVerify !== initial.bookingRequirePhoneVerify ||
      form.bookingNotifyOwner !== initial.bookingNotifyOwner ||
      form.bookingNotifyCustomer !== initial.bookingNotifyCustomer ||
      form.bookingNotifyWhatsapp !== initial.bookingNotifyWhatsapp ||
      form.bookingWorkStart !== initial.bookingWorkStart ||
      form.bookingWorkEnd !== initial.bookingWorkEnd ||
      form.bookingMaxPerSlot !== initial.bookingMaxPerSlot ||
      form.bookingAllowCancellation !== initial.bookingAllowCancellation ||
      form.bookingCancelWindowHours !== initial.bookingCancelWindowHours ||
      form.bookingPreventSameDayCancel !== initial.bookingPreventSameDayCancel ||
      form.bookingRequireDeposit !== initial.bookingRequireDeposit ||
      form.bookingDepositPercent !== initial.bookingDepositPercent ||
      form.bookingAllowPayAtVenue !== initial.bookingAllowPayAtVenue ||
      form.bookingShowPrices !== initial.bookingShowPrices ||
      form.bookingShowAvailableOnly !== initial.bookingShowAvailableOnly;

    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'booking_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveBookingSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            bookingSlotDuration: current.bookingSlotDuration,
            bookingAdvanceDays: current.bookingAdvanceDays,
            bookingAutoConfirm: current.bookingAutoConfirm,
            bookingPreventDuplicates: current.bookingPreventDuplicates,
            bookingRequirePhoneVerify: current.bookingRequirePhoneVerify,
            bookingNotifyOwner: current.bookingNotifyOwner,
            bookingNotifyCustomer: current.bookingNotifyCustomer,
            bookingNotifyWhatsapp: current.bookingNotifyWhatsapp,
            bookingWorkStart: current.bookingWorkStart,
            bookingWorkEnd: current.bookingWorkEnd,
            bookingMaxPerSlot: current.bookingMaxPerSlot,
            bookingAllowCancellation: current.bookingAllowCancellation,
            bookingCancelWindowHours: current.bookingCancelWindowHours,
            bookingPreventSameDayCancel: current.bookingPreventSameDayCancel,
            bookingRequireDeposit: current.bookingRequireDeposit,
            bookingDepositPercent: current.bookingDepositPercent,
            bookingAllowPayAtVenue: current.bookingAllowPayAtVenue,
            bookingShowPrices: current.bookingShowPrices,
            bookingShowAvailableOnly: current.bookingShowAvailableOnly,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الحجوزات بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات الحجوزات',
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
          detail: { sectionId: 'booking_settings', handler: saveBookingSettings },
        })
      );
    } catch {}
  }, [saveBookingSettings]);

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
          <CalendarCheck size={22} className="text-pink-600" />
          إعدادات الحجوزات والمواعيد
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
          تخصيص قواعد حجز المواعيد للعيادات، الفندقة، الطاولات، والاستشارات
        </p>
      </div>

      {/* الجدول الزمني والمواعيد */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Clock size={17} className="text-pink-600" />
            فترات ومواعيد العمل
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            تحديد طول مدة الموعد وساعات استقبال الحجوزات اليومية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">مدة الموعد الافتراضية</Label>
              <select
                value={form.bookingSlotDuration}
                onChange={(e) => setForm({ ...form, bookingSlotDuration: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none"
              >
                {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>{d} دقيقة</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">أقصى عدد حجوزات في نفس التوقيت</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={form.bookingMaxPerSlot}
                onChange={(e) => setForm({ ...form, bookingMaxPerSlot: Number(e.target.value) || 1 })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">ساعة بدء استقبال المواعيد</Label>
              <Input
                type="time"
                value={form.bookingWorkStart}
                onChange={(e) => setForm({ ...form, bookingWorkStart: e.target.value })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">ساعة نهاية استقبال المواعيد</Label>
              <Input
                type="time"
                value={form.bookingWorkEnd}
                onChange={(e) => setForm({ ...form, bookingWorkEnd: e.target.value })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">الحد الأقصى للحجز المسبق</Label>
              <span className="text-xs font-black text-slate-900 tabular-nums">{form.bookingAdvanceDays} يوم مقدمًا</span>
            </div>
            <input
              type="range"
              min="1"
              max="90"
              value={form.bookingAdvanceDays}
              onChange={(e) => setForm({ ...form, bookingAdvanceDays: Number(e.target.value) })}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* الأمان والموافقة */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Shield size={17} className="text-pink-600" />
            التأكيد والتحقق
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            شروط الموافقة على الموعد ومنع الحجز المكرر
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <ToggleRow
            title="تأكيد تلقائي فوري للمواعيد"
            desc="تأكيد الموعد مباشرة فور حجزه وإرسال رسالة التأكيد دون انتظار موافقة يدوية من المسؤول."
            value={form.bookingAutoConfirm}
            onChange={(v) => setForm({ ...form, bookingAutoConfirm: v })}
          />

          <ToggleRow
            title="منع الحجز المكرر لنفس العميل"
            desc="منع نفس العميل من حجز أكثر من موعد متزامن في نفس الوقت."
            value={form.bookingPreventDuplicates}
            onChange={(v) => setForm({ ...form, bookingPreventDuplicates: v })}
          />

          <ToggleRow
            title="تحقق رقم الهاتف عبر كود SMS"
            desc="إرسال رمز تحقق مؤقت للعميل قبل إتمام الحجز للتحقق من صحة الرقم."
            value={form.bookingRequirePhoneVerify}
            onChange={(v) => setForm({ ...form, bookingRequirePhoneVerify: v })}
          />
        </CardContent>
      </Card>

      {/* سياسات الإلغاء والدفع */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard size={17} className="text-pink-600" />
            المدفوعات والعربون وسياسات الإلغاء
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            شروط دفع وتأمين الحجوزات ومهل إلغاء المواعيد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ToggleRow
            title="إتاحة السداد عند الحضور (كاشير / في المقر)"
            desc="تمكين العميل من تثبيت الموعد والدفع حضورياً عند الوصول للعيادة أو الفندق."
            value={form.bookingAllowPayAtVenue}
            onChange={(v) => setForm({ ...form, bookingAllowPayAtVenue: v })}
          />

          <ToggleRow
            title="اشتراط عربون مسبق لتثبيت الحجز"
            desc="مطالبة العميل بدفع نسبة مقدمة أونلاين لتأكيد الحجز النهائي."
            value={form.bookingRequireDeposit}
            onChange={(v) => setForm({ ...form, bookingRequireDeposit: v })}
          />

          {form.bookingRequireDeposit && (
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">نسبة العربون المطلوب (%)</Label>
              <Input
                type="number"
                min="5"
                max="100"
                value={form.bookingDepositPercent}
                onChange={(e) => setForm({ ...form, bookingDepositPercent: Number(e.target.value) || 25 })}
                className="rounded-xl border-slate-200 text-xs font-bold"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-50">
            <ToggleRow
              title="السماح للعملاء بإلغاء الموعد ذاتيًا"
              desc="تمكين العميل من إلغاء موعده عبر رابط تفاصيل الحجز وفقًا لمهلة الإلغاء."
              value={form.bookingAllowCancellation}
              onChange={(v) => setForm({ ...form, bookingAllowCancellation: v })}
            />

            {form.bookingAllowCancellation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">مهلة الإلغاء المجاني قبل الموعد (بالساعات)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={form.bookingCancelWindowHours}
                    onChange={(e) => setForm({ ...form, bookingCancelWindowHours: Number(e.target.value) || 24 })}
                    className="rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* تنبيهات وإشعارات الحجوزات */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Bell size={17} className="text-pink-600" />
            إشعارات وتذكيرات الحجوزات
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            قنوات إشعار العملاء والإدارة بالمواعيد الجديدة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <ToggleRow
            title="إشعار الإدارة فور استقبال حجز جديد"
            desc="إرسال تنبيه في لوحة التحكم عند قيام عميل بحجز جديد."
            value={form.bookingNotifyOwner}
            onChange={(v) => setForm({ ...form, bookingNotifyOwner: v })}
          />

          <ToggleRow
            title="إرسال تأكيد الموعد للعميل"
            desc="إرسال رسالة تأكيد للموعد تحتوي على التاريخ والوقت والعنوان للعميل."
            value={form.bookingNotifyCustomer}
            onChange={(v) => setForm({ ...form, bookingNotifyCustomer: v })}
          />

          <ToggleRow
            title="تفعيل التذكير عبر WhatsApp"
            desc="إرسال رسائل تذكير قبل الموعد بساعتين عبر تطبيق واتساب تلقائيًا."
            value={form.bookingNotifyWhatsapp}
            onChange={(v) => setForm({ ...form, bookingNotifyWhatsapp: v })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
