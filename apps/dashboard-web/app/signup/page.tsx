'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronLeft,
  Search,
  Home,
  ArrowRight,
  Sparkles,
  Store,
  Mail,
  Lock,
  Phone,
  Loader2,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  LayoutDashboard,
  SkipForward,
  Building2,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, apiRequest } from '@/lib/auth';
import { AuthSkeleton } from '@/components/ui/Skeleton';
import { BUSINESS_ACTIVITIES, groupAccentColors, ActivityWithGroup } from '@/lib/activities';
import {
  BOOKING_ACTIVITIES,
  MODULE_DEFINITIONS,
  isLocalOnly,
  resolveDependencies,
  toggleModule,
  withoutLocalOnly,
  type ModuleId,
} from '@/lib/moduleConfig';
import {
  getQuestionsForActivity,
  modulesFromAnswers,
  specialtiesFromAnswers,
  dashboardEnabledFeatures,
  getBaseModules,
  type ActivityQuestion,
} from '@/lib/activityQuestions';
import { ShopLocationPicker, type ResolvedShopLocation } from '@/components/ShopLocationPicker';
import './signup.css';

const MotionDiv = motion.div as any;

// أيقونة خاصة بكل نشاط
const ACTIVITY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  grocery: '🛒',
  fashion: '👗',
  homeTextiles: '🧵',
  fabricStore: '🧶',
  curtainsBlinds: '🪟',
  sofasUpholstery: '🛋️',
  mattressesBedding: '🛏️',
  furniture: '🪑',
  homeGoods: '🏺',
  goldJewelry: '💍',
  silverAccessories: '📿',
  watchesGifts: '⌚',
  realEstate: '🏠',
  lands: '🌍',
  contractors: '🏗️',
  building_supplies: '🧱',
  carShowroom: '🚗',
  auto_services: '🔧',
  auto_parts: '⚙️',
  agri_supplies: '🌾',
  nurseries_landscaping: '🌱',
  livestock: '🐄',
  fisheries: '🐟',
  energy: '⚡',
  serviceCompanies: '🏢',
  individualTechnicians: '🛠️',
  workshops: '🏭',
  electronics: '📱',
  health: '💊',
  bookings: '📅',
  factories: '🏭',
  tradeCompanies: '📦',
  tourismTravel: '✈️',
  professionalServices: '💼',
  homeServices: '🧹',
  other: '🏷️',
};

type Step = 'account' | 'activity' | 'questions' | 'modules' | 'data';

const ACTIVITIES: ActivityWithGroup[] = BUSINESS_ACTIVITIES;

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '';
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('account');
  const [activityId, setActivityId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [skipped, setSkipped] = useState(false);
  /** الأقسام اللي التاجر اختارها يدويًا في خطوة «الأقسام» (زراير toggle). */
  const [manualModules, setManualModules] = useState<ModuleId[]>([]);
  /** true بعد ما التاجر يوصل خطوة «الأقسام» (أو يتخطى الأسئلة) — ساعتها اختياره اليدوي هو المصدر. */
  const [manualTouched, setManualTouched] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shopName: '',
    phone: '',
    email: '',
    password: '',
    governorate: '',
    city: '',
    shopPhone: '',
    addressDetailed: '',
    shopDescription: '',
    openingHours: '',
  });
  /** Shop coordinates picked on the map — sent with the shop payload. */
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationResolved = (loc: ResolvedShopLocation) => {
    setShopCoords({ lat: loc.lat, lng: loc.lng });
    setFormData((p) => ({
      ...p,
      governorate: loc.governorate || p.governorate,
      city: loc.city || p.city,
      addressDetailed: loc.street || p.addressDetailed,
    }));
  };

  const selectedActivity = useMemo(() => ACTIVITIES.find((a) => a.id === activityId), [activityId]);

  const getActivityLabel = (a?: ActivityWithGroup) => a?.title || a?.id || '';

  const filteredActivities = useMemo(() => {
    if (!activitySearch.trim()) return ACTIVITIES;
    const q = activitySearch.toLowerCase().trim();
    return ACTIVITIES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.specialties && a.specialties.some((k: string) => k.toLowerCase().includes(q)))
    );
  }, [activitySearch]);

  const groupedActivities = useMemo(() => {
    const map: Record<string, ActivityWithGroup[]> = {};
    for (const a of filteredActivities) {
      const g = a.groupId || 'other';
      if (!map[g]) map[g] = [];
      map[g].push(a);
    }
    return map;
  }, [filteredActivities]);

  const groupIds = useMemo(() => Object.keys(groupedActivities), [groupedActivities]);

  const questions: ActivityQuestion[] = useMemo(() => {
    if (!selectedActivity) return [];
    return getQuestionsForActivity(
      selectedActivity.id,
      BOOKING_ACTIVITIES.has(selectedActivity.id)
    );
  }, [selectedActivity]);

  const answeredCount = questions.filter((q) => (answers[q.id] || []).length > 0).length;

  /** الأقسام المستنتجة من إجابات التاجر (على أساس الأساسيات) — بتتحسب لحظيًا. */
  const answerModules = useMemo(() => {
    if (!selectedActivity) return [] as ModuleId[];
    const base = getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id));
    return resolveDependencies(modulesFromAnswers(base, questions, answers));
  }, [selectedActivity, questions, answers]);

  const finalModules = useMemo(() => {
    if (!selectedActivity) return [] as ModuleId[];
    const base = getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id));
    if (manualTouched) return resolveDependencies([...base, ...manualModules]);
    return answerModules;
  }, [selectedActivity, manualTouched, manualModules, answerModules]);

  const applyActivity = (a: ActivityWithGroup) => {
    setActivityId(a.id);
    setAnswers({});
    setSkipped(false);
    setManualModules([]);
    setManualTouched(false);
    setError('');
  };

  const toggleAnswer = (q: ActivityQuestion, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[q.id] || [];
      if (q.multi) {
        return {
          ...prev,
          [q.id]: current.includes(optionId)
            ? current.filter((x) => x !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [q.id]: current.includes(optionId) ? [] : [optionId] };
    });
  };

  const submitSignup = async () => {
    if (!selectedActivity) {
      setError('اختر نشاطك أولاً');
      setStep('activity');
      return;
    }
    if (!formData.shopName || !formData.email || !formData.password || !formData.phone) {
      setError('يرجى ملء الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1) إنشاء حساب التاجر عبر البروكسي الداخلي
      const signupRes = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': 'dashboard',
        },
        body: JSON.stringify({
          name: formData.shopName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: 'merchant',
        }),
      });

      const signupData = await signupRes.json().catch(() => null);
      if (!signupRes.ok) {
        throw new Error(signupData?.message || 'فشل إنشاء الحساب، تأكد من البيانات');
      }

      const accessToken =
        signupData?.data?.accessToken ||
        signupData?.data?.token?.accessToken ||
        signupData?.accessToken ||
        signupData?.token?.accessToken ||
        '';

      // 2) تجهيز بيانات الأقسام والتخصصات
      const resolvedModules = Array.from(finalModules);
      const chosenSpecialties = specialtiesFromAnswers(questions, answers);
      const activitySpecialties = selectedActivity.specialties || [];
      const finalSpecialties = Array.from(new Set([...chosenSpecialties, ...activitySpecialties]));

      const shopPayload = {
        name: formData.shopName,
        phone: formData.shopPhone || formData.phone,
        governorate: formData.governorate,
        city: formData.city,
        addressDetailed: formData.addressDetailed,
        shopDescription: formData.shopDescription,
        openingHours: formData.openingHours,
        latitude: shopCoords?.lat,
        longitude: shopCoords?.lng,
        locationSource: shopCoords ? 'map' : undefined,
        mapLabel: shopCoords ? 'موقع المتجر على الخريطة' : undefined,
        activityId: selectedActivity.id,
        activity: selectedActivity.title,
        enabledModules: resolvedModules,
        specialties: finalSpecialties,
        layoutConfig: {
          enabledFeatures: dashboardEnabledFeatures(resolvedModules),
          onboarding: { skipped, answers },
        },
        moduleFeatures: MODULE_DEFINITIONS.filter((m) => resolvedModules.includes(m.id)).map(
          (m) => ({
            moduleId: m.id,
            features: m.features.map((f) => ({
              id: f.id,
              label: f.label,
              enabled: f.defaultEnabled !== false,
            })),
          })
        ),
      };

      // 3) إنشاء المتجر
      const shopRes = await fetch('/api/v1/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': 'dashboard',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(shopPayload),
      });

      if (!shopRes.ok) {
        const shopErr = await shopRes.json().catch(() => null);
        console.error('Shop creation error:', shopErr);
      }

      // 4) تسجيل الدخول التلقائي في نفس الأصل (dashboard-web) لتعيين الكوكيز
      try {
        await login(formData.email, formData.password);
      } catch (logErr) {
        console.warn('Auto-login notice:', logErr);
      }

      // 5) الانتقال مباشرة للوحة التحكم!
      window.location.href = returnTo || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
      setLoading(false);
    }
  };

  const goNext = () => {
    setError('');
    if (step === 'account') {
      if (!formData.shopName.trim() || !formData.phone.trim()) {
        setError('اكمل اسم المتجر ورقم الموبايل عشان نكمل');
        return;
      }
      setStep('activity');
      return;
    }
    if (step === 'activity') {
      if (!selectedActivity) {
        setError('اختر نشاطك أولاً');
        return;
      }
      setStep('questions');
      return;
    }
    if (step === 'questions') {
      // المطلوب: بعد الأسئلة الانتقال مباشرة إلى ملء البيانات (data)
      setStep('data');
      return;
    }
    if (step === 'modules') {
      setStep('data');
      return;
    }
    if (step === 'data') {
      submitSignup();
      return;
    }
  };

  const openManualCustomization = () => {
    setManualModules(Array.from(answerModules));
    setManualTouched(true);
    setStep('modules');
  };

  const goBack = () => {
    setError('');
    if (step === 'activity') setStep('account');
    else if (step === 'questions') setStep('activity');
    else if (step === 'modules') setStep('questions');
    else if (step === 'data') {
      if (manualTouched) setStep('modules');
      else setStep('questions');
    }
  };

  const skipToManual = () => {
    setSkipped(true);
    setAnswers({});
    setManualModules(
      getBaseModules(selectedActivity!.id, BOOKING_ACTIVITIES.has(selectedActivity!.id))
    );
    setManualTouched(true);
    setError('');
    setStep('modules');
  };

  const goHome = () => router.push('/');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const ActivityCard = ({ activity }: { activity: ActivityWithGroup }) => {
    const active = activityId === activity.id;
    const group = activity.groupId || 'other';
    const gradient = groupAccentColors[group] || groupAccentColors.other;
    const icon = activity.icon || ACTIVITY_ICONS[activity.id];
    return (
      <button
        type="button"
        onClick={() => applyActivity(activity)}
        className={`relative text-right p-4 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${active ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-100 bg-white hover:border-slate-300'}`}
      >
        {active && (
          <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#00E5FF] flex items-center justify-center">
            <Check className="w-4 h-4 text-black" strokeWidth={3} />
          </span>
        )}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${active ? 'bg-white/10' : 'bg-slate-50 border border-slate-100'}`}
        >
          {icon || (
            <span
              className={`bg-gradient-to-br ${gradient} bg-clip-text text-transparent font-black text-xl`}
            >
              {getActivityLabel(activity).charAt(0)}
            </span>
          )}
        </div>
        <div className="font-black text-sm mb-1">{getActivityLabel(activity)}</div>
        <p
          className={`text-[11px] font-bold leading-4 line-clamp-2 ${active ? 'text-white/60' : 'text-slate-400'}`}
        >
          {activity.description}
        </p>
      </button>
    );
  };

  const renderAccountStep = () => (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="signup-card p-8"
      >
        <div className="w-14 h-14 rounded-2xl signup-btn-primary flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-[#00E5FF]" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1">أهلاً بيك 👋</h2>
        <p className="text-slate-400 font-bold text-sm mb-7">
          عرفنا بمتجرك في 30 ثانية، وبعدها نظبط لوحتك على نشاطك بالظبط
        </p>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Store className="w-4 h-4 text-[#00E5FF]" /> اسم المتجر / المحل{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData((p) => ({ ...p, shopName: e.target.value }))}
              placeholder=""
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-right text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Phone className="w-4 h-4 text-[#00E5FF]" /> رقم الموبايل{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              dir="ltr"
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="01xxxxxxxxx"
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              هنستخدم الرقم للتواصل معاك وتفعيل حسابك — مفيش رسائل مزعجة
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderActivityStep = () => (
    <div className="space-y-5">
      <div className="relative max-w-md mx-auto">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={activitySearch}
          onChange={(e) => setActivitySearch(e.target.value)}
          placeholder="دور على نشاطك... (مطعم، سوبر ماركت، عيادة)"
          className="w-full pr-11 pl-4 py-3.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-bold outline-none focus:border-[#00E5FF] transition-colors text-sm shadow-sm"
        />
      </div>

      {groupIds.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 font-bold">لا توجد أنشطة مطابقة لبحثك.</p>
        </div>
      ) : (
        groupIds.map((groupId) => {
          const activities = groupedActivities[groupId];
          const expanded =
            expandedGroups.has(groupId) || activitySearch.length > 0 || activityId !== '';
          const groupTitle = activities[0]?.groupTitle || groupId;
          const visible = expanded ? activities : activities.slice(0, 4);
          return (
            <div key={groupId} className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-br ${groupAccentColors[groupId] || groupAccentColors.other} text-white flex items-center justify-center text-sm font-black`}
                  >
                    {activities[0]?.icon || groupTitle.charAt(0)}
                  </div>
                  <span className="font-black text-sm md:text-base text-slate-900">
                    {groupTitle}
                  </span>
                  <span className="text-[11px] font-black text-slate-300">
                    ({activities.length})
                  </span>
                </div>
                {!activitySearch && activities.length > 4 && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupId)}
                    className="text-xs font-black text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {expanded ? 'عرض أقل' : `عرض كل ${activities.length}`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {visible.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // Arabic labels for the live dashboard preview
  const MODULE_PREVIEW: Record<string, { label: string; icon: string }> = {
    core: { label: 'لوحة التحكم', icon: '📊' },
    sales: { label: 'المبيعات والطلبات', icon: '🛒' },
    pos: { label: 'الكاشير', icon: '🧾' },
    inventory: { label: 'المخزون', icon: '📦' },
    bookings: { label: 'الحجوزات', icon: '📅' },
    website: { label: 'متجر أونلاين', icon: '🌐' },
    marketing: { label: 'التسويق', icon: '📣' },
    customers: { label: 'العملاء', icon: '🤝' },
    crm: { label: 'العملاء', icon: '🤝' },
  };

  const previewModules = useMemo(() => {
    const base = selectedActivity
      ? getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id))
      : [];
    const baseSet = new Set(base.map((m) => String(m)));
    const keep = (m: ModuleId) => !isLocalOnly(m);
    return {
      base: base.filter((m) => m !== 'core' && keep(m)),
      added: finalModules.filter((m) => !baseSet.has(String(m)) && m !== 'core' && keep(m)),
    };
  }, [selectedActivity, finalModules]);

  const previewModuleCount = previewModules.base.length + previewModules.added.length;

  /** Live dashboard preview */
  const LivePreview = ({ sticky = true, hint }: { sticky?: boolean; hint?: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900 rounded-[2rem] p-5 text-white ${sticky ? 'sticky bottom-24' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          معاينة لوحتك
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={previewModuleCount}
            initial={{ scale: 1.25, color: '#00E5FF' }}
            animate={{ scale: 1, color: 'rgba(255,255,255,0.4)' }}
            className="text-[10px] font-black"
          >
            {previewModuleCount} تطبيق مفعّل
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {previewModules.base.map((m) => {
          const meta = MODULE_PREVIEW[String(m)];
          return (
            <span
              key={String(m)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/80"
            >
              <span>{meta?.icon || '📦'}</span> {meta?.label || String(m)}
            </span>
          );
        })}
        <AnimatePresence>
          {previewModules.added.map((m) => {
            const meta = MODULE_PREVIEW[String(m)];
            return (
              <motion.span
                key={String(m)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[11px] font-black text-[#00E5FF]"
              >
                <span>{meta?.icon || '✨'}</span> {meta?.label || String(m)}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="text-[10px] font-bold text-white/30 mt-3">
        {hint ||
          'الأزرار السماوية هي اللي فتحناها من إجاباتك — والباقي كله متاح في «الترقية» من لوحتك في أي وقت'}
      </p>
    </motion.div>
  );

  const renderQuestionsStep = () => {
    if (!selectedActivity) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black mb-3">
            <span>{selectedActivity.icon || ACTIVITY_ICONS[selectedActivity.id] || '🏷️'}</span>
            {getActivityLabel(selectedActivity)}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1.5">
            سؤالين سريعين ونظبطلك كل حاجة
          </h2>
          <p className="text-slate-400 font-bold text-xs md:text-sm">
            بناءً على إجاباتك هنفتح الأزرار اللي محتاجها فعلاً — والباقي كل هيتلاقي في الترقية لما
            تحتاجه
          </p>
        </div>

        {questions.map((q, idx) => {
          const selected = answers[q.id] || [];
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="signup-card p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-black text-slate-900 text-sm">{q.question}</h3>
                {selected.length > 0 && (
                  <span className="mr-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    تم ✓
                  </span>
                )}
              </div>
              {q.hint && <p className="text-[11px] font-bold text-slate-400 mb-3">{q.hint}</p>}
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const active = selected.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleAnswer(q, opt.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                        active
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {active && <Check className="w-3.5 h-3.5 text-[#00E5FF]" strokeWidth={3} />}
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Live dashboard preview */}
        <LivePreview />

        {/* Option to customize manually OR skip */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={openManualCustomization}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-[#00E5FF]/60 text-slate-800 hover:bg-[#00E5FF]/10 text-xs font-black transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#00E5FF]" />
            أو اختار الأقسام يدوياً ⚙️
          </button>

          <button
            type="button"
            onClick={skipToManual}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 text-xs font-black transition-all"
          >
            <SkipForward className="w-4 h-4" />
            تخطي الأسئلة للأقسام الأساسية بس
          </button>
        </div>
        <p className="text-center text-[10px] font-bold text-slate-400 mt-2">
          أسئلة {answeredCount} من {questions.length} مُجابة · مش إجباري تجاوب على كله
        </p>
      </div>
    );
  };

  /** زراير الأقسام في خطوة «الأقسام» — toggle مع حل الاعتماديات تلقائيًا. */
  const toggleManualModule = (id: ModuleId) => {
    setManualModules((prev) => toggleModule(prev, id).next);
  };

  const renderModulesStep = () => {
    if (!selectedActivity) return null;
    const BASE = getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id));
    const baseSet = new Set<string>(BASE.map(String));
    const options = withoutLocalOnly(MODULE_DEFINITIONS.filter((m) => m.optional));
    const isActive = (id: ModuleId) => manualModules.map(String).includes(String(id));
    const activeCount = options.filter((m) => isActive(m.id)).length;
    const resetToBase = () => {
      setSkipped(true);
      setAnswers({});
      setManualModules(BASE);
      setManualTouched(true);
      setError('');
    };
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="signup-card p-5 md:p-8 text-center">
          <h2 className="text-xl font-black text-slate-900 mb-1">اختار الأقسام اللي تناسبك</h2>
          <p className="text-slate-400 font-bold text-xs mb-6">
            {skipped
              ? 'تخطيت الأسئلة — فعّل بنفسك الأقسام والأزرار اللي محتاجها، والأساسيات متفعّلة لوحدها'
              : 'دي الأقسام اللي اخترناها من إجاباتك — عدّل عليها براحتك قبل ما تكمل'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-right">
            {options.map((m) => {
              const Icon = m.icon;
              const active = isActive(m.id);
              const isBase = baseSet.has(String(m.id));
              return (
                <button
                  key={String(m.id)}
                  type="button"
                  disabled={isBase}
                  aria-pressed={active || isBase}
                  title={isBase ? 'أساسي لنشاطك — مفعّل دائمًا' : undefined}
                  onClick={() => toggleManualModule(m.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                    isBase
                      ? 'border-slate-900/10 bg-slate-50 cursor-default'
                      : active
                        ? 'border-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_8px_24px_-8px_rgba(0,229,255,0.5)]'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${m.color}1A`, color: m.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-sm text-slate-900 truncate">
                      {m.nameAr || m.name}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 truncate">
                      {isBase ? 'أساسي لنشاطك — مفعّل دائمًا' : m.descriptionAr || m.description}
                    </span>
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                      active || isBase
                        ? 'bg-[#00E5FF] border-[#00E5FF] text-white'
                        : 'border-slate-200 text-transparent'
                    }`}
                  >
                    {isBase ? <Lock className="w-3.5 h-3.5" /> : <Check className="w-4 h-4" />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-bold text-slate-300 mt-4">
            {activeCount} قسم اختياري مفعّل · الأساسيات ({BASE.length}) بتتضاف تلقائيًا مع
            الاعتماديات
          </p>
        </div>

        <LivePreview
          sticky={false}
          hint="الأزرار السماوية هي اللي ضفتها بنفسك — أي قسم تقفله بيتشال هو وكل الأزرار اللي بتعتمد عليه"
        />

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={resetToBase}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 text-xs font-black transition-all"
          >
            <SkipForward className="w-4 h-4" />
            صفّر اختياراتي — الأساسيات بس
          </button>
          <p className="text-[10px] font-bold text-slate-300 mt-2">
            {skipped
              ? 'الأساسيات متفعّلة — زوّد عليها اللي يناسبك'
              : 'مش إجباري تعدّل — كمل زي ما هي'}
          </p>
        </div>
      </div>
    );
  };

  const renderDataStep = () => (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] p-8">
        <h2 className="text-xl font-black text-slate-900 mb-1">آخر خطوة — حساب الدخول</h2>
        <p className="text-slate-400 font-bold text-xs mb-6">
          الإيميل وكلمة السر اللي هتدخل بيهم للوحة التحكم
        </p>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Mail className="w-4 h-4 text-[#00E5FF]" /> البريد الإلكتروني{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              dir="ltr"
              autoFocus
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@example.com"
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Lock className="w-4 h-4 text-[#00E5FF]" /> كلمة المرور{' '}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                dir="ltr"
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 pl-12 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shop location — map first, manual fields auto-fill from it */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] p-6 md:p-8">
        <h2 className="text-lg font-black text-slate-900 mb-1">فين متجرك؟ 📍</h2>
        <p className="text-slate-400 font-bold text-xs mb-5">
          حدد مكان متجرك على الخريطة — والمحافظة والمدينة والعنوان هيتملوا تلقائياً، وتقدر تعدّلهم
          بعدها
        </p>
        <ShopLocationPicker onResolve={handleLocationResolved} />
      </div>

      {/* Optional store details */}
      <button
        type="button"
        onClick={() => setShowDetails((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white border border-slate-100 text-right hover:border-slate-200 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-black text-slate-600">
          <Building2 className="w-4 h-4 text-slate-400" />
          بيانات المتجر التفصيلية (اختياري)
        </span>
        <ChevronLeft
          className={`w-4 h-4 text-slate-400 transition-transform ${showDetails ? '-rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                    المحافظة
                  </label>
                  <input
                    value={formData.governorate}
                    onChange={(e) => setFormData((p) => ({ ...p, governorate: e.target.value }))}
                    placeholder="القاهرة"
                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                    المدينة
                  </label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="مدينة نصر"
                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  هاتف المتجر (لو مختلف)
                </label>
                <input
                  value={formData.shopPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, shopPhone: e.target.value }))}
                  placeholder="02xxxxxxxx"
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  مواعيد العمل
                </label>
                <input
                  value={formData.openingHours}
                  onChange={(e) => setFormData((p) => ({ ...p, openingHours: e.target.value }))}
                  placeholder="9 ص - 10 م"
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  العنوان التفصيلي
                </label>
                <textarea
                  value={formData.addressDetailed}
                  onChange={(e) => setFormData((p) => ({ ...p, addressDetailed: e.target.value }))}
                  rows={2}
                  placeholder="شارع ... عمارة ... دور ..."
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  وصف قصير للمتجر
                </label>
                <textarea
                  value={formData.shopDescription}
                  onChange={(e) => setFormData((p) => ({ ...p, shopDescription: e.target.value }))}
                  rows={2}
                  placeholder="نبذة مختصرة عن نشاطك..."
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30 resize-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
          ملخص حسابك
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">الموبايل</div>
            <div className="text-sm font-black" dir="ltr">
              {formData.phone || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">المتجر</div>
            <div className="text-sm font-black">{formData.shopName || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">النشاط</div>
            <div className="text-sm font-black">
              {selectedActivity ? getActivityLabel(selectedActivity) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">لوحة التحكم</div>
            <div className="text-sm font-black text-[#00E5FF]">
              {finalModules.length} تطبيق · {skipped ? 'الأساسيات' : 'على مقاس نشاطك'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const STATES: Step[] = ['account', 'activity', 'questions', 'modules', 'data'];
  const currentStepIndex = STATES.indexOf(step);
  const totalSteps = STATES.length;
  const nextLabel =
    step === 'questions'
      ? 'التالي — استكمال البيانات'
      : step === 'modules'
        ? 'التالي — استكمال البيانات'
        : 'التالي';
  const stepHint = {
    account: 'عرفنا بنفسك — الاسم والمتجر والموبايل',
    activity: 'اختار نشاطك عشان نظبط اللوحة علي مقاسه',
    questions: 'سؤالين سريعين — وإحنا نظبط كل حاجة',
    modules: 'اختار الأقسام والأزرار اللي تناسبك — الباقي علينا',
    data: 'بيانات الدخول ومكان متجرك على الخريطة',
  }[step];

  return (
    <div className="signup-identity" dir="rtl">
      {/* سحب ديكورية عائمة */}
      <span className="cloud cloud-top" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="cloud cloud-side" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      <div className="relative z-10 max-w-[68rem] mx-auto px-4 md:px-6 py-6 md:py-10">
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 backdrop-blur border border-white/80 hover:bg-white text-xs font-black text-slate-700 transition-all shadow-sm"
          >
            <Home size={15} /> الرئيسية
          </button>
          <div className="text-center">
            <span className="update-pill">
              <Sparkles size={13} /> خطوة {currentStepIndex + 1} من {totalSteps}
            </span>
            <div className="text-[11px] font-bold text-slate-500 mt-1">{stepHint}</div>
          </div>
          <div className="w-24" />
        </header>

        {/* خط تقدم الخطوات */}
        <div className="max-w-md mx-auto mb-8">
          <div className="h-2 rounded-full bg-white/80 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full signup-btn-primary transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <MotionDiv
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-w-md mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-black flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'account' && renderAccountStep()}
            {step === 'activity' && renderActivityStep()}
            {step === 'questions' && renderQuestionsStep()}
            {step === 'modules' && renderModulesStep()}
            {step === 'data' && renderDataStep()}
          </div>

          {/* شريط تنقل عائم ثابت أسفل الشاشة */}
          <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
            <div className="max-w-[60rem] mx-auto px-4 md:px-6 pb-4 pt-8 bg-gradient-to-t from-[oklch(.96_.035_220)] via-[oklch(.96_.035_220)]/90 to-transparent">
              <div className="pointer-events-auto flex gap-3 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]">
                {step !== 'account' && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={goBack}
                    className="w-28 shrink-0 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <ChevronLeft size={18} /> رجوع
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={goNext}
                  className="signup-btn-primary flex-1 py-4 rounded-2xl text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : step === 'data' ? (
                    <>
                      إنشاء الحساب والدخول للوحة{' '}
                      <CheckCircle2 size={18} className="text-[#00E5FF]" />
                    </>
                  ) : (
                    <>
                      {nextLabel} <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
      <div className="h-28" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthSkeleton withSplit />}>
      <SignupContent />
    </Suspense>
  );
}
