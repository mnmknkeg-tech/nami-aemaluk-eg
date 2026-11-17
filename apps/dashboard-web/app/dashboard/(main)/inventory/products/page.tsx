'use client';

import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import EmptyState from '@/components/EmptyState';
import PageBack from '@/components/PageBack';
import { Plus, Info, Package, Loader2, Upload, Download, X } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useRouter } from 'next/navigation';
import { PRODUCT_TYPES } from '@/config/productTypes';
import ImageMapEditorModal from '@/components/apps/image-editor/ImageMapEditor';
import ExportMenu from '@/components/common/ExportMenu';
import {
  parseSpreadsheetFile,
  buildProductImportPreview,
  importProductsInChunks,
  downloadProductTemplate,
  PRODUCT_TEMPLATE_LABELS,
  type ProductImportPreview as ImportPreview,
  type ImportProgress,
  type ProductTemplateKind,
} from '@/lib/importer';
import { SectionTabs, useInvSectionTab } from '@/components/inventory/InventoryShell';
import CategoriesView from '@/components/inventory/views/CategoriesView';
import VariantsView from '@/components/inventory/views/VariantsView';
import BrandsView from '@/components/inventory/views/BrandsView';
import BarcodeView from '@/components/inventory/views/BarcodeView';
import { PRODUCT_SECTION_TABS, type Product, type VisibilityMenuState } from './_products/types';
import { getProductEditPath } from './_products/editPaths';
import ProductsFilterBar from './_products/ProductsFilterBar';
import ProductsTable from './_products/ProductsTable';
import ProductsPagination from './_products/ProductsPagination';
import ImagePreviewModal from './_products/ImagePreviewModal';
import InventoryGuideModal from './_products/GuideModal';
import AddonsModal from './_products/AddonsModal';
import ImportModal from './_products/ImportModal';
import VisibilityMenuPortal from './_products/VisibilityMenu';

function ProductsPageContent() {
  const { shop } = useShop();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [shopId, setShopId] = useState('');
  const [togglingId, setTogglingId] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const [visibilityMenu, setVisibilityMenu] = useState<VisibilityMenuState>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importRunning, setImportRunning] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockTab, setStockTab] = useState<'all' | 'visible' | 'hidden' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'newest'>('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addonItems, setAddonItems] = useState<any[]>([]);
  const [savingAddons, setSavingAddons] = useState(false);
  const shopCategory = shop?.category?.toUpperCase() || 'RETAIL';
  const isRestaurant = shopCategory === 'RESTAURANT';
  const isRetail = shopCategory === 'RETAIL' || !isRestaurant;
  // Image map editor is available for every shop (restaurants included) —
  // product photo editing applies to all categories.
  const canUseImageMapEditor = Boolean(String(shop?.id || '').trim());
  // تاب «محرر الصور» يظهر دائمًا في شريط قسم المنتجات لأي متجر مسجّل.
  const imageEditorInstalled = canUseImageMapEditor;
  const productSectionTabs = useMemo(
    () =>
      imageEditorInstalled
        ? [...PRODUCT_SECTION_TABS, { id: 'image-editor', label: 'محرر الصور' }]
        : PRODUCT_SECTION_TABS,
    [imageEditorInstalled]
  );
  const [activeTab, setTab] = useInvSectionTab(
    productSectionTabs.map((t) => t.id),
    'products'
  );

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
    const active = products.filter((p) => p.isActive !== false || p.appActive !== false).length;
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
        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...patch } : p)));
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
      headers: [
        'name',
        'price',
        'stock',
        'category',
        'description',
        'unit',
        'imageUrl',
        'images',
        'colors',
        'sizes',
        'addons',
        'menuVariants',
        'packOptions',
        'model3dUrl',
        'spinImages',
        'extraData',
        'furnitureMeta',
        'trackStock',
        'isActive',
        'appActive',
      ],
      rows: all.map((p: any) => [
        String(p?.name ?? ''),
        Number(p?.price ?? 0),
        Number(p?.stock ?? 0),
        typeof p?.category === 'string' ? p?.category : String(p?.category?.name ?? 'عام'),
        String(p?.description ?? ''),
        String(p?.unit ?? ''),
        String(p?.imageUrl ?? p?.image_url ?? ''),
        JSON.stringify(p?.images ?? []),
        JSON.stringify(p?.colors ?? []),
        JSON.stringify(p?.sizes ?? []),
        JSON.stringify(p?.addons ?? []),
        JSON.stringify(p?.menuVariants ?? []),
        JSON.stringify(p?.packOptions ?? []),
        String(p?.model3dUrl ?? ''),
        JSON.stringify(p?.spinImages ?? []),
        JSON.stringify(p?.extraData ?? {}),
        JSON.stringify(p?.furnitureMeta ?? {}),
        p?.trackStock !== false,
        p?.isActive !== false,
        p?.appActive !== false,
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
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PageBack fallback="/dashboard/inventory" title="رجوع إلى المخزون" />
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
                <div className="relative">
                  <button
                    onClick={() => setTemplateMenuOpen((v) => !v)}
                    className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    title="تنزيل قالب استيراد حسب نوع المنتج"
                  >
                    <Download size={14} />
                    قالب حسب النشاط
                  </button>
                  {templateMenuOpen && (
                    <div className="absolute z-30 top-12 left-0 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      {(Object.keys(PRODUCT_TEMPLATE_LABELS) as ProductTemplateKind[]).map(
                        (kind) => (
                          <button
                            key={kind}
                            onClick={() => {
                              downloadProductTemplate(kind);
                              setTemplateMenuOpen(false);
                            }}
                            className="w-full rounded-xl px-3 py-2 text-right text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                          >
                            {PRODUCT_TEMPLATE_LABELS[kind]}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
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
      <SectionTabs tabs={productSectionTabs} active={activeTab} onChange={setTab} />

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
          <ProductsFilterBar
            stats={stats}
            stockTab={stockTab}
            onStockTab={(id) => {
              setStockTab(id);
              setCurrentPage(1);
            }}
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={categories}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          {/* Products list */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Package size={32} className="text-slate-300" />}
                title="لا توجد منتجات"
                description="عدّل البحث أو الفلاتر أو أضف منتج جديد"
              />
            ) : (
              <>
                <ProductsTable
                  products={paginatedProducts}
                  togglingId={togglingId}
                  visibilityMenu={visibilityMenu}
                  setVisibilityMenu={setVisibilityMenu}
                  onEdit={(p) => router.push(getProductEditPath(p))}
                  onDelete={handleDelete}
                  onImagePreview={setPreviewImageSrc}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <ProductsPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalCount={filteredProducts.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(n) => {
                      setItemsPerPage(n);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImageSrc && (
        <ImagePreviewModal src={previewImageSrc} onClose={() => setPreviewImageSrc('')} />
      )}

      {/* Guide Dialog */}
      {guideOpen && (
        <InventoryGuideModal
          onClose={() => setGuideOpen(false)}
          isRestaurant={isRestaurant}
          isRetail={isRetail}
        />
      )}

      {/* Addons Modal (Restaurant only) */}
      {showAddonsModal && <AddonsModal onClose={() => setShowAddonsModal(false)} />}

      {/* Import Modal — معاينة ثم تقدم ثم نتيجة */}
      {importPreview && (
        <ImportModal
          preview={importPreview}
          progress={importProgress}
          running={importRunning}
          fileName={importFileName}
          onClose={closeImportModal}
          onConfirm={confirmImport}
          onDismiss={() => {
            setImportPreview(null);
            setImportProgress(null);
          }}
        />
      )}

      {/* تطبيق محرر الصور — صفحة كاملة داخل التاب المخصص بعد التثبيت */}
      {activeTab === 'image-editor' && shop && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-10">
          <ImageMapEditorModal
            variant="page"
            open
            onClose={() => setTab('products')}
            shopId={shop.id}
            products={products}
            onProductsSynced={fetchProducts}
          />
        </div>
      )}

      {/* ===== Visibility Dropdown Portal (fixed, escapes overflow) ===== */}
      <VisibilityMenuPortal
        menu={visibilityMenu}
        products={products}
        togglingId={togglingId}
        onToggle={handleVisibility}
        onClose={() => setVisibilityMenu(null)}
      />
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
