'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import {
  Smartphone,
  CreditCard,
  CheckCircle2,
  XCircle,
  Zap,
  X,
  Info,
  Target,
  BookOpen,
  Zap as ZapIcon,
  Link2,
  ClipboardList,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';

/**
 * Market-launch switch: payment gateways are deferred (cash on delivery only at
 * launch), so this finance page is local-only and falls back to sales in
 * production builds.
 */
export default function SalesEpaymentPage() {
  const router = useRouter();
  useEffect(() => {
    if (HIDE_UNPUBLISHED) router.replace('/dashboard/sales');
  }, [router]);
  if (HIDE_UNPUBLISHED) return null;
  return <SalesEpaymentContent />;
}

function SalesEpaymentContent() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  // New state variables
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/shops/me');
        setShop(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const gateways = [
    {
      id: 'stripe',
      name: 'Stripe',
      nameAr: 'سترايب',
      icon: CreditCard,
      connected: shop?.paymentConfig?.stripe?.enabled || false,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      nameAr: 'باي بال',
      icon: CreditCard,
      connected: shop?.paymentConfig?.paypal?.enabled || false,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'fawry',
      name: 'Fawry',
      nameAr: 'فوري',
      icon: Smartphone,
      connected: shop?.paymentConfig?.fawry?.enabled || false,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'vodafone_cash',
      name: 'Vodafone Cash',
      nameAr: 'فودافون كاش',
      icon: Smartphone,
      connected: shop?.paymentConfig?.vodafoneCash?.enabled || false,
      color: 'bg-red-50 text-red-600',
    },
    {
      id: 'instapay',
      name: 'InstaPay',
      nameAr: 'إنستا باي',
      icon: Smartphone,
      connected: shop?.paymentConfig?.instapay?.enabled || false,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      nameAr: 'الدفع عند الاستلام',
      icon: CreditCard,
      connected: shop?.paymentConfig?.cod?.enabled || false,
      color: 'bg-green-50 text-green-600',
    },
  ];

  // Filter and sort gateways
  const filteredGateways = gateways.filter((g) => {
    if (filterStatus === 'connected') return g.connected;
    if (filterStatus === 'disconnected') return !g.connected;
    return true;
  });

  const sortedGateways = [...filteredGateways].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc'
        ? a.nameAr.localeCompare(b.nameAr)
        : b.nameAr.localeCompare(a.nameAr);
    }
    if (sortBy === 'status') {
      return sortOrder === 'asc'
        ? a.connected === b.connected
          ? 0
          : a.connected
            ? 1
            : -1
        : a.connected === b.connected
          ? 0
          : a.connected
            ? -1
            : 1;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedGateways.length / itemsPerPage);
  const paginatedGateways = sortedGateways.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handler functions
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedGateways.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedGateways.map((g) => g.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const bulkEnable = () => {
    console.log('Enabling gateways:', selectedIds);
    // TODO: Implement bulk enable API call
    setSelectedIds([]);
  };

  const bulkDisable = () => {
    console.log('Disabling gateways:', selectedIds);
    // TODO: Implement bulk disable API call
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Arabic Name', 'Status'];
    const rows = gateways.map((g) => [
      g.id,
      g.name,
      g.nameAr,
      g.connected ? 'Connected' : 'Disconnected',
    ]);

    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: 'payment-gateways.csv', headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, 'payment-gateways.csv');
    });
  };

  const testConnection = () => {
    console.log('Testing connection...');
    // TODO: Implement connection test
  };

  // Get shop data for category-based customization
  const { shop: useShopData } = useShop();
  const currentShop = shop || useShopData;
  const shopCategory = currentShop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL';

  const openConfigModal = (gateway: any) => {
    setSelectedGateway(gateway);
    setConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setSelectedGateway(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Zap size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الدفع الإلكتروني</h1>
            <button
              onClick={() => setGuideOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="معلومات / Info"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">
            {isRestaurant ? 'إدارة بوابات الدفع للمطعم' : 'إدارة بوابات الدفع الإلكتروني'}
          </p>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-bold"
        >
          <Download size={16} />
          تصدير CSV
        </button>
        <button
          onClick={testConnection}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-bold"
        >
          <Zap size={16} />
          اختبار الاتصال
        </button>
      </div>

      {/* Advanced Filters Section */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">تصفية:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="all">الكل</option>
          <option value="connected">متصل</option>
          <option value="disconnected">غير متصل</option>
        </select>
        <div className="flex items-center gap-2 mr-4">
          <ArrowUpDown size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">ترتيب:</span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="name">الاسم</option>
          <option value="status">الحالة</option>
        </select>
        <button
          onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
        >
          {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Bulk Actions Section */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 text-white">
          <span className="text-sm font-bold">تم تحديد {selectedIds.length} بوابة</span>
          <div className="flex gap-2 mr-auto">
            <button
              onClick={bulkEnable}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 transition-all text-sm font-bold"
            >
              <Check size={16} />
              تفعيل الكل
            </button>
            <button
              onClick={bulkDisable}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 transition-all text-sm font-bold"
            >
              <X size={16} />
              تعطيل الكل
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
          <div className="p-2 rounded-xl bg-green-50 text-green-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">بوابات متصلة</p>
            <p className="text-lg font-black text-slate-900">
              {gateways.filter((g) => g.connected).length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">بوابات متاحة</p>
            <p className="text-lg font-black text-slate-900">{gateways.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedGateways.map((g) => (
          <div
            key={g.id}
            className={`p-4 rounded-2xl border transition-colors ${
              selectedIds.includes(g.id)
                ? 'border-[#00E5FF] bg-[#00E5FF]/5'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(g.id)}
                  onChange={() => toggleSelect(g.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#00E5FF] focus:ring-[#00E5FF]"
                />
                <div className={`p-3 rounded-xl ${g.color}`}>
                  <g.icon size={24} />
                </div>
              </div>
              {g.connected ? (
                <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                  <CheckCircle2 size={14} /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <XCircle size={14} /> غير متصل
                </span>
              )}
            </div>
            <h4 className="font-black text-sm mb-1 text-slate-900">{g.nameAr}</h4>
            <p className="text-xs text-slate-400 mb-3">بوابة دفع إلكتروني</p>
            <button
              onClick={() => openConfigModal(g)}
              className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${g.connected ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {g.connected ? 'إعدادات' : 'ربط'}
            </button>
          </div>
        ))}
      </div>

      {/* Pagination Section */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, sortedGateways.length)} من {sortedGateways.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                  currentPage === page
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              التالي
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
              <h2 className="text-xl font-black text-slate-900">دليل الدفع الإلكتروني</h2>
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
                  إدارة وربط بوابات الدفع الإلكتروني للمتجر، تفعيل أو تعطيل البوابات المتاحة،
                  ومتابعة حالة الاتصال لكل بوابة.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  عند الحاجة لربط بوابة دفع جديدة، تعطيل بوابة موجودة، أو مراجعة حالة بوابات الدفع
                  في المتجر.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات (بوابات متصلة، بوابات متاحة)</li>
                  <li>
                    • بطاقات لكل بوابة دفع (سترايب، باي بال، فوري، فودافون كاش، إنستا باي، الدفع عند
                    الاستلام)
                  </li>
                  <li>• حالة الاتصال لكل بوابة (متصل / غير متصل)</li>
                  <li>• أزرار ربط أو إعدادات لكل بوابة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيفية العمل</h3>
                </div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع البوابات المتاحة في البطاقات</li>
                  <li>2. اضغط "ربط" لتفعيل بوابة دفع جديدة</li>
                  <li>3. اضغط "إعدادات" لتعديل بوابة متصلة</li>
                  <li>4. تابع حالة الاتصال في الإحصائيات</li>
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ZapIcon size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• فعّل أكثر من بوابة دفع لزيادة خيارات العملاء</li>
                  <li>• تأكد من صحة إعدادات كل بوابة قبل التفعيل</li>
                  <li>• راجع حالة البوابات بانتظام للتأكد من استمرار الاتصال</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ZapIcon size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900">نصائح</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• بوابة الدفع عند الاستلام مناسبة للأسواق المحلية</li>
                  <li>• استخدم بوابات متعددة لتقليل احتمالية فشل الدفع</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• المدفوعات</li>
                  <li>• المبيعات</li>
                  <li>• حالة الطلب</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {configModalOpen && selectedGateway && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeConfigModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900">
                {selectedGateway.connected ? 'إعدادات' : 'ربط'} {selectedGateway.nameAr}
              </h2>
              <button onClick={closeConfigModal} className="p-2 hover:bg-slate-50 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${selectedGateway.color} flex items-center gap-3`}>
                <selectedGateway.icon size={32} />
                <div>
                  <h3 className="font-black text-slate-900">{selectedGateway.nameAr}</h3>
                  <p className="text-sm text-slate-600">{selectedGateway.name}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">مفتاح API</label>
                  <input
                    type="text"
                    placeholder="أدخل مفتاح API"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">مفتاح السر</label>
                  <input
                    type="password"
                    placeholder="أدخل مفتاح السر"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
                  />
                </div>
              </div>
              <button
                onClick={closeConfigModal}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
              >
                {selectedGateway.connected ? 'حفظ التغييرات' : 'ربط البوابة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
