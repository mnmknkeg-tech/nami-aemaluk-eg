'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { UserCog, Clock, ShieldAlert, Percent, Calendar, DollarSign } from 'lucide-react';

interface HrSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function HrSettingsTab({ shop, onSaved }: HrSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      shiftStart: String(pd.hrShiftStart || '09:00'),
      shiftEnd: String(pd.hrShiftEnd || '18:00'),
      lateGraceMinutes: String(pd.hrLateGraceMinutes ?? 15),
      allowCashierDiscount: Boolean(pd.hrAllowCashierDiscount ?? true),
      maxDiscountPercent: String(pd.hrMaxDiscountPercent ?? 10),
      allowCashierRefund: Boolean(pd.hrAllowCashierRefund ?? false),
      autoApproveLeaves: Boolean(pd.hrAutoApproveLeaves ?? false),
      payrollDay: String(pd.hrPayrollDay ?? 1),
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
          detail: { sectionId: 'hr_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveHrSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            hrShiftStart: current.shiftStart.trim() || '09:00',
            hrShiftEnd: current.shiftEnd.trim() || '18:00',
            hrLateGraceMinutes: Number(current.lateGraceMinutes) || 0,
            hrAllowCashierDiscount: current.allowCashierDiscount,
            hrMaxDiscountPercent: Number(current.maxDiscountPercent) || 0,
            hrAllowCashierRefund: current.allowCashierRefund,
            hrAutoApproveLeaves: current.autoApproveLeaves,
            hrPayrollDay: Number(current.payrollDay) || 1,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الفريق والصلاحيات بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات الفريق',
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
          detail: { sectionId: 'hr_settings', handler: saveHrSettings },
        })
      );
    } catch {}
  }, [saveHrSettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات فريق العمل والصلاحيات</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة مواعيد الورديات، حدود خصومات الكاشير، وأيام صرف الرواتب
        </p>
      </div>

      {/* الورديات وساعات الحضور */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} className="text-[#0284C7]" />
            أوقات العمل الرسمية وفترة السماح
          </CardTitle>
          <CardDescription className="text-xs">
            تحديد البداية والنهاية الرسمية للوردية لحساب التأخيرات وساعات العمل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="shiftStart" className="text-xs font-bold text-slate-700">
                بداية الوردية الافتراضية
              </Label>
              <Input
                id="shiftStart"
                type="time"
                value={form.shiftStart}
                onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))}
                className="rounded-xl text-center text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shiftEnd" className="text-xs font-bold text-slate-700">
                نهاية الوردية الافتراضية
              </Label>
              <Input
                id="shiftEnd"
                type="time"
                value={form.shiftEnd}
                onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                className="rounded-xl text-center text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lateGrace" className="text-xs font-bold text-slate-700">
                فترة السماح بالتأخير (دقائق)
              </Label>
              <div className="relative">
                <Input
                  id="lateGrace"
                  type="number"
                  min="0"
                  max="60"
                  value={form.lateGraceMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, lateGraceMinutes: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  دقيقة
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* صلاحيات الكاشير والمالية */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#0284C7]" />
            صلاحيات موظفي الكاشير والحدود المالية
          </CardTitle>
          <CardDescription className="text-xs">
            التحكم في قدرة الكاشير على تطبيق الخصومات وإرجاع الفواتير دون إذن المشرف
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="السماح لموظف الكاشير بتطبيق خصم يدوي"
            desc="تمكين الكاشير من إدخال خصم على مستوى الفاتورة أو الصنف"
            value={form.allowCashierDiscount}
            onChange={(v) => setForm((f) => ({ ...f, allowCashierDiscount: v }))}
          />

          {form.allowCashierDiscount && (
            <div className="flex items-center justify-between gap-4 pt-1 pb-3 border-b border-slate-50">
              <div>
                <Label className="font-bold text-sm text-slate-900">أقصى نسبة خصم مسموحة للكاشير (%)</Label>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  أي خصم يتجاوز هذه النسبة يستلزم موافقة المشرف أو المدير
                </div>
              </div>
              <div className="relative w-28">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={form.maxDiscountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountPercent: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>
          )}

          <ToggleRow
            title="السماح للكاشير بإجراء مرتجعات واسترداد نقدية"
            desc="إمكانية إتمام مرتجع الفواتير وإخراج النقدية من الدرج دون طلب كود المشرف"
            value={form.allowCashierRefund}
            onChange={(v) => setForm((f) => ({ ...f, allowCashierRefund: v }))}
          />
        </CardContent>
      </Card>

      {/* الرواتب والإجازات */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign size={18} className="text-[#0284C7]" />
            دورة الرواتب والإجازات
          </CardTitle>
          <CardDescription className="text-xs">
            إعداد يوم صرف مستحقات الموظفين واعتماد الإجازات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-50">
            <div>
              <Label className="font-bold text-sm text-slate-900">يوم صرف الرواتب الشهري</Label>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                تاريخ استحقاق كشف مسيرات الرواتب في كل شهر ميلادي
              </div>
            </div>
            <div className="relative w-36">
              <Input
                type="number"
                min="1"
                max="31"
                value={form.payrollDay}
                onChange={(e) => setForm((f) => ({ ...f, payrollDay: e.target.value }))}
                className="rounded-xl text-center text-xs font-black"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                من الشهر
              </span>
            </div>
          </div>

          <ToggleRow
            title="الموافقة التلقائية على طلبات الإجازات العادية"
            desc="اعتماد طلب الإجازة تلقائيًا إذا كان رصيد الموظف السنوي كافيًا"
            value={form.autoApproveLeaves}
            onChange={(v) => setForm((f) => ({ ...f, autoApproveLeaves: v }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
