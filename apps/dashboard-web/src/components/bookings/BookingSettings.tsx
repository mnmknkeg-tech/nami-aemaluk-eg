'use client';

import React, { useState } from 'react';
import {
  Globe, ShieldCheck, Bell, CreditCard, Lock, XCircle,
  Check, Save, RefreshCw, AlertCircle,
} from 'lucide-react';

export const SETTINGS_TABS = [
  { id: 'booking-site', label: 'الموقع العام', icon: Globe },
  { id: 'booking-security', label: 'الأمان والصلاحيات', icon: ShieldCheck },
  { id: 'booking-notifications', label: 'إشعارات وتأكيدات', icon: Bell },
  { id: 'booking-payments', label: 'مدفوعات وتأمين', icon: CreditCard },
  { id: 'booking-cancellation', label: 'سياسات الإلغاء', icon: XCircle },
  { id: 'booking-privacy', label: 'الخصوصية', icon: Lock },
] as const;

export type SettingsTabId = typeof SETTINGS_TABS[number]['id'];

export function BookingSettings() {
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>('booking-site');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all text-center ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isActive ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-500'
                }`}
              >
                <Icon size={18} />
              </div>
              <span className="text-[11px] font-bold leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
        {activeSettingsTab === 'booking-site' && <BookingSiteSettings />}
        {activeSettingsTab === 'booking-security' && <BookingSecuritySettings />}
        {activeSettingsTab === 'booking-notifications' && <BookingNotificationsSettings />}
        {activeSettingsTab === 'booking-payments' && <BookingPaymentsSettings />}
        {activeSettingsTab === 'booking-cancellation' && <BookingCancellationSettings />}
        {activeSettingsTab === 'booking-privacy' && <BookingPrivacySettings />}

        {/* Save Bar */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-medium">
            يتم تطبيق التغييرات فور حفظ الإعدادات على جميع الحجوزات والموقع العام.
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            {saved ? <Check size={14} className="text-emerald-400" /> : <Save size={14} />}
            {saved ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base sm:text-lg font-black text-slate-900 mb-1">{title}</h2>
      <p className="text-xs font-medium text-slate-400 leading-5">{desc}</p>
    </div>
  );
}

function ToggleRow({ title, desc, defaultOn }: { title: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0 gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-bold text-slate-800">{title}</div>
        <div className="text-[11px] font-medium text-slate-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => setOn(!on)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-slate-900' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? 'right-0.5' : 'right-5.5'}`} />
      </button>
    </div>
  );
}

function InputRow({ label, placeholder, type, defaultValue }: { label: string; placeholder: string; type?: string; defaultValue?: string }) {
  return (
    <div className="py-3.5 border-b border-slate-50 last:border-0">
      <label className="text-xs sm:text-sm font-bold text-slate-800 block mb-1.5">{label}</label>
      <input
        type={type || 'text'}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
      />
    </div>
  );
}

function BookingSiteSettings() {
  return (
    <div>
      <SectionTitle title="الموقع العام للحجوزات" desc="إعدادات الصفحة العامة التي يراها العملاء عند تصفح المواعيد والحجز أونلاين" />
      <InputRow label="اسم النشاط أو العيادة" placeholder="مثال: عيادة د. محمد للرعاية أو مركز الفندقة الملكي" />
      <InputRow label="رقم التواصل للحجوزات" placeholder="مثال: 010xxxxxxxx" type="tel" />
      <InputRow label="عنوان المقر / الفرع" placeholder="مثال: القاهرة، التجمع الخامس، شارع التسعين" />
      <InputRow label="رابط الحجز المخصص" placeholder="ray.eg/booking/your-store" />
      <ToggleRow title="تفعيل الصفحة العامة للحجز" desc="إتاحة الحجز المباشر للعملاء عبر الرابط العام" defaultOn />
      <ToggleRow title="إظهار أسعار الخدمات" desc="عرض أسعار الكشف والخدمات في الصفحة العامة للعملاء" defaultOn />
      <ToggleRow title="إظهار المواعيد المتاحة فقط" desc="إخفاء المواعيد المحجوزة مسبقًا تلقائيًا" defaultOn />
    </div>
  );
}

function BookingSecuritySettings() {
  return (
    <div>
      <SectionTitle title="الأمان والصلاحيات" desc="إدارة موافقات المواعيد وسياسات قبول الحجوزات والحدود اليومية" />
      <ToggleRow title="تأكيد الحجز يدويًا" desc="يتطلب موافقة المسؤول قبل إرسال تأكيد الموعد النهائي للعميل" defaultOn />
      <ToggleRow title="منع الحجز المكرر" desc="منع نفس العميل من حجز أكثر من موعد في نفس التوقيت" defaultOn />
      <ToggleRow title="التحقق عبر كود SMS" desc="إرسال رمز تحقق مؤقت للعميل قبل تثبيت الحجز" />
      <ToggleRow title="قصر الحجز على العملاء المسجلين" desc="السماح بالحجز للعملاء الذين لديهم حساب مسجل فقط" />
      <ToggleRow title="حد أقصى للحجوزات في اليوم" desc="وضع حد أقصى لعدد المواعيد التي يمكن استقبالها يوميًا" defaultOn />
    </div>
  );
}

function BookingNotificationsSettings() {
  return (
    <div>
      <SectionTitle title="إشعارات وتأكيدات المواعيد" desc="قنوات الإشعارات والتنبيهات الموحدة للعملاء وإدارة المتجر" />
      <ToggleRow title="إشعار تأكيد الحجز للعميل" desc="إرسال رسالة تأكيد موعد فوري بعد الموافقة عليه" defaultOn />
      <ToggleRow title="تذكير آلي قبل الموعد" desc="إرسال تذكير للعميل قبل موعد الحجز بساعتين" defaultOn />
      <ToggleRow title="إشعار إلغاء الموعد" desc="إشعار الإدارة فور قيام العميل بإلغاء حجزه" defaultOn />
      <ToggleRow title="إشعار حجز جديد للإدارة" desc="إشعار فوري عند وصول أي حجز جديد عبر الموقع" defaultOn />
      <ToggleRow title="إشعارات عبر WhatsApp" desc="إرسال تفاصيل الموعد ورابط التأكيد عبر واتساب" defaultOn />
      <ToggleRow title="إشعارات البريد الإلكتروني" desc="إرسال تأكيد وتفاصيل الفاتورة عبر الإيميل" defaultOn />
    </div>
  );
}

function BookingPaymentsSettings() {
  return (
    <div>
      <SectionTitle title="المدفوعات والتأمين" desc="خيارات سداد الحجوزات والعربون المسبق والدفع عند الحضور" />
      <ToggleRow title="تفعيل الدفع الإلكتروني المسبق" desc="السماح للعملاء بالدفع بالبطاقات البنكية وفودافون كاش والمحافظ" defaultOn />
      <ToggleRow title="عربون حجز مسبق" desc="اشتراط دفع جزء من المبلغ لتثبيت الموعد" />
      <InputRow label="نسبة العربون المسبق (%)" placeholder="مثال: 25%" type="number" />
      <ToggleRow title="الدفع عند الحضور (كاش / كاشير)" desc="السماح للعميل باختيار الدفع في مقر النشاط" defaultOn />
      <ToggleRow title="استرداد تلقائي عند الإلغاء المبكر" desc="استرداد المبالغ المدفوعة تلقائيًا وفقًا لسياسة الإلغاء" defaultOn />
    </div>
  );
}

function BookingCancellationSettings() {
  return (
    <div>
      <SectionTitle title="سياسات الإلغاء وإعادة الجدولة" desc="قواعد وضوابط إلغاء وتعديل المواعيد" />
      <ToggleRow title="السماح للعملاء بإلغاء الحجز" desc="تمكين العميل من إلغاء موعده من خلال رابط حجزه" defaultOn />
      <InputRow label="مهلة الإلغاء المجاني قبل الموعد (بالساعات)" placeholder="مثال: 24 ساعة" type="number" defaultValue="24" />
      <ToggleRow title="منع الإلغاء في نفس يوم الموعد" desc="لا يمكن للعميل الإلغاء قبل الموعد بأقل من 6 ساعات" defaultOn />
      <ToggleRow title="إلغاء الحجوزات غير المؤكدة تلقائيًا" desc="إلغاء المواعيد المعلقة إذا لم تؤكد خلال 12 ساعة" defaultOn />
    </div>
  );
}

function BookingPrivacySettings() {
  return (
    <div>
      <SectionTitle title="الخصوصية وسجلات الحجوزات" desc="حماية بيانات العملاء ومدة الاحتفاظ بالسجلات" />
      <ToggleRow title="حفظ سجل المواعيد للمراجعة" desc="أرشفة سجل الحجوزات السابقة لتتبع التاريخ والزيارات" defaultOn />
      <ToggleRow title="طلب موافقة الشروط والخصوصية" desc="عرض إقرار الموافقة على الشروط قبل تأكيد الحجز" defaultOn />
      <InputRow label="مدة الاحتفاظ بالسجلات (بالأشهر)" placeholder="مثال: 24 شهر" type="number" defaultValue="24" />
    </div>
  );
}

