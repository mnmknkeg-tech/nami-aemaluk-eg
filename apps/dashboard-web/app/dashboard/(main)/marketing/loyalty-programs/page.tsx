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
import { Plus, Download, RefreshCw, CheckCircle2, Ticket } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSearchParams } from 'next/navigation';
import {
  DEFAULT_CARDS,
  DEFAULT_REWARDS,
  DEFAULT_TIERS,
  type LoyaltyCard,
  type LoyaltySettings,
  type LoyaltyTier,
  type LoyaltyReward,
  type CustomerItem,
  type LedgerEntry,
} from '@/components/marketing/loyalty/types';
import { InventoryPage, InvLoading, type InvTab } from '@/components/inventory/InventoryShell';
import LoyaltyOverviewTab from '@/components/marketing/loyalty/LoyaltyOverviewTab';
import LoyaltyCustomersTab from '@/components/marketing/loyalty/LoyaltyCustomersTab';
import LoyaltyCardsTab from '@/components/marketing/loyalty/LoyaltyCardsTab';
import LoyaltyLedgerTab from '@/components/marketing/loyalty/LoyaltyLedgerTab';
import LoyaltyRewardsTab from '@/components/marketing/loyalty/LoyaltyRewardsTab';
import LoyaltySettingsTab from '@/components/marketing/loyalty/LoyaltySettingsTab';
import LoyaltyAdjustPointsModal from '@/components/marketing/loyalty/LoyaltyAdjustPointsModal';
import LoyaltyRewardModal from '@/components/marketing/loyalty/LoyaltyRewardModal';
import LoyaltyCardModal from '@/components/marketing/loyalty/LoyaltyCardModal';
import LoyaltyStampModal from '@/components/marketing/loyalty/LoyaltyStampModal';
import LoyaltyDigitalCardPreviewModal from '@/components/marketing/loyalty/LoyaltyDigitalCardPreviewModal';

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

      {tab === 'overview' && (
        <LoyaltyOverviewTab
          settings={settings}
          setSettings={setSettings}
          saveSettings={saveSettings}
          cardsList={cardsList}
          setTab={setTab}
          fmt={fmt}
          totalPointsInCirculation={totalPointsInCirculation}
          totalEstimatedValue={totalEstimatedValue}
          customers={customers}
          totalPointsEarned={totalPointsEarned}
          totalPointsRedeemed={totalPointsRedeemed}
          DEFAULT_TIERS={DEFAULT_TIERS}
          getCustomerTier={getCustomerTier}
          ledger={ledger}
          d={d}
        />
      )}

      {tab === 'customers' && (
        <LoyaltyCustomersTab
          paginatedCustomers={paginatedCustomers}
          getCustomerTier={getCustomerTier}
          settings={settings}
          fmt={fmt}
          setSelectedCustomer={setSelectedCustomer}
          setAdjustType={setAdjustType}
          setAdjustPoints={setAdjustPoints}
          setAdjustReason={setAdjustReason}
          setAdjustError={setAdjustError}
          setAdjustModalOpen={setAdjustModalOpen}
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          filteredCustomers={filteredCustomers}
          itemsPerPage={itemsPerPage}
        />
      )}

      {tab === 'cards' && (
        <LoyaltyCardsTab
          settings={settings}
          setSettings={setSettings}
          saveSettings={saveSettings}
          cardsList={cardsList}
          setSelectedCardForStamp={setSelectedCardForStamp}
          setStampCustomerId={setStampCustomerId}
          customers={customers}
          setStampSuccessMsg={setStampSuccessMsg}
          setStampModalOpen={setStampModalOpen}
          setEditingCard={setEditingCard}
          setCardForm={setCardForm}
          setCardModalOpen={setCardModalOpen}
          handleDeleteCard={handleDeleteCard}
          handleToggleCardActive={handleToggleCardActive}
          cardCustomerSearch={cardCustomerSearch}
          setCardCustomerSearch={setCardCustomerSearch}
          handleClaimRewardAndReset={handleClaimRewardAndReset}
          handleQuickStamp={handleQuickStamp}
          handleQuickDeductStamp={handleQuickDeductStamp}
          setPreviewCustomer={setPreviewCustomer}
          setPreviewCard={setPreviewCard}
          setPreviewCardModalOpen={setPreviewCardModalOpen}
          copyCardLink={copyCardLink}
        />
      )}

      {tab === 'ledger' && (
        <LoyaltyLedgerTab
          setLedgerFilter={setLedgerFilter}
          ledgerFilter={ledgerFilter}
          filteredLedger={filteredLedger}
          customers={customers}
          d={d}
          fmt={fmt}
        />
      )}

      {tab === 'rewards' && (
        <LoyaltyRewardsTab
          settings={settings}
          DEFAULT_REWARDS={DEFAULT_REWARDS}
          fmt={fmt}
          setSettings={setSettings}
          saveSettings={saveSettings}
        />
      )}

      {tab === 'settings' && (
        <LoyaltySettingsTab
          settings={settings}
          setSettings={setSettings}
          saveSettings={saveSettings}
          DEFAULT_TIERS={DEFAULT_TIERS}
          savingSettings={savingSettings}
        />
      )}

      {adjustModalOpen && selectedCustomer && (
        <LoyaltyAdjustPointsModal
          setAdjustModalOpen={setAdjustModalOpen}
          selectedCustomer={selectedCustomer}
          adjustError={adjustError}
          fmt={fmt}
          setAdjustType={setAdjustType}
          adjustType={adjustType}
          adjustPoints={adjustPoints}
          setAdjustPoints={setAdjustPoints}
          adjustReason={adjustReason}
          setAdjustReason={setAdjustReason}
          adjustStaff={adjustStaff}
          setAdjustStaff={setAdjustStaff}
          handleAdjustPoints={handleAdjustPoints}
          adjustSubmitting={adjustSubmitting}
        />
      )}

      {rewardModalOpen && (
        <LoyaltyRewardModal
          setRewardModalOpen={setRewardModalOpen}
          rewardForm={rewardForm}
          setRewardForm={setRewardForm}
          settings={settings}
          DEFAULT_REWARDS={DEFAULT_REWARDS}
          setSettings={setSettings}
          saveSettings={saveSettings}
        />
      )}

      {cardModalOpen && (
        <LoyaltyCardModal
          setCardModalOpen={setCardModalOpen}
          editingCard={editingCard}
          cardForm={cardForm}
          setCardForm={setCardForm}
          handleSaveCard={handleSaveCard}
        />
      )}

      {stampModalOpen && selectedCardForStamp && (
        <LoyaltyStampModal
          setStampModalOpen={setStampModalOpen}
          stampSuccessMsg={stampSuccessMsg}
          selectedCardForStamp={selectedCardForStamp}
          cardsList={cardsList}
          setSelectedCardForStamp={setSelectedCardForStamp}
          stampCustomerId={stampCustomerId}
          setStampCustomerId={setStampCustomerId}
          customers={customers}
          settings={settings}
          handleAddStampToCustomer={handleAddStampToCustomer}
        />
      )}

      {previewCardModalOpen && previewCustomer && previewCard && (
        <LoyaltyDigitalCardPreviewModal
          settings={settings}
          previewCustomer={previewCustomer}
          previewCard={previewCard}
          getCustomerCardUrl={getCustomerCardUrl}
          shopId={shopId}
          setPreviewCardModalOpen={setPreviewCardModalOpen}
          setCopiedLink={setCopiedLink}
          copiedLink={copiedLink}
        />
      )}
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
