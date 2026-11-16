'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import ExtendedProductSections, {
  type ProductExtraData,
  defaultExtraData,
} from '@/components/products/ExtendedProductSections';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';
import { apiRequest } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  RESTAURANT_SIZE_NONE,
  parseNumberInput,
  type AddonItem,
  type MenuVariantItem,
} from '../_restaurant/types';
import PageHeader from '../_restaurant/PageHeader';
import LivePreviewPanel from '../_restaurant/LivePreviewPanel';
import BasicInfoCard from '../_restaurant/BasicInfoCard';
import RestaurantOptionsCard from '../_restaurant/RestaurantOptionsCard';
import QuickCategoryModal from '../_restaurant/QuickCategoryModal';

import { compressForUpload } from '@/lib/upload-image';
import { uploadMediaFile } from '@/lib/api/upload';
export default function RestaurantAddProductPage() {
  const { shop } = useShop();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
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
        const finalUploadedUrl = await uploadMediaFile(imageFile, shopId);
        finalImageUrl = finalUploadedUrl || imageUrl;
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
      <PageHeader
        editId={editId}
        saving={saving}
        loadingProduct={loadingProduct}
        onSave={handleSave}
        onBack={() => router.push('/dashboard/inventory/products')}
        onCancel={() => router.back()}
      />

      {/* Main Grid: Left column (Live Preview) + Right column (Fields & Sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Live preview panel (Sticky on Desktop) */}
        <LivePreviewPanel
          imageUrl={imageUrl}
          name={name}
          price={price}
          discountPrice={extraData.discountPrice}
          calories={extraData.calories}
          subtitle={extraData.subtitle}
          promoTitle={extraData.promoTitle}
        />

        {/* Right column: Form & Sections */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* 1. Basic Info Card */}
          <BasicInfoCard
            dragOver={dragOver}
            setDragOver={setDragOver}
            onImageUpload={handleImageUpload}
            imageUrl={imageUrl}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={setYoutubeUrl}
            name={name}
            onNameChange={setName}
            price={price}
            onPriceChange={setPrice}
            costPrice={costPrice}
            onCostPriceChange={setCostPrice}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            onQuickCategory={() => setShowQuickCategoryModal(true)}
            brand={brand}
            onBrandChange={setBrand}
            googleCategory={googleCategory}
            onGoogleCategoryChange={setGoogleCategory}
            localCategory={localCategory}
            onLocalCategoryChange={setLocalCategory}
            description={description}
            onDescriptionChange={setDescription}
            isActive={isActive}
            onIsActiveChange={setIsActive}
          />

          {/* 2. Restaurant Options Card: Base Sizes, Menu Variants & Addons */}
          <RestaurantOptionsCard
            baseSizesEnabled={baseSizesEnabled}
            onBaseSizesEnabled={setBaseSizesEnabled}
            priceSmall={priceSmall}
            onPriceSmall={setPriceSmall}
            priceMedium={priceMedium}
            onPriceMedium={setPriceMedium}
            priceLarge={priceLarge}
            onPriceLarge={setPriceLarge}
            menuVariants={menuVariants}
            onAddMenuVariant={handleAddMenuVariant}
            onRemoveMenuVariant={handleRemoveMenuVariant}
            onUpdateMenuVariant={handleUpdateMenuVariant}
            addonItems={addonItems}
            onAddAddon={handleAddAddon}
            onRemoveAddon={handleRemoveAddon}
            onUpdateAddon={handleUpdateAddon}
          />

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
        <QuickCategoryModal
          value={newCategoryName}
          onValueChange={setNewCategoryName}
          onClose={() => setShowQuickCategoryModal(false)}
          onAdd={handleQuickAddCategory}
        />
      )}
    </div>
  );
}
