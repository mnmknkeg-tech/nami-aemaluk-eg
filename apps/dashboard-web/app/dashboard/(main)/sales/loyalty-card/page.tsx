'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Loader2,
  Gift,
  Award,
  Star,
  X,
  Info,
  Target,
  BookOpen,
  Zap,
  Link2,
  ClipboardList,
  CheckCircle2,
  Download,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  ToggleLeft,
  ToggleRight,
  Coffee,
  ShoppingBag,
  Clock,
  Calendar,
  QrCode,
  Utensils,
  Settings,
  Truck,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type LoyaltyCard = {
  id: string;
  customerName: string;
  phone: string;
  shopId: string;
  shopName: string;
  shopCategory: string;
  purchases: number;
  stamps: number;
  requiredStamps: number;
  freeItem: string;
  tier: string;
  createdAt: string;
  lastPurchase: string;
};

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  bronze: {
    label: 'برونزي',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: <Award size={14} />,
  },
  silver: { label: 'فضي', color: 'text-slate-600', bg: 'bg-slate-200', icon: <Star size={14} /> },
  gold: { label: 'ذهبي', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: <Gift size={14} /> },
  platinum: {
    label: 'بلاتيني',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: <Star size={14} />,
  },
};

const CARD_TEMPLATES = [
  {
    id: 'restaurant',
    label: 'مطعم',
    icon: <Utensils size={20} />,
    category: 'RESTAURANT',
    required: 10,
    freeItem: 'وجبة مجانية',
  },
  {
    id: 'cafe',
    label: 'كافيهات',
    icon: <Coffee size={20} />,
    category: 'RESTAURANT',
    required: 8,
    freeItem: 'قهوة مجانية',
  },
  {
    id: 'grocery',
    label: 'بقالة',
    icon: <ShoppingBag size={20} />,
    category: 'RETAIL',
    required: 12,
    freeItem: 'منتج مجاني',
  },
  {
    id: 'fashion',
    label: 'ملابس',
    icon: <Award size={20} />,
    category: 'RETAIL',
    required: 10,
    freeItem: 'قطعة ملابس مجانية',
  },
  {
    id: 'electronics',
    label: 'إلكترونيات',
    icon: <Star size={20} />,
    category: 'RETAIL',
    required: 8,
    freeItem: 'إكسسوارة مجانية',
  },
  {
    id: 'pharmacy',
    label: 'صيدلية',
    icon: <Gift size={20} />,
    category: 'RETAIL',
    required: 15,
    freeItem: 'منتج صحي مجاني',
  },
  {
    id: 'custom',
    label: 'مخصص',
    icon: <Settings size={20} />,
    category: 'OTHER',
    required: 10,
    freeItem: 'هدية مجانية',
  },
];

export default function SalesLoyaltyCardPage() {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTier, setFilterTier] = useState('all');
  const [filterShop, setFilterShop] = useState('all');
  const [shops, setShops] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('stamps');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addStampModal, setAddStampModal] = useState(false);
  const [addStampCard, setAddStampCard] = useState<string>('');
  const [addStampCount, setAddStampCount] = useState('');
  const [cardEnabled, setCardEnabled] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('coffee');
  const [customRequired, setCustomRequired] = useState(10);
  const [customFreeItem, setCustomFreeItem] = useState('');

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      // Load all shops for the filter
      const shopsRes = await apiRequest('/shops');
      const shopsList = Array.isArray(shopsRes)
        ? shopsRes
        : shopsRes?.shops || shopsRes?.data || [];
      setShops(shopsList);

      // Load cards from all shops (or current shop if filtering)
      const shopData = await apiRequest('/shops/me');
      const currentShopId = shopData?.id;
      if (!currentShopId) {
        setLoading(false);
        return;
      }

      // For now, load from current shop - in production, this would load from all shops
      const res = await apiRequest(`/customers/shop/${currentShopId}`);
      const customers = Array.isArray(res) ? res : res?.data || [];
      setCards(
        customers.map((c: any) => ({
          id: String(c.id),
          customerName: c.name || c.customerName || '---',
          phone: c.phone || c.phoneNumber || '---',
          shopId: currentShopId,
          shopName: shopData?.name || 'المتجر',
          shopCategory: shopData?.category || 'RETAIL',
          purchases: Number(c.purchases || c.totalOrders || 0),
          stamps: Number(c.stamps || c.loyaltyStamps || 0),
          requiredStamps: Number(c.requiredStamps || 10),
          freeItem: c.freeItem || 'قهوة مجانية',
          tier: c.tier || 'bronze',
          createdAt: c.createdAt || new Date().toISOString(),
          lastPurchase: c.lastPurchase || new Date().toISOString(),
        }))
      );
    } catch {
      setCards([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';

  const filtered = useMemo(() => {
    let result = cards.filter(
      (c) =>
        c.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.phone.includes(debouncedSearch)
    );

    if (filterTier !== 'all') {
      result = result.filter((c) => c.tier === filterTier);
    }

    if (filterShop !== 'all') {
      result = result.filter((c) => c.shopId === filterShop);
    }

    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'stamps' ? a.stamps : a.purchases;
      const bVal = sortBy === 'stamps' ? b.stamps : b.purchases;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [cards, debouncedSearch, filterTier, filterShop, sortBy, sortOrder]);

  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedCards.length && paginatedCards.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCards.map((c) => c.id)));
    }
  }, [paginatedCards, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkAddStamps = useCallback(() => {
    const amount = prompt('Enter number of stamps to add to selected cards:');
    if (amount && !isNaN(Number(amount))) {
      alert(`Adding ${amount} stamps to ${selectedIds.size} cards`);
      // TODO: Implement API call to bulk add stamps
    }
  }, [selectedIds]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Customer Name',
      'Phone',
      'Purchases',
      'Stamps',
      'Required',
      'Free Item',
      'Tier',
      'Joined At',
    ];
    const rows = filtered.map((c) => [
      c.customerName,
      c.phone,
      c.purchases,
      c.stamps,
      c.requiredStamps,
      c.freeItem,
      c.tier,
      c.createdAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'loyalty-cards.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'loyalty-cards.csv');
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const totalCards = cards.length;
    const readyForReward = cards.filter((c) => c.stamps >= c.requiredStamps).length;
    const totalStamps = cards.reduce((s, c) => s + c.stamps, 0);
    const totalPurchases = cards.reduce((s, c) => s + c.purchases, 0);
    return [
      {
        label: 'إجمالي البطاقات',
        value: totalCards,
        icon: CreditCard,
        color: 'bg-blue-50 text-blue-600',
      },
      {
        label: 'جاهزة للمكافأة',
        value: readyForReward,
        icon: Gift,
        color: 'bg-green-50 text-green-600',
      },
      {
        label: 'إجمالي الختمات',
        value: totalStamps.toLocaleString(),
        icon: CheckCircle2,
        color: 'bg-purple-50 text-purple-600',
      },
      {
        label: 'إجمالي المشتريات',
        value: totalPurchases.toLocaleString(),
        icon: ShoppingBag,
        color: 'bg-amber-50 text-amber-600',
      },
    ];
  }, [cards]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <CreditCard size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">بطاقة الولاء</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">
            {isRestaurant ? 'نظام البطاقات للمطاعم والكافيهات' : 'نظام البطاقات للمتاجر'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
          >
            <Download size={18} />
            تصدير CSV
          </button>
          <button
            onClick={() => setAddStampModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
          >
            <Plus size={18} />
            إضافة ختم
          </button>
        </div>
        <button
          onClick={() => setCardEnabled(!cardEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${
            cardEnabled
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {cardEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {cardEnabled ? 'مفعّل' : 'معطّل'}
        </button>
      </div>

      {/* Disabled State */}
      {!cardEnabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <X size={20} />
            <span className="font-bold text-sm">نظام بطاقة الولاء معطّل حالياً</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">قم بتفعيل النظام لبدء إدارة بطاقات الولاء</p>
        </div>
      )}

      {/* Card Template Selection */}
      {cardEnabled && (
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={18} className="text-slate-600" />
            <span className="font-bold text-slate-900 text-sm">نموذج البطاقة</span>
          </div>
          <div className="mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Info size={12} />
              <span>النماذج المعروضة حسب نشاط متجرك الحالي</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CARD_TEMPLATES.filter(
              (t) => t.category === shopCategory || t.category === 'OTHER'
            ).map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  selectedTemplate === template.id
                    ? 'border-[#00E5FF] bg-[#00E5FF]/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-slate-600">{template.icon}</div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-xs">{template.label}</div>
                  <div className="text-xs text-slate-500">{template.required} ختمات</div>
                </div>
              </button>
            ))}
          </div>
          {selectedTemplate === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  عدد الختمات المطلوبة
                </label>
                <input
                  type="number"
                  value={customRequired}
                  onChange={(e) => setCustomRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  المكافأة المجانية
                </label>
                <input
                  type="text"
                  value={customFreeItem}
                  onChange={(e) => setCustomFreeItem(e.target.value)}
                  placeholder="مثال: وجبة مجانية"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {cardEnabled && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white"
            >
              <div className={`p-2 rounded-xl ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">{s.label}</p>
                <p className="text-lg font-black text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {cardEnabled && (
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-300" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      )}

      {/* Advanced Filters */}
      {cardEnabled && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">المتجر:</span>
            <select
              value={filterShop}
              onChange={(e) => setFilterShop(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">كل المتاجر</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">المستوى:</span>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">الكل</option>
              <option value="bronze">برونزي</option>
              <option value="silver">فضي</option>
              <option value="gold">ذهبي</option>
              <option value="platinum">بلاتيني</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">الترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="stamps">عدد الختمات</option>
              <option value="purchases">عدد المشتريات</option>
            </select>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      )}

      {/* Cards List */}
      {cardEnabled && (
        <>
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <CreditCard size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 font-bold text-sm">لا توجد بطاقات</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="space-y-3 md:hidden">
                {paginatedCards.map((card) => {
                  const tier = TIER_CONFIG[card.tier] || TIER_CONFIG.bronze;
                  const isReady = card.stamps >= card.requiredStamps;
                  const progress = (card.stamps / card.requiredStamps) * 100;
                  return (
                    <div
                      key={card.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <button onClick={() => toggleSelect(card.id)} className="shrink-0 p-1">
                          {selectedIds.has(card.id) ? (
                            <Check size={18} className="text-[#00E5FF]" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm">
                            {card.customerName}
                          </div>
                          <div className="text-slate-500 font-medium text-xs">{card.phone}</div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <ShoppingBag size={10} />
                            {card.shopName}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${tier.bg} ${tier.color} flex items-center gap-1`}
                          >
                            {tier.icon}
                            {tier.label}
                          </span>
                        </div>
                      </div>

                      {/* Stamp Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">الختمات</span>
                          <span
                            className={`font-bold ${isReady ? 'text-green-600' : 'text-slate-900'}`}
                          >
                            {card.stamps} / {card.requiredStamps}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${isReady ? 'bg-green-500' : 'bg-[#00E5FF]'}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Stamp Visual */}
                      <div className="flex gap-1 mb-3">
                        {Array.from({ length: card.requiredStamps }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              i < card.stamps
                                ? 'bg-[#00E5FF] text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {i < card.stamps ? '✓' : i + 1}
                          </div>
                        ))}
                      </div>

                      {isReady && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
                          <div className="flex items-center justify-center gap-1 text-green-700 text-xs font-bold">
                            <Gift size={14} />
                            <span>مستحق: {card.freeItem}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>
                          آخر شراء: {new Date(card.lastPurchase).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto touch-auto mt-6">
                <table className="w-full text-right border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 w-10">
                        <button onClick={toggleSelectAll} className="p-1">
                          {selectedIds.size === paginatedCards.length &&
                          paginatedCards.length > 0 ? (
                            <Check size={18} className="text-[#00E5FF]" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                          )}
                        </button>
                      </th>
                      <th className="p-4 text-xs font-semibold text-slate-500">العميل</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">الهاتف</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">المتجر</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">المستوى</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">الختمات</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">التقدم</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">المكافأة</th>
                      <th className="p-4 text-xs font-semibold text-slate-500">آخر شراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCards.map((card) => {
                      const tier = TIER_CONFIG[card.tier] || TIER_CONFIG.bronze;
                      const isReady = card.stamps >= card.requiredStamps;
                      const progress = (card.stamps / card.requiredStamps) * 100;
                      return (
                        <tr
                          key={card.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50"
                        >
                          <td className="p-4">
                            <button onClick={() => toggleSelect(card.id)} className="p-1">
                              {selectedIds.has(card.id) ? (
                                <Check size={18} className="text-[#00E5FF]" />
                              ) : (
                                <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                              )}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {card.customerName}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-slate-600 text-sm">{card.phone}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <ShoppingBag size={12} />
                              {card.shopName}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${tier.bg} ${tier.color} flex items-center gap-1 w-fit`}
                            >
                              {tier.icon}
                              {tier.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {card.stamps} / {card.requiredStamps}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${isReady ? 'bg-green-500' : 'bg-[#00E5FF]'}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            {isReady ? (
                              <div className="flex items-center gap-1 text-green-700 text-xs font-bold">
                                <Gift size={12} />
                                {card.freeItem}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="text-slate-600 text-xs flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(card.lastPurchase).toLocaleDateString('ar-EG')}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-xs font-bold text-slate-500">
                    عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
                    {Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <span className="text-xs font-bold text-slate-600 px-3">
                      صفحة {currentPage} من {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Guide Modal */}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل بطاقة الولاء</h2>
              <button
                onClick={() => setGuideOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-6 text-right">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">وظيفة الصفحة</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  إدارة بطاقات الولاء مثل المطاعم والكافيهات - اشتري X مرات والـ X+1 مجانية.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  للمطاعم والكافيهات التي تريد مكافأة العملاء المتكررين بوجبات مجانية.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيف تعمل</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• كل شراء = ختمة واحدة</li>
                  <li>• عند جمع X ختمات = مكافأة مجانية</li>
                  <li>• نماذج جاهزة: قهوة (10)، بيتزا (8)، بقالة (12)</li>
                  <li>• نموذج مخصص: اختر عدد الختمات والمكافأة</li>
                  <li>• تتبع البطاقات الجاهزة للمكافأة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">الإعدادات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• تفعيل/قفل النظام بالكامل</li>
                  <li>• اختيار نموذج البطاقة المناسب</li>
                  <li>• تخصيص عدد الختمات والمكافأة</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stamp Modal */}
      {addStampModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddStampModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إضافة ختم</h2>
              <button
                onClick={() => setAddStampModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">العميل</label>
                <select
                  value={addStampCard}
                  onChange={(e) => setAddStampCard(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر العميل</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">عدد الختمات</label>
                <input
                  type="number"
                  value={addStampCount}
                  onChange={(e) => setAddStampCount(e.target.value)}
                  placeholder="عدد الختمات"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={() => {
                  console.log('Adding stamps:', addStampCard, addStampCount);
                  setAddStampModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
              >
                إضافة ختم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
