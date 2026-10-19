'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { Calculator, FileSpreadsheet, ShieldAlert, Coins } from 'lucide-react';

interface AccountingSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

const MONTHS = [
  { value: '01', label: 'يناير' },
  { value: '02', label: 'فبراير' },
  { value: '03', label: 'مارس' },
  { value: '04', label: 'أبريل' },
  { value: '05', label: 'مايو' },
  { value: '06', label: 'يونيو' },
  { value: '07', label: 'يوليو' },
  { value: '08', label: 'أغسطس' },
  { value: '09', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
];

export default function AccountingSettingsTab({ shop, onSaved }: AccountingSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      // الضرائب والسجل
      taxNumber: String(pd.accTaxNumber || shop?.taxNumber || ''),
      commercialRegister: String(pd.accCommercialRegister || shop?.commercialRegister || ''),
      vatRatePercent: String(pd.accVatRatePercent ?? '14'),
      pricesIncludeVat: Boolean(pd.accPricesIncludeVat ?? true),
      currency: String(pd.accCurrency || 'EGP'),
      // القيود والسنة المالية
      autoJournal: Boolean(pd.accAutoJournal ?? true),
      fiscalStartMonth: String(pd.accFiscalStartMonth || '01'),
      lockClosedPeriods: Boolean(pd.accLockPeriods ?? true),
      expenseReceiptThreshold: String(pd.accExpenseReceiptThreshold ?? 1000),
    }),
    [pd, shop]
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
          detail: { sectionId: 'accounting_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveAccountingSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            accTaxNumber: current.taxNumber.trim(),
            accCommercialRegister: current.commercialRegister.trim(),
            accVatRatePercent: Number(current.vatRatePercent) || 0,
            accPricesIncludeVat: current.pricesIncludeVat,
            accCurrency: current.currency,
            accAutoJournal: current.autoJournal,
            accFiscalStartMonth: current.fiscalStartMonth,
            accLockPeriods: current.lockClosedPeriods,
            accExpenseReceiptThreshold: Number(current.expenseReceiptThreshold) || 0,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات المحاسبة والضرائب بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات المحاسبة',
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
          detail: { sectionId: 'accounting_settings', handler: saveAccountingSettings },
        })
      );
    } catch {}
  }, [saveAccountingSettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات المحاسبة والضرائب</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة بيانات السجل التجاري، نسبة ضريبة القيمة المضافة، والقيود المحاسبية التلقائية
        </p>
      </div>

      {/* البيانات الضريبية والتجارية */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins size={18} className="text-[#0284C7]" />
            البيانات الضريبية ونسبة الضريبة
          </CardTitle>
          <CardDescription className="text-xs">
            تظهر هذه البيانات على الفواتير الضريبية وتُعتمد في الإقرارات المالية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber" className="text-xs font-bold text-slate-700">
                الرقم الضريبي (البطاقة الضريبية / VAT Number)
              </Label>
              <Input
                id="taxNumber"
                value={form.taxNumber}
                onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
                placeholder="مثال: 123-456-789"
                dir="ltr"
                className="rounded-xl text-right text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="commercialRegister" className="text-xs font-bold text-slate-700">
                رقم السجل التجاري (Commercial Registry)
              </Label>
              <Input
                id="commercialRegister"
                value={form.commercialRegister}
                onChange={(e) => setForm((f) => ({ ...f, commercialRegister: e.target.value }))}
                placeholder="مثال: 104523"
                dir="ltr"
                className="rounded-xl text-right text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vatRatePercent" className="text-xs font-bold text-slate-700">
                نسبة ضريبة القيمة المضافة (%)
              </Label>
              <div className="relative">
                <Input
                  id="vatRatePercent"
                  type="number"
                  min="0"
                  max="100"
                  value={form.vatRatePercent}
                  onChange={(e) => setForm((f) => ({ ...f, vatRatePercent: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
              <p className="text-[10px] text-slate-400">النسبة المعتمدة في مصر 14%</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-bold text-slate-700">
                العملة المحاسبية الأساسية
              </Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="AED">درهم إماراتي (AED)</option>
              </select>
            </div>
          </div>

          <ToggleRow
            title="الأسعار شاملة ضريبة القيمة المضافة"
            desc="عند التفعيل يتم عرض السعر النهائي شامل الضريبة، وإلا يتم احتسابها كبند منفصل في الفاتورة"
            value={form.pricesIncludeVat}
            onChange={(v) => setForm((f) => ({ ...f, pricesIncludeVat: v }))}
          />
        </CardContent>
      </Card>

      {/* القيود المحاسبية والسنة المالية */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-[#0284C7]" />
            القيود اليومية وضوابط المصروفات
          </CardTitle>
          <CardDescription className="text-xs">
            الربط التلقائي بين المبيعات ودفتر اليومية وقفل الفترات السابقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="قيود يومية تلقائية للمبيعات"
            desc="توليد قيد محاسبي مزدوج تلقائيًا في دفتر اليومية مع كل فاتورة مسددة"
            value={form.autoJournal}
            onChange={(v) => setForm((f) => ({ ...f, autoJournal: v }))}
          />
          <ToggleRow
            title="قفل الفترات المحاسبية المغلقة"
            desc="منع التعديل أو الحذف في قيود الفترات التي تم إغلاقها ومراجعتها"
            value={form.lockClosedPeriods}
            onChange={(v) => setForm((f) => ({ ...f, lockClosedPeriods: v }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">شهر بداية السنة المالية</Label>
              <select
                value={form.fiscalStartMonth}
                onChange={(e) => setForm((f) => ({ ...f, fiscalStartMonth: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expenseThreshold" className="text-xs font-bold text-slate-700">
                حد المصروفات الإلزامي للإيصال
              </Label>
              <div className="relative">
                <Input
                  id="expenseThreshold"
                  type="number"
                  value={form.expenseReceiptThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, expenseReceiptThreshold: e.target.value }))}
                  className="rounded-xl text-center text-xs font-bold"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {form.currency}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">أي مصروف يتجاوز هذا المبلغ يستلزم إرفاق صورة الفاتورة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
