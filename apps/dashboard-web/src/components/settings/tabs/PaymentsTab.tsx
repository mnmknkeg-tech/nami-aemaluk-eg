'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { CreditCard, Banknote, Smartphone, Building, ShieldCheck, Check } from 'lucide-react';

interface PaymentsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function PaymentsTab({ shop, onSaved }: PaymentsTabProps) {
  const { toast } = useToast();
  const [, setSaving] = useState(false);

  const pc = shop?.paymentConfig || {};

  const [form, setForm] = useState({
    // طرق الدفع
    codEnabled: Boolean(pc.codEnabled ?? true),
    codFee: String(pc.codFee ?? '0'),
    walletEnabled: Boolean(pc.walletEnabled ?? true),
    walletPhone: String(pc.walletPhone || ''),
    instapayHandle: String(pc.instapayHandle || ''),
    cardEnabled: Boolean(pc.cardEnabled ?? false),
    provider: String(pc.provider || 'paymob'),
    merchantId: String(pc.merchantId || ''),
    publicKey: String(pc.publicKey || ''),
    apiKey: String(pc.apiKey || ''),
    // تفاصيل الحساب البنكي للتسوية
    bankName: String(pc.bankName || ''),
    bankAccountName: String(pc.bankAccountName || ''),
    bankIban: String(pc.bankIban || ''),
  });

  const baselineRef = useRef(form);

  useEffect(() => {
    const updated = {
      codEnabled: Boolean(pc.codEnabled ?? true),
      codFee: String(pc.codFee ?? '0'),
      walletEnabled: Boolean(pc.walletEnabled ?? true),
      walletPhone: String(pc.walletPhone || ''),
      instapayHandle: String(pc.instapayHandle || ''),
      cardEnabled: Boolean(pc.cardEnabled ?? false),
      provider: String(pc.provider || 'paymob'),
      merchantId: String(pc.merchantId || ''),
      publicKey: String(pc.publicKey || ''),
      apiKey: String(pc.apiKey || ''),
      bankName: String(pc.bankName || ''),
      bankAccountName: String(pc.bankAccountName || ''),
      bankIban: String(pc.bankIban || ''),
    };
    baselineRef.current = updated;
    setForm(updated);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'payments', count: 0 },
        })
      );
    } catch {}
  }, [shop?.paymentConfig]);

  useEffect(() => {
    const isChanged = JSON.stringify(form) !== JSON.stringify(baselineRef.current);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'payments', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form]);

  const savePayments = useCallback(async () => {
    setSaving(true);
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          paymentConfig: {
            ...pc,
            ...form,
          },
        }),
      });
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الدفع بنجاح' });
      baselineRef.current = form;
      try {
        window.dispatchEvent(
          new CustomEvent('merchant-settings-section-changes', {
            detail: { sectionId: 'payments', count: 0 },
          })
        );
      } catch {}
      onSaved();
      return true;
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ إعدادات الدفع', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [shop?.id, form, pc, toast, onSaved]);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'payments', handler: savePayments },
        })
      );
    } catch {}
  }, [savePayments]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">طرق وإعدادات الدفع</h2>
        <p className="text-slate-500 text-xs mt-1">
          قم بتفعيل خيارات الدفع المتاحة لعملائك وتعيين الحسابات البنكية لاستلام الأرباح
        </p>
      </div>

      {/* خيارات الدفع السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* الدفع عند الاستلام */}
        <div
          onClick={() => setForm((p) => ({ ...p, codEnabled: !p.codEnabled }))}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
            form.codEnabled
              ? 'border-[#0284C7] bg-[#0284C7]/5'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                form.codEnabled ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-transparent'
              }`}
            >
              <Check size={14} />
            </div>
          </div>
          <h3 className="font-black text-sm text-slate-900">الدفع عند الاستلام (COD)</h3>
          <p className="text-xs text-slate-500 mt-1">استلام القيمة نقدًا عند توصيل الشحنة للعميل</p>
        </div>

        {/* المحافظ وإنستاباي */}
        <div
          onClick={() => setForm((p) => ({ ...p, walletEnabled: !p.walletEnabled }))}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
            form.walletEnabled
              ? 'border-[#0284C7] bg-[#0284C7]/5'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                form.walletEnabled ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-transparent'
              }`}
            >
              <Check size={14} />
            </div>
          </div>
          <h3 className="font-black text-sm text-slate-900">المحافظ وإنستاباي (InstaPay)</h3>
          <p className="text-xs text-slate-500 mt-1">فودافون كاش، أورنج، اتصالات، وتحويل إنستاباي</p>
        </div>

        {/* بوابات الدفع الإلكتروني */}
        <div
          onClick={() => setForm((p) => ({ ...p, cardEnabled: !p.cardEnabled }))}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
            form.cardEnabled
              ? 'border-[#0284C7] bg-[#0284C7]/5'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                form.cardEnabled ? 'bg-[#0284C7] text-white' : 'bg-slate-100 text-transparent'
              }`}
            >
              <Check size={14} />
            </div>
          </div>
          <h3 className="font-black text-sm text-slate-900">البطاقات البنكية أونلاين</h3>
          <p className="text-xs text-slate-500 mt-1">Visa, MasterCard, ميزة عبر بوابات الدفع</p>
        </div>
      </div>

      {/* تفاصيل المحافظ وإنستاباي إذا مفعلة */}
      {form.walletEnabled && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone size={18} className="text-[#0284C7]" />
              بيانات استقبال المحافظ وإنستاباي
            </CardTitle>
            <CardDescription className="text-xs">
              ستظهر هذه البيانات للعميل عند اختيار الدفع عبر المحفظة أو إنستاباي
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="walletPhone" className="text-xs font-bold text-slate-700">
                رقم المحفظة الإلكترونية (فودافون كاش / غيرها)
              </Label>
              <Input
                id="walletPhone"
                value={form.walletPhone}
                onChange={(e) => setForm((p) => ({ ...p, walletPhone: e.target.value }))}
                placeholder="010XXXXXXXX"
                dir="ltr"
                className="text-right rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instapayHandle" className="text-xs font-bold text-slate-700">
                معرف إنستاباي (InstaPay IPA / Phone)
              </Label>
              <Input
                id="instapayHandle"
                value={form.instapayHandle}
                onChange={(e) => setForm((p) => ({ ...p, instapayHandle: e.target.value }))}
                placeholder="username@instapay"
                dir="ltr"
                className="text-right rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* تفاصيل بوابة الدفع الإلكتروني */}
      {form.cardEnabled && (
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard size={18} className="text-[#0284C7]" />
              إعدادات بوابة الدفع (Paymob / Fawry)
            </CardTitle>
            <CardDescription className="text-xs">
              أدخل مفاتيح الربط الخاصة بحسابك في بوابة الدفع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="provider" className="text-xs font-bold text-slate-700">
                  بوابة الدفع
                </Label>
                <select
                  id="provider"
                  value={form.provider}
                  onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="paymob">Paymob (باي موب)</option>
                  <option value="fawry">Fawry (فوري باي)</option>
                  <option value="kashier">Kashier (كاشير)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="merchantId" className="text-xs font-bold text-slate-700">
                  معرّف التاجر (Merchant ID)
                </Label>
                <Input
                  id="merchantId"
                  value={form.merchantId}
                  onChange={(e) => setForm((p) => ({ ...p, merchantId: e.target.value }))}
                  placeholder="e.g. 123456"
                  dir="ltr"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publicKey" className="text-xs font-bold text-slate-700">
                  المفتاح العام (Public Key / Integration ID)
                </Label>
                <Input
                  id="publicKey"
                  value={form.publicKey}
                  onChange={(e) => setForm((p) => ({ ...p, publicKey: e.target.value }))}
                  placeholder="e.g. PK_live_..."
                  dir="ltr"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apiKey" className="text-xs font-bold text-slate-700">
                  مفتاح واجهة التطبيق (API Secret Key)
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
                  placeholder="••••••••••••"
                  dir="ltr"
                  className="rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* حساب التسوية البنكي */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building size={18} className="text-[#0284C7]" />
            الحساب البنكي لتسوية الأرباح
          </CardTitle>
          <CardDescription className="text-xs">
            البيانات البنكية التي يتم تحويل مستحقات مبيعاتك وأرباح المتجر إليها
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bankName" className="text-xs font-bold text-slate-700">
              اسم البنك
            </Label>
            <Input
              id="bankName"
              value={form.bankName}
              onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
              placeholder="مثال: البنك الأهلي المصري، CIB"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bankAccountName" className="text-xs font-bold text-slate-700">
              اسم صاحب الحساب
            </Label>
            <Input
              id="bankAccountName"
              value={form.bankAccountName}
              onChange={(e) => setForm((p) => ({ ...p, bankAccountName: e.target.value }))}
              placeholder="الاسم كما هو مسجل بالبنك"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bankIban" className="text-xs font-bold text-slate-700">
              رقم الآيبان (IBAN)
            </Label>
            <Input
              id="bankIban"
              value={form.bankIban}
              onChange={(e) => setForm((p) => ({ ...p, bankIban: e.target.value }))}
              placeholder="EG0000000000000000000000000"
              dir="ltr"
              className="text-right rounded-xl"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
