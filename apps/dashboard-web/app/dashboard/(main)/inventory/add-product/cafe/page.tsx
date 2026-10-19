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

type AddonItem = {
  id: string;
  name: string;
  price: string;
  imagePreviews: string[];
  imageUrls: string[];
  imageUploadFiles: File[];
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
export default function CafeAddProductPage() {
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
  const [isHot, setIsHot] = useState(true);

  // Base sizes (small/medium/large)
  const [hasBaseSizes, setHasBaseSizes] = useState(false);
  const [baseSizeSmall, setBaseSizeSmall] = useState('');
  const [baseSizeMedium, setBaseSizeMedium] = useState('');
  const [baseSizeLarge, setBaseSizeLarge] = useState('');

  // Additional images
  const [extraImagePreviews, setExtraImagePreviews] = useState<string[]>([]);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);

  // Addons
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

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
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
    setExtraImageFiles((prev) => [...prev, ...nextFiles].slice(0, 5));
    setExtraImagePreviews((prev) => [...prev, ...nextPreviews].slice(0, 5));
  };

  const removeExtraImage = (idx: number) => {
    setExtraImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setExtraImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

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
      },
    ]);
  };

  const removeAddon = (id: string) => {
    setAddonItems((prev) => prev.filter((x) => x.id !== id));
  };

  const updateAddon = (id: string, field: keyof AddonItem, value: any) => {
    setAddonItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
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

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    const parsedPrice = parseNumberInput(basePrice);

    // Build base sizes
    let sizes: any[] | undefined;
    let resolvedBasePrice = parsedPrice;
    if (hasBaseSizes) {
      sizes = [];
      const s = parseNumberInput(baseSizeSmall);
      const m = parseNumberInput(baseSizeMedium);
      const l = parseNumberInput(baseSizeLarge);
      if (Number.isFinite(s) && s >= 0)
        sizes.push({ label: 'صغير', price: Math.round(s * 100) / 100 });
      if (Number.isFinite(m) && m >= 0)
        sizes.push({ label: 'وسط', price: Math.round(m * 100) / 100 });
      if (Number.isFinite(l) && l >= 0)
        sizes.push({ label: 'كبير', price: Math.round(l * 100) / 100 });
      if (sizes.length > 0) {
        const min = Math.min(...sizes.map((t) => Number(t.price || 0)));
        if (Number.isFinite(min)) resolvedBasePrice = min;
      }
    }

    // Addons
    const addonsPayload =
      addonItems.length > 0
        ? [
            {
              id: 'addons',
              name: 'إضافات',
              label: 'إضافات',
              title: 'إضافات',
              options: addonItems
                .map((a) => ({
                  id: a.id,
                  name: a.name.trim(),
                  price:
                    Number.isFinite(parseNumberInput(a.price)) && parseNumberInput(a.price) >= 0
                      ? Math.round(parseNumberInput(a.price) * 100) / 100
                      : undefined,
                }))
                .filter((o) => o.name),
            },
          ]
        : undefined;

    if (!Number.isFinite(resolvedBasePrice) || resolvedBasePrice < 0) {
      alert('السعر غير صحيح');
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

      const allImages = [finalImageUrl, ...extraUrls].filter(Boolean).slice(0, 6);

      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: resolvedBasePrice,
        stock: 0,
        category: category || 'عام',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        trackStock: false,
        isHot,
        images: allImages,
        ...(sizes && sizes.length > 0 ? { sizes } : {}),
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
        <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
          <span className="text-2xl">☕</span>
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">إضافة منتج مقهى</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            إضافة مشروب أو منتج مقهى مع خيارات الأحجام
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
              placeholder="مثال: اسبريسو"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

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

        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHot"
              checked={isHot}
              onChange={(e) => setIsHot(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="isHot" className="text-sm font-medium text-slate-700">
              مشروب ساخن
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasBaseSizes"
            checked={hasBaseSizes}
            onChange={(e) => setHasBaseSizes(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          <label htmlFor="hasBaseSizes" className="text-sm font-medium text-slate-700">
            أحجام مختلفة (صغير/وسط/كبير)
          </label>
        </div>
      </div>

      {/* Base Sizes Section */}
      {hasBaseSizes && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">الأحجام والأسعار</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">صغير (ج.م)</label>
              <input
                type="number"
                value={baseSizeSmall}
                onChange={(e) => setBaseSizeSmall(e.target.value)}
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                placeholder="0.00"
              />
            </div>
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">وسط (ج.م)</label>
              <input
                type="number"
                value={baseSizeMedium}
                onChange={(e) => setBaseSizeMedium(e.target.value)}
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                placeholder="0.00"
              />
            </div>
            <div className="text-right">
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">كبير (ج.م)</label>
              <input
                type="number"
                value={baseSizeLarge}
                onChange={(e) => setBaseSizeLarge(e.target.value)}
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      )}

      {/* Addons Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">إضافات</h2>
          <button
            onClick={addAddon}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all"
          >
            <Plus size={16} />
            <span>إضافة</span>
          </button>
        </div>

        {addonItems.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Package size={32} className="mx-auto mb-2" />
            <p className="text-sm">لا توجد إضافات</p>
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
                    placeholder="اسم الإضافة"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-bold text-right outline-none text-sm"
                  />
                </div>
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
