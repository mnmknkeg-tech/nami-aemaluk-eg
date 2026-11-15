'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Sparkles,
  ArrowRight,
  Plus,
  Youtube,
  Upload,
  Check,
  TrendingDown,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Code,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import ExtendedProductSections, {
  defaultExtraData,
  ProductExtraData,
} from '@/components/products/ExtendedProductSections';
import ProductPickerModal from '../_bundle/ProductPickerModal';
import QuickCategoryModal from '../_bundle/QuickCategoryModal';
import BundleLivePreview from '../_bundle/BundleLivePreview';
import BundleGroupCard from '../_bundle/BundleGroupCard';
import type { AvailableProduct, BundleItem, CustomBundleSection } from '../_bundle/types';

import { compressForUpload } from '@/lib/upload-image';
import { uploadMediaFile } from '@/lib/api/upload';
export default function AddBundleProductPage() {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [brand, setBrand] = useState('');
  const [googleCategory, setGoogleCategory] = useState('ملابس وإكسسوارات');
  const [localCategory, setLocalCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bundle Core Settings
  const [bundleType, setBundleType] = useState<'fixed' | 'custom'>('fixed');
  // Fixed bundle items
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  // Custom bundle sections
  const [customSections, setCustomSections] = useState<CustomBundleSection[]>([
    {
      id: 'section-1',
      title: 'اختر المنتج الأساسي',
      minSelect: 1,
      maxSelect: 1,
      items: [],
    },
    {
      id: 'section-2',
      title: 'اختر الملحق أو الإضافة',
      minSelect: 1,
      maxSelect: 1,
      items: [],
    },
  ]);

  // Shop Products for Picker
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null); // null = fixed bundle

  // Extended Data (Advanced Info, Discounts, Channels, Purchase Options, Tags, Shipping, Inventory, SEO, Notifications, CustomFields)
  const [extraData, setExtraData] = useState<ProductExtraData>(() => ({
    ...defaultExtraData(),
    requiresShipping: true,
    unlimitedStock: true,
  }));

  // Quick Category
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit Mode
  const [editId, setEditId] = useState('');
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Interactive Live Preview Selection for Custom Bundles
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
    loadShopProducts();
    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam) loadProductForEdit(editParam);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadShopProducts = async () => {
    setLoadingProducts(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      const data = await apiRequest(`/products/manage/by-shop/${sid}?limit=200`).catch(() => []);
      const list = Array.isArray(data) ? data : data?.data || data?.products || [];
      setAvailableProducts(
        list.map((p: any) => ({
          id: String(p.id),
          name: String(p.name || ''),
          price: Number(p.price || 0),
          imageUrl: p.imageUrl || p.image_url || '',
          category: typeof p.category === 'string' ? p.category : p.category?.name || '',
          stock: p.stock ?? null,
        }))
      );
    } catch (err) {
      console.error('Failed to load shop products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadProductForEdit = async (id: string) => {
    setLoadingProduct(true);
    try {
      const data: any = await apiRequest(`/products/${id}`);
      const p = data?.data || data;
      if (!p || !p.id) throw new Error('المنتج غير موجود');
      setEditId(String(p.id));
      setName(String(p.name || ''));
      setDescription(String(p.description || ''));
      setPrice(p.price != null ? String(p.price) : '');
      setCategory(typeof p.category === 'string' ? p.category : String(p.category?.name || ''));
      setImageUrl(String(p.imageUrl || p.image_url || ''));
      setIsActive(p.isActive !== false);
      setBrand(String(p.brand || ''));

      const ex = (p.extraData || {}) as ProductExtraData & {
        bundleType?: 'fixed' | 'custom';
        bundleItems?: BundleItem[];
        customSections?: CustomBundleSection[];
      };
      setExtraData({ ...defaultExtraData(), ...ex });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setGoogleCategory(String(ex.googleCategory || 'ملابس وإكسسوارات'));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));

      if (ex.bundleType) setBundleType(ex.bundleType);
      if (Array.isArray(ex.bundleItems)) setBundleItems(ex.bundleItems);
      if (Array.isArray(ex.customSections) && ex.customSections.length > 0)
        setCustomSections(ex.customSections);
    } catch (err: any) {
      console.error('Failed to load bundle product for edit:', err);
      alert(err?.message || 'تعذر تحميل بيانات الباقة للتعديل');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleQuickAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, nameAr: trimmed, shopId: sid, status: 'active' }),
      });
      setNewCategoryName('');
      setShowQuickCategoryModal(false);
      await loadCategories();
      setCategory(trimmed);
    } catch {
      alert('حدث خطأ أثناء إضافة الفئة');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(await compressForUpload(file, 'product'));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Product Picker
  const handleOpenPicker = (sectionId: string | null = null) => {
    setTargetSectionId(sectionId);
    setProductSearch('');
    setShowProductPicker(true);
  };

  // Add Product (either to Fixed list or a Custom section)
  const handleAddProductToTarget = (prod: AvailableProduct) => {
    if (targetSectionId === null) {
      // Fixed bundle
      const exists = bundleItems.find((item) => item.productId === prod.id);
      if (exists) {
        setBundleItems((prev) =>
          prev.map((item) =>
            item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      } else {
        setBundleItems((prev) => [
          ...prev,
          {
            productId: prod.id,
            name: prod.name,
            price: prod.price,
            quantity: 1,
            imageUrl: prod.imageUrl,
          },
        ]);
      }
    } else {
      // Custom section
      setCustomSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== targetSectionId) return sec;
          const exists = sec.items.find((item) => item.productId === prod.id);
          if (exists) return sec;
          return {
            ...sec,
            items: [
              ...sec.items,
              {
                productId: prod.id,
                name: prod.name,
                price: prod.price,
                quantity: 1,
                imageUrl: prod.imageUrl,
              },
            ],
          };
        })
      );
    }
  };

  // Fixed Bundle Handlers
  const handleUpdateItemQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setBundleItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setBundleItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveBundleItem = (productId: string) => {
    setBundleItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Custom Bundle Section Handlers
  const handleAddCustomSection = () => {
    const newId = `section-${Date.now()}`;
    setCustomSections((prev) => [
      ...prev,
      {
        id: newId,
        title: `قسم جديد ${prev.length + 1}`,
        minSelect: 1,
        maxSelect: 1,
        items: [],
      },
    ]);
  };

  const handleUpdateSection = (sectionId: string, field: keyof CustomBundleSection, value: any) => {
    setCustomSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, [field]: value } : sec))
    );
  };

  const handleRemoveCustomSection = (sectionId: string) => {
    setCustomSections((prev) => prev.filter((sec) => sec.id !== sectionId));
  };

  const handleRemoveProductFromSection = (sectionId: string, productId: string) => {
    setCustomSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.filter((item) => item.productId !== productId) }
          : sec
      )
    );
  };

  // Pricing calculations
  const originalTotalPrice = useMemo(() => {
    if (bundleType === 'fixed') {
      return bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    // For custom bundle, sum up the average or minimum price of each section
    return customSections.reduce((sum, sec) => {
      if (sec.items.length === 0) return sum;
      const minItemPrice = Math.min(...sec.items.map((i) => i.price));
      return sum + minItemPrice * sec.minSelect;
    }, 0);
  }, [bundleType, bundleItems, customSections]);

  const bundleNumericPrice = useMemo(() => {
    const p = parseFloat(price);
    return isNaN(p) ? 0 : p;
  }, [price]);

  const savingsAmount = useMemo(() => {
    if (originalTotalPrice <= 0 || bundleNumericPrice <= 0) return 0;
    return Math.max(0, originalTotalPrice - bundleNumericPrice);
  }, [originalTotalPrice, bundleNumericPrice]);

  const savingsPercent = useMemo(() => {
    if (originalTotalPrice <= 0 || savingsAmount <= 0) return 0;
    return Math.round((savingsAmount / originalTotalPrice) * 100);
  }, [originalTotalPrice, savingsAmount]);

  const filteredShopProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [availableProducts, productSearch]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم الباقة');
      return;
    }
    if (!price || bundleNumericPrice < 0) {
      alert('يرجى إدخال سعر صحيح للباقة');
      return;
    }

    if (bundleType === 'fixed' && bundleItems.length < 2) {
      alert('يرجى اختيار منتجين على الأقل لتكوين الباقة الثابتة');
      return;
    }

    if (bundleType === 'custom') {
      const emptySections = customSections.filter((s) => s.items.length === 0);
      if (emptySections.length > 0) {
        alert(`يرجى إضافة منتجات في القسم "${emptySections[0].title}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const shopId = shopData?.id;
      if (!shopId) {
        alert('لم يتم العثور على المتجر');
        return;
      }

      let finalImageUrl = imageUrl;
      if (imageFile) {
        const finalUploadedUrl = await uploadMediaFile(imageFile, shopId);
        finalImageUrl = finalUploadedUrl || imageUrl;
      }

      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: bundleNumericPrice,
        category: category || 'باقة منتجات',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        unit: 'bundle',
        trackStock: extraData.trackInventory,
        stock: extraData.unlimitedStock ? 9999 : Number(extraData.stockQuantity || 0),
        ...(brand ? { brand } : {}),
        extraData: {
          ...extraData,
          costPrice: costPrice ? Number(costPrice) : null,
          brand: brand || undefined,
          googleCategory: googleCategory || undefined,
          localCategory: localCategory || undefined,
          youtubeUrl: youtubeUrl || undefined,
          isBundle: true,
          bundleType,
          bundleItems: bundleType === 'fixed' ? bundleItems : [],
          customSections: bundleType === 'custom' ? customSections : [],
          originalTotalPrice,
          savingsAmount,
          savingsPercent,
        },
      };

      if (editId) {
        await apiRequest(`/products/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
        alert('تم تحديث الباقة بنجاح');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        alert('تم إنشاء باقة المنتجات بنجاح');
      }
      router.push('/dashboard/inventory/products');
    } catch (err: any) {
      console.error('Failed to save bundle product:', err);
      alert(err?.message || 'فشل حفظ الباقة');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div
        className="min-h-screen bg-[#F4F5F7] flex items-center justify-center"
        style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
      >
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-bold">جاري تحميل بيانات الباقة للتعديل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F4F5F7]"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* ─── Top Header ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-16 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/dashboard/inventory/add-product')}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              title="رجوع لاختيار النوع"
            >
              <ArrowRight size={18} />
            </button>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {editId ? 'تعديل باقة منتجات' : 'إضافة باقة منتجات'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0">
                  متاحة في باقتك
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                جمّع عدة منتجات في عرض واحد لزيادة متوسط قيمة الطلب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard/inventory/products')}
              className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 sm:px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>{editId ? 'حفظ التعديلات' : 'حفظ الباقة'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-6">
        {/* Banner */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold">
              <Sparkles size={12} />
              <span>متاحة في باقتك</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">اجمع منتجاتك في باقات جذابة</h2>
            <p className="text-xs text-teal-100 leading-relaxed max-w-2xl">
              جمّع عدة منتجات في عرض واحد لزيادة متوسط قيمة الطلب. اعرض للعملاء باقات ثابتة أو مخصصة
              بخصم مميز يشجع على الشراء السريع.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ تجميع عدة منتجات في عرض واحد
              </span>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ تحفيز زيادة متوسط قيمة الطلب
              </span>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ منتجات تدعم حملاتك والمواسم
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold border border-white/20 flex items-center gap-1.5">
              <Package size={14} />
              <span>باقة منتجات</span>
            </span>
          </div>
        </div>

        {/* Two Columns: Form (Right/Main) + Sticky Preview (Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── Column 1: Form (lg:col-span-8) ─── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Basic Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">المعلومات الأساسية</h3>
                    <p className="text-[11px] text-slate-400">بيانات الباقة، الاسم، والصور</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <span>مفعلة بالمتجر</span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                </label>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  صورة الباقة ورابط الفيديو
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {imageUrl ? (
                      <div className="relative group w-full h-28">
                        <img
                          src={imageUrl}
                          alt="Bundle"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          تغيير الصورة
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
                          <Upload size={18} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">اسحب الصورة وأفلتها هنا</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          أو اضغط للاختيار من جهازك
                        </p>
                      </>
                    )}
                  </div>

                  {/* YouTube Link */}
                  <div className="flex flex-col justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Youtube size={16} className="text-red-500" />
                      <span>رابط فيديو يوتيوب (اختياري)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-slate-400">
                      يمكنك وضع رابط فيديو توضيحي لمحتويات الباقة والعرض
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المنتج <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: باقة العناية الشاملة، بوكس القهوة المختصة، باقة الشتاء"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="absolute left-3 top-2.5 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                    AR
                  </span>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      السعر <span className="text-red-500">*</span>
                    </label>
                    {originalTotalPrice > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrice(String(originalTotalPrice))}
                        className="text-[10px] text-teal-600 hover:underline font-bold"
                      >
                        استخدم السعر الفردي ({originalTotalPrice} ج.م)
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سعر التكلفة (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings notification bar */}
              {originalTotalPrice > 0 && bundleNumericPrice > 0 && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    savingsAmount > 0
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown
                      size={18}
                      className={savingsAmount > 0 ? 'text-emerald-600' : 'text-slate-400'}
                    />
                    <div>
                      <span className="font-bold">
                        {savingsAmount > 0 ? 'توفير جذاب للعميل:' : 'سعر الباقة مساوي للقطع:'}
                      </span>{' '}
                      {savingsAmount > 0 ? (
                        <span>
                          يوفر العميل <strong>{savingsAmount.toFixed(2)} ج.م</strong> (خصم{' '}
                          {savingsPercent}%) عن شراء المنتجات منفصلة.
                        </span>
                      ) : (
                        <span>لا يوجد خصم إضافي على الباقة حاليًا.</span>
                      )}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-[11px] text-slate-500 block">إجمالي القطع الفردية</span>
                    <span className="font-black line-through text-slate-400">
                      {originalTotalPrice.toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              )}

              {/* Categories & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">التصنيفات</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="text-[10px] text-teal-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} />
                      <span>إضافة تصنيف جديد</span>
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="">اختر التصنيفات...</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id || cat.name} value={cat.name || cat.nameAr}>
                        {cat.nameAr || cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    العلامة التجارية
                  </label>
                  <input
                    type="text"
                    placeholder="اختر العلامة التجارية أو اكتب اسمها"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Google & Local Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تصنيفات جوجل
                  </label>
                  <select
                    value={googleCategory}
                    onChange={(e) => setGoogleCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="ملابس وإكسسوارات">ملابس وإكسسوارات</option>
                    <option value="الصحة والجمال">الصحة والجمال</option>
                    <option value="المأكولات والمشروبات والتبغ">المأكولات والمشروبات والتبغ</option>
                    <option value="إلكترونيات">إلكترونيات</option>
                    <option value="الحديقة والمنزل">الحديقة والمنزل</option>
                    <option value="الأثاث">الأثاث</option>
                    <option value="الرضيع والطفل">الرضيع والطفل</option>
                    <option value="أجهزة">أجهزة</option>
                    <option value="وسائط">وسائط</option>
                    <option value="المركبات وقطع الغيار">المركبات وقطع الغيار</option>
                    <option value="المستلزمات المكتبية">المستلزمات المكتبية</option>
                    <option value="مستلزمات الحيوانات والحيوانات الأليفة">
                      مستلزمات الحيوانات والحيوانات الأليفة
                    </option>
                    <option value="الفن والترفيه">الفن والترفيه</option>
                    <option value="تجاري وصناعي">تجاري وصناعي</option>
                    <option value="كاميرات وأجهزة بصرية">كاميرات وأجهزة بصرية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تصنيف محلي
                  </label>
                  <input
                    type="text"
                    placeholder="تصنيف محلي (مثال: عروض نهاية الأسبوع، باقات رمضان)"
                    value={localCategory}
                    onChange={(e) => setLocalCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Description with Toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">وصف المنتج</label>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="محاذاة لليمين"
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="توسيط"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="محاذاة لليسار"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="ضبط"
                    >
                      <AlignJustify size={13} />
                    </button>
                    <span className="w-px h-3 bg-slate-300 mx-0.5" />
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded flex items-center gap-0.5"
                      title="HTML"
                    >
                      <Code size={13} />
                      <span className="text-[10px]">&lt;HTML/&gt;</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="اكتب وصفاً جذاباً للباقة، المنتجات المتضمنة وفائدة الحصول عليها كعرض مجمع..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
                  />
                  <span className="absolute left-3 bottom-3 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                    AR
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: مجموعة المنتجات (نوع المجموعة: ثابتة vs مخصصة) */}
            <BundleGroupCard
              bundleType={bundleType}
              setBundleType={setBundleType}
              bundleItems={bundleItems}
              customSections={customSections}
              originalTotalPrice={originalTotalPrice}
              onOpenPicker={handleOpenPicker}
              onUpdateItemQuantity={handleUpdateItemQuantity}
              onRemoveBundleItem={handleRemoveBundleItem}
              onAddCustomSection={handleAddCustomSection}
              onUpdateSection={handleUpdateSection}
              onRemoveCustomSection={handleRemoveCustomSection}
              onRemoveProductFromSection={handleRemoveProductFromSection}
            />

            {/* Extended Sections:
                - المعلومات المتقدمة (العنوان الفرعي، العنوان الترويجي مع متغيرات الخصم)
                - التخفيضات (السعر المخفض، بداية ونهاية التخفيض)
                - قنوات عرض المنتج (الموقع والتطبيق)
                - خيارات شراء المنتج (إرفاق ملف، ملاحظة، ضريبة القيمة المضافة)
                - الوسوم
                - الشحن (يتطلب شحن، لا يتطلب شحن)
                - المخزون (الوزن، SKU، باركود، MPN، GTIN، تحديد كمية الشراء)
                - بيانات SEO (عنوان الصفحة، رابط مخصص، وصف الصفحة)
                - الحقول المخصصة
                - الإشعارات (تنبيه قرب النفاد، أعلمني عند التوفر، النسبة)
            */}
            <ExtendedProductSections
              value={extraData}
              onChange={setExtraData}
              showShipping={true}
              showInventory={true}
              showNotifications={true}
              showQuantities={false}
              showProductOptions={false}
              showOrderForm={false}
              showFiles={false}
              showCalories={false}
            />
          </div>

          {/* ─── Column 2: Sticky Live Preview (lg:col-span-4) ─── */}
          <BundleLivePreview
            bundleType={bundleType}
            name={name}
            category={category}
            brand={brand}
            imageUrl={imageUrl}
            bundleNumericPrice={bundleNumericPrice}
            originalTotalPrice={originalTotalPrice}
            savingsAmount={savingsAmount}
            savingsPercent={savingsPercent}
            bundleItems={bundleItems}
            customSections={customSections}
            selectedCustomOptions={selectedCustomOptions}
            setSelectedCustomOptions={setSelectedCustomOptions}
          />
        </div>
      </main>

      {/* ─── Modal: Select Product From Store ─── */}
      {showProductPicker && (
        <ProductPickerModal
          targetSectionId={targetSectionId}
          bundleItems={bundleItems}
          customSections={customSections}
          products={filteredShopProducts}
          loadingProducts={loadingProducts}
          search={productSearch}
          onSearchChange={setProductSearch}
          onAddProduct={handleAddProductToTarget}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* ─── Quick Add Category Modal ─── */}
      {showQuickCategoryModal && (
        <QuickCategoryModal
          name={newCategoryName}
          onNameChange={setNewCategoryName}
          onCancel={() => setShowQuickCategoryModal(false)}
          onConfirm={handleQuickAddCategory}
        />
      )}
    </div>
  );
}
