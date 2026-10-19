import type { ModuleId } from './moduleConfig';
import { isLocalOnly } from './moduleConfig';

/**
 * Onboarding question system: for each activity the merchant answers a few
 * plain questions, and every answer quietly turns on the right modules of
 * the dashboard. Merchants who skip the wizard get the activity defaults,
 * and can enable everything later from dashboard settings (upgrade path).
 */

export type QuestionOption = {
  id: string;
  label: string;
  desc?: string;
  modules?: ModuleId[];
  specialty?: string;
};

export type ActivityQuestion = {
  id: string;
  question: string;
  hint?: string;
  multi?: boolean;
  options: QuestionOption[];
};

const YES_NO = (modules: ModuleId[], specialty?: string): QuestionOption[] => [
  { id: 'yes', label: 'أيوه', modules, specialty },
  { id: 'no', label: 'لأ' },
];

const HOW_BRANCHES: ActivityQuestion = {
  id: 'branches',
  question: 'كام فرع عندك؟',
  hint: 'هنظبط إدارة الفروع على حجم مشروعك',
  options: [
    { id: 'one', label: 'فرع واحد', specialty: 'فرع واحد' },
    { id: 'few', label: 'من 2 لـ 4 فروع', modules: ['inventory'], specialty: 'متعدد الفروع' },
    {
      id: 'many',
      label: '5 فروع أو أكثر',
      modules: ['inventory', 'hr', 'analytics'],
      specialty: 'سلسلة فروع',
    },
  ],
};

const HR_QUESTION: ActivityQuestion = {
  id: 'employees',
  question: 'هتدير موظفين وورديات؟',
  hint: 'حضور وانصراف، رواتب، إجازات',
  options: YES_NO(['hr']),
};

const SUBSCRIPTION_QUESTION: ActivityQuestion = {
  id: 'subscriptions',
  question: 'بتقدّم اشتراكات شهرية أو عضويات دورية؟',
  hint: 'مثل اشتراكات الجيم والنوادي، باقات التدريب، أو العضويات الشهرية والسنوية',
  options: YES_NO(['subscriptions'], 'اشتراكات وعضويات'),
};

const RESTAURANT_IDS = new Set(['restaurant']);

export const ACTIVITY_QUESTIONS: Record<string, ActivityQuestion[]> = {
  gym: [
    {
      id: 'subscriptions',
      question: 'بتقدّم عضويات واشتراكات دورية (شهرية/سنوية)؟',
      hint: 'إدارة المشتركين، باقات الجيم، التجديدات والتنبيهات',
      options: YES_NO(['subscriptions'], 'اشتراكات وعضويات'),
    },
    {
      id: 'pos',
      question: 'محتاج كاشير للمشروبات والمكملات ونقطة البيع؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'reservations',
      question: 'بتنظّم كلاسات وحصص تدريب بحجز مسبق؟',
      options: YES_NO(['bookings'], 'حجز كلاسات'),
    },
    {
      id: 'inventory',
      question: 'بتبيع مكملات غذائية أو أدوات ومعدات رياضية؟',
      options: YES_NO(['inventory'], 'مكملات ومخزون'),
    },
    {
      id: 'online',
      question: 'عاوز موقع لعرض جداول الحصص والاشتراك أونلاين؟',
      options: YES_NO(['website'], 'موقع أونلاين'),
    },
    HR_QUESTION,
    HOW_BRANCHES,
  ],
  restaurant: [
    {
      id: 'selling_channels',
      question: 'بتقدّم إزاي؟',
      hint: 'اختار كل اللي ينطبق عليك',
      multi: true,
      options: [
        { id: 'dinein', label: 'طاولات صالة', modules: [], specialty: 'صالة' },
        { id: 'delivery', label: 'ديليفري', modules: ['sales'], specialty: 'ديليفري' },
        { id: 'takeaway', label: 'تيك أواي', specialty: 'تيك أواي' },
        { id: 'online', label: 'طلب أونلاين', modules: ['website'], specialty: 'طلب أونلاين' },
      ],
    },
    {
      id: 'pos',
      question: 'محتاج كاشير (نقطة بيع)؟',
      hint: 'فاتورة كاشير سريعة وورديات',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'reservations',
      question: 'بتستقبل حجز طاولات مسبق؟',
      options: YES_NO(['bookings'], 'حجز طاولات'),
    },
    {
      id: 'inventory',
      question: 'بتدير مخزون خامات؟',
      hint: 'متابعة الخامات والمستلزمات',
      options: YES_NO(['inventory'], 'إدارة مخزون'),
    },
    HR_QUESTION,
    HOW_BRANCHES,
  ],
  grocery: [
    {
      id: 'pos',
      question: 'بتبيع كاشير في المحل؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'online',
      question: 'عاوز العملاء يطلبوا أونلاين؟',
      options: YES_NO(['website'], 'بيع أونلاين'),
    },
    {
      id: 'delivery',
      question: 'بتوصّل طلبات للبيوت؟',
      options: YES_NO(['sales'], 'ديليفري'),
    },
    {
      id: 'inventory',
      question: 'عاوز تتابع المخزون والكميات؟',
      options: YES_NO(['inventory'], 'إدارة مخزون'),
    },
    HR_QUESTION,
    HOW_BRANCHES,
  ],
  fashion: [
    {
      id: 'online',
      question: 'عاوز متجر أونلاين تعرض فيه المنتجات؟',
      options: YES_NO(['website'], 'بيع أونلاين'),
    },
    {
      id: 'pos',
      question: 'عندك معرض/محل بكاشير؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'inventory',
      question: 'محتاج تدير مقاسات وألوان ومخزون؟',
      hint: 'الأنواع (variants) والكميات',
      options: YES_NO(['inventory'], 'إدارة مخزون'),
    },
    {
      id: 'marketing',
      question: 'مهتم بعروض وكوبونات وبرنامج ولاء؟',
      options: YES_NO(['marketing'], 'عروض وولاء'),
    },
    HR_QUESTION,
    HOW_BRANCHES,
  ],
  goldJewelry: [
    {
      id: 'pos',
      question: 'بتبيع كاشير في المعرض؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'quotes',
      question: 'بتقدم عروض أسعار لعملاء الذهب والمناسبات؟',
      options: YES_NO(['sales'], 'عروض أسعار'),
    },
    {
      id: 'inventory',
      question: 'عاوز جرد دقيق للقطع والأوزان؟',
      options: YES_NO(['inventory'], 'جرد ومعادن'),
    },
    HOW_BRANCHES,
  ],
  electronics: [
    {
      id: 'online',
      question: 'عاوز تبيع أونلاين؟',
      options: YES_NO(['website'], 'بيع أونلاين'),
    },
    {
      id: 'pos',
      question: 'عندك محل بكاشير؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'inventory',
      question: 'محتاج تتبع السيريالات والضمانات والمخزون؟',
      options: YES_NO(['inventory'], 'ضمانات وسيريالات'),
    },
    {
      id: 'marketing',
      question: 'مهتم بعروض وبرنامج ولاء؟',
      options: YES_NO(['marketing'], 'عروض وولاء'),
    },
    HR_QUESTION,
    HOW_BRANCHES,
  ],
  health: [
    {
      id: 'pos',
      question: 'بتبيع كاشير في الصيدلية/المحل؟',
      options: YES_NO(['pos'], 'كاشير'),
    },
    {
      id: 'inventory',
      question: 'عاوز تتابع تواريخ الصلاحية والمخزون؟',
      options: YES_NO(['inventory'], 'صلاحية ومخزون'),
    },
    {
      id: 'bookings',
      question: 'بتستقبل حجوزات أو استشارات؟',
      options: YES_NO(['bookings'], 'حجوزات'),
    },
    HOW_BRANCHES,
  ],
};

// Activities built around appointments (clinics, salons, offices...)
const BOOKING_QUESTION_SET: ActivityQuestion[] = [
  {
    id: 'booking_types',
    question: 'بتستقبل حجوزات إزاي؟',
    hint: 'اختار كل اللي ينطبق',
    multi: true,
    options: [
      { id: 'appointments', label: 'مواعيد أفراد', specialty: 'مواعيد' },
      { id: 'groups', label: 'مجموعات أو قاعات', specialty: 'قاعات ومجموعات' },
      {
        id: 'online',
        label: 'حجز أونلاين من العملاء',
        modules: ['website'],
        specialty: 'حجز أونلاين',
      },
    ],
  },
  {
    id: 'pos',
    question: 'بتحصّل فودية كاشير؟',
    options: YES_NO(['pos'], 'كاشير'),
  },
  {
    id: 'inventory',
    question: 'بتستخدم مستلزمات ومخزون؟',
    options: YES_NO(['inventory'], 'إدارة مخزون'),
  },
  SUBSCRIPTION_QUESTION,
  HR_QUESTION,
  HOW_BRANCHES,
];

// Generic fallback for activities without a custom set
export const GENERIC_QUESTIONS: ActivityQuestion[] = [
  {
    id: 'online',
    question: 'عاوز تبيع أو تعرض خدماتك أونلاين؟',
    options: YES_NO(['website'], 'بيع أونلاين'),
  },
  {
    id: 'pos',
    question: 'محتاج كاشير (نقطة بيع)؟',
    options: YES_NO(['pos'], 'كاشير'),
  },
  {
    id: 'inventory',
    question: 'بتدير مخزون أو منتجات؟',
    options: YES_NO(['inventory'], 'إدارة مخزون'),
  },
  SUBSCRIPTION_QUESTION,
  {
    id: 'quotes',
    question: 'بتقدم عروض أسعار للعملاء والمؤسسات؟',
    options: YES_NO(['sales'], 'عروض أسعار'),
  },
  HR_QUESTION,
  HOW_BRANCHES,
];

export function getQuestionsForActivity(
  activityId: string,
  isBookingActivity: boolean
): ActivityQuestion[] {
  const raw =
    ACTIVITY_QUESTIONS[activityId] ??
    (isBookingActivity ? BOOKING_QUESTION_SET : undefined) ??
    GENERIC_QUESTIONS;
  // Local-only modules (finance / accounting / HR / analytics / AI) are never
  // released to merchants, so a question must never promise a section that stays
  // hidden: strip those options in every environment. HR_QUESTION then becomes
  // useless (its only "yes" granted hr), so it disappears on its own.
  return raw
    .map((q) => ({
      ...q,
      options: q.options.map((opt) => ({
        ...opt,
        modules: (opt.modules || []).filter((m) => !isLocalOnly(m)),
      })),
    }))
    .filter((q) => {
      if (q.id === 'employees') {
        return q.options.some((o) => (o.modules || []).length > 0);
      }
      return q.options.length > 0;
    });
}

/**
 * The minimal module baseline per activity — what a merchant gets when he
 * skips the wizard ("manual" mode): the simple essentials of his trade.
 * Questions only ADD on top of this; nothing is enabled by default beyond it.
 */
export const ACTIVITY_BASE_MODULES: Record<string, ModuleId[]> = {
  restaurant: ['core', 'sales', 'pos', 'inventory'],
  grocery: ['core', 'sales', 'pos', 'inventory'],
  fashion: ['core', 'sales', 'inventory'],
  goldJewelry: ['core', 'sales', 'pos', 'inventory'],
  electronics: ['core', 'sales', 'pos', 'inventory'],
  health: ['core', 'sales', 'pos', 'inventory'],
  gym: ['core', 'sales', 'subscriptions', 'customers'],
  sportsCenter: ['core', 'sales', 'subscriptions', 'customers'],
};

export function getBaseModules(activityId: string, isBookingActivity: boolean): ModuleId[] {
  const raw = ACTIVITY_BASE_MODULES[activityId] ??
    (isBookingActivity ? ['core', 'sales', 'bookings'] : undefined) ?? ['core', 'sales'];
  // Local-only modules never ship from the wizard, in any environment.
  return raw.filter((m) => !isLocalOnly(m));
}

/** Union of modules selected through answers, on top of activity defaults. */
export function modulesFromAnswers(
  defaults: ModuleId[],
  questions: ActivityQuestion[],
  answers: Record<string, string[]>
): ModuleId[] {
  const set = new Set<ModuleId>(defaults);
  for (const q of questions) {
    for (const optId of answers[q.id] || []) {
      const opt = q.options.find((o) => o.id === optId);
      for (const m of opt?.modules || []) set.add(m);
    }
  }
  // Local-only modules can never be opted into through the wizard.
  for (const m of Array.from(set)) {
    if (isLocalOnly(m)) set.delete(m);
  }
  return Array.from(set);
}

/** Specialties implied by the answers (used for the shop profile). */
export function specialtiesFromAnswers(
  questions: ActivityQuestion[],
  answers: Record<string, string[]>
): string[] {
  const out = new Set<string>();
  for (const q of questions) {
    for (const optId of answers[q.id] || []) {
      const opt = q.options.find((o) => o.id === optId);
      if (opt?.specialty) out.add(opt.specialty);
    }
  }
  return Array.from(out);
}

/**
 * Mapping from onboarding module ids to the dashboard-web sidebar feature
 * gates (layoutConfig.enabledFeatures). These are sent to the backend so the
 * dashboard really shows only what the merchant picked.
 */
const DASHBOARD_FEATURE_MAP: Record<string, string[]> = {
  sales: ['orders'],
  pos: ['posCheckout'],
  inventory: ['products'],
  finance: ['invoice'],
  bookings: ['reservations'],
  subscriptions: ['subscriptionsOverview', 'subscriptionPlans', 'subscriptionRenewals'],
  hr: ['employees'],
  website: ['website'],
  marketing: ['campaigns'],
  crm: ['customers'],
  customers: ['customers'],
  accounting: ['accounts'],
  analytics: ['reports'],
};

export function dashboardEnabledFeatures(moduleIds: ModuleId[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  // Never emit feature gates for local-only modules — the wizard can't sell them.
  const effective = moduleIds.filter((m) => !isLocalOnly(m));
  // Sales always brings basic customer management with it (orders create customers).
  const withCustomers = effective.includes('sales')
    ? Array.from(new Set<ModuleId>([...effective, 'customers']))
    : effective;
  for (const id of withCustomers) {
    const features = DASHBOARD_FEATURE_MAP[id];
    if (!features) continue;
    const key = id === 'customers' ? 'crm' : id;
    out[key] = Array.from(new Set([...(out[key] || []), ...features]));
  }
  return out;
}
