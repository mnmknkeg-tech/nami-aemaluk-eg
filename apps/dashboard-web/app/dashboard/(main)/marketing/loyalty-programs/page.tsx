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
  Sparkles, Gift, Crown, Trophy, Coins, Award, Users, Plus, Edit, Trash2,
  Download, X, Info, Check, Loader2, Search, ArrowUpRight, ArrowDownRight,
  RefreshCw, ShieldCheck, Star, Zap, ChevronRight, Settings2, Percent,
  Calendar, CheckCircle2, AlertCircle, ShoppingBag, ArrowUpDown, UserCheck
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

type LoyaltySettings = {
  enabled: boolean;
  pointsPerCurrency: number;
  signupPoints: number;
  minRedeemPoints: number;
  redeemValuePer100: number; // كم جنيه مصري مقابل كل 100 نقطة
  pointsExpiryMonths: number;
  rules: {
    tiers?: LoyaltyTier[];
    rewards?: LoyaltyReward[];
    earnOnReview?: number;
    earnOnBirthday?: number;
    [key: string]: any;
  };
};

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
    benefits: ['مضاعفة النقاط x2.0', 'شحن مجاني دائم', 'هدايا حصرية مع كل طلب', 'دعوات لمنتجات قبل الإطلاق'],
  },
];

const DEFAULT_REWARDS: LoyaltyReward[] = [
  { id: 'r1', title: 'خصم 25 ج.م على طلبك', pointsCost: 250, type: 'fixed_discount', value: 25, active: true },
  { id: 'r2', title: 'خصم 50 ج.م على طلبك', pointsCost: 500, type: 'fixed_discount', value: 50, active: true },
  { id: 'r3', title: 'شحن مجاني لأي وجهة', pointsCost: 350, type: 'free_shipping', value: 0, active: true },
  { id: 'r4', title: 'خصم 15% على إجمالي السلة', pointsCost: 800, type: 'percent_discount', value: 15, active: true },
  { id: 'r5', title: 'منتج مجاني مع الطلب القادم', pointsCost: 1200, type: 'free_gift', value: 0, active: true },
];

const TAB_IDS = ['overview', 'customers', 'ledger', 'rewards', 'settings'];

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
const d = (s: string) => (s ? new Date(s).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

function LoyaltyProgramsContent() {
  const searchParams = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'overview';
  const [tab, setTab] = useState(initialTab);

  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Settings State
  const [settings, setSettings] = useState<LoyaltySettings>({
    enabled: true,
    pointsPerCurrency: 1, // 1 point per 1 EGP
    signupPoints: 50,
    minRedeemPoints: 100,
    redeemValuePer100: 10, // 100 points = 10 EGP
    pointsExpiryMonths: 12,
    rules: {
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
        setSettings({
          enabled: Boolean(raw.enabled ?? true),
          pointsPerCurrency: Number(raw.pointsPerCurrency || 1),
          signupPoints: Number(raw.signupPoints || 50),
          minRedeemPoints: Number(raw.minRedeemPoints || 100),
          redeemValuePer100: Number(raw.rules?.redeemValuePer100 || 10),
          pointsExpiryMonths: Number(raw.rules?.pointsExpiryMonths || 12),
          rules: {
            tiers: Array.isArray(raw.rules?.tiers) && raw.rules.tiers.length > 0 ? raw.rules.tiers : DEFAULT_TIERS,
            rewards: Array.isArray(raw.rules?.rewards) && raw.rules.rewards.length > 0 ? raw.rules.rewards : DEFAULT_REWARDS,
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
          c.id === selectedCustomer.id ? { ...c, loyaltyBalance: Math.max(0, c.loyaltyBalance + delta) } : c
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
    () =>
      ledger
        .filter((l) => l.delta < 0)
        .reduce((acc, l) => acc + Math.abs(l.delta), 0),
    [ledger]
  );
  const totalPointsEarned = useMemo(
    () =>
      ledger
        .filter((l) => l.delta > 0)
        .reduce((acc, l) => acc + l.delta, 0),
    [ledger]
  );
  const totalEstimatedValue = (totalPointsInCirculation / 100) * settings.redeemValuePer100;

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
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
    if (ledgerFilter === 'manual') list = list.filter((l) => l.reason.includes('يدوي') || l.reason.includes('مكافأة') || l.reason === 'manual');
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((l) => {
        const cust = customers.find((c) => c.id === l.customerId);
        return (cust && cust.name.toLowerCase().includes(q)) || l.reason.toLowerCase().includes(q) || (l.staffName || '').toLowerCase().includes(q);
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

  const tabs: InvTab[] = [
    { id: 'overview', label: 'لوحة البرنامج', count: undefined },
    { id: 'customers', label: 'أرصدة العملاء', count: customers.length },
    { id: 'ledger', label: 'سجل العمليات', count: ledger.length },
    { id: 'rewards', label: 'كتالوج المكافآت', count: (settings.rules.rewards || []).length },
    { id: 'settings', label: 'قواعد البرنامج والمستويات', count: undefined },
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
      subtitle="نظام النقاط الذكي"
      tabs={tabs}
      activeTab={tab}
      onTabChange={(t) => {
        setTab(t);
        setCurrentPage(1);
      }}
      search={['customers', 'ledger'].includes(tab) ? searchQuery : undefined}
      onSearchChange={['customers', 'ledger'].includes(tab) ? setSearchQuery : undefined}
      searchPlaceholder={tab === 'customers' ? 'بحث باسم العميل أو رقم الهاتف...' : 'بحث في السجل...'}
      actions={
        <div className="flex items-center gap-2">
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
          {/* Status Bar */}
          <div className="bg-gradient-to-l from-indigo-900 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Crown size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-black">نظام مكافآت ونقاط الولاء</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${settings.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {settings.enabled ? 'مفعل ويعمل للعملاء' : 'متوقف مؤقتًا'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  يساعدك برنامج الولاء على تحفيز العملاء لتكرار الشراء، كسب النقاط مع كل طلب، والارتقاء إلى مستويات أعلى بمزايا حصرية.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const updated = { ...settings, enabled: !settings.enabled };
                  setSettings(updated);
                  saveSettings(updated);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${settings.enabled ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
              >
                <Zap size={14} />
                {settings.enabled ? 'تعطيل البرنامج مؤقتًا' : 'تفعيل برنامج الولاء الآن'}
              </button>
              <button
                onClick={() => setTab('settings')}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Settings2 size={14} />
                تعديل القواعد
              </button>
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
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmt(totalPointsInCirculation)} <span className="text-xs text-amber-600 font-bold">نقطة</span></p>
                <p className="text-[11px] text-slate-400 mt-1">تساوي تقريبًا {fmt(totalEstimatedValue)} ج.م</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">العملاء المشاركون</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmt(customers.length)} <span className="text-xs text-slate-500 font-bold">عميل</span></p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">{customers.filter((c) => c.loyaltyBalance > 0).length} لديهم رصيد نقاط نشط</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArrowUpRight size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">مجموع النقاط المكتسبة</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmt(totalPointsEarned)} <span className="text-xs text-blue-600 font-bold">نقطة</span></p>
                <p className="text-[11px] text-slate-400 mt-1">من الطلبات والتسجيل</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ArrowDownRight size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">النقاط المستبدلة بالخصومات</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{fmt(totalPointsRedeemed)} <span className="text-xs text-purple-600 font-bold">نقطة</span></p>
                <p className="text-[11px] text-slate-400 mt-1">وفرت للعملاء تخفيضات</p>
              </div>
            </div>
          </div>

          {/* Tiers Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900">مستويات العملاء والترقيات</h3>
                <p className="text-xs text-slate-500">يتدرج العميل بين المستويات كلما كسب نقاطاً أكثر، ويحصل على مضاعف نقاط ومزايا أعلى.</p>
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
                const membersCount = customers.filter((c) => getCustomerTier(c.loyaltyBalance).id === tier.id).length;
                return (
                  <div key={tier.id} className="rounded-2xl border border-slate-200 p-5 relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors">
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
                          <li key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5">
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
                <button onClick={() => setTab('customers')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                  عرض الكل ({customers.length})
                </button>
              </div>

              {customers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">لا يوجد عملاء حتى الآن</div>
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
                            <span className="w-6 text-center text-xs font-black text-slate-400">{idx + 1}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{c.name}</p>
                              <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {tier.badge} {tier.name}
                            </span>
                            <span className="text-xs font-black text-amber-600">{fmt(c.loyaltyBalance)} نقطة</span>
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
                <button onClick={() => setTab('ledger')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                  سجل العمليات بالكامل
                </button>
              </div>

              {ledger.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">لم تسجل أي حركة نقاط بعد</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {ledger.slice(0, 5).map((l) => {
                    const cust = customers.find((c) => c.id === l.customerId);
                    const isEarn = l.delta > 0;
                    return (
                      <div key={l.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEarn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isEarn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{cust ? cust.name : 'عميل'}</p>
                            <p className="text-[10px] text-slate-400">{l.reason} • {d(l.createdAt)}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-black ${isEarn ? 'text-emerald-600' : 'text-red-500'}`}>
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
              <InvEmpty
                icon={Users}
                title="لم يتم العثور على أي عملاء"
              />
            ) : (
              paginatedCustomers.map((c) => {
                const tier = getCustomerTier(c.loyaltyBalance);
                const estValue = (c.loyaltyBalance / 100) * settings.redeemValuePer100;
                return (
                  <InvRow key={c.id}>
                    <div className="col-span-3">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.phone}</p>
                    </div>

                    <div className="col-span-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        <span>{tier.badge}</span>
                        <span>{tier.name}</span>
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="font-black text-sm text-amber-600">
                        {fmt(c.loyaltyBalance)}
                      </span>
                      <span className="text-[11px] text-slate-400 mr-1">نقطة</span>
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
                      <p className="font-bold text-xs text-slate-900">{cust ? cust.name : 'عميل غير مسجل'}</p>
                      {cust && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                    </div>

                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-full ${isEarn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {isEarn ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {isEarn ? `+${fmt(l.delta)}` : fmt(l.delta)} نقطة
                      </span>
                    </div>

                    <div className="col-span-2 font-bold text-xs text-slate-700">
                      {fmt(l.balanceAfter)} نقطة
                    </div>

                    <div className="col-span-2 text-xs text-slate-600 font-medium truncate" title={l.reason}>
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
              <p className="text-xs text-slate-500">المكافآت التي يمكن لعملائك استبدال نقاطهم بها أثناء إتمام الطلب أو من حسابهم.</p>
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
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${reward.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {reward.active ? 'مفعلة للاستبدال' : 'معطلة'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 mb-1">{reward.title}</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    {reward.type === 'fixed_discount' && `خصم مالي ثابت بقيمة ${reward.value} ج.م`}
                    {reward.type === 'percent_discount' && `خصم نسبي بقيمة ${reward.value}% على السلة`}
                    {reward.type === 'free_shipping' && `شحن مجاني على عنوان التوصيل`}
                    {reward.type === 'free_gift' && `هدية عينية مجانية مضافة للسلة`}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">تكلفة الاستبدال</span>
                    <span className="text-base font-black text-amber-600">{fmt(reward.pointsCost)} نقطة</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const updated = (settings.rules.rewards || DEFAULT_REWARDS).map((r) =>
                          r.id === reward.id ? { ...r, active: !r.active } : r
                        );
                        const newSettings = { ...settings, rules: { ...settings.rules, rewards: updated } };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {reward.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => {
                        const updated = (settings.rules.rewards || DEFAULT_REWARDS).filter((r) => r.id !== reward.id);
                        const newSettings = { ...settings, rules: { ...settings.rules, rewards: updated } };
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
                    onChange={(e) => setSettings({ ...settings, pointsPerCurrency: parseFloat(e.target.value) || 1 })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة / 1 ج.م</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">مثال: 1 يعني إن كل 100 ج.م شراء تمنح العميل 100 نقطة.</p>
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
                    onChange={(e) => setSettings({ ...settings, redeemValuePer100: parseInt(e.target.value) || 10 })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م / 100 نقطة</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">مثال: 10 يعني كل 100 نقطة تخصم 10 ج.م من الفاتورة.</p>
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
                    onChange={(e) => setSettings({ ...settings, signupPoints: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">تُضاف تلقائياً لرصيد العميل بمجرد إنشاء الحساب.</p>
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
                    onChange={(e) => setSettings({ ...settings, minRedeemPoints: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">يمنع الاستبدال إذا كان رصيد العميل أقل من هذا الرقم.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  صلاحية النقاط (قبل انتهاء صلاحيتها)
                </label>
                <select
                  value={settings.pointsExpiryMonths}
                  onChange={(e) => setSettings({ ...settings, pointsExpiryMonths: parseInt(e.target.value) || 12 })}
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
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
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
                <div key={tier.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">اسم المستوى</label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setSettings({ ...settings, rules: { ...settings.rules, tiers: updated } });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">الحد الأدنى للنقاط</label>
                      <input
                        type="number"
                        value={tier.minPoints}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], minPoints: parseInt(e.target.value) || 0 };
                          setSettings({ ...settings, rules: { ...settings.rules, tiers: updated } });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">مضاعف النقاط (Multiplier)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        value={tier.multiplier}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], multiplier: parseFloat(e.target.value) || 1 };
                          setSettings({ ...settings, rules: { ...settings.rules, tiers: updated } });
                        }}
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">الأيقونة / الشارة</label>
                      <input
                        type="text"
                        value={tier.badge}
                        onChange={(e) => {
                          const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                          updated[idx] = { ...updated[idx], badge: e.target.value };
                          setSettings({ ...settings, rules: { ...settings.rules, tiers: updated } });
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
              {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              حفظ جميع إعدادات الولاء
            </button>
          </div>
        </div>
      )}

      {/* ─── ADJUST POINTS MODAL ─── */}
      {adjustModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setAdjustModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900">تعديل رصيد نقاط العميل</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.name} ({selectedCustomer.phone})</p>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
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
              <span className="text-sm font-black text-amber-900">{fmt(selectedCustomer.loyaltyBalance)} نقطة</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف أو المسؤول</label>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setRewardModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">إضافة مكافأة جديدة لكتالوج الولاء</h3>
              <button onClick={() => setRewardModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المكافأة</label>
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
                    onChange={(e) => setRewardForm({ ...rewardForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">النقاط المطلوبة للاستبدال</label>
                <input
                  type="number"
                  min="10"
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })}
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
                  const newSettings = { ...settings, rules: { ...settings.rules, rewards: updated } };
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
    </InventoryPage>
  );
}

export default function LoyaltyProgramsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">جاري تحميل برامج الولاء...</div>}>
      <LoyaltyProgramsContent />
    </Suspense>
  );
}

