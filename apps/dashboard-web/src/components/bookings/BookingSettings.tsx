'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Bell,
  CreditCard,
  Lock,
  XCircle,
  Check,
  Save,
  RefreshCw,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  Loader2,
  Timer,
  Stethoscope,
  Layers,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import {
  DEFAULT_AVG_SERVICE_MINUTES,
  DEFAULT_QUEUE_NOTIFY_MINUTES,
  readShopBookingConfig,
  type QueueDoctor,
  type ShopBookingConfig,
} from '@ray-eg/shared/booking';
import { ACTIVITY_META, ACTIVITY_ORDER, type ActivityType } from '@/lib/bookings/ui';

export const SETTINGS_TABS = [
  { id: 'booking-queue', label: 'الحجز بالانتظار والأطباء', icon: Users },
  { id: 'booking-activities', label: 'الأنشطة والفصل', icon: Layers },
  { id: 'booking-site', label: 'الموقع العام', icon: Globe },
  { id: 'booking-security', label: 'الأمان والصلاحيات', icon: ShieldCheck },
  { id: 'booking-notifications', label: 'إشعارات وتأكيدات', icon: Bell },
  { id: 'booking-payments', label: 'مدفوعات وتأمين', icon: CreditCard },
  { id: 'booking-cancellation', label: 'سياسات الإلغاء', icon: XCircle },
  { id: 'booking-privacy', label: 'الخصوصية', icon: Lock },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
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
        {activeSettingsTab === 'booking-queue' && <QueueDoctorsSettings />}
        {activeSettingsTab === 'booking-activities' && <ActivitiesSettings />}
        {activeSettingsTab === 'booking-site' && <BookingSiteSettings />}
        {activeSettingsTab === 'booking-security' && <BookingSecuritySettings />}
        {activeSettingsTab === 'booking-notifications' && <BookingNotificationsSettings />}
        {activeSettingsTab === 'booking-payments' && <BookingPaymentsSettings />}
        {activeSettingsTab === 'booking-cancellation' && <BookingCancellationSettings />}
        {activeSettingsTab === 'booking-privacy' && <BookingPrivacySettings />}

        {/* Save Bar — التاب الجديد فيه زرار حفظه الخاص */}
        {activeSettingsTab !== 'booking-queue' && activeSettingsTab !== 'booking-activities' && (
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
        )}
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

function ToggleRow({
  title,
  desc,
  defaultOn,
}: {
  title: string;
  desc: string;
  defaultOn?: boolean;
}) {
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
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? 'right-0.5' : 'right-5.5'}`}
        />
      </button>
    </div>
  );
}

function InputRow({
  label,
  placeholder,
  type,
  defaultValue,
}: {
  label: string;
  placeholder: string;
  type?: string;
  defaultValue?: string;
}) {
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

/**
 * الحجز بالانتظار (الكوتة) + فريق العمل — الإعدادات الوحيدة المحفوظة فعليًا:
 * بتتخزن في layoutConfig.booking عبر PATCH /shops/me، والموقع المنشور
 * (صفحة الحجز + صفحة التتبع) بيقراها فورًا.
 */
function QueueDoctorsSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({});
  const [queueEnabled, setQueueEnabled] = useState(false);
  const [notifyMinutes, setNotifyMinutes] = useState(String(DEFAULT_QUEUE_NOTIFY_MINUTES));
  const [avgMinutes, setAvgMinutes] = useState(String(DEFAULT_AVG_SERVICE_MINUTES));
  const [doctors, setDoctors] = useState<QueueDoctor[]>([]);
  // الأنشطة المفعّلة — نحافظ عليها لو تاب الأنشطة حفظ قبل كده
  // (هذا التاب بيستبدل كائن booking بالكامل وقت الحفظ)
  const [activityTypes, setActivityTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const shop = await apiRequest<any>('/shops/me');
        if (!alive) return;
        const layout =
          shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? shop.layoutConfig : {};
        setLayoutConfig(layout);
        const cfg = readShopBookingConfig(shop);
        setQueueEnabled(!!cfg.queueEnabled);
        setNotifyMinutes(String(cfg.queueNotifyMinutes ?? DEFAULT_QUEUE_NOTIFY_MINUTES));
        setAvgMinutes(String(cfg.avgServiceMinutes ?? DEFAULT_AVG_SERVICE_MINUTES));
        setDoctors(cfg.doctors ?? []);
        setActivityTypes(cfg.activityTypes ?? []);
      } catch (err: any) {
        if (alive) setLoadError(err?.message || 'تعذر تحميل الإعدادات');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveState('idle');
    setSaveError(null);
    try {
      const cfg: ShopBookingConfig = {
        queueEnabled,
        queueNotifyMinutes: Math.max(
          5,
          Math.floor(Number(notifyMinutes) || DEFAULT_QUEUE_NOTIFY_MINUTES)
        ),
        avgServiceMinutes: Math.max(
          5,
          Math.floor(Number(avgMinutes) || DEFAULT_AVG_SERVICE_MINUTES)
        ),
        doctors: doctors.filter((d) => d.name.trim()),
        ...(activityTypes.length > 0 ? { activityTypes } : {}),
      };
      // نحفظ من غير أطباء لو الكوتة مطفية — بس نحتفظ بالقيم للرجوع لاحقًا
      const updatedLayout = {
        ...layoutConfig,
        booking: cfg,
        commerce: {
          ...((layoutConfig.commerce as Record<string, unknown>) || {}),
          queueEnabled: cfg.queueEnabled,
        },
      };
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({ layoutConfig: updatedLayout }),
      });
      setLayoutConfig(updatedLayout);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      setSaveState('error');
      setSaveError(err?.message || 'تعذر الحفظ — جرّب تاني');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm font-bold text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        بنجيب إعدادات الحجز…
      </div>
    );
  }

  return (
    <div>
      <SectionTitle
        title="الحجز بالانتظار (الكوتة) وفريق العمل"
        desc="بدل المواعيد الثابتة: العميل ياخد رقم في الطابور ويشوف قدامه كام، والتنبيه بيوصله قبل دوره"
      />

      {loadError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-600">
          <AlertCircle size={14} />
          {loadError}
        </div>
      )}

      <ToggleRow2
        title="تفعيل الحجز بالانتظار"
        desc="صفحة الحجز تبقى «احجز دورك الآن» — العميل ياخد رقمه فورًا بدل اختيار ساعة ثابتة"
        on={queueEnabled}
        onChange={setQueueEnabled}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InputRow2
          label="التنبيه قبل الدور بكم دقيقة؟"
          hint="لما يتبقى عليه وقت قليل يظهر تنبيه كبير في صفحة تتبع الحجز مع صوت واهتزاز"
          value={notifyMinutes}
          onChange={setNotifyMinutes}
          suffix="دقيقة"
        />
        <InputRow2
          label="متوسط زمن الخدمة"
          hint="بيتحسب منه الانتظار التقديري: قدامه كام × المتوسط"
          value={avgMinutes}
          onChange={setAvgMinutes}
          suffix="دقيقة"
        />
      </div>

      {/* فريق العمل */}
      <div className="py-3.5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Stethoscope size={15} className="text-cyan-500" />
              فريق العمل / الأطباء
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">
              يظهرون في صفحة الحجز ليختار العميل معين يخدمه (اختياري)
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setDoctors((d) => [...d, { id: `dr_${Date.now()}`, name: '', specialty: '' }])
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
          >
            <Plus size={13} />
            إضافة
          </button>
        </div>
        {doctors.length === 0 ? (
          <p className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3.5 py-3 text-[11px] font-bold text-slate-400">
            مفيش أطباء مضافين — الحجوزات هتدخل الطابور العام من غير تعيين طبيب.
          </p>
        ) : (
          <div className="space-y-2">
            {doctors.map((doc, idx) => (
              <div key={doc.id} className="flex items-center gap-2">
                <input
                  value={doc.name}
                  onChange={(e) =>
                    setDoctors((arr) =>
                      arr.map((d, i) => (i === idx ? { ...d, name: e.target.value } : d))
                    )
                  }
                  placeholder="اسم الطبيب — مثال: د. أحمد سمير"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
                <input
                  value={doc.specialty || ''}
                  onChange={(e) =>
                    setDoctors((arr) =>
                      arr.map((d, i) => (i === idx ? { ...d, specialty: e.target.value } : d))
                    )
                  }
                  placeholder="التخصص"
                  className="w-28 sm:w-36 shrink-0 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setDoctors((arr) => arr.filter((_, i) => i !== idx))}
                  className="w-8 h-8 shrink-0 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"
                  aria-label="حذف الطبيب"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* إزاي العميل بيتابع — شرح مختصر داخل الإعدادات */}
      <div className="rounded-xl bg-cyan-50 border border-cyan-200 px-3.5 py-3 space-y-1.5">
        <p className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
          <Timer size={13} className="text-cyan-500" />
          إزاي العميل بيتابع دوره؟
        </p>
        <ul className="text-[11px] font-semibold text-slate-500 leading-5 list-disc pr-4 space-y-0.5">
          <li>بعد الحجز ياخد رقم الحجز + لينك تتبع — يفتحه في أي وقت من غير تسجيل دخول.</li>
          <li>صفحة التتبع بتتحدث لوحدها كل 30 ثانية: ترتيبه وقدامه كام والحالة.</li>
          <li>لما دورك يقرّب (بالمدة اللي حددتها فوق) يظهر تنبيه كبير + صوت + اهتزاز.</li>
          <li>وأنت كمان من صفحة «طابور اليوم» تقدر تبعتله إشعار واتساب جاهز بضغطة.</li>
        </ul>
      </div>

      {/* Save bar */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="text-xs font-medium">
          {saveState === 'error' ? (
            <span className="text-red-600 flex items-center gap-1.5">
              <AlertCircle size={13} />
              {saveError}
            </span>
          ) : saveState === 'saved' ? (
            <span className="text-emerald-600 flex items-center gap-1.5 font-bold">
              <Check size={13} />
              اتسجلت — شغالة على الموقع فورًا
            </span>
          ) : (
            <span className="text-slate-400">الحفظ بيسجل الإعدادات في بروفايل متجرك مباشرة.</span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveState === 'saved' ? (
            <Check size={14} className="text-emerald-400" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'بنحفظ…' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * تخصيص الأنشطة — فصل الحجوزات حسب نشاط التاجر
 * الأنشطة المفعّلة فقط هي اللي بتظهر في فلاتر الأجندة وفي
 * نموذج إضافة الحجز اليدوي، وكل نشاط ليه لونه وأيقونته.
 * بتتخزن في layoutConfig.booking.activityTypes (بدون migration).
 * ============================================================ */

const ACTIVITY_HINTS: Record<ActivityType, string> = {
  clinic: 'عيادات ومراكز طبية — كشف، متابعة، أسنان',
  hotel: 'فندقة وشقق وإيواء — ليالي وإقامة',
  table: 'مطاعم وكافيهات — حجز طاولات وقاعات',
  consultation: 'استشارات وجلسات — مكالمات ومقابلات',
  general: 'أي حجز عام مش تابع لنشاط محدد',
};

function ActivitiesSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<Record<string, unknown>>({});
  const [enabled, setEnabled] = useState<ActivityType[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const shop = await apiRequest<any>('/shops/me');
        if (!alive) return;
        const layout =
          shop?.layoutConfig && typeof shop.layoutConfig === 'object' ? shop.layoutConfig : {};
        setLayoutConfig(layout);
        const cfg = readShopBookingConfig(shop);
        setEnabled((cfg.activityTypes as ActivityType[]) || [...ACTIVITY_ORDER]);
      } catch (err: any) {
        if (alive) setLoadError(err?.message || 'تعذر تحميل الإعدادات');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleActivity = (t: ActivityType) => {
    setEnabled((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      // مفيش حجز من غير أي نشاط — على الأقل نشاط واحد فاضل شغال
      return next.length > 0 ? next : prev;
    });
    setSaveState('idle');
  };

  const save = async () => {
    setSaving(true);
    setSaveState('idle');
    setSaveError(null);
    try {
      const cfg: ShopBookingConfig = {
        // القيم اللي التاب ده مش مسؤول عنها نقرأها من الحفظ الحالي
        // عشان ما نكسرش أي تخصيص اتعمل في تاب تاني
        ...readShopBookingConfig({ layoutConfig } as any),
        activityTypes: enabled,
      };
      const updatedLayout = {
        ...layoutConfig,
        booking: cfg,
        commerce: {
          ...((layoutConfig.commerce as Record<string, unknown>) || {}),
          queueEnabled: cfg.queueEnabled === true,
        },
      };
      await apiRequest('/shops/me', {
        method: 'PATCH',
        body: JSON.stringify({ layoutConfig: updatedLayout }),
      });
      setLayoutConfig(updatedLayout);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      setSaveState('error');
      setSaveError(err?.message || 'تعذر الحفظ — جرّب تاني');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm font-bold text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        بنجيب تخصيص الأنشطة…
      </div>
    );
  }

  return (
    <div>
      <SectionTitle
        title="الأنشطة والفصل بينها"
        desc="اختار الأنشطة اللي بتشتغل بيها — الحجوزات بتتفصل تلقائيًا حسب النشاط في الأجندة والفلاتر ونموذج إضافة الحجز، وكل نشاط ليه لون وأيقونة"
      />

      {loadError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-600">
          <AlertCircle size={14} />
          {loadError}
        </div>
      )}

      <div className="space-y-2 mb-2">
        {ACTIVITY_ORDER.map((t) => {
          const meta = ACTIVITY_META[t];
          const Icon = meta.icon;
          const on = enabled.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleActivity(t)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-all ${
                on
                  ? 'border-slate-900 bg-slate-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  on ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-800">{meta.label}</div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {ACTIVITY_HINTS[t]}
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  on ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    on ? 'right-0.5' : 'right-5.5'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-medium text-slate-400 mb-4">
        الحجوزات القديمة اللي ناشتغل بأنشطة مغلقة هتفضل موجودة في السجل، بس مش هتظهر كفلتر مستقل
        جديد. مفيش حجز بيتسجل من غير نشاط — لو قفلت الكل هيترجع آخر اختيار.
      </p>

      {saveError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-600">
          <AlertCircle size={14} />
          {saveError}
        </div>
      )}

      <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="text-xs text-slate-400 font-medium">
          بتطبق فورًا على أجندة الحجوزات ونموذج الإضافة اليدوية بعد الحفظ.
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveState === 'saved' ? (
            <Check size={14} className="text-emerald-400" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'بنحفظ…' : saveState === 'saved' ? 'تم الحفظ بنجاح' : 'حفظ الأنشطة'}
        </button>
      </div>
    </div>
  );
}

/** نسخ محلية من ToggleRow/InputRow بتشتغل بحالة مسيطر عليها (عشان الحفظ الحقيقي). */
function ToggleRow2({
  title,
  desc,
  on,
  onChange,
}: {
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50 gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm font-bold text-slate-800">{title}</div>
        <div className="text-[11px] font-medium text-slate-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-slate-900' : 'bg-slate-200'}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? 'right-0.5' : 'right-5.5'}`}
        />
      </button>
    </div>
  );
}

function InputRow2({
  label,
  hint,
  value,
  onChange,
  suffix,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
}) {
  return (
    <div className="py-3.5">
      <label className="text-xs sm:text-sm font-bold text-slate-800 block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 pl-16 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
          {suffix}
        </span>
      </div>
      <p className="text-[10px] font-medium text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function BookingSiteSettings() {
  return (
    <div>
      <SectionTitle
        title="الموقع العام للحجوزات"
        desc="إعدادات الصفحة العامة التي يراها العملاء عند تصفح المواعيد والحجز أونلاين"
      />
      <InputRow
        label="اسم النشاط أو العيادة"
        placeholder="مثال: عيادة د. محمد للرعاية أو مركز الفندقة الملكي"
      />
      <InputRow label="رقم التواصل للحجوزات" placeholder="مثال: 010xxxxxxxx" type="tel" />
      <InputRow
        label="عنوان المقر / الفرع"
        placeholder="مثال: القاهرة، التجمع الخامس، شارع التسعين"
      />
      <InputRow label="رابط الحجز المخصص" placeholder="ray.eg/booking/your-store" />
      <ToggleRow
        title="تفعيل الصفحة العامة للحجز"
        desc="إتاحة الحجز المباشر للعملاء عبر الرابط العام"
        defaultOn
      />
      <ToggleRow
        title="إظهار أسعار الخدمات"
        desc="عرض أسعار الكشف والخدمات في الصفحة العامة للعملاء"
        defaultOn
      />
      <ToggleRow
        title="إظهار المواعيد المتاحة فقط"
        desc="إخفاء المواعيد المحجوزة مسبقًا تلقائيًا"
        defaultOn
      />
    </div>
  );
}

function BookingSecuritySettings() {
  return (
    <div>
      <SectionTitle
        title="الأمان والصلاحيات"
        desc="إدارة موافقات المواعيد وسياسات قبول الحجوزات والحدود اليومية"
      />
      <ToggleRow
        title="تأكيد الحجز يدويًا"
        desc="يتطلب موافقة المسؤول قبل إرسال تأكيد الموعد النهائي للعميل"
        defaultOn
      />
      <ToggleRow
        title="منع الحجز المكرر"
        desc="منع نفس العميل من حجز أكثر من موعد في نفس التوقيت"
        defaultOn
      />
      <ToggleRow title="التحقق عبر كود SMS" desc="إرسال رمز تحقق مؤقت للعميل قبل تثبيت الحجز" />
      <ToggleRow
        title="قصر الحجز على العملاء المسجلين"
        desc="السماح بالحجز للعملاء الذين لديهم حساب مسجل فقط"
      />
      <ToggleRow
        title="حد أقصى للحجوزات في اليوم"
        desc="وضع حد أقصى لعدد المواعيد التي يمكن استقبالها يوميًا"
        defaultOn
      />
    </div>
  );
}

function BookingNotificationsSettings() {
  return (
    <div>
      <SectionTitle
        title="إشعارات وتأكيدات المواعيد"
        desc="قنوات الإشعارات والتنبيهات الموحدة للعملاء وإدارة المتجر"
      />
      <ToggleRow
        title="إشعار تأكيد الحجز للعميل"
        desc="إرسال رسالة تأكيد موعد فوري بعد الموافقة عليه"
        defaultOn
      />
      <ToggleRow
        title="تذكير آلي قبل الموعد"
        desc="إرسال تذكير للعميل قبل موعد الحجز بساعتين"
        defaultOn
      />
      <ToggleRow
        title="إشعار إلغاء الموعد"
        desc="إشعار الإدارة فور قيام العميل بإلغاء حجزه"
        defaultOn
      />
      <ToggleRow
        title="إشعار حجز جديد للإدارة"
        desc="إشعار فوري عند وصول أي حجز جديد عبر الموقع"
        defaultOn
      />
      <ToggleRow
        title="إشعارات عبر WhatsApp"
        desc="إرسال تفاصيل الموعد ورابط التأكيد عبر واتساب"
        defaultOn
      />
      <ToggleRow
        title="إشعارات البريد الإلكتروني"
        desc="إرسال تأكيد وتفاصيل الفاتورة عبر الإيميل"
        defaultOn
      />
    </div>
  );
}

function BookingPaymentsSettings() {
  return (
    <div>
      <SectionTitle
        title="المدفوعات والتأمين"
        desc="خيارات سداد الحجوزات والعربون المسبق والدفع عند الحضور"
      />
      <ToggleRow
        title="تفعيل الدفع الإلكتروني المسبق"
        desc="السماح للعملاء بالدفع بالبطاقات البنكية وفودافون كاش والمحافظ"
        defaultOn
      />
      <ToggleRow title="عربون حجز مسبق" desc="اشتراط دفع جزء من المبلغ لتثبيت الموعد" />
      <InputRow label="نسبة العربون المسبق (%)" placeholder="مثال: 25%" type="number" />
      <ToggleRow
        title="الدفع عند الحضور (كاش / كاشير)"
        desc="السماح للعميل باختيار الدفع في مقر النشاط"
        defaultOn
      />
      <ToggleRow
        title="استرداد تلقائي عند الإلغاء المبكر"
        desc="استرداد المبالغ المدفوعة تلقائيًا وفقًا لسياسة الإلغاء"
        defaultOn
      />
    </div>
  );
}

function BookingCancellationSettings() {
  return (
    <div>
      <SectionTitle
        title="سياسات الإلغاء وإعادة الجدولة"
        desc="قواعد وضوابط إلغاء وتعديل المواعيد"
      />
      <ToggleRow
        title="السماح للعملاء بإلغاء الحجز"
        desc="تمكين العميل من إلغاء موعده من خلال رابط حجزه"
        defaultOn
      />
      <InputRow
        label="مهلة الإلغاء المجاني قبل الموعد (بالساعات)"
        placeholder="مثال: 24 ساعة"
        type="number"
        defaultValue="24"
      />
      <ToggleRow
        title="منع الإلغاء في نفس يوم الموعد"
        desc="لا يمكن للعميل الإلغاء قبل الموعد بأقل من 6 ساعات"
        defaultOn
      />
      <ToggleRow
        title="إلغاء الحجوزات غير المؤكدة تلقائيًا"
        desc="إلغاء المواعيد المعلقة إذا لم تؤكد خلال 12 ساعة"
        defaultOn
      />
    </div>
  );
}

function BookingPrivacySettings() {
  return (
    <div>
      <SectionTitle
        title="الخصوصية وسجلات الحجوزات"
        desc="حماية بيانات العملاء ومدة الاحتفاظ بالسجلات"
      />
      <ToggleRow
        title="حفظ سجل المواعيد للمراجعة"
        desc="أرشفة سجل الحجوزات السابقة لتتبع التاريخ والزيارات"
        defaultOn
      />
      <ToggleRow
        title="طلب موافقة الشروط والخصوصية"
        desc="عرض إقرار الموافقة على الشروط قبل تأكيد الحجز"
        defaultOn
      />
      <InputRow
        label="مدة الاحتفاظ بالسجلات (بالأشهر)"
        placeholder="مثال: 24 شهر"
        type="number"
        defaultValue="24"
      />
    </div>
  );
}
