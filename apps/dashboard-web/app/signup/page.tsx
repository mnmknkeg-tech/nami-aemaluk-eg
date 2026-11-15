'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronLeft,
  Home,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { writeMerchantCache } from '@/lib/session-keys';
import { AuthSkeleton } from '@/components/ui/Skeleton';
import { BUSINESS_ACTIVITIES, type ActivityWithGroup } from '@/lib/activities';
import {
  BOOKING_ACTIVITIES,
  MODULE_DEFINITIONS,
  isLocalOnly,
  resolveDependencies,
  toggleModule,
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
import type { ResolvedShopLocation } from '@/components/ShopLocationPicker';
import { toE164, isValidE164, type Step, type SignupFormData } from './_signup/constants';
import AccountStep from './_signup/AccountStep';
import ActivityStep from './_signup/ActivityStep';
import QuestionsStep from './_signup/QuestionsStep';
import ModulesStep from './_signup/ModulesStep';
import DataStep from './_signup/DataStep';
import './signup.css';

const MotionDiv = motion.div as any;

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
  const [formData, setFormData] = useState<SignupFormData>({
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
  /** كود الدولة المختار لرقم الموبايل (و هاتف المتجر) */
  const [dialCode, setDialCode] = useState('+20');

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

  // فحوصات كلمة المرور — نفس سياسة الباك اند بالظبط
  // (8 أحرف+ / حرف كبير / حرف صغير / رقم / رمز خاص)
  const passwordChecks = useMemo(
    () => [
      { ok: formData.password.length >= 8, label: '8 أحرف على الأقل' },
      { ok: /[A-Z]/.test(formData.password), label: 'حرف إنجليزي كبير' },
      { ok: /[a-z]/.test(formData.password), label: 'حرف إنجليزي صغير' },
      { ok: /\d/.test(formData.password), label: 'رقم واحد على الأقل' },
      { ok: /[^A-Za-z0-9]/.test(formData.password), label: 'رمز خاص مثل !@#$' },
    ],
    [formData.password]
  );
  const isPasswordValid = passwordChecks.every((c) => c.ok);

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

    // نطبّق كود الدولة ونحوّل الأرقام لصيغة E.164 (+20XXXXXXXXXX) المطلوبة من الباك اند
    const merchantPhone = toE164(dialCode, formData.phone);
    const finalShopPhone = formData.shopPhone.trim() ? toE164(dialCode, formData.shopPhone) : '';

    if (!isValidE164(merchantPhone)) {
      setError('رقم الموبايل غير صحيح — اختر كود الدولة واكتب رقمك بدون صفر في البداية');
      return;
    }
    if (finalShopPhone && !isValidE164(finalShopPhone)) {
      setError('هاتف المتجر غير صحيح — اكتب الرقم بدون صفر في البداية');
      return;
    }
    if (!isPasswordValid) {
      setError('كلمة المرور ضعيفة — تحتاج 8 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز خاص');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1) إنشاء حساب التاجر عبر البروكسي الداخلي
      //    الباك اند بيشترط: role بحروف كبيرة (MERCHANT) + رقم موبايل بصيغة E.164
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
          phone: merchantPhone,
          role: 'MERCHANT',
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

      const shopCategory = (selectedActivity.category || 'RETAIL').toUpperCase();
      const shopPayload = {
        name: formData.shopName,
        category: shopCategory,
        phone: finalShopPhone || merchantPhone,
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
          enabledModules: resolvedModules,
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
        throw new Error(shopErr?.message || 'فشل إنشاء المتجر، يرجى مراجعة البيانات');
      }

      // 4) تسجيل الدخول التلقائي في نفس الأصل (dashboard-web) لتعيين الكوكيز
      try {
        await login(formData.email, formData.password);
      } catch (logErr) {
        console.warn('Auto-login notice:', logErr);
      }

      // Pre-seed local cache so dashboard renders instantly without initial
      // flash — after login (login wipes stale merchant caches) and stamped
      // with the new owner so it is only ever trusted by this account.
      try {
        writeMerchantCache({
          name: formData.shopName,
          category: shopCategory,
          enabledModules: resolvedModules,
          layoutConfig: {
            enabledModules: resolvedModules,
            enabledFeatures: dashboardEnabledFeatures(resolvedModules),
          },
        });
      } catch {}

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
      if (!isValidE164(toE164(dialCode, formData.phone))) {
        setError('رقم الموبايل غير صحيح — اختر كود الدولة واكتب رقمك بدون صفر في البداية');
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

  /** زراير الأقسام في خطوة «الأقسام» — toggle مع حل الاعتماديات تلقائيًا. */
  const toggleManualModule = (id: ModuleId) => {
    setManualModules((prev) => toggleModule(prev, id).next);
  };

  const resetToBase = () => {
    if (!selectedActivity) return;
    const BASE = getBaseModules(selectedActivity.id, BOOKING_ACTIVITIES.has(selectedActivity.id));
    setSkipped(true);
    setAnswers({});
    setManualModules(BASE);
    setManualTouched(true);
    setError('');
  };

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

            {step === 'account' && (
              <AccountStep
                formData={formData}
                setFormData={setFormData}
                dialCode={dialCode}
                setDialCode={setDialCode}
              />
            )}
            {step === 'activity' && (
              <ActivityStep
                activitySearch={activitySearch}
                onSearchChange={setActivitySearch}
                groupIds={groupIds}
                groupedActivities={groupedActivities}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                activityId={activityId}
                onSelectActivity={applyActivity}
              />
            )}
            {step === 'questions' && (
              <QuestionsStep
                selectedActivity={selectedActivity!}
                questions={questions}
                answers={answers}
                onToggleAnswer={toggleAnswer}
                answeredCount={answeredCount}
                previewBase={previewModules.base}
                previewAdded={previewModules.added}
                onManual={openManualCustomization}
                onSkip={skipToManual}
              />
            )}
            {step === 'modules' && (
              <ModulesStep
                selectedActivity={selectedActivity!}
                manualModules={manualModules}
                onToggleModule={toggleManualModule}
                skipped={skipped}
                previewBase={previewModules.base}
                previewAdded={previewModules.added}
                onResetToBase={resetToBase}
              />
            )}
            {step === 'data' && (
              <DataStep
                formData={formData}
                setFormData={setFormData}
                dialCode={dialCode}
                setDialCode={setDialCode}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                passwordChecks={passwordChecks}
                showDetails={showDetails}
                setShowDetails={setShowDetails}
                onLocationResolved={handleLocationResolved}
                selectedActivity={selectedActivity}
                finalModulesCount={finalModules.length}
                skipped={skipped}
              />
            )}
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
