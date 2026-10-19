'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { BarChart3, Globe, Shield, Activity, Share2, Sparkles } from 'lucide-react';

interface AnalyticsSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

const RANGES = [
  { value: '7', label: 'آخر 7 أيام' },
  { value: '30', label: 'آخر 30 يوم' },
  { value: '90', label: 'آخر 90 يوم' },
];

export default function AnalyticsSettingsTab({ shop, onSaved }: AnalyticsSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      defaultRangeDays: String(pd.anaDefaultRangeDays || '30'),
      trackVisits: Boolean(pd.anaTrackVisits ?? true),
      excludeStaff: Boolean(pd.anaExcludeStaff ?? true),
      anonymizeIp: Boolean(pd.anaAnonymizeIp ?? false),
      weeklySummary: Boolean(pd.anaWeeklySummary ?? true),
      // بكسلات التتبع الإعلاني والتحليلات
      ga4MeasurementId: String(pd.anaGa4MeasurementId || ''),
      facebookPixelId: String(pd.anaFacebookPixelId || ''),
      tiktokPixelId: String(pd.anaTiktokPixelId || ''),
      snapchatPixelId: String(pd.anaSnapchatPixelId || ''),
      gtmContainerId: String(pd.anaGtmContainerId || ''),
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
          detail: { sectionId: 'analytics_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveAnalyticsSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            anaDefaultRangeDays: current.defaultRangeDays,
            anaTrackVisits: current.trackVisits,
            anaExcludeStaff: current.excludeStaff,
            anaAnonymizeIp: current.anonymizeIp,
            anaWeeklySummary: current.weeklySummary,
            anaGa4MeasurementId: current.ga4MeasurementId.trim(),
            anaFacebookPixelId: current.facebookPixelId.trim(),
            anaTiktokPixelId: current.tiktokPixelId.trim(),
            anaSnapchatPixelId: current.snapchatPixelId.trim(),
            anaGtmContainerId: current.gtmContainerId.trim(),
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات التحليلات والبكسل بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات التحليلات',
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
          detail: { sectionId: 'analytics_settings', handler: saveAnalyticsSettings },
        })
      );
    } catch {}
  }, [saveAnalyticsSettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات التحليلات والبكسل الإعلاني</h2>
        <p className="text-slate-500 text-xs mt-1">
          اربط بكسلات التتبع لحملاتك الإعلانية على فيسبوك وتيك توك وتحليلات جوجل بدقة
        </p>
      </div>

      {/* بكسلات التتبع الإعلاني */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 size={18} className="text-[#0284C7]" />
            بكسلات التتبع التسويقي (Tracking Pixels)
          </CardTitle>
          <CardDescription className="text-xs">
            أدخل معرفات البكسل لتتبع التحويلات وإجراءات الشراء تلقائيًا في متجرك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* فيسبوك بيكسل */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <Label htmlFor="facebookPixelId" className="text-xs font-bold text-slate-800">
                  Facebook / Meta Pixel ID
                </Label>
                <span className="text-[10px] text-blue-600 font-black">Meta</span>
              </div>
              <Input
                id="facebookPixelId"
                value={form.facebookPixelId}
                onChange={(e) => setForm((f) => ({ ...f, facebookPixelId: e.target.value }))}
                placeholder="e.g. 123456789012345"
                dir="ltr"
                className="bg-white rounded-xl text-right text-xs"
              />
              <p className="text-[10px] text-slate-400">يتتبع أحداث PageView, AddToCart, Purchase</p>
            </div>

            {/* تيك توك بيكسل */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <Label htmlFor="tiktokPixelId" className="text-xs font-bold text-slate-800">
                  TikTok Pixel ID
                </Label>
                <span className="text-[10px] text-black font-black">TikTok</span>
              </div>
              <Input
                id="tiktokPixelId"
                value={form.tiktokPixelId}
                onChange={(e) => setForm((f) => ({ ...f, tiktokPixelId: e.target.value }))}
                placeholder="e.g. CXXXXXXXXXXXXXX"
                dir="ltr"
                className="bg-white rounded-xl text-right text-xs"
              />
              <p className="text-[10px] text-slate-400">تتبع زوار متجرك القادمين من إعلانات تيك توك</p>
            </div>

            {/* سناب شات بيكسل */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <Label htmlFor="snapchatPixelId" className="text-xs font-bold text-slate-800">
                  Snapchat Pixel ID
                </Label>
                <span className="text-[10px] text-amber-500 font-black">Snapchat</span>
              </div>
              <Input
                id="snapchatPixelId"
                value={form.snapchatPixelId}
                onChange={(e) => setForm((f) => ({ ...f, snapchatPixelId: e.target.value }))}
                placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                dir="ltr"
                className="bg-white rounded-xl text-right text-xs"
              />
              <p className="text-[10px] text-slate-400">لقياس وتحسين إعلانات سناب شات</p>
            </div>

            {/* تحليلات جوجل GA4 */}
            <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <Label htmlFor="ga4MeasurementId" className="text-xs font-bold text-slate-800">
                  Google Analytics 4 (GA4 ID)
                </Label>
                <span className="text-[10px] text-emerald-600 font-black">Google</span>
              </div>
              <Input
                id="ga4MeasurementId"
                value={form.ga4MeasurementId}
                onChange={(e) => setForm((f) => ({ ...f, ga4MeasurementId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                dir="ltr"
                className="bg-white rounded-xl text-right text-xs"
              />
              <p className="text-[10px] text-slate-400">معرف القياس من حساب إحصاءات جوجل</p>
            </div>
          </div>

          {/* Google Tag Manager */}
          <div className="pt-2">
            <Label htmlFor="gtmContainerId" className="text-xs font-bold text-slate-700 block mb-1">
              Google Tag Manager (GTM Container ID) - اختياري
            </Label>
            <Input
              id="gtmContainerId"
              value={form.gtmContainerId}
              onChange={(e) => setForm((f) => ({ ...f, gtmContainerId: e.target.value }))}
              placeholder="GTM-XXXXXXX"
              dir="ltr"
              className="rounded-xl text-right text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* تفضيلات التحليلات الداخلية */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity size={18} className="text-[#0284C7]" />
            سلوك لوحة التحليلات والخصوصية
          </CardTitle>
          <CardDescription className="text-xs">
            تخصيص الفترات الزمنية وتصفية الزيارات للحصول على أرقام مبيعات دقيقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <Label className="font-bold text-sm text-slate-900">الفترة الافتراضية للتقارير</Label>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                المدى الزمني الذي يفتح عليه تقرير المبيعات تلقائيًا
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, defaultRangeDays: r.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    form.defaultRangeDays === r.value
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <ToggleRow
            title="تتبع الزيارات ونشاط الزوار"
            desc="تسجيل مصادر الزيارات والصفحات الأكثر مشاهدة في متجرك"
            value={form.trackVisits}
            onChange={(v) => setForm((f) => ({ ...f, trackVisits: v }))}
          />
          <ToggleRow
            title="استبعاد زيارات الفريق والموظفين"
            desc="عدم احتساب تصفحك أنت والموظفين ضمن إحصائيات زوار المتجر"
            value={form.excludeStaff}
            onChange={(v) => setForm((f) => ({ ...f, excludeStaff: v }))}
          />
          <ToggleRow
            title="إخفاء عناوين IP للزوار (Anonymize IP)"
            desc="تعزيز خصوصية العملاء والتوافق مع معايير الأمان العالمية"
            value={form.anonymizeIp}
            onChange={(v) => setForm((f) => ({ ...f, anonymizeIp: v }))}
          />
          <ToggleRow
            title="تقرير أداء ملخص أسبوعي"
            desc="إرسال ملخص بأداء المبيعات والمنتجات الأكثر مبيعاً إلى بريدك الإلكتروني"
            value={form.weeklySummary}
            onChange={(v) => setForm((f) => ({ ...f, weeklySummary: v }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
