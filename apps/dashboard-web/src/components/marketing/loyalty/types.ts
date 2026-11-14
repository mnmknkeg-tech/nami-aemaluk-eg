/**
 * Shared types + seed constants for the loyalty-programs system.
 * Moved verbatim from the page so extracted tab/modal components can import them
 * without page<->component import cycles.
 */

export type LoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  color: string;
  badge: string;
  benefits: string[];
};

export type LoyaltyReward = {
  id: string;
  title: string;
  pointsCost: number;
  type: 'fixed_discount' | 'percent_discount' | 'free_shipping' | 'free_gift';
  value: number;
  active: boolean;
};

export type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyBalance: number;
  totalSpent?: number;
  ordersCount?: number;
  createdAt?: string;
};

export type LedgerEntry = {
  id: string;
  shopId: string;
  customerId: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  refId?: string;
  staffName?: string;
  createdAt: string;
};

export type LoyaltyCard = {
  id: string;
  title: string;
  description: string;
  totalStamps: number; // e.g. 6 or 10
  rewardType: 'free_product' | 'fixed_discount' | 'percent_discount' | 'points';
  rewardValue: number;
  rewardText: string;
  minSpendPerStamp?: number;
  color: string;
  active: boolean;
  createdAt: string;
};

export type LoyaltySettings = {
  enabled: boolean;
  pointsEnabled: boolean;
  cardsEnabled: boolean;
  pointsPerCurrency: number;
  signupPoints: number;
  minRedeemPoints: number;
  redeemValuePer100: number; // كم جنيه مصري مقابل كل 100 نقطة
  pointsExpiryMonths: number;
  rules: {
    pointsEnabled?: boolean;
    cardsEnabled?: boolean;
    cards?: LoyaltyCard[];
    customerCardStamps?: Record<string, Record<string, number>>; // customerId -> { cardId: stampsCount }
    tiers?: LoyaltyTier[];
    rewards?: LoyaltyReward[];
    earnOnReview?: number;
    earnOnBirthday?: number;
    [key: string]: any;
  };
};

export const DEFAULT_CARDS: LoyaltyCard[] = [
  {
    id: 'card_coffee',
    title: 'كارت المشروبات والأختام',
    description: 'اجمع 6 أختام عند شراء أي مشروب أو وجبة واحصل على مشروبك القادم مجاناً',
    totalStamps: 6,
    rewardType: 'free_product',
    rewardValue: 0,
    rewardText: 'مشروب مجاني من اختيارك',
    minSpendPerStamp: 50,
    color: 'from-amber-600 via-amber-700 to-amber-900',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card_shopping',
    title: 'كارت التسوق الذهبي (10 زيارات)',
    description:
      'اختم الكارت مع كل طلب بقيمة 200 ج.م أو أكثر، واحصل على خصم 100 ج.م فوري عند اكتمال الـ 10 أختام',
    totalStamps: 10,
    rewardType: 'fixed_discount',
    rewardValue: 100,
    rewardText: 'خصم 100 ج.م فوري على الطلب',
    minSpendPerStamp: 200,
    color: 'from-indigo-600 via-slate-800 to-slate-900',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'card_vip',
    title: 'كارت الولاء الماسي (VIP Club)',
    description: 'اجمع 8 أختام مع طلباتك الشهرية واحصل على خصم 20% دائم وشحن مجاني',
    totalStamps: 8,
    rewardType: 'percent_discount',
    rewardValue: 20,
    rewardText: 'خصم 20% على إجمالي الفاتورة',
    minSpendPerStamp: 150,
    color: 'from-emerald-600 via-teal-800 to-slate-900',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'المستوى البرونزي',
    minPoints: 0,
    multiplier: 1.0,
    color: '#b45309',
    badge: '🥉',
    benefits: ['كسب نقطة لكل 1 ج.م', 'استبدال النقاط في أي وقت', 'عروض المواسم'],
  },
  {
    id: 'silver',
    name: 'المستوى الفضي',
    minPoints: 500,
    multiplier: 1.25,
    color: '#64748b',
    badge: '🥈',
    benefits: ['مضاعفة النقاط x1.25', 'أولوية تجهيز الطلب', 'خصم خاص في يوم الميلاد'],
  },
  {
    id: 'gold',
    name: 'المستوى الذهبي',
    minPoints: 1500,
    multiplier: 1.5,
    color: '#d97706',
    badge: '🥇',
    benefits: ['مضاعفة النقاط x1.5', 'شحن مجاني للطلبات فوق 500 ج.م', 'دعم فني خاص عبر واتساب'],
  },
  {
    id: 'platinum',
    name: 'مستوى النخبة (VIP)',
    minPoints: 4000,
    multiplier: 2.0,
    color: '#7c3aed',
    badge: '👑',
    benefits: [
      'مضاعفة النقاط x2.0',
      'شحن مجاني دائم',
      'هدايا حصرية مع كل طلب',
      'دعوات لمنتجات قبل الإطلاق',
    ],
  },
];

export const DEFAULT_REWARDS: LoyaltyReward[] = [
  {
    id: 'r1',
    title: 'خصم 25 ج.م على طلبك',
    pointsCost: 250,
    type: 'fixed_discount',
    value: 25,
    active: true,
  },
  {
    id: 'r2',
    title: 'خصم 50 ج.م على طلبك',
    pointsCost: 500,
    type: 'fixed_discount',
    value: 50,
    active: true,
  },
  {
    id: 'r3',
    title: 'شحن مجاني لأي وجهة',
    pointsCost: 350,
    type: 'free_shipping',
    value: 0,
    active: true,
  },
  {
    id: 'r4',
    title: 'خصم 15% على إجمالي السلة',
    pointsCost: 800,
    type: 'percent_discount',
    value: 15,
    active: true,
  },
  {
    id: 'r5',
    title: 'منتج مجاني مع الطلب القادم',
    pointsCost: 1200,
    type: 'free_gift',
    value: 0,
    active: true,
  },
];
