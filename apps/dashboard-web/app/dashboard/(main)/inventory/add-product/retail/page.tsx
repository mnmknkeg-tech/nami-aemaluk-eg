'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  Upload,
  Image as ImageIcon,
  Map,
} from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { useInstalledApps } from '@/hooks/useInstalledApps';
import { apiRequest } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import ImageMapEditorModal from '@/components/apps/image-editor/ImageMapEditor';

const presetColors: Array<{ name: string; value: string }> = [
  { name: 'أسود', value: '#111827' },
  { name: 'أبيض', value: '#ffffff' },
  { name: 'رمادي', value: '#9ca3af' },
  { name: 'أحمر', value: '#ef4444' },
  { name: 'وردي', value: '#ec4899' },
  { name: 'بنفسجي', value: '#a855f7' },
  { name: 'أزرق', value: '#3b82f6' },
  { name: 'سماوي', value: '#06b6d4' },
  { name: 'أخضر', value: '#22c55e' },
  { name: 'أصفر', value: '#eab308' },
  { name: 'برتقالي', value: '#f97316' },
  { name: 'بني', value: '#a16207' },
];

const presetSizes: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

type FashionSizeItem = { label: string; price: string };

type AddonItem = {
  id: string;
  name: string;
  price: string;
  imagePreviews: string[];
  imageUrls: string[];
  imageUploadFiles: File[];
  selectedColors: Array<{ name: string; value: string }>;
  customColor: string;
  selectedSizes: string[];
  customSize: string;
};

type PackOptionItem = { id: string; qty: string; price: string };

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
export default function RetailAddProductPage() {
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
  const [basePrice, setBasePrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stock, setStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [unit, setUnit] = useState('');

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

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

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
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const nextFiles: File[] = [];
    const nextPreviews: string[] = [];
    for (const file of files) {
      if (!allowed.has(file.type)) continue;
      nextFiles.push(await compressForUpload(file, 'gallery'));
      nextPreviews.push(URL.createObjectURL(file));
    }
    const combinedFiles = [...extraImageFiles, ...nextFiles].slice(0, 5);
    const combinedPreviews = [...extraImagePreviews, ...nextPreviews].slice(0, 5);
    setExtraImageFiles(combinedFiles);
    setExtraImagePreviews(combinedPreviews);
  };

  const removeExtraImage = (idx: number) => {
    setExtraImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setExtraImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Colors handlers
  const toggleColor = (c: { name: string; value: string }) => {
    setSelectedColors((prev) => {
      const exists = prev.some((x) => x.value === c.value);
      return exists ? prev.filter((x) => x.value !== c.value) : [...prev, c];
    });
  };

  const addCustomColor = () => {
    const hex = customColor.trim();
    if (!hex) return;
    if (selectedColors.some((x) => x.value === hex)) return;
    setSelectedColors([...selectedColors, { name: hex.toUpperCase(), value: hex }]);
  };

  // Sizes handlers
  const addPresetSize = (s: string) => {
    if (fashionSizeItems.some((x) => x.label === s)) return;
    setFashionSizeItems([...fashionSizeItems, { label: s, price: '' }]);
  };

  const addCustomSizeItem = () => {
    const v = customSize.trim();
    if (!v) return;
    if (fashionSizeItems.some((x) => x.label === v)) return;
    setFashionSizeItems([...fashionSizeItems, { label: v, price: '' }]);
    setCustomSize('');
  };

  const updateSizePrice = (idx: number, price: string) => {
    setFashionSizeItems((prev) => prev.map((s, i) => (i === idx ? { ...s, price } : s)));
  };

  const removeSize = (idx: number) => {
    setFashionSizeItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Pack options handlers
  const addPackOption = () => {
    setPackOptionItems([
      ...packOptionItems,
      { id: `pack_${Date.now()}_${Math.random().toString(16).slice(2)}`, qty: '', price: '' },
    ]);
  };

  const updatePackOption = (id: string, field: 'qty' | 'price', value: string) => {
    setPackOptionItems((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removePackOption = (id: string) => {
    setPackOptionItems((prev) => prev.filter((p) => p.id !== id));
  };

  // Addon handlers
  const handleAddonImagesChange = async (addonId: string, files: File[]) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const nextFiles: File[] = [];
    const nextPreviews: string[] = [];
    for (const file of files) {
      if (!allowed.has(file.type)) continue;
      nextFiles.push(await compressForUpload(file, 'gallery'));
      nextPreviews.push(URL.createObjectURL(file));
    }
    setAddonItems((prev) =>
      prev.map((x) => {
        if (x.id !== addonId) return x;
        return {
          ...x,
          imageUploadFiles: [...x.imageUploadFiles, ...nextFiles].slice(0, 5),
          imagePreviews: [...x.imagePreviews, ...nextPreviews].slice(0, 5),
        };
      })
    );
  };

  const removeAddonImage = (addonId: string, idx: number) => {
    setAddonItems((prev) =>
      prev.map((x) => {
        if (x.id !== addonId) return x;
        return {
          ...x,
          imagePreviews: x.imagePreviews.filter((_, i) => i !== idx),
          imageUploadFiles: x.imageUploadFiles.filter((_, i) => i !== idx),
          imageUrls: x.imageUrls.filter((_, i) => i !== idx),
        };
      })
    );
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

  const removeAddon = (id: string) => {
    setAddonItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateAddon = (id: string, field: keyof AddonItem, value: any) => {
    setAddonItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const toggleAddonColor = (addonId: string, c: { name: string; value: string }) => {
    setAddonItems((prev) =>
      prev.map((x) => {
        if (x.id !== addonId) return x;
        const exists = x.selectedColors.some((t) => t.value === c.value);
        return {
          ...x,
          selectedColors: exists
            ? x.selectedColors.filter((t) => t.value !== c.value)
            : [...x.selectedColors, c],
        };
      })
    );
  };

  const toggleAddonSize = (addonId: string, s: string) => {
    setAddonItems((prev) =>
      prev.map((x) => {
        if (x.id !== addonId) return x;
        const exists = x.selectedSizes.some((t) => t === s);
        return {
          ...x,
          selectedSizes: exists ? x.selectedSizes.filter((t) => t !== s) : [...x.selectedSizes, s],
        };
      })
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    const parsedPrice = parseNumberInput(basePrice);

    // Build sizes
    const sizes = fashionSizeItems
      .map((s) => {
        const label = s.label.trim();
        const p = parseNumberInput(s.price);
        if (!label) return null;
        if (!Number.isFinite(p) || p < 0) return null;
        return { label, price: Math.round(p * 100) / 100 };
      })
      .filter(Boolean) as any[];

    // Calculate resolved base price
    let resolvedBasePrice = parsedPrice;
    if (sizes.length > 0) {
      const min = Math.min(
        ...sizes
          .map((t: any) => Number(t.price || 0))
          .filter((n: any) => Number.isFinite(n) && n >= 0)
      );
      if (Number.isFinite(min)) resolvedBasePrice = min;
    }

    // Pack options
    const packOptions = packEnabled
      ? (packOptionItems
          .map((p) => {
            const qty = parseNumberInput(p.qty);
            const pr = parseNumberInput(p.price);
            if (!Number.isFinite(qty) || qty <= 0) return null;
            if (!Number.isFinite(pr) || pr < 0) return null;
            return {
              id: p.id,
              qty: Math.round(qty * 1000) / 1000,
              unit: unit || null,
              price: Math.round(pr * 100) / 100,
            };
          })
          .filter(Boolean) as any[])
      : undefined;

    if (packEnabled && Array.isArray(packOptions) && packOptions.length === 0) {
      alert('أضف خيار pack واحد على الأقل');
      return;
    }

    // Colors
    const colors = selectedColors
      .map((c) => ({ name: c.name.trim(), value: c.value.trim() }))
      .filter((c) => c.name && c.value);

    // Addons
    const addonsPayload =
      addonItems.length > 0
        ? [
            {
              id: 'addons',
              name: 'منتجات تكميلية',
              label: 'منتجات تكميلية',
              title: 'منتجات تكميلية',
              options: addonItems
                .map((a) => ({
                  id: a.id,
                  name: a.name.trim(),
                  price:
                    Number.isFinite(parseNumberInput(a.price)) && parseNumberInput(a.price) >= 0
                      ? Math.round(parseNumberInput(a.price) * 100) / 100
                      : undefined,
                  colors: a.selectedColors.map((c) => c.name).filter(Boolean),
                  sizes: a.selectedSizes.filter(Boolean),
                }))
                .filter((o) => o.name),
            },
          ]
        : undefined;

    if (!Number.isFinite(resolvedBasePrice) || resolvedBasePrice < 0) {
      alert('السعر غير صحيح');
      return;
    }

    const parsedStock = parseNumberInput(stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      alert('المخزون غير صحيح');
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
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('purpose', 'product_image');
        const uploadResponse = await apiRequest(`/media/upload?shopId=${shopId}`, {
          method: 'POST',
          body: formData,
        });
        finalImageUrl = uploadResponse?.url || imageUrl;
      }

      // Upload extra images
      const extraUrls: string[] = [];
      if (extraImageFiles.length > 0) {
        for (const f of extraImageFiles) {
          const formData = new FormData();
          formData.append('file', f);
          formData.append('purpose', 'product_image');
          const uploadResponse = await apiRequest(`/media/upload?shopId=${shopId}`, {
            method: 'POST',
            body: formData,
          });
          if (uploadResponse?.url) extraUrls.push(uploadResponse.url);
        }
      }

      const allImages = [finalImageUrl, ...extraUrls].filter(Boolean).slice(0, 6);

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
        ...(unit ? { unit } : {}),
        ...(packOptions ? { packOptions } : {}),
        ...(colors.length > 0 ? { colors } : {}),
        ...(sizes.length > 0 ? { sizes } : {}),
        ...(addonsPayload ? { addons: addonsPayload } : {}),
      };

      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });

      alert('تم إضافة المنتج بنجاح');
      router.push('/dashboard/inventory/products');
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(err?.message || 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
          <span className="text-2xl">🏪</span>
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">إضافة منتج تجزئة</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            إضافة منتج مع خيارات الألوان والأحجام والباقات
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <X size={18} />
          <span>إلغاء</span>
        </button>
      </div>

      {/* Product Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-900">معلومات المنتج الأساسية</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-right">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">اسم المنتج *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
              placeholder="مثال: قميص قطني"
            />
          </div>
          <div className="text-right">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">
              السعر الأساسي (ج.م) *
            </label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
              min="0"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="text-right">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 resize-none"
            placeholder="وصف المنتج..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-right">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">الفئة</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="">اختر الفئة</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">المخزون</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min="0"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
              placeholder="0"
            />
          </div>
          <div className="text-right">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">الوحدة</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
              placeholder="مثال: قطعة، كيلو"
            />
          </div>
        </div>

        {/* Main Image */}
        <div className="text-right">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">صورة المنتج</label>
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                <ImageIcon size={32} className="text-slate-300" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer">
                <Upload size={16} />
                <span>رفع صورة</span>
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E5FF] text-slate-900 text-sm font-bold hover:bg-[#00B8CC] transition-all"
                >
                  <Map size={16} />
                  <span>خريطة الصور</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Additional Images */}
        <div className="text-right">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
            صور إضافية (حتى 5)
          </label>
          <div className="flex flex-wrap gap-2 justify-end">
            {extraImagePreviews.map((src, idx) => (
              <div
                key={idx}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200"
              >
                <img src={src} className="w-full h-full object-cover" alt={`extra ${idx + 1}`} />
                <button
                  onClick={() => removeExtraImage(idx)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-all">
              <Upload size={18} className="text-slate-300" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleExtraImagesChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
            نشط
          </label>
        </div>
      </div>

      {/* Colors Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">الألوان</h2>
        <div className="flex flex-wrap gap-2 justify-end">
          {presetColors.map((c) => {
            const isActive = selectedColors.some((x) => x.value === c.value);
            return (
              <button
                key={c.value}
                onClick={() => toggleColor(c)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border font-bold text-xs transition-all ${isActive ? 'bg-white border-slate-900' : 'bg-white/70 border-slate-200 hover:bg-white'}`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ background: c.value }}
                />
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 flex-row-reverse">
          <button
            onClick={addCustomColor}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white"
          >
            إضافة لون مخصص
          </button>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-12 h-10 rounded-xl border border-slate-200 bg-white"
            />
            <span className="text-xs font-bold text-slate-500">لون مخصص</span>
          </div>
        </div>
        {selectedColors.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {selectedColors.map((c) => (
              <span
                key={c.value}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-slate-200 font-bold text-xs"
              >
                <span
                  className="w-4 h-4 rounded-full border border-slate-200"
                  style={{ background: c.value }}
                />
                {c.name}
                <button
                  onClick={() => toggleColor(c)}
                  className="p-1 rounded-full hover:bg-slate-50"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sizes Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">المقاسات والأسعار</h2>
        <div className="flex flex-wrap gap-2 justify-end">
          {presetSizes.map((s) => (
            <button
              key={s}
              onClick={() => addPresetSize(s)}
              disabled={fashionSizeItems.some((x) => x.label === s)}
              className="px-4 py-2 rounded-full border font-bold text-xs transition-all bg-white/70 border-slate-200 hover:bg-white disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 flex-row-reverse">
          <button
            onClick={addCustomSizeItem}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white"
          >
            إضافة مقاس مخصص
          </button>
          <input
            placeholder="مقاس مخصص..."
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-4 font-bold text-right outline-none text-sm"
          />
        </div>
        {fashionSizeItems.length > 0 && (
          <div className="space-y-2">
            {fashionSizeItems.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => removeSize(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="number"
                  value={s.price}
                  onChange={(e) => updateSizePrice(idx, e.target.value)}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                  placeholder="السعر"
                />
                <span className="font-bold text-slate-700 text-sm w-16 text-right">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pack Options Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">باقات الخيارات</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={packEnabled}
              onChange={(e) => setPackEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">تفعيل الباقات</span>
          </label>
        </div>
        {packEnabled && (
          <>
            {packOptionItems.map((p) => (
              <div key={p.id} className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => removePackOption(p.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => updatePackOption(p.id, 'price', e.target.value)}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                  placeholder="السعر"
                />
                <input
                  type="number"
                  value={p.qty}
                  onChange={(e) => updatePackOption(p.id, 'qty', e.target.value)}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                  placeholder="الكمية"
                />
              </div>
            ))}
            <button
              onClick={addPackOption}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all"
            >
              <Plus size={14} />
              <span>إضافة باقة</span>
            </button>
          </>
        )}
      </div>

      {/* Addons / Complementary Products Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">منتجات تكميلية</h2>
          <button
            onClick={addAddon}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all"
          >
            <Plus size={16} />
            <span>إضافة منتج تكميلي</span>
          </button>
        </div>

        {addonItems.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p className="text-sm">لا توجد منتجات تكميلية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addonItems.map((a) => (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => removeAddon(a.id)}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs"
                  >
                    حذف
                  </button>
                  <input
                    value={a.price}
                    onChange={(e) => updateAddon(a.id, 'price', e.target.value)}
                    placeholder="السعر"
                    inputMode="decimal"
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-bold text-right outline-none text-sm"
                  />
                  <input
                    value={a.name}
                    onChange={(e) => updateAddon(a.id, 'name', e.target.value)}
                    placeholder="اسم المنتج التكميلي"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-bold text-right outline-none text-sm"
                  />
                </div>

                {/* Addon images */}
                <div className="flex flex-wrap gap-2 justify-end">
                  {a.imagePreviews.map((u, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={u}
                        alt="addon"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                      />
                      <button
                        onClick={() => removeAddonImage(a.id, idx)}
                        className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer">
                    <Upload size={12} />
                    صور
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) handleAddonImagesChange(a.id, files);
                      }}
                    />
                  </label>
                </div>

                {/* Addon colors */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pr-1 mb-2">
                    الألوان
                  </label>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {presetColors.map((c) => {
                      const isActive = a.selectedColors.some((x) => x.value === c.value);
                      return (
                        <button
                          key={c.value}
                          onClick={() => toggleAddonColor(a.id, c)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border font-bold text-xs transition-all ${isActive ? 'bg-white border-slate-900' : 'bg-white/70 border-slate-200 hover:bg-white'}`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-200"
                            style={{ background: c.value }}
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Addon sizes */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pr-1 mb-2">
                    المقاسات
                  </label>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {presetSizes.map((s) => {
                      const isActive = a.selectedSizes.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() => toggleAddonSize(a.id, s)}
                          className={`px-3 py-1.5 rounded-full border font-bold text-xs transition-all ${isActive ? 'bg-white border-slate-900' : 'bg-white/70 border-slate-200 hover:bg-white'}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-2">
                    <button
                      onClick={() => {
                        const v = a.customSize.trim();
                        if (!v) return;
                        if (!a.selectedSizes.includes(v)) {
                          updateAddon(a.id, 'selectedSizes', [...a.selectedSizes, v]);
                        }
                        updateAddon(a.id, 'customSize', '');
                      }}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-900 text-white"
                    >
                      إضافة مقاس
                    </button>
                    <input
                      placeholder="مقاس مخصص..."
                      value={a.customSize}
                      onChange={(e) => updateAddon(a.id, 'customSize', e.target.value)}
                      className="w-32 bg-white border border-slate-200 rounded-lg py-1.5 px-3 font-bold text-right outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
        >
          إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>حفظ المنتج</span>
        </button>
      </div>

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
