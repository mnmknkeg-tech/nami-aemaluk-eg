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
import { compressForUpload } from '@/lib/upload-image';
import { uploadMediaFile } from '@/lib/api/upload';
import {
  parseNumberInput,
  type AddonItem,
  type FashionSizeItem,
  type PackOptionItem,
} from '../_clothing/types';
import ClothingPageHeader from '../_clothing/PageHeader';
import ClothingLivePreview from '../_clothing/LivePreview';
import ClothingBasicInfoCard from '../_clothing/BasicInfoCard';
import ClothingOptionsCard from '../_clothing/OptionsCard';
import QuickCategoryModal from '../_clothing/QuickCategoryModal';

export default function ClothingAddProductPage() {
  const { shop } = useShop();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stock, setStock] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Clothing specific fields
  const [material, setMaterial] = useState('');
  const [brand, setBrand] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [googleCategory, setGoogleCategory] = useState('');
  const [localCategory, setLocalCategory] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [extraData, setExtraData] = useState<ProductExtraData>(defaultExtraData());
  const [dragOver, setDragOver] = useState(false);
  const [gender, setGender] = useState('');

  // Colors
  const [selectedColors, setSelectedColors] = useState<Array<{ name: string; value: string }>>([]);
  const [customColor, setCustomColor] = useState('#000000');

  // Sizes with prices
  const [fashionSizeItems, setFashionSizeItems] = useState<FashionSizeItem[]>([]);
  const [customSize, setCustomSize] = useState('');

  // Additional images
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);

  // Pack options
  const [packEnabled, setPackEnabled] = useState(false);
  const [packOptionItems, setPackOptionItems] = useState<PackOptionItem[]>([]);

  // Addons / complementary products
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);

  // Quick category modal
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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
      setBasePrice(p.price != null ? String(p.price) : '');
      setStock(p.stock != null ? String(p.stock) : '');
      setCategory(typeof p.category === 'string' ? p.category : String(p.category?.name || ''));
      setImageUrl(String(p.imageUrl || p.image_url || ''));
      setIsActive(p.isActive !== false);
      setMaterial(String(p.material || ''));
      setBrand(String(p.brand || ''));
      const ex = (p.extraData || {}) as ProductExtraData;
      setExtraData({ ...defaultExtraData(), ...ex });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setGoogleCategory(String(ex.googleCategory || ''));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));
      setGender(String(p.gender || ''));
      if (Array.isArray(p.colors) && p.colors.length > 0) {
        setSelectedColors(
          p.colors
            .map((c: any) =>
              typeof c === 'string'
                ? { name: c, value: '#000000' }
                : { name: String(c.name || ''), value: String(c.value || c.hex || '#000000') }
            )
            .filter((c: any) => c.name)
        );
      }
      if (Array.isArray(p.sizes) && p.sizes.length > 0) {
        setFashionSizeItems(
          p.sizes
            .map((s: any) =>
              typeof s === 'string'
                ? { label: s, price: '' }
                : {
                    label: String(s.label || s.name || ''),
                    price: s.price != null ? String(s.price) : '',
                  }
            )
            .filter((s: any) => s.label)
        );
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

  useEffect(() => {
    if (packEnabled && packOptionItems.length === 0) {
      setPackOptionItems([
        { id: `pack_${Date.now()}_${Math.random().toString(16).slice(2)}`, qty: '', price: '' },
      ]);
    }
  }, [packEnabled]);

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

  const handleExtraImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - extraImagePreviews.length;
    const toAdd = files.slice(0, remaining);
    const compressedToAdd = await Promise.all(toAdd.map((f) => compressForUpload(f, 'gallery')));
    setExtraImageFiles((prev) => [...prev, ...compressedToAdd]);
    compressedToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExtraImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExtraImage = (index: number) => {
    setExtraImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setExtraImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleColor = (color: { name: string; value: string }) => {
    if (selectedColors.some((c) => c.value === color.value)) {
      setSelectedColors(selectedColors.filter((c) => c.value !== color.value));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const addCustomColor = () => {
    if (!customColor) return;
    if (!selectedColors.some((c) => c.value === customColor)) {
      setSelectedColors([...selectedColors, { name: customColor, value: customColor }]);
    }
  };

  const addPresetSize = (size: string) => {
    if (!fashionSizeItems.some((s) => s.label === size)) {
      setFashionSizeItems([...fashionSizeItems, { label: size, price: '' }]);
    }
  };

  const addCustomSizeItem = () => {
    const trimmed = customSize.trim();
    if (!trimmed) return;
    if (!fashionSizeItems.some((s) => s.label === trimmed)) {
      setFashionSizeItems([...fashionSizeItems, { label: trimmed, price: '' }]);
      setCustomSize('');
    }
  };

  const updateSizePrice = (index: number, price: string) => {
    setFashionSizeItems((prev) => prev.map((item, i) => (i === index ? { ...item, price } : item)));
  };

  const removeSize = (index: number) => {
    setFashionSizeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addPackOption = () => {
    setPackOptionItems([
      ...packOptionItems,
      { id: `pack_${Date.now()}_${Math.random().toString(16).slice(2)}`, qty: '', price: '' },
    ]);
  };

  const updatePackOption = (id: string, field: 'qty' | 'price', val: string) => {
    setPackOptionItems(packOptionItems.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const removePackOption = (id: string) => {
    setPackOptionItems(packOptionItems.filter((p) => p.id !== id));
  };

  const addAddon = () => {
    setAddonItems([
      ...addonItems,
      {
        id: `addon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: '',
        price: '',
        imagePreviews: [],
        imageUrls: [],
        imageUploadFiles: [],
        selectedColors: [],
        customColor: '#000000',
        selectedSizes: [],
        customSize: '',
      },
    ]);
  };

  const updateAddon = (id: string, field: keyof AddonItem, val: any) => {
    setAddonItems(addonItems.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  };

  const removeAddon = (id: string) => {
    setAddonItems(addonItems.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    const resolvedBasePrice = parseNumberInput(basePrice);
    if (isNaN(resolvedBasePrice) || resolvedBasePrice <= 0) {
      alert('يرجى إدخال سعر أساسي صحيح');
      return;
    }

    const parsedStock = parseNumberInput(stock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      alert('يرجى إدخال مخزون صحيح');
      return;
    }

    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const shopId = shopData?.id;

      if (!shopId) {
        alert('لم يتم العثور على المتجر');
        return;
      }

      // Upload main image
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const finalUploadedUrl = await uploadMediaFile(imageFile, shopId);
        finalImageUrl = finalUploadedUrl || imageUrl;
      }

      // Upload extra images
      const extraUrls: string[] = [];
      if (extraImageFiles.length > 0) {
        for (const f of extraImageFiles) {
          const uploadedUrl = await uploadMediaFile(f, shopId);
          if (uploadedUrl) extraUrls.push(uploadedUrl);
        }
      }

      const allImages = [finalImageUrl, ...extraUrls].filter(Boolean).slice(0, 6);

      const colors = selectedColors.map((c) => ({ name: c.name, value: c.value }));
      const sizes = fashionSizeItems.map((s) => ({
        label: s.label,
        price: s.price ? parseNumberInput(s.price) : resolvedBasePrice,
      }));

      const packOptions = packEnabled
        ? packOptionItems
            .map((p) => ({
              qty: parseNumberInput(p.qty),
              price: parseNumberInput(p.price),
            }))
            .filter((p) => !isNaN(p.qty) && !isNaN(p.price) && p.qty > 0 && p.price > 0)
        : null;

      const addonsPayload =
        addonItems.length > 0
          ? addonItems
              .map((a) => ({
                id: a.id,
                name: a.name.trim(),
                price: parseNumberInput(a.price) || 0,
                imageUrls: a.imageUrls,
                colors: a.selectedColors.map((c) => ({ name: c.name, value: c.value })),
                sizes: a.selectedSizes,
              }))
              .filter((a) => a.name)
          : null;

      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: resolvedBasePrice,
        stock: parsedStock,
        category: category || 'عام',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        trackStock: true,
        images: allImages,
        ...(material ? { material } : {}),
        ...(brand ? { brand } : {}),
        ...(gender ? { gender } : {}),
        ...(packOptions ? { packOptions } : {}),
        ...(colors.length > 0 ? { colors } : {}),
        ...(sizes.length > 0 ? { sizes } : {}),
        extraData: {
          ...extraData,
          costPrice: costPrice ? Number(costPrice) : null,
          googleCategory: googleCategory || undefined,
          localCategory: localCategory || undefined,
          youtubeUrl: youtubeUrl || undefined,
        },
        ...(addonsPayload ? { addons: addonsPayload } : {}),
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
      router.push('/dashboard/inventory');
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
      <ClothingPageHeader
        editId={editId}
        saving={saving}
        loadingProduct={loadingProduct}
        onSave={handleSave}
      />

      {/* Main Grid: Left column (Live Preview) + Right column (Fields & Sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Live preview panel (Sticky on Desktop) */}
        <ClothingLivePreview
          imageUrl={imageUrl}
          extraImagePreviews={extraImagePreviews}
          name={name}
          basePrice={basePrice}
          extraData={extraData}
          selectedColors={selectedColors}
          fashionSizeItems={fashionSizeItems}
        />

        {/* Right column: Basic info + Fashion Details + Extended sections */}
        <div className="space-y-6 order-1 lg:order-2">
          {/* 1. Basic Info Card */}
          <ClothingBasicInfoCard
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            basePrice={basePrice}
            setBasePrice={setBasePrice}
            costPrice={costPrice}
            setCostPrice={setCostPrice}
            category={category}
            setCategory={setCategory}
            categories={categories}
            brand={brand}
            setBrand={setBrand}
            googleCategory={googleCategory}
            setGoogleCategory={setGoogleCategory}
            localCategory={localCategory}
            setLocalCategory={setLocalCategory}
            material={material}
            setMaterial={setMaterial}
            gender={gender}
            setGender={setGender}
            stock={stock}
            setStock={setStock}
            isActive={isActive}
            setIsActive={setIsActive}
            imageUrl={imageUrl}
            youtubeUrl={youtubeUrl}
            setYoutubeUrl={setYoutubeUrl}
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleImageUpload={handleImageUpload}
            handleExtraImagesChange={handleExtraImagesChange}
            removeExtraImage={removeExtraImage}
            extraImagePreviews={extraImagePreviews}
            onQuickAddCategory={() => setShowQuickCategoryModal(true)}
          />

          {/* 2. Tangible Options Card: Colors, Sizes, Packs & Addons */}
          <ClothingOptionsCard
            selectedColors={selectedColors}
            toggleColor={toggleColor}
            customColor={customColor}
            setCustomColor={setCustomColor}
            addCustomColor={addCustomColor}
            fashionSizeItems={fashionSizeItems}
            addPresetSize={addPresetSize}
            addCustomSizeItem={addCustomSizeItem}
            customSize={customSize}
            setCustomSize={setCustomSize}
            updateSizePrice={updateSizePrice}
            removeSize={removeSize}
            basePrice={basePrice}
            packEnabled={packEnabled}
            setPackEnabled={setPackEnabled}
            packOptionItems={packOptionItems}
            addPackOption={addPackOption}
            updatePackOption={updatePackOption}
            removePackOption={removePackOption}
            addonItems={addonItems}
            addAddon={addAddon}
            updateAddon={updateAddon}
            removeAddon={removeAddon}
          />

          {/* 3. Extended sections (المعلومات المتقدمة، التخفيضات، قنوات عرض المنتج، خيارات الشراء، الوسوم، الشحن، المخزون، بيانات SEO، الكميات، الخيارات، الحقول المخصصة، الإشعارات) */}
          <ExtendedProductSections
            value={extraData}
            onChange={setExtraData}
            showOrderForm={false}
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
          newName={newCategoryName}
          setNewName={setNewCategoryName}
          onConfirm={handleQuickAddCategory}
          onClose={() => setShowQuickCategoryModal(false)}
        />
      )}
    </div>
  );
}
