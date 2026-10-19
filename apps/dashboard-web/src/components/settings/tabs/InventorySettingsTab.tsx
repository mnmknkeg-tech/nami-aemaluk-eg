'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { Package, ShieldAlert, ArrowDownCircle, Boxes, CheckCircle2 } from 'lucide-react';

interface InventorySettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function InventorySettingsTab({ shop, onSaved }: InventorySettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      lowStockAlerts: Boolean(pd.invLowStockAlerts ?? true),
      lowStockThreshold: String(pd.invLowStockThreshold ?? 5),
      autoDeduct: Boolean(pd.invAutoDeduct ?? true),
      allowNegative: Boolean(pd.invAllowNegative ?? false),
      trackBatches: Boolean(pd.invTrackBatches ?? false),
      requirePoApproval: Boolean(pd.invRequirePoApproval ?? false),
      defaultUnit: String(pd.invDefaultUnit || 'قطعة'),
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
          detail: { sectionId: 'inventory_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveInventorySettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            invLowStockAlerts: current.lowStockAlerts,
            invLowStockThreshold: Number(current.lowStockThreshold) || 5,
            invAutoDeduct: current.autoDeduct,
            invAllowNegative: current.allowNegative,
            invTrackBatches: current.trackBatches,
            invRequirePoApproval: current.requirePoApproval,
            invDefaultUnit: current.defaultUnit.trim() || 'قطعة',
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات المخزون بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات المخزون',
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
          detail: { sectionId: 'inventory_settings', handler: saveInventorySettings },
        })
      );
    } catch {}
  }, [saveInventorySettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات المخزون والمنتجات</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة تنبيهات نفاذ الكميات، وحدات القياس، وسياسات البيع والخصم التلقائي
        </p>
      </div>

      {/* التنبيهات والخصم الآلي */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle size={18} className="text-[#0284C7]" />
            حدود التنبيه والخصم التلقائي
          </CardTitle>
          <CardDescription className="text-xs">
            متابعة حركة المخزون مع كل فاتورة مباعة وتنبيهك قبل نفاد أي منتج
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="تفعيل تنبيهات انخفاض المخزون"
            desc="إظهار شارة تحذير وإرسال إشعار فوري عند وصول كمية المنتج إلى حد إعادة الطلب"
            value={form.lowStockAlerts}
            onChange={(v) => setForm((f) => ({ ...f, lowStockAlerts: v }))}
          />

          {form.lowStockAlerts && (
            <div className="flex items-center justify-between gap-4 pt-1 pb-3 border-b border-slate-50">
              <div>
                <Label className="font-bold text-sm text-slate-900">الحد الأدنى الافتراضي للكمية</Label>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  يُطبق تلقائيًا على المنتجات الجديدة التي لم يحدد لها حد خاص
                </div>
              </div>
              <div className="relative w-32">
                <Input
                  type="number"
                  min="1"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  وحدات
                </span>
              </div>
            </div>
          )}

          <ToggleRow
            title="خصم المخزون تلقائيًا عند إتمام الفاتورة"
            desc="تحديث رصيد المستودع لحظيًا فور إتمام عملية البيع في الكاشير أو المتجر"
            value={form.autoDeduct}
            onChange={(v) => setForm((f) => ({ ...f, autoDeduct: v }))}
          />

          <ToggleRow
            title="السماح بالبيع بالسالب (عند نفاذ المخزون)"
            desc="تمكين الكاشير من إتمام البيع حتى لو كان رصيد المنتج صفر في النظام"
            value={form.allowNegative}
            onChange={(v) => setForm((f) => ({ ...f, allowNegative: v }))}
          />
        </CardContent>
      </Card>

      {/* الرقابة وأوامر الشراء */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes size={18} className="text-[#0284C7]" />
            ضوابط التوريد وأوامر الشراء
          </CardTitle>
          <CardDescription className="text-xs">
            تتبع التواريخ والتشغيلات واعتماد استلام البضاعة من الموردين
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="تتبع أرقام التشغيلات وتواريخ الصلاحية (Batch Tracking)"
            desc="تسجيل رقم التشغيلة وتاريخ الانتهاء مع كل شحنة واردة (مهم للأغذية والمستحضرات)"
            value={form.trackBatches}
            onChange={(v) => setForm((f) => ({ ...f, trackBatches: v }))}
          />

          <ToggleRow
            title="إلزام اعتماد أمر الشراء قبل إدخال البضاعة للمخزن"
            desc="لا يمكن إضافة رصيد جديد للمستودع دون أمر شراء رسمي معتمد من الإدارة"
            value={form.requirePoApproval}
            onChange={(v) => setForm((f) => ({ ...f, requirePoApproval: v }))}
          />

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              <Label className="font-bold text-sm text-slate-900">وحدة القياس الافتراضية للمنتجات</Label>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                تُقترح عند إضافة أصناف جديدة في قسم المنتجات
              </div>
            </div>
            <select
              value={form.defaultUnit}
              onChange={(e) => setForm((f) => ({ ...f, defaultUnit: e.target.value }))}
              className="w-40 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            >
              <option value="قطعة">قطعة (Pcs)</option>
              <option value="كيلوجرام">كيلوجرام (Kg)</option>
              <option value="جرام">جرام (g)</option>
              <option value="لتر">لتر (L)</option>
              <option value="متر">متر (m)</option>
              <option value="كرتونة">كرتونة (Box)</option>
              <option value="علبة">علبة (Pack)</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
