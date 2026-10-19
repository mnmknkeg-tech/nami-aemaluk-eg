'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Label, Input } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { Headset, Clock, Star, MessageSquare, Users, ShieldAlert } from 'lucide-react';

interface CrmSettingsTabProps {
  shop: any;
  onSaved: () => void;
}

export default function CrmSettingsTab({ shop, onSaved }: CrmSettingsTabProps) {
  const { toast } = useToast();
  const pd = shop?.pageDesign || {};

  const initial = useMemo(
    () => ({
      autoAssign: Boolean(pd.crmAutoAssign ?? true),
      responseTargetHours: String(pd.crmResponseTargetHours ?? 2),
      escalationHours: String(pd.crmEscalationHours ?? 12),
      satisfactionSurvey: Boolean(pd.crmSatisfactionSurvey ?? true),
      autoCloseDays: String(pd.crmAutoCloseDays ?? 3),
      awayAutoReply: Boolean(pd.crmAwayAutoReply ?? true),
      awayMessage: String(
        pd.crmAwayMessage ||
          'أهلاً بك! نشكرك على تواصلك. نحن خارج أوقات العمل حاليًا وسنعاود الرد عليك فور بدء ورديتنا التالية.'
      ),
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
          detail: { sectionId: 'crm_settings', count: isChanged ? 1 : 0 },
        })
      );
    } catch {}
  }, [form, initial]);

  const saveCrmSettings = useCallback(async () => {
    setSaving(true);
    try {
      const current = formRef.current;
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pageDesign: {
            ...pd,
            crmAutoAssign: current.autoAssign,
            crmResponseTargetHours: Number(current.responseTargetHours) || 2,
            crmEscalationHours: Number(current.escalationHours) || 12,
            crmSatisfactionSurvey: current.satisfactionSurvey,
            crmAutoCloseDays: Number(current.autoCloseDays) || 3,
            crmAwayAutoReply: current.awayAutoReply,
            crmAwayMessage: current.awayMessage.trim(),
          },
        }),
      });

      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات خدمة العملاء بنجاح' });
      onSaved();
      return true;
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ إعدادات خدمة العملاء',
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
          detail: { sectionId: 'crm_settings', handler: saveCrmSettings },
        })
      );
    } catch {}
  }, [saveCrmSettings]);

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
        <h2 className="text-xl font-black text-slate-900">إعدادات خدمة العملاء والمحادثات (CRM)</h2>
        <p className="text-slate-500 text-xs mt-1">
          إدارة أوقات الاستجابة، التوزيع التلقائي للتذاكر، والردود التلقائية خارج أوقات العمل
        </p>
      </div>

      {/* سرعة الاستجابة واتفاقية الخدمة SLA */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} className="text-[#0284C7]" />
            اتفاقية سرعة الرد والتصعيد (SLA)
          </CardTitle>
          <CardDescription className="text-xs">
            حدد الحد الأقصى المقبول لرد فريقك على استفسارات وشكاوى العملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="توزيع المحادثات تلقائيًا على موظفي الخدمة"
            desc="إسناد التذكرة أو المحادثة الجديدة آلياً إلى الموظف المتاح الأقل ضغطاً"
            value={form.autoAssign}
            onChange={(v) => setForm((f) => ({ ...f, autoAssign: v }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="targetHours" className="text-xs font-bold text-slate-700">
                وقت الاستجابة الأول المستهدف (بالساعات)
              </Label>
              <div className="relative">
                <Input
                  id="targetHours"
                  type="number"
                  min="1"
                  max="48"
                  value={form.responseTargetHours}
                  onChange={(e) => setForm((f) => ({ ...f, responseTargetHours: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ساعة
                </span>
              </div>
              <p className="text-[10px] text-slate-400">الحد الأقصى للرد المبدئي على العميل</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="escalationHours" className="text-xs font-bold text-slate-700">
                وقت تصعيد الشكوى المعلقة (بالساعات)
              </Label>
              <div className="relative">
                <Input
                  id="escalationHours"
                  type="number"
                  min="2"
                  max="96"
                  value={form.escalationHours}
                  onChange={(e) => setForm((f) => ({ ...f, escalationHours: e.target.value }))}
                  className="rounded-xl text-center text-xs font-black"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ساعة
                </span>
              </div>
              <p className="text-[10px] text-slate-400">تنبيه المشرف والمدير عند تجاوز هذه المدة</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الرد التلقائي ورضا العملاء */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare size={18} className="text-[#0284C7]" />
            الردود التلقائية واستبيان الرضا
          </CardTitle>
          <CardDescription className="text-xs">
            تحسين تجربة العميل أثناء الانتظار وقياس مدى رضاه بعد حل المشكلة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            title="إرسال استبيان تقييم الرضا بعد حل التذكرة"
            desc="إرسال طلب تقييم (نجوم وملاحظات) تلقائيًا للعميل عند إغلاق التذكرة بنجاح"
            value={form.satisfactionSurvey}
            onChange={(v) => setForm((f) => ({ ...f, satisfactionSurvey: v }))}
          />

          <ToggleRow
            title="تفعيل الرد التلقائي خارج أوقات العمل"
            desc="إرسال رسالة فورية للعميل تطمئنه بأن رسالته وصلت وسيتم الرد في أقرب وقت"
            value={form.awayAutoReply}
            onChange={(v) => setForm((f) => ({ ...f, awayAutoReply: v }))}
          />

          {form.awayAutoReply && (
            <div className="pt-1">
              <Label htmlFor="awayMsg" className="text-xs font-bold text-slate-700 block mb-1">
                نص رسالة الرد التلقائي
              </Label>
              <textarea
                id="awayMsg"
                rows={3}
                value={form.awayMessage}
                onChange={(e) => setForm((f) => ({ ...f, awayMessage: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <Label className="font-bold text-sm text-slate-900">إغلاق التذاكر غير النشطة تلقائيًا</Label>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                إغلاق التذكرة إذا لم يرد العميل بعد فترة معينة
              </div>
            </div>
            <div className="relative w-36">
              <Input
                type="number"
                min="0"
                max="30"
                value={form.autoCloseDays}
                onChange={(e) => setForm((f) => ({ ...f, autoCloseDays: e.target.value }))}
                className="rounded-xl text-center text-xs font-bold"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                أيام
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
