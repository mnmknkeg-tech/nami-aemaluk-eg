'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Gift,
  Search,
  Loader2,
  Star,
  Award,
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
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type LoyaltyMember = {
  id: string;
  customerName: string;
  phone: string;
  shopId: string;
  shopName: string;
  shopCategory: string;
  points: number;
  tier: string;
  totalSpent: number;
  joinedAt: string;
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bronze: { label: 'برونزي', color: 'text-amber-700', bg: 'bg-amber-100' },
  silver: { label: 'فضي', color: 'text-slate-600', bg: 'bg-slate-200' },
  gold: { label: 'ذهبي', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  platinum: { label: 'بلاتيني', color: 'text-purple-600', bg: 'bg-purple-100' },
};

export default function SalesLoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTier, setFilterTier] = useState('all');
  const [filterShop, setFilterShop] = useState('all');
  const [shops, setShops] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [addPointsModal, setAddPointsModal] = useState(false);
  const [addPointsMember, setAddPointsMember] = useState<string>('');
  const [addPointsAmount, setAddPointsAmount] = useState('');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      // Load all shops for the filter
      const shopsRes = await apiRequest('/shops');
      const shopsList = Array.isArray(shopsRes)
        ? shopsRes
        : shopsRes?.shops || shopsRes?.data || [];
      setShops(shopsList);

      // Load members from current shop (in production, this would load from all shops)
      const shopData = await apiRequest('/shops/me');
      const currentShopId = shopData?.id;
      if (!currentShopId) {
        setLoading(false);
        return;
      }
      const res = await apiRequest(`/customers/shop/${currentShopId}`);
      const customers = Array.isArray(res) ? res : res?.data || [];
      setMembers(
        customers.map((c: any) => ({
          id: String(c.id),
          customerName: c.name || c.customerName || '---',
          phone: c.phone || c.phoneNumber || '---',
          shopId: currentShopId,
          shopName: shopData?.name || 'المتجر',
          shopCategory: shopData?.category || 'RETAIL',
          points: Number(c.loyaltyPoints || c.points || 0),
          tier: c.tier || 'bronze',
          totalSpent: Number(c.totalSpent || c.totalOrders || 0),
          joinedAt: c.createdAt || new Date().toISOString(),
        }))
      );
    } catch {
      setMembers([]);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Get shop data for category-based customization
  const { shop } = useShop();
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';

  const filtered = useMemo(() => {
    let result = members.filter(
      (m) =>
        m.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.phone.includes(debouncedSearch)
    );

    if (filterTier !== 'all') {
      result = result.filter((m) => m.tier === filterTier);
    }

    if (filterShop !== 'all') {
      result = result.filter((m) => m.shopId === filterShop);
    }

    result = [...result].sort((a, b) => {
      const aVal = sortBy === 'points' ? a.points : a.totalSpent;
      const bVal = sortBy === 'points' ? b.points : b.totalSpent;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [members, debouncedSearch, filterTier, filterShop, sortBy, sortOrder]);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedMembers.length && paginatedMembers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedMembers.map((m) => m.id)));
    }
  }, [selectedIds, paginatedMembers]);

  const toggleSelect = useCallback(
    (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedIds(newSet);
    },
    [selectedIds]
  );

  const exportCSV = useCallback(() => {
    const headers = ['Customer Name', 'Phone', 'Points', 'Tier', 'Total Spent', 'Joined At'];
    const rows = filtered.map((m) => [
      m.customerName,
      m.phone,
      m.points,
      m.tier,
      m.totalSpent,
      m.joinedAt,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'loyalty_members.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'loyalty_members.csv');
    });
  }, [filtered]);

  const bulkAddPoints = useCallback(() => {
    const amount = prompt('Enter points to add to selected members:');
    if (amount && !isNaN(Number(amount))) {
      alert(`Adding ${amount} points to ${selectedIds.size} members`);
      // TODO: Implement API call to bulk add points
    }
  }, [selectedIds]);

  const bulkUpgradeTier = useCallback(() => {
    const tier = prompt('Enter new tier (bronze, silver, gold, platinum):');
    if (tier && ['bronze', 'silver', 'gold', 'platinum'].includes(tier)) {
      alert(`Upgrading ${selectedIds.size} members to ${tier}`);
      // TODO: Implement API call to bulk upgrade tier
    }
  }, [selectedIds]);

  const stats = useMemo(() => {
    const totalPoints = members.reduce((s, m) => s + m.points, 0);
    return [
      {
        label: 'إجمالي الأعضاء',
        value: members.length,
        icon: Gift,
        color: 'bg-blue-50 text-blue-600',
      },
      {
        label: 'إجمالي النقاط',
        value: totalPoints.toLocaleString(),
        icon: Star,
        color: 'bg-yellow-50 text-yellow-600',
      },
      {
        label: 'أعضاء ذهبيين',
        value: members.filter((m) => m.tier === 'gold').length,
        icon: Award,
        color: 'bg-amber-50 text-amber-600',
      },
      {
        label: 'أعضاء بلاتيني',
        value: members.filter((m) => m.tier === 'platinum').length,
        icon: Star,
        color: 'bg-purple-50 text-purple-600',
      },
    ];
  }, [members]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Gift size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">ولاء العملاء</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">
            {isRestaurant ? 'برنامج نقاط الولاء للزبائن' : 'برنامج نقاط الولاء للعملاء'}
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
            onClick={() => setAddPointsModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
          >
            <Plus size={18} />
            إضافة نقاط
          </button>
        </div>
        <button
          onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all ${
            loyaltyEnabled
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {loyaltyEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {loyaltyEnabled ? 'مفعّل' : 'معطّل'}
        </button>
      </div>

      {/* Disabled State */}
      {!loyaltyEnabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <X size={20} />
            <span className="font-bold text-sm">نظام نقاط الولاء معطّل حالياً</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">قم بتفعيل النظام لبدء إدارة نقاط الولاء</p>
        </div>
      )}

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

      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-300" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* Advanced Filters */}
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
          <span className="text-sm font-bold text-slate-400">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="points">النقاط</option>
            <option value="totalSpent">إجمالي الإنفاق</option>
          </select>
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
        >
          {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]">
          <span className="text-sm font-bold text-slate-900">{selectedIds.size} عضو محدد</span>
          <button
            onClick={bulkAddPoints}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
          >
            <Plus size={18} />
            إضافة نقاط
          </button>
          <button
            onClick={bulkUpgradeTier}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all"
          >
            <Award size={18} />
            ترقية المستوى
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-2 rounded-lg hover:bg-slate-200 transition-all"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Gift size={48} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 font-bold text-sm">لا يوجد أعضاء بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b border-slate-100">
                <th className="p-4 font-bold text-slate-400 w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === paginatedMembers.length && paginatedMembers.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                </th>
                <th className="p-4 font-bold text-slate-400">العميل</th>
                <th className="p-4 font-bold text-slate-400">الهاتف</th>
                <th className="p-4 font-bold text-slate-400">المتجر</th>
                <th className="p-4 font-bold text-slate-400">النقاط</th>
                <th className="p-4 font-bold text-slate-400">المستوى</th>
                <th className="p-4 font-bold text-slate-400">إجمالي الإنفاق</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((m) => {
                const tier = TIER_CONFIG[m.tier] || TIER_CONFIG.bronze;
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 ${selectedIds.has(m.id) ? 'bg-[#00E5FF]/5' : ''}`}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900">{m.customerName}</td>
                    <td className="p-4 text-slate-500" dir="ltr">
                      {m.phone}
                    </td>
                    <td className="p-4 text-xs text-slate-600 flex items-center gap-1">
                      <Gift size={12} />
                      {m.shopName}
                    </td>
                    <td className="p-4 font-bold text-yellow-600">{m.points.toLocaleString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold ${tier.bg} ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      ج.م {m.totalSpent.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400">عرض:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm font-bold text-slate-400">
              من {(currentPage - 1) * itemsPerPage + 1} إلى{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} من {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>
        </div>
      )}
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
              <h2 className="text-xl font-black text-slate-900">دليل ولاء العملاء</h2>
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
                  إدارة ومتابعة برنامج نقاط الولاء للعملاء، تتبع مستويات العضوية (برونزي، فضي، ذهبي،
                  بلاتيني) ونقاط كل عميل.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  عند الحاجة لمراجعة نقاط العملاء، متابعة المستويات، وتحليل سلوك العملاء المخلصين.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات (إجمالي الأعضاء، النقاط، الأعضاء الذهبيين، البلاتينيين)</li>
                  <li>• جدول بجميع أعضاء برنامج الولاء</li>
                  <li>• بحث بالاسم أو رقم الهاتف</li>
                  <li>• مستويات العضوية (برونزي، فضي، ذهبي، بلاتيني)</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيفية العمل</h3>
                </div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع الإحصائيات لفهم حجم البرنامج</li>
                  <li>2. استخدم البحث للعثور على عميل محدد</li>
                  <li>3. تابع نقاط ومستوى كل عميل في الجدول</li>
                  <li>4. حلل إجمالي إنفاق العملاء لتحديد أفضل العملاء</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• راجع نقاط العملاء بانتظام لتحديث المكافآت</li>
                  <li>• ركز على العملاء الذهبيين والبلاتينيين للحملات التسويقية</li>
                  <li>• استخدم بيانات الإنفاق لتحسين عروض الولاء</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900">نصائح</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• العملاء البلاتينيون هم الأكثر قيمة — حافظ عليهم</li>
                  <li>• استخدم البحث بالهاتف للوصول السريع للعميل</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• المبيعات</li>
                  <li>• المدفوعات</li>
                  <li>• الاشتراكات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {addPointsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAddPointsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إضافة نقاط</h2>
              <button
                onClick={() => setAddPointsModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">العميل</label>
                <select
                  value={addPointsMember}
                  onChange={(e) => setAddPointsMember(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">اختر العميل</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.customerName} - {m.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">عدد النقاط</label>
                <input
                  type="number"
                  value={addPointsAmount}
                  onChange={(e) => setAddPointsAmount(e.target.value)}
                  placeholder="أدخل عدد النقاط"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <button
                onClick={() => {
                  if (addPointsMember && addPointsAmount) {
                    alert(`Adding ${addPointsAmount} points to member ${addPointsMember}`);
                    // TODO: Implement API call to add points
                    setAddPointsModal(false);
                    setAddPointsMember('');
                    setAddPointsAmount('');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00E5FF] text-slate-900 font-bold text-sm hover:bg-[#00B8CC] transition-all"
              >
                <Plus size={18} />
                إضافة النقاط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
