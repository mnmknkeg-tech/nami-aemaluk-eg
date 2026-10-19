'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Package,
  Plus,
  Trash2,
  X,
  ArrowRight,
  Loader2,
  Save,
  Upload,
  Image as ImageIcon,
  Map,
  Info,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useInstalledApps } from '@/hooks/useInstalledApps';
import ExtendedProductSections, {
  type ProductExtraData,
  defaultExtraData,
} from '@/components/products/ExtendedProductSections';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';
import { apiRequest } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import ImageMapEditorModal from '@/components/apps/image-editor/ImageMapEditor';

const RESTAURANT_SIZE_NONE = '__NONE__';

const GOOGLE_PRODUCT_CATEGORIES = [
  'المأكولات والمشروبات والتبغ',
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'الفن والترفيه',
  'تجاري وصناعي',
  'كاميرات وأجهزة بصرية',
  'ملابس وإكسسوارات',
  'إلكترونيات',
  'الأثاث',
  'الصحة والجمال',
  'الحديقة والمنزل',
  'الرضيع والطفل',
  'أجهزة',
  'وسائط',
  'المركبات وقطع الغيار',
  'المستلزمات المكتبية',
];

type AddonItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  imageUploadFile: File | null;
  hasSmall: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

type MenuVariantItem = {
  id: string;
  name: string;
  hasSmall: boolean;
  hasMedium: boolean;
  hasLarge: boolean;
  priceSmall: string;
  priceMedium: string;
  priceLarge: string;
};

const parseNumberInput = (value: any) => {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const cleaned = raw
    .replace(/[٠-٩۰-۹]/g, (d) => {
      const map: Record<string, string> = {
        '٠': '0',
        '١': '1',
        '٢': '2',
        '٣': '3',
        '٤': '4',
        '٥': '5',
        '٦': '6',
        '٧': '7',
        '٨': '8',
        '٩': '9',
        '۰': '0',
        '۱': '1',
        '۲': '2',
        '۳': '3',
        '۴': '4',
        '۵': '5',
        '۶': '6',
        '۷': '7',
        '۸': '8',
        '۹': '9',
      };
      return map[d] || d;
    })
    .replace(/[٬،]/g, '')
    .replace(/[٫]/g, '.')
    .replace(/\s+/g, '');
  return Number(cleaned);
};

import { compressForUpload } from '@/lib/upload-image';
export default function RestaurantAddProductPage() {
  const { shop } = useShop();
  const router = useRouter();
  const { isInstalled } = useInstalledApps();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [imageMapModalOpen, setImageMapModalOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [googleCategory, setGoogleCategory] = useState('المأكولات والمشروبات والتبغ');
  const [localCategory, setLocalCategory] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // Extended sections data
  const [extraData, setExtraData] = useState<ProductExtraData>(() => ({
    ...defaultExtraData(),
    requiresShipping: false, // الأكل والمشروبات غالباً توصيل محلي أو استلام
  }));

  // Quick category modal
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Base sizes (small/medium/large for the main product)
  const [baseSizesEnabled, setBaseSizesEnabled] = useState(false);
  const [priceSmall, setPriceSmall] = useState(RESTAURANT_SIZE_NONE);
  const [priceMedium, setPriceMedium] = useState(RESTAURANT_SIZE_NONE);
  const [priceLarge, setPriceLarge] = useState(RESTAURANT_SIZE_NONE);

  // Menu variants (types like "Chicken", "Beef" etc. each with sizes)
  const [menuVariants, setMenuVariants] = useState<MenuVariantItem[]>([]);

  // Addons state
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);
  const [openAddonId, setOpenAddonId] = useState('');

  // Edit mode
  const [editId, setEditId] = useState('');
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProducts();
    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam) loadProductForEdit(editParam);
  }, []);

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

      const ex = (p.extraData || {}) as ProductExtraData;
      setExtraData({ ...defaultExtraData(), ...ex });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setGoogleCategory(String(ex.googleCategory || 'المأكولات والمشروبات والتبغ'));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));

      // Check menu variants
      if (Array.isArray(p.menuVariants) && p.menuVariants.length > 0) {
        const base = p.menuVariants.find((m: any) => m.id === 'base');
        if (base && Array.isArray(base.sizes)) {
          setBaseSizesEnabled(true);
          const sm = base.sizes.find((s: any) => s.id === 'small');
          const md = base.sizes.find((s: any) => s.id === 'medium');
          const lg = base.sizes.find((s: any) => s.id === 'large');
          if (sm) setPriceSmall(String(sm.price));
          if (md) setPriceMedium(String(md.price));
          if (lg) setPriceLarge(String(lg.price));
        }

        const others = p.menuVariants.filter((m: any) => m.id !== 'base');
        if (others.length > 0) {
          setMenuVariants(
            others.map((m: any) => {
              const sm = (m.sizes || []).find((s: any) => s.id === 'small');
              const md = (m.sizes || []).find((s: any) => s.id === 'medium');
              const lg = (m.sizes || []).find((s: any) => s.id === 'large');
              return {
                id: m.id || String(Math.random()),
                name: m.name || '',
                hasSmall: !!sm,
                hasMedium: !!md,
                hasLarge: !!lg,
                priceSmall: sm ? String(sm.price) : '',
                priceMedium: md ? String(md.price) : '',
                priceLarge: lg ? String(lg.price) : '',
              };
            })
          );
        }
      }
    } catch (err: any) {
      console.error('Failed to load product for edit:', err);
      alert(err?.message || 'تعذر تحميل بيانات المنتج للتعديل');
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiRequest('/products');
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
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
    } catch (err) {
      alert('حدث خطأ أثناء إضافة الفئة');
    }
  };

  const handleAddMenuVariant = () => {
    const newId = `variant_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setMenuVariants([
      ...menuVariants,
      {
        id: newId,
        name: '',
        hasSmall: true,
        hasMedium: true,
        hasLarge: true,
        priceSmall: '',
        priceMedium: '',
        priceLarge: '',
      },
    ]);
  };

  const handleRemoveMenuVariant = (id: string) => {
    setMenuVariants(menuVariants.filter((v) => v.id !== id));
  };

  const handleUpdateMenuVariant = (id: string, field: keyof MenuVariantItem, value: any) => {
    setMenuVariants(menuVariants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleAddAddon = () => {
    const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setAddonItems([
      ...addonItems,
      {
        id: newId,
        name: '',
        imageUrl: null,
        imageUploadFile: null,
        hasSmall: true,
        hasMedium: true,
        hasLarge: true,
        priceSmall: '',
        priceMedium: '',
        priceLarge: '',
      },
    ]);
    setOpenAddonId(newId);
  };

  const handleRemoveAddon = (id: string) => {
    setAddonItems(addonItems.filter((a) => a.id !== id));
    if (openAddonId === id) setOpenAddonId('');
  };

  const handleUpdateAddon = (id: string, field: keyof AddonItem, value: any) => {
    setAddonItems(addonItems.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
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

  const handleAddonImageUpload = async (
    addonId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressForUpload(file, 'gallery');
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateAddon(addonId, 'imageUploadFile', compressed);
        handleUpdateAddon(addonId, 'imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    // Build menu variants payload
    const baseSizes: Array<{ id: string; label: string; price: number }> = [];
    if (baseSizesEnabled) {
      if (String(priceSmall) !== RESTAURANT_SIZE_NONE) {
        const ps = parseNumberInput(priceSmall);
        if (!Number.isFinite(ps) || ps <= 0) {
          alert('سعر الحجم الصغير غير صحيح');
          return;
        }
        baseSizes.push({ id: 'small', label: 'صغير', price: ps });
      }
      if (String(priceMedium) !== RESTAURANT_SIZE_NONE) {
        const pm = parseNumberInput(priceMedium);
        if (!Number.isFinite(pm) || pm <= 0) {
          alert('سعر الحجم المتوسط غير صحيح');
          return;
        }
        baseSizes.push({ id: 'medium', label: 'متوسط', price: pm });
      }
      if (String(priceLarge) !== RESTAURANT_SIZE_NONE) {
        const pl = parseNumberInput(priceLarge);
        if (!Number.isFinite(pl) || pl <= 0) {
          alert('سعر الحجم الكبير غير صحيح');
          return;
        }
        baseSizes.push({ id: 'large', label: 'كبير', price: pl });
      }
      if (baseSizes.length === 0) {
        alert('اختر حجم واحد على الأقل للأحجام الأساسية');
        return;
      }
    }

    const mappedVariants = menuVariants
      .map((v) => {
        const tid = v.id.trim();
        const tname = v.name.trim();
        if (!tid || !tname) return null;
        const sizes: Array<{ id: string; label: string; price: number }> = [];
        if (v.hasSmall) {
          const ps = parseNumberInput(v.priceSmall);
          if (!Number.isFinite(ps) || ps <= 0) return null;
          sizes.push({ id: 'small', label: 'صغير', price: ps });
        }
        if (v.hasMedium) {
          const pm = parseNumberInput(v.priceMedium);
          if (!Number.isFinite(pm) || pm <= 0) return null;
          sizes.push({ id: 'medium', label: 'متوسط', price: pm });
        }
        if (v.hasLarge) {
          const pl = parseNumberInput(v.priceLarge);
          if (!Number.isFinite(pl) || pl <= 0) return null;
          sizes.push({ id: 'large', label: 'كبير', price: pl });
        }
        if (sizes.length === 0) return null;
        return { id: tid, name: tname, sizes };
      })
      .filter(Boolean);

    // Calculate resolved base price
    const parsedPrice = parseNumberInput(price);
    let resolvedBasePrice = parsedPrice;
    if (baseSizesEnabled && baseSizes.length > 0) {
      const prices = baseSizes.map((s) => s.price).filter((n) => Number.isFinite(n) && n > 0);
      const min = prices.length > 0 ? Math.min(...prices) : NaN;
      if (Number.isFinite(min)) resolvedBasePrice = min;
    }

    if (!Number.isFinite(resolvedBasePrice) || resolvedBasePrice < 0) {
      alert('يرجى إدخال سعر صحيح للمنتج');
      return;
    }

    const finalMenuVariants =
      baseSizes.length > 0
        ? [{ id: 'base', name: name.trim(), sizes: baseSizes }, ...mappedVariants]
        : mappedVariants.length > 0
          ? mappedVariants
          : undefined;

    // Build addons payload
    const addonsPayload =
      addonItems.length > 0
        ? [
            {
              id: 'addons',
              name: 'إضافات',
              label: 'إضافات',
              title: 'إضافات',
              options: addonItems
                .map((a) => {
                  const variants: Array<{ id: string; label: string; price: number }> = [];
                  if (a.hasSmall) {
                    const ps = parseNumberInput(a.priceSmall);
                    if (Number.isFinite(ps) && ps > 0)
                      variants.push({ id: 'small', label: 'صغير', price: ps });
                  }
                  if (a.hasMedium) {
                    const pm = parseNumberInput(a.priceMedium);
                    if (Number.isFinite(pm) && pm > 0)
                      variants.push({ id: 'medium', label: 'متوسط', price: pm });
                  }
                  if (a.hasLarge) {
                    const pl = parseNumberInput(a.priceLarge);
                    if (Number.isFinite(pl) && pl > 0)
                      variants.push({ id: 'large', label: 'كبير', price: pl });
                  }
                  return {
                    id: a.id,
                    name: a.name.trim(),
                    imageUrl: a.imageUrl,
                    variants,
                  };
                })
                .filter((o) => o.name && o.variants.length > 0),
            },
          ]
        : undefined;

    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const shopId = shopData?.id;

      if (!shopId) {
        alert('لم يتم العثور على المتجر');
        return;
      }

      // Upload product image if exists
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('purpose', 'product_image');
        const uploadResponse = await apiRequest(`/media/upload?shopId=${shopId}`, {
          method: 'POST',
          body: formData,
        });
        finalImageUrl = uploadResponse?.url || imageUrl;
      }

      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: resolvedBasePrice,
        category: category || 'عام',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        unit: 'food',
        trackStock: !extraData.unlimitedStock,
        ...(brand ? { brand } : {}),
        ...(finalMenuVariants ? { menuVariants: finalMenuVariants } : {}),
        ...(addonsPayload ? { addons: addonsPayload } : {}),
        extraData: {
          ...extraData,
          costPrice: costPrice ? Number(costPrice) : null,
          brand: brand || undefined,
          googleCategory: googleCategory || undefined,
          localCategory: localCategory || undefined,
          youtubeUrl: youtubeUrl || undefined,
        },
      };

      if (editId) {
        await apiRequest(`/products/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
        alert('تم تحديث المنتج بنجاح');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        alert('تم إضافة المنتج بنجاح');
      }
      router.push('/dashboard/inventory/products');
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(err?.message || 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-full bg-[#F4F5F7] p-4 sm:p-6 md:p-8 space-y-6"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <UtensilsCrossed size={26} />
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {editId ? 'تعديل منتج أكل ومشروبات' : 'إضافة أكل ومشروبات'}
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            منتجات غذائية ومشروبات جاهزة للطلب السريع — مع خيارات الأحجام، الإضافات، ونموذج الطلب
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory/products')}
          className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shrink-0"
          title="رجوع إلى المنتجات"
        >
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <X size={18} />
          <span>إلغاء</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loadingProduct}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{editId ? 'حفظ التعديلات' : 'حفظ'}</span>
        </button>
      </div>

      {/* Main Grid: Left column (Live Preview) + Right column (Fields & Sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Live preview panel (Sticky on Desktop) */}
        <div className="bg-white rounded-2xl p-5 lg:sticky lg:top-4 text-center border border-slate-200/80 shadow-xs order-2 lg:order-1">
          <div className="w-full aspect-square rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-4">
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                <ImageIcon size={44} />
              </div>
            )}
          </div>

          {name.trim() ? (
            <p className="text-sm font-black text-slate-900 mb-1">{name.trim()}</p>
          ) : null}

          {price ? (
            <p className="text-sm font-black text-teal-600 mb-2">
              ج.م {Number(price).toFixed(2)}
              {extraData.discountPrice ? (
                <span className="text-[11px] font-bold text-slate-400 line-through mr-2">
                  ج.م {Number(extraData.discountPrice).toFixed(2)}
                </span>
              ) : null}
            </p>
          ) : null}

          {extraData.calories ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold mb-2">
              <Flame size={12} className="text-amber-500" />
              <span>{extraData.calories} سعرة حرارية</span>
            </div>
          ) : null}

          {extraData.subtitle || extraData.promoTitle ? (
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-2">
              {[extraData.promoTitle, extraData.subtitle].filter(Boolean).join(' — ')}
            </p>
          ) : null}

          {!name.trim() && !price && (
            <div className="text-center py-2">
              <p className="text-xs font-black text-slate-700 mb-1.5">أضف المعلومات الأساسية</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تُظهر المعاينة الصورة، الاسم، السعر، السعر المخفض, العنوان الفرعي والترويجي. ستتمكن
                من معاينة صفحة المنتج الكاملة على ثيم متجرك بعد الحفظ.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Form & Sections */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* 1. Basic Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              المعلومات الأساسية
            </h2>

            {/* Upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/'))
                  handleImageUpload({ target: { files: [file] } } as any);
              }}
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                dragOver ? 'border-teal-400 bg-teal-50/50' : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={26} />
                  )}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-700">اسحب الصورة وأفلتها هنا</p>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="inline-block px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs">
                      اختار من المعرض
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {isInstalled('image-editor') && (
                      <button
                        type="button"
                        onClick={() => setImageMapModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF] text-slate-900 text-xs font-bold hover:bg-[#00B8CC] transition-all"
                      >
                        <Map size={13} />
                        <span>خريطة الصور</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-left border-t border-slate-100 pt-2" dir="ltr">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="أو أضف رابط يوتيوب"
                  className="w-full max-w-sm text-xs px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-teal-400 outline-none bg-transparent text-teal-600 underline placeholder:text-slate-400 placeholder:no-underline font-semibold"
                />
              </div>
            </div>

            {/* Name */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                اسم المنتج <span className="text-red-500">*</span>{' '}
                <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-16 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="أدخل اسم الوجبة أو المشروب (مثال: برجر دجاج كلاسيك)"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-500 flex items-center gap-0.5 select-none">
                  AR <ChevronDown size={10} />
                </span>
              </div>
            </div>

            {/* Price & Cost price (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  السعر الأساسي (ج.م) <span className="text-red-500">*</span>{' '}
                  <Info size={13} className="text-slate-300" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                    placeholder="0.00"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">
                    #
                  </span>
                </div>
              </div>

              {/* Cost price */}
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  سعر التكلفة (ج.م) <Info size={13} className="text-slate-300" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                    placeholder="أدخل سعر التكلفة"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">
                    #
                  </span>
                </div>
              </div>
            </div>

            {/* Categories & Brand (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Categories */}
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  التصنيفات <Info size={13} className="text-slate-300" />
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-teal-400"
                  >
                    <option value="">اختر التصنيفات</option>
                    {categories.map((cat: any) => {
                      const val = cat.name || cat.nameAr || cat.name_ar || String(cat.id || '');
                      const label = cat.nameAr || cat.name || cat.name_ar || val;
                      return (
                        <option key={cat.id || val} value={val}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategoryModal(true)}
                    className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 text-lg font-bold hover:bg-teal-100 transition-all shrink-0 flex items-center justify-center"
                    title="فئة جديدة"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Brand */}
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  العلامة التجارية <Info size={13} className="text-slate-300" />
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="اختر العلامة التجارية"
                />
              </div>
            </div>

            {/* Google category */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                تصنيفات جوجل <Info size={13} className="text-slate-300" />
              </label>
              <select
                value={googleCategory}
                onChange={(e) => setGoogleCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-teal-400"
              >
                <option value="">اختار تصنيف جوجل</option>
                {GOOGLE_PRODUCT_CATEGORIES.map((gc) => (
                  <option key={gc} value={gc}>
                    {gc}
                  </option>
                ))}
              </select>
            </div>

            {/* Local category */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                تصنيف محلي <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={localCategory}
                  onChange={(e) => setLocalCategory(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="تصنيف محلي"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm">
                  👑
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                وصف المنتج <Info size={13} className="text-slate-300" />
              </label>
              <RichDescriptionEditor
                value={description}
                onChange={setDescription}
                placeholder="اكتب مكونات الوجبة والمقبلات وتفاصيل الطهي والتقديم..."
              />
            </div>

            {/* Available for sale / order */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-teal-600"
              />
              <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                متاح للطلب والبيع في المتجر
              </label>
            </div>
          </div>

          {/* 2. Restaurant Options Card: Base Sizes, Menu Variants & Addons */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              خيارات الوجبة والأحجام والإضافات
            </h2>

            {/* Base sizes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={baseSizesEnabled}
                    onChange={(e) => setBaseSizesEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-teal-600"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    تفعيل الأحجام (صغير / وسط / كبير)
                  </span>
                </label>
                <span className="text-xs font-bold text-slate-400">أحجام المنتج الأساسية</span>
              </div>

              {baseSizesEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">صغير</label>
                    <input
                      type="number"
                      value={priceSmall === RESTAURANT_SIZE_NONE ? '' : priceSmall}
                      onChange={(e) => setPriceSmall(e.target.value || RESTAURANT_SIZE_NONE)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                      placeholder="السعر (اتركه فارغ للتعطيل)"
                    />
                  </div>
                  <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">متوسط</label>
                    <input
                      type="number"
                      value={priceMedium === RESTAURANT_SIZE_NONE ? '' : priceMedium}
                      onChange={(e) => setPriceMedium(e.target.value || RESTAURANT_SIZE_NONE)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                      placeholder="السعر (اتركه فارغ للتعطيل)"
                    />
                  </div>
                  <div className="text-right p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">كبير</label>
                    <input
                      type="number"
                      value={priceLarge === RESTAURANT_SIZE_NONE ? '' : priceLarge}
                      onChange={(e) => setPriceLarge(e.target.value || RESTAURANT_SIZE_NONE)}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-teal-400"
                      placeholder="السعر (اتركه فارغ للتعطيل)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Menu Variants */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddMenuVariant}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
                >
                  <Plus size={13} />
                  <span>إضافة نوع</span>
                </button>
                <div className="text-right">
                  <h3 className="text-xs font-bold text-slate-800">أنواع وتشكيلات الوجبة</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    مثال: دجاج، لحم، مكسرات، نباتي...
                  </p>
                </div>
              </div>

              {menuVariants.length === 0 ? (
                <div className="text-center py-5 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                  <p className="text-xs font-bold">لا توجد أنواع مضافة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {menuVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveMenuVariant(variant.id)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) =>
                            handleUpdateMenuVariant(variant.id, 'name', e.target.value)
                          }
                          className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-teal-400"
                          placeholder="اسم النوع (مثال: دجاج أو لحم بقري)"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={variant.hasSmall}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'hasSmall', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">صغير</span>
                          <input
                            type="number"
                            value={variant.priceSmall}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'priceSmall', e.target.value)
                            }
                            disabled={!variant.hasSmall}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={variant.hasMedium}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'hasMedium', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">وسط</span>
                          <input
                            type="number"
                            value={variant.priceMedium}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'priceMedium', e.target.value)
                            }
                            disabled={!variant.hasMedium}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={variant.hasLarge}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'hasLarge', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">كبير</span>
                          <input
                            type="number"
                            value={variant.priceLarge}
                            onChange={(e) =>
                              handleUpdateMenuVariant(variant.id, 'priceLarge', e.target.value)
                            }
                            disabled={!variant.hasLarge}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Addons */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddAddon}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
                >
                  <Plus size={13} />
                  <span>إضافة صوص / إضافة</span>
                </button>
                <div className="text-right">
                  <h3 className="text-xs font-bold text-slate-800">إضافات الوجبة (Add-ons)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    صوصات إضافية، بطاطس، جبن مضاعف...
                  </p>
                </div>
              </div>

              {addonItems.length === 0 ? (
                <div className="text-center py-5 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                  <Package size={24} className="mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-bold">لا توجد إضافات مخصصة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addonItems.map((addon) => (
                    <div
                      key={addon.id}
                      className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveAddon(addon.id)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <input
                          type="text"
                          value={addon.name}
                          onChange={(e) => handleUpdateAddon(addon.id, 'name', e.target.value)}
                          className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-teal-400"
                          placeholder="اسم الإضافة (مثال: صوص جبنة شيدر)"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={addon.hasSmall}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'hasSmall', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">صغير</span>
                          <input
                            type="number"
                            value={addon.priceSmall}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'priceSmall', e.target.value)
                            }
                            disabled={!addon.hasSmall}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={addon.hasMedium}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'hasMedium', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">وسط</span>
                          <input
                            type="number"
                            value={addon.priceMedium}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'priceMedium', e.target.value)
                            }
                            disabled={!addon.hasMedium}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            checked={addon.hasLarge}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'hasLarge', e.target.checked)
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600"
                          />
                          <span className="text-xs font-bold text-slate-600">كبير</span>
                          <input
                            type="number"
                            value={addon.priceLarge}
                            onChange={(e) =>
                              handleUpdateAddon(addon.id, 'priceLarge', e.target.value)
                            }
                            disabled={!addon.hasLarge}
                            className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-center disabled:opacity-40"
                            placeholder="السعر"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Extended Sections (المعلومات المتقدمة مع السعرات الحرارية، التخفيضات، قنوات العرض، خيارات الشراء، الوسوم، الشحن، المخزون، بيانات SEO، الكميات، نموذج الطلب، الحقول المخصصة، الإشعارات) */}
          <ExtendedProductSections
            value={extraData}
            onChange={setExtraData}
            showOrderForm={true}
            showCalories={true}
            showProductOptions={false}
          />

          {/* Bottom Save & Cancel Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingProduct}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{editId ? 'حفظ التعديلات' : 'حفظ المنتج'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Category Modal */}
      {showQuickCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowQuickCategoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between flex-row-reverse">
              <h3 className="text-lg font-black text-slate-900">إضافة تصنيف جديد</h3>
              <button
                onClick={() => setShowQuickCategoryModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">اسم التصنيف *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثال: وجبات سريعة / مشروبات باردة"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleQuickAddCategory}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-all"
              >
                إضافة التصنيف
              </button>
              <button
                type="button"
                onClick={() => setShowQuickCategoryModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Map Editor Modal */}
      {shop && (
        <ImageMapEditorModal
          open={imageMapModalOpen}
          onClose={() => setImageMapModalOpen(false)}
          shopId={shop.id}
          products={products}
        />
      )}
    </div>
  );
}
