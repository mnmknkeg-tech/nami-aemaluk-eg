'use client';

import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  EyeOff,
  Eye,
  Globe,
  Smartphone,
  Loader2,
  Search,
  Package,
  X,
  Info,
  Target,
  BookOpen,
  Zap,
  Link2,
  ClipboardList,
  CheckCircle2,
  Download,
  Upload,
  ArrowUpDown,
  MoreHorizontal,
  Lock,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useInstalledApps } from '@/hooks/useInstalledApps';
import { useRouter } from 'next/navigation';
import { PRODUCT_TYPES } from '@/config/productTypes';
import ImageMapEditorModal from '@/components/apps/image-editor/ImageMapEditor';
import ExportMenu from '@/components/common/ExportMenu';
import {
  parseSpreadsheetFile,
  buildProductImportPreview,
  importProductsInChunks,
  downloadProductTemplate,
  type ProductImportPreview as ImportPreview,
  type ImportProgress,
} from '@/lib/importer';
import { SectionTabs, useInvSectionTab } from '@/components/inventory/InventoryShell';
import CategoriesView from '@/components/inventory/views/CategoriesView';
import VariantsView from '@/components/inventory/views/VariantsView';
import BrandsView from '@/components/inventory/views/BrandsView';
import BarcodeView from '@/components/inventory/views/BarcodeView';

type Product = {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category?: string | { name?: string; id?: string };
  imageUrl?: string;
  image_url?: string;
  description?: string;
  isActive?: boolean;
  appActive?: boolean;
  unit?: string;
  colors?: any[];
  sizes?: any[];
  createdAt?: string;
};

const PRODUCT_SECTION_TABS = [
  { id: 'products', label: 'المنتجات' },
  { id: 'categories', label: 'الفئات' },
  { id: 'brands', label: 'العلامات التجارية' },
  { id: 'variants', label: 'المتغيرات' },
  { id: 'barcode', label: 'الباركود والطباعة' },
];

function getProductEditPath(product: Product): string {
  const ex = (product as any).extraData || (product as any).extra_data || {};
  const unit = String(product.unit || '').toLowerCase();
  const cat =
    typeof product.category === 'string' ? product.category : product.category?.name || '';

  if (unit === 'service' || ex.isService || ex.orderFormFields?.length) {
    return `/dashboard/inventory/add-product/service?edit=${product.id}`;
  }
  if (unit === 'booking' || ex.isBooking || ex.bookingSettings) {
    return `/dashboard/inventory/add-product/bookings?edit=${product.id}`;
  }
  if (unit === 'bundle' || ex.isBundle || ex.bundleItems?.length || ex.customSections?.length) {
    return `/dashboard/inventory/add-product/bundle?edit=${product.id}`;
  }
  if (unit === 'giftcard' || ex.codeType || ex.digitalCodes?.length) {
    return `/dashboard/inventory/add-product/giftcard?edit=${product.id}`;
  }
  if (unit === 'digital' || ex.isDigital || ex.digitalFiles?.length) {
    return `/dashboard/inventory/add-product/digital?edit=${product.id}`;
  }
  if (unit === 'meal' || unit === 'restaurant' || /أكل|مأكولات|مشروبات|وجب|مطعم/i.test(cat)) {
    return `/dashboard/inventory/add-product/restaurant?edit=${product.id}`;
  }
  return `/dashboard/inventory/add-product/clothing?edit=${product.id}`;
}

function ProductsPageContent() {
  const { shop } = useShop();
  const { isInstalled } = useInstalledApps();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [shopId, setShopId] = useState('');
  const [togglingId, setTogglingId] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [visibilityMenu, setVisibilityMenu] = useState<{
    productId: string;
    x: number;
    y: number;
    buttonHeight: number;
  } | null>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importRunning, setImportRunning] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockTab, setStockTab] = useState<'all' | 'visible' | 'hidden' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'newest'>('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [showImageMapModal, setShowImageMapModal] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addonItems, setAddonItems] = useState<any[]>([]);
  const [savingAddons, setSavingAddons] = useState(false);
  const [activeTab, setTab] = useInvSectionTab(
    PRODUCT_SECTION_TABS.map((t) => t.id),
    'products'
  );

  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL' || !isRestaurant;
  // Image map editor is available for every non-restaurant shop (mirrors legacy dashboard).
  const canUseImageMapEditor = !isRestaurant && Boolean(String(shop?.id || '').trim());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) {
        setError('لم يتم العثور على المتجر');
        setLoading(false);
        return;
      }
      setShopId(sid);
      const data = await apiRequest(`/products/manage/by-shop/${sid}?limit=200`);
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'فشل تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const cats = new Map<string, string>();
    list.forEach((p: any) => {
      const catName = p?.category?.name;
      const catId = String(p?.category?.id || catName || '').trim();
      if (catId && !cats.has(catId)) {
        cats.set(catId, String(catName || catId));
      }
    });
    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? products : [];

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((p: any) => {
        const name = String(p?.name || '').toLowerCase();
        const cat = String(p?.category?.name || '').toLowerCase();
        const desc = String(p?.description || '').toLowerCase();
        return name.includes(q) || cat.includes(q) || desc.includes(q);
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((p: any) => {
        const catId = String(p?.category?.id || '').trim();
        const catName = String(p?.category?.name || '').trim();
        return catId === categoryFilter || catName === categoryFilter;
      });
    }

    // Status tab (معروض = ظاهر على أي سطح — الموقع أو التطبيق)
    if (stockTab === 'visible') {
      result = result.filter((p) => p.isActive !== false || p.appActive !== false);
    } else if (stockTab === 'hidden') {
      result = result.filter((p) => p.isActive === false && p.appActive === false);
    } else if (stockTab === 'low') {
      result = result.filter((p) => Number(p.stock ?? 999) <= 5);
    }

    // Sort
    result = [...result].sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = String(a?.name || '').localeCompare(String(b?.name || ''), 'ar');
      } else if (sortBy === 'price') {
        comparison = Number(a?.price || 0) - Number(b?.price || 0);
      } else if (sortBy === 'stock') {
        comparison = Number(a?.stock ?? 0) - Number(b?.stock ?? 0);
      } else if (sortBy === 'newest') {
        comparison =
          Number(b?.createdAt ? new Date(b.createdAt).getTime() : 0) -
          Number(a?.createdAt ? new Date(a.createdAt).getTime() : 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, search, categoryFilter, stockTab, sortBy, sortOrder]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(
      (p) => p.isActive !== false || p.appActive !== false
    ).length;
    const lowStock = products.filter((p) => Number(p.stock ?? 999) <= 5).length;
    const value = products.reduce((s, p) => s + Number(p.price || 0) * Number(p.stock || 0), 0);
    return { total, active, lowStock, value };
  }, [products]);

  // التحكم في ظهور المنتج على كل سطح لوحده: الموقع (is_active) والتطبيق (app_active).
  // إخفاء = إطفاء السطحين مع بعض.
  const handleVisibility = useCallback(
    async (product: Product, patch: { isActive?: boolean; appActive?: boolean }) => {
      setTogglingId(product.id);
      try {
        await apiRequest(`/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...patch } : p))
        );
      } catch (err: any) {
        setError(err?.message || 'فشل تحديث الحالة');
      } finally {
        setTogglingId('');
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err?.message || 'فشل الحذف');
    }
  }, []);

  const handleImportFile = async (file: File) => {
    setError('');
    setImportFileName(file.name);
    setImportParsing(true);
    try {
      const table = await parseSpreadsheetFile(file);
      const preview = buildProductImportPreview(table);
      if (preview.missingRequired.length > 0) {
        setError(
          `الملف ناقص أعمدة إلزامية: ${preview.missingRequired.join('، ')} — نزّل القالب للتأكد من التنسيق`
        );
        return;
      }
      if (preview.valid.length === 0) {
        setError('لا توجد صفوف صالحة في الملف — راجع الأخطاء في المعاينة');
        setImportPreview(preview);
        return;
      }
      setImportPreview(preview);
    } catch (err: any) {
      setError(err?.message || 'تعذر قراءة الملف');
    } finally {
      setImportParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || !shopId) return;
    setImportRunning(true);
    setImportProgress(null);
    try {
      const result = await importProductsInChunks(shopId, importPreview.valid, apiRequest, (p) =>
        setImportProgress(p)
      );
      setImportProgress(result);
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'فشل الاستيراد');
    } finally {
      setImportRunning(false);
    }
  };

  const closeImportModal = () => {
    if (importRunning) return;
    setImportPreview(null);
    setImportProgress(null);
  };

  // يجلب كل المنتجات من الباك-إند (كل الصفحات) لحظة التصدير — مش أول 200 بس
  const loadAllProductsForExport = useCallback(async () => {
    if (!shopId) return { headers: [], rows: [] };
    const pageSize = 200;
    const all: any[] = [];
    let page = 1;
    for (;;) {
      const data = await apiRequest(
        `/products/manage/by-shop/${shopId}?limit=${pageSize}&page=${page}`
      );
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      const arr = Array.isArray(list) ? list : [];
      all.push(...arr);
      if (arr.length < pageSize || page >= 100) break;
      page += 1;
    }
    return {
      sheetName: 'المنتجات',
      headers: ['name', 'price', 'stock', 'category', 'description', 'unit'],
      rows: all.map((p: any) => [
        String(p?.name ?? ''),
        Number(p?.price ?? 0),
        Number(p?.stock ?? 0),
        typeof p?.category === 'string' ? p?.category : String(p?.category?.name ?? 'عام'),
        String(p?.description ?? ''),
        String(p?.unit ?? ''),
      ]),
    };
  }, [shopId]);

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر بنفس هيكل قائمة الطلبات: عنوان + وصف — الإجراءات في الطرف المقابل */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">المنتجات</h1>
              <button
                onClick={() => setGuideOpen(true)}
                className="p-1 rounded-full text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="معلومات / Info"
              >
                <Info size={15} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة المنتجات والمخزون
              {stats.lowStock > 0 && (
                <span className="text-amber-600 font-semibold">
                  {' '}
                  — {stats.lowStock} منتج مخزونه منخفض
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'products' && (
              <>
                {isRestaurant && (
                  <button
                    onClick={() => setShowAddonsModal(true)}
                    className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5"
                  >
                    <Package size={14} />
                    الإضافات
                  </button>
                )}
                {/* تطبيق محرر الصور — يظهر فقط بعد تثبيته من صفحة التطبيقات */}
                {canUseImageMapEditor && isInstalled('image-editor') && (
                  <button
                    onClick={() => setShowImageMapModal(true)}
                    className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden sm:flex items-center gap-1.5"
                  >
                    <Target size={14} />
                    خريطة الصور
                  </button>
                )}
                <label className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                  {importParsing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  استيراد
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    disabled={importParsing}
                  />
                </label>
                <ExportMenu
                  filename="المنتجات"
                  label="تصدير"
                  headers={['name', 'price', 'stock', 'category', 'description', 'unit']}
                  rows={[]}
                  loadData={loadAllProductsForExport}
                  disabled={products.length === 0}
                  sheetName="المنتجات"
                />
                <button
                  onClick={() => downloadProductTemplate()}
                  className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hidden lg:flex items-center gap-1.5"
                  title="تنزيل قالب استيراد المنتجات (Excel)"
                >
                  <Download size={14} />
                  قالب
                </button>
                <div className="relative">
                  <button
                    onClick={() => setAddMenuOpen((v) => !v)}
                    className={`h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-colors ${
                      addMenuOpen
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Plus size={14} />
                    إضافة منتج
                  </button>
                  {/* بطاقة اختيار النوع — تفتح من تحت الزر */}
                  {addMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAddMenuOpen(false)} />
                      <div className="absolute top-12 left-0 z-40 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 max-h-[70vh] overflow-y-auto">
                        {PRODUCT_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              disabled={!type.available}
                              onClick={() => {
                                setAddMenuOpen(false);
                                if (type.href) router.push(type.href);
                              }}
                              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-right transition-colors ${
                                type.available
                                  ? 'hover:bg-slate-50 cursor-pointer'
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <span
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  type.id === 'clothing'
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-teal-50 text-teal-600'
                                }`}
                              >
                                <Icon size={16} />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {type.title}
                                  </span>
                                  {!type.available && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black shrink-0">
                                      قريباً
                                    </span>
                                  )}
                                </span>
                                <span className="block text-[10px] text-slate-400 truncate">
                                  {type.subtitle}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* تبويبات قسم المنتجات — الفئات والمتغيرات والباركود تابعة للمنتجات مش صفحات مستقلة */}
      <SectionTabs tabs={PRODUCT_SECTION_TABS} active={activeTab} onChange={setTab} />

      {activeTab !== 'products' && (
        <>
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'brands' && <BrandsView />}
          {activeTab === 'variants' && <VariantsView />}
          {activeTab === 'barcode' && <BarcodeView />}
        </>
      )}

      {activeTab === 'products' && (
        <>
          {error && (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[12px] font-bold">
                {error}
                <button onClick={() => setError('')} className="p-1 rounded hover:bg-red-100">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* شريط التشغيل بنفس هيكل الطلبات: تبويبات فوق — بحث وفلاتر تحت */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
            <div className="bg-white border border-slate-200 rounded-xl">
              {/* تبويبات الحالة */}
              <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'الكل', count: stats.total },
                    { id: 'visible', label: 'معروض', count: stats.active },
                    { id: 'hidden', label: 'مخفي', count: stats.total - stats.active },
                    { id: 'low', label: 'مخزون منخفض', count: stats.lowStock },
                  ] as const
                ).map((f) => {
                  const isActive = stockTab === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setStockTab(f.id);
                        setCurrentPage(1);
                      }}
                      className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {f.label}
                      <span
                        className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* بحث + فلاتر */}
              <div className="px-3 sm:px-4 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 border-t border-slate-100">
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="دوّر باسم المنتج أو الفئة…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pr-10 pl-4 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
                  >
                    <option value="all">كل الفئات</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-10 px-3 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 bg-white focus:outline-none"
                  >
                    <option value="newest">الأحدث أولاً</option>
                    <option value="name">الاسم</option>
                    <option value="price">السعر</option>
                    <option value="stock">المخزون</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                  >
                    <ArrowUpDown size={15} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products list */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Package size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-400 font-bold text-sm">لا توجد منتجات</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="col-span-2 text-right text-xs font-bold text-slate-500">
                      الصورة
                    </div>
                    <div className="col-span-4 text-right text-xs font-bold text-slate-500">
                      المنتج
                    </div>
                    <div className="col-span-1 text-right text-xs font-bold text-slate-500">
                      السعر
                    </div>
                    <div className="col-span-1 text-right text-xs font-bold text-slate-500">
                      المخزون
                    </div>
                    <div className="col-span-2 text-center text-xs font-bold text-slate-500">
                      الظهور
                    </div>
                    <div className="col-span-2 text-right text-xs font-bold text-slate-500">
                      إجراءات
                    </div>
                  </div>
                  {paginatedProducts.map((product) => {
                    const imgSrc = String(product.imageUrl || product.image_url || '').trim();
                    const onSite = product.isActive !== false;
                    const onApp = product.appActive !== false;
                    const isHiddenEverywhere = !onSite && !onApp;
                    const isBusy = togglingId === product.id;
                    const categoryName =
                      typeof product.category === 'string'
                        ? product.category
                        : product.category?.name || 'عام';

                    return (
                      <div
                        key={product.id}
                        className={`grid grid-cols-12 px-4 py-3 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors ${isHiddenEverywhere ? 'opacity-60' : ''}`}
                        onClick={() => {
                          if (visibilityMenu?.productId === product.id) setVisibilityMenu(null);
                        }}
                      >
                        <div className="col-span-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!imgSrc) return;
                              setPreviewImageSrc(imgSrc);
                            }}
                            className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package size={16} />
                              </div>
                            )}
                          </button>
                        </div>
                        <div className="col-span-4 pr-3 text-right min-w-0">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {product.name}
                          </div>
                          <div className="text-xs font-medium text-slate-400 mt-0.5">
                            {categoryName}
                          </div>
                        </div>
                        <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm truncate">
                          ج.م {Number(product.price || 0).toLocaleString()}
                        </div>
                        <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
                          <span className={Number(product.stock ?? 0) <= 5 ? 'text-amber-600' : ''}>
                            {product.stock ?? 0}
                          </span>
                        </div>

                        {/* ===== Visibility compact badge + dropdown ===== */}
                        <div className="col-span-2 flex items-center justify-center">
                          <div className="relative">
                            {/* Status indicator dots */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (visibilityMenu?.productId === product.id) {
                                  setVisibilityMenu(null);
                                  return;
                                }
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setVisibilityMenu({
                                  productId: product.id,
                                  x: rect.right,
                                  y: rect.bottom,
                                  buttonHeight: rect.height,
                                });
                              }}
                              disabled={isBusy}
                              title="إعدادات الظهور"
                              className={`h-8 px-2.5 rounded-xl flex items-center gap-2 border transition-all disabled:opacity-50 ${
                                isHiddenEverywhere
                                  ? 'bg-red-50 border-red-200 text-red-500'
                                  : onSite && onApp
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                              } hover:shadow-sm`}
                            >
                              {isBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      onSite ? 'bg-emerald-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      onApp ? 'bg-blue-500' : 'bg-slate-300'
                                    }`}
                                  />
                                </>
                              )}
                              <MoreHorizontal size={13} className="text-current opacity-60" />
                            </button>

                            {/* placeholder - dropdown is rendered via fixed portal below */}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => router.push(getProductEditPath(product))}
                            title="تعديل المنتج"
                            className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            title="حذف المنتج"
                            className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="text-sm text-slate-500">
                      عرض {(currentPage - 1) * itemsPerPage + 1} -{' '}
                      {Math.min(currentPage * itemsPerPage, filteredProducts.length)} من{' '}
                      {filteredProducts.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                      >
                        السابق
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                              currentPage === pageNum
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                      >
                        التالي
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-500">عرض</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <label className="text-sm text-slate-500">لكل صفحة</label>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setPreviewImageSrc('')}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">معاينة الصورة</h3>
              <button
                onClick={() => setPreviewImageSrc('')}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <img src={previewImageSrc} alt="Preview" className="w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Guide Dialog */}
      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">دليل المخزون</h2>
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
                  إدارة المنتجات والمخزون، إضافة وتعديل وحذف المنتجات، مع إمكانية الاستيراد والتصدير
                  بالجملة.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">متى تستخدمها</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  عند الحاجة لإضافة منتجات جديدة، تعديل الأسعار أو المخزون، أو تصدير قائمة المنتجات.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">ماذا ستجد داخلها</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• إحصائيات المخزون (إجمالي المنتجات، النشطة، منخفضة المخزون، القيمة)</li>
                  <li>• جدول بجميع المنتجات مع الصور والأسعار والمخزون</li>
                  <li>• بحث وفلترة حسب الفئة والترتيب</li>
                  <li>• إجراءات سريعة (إضافة، تعديل، حذف، تفعيل/تعطيل)</li>
                  <li>• استيراد وتصدير CSV</li>
                  <li>• ترقيم الصفحات</li>
                  {isRestaurant && <li>• إدارة الإضافات (للمطاعم)</li>}
                  {isRetail && (
                    <li>• محرر خريطة الصور (تطبيق اختياري — ثبّته من صفحة التطبيقات)</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">كيفية العمل</h3>
                </div>
                <ol className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>1. راجع إحصائيات المخزون لفهم الوضع الحالي</li>
                  <li>2. استخدم البحث للعثور على منتج محدد</li>
                  <li>3. استخدم الفلاتر لتضييق النتائج حسب الفئة</li>
                  <li>4. اضغط "إضافة منتج" لإضافة منتج جديد</li>
                  <li>5. استخدم أزرار الإجراءات لتعديل أو حذف المنتجات</li>
                  <li>6. استخدم الاستيراد/التصدير لإدارة المنتجات بالجملة</li>
                  {isRestaurant && (
                    <li>7. استخدم "إدارة الإضافات" لإضافة خيارات إضافية للمنتجات</li>
                  )}
                  {isRetail && (
                    <li>
                      7. ثبّت تطبيق "محرر الصور التفاعلي" من صفحة التطبيقات لتفعيل خريطة الصور
                    </li>
                  )}
                </ol>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">أفضل الممارسات</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• حافظ على تحديث المخزون بانتظام</li>
                  <li>• استخدم الفئات لتنظيم المنتجات بشكل أفضل</li>
                  <li>• راجع المنتجات منخفضة المخزون لإعادة التعبئة</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900">نصائح</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• استخدم الاستيراد بالجملة لإضافة العديد من المنتجات دفعة واحدة</li>
                  <li>• راجع الصور للتأكد من جودة العرض</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={18} className="text-slate-700" />
                  <h3 className="font-bold text-slate-900">روابط ذات صلة</h3>
                </div>
                <ul className="text-sm text-slate-600 space-y-1.5 pr-4">
                  <li>• الفئات</li>
                  <li>• المبيعات</li>
                  <li>• المخزون المنخفض</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Addons Modal (Restaurant only) */}
      {showAddonsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowAddonsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">إدارة الإضافات</h2>
              <button
                onClick={() => setShowAddonsModal(false)}
                className="p-2 hover:bg-slate-50 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 font-bold">إدارة الإضافات قيد التطوير</p>
              <p className="text-slate-400 text-sm mt-2">
                ستتمكن قريباً من إضافة وإدارة الإضافات للمنتجات
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal — معاينة ثم تقدم ثم نتيجة */}
      {importPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={closeImportModal}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h2 className="text-xl font-black text-slate-900">استيراد المنتجات</h2>
              <button
                onClick={closeImportModal}
                disabled={importRunning}
                className="p-2 hover:bg-slate-50 rounded-lg disabled:opacity-40"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* المرحلة 1: معاينة الملف */}
            {!importProgress && (
              <>
                <div className="mb-4 text-xs text-slate-500 font-semibold">
                  الملف: <span className="text-slate-900">{importFileName}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl border border-slate-200 p-3 text-center">
                    <div className="text-lg font-black text-slate-900">
                      {importPreview.totalRows}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">صفوف في الملف</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                    <div className="text-lg font-black text-emerald-700">
                      {importPreview.valid.length}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600">جاهزة للاستيراد</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                    <div className="text-lg font-black text-red-600">
                      {importPreview.invalid.length}
                    </div>
                    <div className="text-[10px] font-bold text-red-500">صفوف غير صالحة</div>
                  </div>
                </div>

                {/* مطابقة الأعمدة */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">مطابقة الأعمدة:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(importPreview.columnMap).map(([field, col]) => (
                      <span
                        key={field}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          col
                            ? 'bg-slate-100 text-slate-700'
                            : field === 'name' || field === 'price'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {field}: {col || 'غير موجود'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* أخطاء الصفوف */}
                {importPreview.invalid.length > 0 && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="text-[11px] font-bold text-red-600 mb-1.5">
                      صفوف سيتم تجاهلها ({importPreview.invalid.length}):
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importPreview.invalid.slice(0, 8).map((r) => (
                        <div key={r.rowNumber} className="text-[10px] text-red-500 font-semibold">
                          صف {r.rowNumber}
                          {r.name ? ` — ${r.name}` : ''}: {r.reason}
                        </div>
                      ))}
                      {importPreview.invalid.length > 8 && (
                        <div className="text-[10px] text-red-400 font-bold">
                          و{importPreview.invalid.length - 8} أخطاء أخرى…
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-start">
                  <button
                    onClick={confirmImport}
                    disabled={importPreview.valid.length === 0}
                    className="h-11 px-6 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700 disabled:opacity-40 flex items-center gap-2"
                  >
                    <Upload size={15} />
                    استيراد {importPreview.valid.length} منتج
                  </button>
                  <button
                    onClick={() => downloadProductTemplate()}
                    className="h-11 px-5 rounded-full border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    تنزيل القالب
                  </button>
                </div>
              </>
            )}

            {/* المرحلة 2: شريط التقدم */}
            {importProgress && importRunning && (
              <div className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 size={16} className="animate-spin text-slate-700" />
                  <span className="text-sm font-bold text-slate-900">
                    جاري الاستيراد… {importProgress.sent} من {importPreview.valid.length} منتج
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-teal-400 to-cyan-500 transition-all duration-300"
                    style={{
                      width: `${Math.round((importProgress.sent / Math.max(1, importPreview.valid.length)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-400">
                  دفعة {importProgress.doneChunks} من {importProgress.totalChunks} — جديد:{' '}
                  {importProgress.createdCount} / محدّث: {importProgress.updatedCount}
                </div>
              </div>
            )}

            {/* المرحلة 3: النتيجة */}
            {importProgress && !importRunning && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                  <span className="text-base font-black text-slate-900">انتهى الاستيراد</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                    <div className="text-lg font-black text-emerald-700">
                      {importProgress.createdCount}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600">منتج جديد</div>
                  </div>
                  <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center">
                    <div className="text-lg font-black text-cyan-700">
                      {importProgress.updatedCount}
                    </div>
                    <div className="text-[10px] font-bold text-cyan-600">تم تحديثه</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                    <div className="text-lg font-black text-red-600">
                      {importProgress.failedCount}
                    </div>
                    <div className="text-[10px] font-bold text-red-500">فشل</div>
                  </div>
                </div>
                {importProgress.errors.length > 0 && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 max-h-40 overflow-y-auto">
                    {importProgress.errors.slice(0, 10).map((e, i) => (
                      <div key={i} className="text-[10px] text-red-500 font-semibold">
                        صف {e.row}
                        {e.name ? ` — ${e.name}` : ''}: {e.reason}
                      </div>
                    ))}
                    {importProgress.errors.length > 10 && (
                      <div className="text-[10px] text-red-400 font-bold">
                        و{importProgress.errors.length - 10} أخطاء أخرى…
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setImportPreview(null);
                    setImportProgress(null);
                  }}
                  className="h-11 px-6 rounded-full bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-700"
                >
                  تم
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Map Editor Modal */}
      {showImageMapModal && shop && (
        <ImageMapEditorModal
          open={showImageMapModal}
          onClose={() => setShowImageMapModal(false)}
          shopId={shop.id}
          products={products}
          onProductsSynced={fetchProducts}
        />
      )}

      {/* ===== Visibility Dropdown Portal (fixed, escapes overflow) ===== */}
      {visibilityMenu && (() => {
        const p = products.find((x) => x.id === visibilityMenu.productId);
        if (!p) return null;
        const onSite = p.isActive ?? false;
        const onApp  = p.appActive ?? false;
        const isHiddenEverywhere = !onSite && !onApp;
        const isBusy = togglingId === p.id;

        // Position: align right edge of menu with right edge of button (RTL friendly)
        const menuWidth = 208; // w-52 = 13rem = 208px
        const left = visibilityMenu.x - menuWidth;
        const top  = visibilityMenu.y + 6;

        return (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setVisibilityMenu(null)}
            />
            <div
              className="fixed z-[9999] w-52 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
              style={{ top, left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                إعدادات الظهور
              </div>

              {/* Website toggle */}
              <button
                onClick={() => {
                  handleVisibility(p, { isActive: !onSite });
                  setVisibilityMenu(null);
                }}
                disabled={isBusy}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  onSite ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {onSite ? <Eye size={13} /> : <EyeOff size={13} />}
                </span>
                <span className="flex-1">
                  {onSite ? 'مرئي في الموقع' : 'مخفي من الموقع'}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  onSite ? 'bg-emerald-400' : 'bg-slate-300'
                }`} />
              </button>

              {/* App toggle — locked (coming soon) */}
              <div className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right opacity-50 cursor-not-allowed select-none">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <Lock size={13} />
                </span>
                <span className="flex-1">التطبيق — قريباً</span>
                <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md">قريباً</span>
              </div>

              <div className="border-t border-slate-100" />

              {/* Hide everywhere */}
              <button
                onClick={() => {
                  handleVisibility(p, { isActive: false, appActive: false });
                  setVisibilityMenu(null);
                }}
                disabled={isBusy || isHiddenEverywhere}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center shrink-0">
                  <EyeOff size={13} />
                </span>
                إخفاء من الكل
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

export default function InventoryProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
