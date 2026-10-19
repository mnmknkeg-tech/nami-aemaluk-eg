'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { Bell, Volume2, Globe, Mail, MessageSquare, Package, ShoppingCart, Calendar, Star, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';

interface NotificationsTabProps {
  shop: any;
}

const DEFAULT_SOUNDS = [
  { id: 'default', name: 'الافتراضي (Ding)', url: '' },
  { id: 'chime', name: 'رنين ناعم (Chime)', url: '' },
  { id: 'bell', name: 'جرس كاشير (Register)', url: '' },
  { id: 'pop', name: 'فقاعة سريعة (Pop)', url: '' },
  { id: 'none', name: 'بدون صوت (صامت)', url: '' },
];

export default function NotificationsTab({ shop }: NotificationsTabProps) {
  const { toast } = useToast();
  const nc = (shop?.layoutConfig as any)?.notifications || {};
  const serverSoundId = String((shop?.layoutConfig as any)?.notificationSoundId || '').trim() || 'default';

  const [form, setForm] = useState({
    soundId: serverSoundId,
    // قنوات التنبيه
    browserPush: Boolean(nc.browserPush ?? true),
    emailAlerts: Boolean(nc.emailAlerts ?? true),
    alertEmail: String(nc.alertEmail || shop?.email || ''),
    whatsappAlerts: Boolean(nc.whatsappAlerts ?? false),
    whatsappPhone: String(nc.whatsappPhone || shop?.phone || ''),
    // أحداث التنبيه
    notifyNewOrders: Boolean(nc.notifyNewOrders ?? true),
    notifyLowStock: Boolean(nc.notifyLowStock ?? true),
    notifyBookings: Boolean(nc.notifyBookings ?? true),
    notifyReviews: Boolean(nc.notifyReviews ?? false),
    notifyDailyDigest: Boolean(nc.notifyDailyDigest ?? true),
  });

  const baselineRef = useRef(form);
  const [, setSaving] = useState(false);

  useEffect(() => {
    const updated = {
      soundId: String((shop?.layoutConfig as any)?.notificationSoundId || '').trim() || 'default',
      browserPush: Boolean(nc.browserPush ?? true),
      emailAlerts: Boolean(nc.emailAlerts ?? true),
      alertEmail: String(nc.alertEmail || shop?.email || ''),
      whatsappAlerts: Boolean(nc.whatsappAlerts ?? false),
      whatsappPhone: String(nc.whatsappPhone || shop?.phone || ''),
      notifyNewOrders: Boolean(nc.notifyNewOrders ?? true),
      notifyLowStock: Boolean(nc.notifyLowStock ?? true),
      notifyBookings: Boolean(nc.notifyBookings ?? true),
      notifyReviews: Boolean(nc.notifyReviews ?? false),
      notifyDailyDigest: Boolean(nc.notifyDailyDigest ?? true),
    };
    baselineRef.current = updated;
    setForm(updated);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'notifications', count: 0 },
        })
      );
    } catch {}
  }, [shop]);

  // Emit changes count
  useEffect(() => {
    const isChanged = JSON.stringify(form) !== JSON.stringify(baselineRef.current);
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-section-changes', {
          detail: { sectionId: 'notifications', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form]);

  const saveNotifications = useCallback(async () => {
    setSaving(true);
    try {
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          layoutConfig: {
            ...(shop?.layoutConfig || {}),
            notificationSoundId: form.soundId,
            notifications: {
              browserPush: form.browserPush,
              emailAlerts: form.emailAlerts,
              alertEmail: form.alertEmail,
              whatsappAlerts: form.whatsappAlerts,
              whatsappPhone: form.whatsappPhone,
              notifyNewOrders: form.notifyNewOrders,
              notifyLowStock: form.notifyLowStock,
              notifyBookings: form.notifyBookings,
              notifyReviews: form.notifyReviews,
              notifyDailyDigest: form.notifyDailyDigest,
            },
          },
        }),
      });
      toast({ title: 'تم الحفظ', description: 'تم تحديث تفضيلات الإشعارات بنجاح' });
      baselineRef.current = form;
      try {
        window.dispatchEvent(
          new CustomEvent('merchant-settings-section-changes', {
            detail: { sectionId: 'notifications', count: 0 },
          })
        );
      } catch {}
      return true;
    } catch {
      toast({ title: 'خطأ', description: 'فشل حفظ تفضيلات الإشعارات', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [shop?.id, form, shop?.layoutConfig, toast]);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('merchant-settings-register-save-handler', {
          detail: { sectionId: 'notifications', handler: saveNotifications },
        })
      );
    } catch {}
  }, [saveNotifications]);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({ title: 'تم تفعيل التنبيهات', description: 'سيصلك إشعار فوري عند كل طلب جديد' });
        setForm((p) => ({ ...p, browserPush: true }));
      } else {
        toast({ title: 'تم الرفض', description: 'يرجى السماح بالتنبيهات من إعدادات المتصفح', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900">إعدادات وتفضيلات الإشعارات</h2>
        <p className="text-slate-500 text-xs mt-1">
          تحكم في قنوات وأصوات التنبيهات الفورية لمتابعة الطلبات ونشاط المتجر لحظة بلحظة
        </p>
      </div>

      {/* صوت الإشعار */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 size={18} className="text-[#0284C7]" />
            صوت التنبيه الفوري للطلبات
          </CardTitle>
          <CardDescription className="text-xs">
            الصوت الذي يصدره النظام عند استلام طلب جديد أو حجز عبر لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {DEFAULT_SOUNDS.map((s) => {
              const selected = form.soundId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, soundId: s.id }))}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    selected
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white border-transparent shadow-xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-bold'
                  }`}
                >
                  <span className="text-xs block">{s.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* قنوات الإشعار */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe size={18} className="text-[#0284C7]" />
            قنوات وصول التنبيهات
          </CardTitle>
          <CardDescription className="text-xs">
            اختر القنوات التي ترغب في تلقي إشعارات النشاط والمبيعات عليها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* إشعارات المتصفح */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#0284C7] flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">إشعارات المتصفح الفورية (Push Notifications)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">ظهور إشعار منبثق على شاشتك حتى لو كان التاب في الخلفية</p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestBrowserPermission}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                form.browserPush
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {form.browserPush ? 'مفعّلة ✓' : 'تفعيل الإذن'}
            </button>
          </div>

          {/* البريد الإلكتروني */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">رسائل البريد الإلكتروني (Email Alerts)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">إرسال تفاصيل الفاتورة والطلبات الهامة لبريدك</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.emailAlerts}
                onChange={(e) => setForm((p) => ({ ...p, emailAlerts: e.target.checked }))}
                className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
              />
            </div>
            {form.emailAlerts && (
              <div className="pt-2">
                <Label className="text-[11px] font-bold text-slate-600 mb-1 block">بريد استقبال التنبيهات</Label>
                <Input
                  value={form.alertEmail}
                  onChange={(e) => setForm((p) => ({ ...p, alertEmail: e.target.value }))}
                  placeholder="admin@example.com"
                  dir="ltr"
                  className="bg-white rounded-xl text-right text-xs"
                />
              </div>
            )}
          </div>

          {/* إشعارات الواتساب */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">تنبيهات الواتساب (WhatsApp Alerts)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">استلام رسالة واتساب على هاتفك عند كل طلب جديد</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.whatsappAlerts}
                onChange={(e) => setForm((p) => ({ ...p, whatsappAlerts: e.target.checked }))}
                className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
              />
            </div>
            {form.whatsappAlerts && (
              <div className="pt-2">
                <Label className="text-[11px] font-bold text-slate-600 mb-1 block">رقم الواتساب المسجل</Label>
                <Input
                  value={form.whatsappPhone}
                  onChange={(e) => setForm((p) => ({ ...p, whatsappPhone: e.target.value }))}
                  placeholder="010XXXXXXXX"
                  dir="ltr"
                  className="bg-white rounded-xl text-right text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* أحداث التنبيه المحددة */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#0284C7]" />
            أنواع الأحداث والعمليات المنبه عنها
          </CardTitle>
          <CardDescription className="text-xs">
            حدد العمليات التي تريد أن يرسل لك النظام إشعارًا بها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <ShoppingCart size={16} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-800">إشعار عند إنشاء طلب جديد من متجرك أو الكاشير</span>
            </div>
            <input
              type="checkbox"
              checked={form.notifyNewOrders}
              onChange={(e) => setForm((p) => ({ ...p, notifyNewOrders: e.target.checked }))}
              className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <Package size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-800">تنبيه فوري عند وصول منتج للحد الأدنى من المخزون أو نفاده</span>
            </div>
            <input
              type="checkbox"
              checked={form.notifyLowStock}
              onChange={(e) => setForm((p) => ({ ...p, notifyLowStock: e.target.checked }))}
              className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-800">تنبيهات المواعيد وتأكيد أو إلغاء الحجوزات</span>
            </div>
            <input
              type="checkbox"
              checked={form.notifyBookings}
              onChange={(e) => setForm((p) => ({ ...p, notifyBookings: e.target.checked }))}
              className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <Star size={16} className="text-yellow-500" />
              <span className="text-xs font-bold text-slate-800">تنبيه عند كتابة تقييم أو مراجعة جديدة من عميل</span>
            </div>
            <input
              type="checkbox"
              checked={form.notifyReviews}
              onChange={(e) => setForm((p) => ({ ...p, notifyReviews: e.target.checked }))}
              className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
