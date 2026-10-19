'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Lock, Shield, CheckCircle2, Eye, EyeOff, X, Check, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input, Switch } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';

interface SecurityTabProps {
  shop: any;
  onSaved: () => void;
}

const passwordRules = [
  { label: '8 أحرف على الأقل', test: (pw: string) => pw.length >= 8 },
  { label: 'حرف كبير (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'حرف صغير (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'رقم (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'رمز خاص (!@#$...)', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  for (const rule of passwordRules) {
    if (rule.test(pw)) score++;
  }
  if (pw.length >= 12) score++;
  const levels = [
    { label: 'ضعيفة جداً', color: 'bg-red-500' },
    { label: 'ضعيفة', color: 'bg-red-400' },
    { label: 'متوسطة', color: 'bg-amber-400' },
    { label: 'جيدة', color: 'bg-blue-400' },
    { label: 'قوية', color: 'bg-green-500' },
    { label: 'قوية جداً', color: 'bg-green-600' },
  ];
  const idx = Math.min(score, 5);
  return { score: idx, label: levels[idx].label, color: levels[idx].color };
}

export default function SecurityTab({ shop, onSaved }: SecurityTabProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const allRulesPassed = useMemo(() => passwordRules.every((r) => r.test(newPassword)), [newPassword]);
  const passwordsMatch = useMemo(() => newPassword === confirmPassword && newPassword.length > 0, [newPassword, confirmPassword]);
  const canSubmit = useMemo(() => Boolean(currentPassword && allRulesPassed && passwordsMatch), [currentPassword, allRulesPassed, passwordsMatch]);

  // Emit changes
  useEffect(() => {
    const count =
      (currentPassword ? 1 : 0) +
      (newPassword ? 1 : 0) +
      (confirmPassword ? 1 : 0) +
      (twoFactorEnabled ? 1 : 0) +
      (showTwoFactorSetup ? 1 : 0) +
      (twoFactorCode ? 1 : 0);
    try {
      window.dispatchEvent(new CustomEvent('merchant-settings-section-changes', { detail: { sectionId: 'security', count } }));
    } catch {}
  }, [currentPassword, newPassword, confirmPassword, twoFactorEnabled, showTwoFactorSetup, twoFactorCode]);

  const saveSecurity = useCallback(async () => {
    const passwordTouched = Boolean(currentPassword || newPassword || confirmPassword);
    const twoFactorTouched = Boolean(showTwoFactorSetup || twoFactorCode || twoFactorEnabled);

    if (!passwordTouched && !twoFactorTouched) return true;
    if (isSaving) return false;
    setIsSaving(true);

    try {
      if (passwordTouched) {
        if (!currentPassword) {
          toast({ title: 'خطأ', description: 'كلمة المرور الحالية مطلوبة', variant: 'destructive' });
          return false;
        }
        if (!newPassword || newPassword.length < 8) {
          toast({ title: 'خطأ', description: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', variant: 'destructive' });
          return false;
        }
        if (newPassword !== confirmPassword) {
          toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
          return false;
        }
        await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        toast({ title: 'تم التحديث', description: 'تم تغيير كلمة المرور بنجاح' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      if (showTwoFactorSetup) {
        if (!twoFactorCode) {
          toast({ title: 'خطأ', description: 'أدخل رمز التحقق', variant: 'destructive' });
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTwoFactorEnabled(true);
        setShowTwoFactorSetup(false);
        setTwoFactorCode('');
        toast({ title: 'تم التفعيل', description: 'تم تفعيل المصادقة الثنائية' });
      }

      onSaved();
      return true;
    } catch (error: any) {
      toast({ title: 'خطأ', description: error?.message || 'فشل حفظ إعدادات الأمان', variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, toast, onSaved, currentPassword, newPassword, confirmPassword, twoFactorEnabled, showTwoFactorSetup, twoFactorCode]);

  // Register save handler
  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'security', handler: saveSecurity },
        }),
      );
    } catch {}
  }, [saveSecurity]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      toast({ title: 'خطأ', description: 'كلمة المرور الحالية مطلوبة', variant: 'destructive' });
      return;
    }
    if (!allRulesPassed) {
      toast({ title: 'خطأ', description: 'كلمة المرور لا تستوفي جميع الشروط', variant: 'destructive' });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast({ title: 'تم التحديث', description: 'تم تغيير كلمة المرور بنجاح' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSaved();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err?.message || 'فشل حفظ إعدادات الأمان', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentPassword, allRulesPassed, passwordsMatch, newPassword, toast, onSaved]);

  const handleTwoFactorToggle = (checked: boolean) => {
    if (checked) {
      setShowTwoFactorSetup(true);
    } else {
      setTwoFactorEnabled(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الأمان</h1>
        <p className="text-slate-500 text-sm mt-1">إدارة كلمة المرور وإعدادات الأمان</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>حدّث كلمة مرورك بانتظام للحفاظ على أمان حسابك</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-semibold">كلمة المرور الحالية</Label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10 pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold">كلمة المرور الجديدة</Label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-blue-600' : strength.score >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold">تأكيد كلمة المرور</Label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pr-10 pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all ${
                    confirmPassword.length > 0 ? (passwordsMatch ? 'border-green-400 focus:border-green-400 focus:ring-green-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100') : ''
                  }`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {confirmPassword.length > 0 && (
                  <div className="absolute left-10 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-400" />}
                  </div>
                )}
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 font-medium">كلمتا المرور غير متطابقتين</p>
              )}
            </div>
          </div>

          {newPassword.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">متطلبات كلمة المرور</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {passwordRules.map((rule, i) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${passed ? 'bg-green-100' : 'bg-slate-200'}`}>
                        {passed ? <Check className="w-3 h-3 text-green-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                      </div>
                      <span className={`text-xs font-medium ${passed ? 'text-green-700' : 'text-slate-500'}`}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              تأكد من حفظ كلمة المرور الجديدة في مكان آمن
            </p>
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={!canSubmit || isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  تغيير كلمة المرور
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>المصادقة الثنائية</CardTitle>
              <CardDescription>طبقة أمان إضافية لحماية حسابك</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-1">
              <span className="font-semibold text-sm">المصادقة الثنائية</span>
              <p className="text-xs text-slate-500">
                {twoFactorEnabled ? 'مفعّلة — حسابك محمي بطبقة إضافية' : 'غير مفعّلة — ننصح بتفعيلها لحماية أفضل'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${twoFactorEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                {twoFactorEnabled ? 'مفعّلة' : 'معطّلة'}
              </span>
              <Switch checked={twoFactorEnabled} onCheckedChange={handleTwoFactorToggle} disabled={isSaving} />
            </div>
          </div>

          {showTwoFactorSetup && (
            <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
              <h4 className="font-bold text-sm">إعداد المصادقة الثنائية</h4>
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="w-32 h-32 flex items-center justify-center bg-white border border-dashed rounded-lg">
                    <span className="text-xs text-slate-400">QR Code</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-slate-500">1. امسح رمز QR بتطبيق المصادقة</p>
                  <p className="text-xs text-slate-500">2. أدخل الرمز المولّد</p>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="max-w-[180px] mt-2 h-11 rounded-xl bg-white"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Security Activity */}
      <Card>
        <CardHeader>
          <CardTitle>النشاط الأمني الأخير</CardTitle>
          <CardDescription>سجل آخر العمليات الأمنية على حسابك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">تسجيل دخول ناجح</p>
                  <span className="text-xs text-slate-400">منذ دقيقتين</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">تسجيل دخول من Chrome</p>
                <p className="text-xs text-slate-400 mt-1">192.168.1.1 — القاهرة، مصر</p>
              </div>
            </div>
            <div className="text-center py-4 text-sm text-slate-400">لا يوجد نشاط آخر</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
