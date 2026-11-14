'use client';

/**
 * برامج الولاء والمكافآت — إدارة نظام النقاط والمستويات وسجل الحركات
 * متصل مباشرة بـ Go Backend:
 * - GET /shops/:shopId/loyalty/settings
 * - PUT /shops/:shopId/loyalty/settings
 * - GET /shops/:shopId/loyalty/ledger
 * - POST /shops/:shopId/loyalty/adjust
 * - GET /shops/:shopId/customers
 */
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import {
  Sparkles,
  Gift,
  Crown,
  Trophy,
  Coins,
  Award,
  Users,
  Plus,
  Edit,
  Trash2,
  Download,
  X,
  Info,
  Check,
  Loader2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShieldCheck,
  Star,
  Zap,
  ChevronRight,
  Settings2,
  Percent,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowUpDown,
  UserCheck,
  CreditCard,
  Ticket,
  QrCode,
  Flame,
  CheckCircle,
  Share2,
  Eye,
  RotateCcw,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSearchParams } from 'next/navigation';
import {
  InventoryPage,
  InvTableCard,
  InvRow,
  InvRowAction,
  InvStatusPill,
  InvPagination,
  InvLoading,
  InvEmpty,
  type InvTab,
} from '@/components/inventory/InventoryShell';

type LoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  color: string;
  badge: string;
  benefits: string[];
};

type LoyaltyReward = {
  id: string;
  title: string;
  pointsCost: number;
  type: 'fixed_discount' | 'percent_discount' | 'free_shipping' | 'free_gift';
  value: number;
  active: boolean;
};

type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyBalance: number;
  totalSpent?: number;
  ordersCount?: number;
  createdAt?: string;
};

type LedgerEntry = {
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

type LoyaltyCard = {
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

type LoyaltySettings = {
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

const DEFAULT_CARDS: LoyaltyCard[] = [
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

const DEFAULT_TIERS: LoyaltyTier[] = [
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

const DEFAULT_REWARDS: LoyaltyReward[] = [
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

const TAB_IDS = ['overview', 'customers', 'cards', 'ledger', 'rewards', 'settings'];

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) =>
  s
    ? new Date(s).toLocaleString('ar-EG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

function LoyaltyProgramsContent() {
  const searchParams = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get('tab') || '')
    ? searchParams.get('tab')!
    : 'overview';
  const [tab, setTab] = useState(initialTab);

  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Settings State
  const [settings, setSettings] = useState<LoyaltySettings>({
    enabled: true,
    pointsEnabled: true,
    cardsEnabled: true,
    pointsPerCurrency: 1, // 1 point per 1 EGP
    signupPoints: 50,
    minRedeemPoints: 100,
    redeemValuePer100: 10, // 100 points = 10 EGP
    pointsExpiryMonths: 12,
    rules: {
      pointsEnabled: true,
      cardsEnabled: true,
      cards: DEFAULT_CARDS,
      customerCardStamps: {},
      tiers: DEFAULT_TIERS,
      rewards: DEFAULT_REWARDS,
      earnOnReview: 20,
      earnOnBirthday: 100,
    },
  });

  // Data
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 200);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'earn' | 'redeem' | 'manual'>('all');

  // Adjust Points Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustPoints, setAdjustPoints] = useState(50);
  const [adjustReason, setAdjustReason] = useState('مكافأة خاصة للعميل');
  const [adjustStaff, setAdjustStaff] = useState('مدير المتجر');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Loyalty Card Modal (Add / Edit)
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<LoyaltyCard | null>(null);
  const [cardForm, setCardForm] = useState<LoyaltyCard>({
    id: '',
    title: '',
    description: '',
    totalStamps: 6,
    rewardType: 'free_product',
    rewardValue: 0,
    rewardText: 'مشروب مجاني',
    minSpendPerStamp: 50,
    color: 'from-amber-600 via-amber-700 to-amber-900',
    active: true,
    createdAt: new Date().toISOString(),
  });

  // Stamp Modal
  const [stampModalOpen, setStampModalOpen] = useState(false);
  const [selectedCardForStamp, setSelectedCardForStamp] = useState<LoyaltyCard | null>(null);
  const [stampCustomerId, setStampCustomerId] = useState('');
  const [stampSuccessMsg, setStampSuccessMsg] = useState('');

  // Customer Card Preview Modal
  const [previewCardModalOpen, setPreviewCardModalOpen] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState<CustomerItem | null>(null);
  const [previewCard, setPreviewCard] = useState<LoyaltyCard | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Search in Cards tab
  const [cardCustomerSearch, setCardCustomerSearch] = useState('');

  // Add/Edit Reward Modal
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState<LoyaltyReward>({
    id: '',
    title: '',
    pointsCost: 200,
    type: 'fixed_discount',
    value: 20,
    active: true,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load Settings & Initial Data
  const loadShopData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiRequest('/shops/me');
      const sid = me?.id;
      if (!sid) {
        setLoading(false);
        return;
      }
      setShopId(sid);

      // Load Settings
      const setRes = await apiRequest(`/shops/${sid}/loyalty/settings`).catch(() => null);
      if (setRes && setRes.data) {
        const raw = setRes.data;
        const ptsEn =
          raw.rules?.pointsEnabled !== undefined
            ? Boolean(raw.rules.pointsEnabled)
            : Boolean(raw.enabled ?? true);
        const crdEn =
          raw.rules?.cardsEnabled !== undefined ? Boolean(raw.rules.cardsEnabled) : true;
        setSettings({
          enabled: Boolean(raw.enabled ?? true),
          pointsEnabled: ptsEn,
          cardsEnabled: crdEn,
          pointsPerCurrency: Number(raw.pointsPerCurrency || 1),
          signupPoints: Number(raw.signupPoints || 50),
          minRedeemPoints: Number(raw.minRedeemPoints || 100),
          redeemValuePer100: Number(raw.rules?.redeemValuePer100 || 10),
          pointsExpiryMonths: Number(raw.rules?.pointsExpiryMonths || 12),
          rules: {
            pointsEnabled: ptsEn,
            cardsEnabled: crdEn,
            cards:
              Array.isArray(raw.rules?.cards) && raw.rules.cards.length > 0
                ? raw.rules.cards
                : DEFAULT_CARDS,
            customerCardStamps: raw.rules?.customerCardStamps || {},
            tiers:
              Array.isArray(raw.rules?.tiers) && raw.rules.tiers.length > 0
                ? raw.rules.tiers
                : DEFAULT_TIERS,
            rewards:
              Array.isArray(raw.rules?.rewards) && raw.rules.rewards.length > 0
                ? raw.rules.rewards
                : DEFAULT_REWARDS,
            earnOnReview: Number(raw.rules?.earnOnReview || 20),
            earnOnBirthday: Number(raw.rules?.earnOnBirthday || 100),
            ...raw.rules,
          },
        });
      }

      // Load Customers & Ledger
      await refreshData(sid);
    } catch (e) {
      console.error('Failed to load loyalty data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = async (sid: string) => {
    setLoadingData(true);
    try {
      const [custRes, ledgRes] = await Promise.all([
        apiRequest(`/shops/${sid}/customers?limit=100`).catch(() => ({ data: [] })),
        apiRequest(`/shops/${sid}/loyalty/ledger?limit=100`).catch(() => ({ data: [] })),
      ]);

      const custData = Array.isArray(custRes) ? custRes : custRes?.data || [];
      setCustomers(
        custData.map((c: any) => ({
          id: String(c.id),
          name: c.name || 'عميل بدون اسم',
          phone: c.phone || '—',
          email: c.email || '—',
          loyaltyBalance: Number(c.loyaltyBalance || c.loyalty_balance || 0),
          totalSpent: Number(c.totalSpent || 0),
          ordersCount: Number(c.ordersCount || 0),
          createdAt: c.createdAt || c.created_at || '',
        }))
      );

      const ledgData = Array.isArray(ledgRes) ? ledgRes : ledgRes?.data || [];
      setLedger(
        ledgData.map((l: any) => ({
          id: String(l.id),
          shopId: String(l.shopId || l.shop_id || sid),
          customerId: String(l.customerId || l.customer_id),
          delta: Number(l.delta || 0),
          balanceAfter: Number(l.balanceAfter || l.balance_after || 0),
          reason: l.reason || 'تعديل نقاط',
          refId: l.refId || l.ref_id || '',
          staffName: l.staffName || l.staff_name || 'النظام',
          createdAt: l.createdAt || l.created_at || new Date().toISOString(),
        }))
      );
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [loadShopData]);

  // Save Settings to Backend
  const saveSettings = async (newSettings: LoyaltySettings) => {
    if (!shopId) return;
    setSavingSettings(true);
    setSaveMessage('');
    try {
      const payload = {
        enabled: newSettings.enabled,
        pointsPerCurrency: newSettings.pointsPerCurrency,
        signupPoints: newSettings.signupPoints,
        minRedeemPoints: newSettings.minRedeemPoints,
        rules: {
          ...newSettings.rules,
          pointsEnabled: newSettings.pointsEnabled,
          cardsEnabled: newSettings.cardsEnabled,
          cards: newSettings.rules.cards,
          customerCardStamps: newSettings.rules.customerCardStamps,
          redeemValuePer100: newSettings.redeemValuePer100,
          pointsExpiryMonths: newSettings.pointsExpiryMonths,
        },
      };
      await apiRequest(`/shops/${shopId}/loyalty/settings`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSaveMessage('تم حفظ إعدادات الولاء بنجاح');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e: any) {
      setSaveMessage('تعذر حفظ الإعدادات: ' + (e?.message || 'حدث خطأ'));
    } finally {
      setSavingSettings(false);
    }
  };

  // Adjust Customer Points
  const handleAdjustPoints = async () => {
    if (!selectedCustomer || !shopId) return;
    if (adjustPoints <= 0) {
      setAdjustError('قيمة النقاط يجب أن تكون أكبر من 0');
      return;
    }
    setAdjustSubmitting(true);
    setAdjustError('');
    try {
      const delta = adjustType === 'add' ? adjustPoints : -adjustPoints;
      await apiRequest(`/shops/${shopId}/loyalty/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          delta,
          reason: adjustReason || (delta > 0 ? 'مكافأة يدوية' : 'خصم يدوي'),
          staffName: adjustStaff || 'مدير المتجر',
        }),
      });

      // Update in memory & refresh ledger
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, loyaltyBalance: Math.max(0, c.loyaltyBalance + delta) }
            : c
        )
      );
      setAdjustModalOpen(false);
      await refreshData(shopId);
    } catch (e: any) {
      setAdjustError(e?.message || 'فشل تعديل النقاط');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Loyalty Cards Handlers
  const handleSaveCard = async () => {
    if (!cardForm.title.trim()) return;
    const currentCards =
      settings.rules.cards && settings.rules.cards.length > 0
        ? settings.rules.cards
        : DEFAULT_CARDS;
    let updatedCards: LoyaltyCard[];
    if (editingCard) {
      updatedCards = currentCards.map((c) => (c.id === editingCard.id ? { ...cardForm } : c));
    } else {
      updatedCards = [{ ...cardForm, id: 'card_' + Date.now() }, ...currentCards];
    }
    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, cards: updatedCards },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    setCardModalOpen(false);
  };

  const handleDeleteCard = async (cardId: string) => {
    const currentCards =
      settings.rules.cards && settings.rules.cards.length > 0
        ? settings.rules.cards
        : DEFAULT_CARDS;
    const updatedCards = currentCards.filter((c) => c.id !== cardId);
    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, cards: updatedCards },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleToggleCardActive = async (cardId: string) => {
    const currentCards =
      settings.rules.cards && settings.rules.cards.length > 0
        ? settings.rules.cards
        : DEFAULT_CARDS;
    const updatedCards = currentCards.map((c) =>
      c.id === cardId ? { ...c, active: !c.active } : c
    );
    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, cards: updatedCards },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  const handleAddStampToCustomer = async () => {
    if (!selectedCardForStamp || !stampCustomerId) return;
    const currentStamps = { ...(settings.rules.customerCardStamps || {}) };
    const custCard = { ...(currentStamps[stampCustomerId] || {}) };
    const curCount = custCard[selectedCardForStamp.id] || 0;
    const newCount = curCount + 1;
    custCard[selectedCardForStamp.id] = newCount;
    currentStamps[stampCustomerId] = custCard;

    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, customerCardStamps: currentStamps },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    const custObj = customers.find((c) => c.id === stampCustomerId);
    if (newCount >= selectedCardForStamp.totalStamps) {
      setStampSuccessMsg(
        `🎉 مبروك! العميل ${custObj?.name || ''} أكمل الكارت بالكامل (${newCount}/${selectedCardForStamp.totalStamps}) واستحق الهدية: ${selectedCardForStamp.rewardText}`
      );
    } else {
      setStampSuccessMsg(
        `تم منح الختم بنجاح! رصيد العميل الحالي: (${newCount}/${selectedCardForStamp.totalStamps}) أختام.`
      );
    }
    setTimeout(() => {
      setStampModalOpen(false);
      setStampSuccessMsg('');
    }, 2500);
  };

  const handleQuickStamp = async (customerId: string, cardId: string) => {
    const card = cardsList.find((c) => c.id === cardId);
    if (!card) return;
    const currentStamps = { ...(settings.rules.customerCardStamps || {}) };
    const custCard = { ...(currentStamps[customerId] || {}) };
    const curCount = custCard[cardId] || 0;
    const newCount = curCount + 1;
    custCard[cardId] = newCount;
    currentStamps[customerId] = custCard;

    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, customerCardStamps: currentStamps },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    const custObj = customers.find((c) => c.id === customerId);
    if (newCount >= card.totalStamps) {
      setSaveMessage(
        `🎉 مبروك! العميل ${custObj?.name || ''} أكمل كارت ${card.title} (${newCount}/${card.totalStamps}) واستحق الهدية: ${card.rewardText}`
      );
    } else {
      setSaveMessage(
        `تم إضافة ختم للعميل ${custObj?.name || ''} على كارت ${card.title} (${newCount}/${card.totalStamps})`
      );
    }
    setTimeout(() => setSaveMessage(''), 3500);
  };

  const handleQuickDeductStamp = async (customerId: string, cardId: string) => {
    const currentStamps = { ...(settings.rules.customerCardStamps || {}) };
    const custCard = { ...(currentStamps[customerId] || {}) };
    const curCount = custCard[cardId] || 0;
    if (curCount <= 0) return;
    const newCount = curCount - 1;
    custCard[cardId] = newCount;
    currentStamps[customerId] = custCard;

    const updatedSettings = {
      ...settings,
      rules: { ...settings.rules, customerCardStamps: currentStamps },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
    setSaveMessage('تم خصم ختم من الكارت');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleClaimRewardAndReset = async (customerId: string, cardId: string) => {
    const card = cardsList.find((c) => c.id === cardId);
    if (!card) return;
    const currentStamps = { ...(settings.rules.customerCardStamps || {}) };
    const custCard = { ...(currentStamps[customerId] || {}) };
    custCard[cardId] = 0; // Reset stamps for a fresh new cycle
    currentStamps[customerId] = custCard;

    const completedCycles = { ...(settings.rules.customerCompletedCycles || {}) };
    const custCycles = { ...(completedCycles[customerId] || {}) };
    custCycles[cardId] = (custCycles[cardId] || 0) + 1;
    completedCycles[customerId] = custCycles;

    const updatedSettings = {
      ...settings,
      rules: {
        ...settings.rules,
        customerCardStamps: currentStamps,
        customerCompletedCycles: completedCycles,
      },
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    const custObj = customers.find((c) => c.id === customerId);
    setSaveMessage(
      `🎁 تم تسليم المكافأة (${card.rewardText}) للعميل ${custObj?.name || ''}، وتم إعادة فتح الكارت لبدء دورة جديدة!`
    );
    setTimeout(() => setSaveMessage(''), 4500);
  };

  const copyCardLink = (customerId: string, cardId: string) => {
    if (typeof window === 'undefined') return;
    const link = getCustomerCardUrl(shopId, customerId, cardId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).catch(() => {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopiedLink(true);
    setSaveMessage('تم نسخ رابط بطاقة العميل الرقمية بنجاح 📋');
    setTimeout(() => {
      setCopiedLink(false);
      setSaveMessage('');
    }, 3000);
  };

  // Customer tiers helper
  const getCustomerTier = (points: number): LoyaltyTier => {
    const tiers = settings.rules.tiers || DEFAULT_TIERS;
    const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    return sorted.find((t) => points >= t.minPoints) || tiers[0] || DEFAULT_TIERS[0];
  };

  // Aggregated Stats
  const totalPointsInCirculation = useMemo(
    () => customers.reduce((acc, c) => acc + (c.loyaltyBalance || 0), 0),
    [customers]
  );
  const totalPointsRedeemed = useMemo(
    () => ledger.filter((l) => l.delta < 0).reduce((acc, l) => acc + Math.abs(l.delta), 0),
    [ledger]
  );
  const totalPointsEarned = useMemo(
    () => ledger.filter((l) => l.delta > 0).reduce((acc, l) => acc + l.delta, 0),
    [ledger]
  );
  const totalEstimatedValue = (totalPointsInCirculation / 100) * settings.redeemValuePer100;

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.loyaltyBalance - a.loyaltyBalance);
  }, [customers, debouncedSearch]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    let list = ledger;
    if (ledgerFilter === 'earn') list = list.filter((l) => l.delta > 0);
    if (ledgerFilter === 'redeem') list = list.filter((l) => l.delta < 0);
    if (ledgerFilter === 'manual')
      list = list.filter(
        (l) => l.reason.includes('يدوي') || l.reason.includes('مكافأة') || l.reason === 'manual'
      );
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((l) => {
        const cust = customers.find((c) => c.id === l.customerId);
        return (
          (cust && cust.name.toLowerCase().includes(q)) ||
          l.reason.toLowerCase().includes(q) ||
          (l.staffName || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [ledger, ledgerFilter, debouncedSearch, customers]);

  // Export Ledger to CSV
  const exportLedgerCSV = () => {
    const headers = ['التاريخ', 'العميل', 'التغيير', 'الرصيد بعد الحركة', 'السبب', 'المسؤول'];
    const rows = filteredLedger.map((l) => {
      const cust = customers.find((c) => c.id === l.customerId);
      return [
        new Date(l.createdAt).toLocaleDateString('ar-EG'),
        cust ? cust.name : l.customerId,
        l.delta > 0 ? `+${l.delta}` : `${l.delta}`,
        l.balanceAfter,
        l.reason,
        l.staffName || 'النظام',
      ];
    });
    const content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `loyalty-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const cardsList = useMemo(
    () =>
      settings.rules.cards && settings.rules.cards.length > 0
        ? settings.rules.cards
        : DEFAULT_CARDS,
    [settings.rules.cards]
  );

  const tabs: InvTab[] = [
    { id: 'overview', label: 'لوحة البرنامج', count: undefined },
    { id: 'customers', label: 'أرصدة العملاء', count: customers.length },
    { id: 'cards', label: 'كروت الولاء والأختام', count: cardsList.length },
    { id: 'ledger', label: 'سجل العمليات', count: ledger.length },
    { id: 'rewards', label: 'كتالوج المكافآت', count: (settings.rules.rewards || []).length },
    { id: 'settings', label: 'قواعد البرنامج والإعدادات', count: undefined },
  ];

  if (loading) {
    return (
      <InventoryPage title="برامج الولاء والمكافآت" subtitle="نظام الولاء">
        <InvLoading />
      </InventoryPage>
    );
  }

  return (
    <InventoryPage
      title="برامج الولاء والمكافآت"
      subtitle="نظام النقاط والكروت الذكي"
      tabs={tabs}
      activeTab={tab}
      onTabChange={(t) => {
        setTab(t);
        setCurrentPage(1);
      }}
      search={['customers', 'ledger'].includes(tab) ? searchQuery : undefined}
      onSearchChange={['customers', 'ledger'].includes(tab) ? setSearchQuery : undefined}
      searchPlaceholder={
        tab === 'customers' ? 'بحث باسم العميل أو رقم الهاتف...' : 'بحث في السجل...'
      }
      actions={
        <div className="flex items-center gap-2">
          {tab === 'cards' && (
            <>
              <button
                onClick={() => {
                  setCardForm({
                    id: 'card_' + Date.now(),
                    title: '',
                    description: '',
                    totalStamps: 6,
                    rewardType: 'free_product',
                    rewardValue: 0,
                    rewardText: '',
                    minSpendPerStamp: 50,
                    color: 'from-amber-600 via-amber-700 to-amber-900',
                    active: true,
                    createdAt: new Date().toISOString(),
                  });
                  setEditingCard(null);
                  setCardModalOpen(true);
                }}
                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Plus size={14} />
                إضافة كارت ولاء جديد
              </button>
              <button
                onClick={() => {
                  if (cardsList.length > 0) {
                    setSelectedCardForStamp(cardsList[0]);
                    setStampCustomerId(customers[0]?.id || '');
                    setStampSuccessMsg('');
                    setStampModalOpen(true);
                  }
                }}
                className="h-10 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors flex items-center gap-2"
              >
                <Ticket size={14} />
                منح ختم لعميل
              </button>
            </>
          )}
          {tab === 'ledger' && (
            <button
              onClick={exportLedgerCSV}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              تصدير السجل CSV
            </button>
          )}
          {tab === 'rewards' && (
            <button
              onClick={() => {
                setRewardForm({
                  id: 'r_' + Date.now(),
                  title: '',
                  pointsCost: 250,
                  type: 'fixed_discount',
                  value: 25,
                  active: true,
                });
                setRewardModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              إضافة مكافأة جديدة
            </button>
          )}
          <button
            onClick={() => refreshData(shopId)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>
      }
    >
      {/* Alert / Save Message */}
      {saveMessage && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* ─── TAB: OVERVIEW ─── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Dual Systems Control Panel (Points + Loyalty Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System 1: Points System */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <Coins size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">نظام النقاط والمستويات</h3>
                      <p className="text-[11px] text-slate-300">كسب النقاط واستبدالها بخصومات</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      settings.pointsEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {settings.pointsEnabled ? 'مفعل للعملاء' : 'معطل'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يمنح العملاء نقاطاً مع كل طلب شراء حسب إجمالي الفاتورة، ويتيح لهم استبدالها
                  بخصومات أو مكافآت.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-300">
                  معدل الكسب:{' '}
                  <strong className="text-white">{settings.pointsPerCurrency} نقطة / 1 ج.م</strong>
                </span>
                <button
                  onClick={() => {
                    const newPts = !settings.pointsEnabled;
                    const updated = {
                      ...settings,
                      pointsEnabled: newPts,
                      enabled: newPts || settings.cardsEnabled,
                    };
                    setSettings(updated);
                    saveSettings(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    settings.pointsEnabled
                      ? 'bg-red-500/80 hover:bg-red-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <Zap size={13} />
                  {settings.pointsEnabled ? 'إيقاف النقاط' : 'تفعيل النقاط'}
                </button>
              </div>
            </div>

            {/* System 2: Loyalty Cards & Stamps System */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-400/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">نظام كروت الولاء والأختام</h3>
                      <p className="text-[11px] text-slate-300">
                        بطاقات أختام رقمية ومكافآت الزيارات
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      settings.cardsEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {settings.cardsEnabled ? 'مفعل للعملاء' : 'معطل'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  بطاقات ولاء رقمية مخصصة تجمع الأختام مع كل طلب، وعند اكتمال الأختام يحصل العميل
                  على مكافأته تلقائياً.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-300">
                  الكروت النشطة:{' '}
                  <strong className="text-white">
                    {cardsList.filter((c) => c.active).length} كارت
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTab('cards')}
                    className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-1"
                  >
                    إدارة الكروت
                  </button>
                  <button
                    onClick={() => {
                      const newCrd = !settings.cardsEnabled;
                      const updated = {
                        ...settings,
                        cardsEnabled: newCrd,
                        enabled: settings.pointsEnabled || newCrd,
                      };
                      setSettings(updated);
                      saveSettings(updated);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                      settings.cardsEnabled
                        ? 'bg-red-500/80 hover:bg-red-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <Zap size={13} />
                    {settings.cardsEnabled ? 'إيقاف الكروت' : 'تفعيل الكروت'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Coins size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">إجمالي النقاط المتداولة</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  {fmt(totalPointsInCirculation)}{' '}
                  <span className="text-xs text-amber-600 font-bold">نقطة</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  تساوي تقريبًا {fmt(totalEstimatedValue)} ج.م
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">العملاء المشاركون</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  {fmt(customers.length)}{' '}
                  <span className="text-xs text-slate-500 font-bold">عميل</span>
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  {customers.filter((c) => c.loyaltyBalance > 0).length} لديهم رصيد نقاط نشط
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">مجموع النقاط المكتسبة</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  {fmt(totalPointsEarned)}{' '}
                  <span className="text-xs text-blue-600 font-bold">نقطة</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">من الطلبات والتسجيل</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ArrowDownRight size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">النقاط المستبدلة بالخصومات</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  {fmt(totalPointsRedeemed)}{' '}
                  <span className="text-xs text-purple-600 font-bold">نقطة</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">وفرت للعملاء تخفيضات</p>
              </div>
            </div>
          </div>

          {/* Tiers Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">مستويات العملاء والترقيات</h3>
                <p className="text-xs text-slate-500">
                  يتدرج العميل بين المستويات كلما كسب نقاطاً أكثر، ويحصل على مضاعف نقاط ومزايا أعلى.
                </p>
              </div>
              <button
                onClick={() => setTab('settings')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                تخصيص المستويات
                <ChevronRight size={14} className="rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(settings.rules.tiers || DEFAULT_TIERS).map((tier) => {
                const membersCount = customers.filter(
                  (c) => getCustomerTier(c.loyaltyBalance).id === tier.id
                ).length;
                return (
                  <div
                    key={tier.id}
                    className="rounded-2xl border border-slate-200 p-5 relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{tier.badge}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-700">
                        {tier.multiplier}x نقاط
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{tier.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">من {fmt(tier.minPoints)} نقطة</p>

                    <div className="my-3 pt-3 border-t border-slate-200/60">
                      <p className="text-[11px] font-bold text-slate-600 mb-1.5">المزايا:</p>
                      <ul className="space-y-1">
                        {tier.benefits.map((b, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-slate-500 flex items-center gap-1.5"
                          >
                            <Check size={12} className="text-emerald-600 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">العملاء الحاليين:</span>
                      <span className="font-bold text-slate-900">{membersCount} عميل</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Customers & Recent Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900">أعلى العملاء رصيدًا للنقاط</h3>
                </div>
                <button
                  onClick={() => setTab('customers')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  عرض الكل ({customers.length})
                </button>
              </div>

              {customers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  لا يوجد عملاء حتى الآن
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customers
                    .slice()
                    .sort((a, b) => b.loyaltyBalance - a.loyaltyBalance)
                    .slice(0, 5)
                    .map((c, idx) => {
                      const tier = getCustomerTier(c.loyaltyBalance);
                      return (
                        <div key={c.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center text-xs font-black text-slate-400">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{c.name}</p>
                              <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {tier.badge} {tier.name}
                            </span>
                            <span className="text-xs font-black text-amber-600">
                              {fmt(c.loyaltyBalance)} نقطة
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Recent Movements */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-900">آخر حركات وسجل النقاط</h3>
                </div>
                <button
                  onClick={() => setTab('ledger')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  سجل العمليات بالكامل
                </button>
              </div>

              {ledger.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  لم تسجل أي حركة نقاط بعد
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ledger.slice(0, 5).map((l) => {
                    const cust = customers.find((c) => c.id === l.customerId);
                    const isEarn = l.delta > 0;
                    return (
                      <div key={l.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEarn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                          >
                            {isEarn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {cust ? cust.name : 'عميل'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {l.reason} • {d(l.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-black ${isEarn ? 'text-emerald-600' : 'text-red-500'}`}
                        >
                          {isEarn ? `+${fmt(l.delta)}` : fmt(l.delta)} نقطة
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: CUSTOMERS BALANCES ─── */}
      {tab === 'customers' && (
        <div className="space-y-4">
          <InvTableCard
            columns={[
              { label: 'العميل', className: 'col-span-3' },
              { label: 'المستوى الحالي', className: 'col-span-2' },
              { label: 'رصيد النقاط', className: 'col-span-2' },
              { label: 'القيمة التقديرية', className: 'col-span-2' },
              { label: 'مضاعف الكسب', className: 'col-span-1' },
              { label: 'إجراءات', className: 'col-span-2 text-left' },
            ]}
          >
            {paginatedCustomers.length === 0 ? (
              <InvEmpty icon={Users} title="لم يتم العثور على أي عملاء" />
            ) : (
              paginatedCustomers.map((c) => {
                const tier = getCustomerTier(c.loyaltyBalance);
                const estValue = (c.loyaltyBalance / 100) * settings.redeemValuePer100;
                return (
                  <InvRow key={c.id}>
                    <div className="col-span-3">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.phone}</p>
                    </div>

                    <div className="col-span-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        <span>{tier.badge}</span>
                        <span>{tier.name}</span>
                      </span>
                    </div>

                    <div className="col-span-2">
                      {settings.pointsEnabled ? (
                        <>
                          <span className="font-black text-sm text-amber-600">
                            {fmt(c.loyaltyBalance)}
                          </span>
                          <span className="text-[11px] text-slate-400 mr-1">نقطة</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-slate-400">0</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            متوقف
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 font-bold text-xs text-slate-700">
                      {estValue.toFixed(2)} ج.م
                    </div>

                    <div className="col-span-1 font-bold text-xs text-indigo-600">
                      {tier.multiplier}x
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setAdjustType('add');
                          setAdjustPoints(50);
                          setAdjustReason('مكافأة خاصة للعميل');
                          setAdjustError('');
                          setAdjustModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Coins size={13} />
                        تعديل النقاط
                      </button>
                    </div>
                  </InvRow>
                );
              })
            )}
          </InvTableCard>

          {totalPages > 1 && (
            <InvPagination
              page={currentPage}
              totalPages={totalPages}
              onPage={setCurrentPage}
              total={filteredCustomers.length}
              perPage={itemsPerPage}
            />
          )}
        </div>
      )}

      {/* ─── TAB: CARDS (كروت الولاء وبطاقات الأختام الرقمية) ─── */}
      {tab === 'cards' && (
        <div className="space-y-6">
          {/* System Status Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <CreditCard size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    نظام كروت وبطاقات الولاء الرقمية
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      settings.cardsEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {settings.cardsEnabled ? 'النظام مفعل ويعمل للعملاء' : 'النظام متوقف مؤقتًا'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  أصدر بطاقات أختام ذكية لعملائك، كافئهم عند كل زيارة أو طلب، وعزز تكرار الشراء.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const newCrd = !settings.cardsEnabled;
                  const updated = {
                    ...settings,
                    cardsEnabled: newCrd,
                    enabled: settings.pointsEnabled || newCrd,
                  };
                  setSettings(updated);
                  saveSettings(updated);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  settings.cardsEnabled
                    ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Zap size={14} />
                {settings.cardsEnabled ? 'إيقاف نظام الكروت' : 'تفعيل نظام الكروت الآن'}
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardsList.map((card) => {
              const stampsArr = Array.from({ length: card.totalStamps });
              return (
                <div
                  key={card.id}
                  className={`relative rounded-3xl border transition-all overflow-hidden bg-gradient-to-br ${card.color} text-white p-6 shadow-md flex flex-col justify-between min-h-[300px] ${
                    !card.active ? 'opacity-60 grayscale-[40%]' : ''
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white backdrop-blur-sm">
                          {card.totalStamps} أختام للمكافأة
                        </span>
                        <h4 className="text-base font-black text-white mt-2">{card.title}</h4>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0">
                        <Gift size={20} />
                      </div>
                    </div>
                    <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Stamps Visual Grid */}
                  <div className="my-5 p-3.5 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-[11px] font-bold text-white/80 mb-2.5">
                      <span>الأختام المطلوبة:</span>
                      <span className="text-amber-300 font-black">{card.rewardText}</span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {stampsArr.map((_, sIdx) => {
                        const isFinal = sIdx === card.totalStamps - 1;
                        return (
                          <div
                            key={sIdx}
                            className={`aspect-square rounded-xl flex items-center justify-center font-black text-xs border transition-all ${
                              isFinal
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                                : 'bg-white/10 border-white/20 text-white/90'
                            }`}
                            title={isFinal ? 'ختم الهدية والمكافأة الأخيرة' : `ختم رقم ${sIdx + 1}`}
                          >
                            {isFinal ? <Crown size={15} /> : sIdx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedCardForStamp(card);
                          setStampCustomerId(customers[0]?.id || '');
                          setStampSuccessMsg('');
                          setStampModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Ticket size={13} />
                        منح ختم
                      </button>
                      <button
                        onClick={() => {
                          setEditingCard(card);
                          setCardForm({ ...card });
                          setCardModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                        title="تعديل الكارت"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 rounded-xl bg-white/15 hover:bg-red-500/80 text-white transition-colors"
                        title="حذف الكارت"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleCardActive(card.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        card.active
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                          : 'bg-white/10 text-white/60 border-white/20'
                      }`}
                    >
                      {card.active ? 'الكارت نشط ✓' : 'الكارت معطل'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Customer Stamps Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Ticket size={18} className="text-indigo-600" />
                  إدارة كروت وأختام العملاء — تحكم فوري للتاجر
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  اختم للعميل بنقرة واحدة، سلمه المكافأة عند الإكمال، وشاركه رابط بطاقته الرقمية
                  الخاصة
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  value={cardCustomerSearch}
                  onChange={(e) => setCardCustomerSearch(e.target.value)}
                  placeholder="بحث باسم العميل أو الهاتف..."
                  className="w-full h-9 pr-8 pl-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                لا يوجد عملاء بعد لتتبع بطاقات الأختام
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customers
                  .filter((c) => {
                    if (!cardCustomerSearch.trim()) return true;
                    const q = cardCustomerSearch.trim().toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
                  })
                  .map((c) => {
                    const custStamps = settings.rules.customerCardStamps?.[c.id] || {};
                    const completedCycles = settings.rules.customerCompletedCycles?.[c.id] || {};
                    return (
                      <div
                        key={c.id}
                        className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        {/* Customer Info */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 shadow-sm">
                            {c.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{c.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {c.phone} • رصيد نقاط:{' '}
                              <strong className="text-amber-600 font-black">
                                {c.loyaltyBalance}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Customer Cards & Quick Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          {cardsList.map((card) => {
                            const current = custStamps[card.id] || 0;
                            const cycles = completedCycles[card.id] || 0;
                            const completed = current >= card.totalStamps;
                            return (
                              <div
                                key={card.id}
                                className={`p-2.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                                  completed
                                    ? 'bg-amber-50/90 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
                                    : current > 0
                                      ? 'bg-purple-50/50 border-purple-200 text-purple-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="min-w-[130px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs">{card.title}</span>
                                    {completed && (
                                      <Crown size={14} className="text-amber-600 animate-bounce" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-black text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200/80 shadow-2xs">
                                      {current} / {card.totalStamps} ختم
                                    </span>
                                    {cycles > 0 && (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        أكمل {cycles} مرات
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Quick Buttons for Merchant */}
                                <div className="flex items-center gap-1.5">
                                  {completed ? (
                                    <button
                                      onClick={() => handleClaimRewardAndReset(c.id, card.id)}
                                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                                      title="تسليم المكافأة وإعادة فتح الكارت لدورة جديدة"
                                    >
                                      <Gift size={13} />
                                      تسليم الهدية
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickStamp(c.id, card.id)}
                                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                      title="منح ختم سريع للعميل مع هذا الطلب"
                                    >
                                      <Plus size={13} />
                                      ختم
                                    </button>
                                  )}

                                  {current > 0 && (
                                    <button
                                      onClick={() => handleQuickDeductStamp(c.id, card.id)}
                                      className="w-7 h-7 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors"
                                      title="خصم ختم (تراجع)"
                                    >
                                      -
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setPreviewCustomer(c);
                                      setPreviewCard(card);
                                      setPreviewCardModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                                    title="معاينة كارت العميل الرقمي"
                                  >
                                    <Eye size={14} />
                                  </button>

                                  <button
                                    onClick={() => copyCardLink(c.id, card.id)}
                                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-600 transition-colors"
                                    title="نسخ رابط كارت العميل لمشاركته معه"
                                  >
                                    <Share2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: LEDGER ─── */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          {/* Quick filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'كل الحركات' },
              { id: 'earn', label: 'النقاط المكتسبة (+)' },
              { id: 'redeem', label: 'النقاط المستبدلة (-)' },
              { id: 'manual', label: 'تعديل يدوي ومكافآت' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLedgerFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  ledgerFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <InvTableCard
            columns={[
              { label: 'التاريخ والوقت', className: 'col-span-2' },
              { label: 'العميل', className: 'col-span-3' },
              { label: 'حركة النقاط', className: 'col-span-2' },
              { label: 'الرصيد بعدها', className: 'col-span-2' },
              { label: 'السبب والمناسبة', className: 'col-span-2' },
              { label: 'المسؤول', className: 'col-span-1' },
            ]}
          >
            {filteredLedger.length === 0 ? (
              <InvEmpty
                icon={Coins}
                title="لا توجد حركات مسجلة — كل كسب أو استبدال للنقاط سيظهر تلقائياً في هذا السجل المالي"
              />
            ) : (
              filteredLedger.map((l) => {
                const cust = customers.find((c) => c.id === l.customerId);
                const isEarn = l.delta > 0;
                return (
                  <InvRow key={l.id}>
                    <div className="col-span-2 text-[11px] text-slate-500 font-medium">
                      {d(l.createdAt)}
                    </div>

                    <div className="col-span-3">
                      <p className="font-bold text-xs text-slate-900">
                        {cust ? cust.name : 'عميل غير مسجل'}
                      </p>
                      {cust && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-full ${isEarn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {isEarn ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {isEarn ? `+${fmt(l.delta)}` : fmt(l.delta)} نقطة
                      </span>
                    </div>

                    <div className="col-span-2 font-bold text-xs text-slate-700">
                      {fmt(l.balanceAfter)} نقطة
                    </div>

                    <div
                      className="col-span-2 text-xs text-slate-600 font-medium truncate"
                      title={l.reason}
                    >
                      {l.reason}
                    </div>

                    <div className="col-span-1 text-[11px] text-slate-500 font-medium">
                      {l.staffName || 'النظام'}
                    </div>
                  </InvRow>
                );
              })
            )}
          </InvTableCard>
        </div>
      )}

      {/* ─── TAB: REWARDS CATALOG ─── */}
      {tab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">كتالوج مكافآت النقاط</h3>
              <p className="text-xs text-slate-500">
                المكافآت التي يمكن لعملائك استبدال نقاطهم بها أثناء إتمام الطلب أو من حسابهم.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(settings.rules.rewards || DEFAULT_REWARDS).map((reward) => (
              <div
                key={reward.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Gift size={20} />
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${reward.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {reward.active ? 'مفعلة للاستبدال' : 'معطلة'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 mb-1">{reward.title}</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    {reward.type === 'fixed_discount' && `خصم مالي ثابت بقيمة ${reward.value} ج.م`}
                    {reward.type === 'percent_discount' &&
                      `خصم نسبي بقيمة ${reward.value}% على السلة`}
                    {reward.type === 'free_shipping' && `شحن مجاني على عنوان التوصيل`}
                    {reward.type === 'free_gift' && `هدية عينية مجانية مضافة للسلة`}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">تكلفة الاستبدال</span>
                    <span className="text-base font-black text-amber-600">
                      {fmt(reward.pointsCost)} نقطة
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const updated = (settings.rules.rewards || DEFAULT_REWARDS).map((r) =>
                          r.id === reward.id ? { ...r, active: !r.active } : r
                        );
                        const newSettings = {
                          ...settings,
                          rules: { ...settings.rules, rewards: updated },
                        };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {reward.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => {
                        const updated = (settings.rules.rewards || DEFAULT_REWARDS).filter(
                          (r) => r.id !== reward.id
                        );
                        const newSettings = {
                          ...settings,
                          rules: { ...settings.rules, rewards: updated },
                        };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: SETTINGS & TIERS CONFIG ─── */}
      {tab === 'settings' && (
        <div className="max-w-4xl space-y-6">
          {/* Systems Activation & Toggle Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              التحكم في تفعيل وقفل أنظمة الولاء
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle Points */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">نظام النقاط والمستويات</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    كسب النقاط مع المشتريات واستبدالها بخصومات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPts = !settings.pointsEnabled;
                    const updated = {
                      ...settings,
                      pointsEnabled: newPts,
                      enabled: newPts || settings.cardsEnabled,
                    };
                    setSettings(updated);
                    saveSettings(updated);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.pointsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.pointsEnabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Cards */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">
                      نظام كروت الولاء والأختام
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    بطاقات أختام رقمية ومكافآت عند اكتمال الأختام
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newCrd = !settings.cardsEnabled;
                    const updated = {
                      ...settings,
                      cardsEnabled: newCrd,
                      enabled: settings.pointsEnabled || newCrd,
                    };
                    setSettings(updated);
                    saveSettings(updated);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    settings.cardsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.cardsEnabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* General Rules Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Settings2 size={18} className="text-indigo-600" />
              قواعد كسب واستبدال النقاط
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  معدل الكسب الأساسي (نقاط لكل 1 ج.م شراء)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={settings.pointsPerCurrency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pointsPerCurrency: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                    نقطة / 1 ج.م
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  مثال: 1 يعني إن كل 100 ج.م شراء تمنح العميل 100 نقطة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  قيمة استبدال النقاط (كم ج.م مقابل كل 100 نقطة)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={settings.redeemValuePer100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        redeemValuePer100: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                    ج.م / 100 نقطة
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  مثال: 10 يعني كل 100 نقطة تخصم 10 ج.م من الفاتورة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نقاط هدية ترحيبية عند تسجيل حساب جديد
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={settings.signupPoints}
                    onChange={(e) =>
                      setSettings({ ...settings, signupPoints: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                    نقطة
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  تُضاف تلقائياً لرصيد العميل بمجرد إنشاء الحساب.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الحد الأدنى للنقاط المطلوب لبدء الاستبدال
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={settings.minRedeemPoints}
                    onChange={(e) =>
                      setSettings({ ...settings, minRedeemPoints: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                    نقطة
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  يمنع الاستبدال إذا كان رصيد العميل أقل من هذا الرقم.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  صلاحية النقاط (قبل انتهاء صلاحيتها)
                </label>
                <select
                  value={settings.pointsExpiryMonths}
                  onChange={(e) =>
                    setSettings({ ...settings, pointsExpiryMonths: parseInt(e.target.value) || 12 })
                  }
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>لا تنتهي صلاحية النقاط مطلقاً</option>
                  <option value={6}>تنتهي بعد 6 أشهر من تاريخ الكسب</option>
                  <option value={12}>تنتهي بعد 12 شهرًا (سنة كاملة)</option>
                  <option value={24}>تنتهي بعد سنتين</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نقاط مكافأة عند تقييم منتج
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={settings.rules.earnOnReview || 20}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rules: { ...settings.rules, earnOnReview: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                    نقطة
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tiers Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                تخصيص مستويات العضوية (Tiers)
              </h3>
            </div>

            <div className="space-y-4">
              {(settings.rules.tiers || DEFAULT_TIERS).map((tier, idx) => (
                <div
                  key={tier.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        اسم المستوى
                      </label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setSettings({
                            ...settings,
                            rules: { ...settings.rules, tiers: updated },
                          });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        الحد الأدنى للنقاط
                      </label>
                      <input
                        type="number"
                        value={tier.minPoints}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = {
                            ...updated[idx],
                            minPoints: parseInt(e.target.value) || 0,
                          };
                          setSettings({
                            ...settings,
                            rules: { ...settings.rules, tiers: updated },
                          });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        مضاعف النقاط (Multiplier)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        value={tier.multiplier}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = {
                            ...updated[idx],
                            multiplier: parseFloat(e.target.value) || 1,
                          };
                          setSettings({
                            ...settings,
                            rules: { ...settings.rules, tiers: updated },
                          });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        الأيقونة / الشارة
                      </label>
                      <input
                        type="text"
                        value={tier.badge}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], badge: e.target.value };
                          setSettings({
                            ...settings,
                            rules: { ...settings.rules, tiers: updated },
                          });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={() => saveSettings(settings)}
              disabled={savingSettings}
              className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {savingSettings ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              حفظ جميع إعدادات الولاء
            </button>
          </div>
        </div>
      )}

      {/* ─── ADJUST POINTS MODAL ─── */}
      {adjustModalOpen && selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          onClick={() => setAdjustModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900">تعديل رصيد نقاط العميل</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCustomer.name} ({selectedCustomer.phone})
                </p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">الرصيد الحالي للعميل:</span>
              <span className="text-sm font-black text-amber-900">
                {fmt(selectedCustomer.loyaltyBalance)} نقطة
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع العملية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${adjustType === 'add' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    + إضافة نقاط مكافأة
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('deduct')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${adjustType === 'deduct' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    - خصم نقاط (استبدال/تعديل)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد النقاط</label>
                <input
                  type="number"
                  min="1"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب التعديل</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: تعويض عن تأخير طلب، مكافأة مسابقة..."
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموظف أو المسؤول
                </label>
                <input
                  type="text"
                  value={adjustStaff}
                  onChange={(e) => setAdjustStaff(e.target.value)}
                  placeholder="مدير المتجر"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAdjustPoints}
                disabled={adjustSubmitting}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {adjustSubmitting && <Loader2 size={14} className="animate-spin" />}
                تأكيد وتسجيل الحركة في السجل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT REWARD MODAL ─── */}
      {rewardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          onClick={() => setRewardModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">
                إضافة مكافأة جديدة لكتالوج الولاء
              </h3>
              <button
                onClick={() => setRewardModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان المكافأة
                </label>
                <input
                  type="text"
                  value={rewardForm.title}
                  onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                  placeholder="مثال: خصم 50 ج.م على طلبك القادم"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع المكافأة</label>
                <select
                  value={rewardForm.type}
                  onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as any })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="fixed_discount">خصم مالي ثابت (ج.م)</option>
                  <option value="percent_discount">خصم نسبي (%)</option>
                  <option value="free_shipping">شحن مجاني</option>
                  <option value="free_gift">منتج هدية مجاني</option>
                </select>
              </div>

              {rewardForm.type !== 'free_shipping' && rewardForm.type !== 'free_gift' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قيمة الخصم</label>
                  <input
                    type="number"
                    min="1"
                    value={rewardForm.value}
                    onChange={(e) =>
                      setRewardForm({ ...rewardForm, value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  النقاط المطلوبة للاستبدال
                </label>
                <input
                  type="number"
                  min="10"
                  value={rewardForm.pointsCost}
                  onChange={(e) =>
                    setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })
                  }
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rewardForm.title) return;
                  const currentRewards = settings.rules.rewards || DEFAULT_REWARDS;
                  const updated = [...currentRewards, rewardForm];
                  const newSettings = {
                    ...settings,
                    rules: { ...settings.rules, rewards: updated },
                  };
                  setSettings(newSettings);
                  saveSettings(newSettings);
                  setRewardModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
              >
                إضافة المكافأة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT LOYALTY CARD MODAL ─── */}
      {cardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          onClick={() => setCardModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-purple-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {editingCard ? 'تعديل كارت الولاء والأختام' : 'إنشاء كارت ولاء وأختام جديد'}
                </h3>
              </div>
              <button
                onClick={() => setCardModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم أو عنوان الكارت
                </label>
                <input
                  type="text"
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  placeholder="مثال: كارت القهوة والمشروبات (6 أختام)"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف الكارت وشروطه للعملاء
                </label>
                <textarea
                  rows={2}
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                  placeholder="اجمع الأختام مع كل طلب واحصل على هديتك..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الأختام المطلوبة
                  </label>
                  <select
                    value={cardForm.totalStamps}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, totalStamps: parseInt(e.target.value) || 6 })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[4, 5, 6, 8, 10, 12, 15].map((n) => (
                      <option key={n} value={n}>
                        {n} أختام
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحد الأدنى للطلب لنيل الختم (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cardForm.minSpendPerStamp || 0}
                    onChange={(e) =>
                      setCardForm({
                        ...cardForm,
                        minSpendPerStamp: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع المكافأة عند الإكمال
                  </label>
                  <select
                    value={cardForm.rewardType}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, rewardType: e.target.value as any })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="free_product">منتج أو مشروب مجاني</option>
                    <option value="fixed_discount">خصم نقدي مباشر (ج.م)</option>
                    <option value="percent_discount">خصم نسبي (%)</option>
                    <option value="points">نقاط ولاء إضافية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نص المكافأة المختصر
                  </label>
                  <input
                    type="text"
                    value={cardForm.rewardText}
                    onChange={(e) => setCardForm({ ...cardForm, rewardText: e.target.value })}
                    placeholder="مثال: مشروب مجاني أو خصم 50 ج.م"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {cardForm.rewardType !== 'free_product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    قيمة الخصم أو عدد النقاط
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cardForm.rewardValue}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, rewardValue: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  التدرج اللوني وشكل الكارت
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'ذهبي عنبري', color: 'from-amber-600 via-amber-700 to-amber-900' },
                    { label: 'أزرق نيلي', color: 'from-indigo-600 via-slate-800 to-slate-900' },
                    { label: 'زمردي ملكي', color: 'from-emerald-600 via-teal-800 to-slate-900' },
                    { label: 'بنفسجي VIP', color: 'from-purple-600 via-purple-800 to-slate-950' },
                  ].map((clr) => (
                    <button
                      key={clr.color}
                      type="button"
                      onClick={() => setCardForm({ ...cardForm, color: clr.color })}
                      className={`h-11 rounded-xl bg-gradient-to-r ${clr.color} text-[10px] font-bold text-white flex items-center justify-center border-2 transition-all ${
                        cardForm.color === clr.color
                          ? 'border-white ring-2 ring-purple-500'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      {clr.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCard}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
              >
                {editingCard ? 'حفظ التعديلات' : 'إصدار الكارت الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAMP CUSTOMER CARD MODAL ─── */}
      {stampModalOpen && selectedCardForStamp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
          onClick={() => setStampModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Ticket size={18} className="text-indigo-600" />
                <h3 className="font-black text-sm text-slate-900">منح ختم لبطاقة العميل</h3>
              </div>
              <button
                onClick={() => setStampModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {stampSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{stampSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الكارت</label>
                <select
                  value={selectedCardForStamp.id}
                  onChange={(e) => {
                    const found = cardsList.find((c) => c.id === e.target.value);
                    if (found) setSelectedCardForStamp(found);
                  }}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {cardsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.totalStamps} أختام)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر العميل</label>
                <select
                  value={stampCustomerId}
                  onChange={(e) => setStampCustomerId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- حدد العميل لمنحه الختم --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'بدون هاتف'})
                    </option>
                  ))}
                </select>
              </div>

              {stampCustomerId && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">الأختام الحالية للعميل:</span>
                  <span className="font-black text-indigo-700 text-sm">
                    {settings.rules.customerCardStamps?.[stampCustomerId]?.[
                      selectedCardForStamp.id
                    ] || 0}{' '}
                    / {selectedCardForStamp.totalStamps}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStampModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!stampCustomerId}
                onClick={handleAddStampToCustomer}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check size={14} />
                تأكيد ومنح الختم الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOMER DIGITAL CARD PREVIEW MODAL (معاينة كارت العميل الرقمي) ─── */}
      {previewCardModalOpen &&
        previewCustomer &&
        previewCard &&
        (() => {
          const currentStamps =
            settings.rules.customerCardStamps?.[previewCustomer.id]?.[previewCard.id] || 0;
          const total = previewCard.totalStamps;
          const isComplete = currentStamps >= total;
          const remaining = Math.max(0, total - currentStamps);
          const cardLink = getCustomerCardUrl(shopId, previewCustomer.id, previewCard.id);

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
              onClick={() => setPreviewCardModalOpen(false)}
            >
              <div
                className="bg-slate-900 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 border border-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-purple-400" />
                    <div>
                      <h3 className="font-black text-sm text-white">معاينة بطاقة ولاء العميل</h3>
                      <p className="text-[11px] text-slate-400">
                        هكذا يظهر الكارت للعميل على هاتفه المحمول (عرض فقط)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPreviewCardModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* The Digital Card Simulation */}
                <div
                  className={`rounded-3xl p-6 bg-gradient-to-br ${previewCard.color} text-white shadow-xl border border-white/20 relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-xs text-white">
                        بطاقة ولاء رقمية
                      </span>
                      <h4 className="text-lg font-black text-white mt-1">{previewCard.title}</h4>
                      <p className="text-xs text-white/80 font-medium">
                        العميل: {previewCustomer.name}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white">
                      <Crown size={24} />
                    </div>
                  </div>

                  {/* Stamps Container */}
                  <div className="my-5 p-4 bg-black/25 backdrop-blur-xs rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold mb-3">
                      <span>
                        الأختام المجمعة:{' '}
                        <strong className="text-amber-300 font-black">
                          {currentStamps} من {total}
                        </strong>
                      </span>
                      <span className="text-[11px] text-white/90">
                        {isComplete ? '🎉 الكارت مكتمل!' : `باقي ${remaining} ختم`}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5">
                      {Array.from({ length: total }).map((_, idx) => {
                        const isStamped = idx < currentStamps;
                        const isFinal = idx === total - 1;
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                              isStamped
                                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105'
                                : isFinal
                                  ? 'bg-white/15 border-2 border-dashed border-amber-300/80 text-amber-200'
                                  : 'bg-white/10 border border-white/20 text-white/60'
                            }`}
                          >
                            {isStamped ? (
                              <Check size={16} className="stroke-[3]" />
                            ) : isFinal ? (
                              <Gift size={16} />
                            ) : (
                              idx + 1
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Reward Description */}
                  <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white/70 text-[10px] block">
                        المكافأة عند الاكتمال:
                      </span>
                      <span className="font-black text-amber-300">{previewCard.rewardText}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/70 text-[10px] block">رقم العضوية:</span>
                      <span className="font-mono font-bold text-white/90">
                        #{previewCustomer.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Alert */}
                {isComplete ? (
                  <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200 font-bold">
                    <Gift size={18} className="text-amber-400 shrink-0" />
                    <span>
                      العميل مؤهل لاستلام هديته الآن! يمكنك تسليمها وإعادة فتح الكارت من اللوحة.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-300">
                    <span>نسبة إنجاز الكارت:</span>
                    <strong className="text-purple-300 font-black">
                      {Math.round((currentStamps / total) * 100)}%
                    </strong>
                  </div>
                )}

                {/* Share & Link Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (cardLink) {
                          navigator.clipboard.writeText(cardLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }
                      }}
                      className="flex-1 h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      {copiedLink ? 'تم نسخ الرابط ✓' : 'نسخ رابط الكارت للعميل'}
                    </button>

                    {previewCustomer.phone && (
                      <a
                        href={`https://wa.me/${previewCustomer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `مرحباً ${previewCustomer.name}، بطاقة الولاء الخاصة بك في متجرنا أصبحت جاهزة! تابع أختامك وهداياك من هنا: ${cardLink}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <MessageCircle size={15} />
                        واتساب
                      </a>
                    )}
                  </div>

                  <a
                    href={cardLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    فتح صفحة العميل في نافذة جديدة
                  </a>
                </div>
              </div>
            </div>
          );
        })()}
    </InventoryPage>
  );
}

function generateSecureCardToken(shopId: string, customerId: string, cardId: string) {
  try {
    const payload = JSON.stringify({ s: shopId, c: customerId, k: cardId, t: Date.now() });
    return btoa(unescape(encodeURIComponent(payload)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return '';
  }
}

function getCustomerCardUrl(shopId: string, customerId: string, cardId: string) {
  if (typeof window === 'undefined') return '';
  const token = generateSecureCardToken(shopId, customerId, cardId);
  return `${window.location.origin}/loyalty/card?t=${token}`;
}

export default function LoyaltyProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-bold">جاري تحميل برامج الولاء...</div>
      }
    >
      <LoyaltyProgramsContent />
    </Suspense>
  );
}
