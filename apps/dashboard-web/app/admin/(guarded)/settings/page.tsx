'use client';

import React, { useState } from 'react';
import { Settings, Shield, Globe, Save, RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useToast } from '@/components/settings/ToastProvider';
import { PageHeader, Panel, Field, INPUT_CLASS } from '@/components/admin/ui';
import { cn } from '@/lib/cn';

function SectionHeader({ icon: Icon, title, iconClass }: { icon: any; title: string; iconClass?: string }) {
  return (
    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse">
      <Icon size={20} className={iconClass || 'text-cyan-600'} />
      {title}
    </h3>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [platformName, setPlatformName] = useState('منصة نمّي أعمالك');
  const [defaultLanguage, setDefaultLanguage] = useState('ar-EG');
  const [enable2fa, setEnable2fa] = useState(false);

  const runUpgrade = async (dryRun: boolean) => {
    setUpgradeLoading(true);
    try {
      const res = await apiRequest('/admin/upgrade-dashboard-config', {
        method: 'POST',
        body: JSON.stringify({ dryRun }),
      });
      setUpgradeResult(res);
      toast({ title: dryRun ? 'تم التشغيل التجريبي بنجاح' : 'تم الترقية بنجاح', variant: 'success' });
    } catch (e: any) {
      toast({ title: String(e?.message || 'فشل الترقية'), variant: 'destructive' });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ platformName, defaultLanguage, enable2fa }),
      });
      toast({ title: 'تم حفظ الإعدادات', variant: 'success' });
    } catch (e: any) {
      toast({ title: e?.message || 'فشل الحفظ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={Settings}
        title="الإعدادات"
        subtitle="إعدادات النظام والمنصة"
        tone="slate"
      />

      <div className="grid grid-cols-1 gap-8">
        {/* Upgrade Dashboard Config */}
        <Panel padded className="space-y-8">
          <SectionHeader icon={RefreshCw} title="ترقية إعدادات اللوحات" />
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3 flex-row-reverse">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <div className="text-right">
              <p className="text-amber-800 font-bold text-sm">الترقية آمنة ولا تؤثر على البيانات الحالية.</p>
              <p className="text-amber-700/80 font-bold text-xs mt-1">يُنصح بتشغيل التجربة أولاً قبل التنفيذ الفعلي.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              disabled={upgradeLoading}
              onClick={() => runUpgrade(true)}
              className="flex-1 py-4 bg-slate-100 text-slate-800 rounded-2xl font-black hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Play size={18} />
              تشغيل تجريبي
            </button>
            <button
              disabled={upgradeLoading}
              onClick={() => {
                if (!confirm('هل أنت متأكد من تنفيذ الترقية؟')) return;
                runUpgrade(false);
              }}
              className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={18} />
              تنفيذ الترقية
            </button>
          </div>

          {upgradeResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-right">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">الإجمالي</div>
                  <div className="text-2xl font-black text-slate-900">{Number(upgradeResult?.total ?? 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">تم تحديثه</div>
                  <div className="text-2xl font-black text-slate-900">{Number(upgradeResult?.updated ?? 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">تجريبي</div>
                  <div className="text-2xl font-black text-slate-900">{String(Boolean(upgradeResult?.dryRun))}</div>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Content Settings */}
        <Panel padded className="space-y-8">
          <SectionHeader icon={Globe} title="إعدادات المحتوى" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="اسم المنصة">
              <input
                className={INPUT_CLASS}
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </Field>
            <Field label="اللغة الافتراضية">
              <select
                className={INPUT_CLASS}
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
              >
                <option value="ar-EG">العربية (مصر)</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </Panel>

        {/* Security Settings */}
        <Panel padded className="space-y-8">
          <SectionHeader icon={Shield} title="الأمان" iconClass="text-red-500" />
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-right">
              <p className="text-slate-900 font-bold">تفعيل المصادقة الثنائية (2FA)</p>
              <p className="text-slate-500 text-xs">إضافة طبقة حماية إضافية لحسابات الأدمن</p>
            </div>
            <button
              onClick={() => setEnable2fa(!enable2fa)}
              className={cn(
                'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                enable2fa ? 'bg-cyan-500' : 'bg-slate-300'
              )}
              aria-label="تفعيل 2FA"
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  enable2fa ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </Panel>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-700 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <Save size={22} /> {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}
