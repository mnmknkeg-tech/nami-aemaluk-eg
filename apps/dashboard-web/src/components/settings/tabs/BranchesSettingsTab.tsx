'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { MapPin, Building2, Clock, Truck, Store, ArrowLeftRight } from 'lucide-react';

interface BranchesSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function BranchesSettingsTab({ shop, onSaved }: BranchesSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      showOnInvoices: Boolean(pd.branchShowOnInvoices ?? true),
      enforceSelection: Boolean(pd.branchEnforceSelection ?? false),
      allowTransfers: Boolean(pd.branchAllowTransfers ?? true),
      defaultHours: String(pd.branchDefaultHours || 'يوميًا 10:00 ص - 10:00 م'),
      enableClickAndCollect: Boolean(pd.branchEnableClickAndCollect ?? true),
      autoRouteOnlineOrders: Boolean(pd.branchAutoRouteOnlineOrders ?? true),
      crossBranchFulfillment: Boolean(pd.branchCrossBranchFulfillment ?? false),
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
          detail: { sectionId: 'branches_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveBranchesSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            branchShowOnInvoices: current.showOnInvoices,
            branchEnforceSelection: current.enforceSelection,
            branchAllowTransfers: current.allowTransfers,
            branchDefaultHours: current.defaultHours.trim(),
            branchEnableClickAndCollect: current.enableClickAndCollect,
            branchAutoRouteOnlineOrders: current.autoRouteOnlineOrders,
            branchCrossBranchFulfillment: current.crossBranchFulfillment,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الفروع بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات الفروع',
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
          detail: { sectionId: 'branches_settings', handler: saveBranchesSettings },
        })
      );
    } catch {}
  }, [saveBranchesSettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات الفروع والمستودعات</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة سياسات البيع والتحويل بين الفروع، وساعات العمل واستلام الطلبات
        </p>
      </div>

      {/* سلوك البيع والفواتير */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 size={18} className="text-[#0284C7]" />
            سلوك البيع والفواتير لكل فرع
          </CardTitle>
          <CardDescription className="text-xs">
            تحديد ارتباط الفواتير بالفرع ومطابقة المخزون
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleRow
            title="إظهار اسم الفرع وعنوانه على الفواتير"
            desc="اسم الفرع ورقم هاتفه يظهران بوضوح في ترويسة الفاتورة المطبوعة والإلكترونية"
            value={form.showOnInvoices}
            onChange={(v) => setForm((f) => ({ ...f, showOnInvoices: v }))}
          />
          <ToggleRow
            title="إلزام اختيار الفرع قبل فتح فاتورة الكاشير"
            desc="لا يمكن إتمام البيع بدون تحديد الفرع النشط (مهم للمتاجر متعددة الفروع)"
            value={form.enforceSelection}
            onChange={(v) => setForm((f) => ({ ...f, enforceSelection: v }))}
          />
          <ToggleRow
            title="تفعيل الاستلام من الفرع (Click & Collect)"
            desc="إتاحة خيار للعميل لاستلام طلبه بنفسه من أقرب فرع يختاره"
            value={form.enableClickAndCollect}
            onChange={(v) => setForm((f) => ({ ...f, enableClickAndCollect: v }))}
          />
        </CardContent>
      </Card>

      {/* تحويلات المخزون وتوجيه الطلبات */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-[#0284C7]" />
            أوامر التحويل وتوجيه طلبات الأونلاين
          </CardTitle>
          <CardDescription className="text-xs">
            تنظيم تدوير المخزون وتوزيع طلبات المتجر الإلكتروني على الفروع
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleRow
            title="السماح بأوامر التحويل بين الفروع"
            desc="تمكين مديري الفروع من إنشاء طلبات تحويل بضاعة وقبولها رسميًا"
            value={form.allowTransfers}
            onChange={(v) => setForm((f) => ({ ...f, allowTransfers: v }))}
          />
          <ToggleRow
            title="توجيه طلبات الأونلاين تلقائيًا للفرع الأقرب"
            desc="إسناد الطلب الجديد للفرع الأقرب جغرافياً للعميل بناءً على موقعه"
            value={form.autoRouteOnlineOrders}
            onChange={(v) => setForm((f) => ({ ...f, autoRouteOnlineOrders: v }))}
          />
          <ToggleRow
            title="البيع من فروع أخرى عند نفاذ الرصيد المحلي"
            desc="السماح بتنفيذ الطلب من فرع بديل إذا كان المخزون غير كافٍ في الفرع الحالي"
            value={form.crossBranchFulfillment}
            onChange={(v) => setForm((f) => ({ ...f, crossBranchFulfillment: v }))}
          />
        </CardContent>
      </Card>

      {/* ساعات العمل الافتراضية */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} className="text-[#0284C7]" />
            مواعيد وساعات العمل الافتراضية
          </CardTitle>
          <CardDescription className="text-xs">
            تُقترح تلقائيًا عند إنشاء فرع جديد ويمكن تخصيصها لكل فرع على حدة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="font-bold text-sm text-slate-900">ساعات العمل المقترحة</Label>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                تظهر للعملاء في تطبيق وموقع المتجر
              </div>
            </div>
            <Input
              value={form.defaultHours}
              onChange={(e) => setForm((f) => ({ ...f, defaultHours: e.target.value }))}
              className="w-64 text-center shrink-0 rounded-xl font-bold text-xs"
              placeholder="يوميًا 10:00 ص - 10:00 م"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
