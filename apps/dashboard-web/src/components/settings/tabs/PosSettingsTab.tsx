'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input, Button } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import {
  Store, Printer, ScanLine, CreditCard, Lock,
  ShieldCheck, Volume2, Users, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface PosSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function PosSettingsTab({ shop, onSaved }: PosSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(() => ({
    receiptPaperSize: String(pd.posReceiptPaperSize || '80mm'),
    autoPrintReceipt: Boolean(pd.posAutoPrintReceipt ?? true),
    showLogoOnReceipt: Boolean(pd.posShowLogoOnReceipt ?? true),
    showQrCodeOnReceipt: Boolean(pd.posShowQrCodeOnReceipt ?? true),
    barcodeSound: Boolean(pd.posBarcodeSound ?? true),
    fastCheckout: Boolean(pd.posFastCheckout ?? false),
    openCashDrawer: Boolean(pd.posOpenCashDrawer ?? true),
    defaultPaymentMethod: String(pd.posDefaultPaymentMethod || 'cash'),
    requireCashierPin: Boolean(pd.posRequireCashierPin ?? false),
    requireShiftSession: Boolean(pd.posRequireShiftSession ?? true),
    receiptHeaderCustom: String(pd.posReceiptHeaderCustom || ''),
    receiptFooterCustom: String(pd.posReceiptFooterCustom || 'شكرًا لزيارتكم! الفاتورة صالحة للاستبدال خلال 14 يومًا.'),
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

  // Emit changes count for master Save button
  useEffect(() => {
    const isChanged =
      form.receiptPaperSize !== initial.receiptPaperSize ||
      form.autoPrintReceipt !== initial.autoPrintReceipt ||
      form.showLogoOnReceipt !== initial.showLogoOnReceipt ||
      form.showQrCodeOnReceipt !== initial.showQrCodeOnReceipt ||
      form.barcodeSound !== initial.barcodeSound ||
      form.fastCheckout !== initial.fastCheckout ||
      form.openCashDrawer !== initial.openCashDrawer ||
      form.defaultPaymentMethod !== initial.defaultPaymentMethod ||
      form.requireCashierPin !== initial.requireCashierPin ||
      form.requireShiftSession !== initial.requireShiftSession ||
      form.receiptHeaderCustom !== initial.receiptHeaderCustom ||
      form.receiptFooterCustom !== initial.receiptFooterCustom;

    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'pos_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const savePosSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            posReceiptPaperSize: current.receiptPaperSize,
            posAutoPrintReceipt: current.autoPrintReceipt,
            posShowLogoOnReceipt: current.showLogoOnReceipt,
            posShowQrCodeOnReceipt: current.showQrCodeOnReceipt,
            posBarcodeSound: current.barcodeSound,
            posFastCheckout: current.fastCheckout,
            posOpenCashDrawer: current.openCashDrawer,
            posDefaultPaymentMethod: current.defaultPaymentMethod,
            posRequireCashierPin: current.requireCashierPin,
            posRequireShiftSession: current.requireShiftSession,
            posReceiptHeaderCustom: current.receiptHeaderCustom,
            posReceiptFooterCustom: current.receiptFooterCustom,
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات الكاشير ونقاط البيع بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات الكاشير',
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
          detail: { sectionId: 'pos_settings', handler: savePosSettings },
        })
      );
    } catch {}
  }, [savePosSettings]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Store size={22} className="text-purple-600" />
            إعدادات الكاشير ونقاط البيع (POS)
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
            تخصيص شاشة البيع، الطابعة الحرارية، الورديات، وقفل الأمان
          </p>
        </div>

        <Link
          href="/dashboard/pos"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <span>فتح شاشة الكاشير</span>
          <ExternalLink size={13} />
        </Link>
      </div>

      {/* الطابعة وفواتير الكاشير */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Printer size={17} className="text-purple-600" />
            الطابعة الحرارية وتنسيق الإيصال
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            تنسيق مقاس الورق الحراري وخيارات الطباعة الفورية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">مقاس ورق الطابعة الحرارية</Label>
              <select
                value={form.receiptPaperSize}
                onChange={(e) => setForm({ ...form, receiptPaperSize: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none"
              >
                <option value="80mm">80 مم (الطابعات الحرارية القياسية الكبيرة)</option>
                <option value="58mm">58 مم (الطابعات الصغيرة والمتنقلة)</option>
                <option value="A4">A4 (الفواتير الضريبية والمكتبية)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">طريقة الدفع الافتراضية المحددة في الكاشير</Label>
              <select
                value={form.defaultPaymentMethod}
                onChange={(e) => setForm({ ...form, defaultPaymentMethod: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none"
              >
                <option value="cash">نقدي (كاش)</option>
                <option value="card">شبكة / بطاقة بنكية</option>
                <option value="wallet">محفظة إلكترونية (فودافون كاش / إنستاباي)</option>
              </select>
            </div>
          </div>

          <ToggleRow
            title="طباعة الإيصال آليًا فور إتمام البيع"
            desc="إرسال أمر الطباعة تلقائيًا إلى الطابعة الحرارية بدون الحاجة للنقر على زر الطباعة."
            value={form.autoPrintReceipt}
            onChange={(v) => setForm({ ...form, autoPrintReceipt: v })}
          />

          <ToggleRow
            title="إظهار شعار المتجر (Logo) في ترويسة الإيصال"
            desc="طباعة اللوجو الخاص بالمتجر أعلى الفاتورة الحرارية."
            value={form.showLogoOnReceipt}
            onChange={(v) => setForm({ ...form, showLogoOnReceipt: v })}
          />

          <ToggleRow
            title="إظهار رمز QR للتحقق الإلكتروني"
            desc="طباعة باركود سريع في ذيل الفاتورة للامتثال والتحقق الضريبي."
            value={form.showQrCodeOnReceipt}
            onChange={(v) => setForm({ ...form, showQrCodeOnReceipt: v })}
          />

          <ToggleRow
            title="فتح درج النقدية تلقائيًا (Cash Drawer)"
            desc="إرسال نبضة لفتح درج الكاشير المعدني المتصل بالطابعة عند إتمام الدفع النقدي."
            value={form.openCashDrawer}
            onChange={(v) => setForm({ ...form, openCashDrawer: v })}
          />
        </CardContent>
      </Card>

      {/* تجربة مسح الباركود والبيع السريع */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ScanLine size={17} className="text-purple-600" />
            الباركود وسرعة البيع
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            تخصيص استجابة الماسح وسلاسة إدخال المنتجات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ToggleRow
            title="تشغيل صوت تنبيه عند مسح الباركود (Beep)"
            desc="إصدار صوت تأكيد عند نجاح قراءة باركود المنتج وإضافته للسلة."
            value={form.barcodeSound}
            onChange={(v) => setForm({ ...form, barcodeSound: v })}
          />

          <ToggleRow
            title="تفعيل الدفع السريع بنقرة واحدة (Fast Checkout)"
            desc="إتمام الدفع النقدي فور الضغط دون فتح نافذة الحساب إذا لم يكن هناك باقي مطلوب."
            value={form.fastCheckout}
            onChange={(v) => setForm({ ...form, fastCheckout: v })}
          />
        </CardContent>
      </Card>

      {/* الأمان والورديات */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Lock size={17} className="text-purple-600" />
            الأمان والورديات
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            حماية درج النقدية وتتبع ورديات الكاشيرات اليومية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <ToggleRow
            title="إلزام فتح وإغلاق الوردية (Register Shifts)"
            desc="اشتراط تسجيل رصيد الصندوق الافتتاحي وتصفية الوردية عند تبديل الكاشيرات."
            value={form.requireShiftSession}
            onChange={(v) => setForm({ ...form, requireShiftSession: v })}
          />

          <ToggleRow
            title="قفل شاشة الكاشير برمز PIN سريع"
            desc="طلب رمز حماية شخصي عند مغادرة الكاشير لشاشته أو إجراء تعديلات حساسة كالإلغاء والخصم."
            value={form.requireCashierPin}
            onChange={(v) => setForm({ ...form, requireCashierPin: v })}
          />

          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-900">إدارة حسابات وصلاحيات الكاشيرات</div>
              <div className="text-xs text-slate-400 font-medium">إضافة موظفين جدد وتحديد صلاحيات الخصم والإلغاء</div>
            </div>
            <Link
              href="/dashboard/team"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              إدارة الفريق والكاشيرات
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

