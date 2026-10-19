'use client';

import React, { useState, useEffect } from 'react';
import {
  Shirt,
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

const GOOGLE_PRODUCT_CATEGORIES = [
  'ملابس وإكسسوارات',
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'الفن والترفيه',
  'تجاري وصناعي',
  'كاميرات وأجهزة بصرية',
  'إلكترونيات',
  'المأكولات والمشروبات والتبغ',
  'الأثاث',
  'الصحة والجمال',
  'الحديقة والمنزل',
  'الرضيع والطفل',
  'أجهزة',
  'وسائط',
  'المركبات وقطع الغيار',
  'المستلزمات المكتبية',
];

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
export default function ClothingAddProductPage() {
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

  const handleAddonImagesChange = async (id: string, files: File[]) => {
    const addon = addonItems.find((a) => a.id === id);
    if (!addon) return;
    const remaining = 5 - addon.imagePreviews.length;
    const toAdd = files.slice(0, remaining);
    const compressedToAdd = await Promise.all(toAdd.map((f) => compressForUpload(f, 'gallery')));
    const newFiles = [...addon.imageUploadFiles, ...compressedToAdd];
    updateAddon(id, 'imageUploadFiles', newFiles);
    compressedToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAddonItems((current) =>
          current.map((a) =>
            a.id === id ? { ...a, imagePreviews: [...a.imagePreviews, reader.result as string] } : a
          )
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAddonImage = (id: string, index: number) => {
    const addon = addonItems.find((a) => a.id === id);
    if (!addon) return;
    const previews = addon.imagePreviews.filter((_, i) => i !== index);
    const files = addon.imageUploadFiles.filter((_, i) => i !== index);
    updateAddon(id, 'imagePreviews', previews);
    updateAddon(id, 'imageUploadFiles', files);
  };

  const toggleAddonColor = (id: string, color: { name: string; value: string }) => {
    const addon = addonItems.find((a) => a.id === id);
    if (!addon) return;
    const exists = addon.selectedColors.some((c) => c.value === color.value);
    const next = exists
      ? addon.selectedColors.filter((c) => c.value !== color.value)
      : [...addon.selectedColors, color];
    updateAddon(id, 'selectedColors', next);
  };

  const toggleAddonSize = (id: string, size: string) => {
    const addon = addonItems.find((a) => a.id === id);
    if (!addon) return;
    const exists = addon.selectedSizes.includes(size);
    const next = exists
      ? addon.selectedSizes.filter((s) => s !== size)
      : [...addon.selectedSizes, size];
    updateAddon(id, 'selectedSizes', next);
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Shirt size={26} />
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {editId ? 'تعديل منتج (ملموس)' : 'إضافة منتج ملابس (ملموس)'}
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            {editId
              ? 'عدّل بيانات المنتج الملموس مع خيارات الألوان والمقاسات والمواصفات'
              : 'منتجات ملموسة جاهزة للشحن والتسليم — مع خيارات الألوان والمقاسات والمواصفات'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/inventory')}
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

          {/* Extra thumbnails preview */}
          {extraImagePreviews.length > 0 && (
            <div className="flex gap-1.5 justify-center mb-3 overflow-x-auto py-1">
              {extraImagePreviews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />
              ))}
            </div>
          )}

          {name.trim() ? (
            <p className="text-sm font-black text-slate-900 mb-1">{name.trim()}</p>
          ) : null}
          {basePrice ? (
            <p className="text-sm font-black text-teal-600 mb-2">
              ج.م {Number(basePrice).toFixed(2)}
              {extraData.discountPrice ? (
                <span className="text-[11px] font-bold text-slate-400 line-through mr-2">
                  ج.م {Number(extraData.discountPrice).toFixed(2)}
                </span>
              ) : null}
            </p>
          ) : null}
          {extraData.subtitle || extraData.promoTitle ? (
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-2">
              {[extraData.promoTitle, extraData.subtitle].filter(Boolean).join(' — ')}
            </p>
          ) : null}

          {/* Colors preview */}
          {selectedColors.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center my-2">
              {selectedColors.map((c) => (
                <span
                  key={c.value}
                  className="w-4 h-4 rounded-full border border-slate-200 inline-block"
                  style={{ background: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Sizes preview */}
          {fashionSizeItems.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center my-1">
              {fashionSizeItems.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600"
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {!name.trim() && !basePrice && (
            <div className="text-center py-2">
              <p className="text-xs font-black text-slate-700 mb-1.5">أضف المعلومات الأساسية</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تُظهر المعاينة الصورة، الاسم، السعر، السعر المخفض, العنوان الفرعي والترويجي. ستتمكن
                من معاينة صفحة المنتج الكاملة على ثيم متجرك بعد الحفظ.
              </p>
            </div>
          )}
        </div>

        {/* Right column: Basic info + Fashion Details + Extended sections */}
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

            {/* Additional Images */}
            <div className="text-right pt-1">
              <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                صور إضافية (حتى 5 صور) <Info size={13} className="text-slate-300" />
              </label>
              <div className="flex flex-wrap gap-2">
                {extraImagePreviews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs"
                  >
                    <img
                      src={src}
                      className="w-full h-full object-cover"
                      alt={`extra ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {extraImagePreviews.length < 5 && (
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all text-slate-400">
                    <Plus size={16} />
                    <span className="text-[9px] font-bold mt-0.5">إضافة</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleExtraImagesChange}
                      className="hidden"
                    />
                  </label>
                )}
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
                  placeholder="أدخل اسم المنتج (مثال: تيشيرت قطني أوفر سايز)"
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
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
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
                  placeholder="مثال: Zara / Nike"
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

            {/* Material, Gender, Quick Stock (3 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  المادة / الخامة <Info size={13} className="text-slate-300" />
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="مثال: 100% قطن"
                />
              </div>

              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  الجنس <Info size={13} className="text-slate-300" />
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 focus:outline-none focus:border-teal-400"
                >
                  <option value="">اختر الجنس</option>
                  <option value="men">رجال</option>
                  <option value="women">نساء</option>
                  <option value="kids">أطفال</option>
                  <option value="unisex">للجنسين</option>
                </select>
              </div>

              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  المخزون الإجمالي <span className="text-red-500">*</span>{' '}
                  <Info size={13} className="text-slate-300" />
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  min="0"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="0"
                />
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
                placeholder="اكتب مواصفات وتفاصيل المنتج والقماش ومقاسات الموديل..."
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

          {/* 2. Tangible Options Card: Colors, Sizes, Packs & Addons */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              خيارات المنتج الملموس (الألوان والمقاسات)
            </h2>

            {/* Colors */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block text-right">
                الألوان المتاحة
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                {presetColors.map((c) => {
                  const isSelected = selectedColors.some((x) => x.value === c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleColor(c)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/40"
                        style={{ background: c.value }}
                      />
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {/* Custom color input */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={addCustomColor}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-black transition-all"
                >
                  إضافة لون مخصص
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-10 h-8 rounded-lg border border-slate-200 bg-white cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-500">اختر من اللوحة</span>
                </div>
              </div>

              {/* Selected colors chips */}
              {selectedColors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {selectedColors.map((c) => (
                    <span
                      key={c.value}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300"
                        style={{ background: c.value }}
                      />
                      {c.name}
                      <button
                        type="button"
                        onClick={() => toggleColor(c)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sizes */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block text-right">
                المقاسات والأسعار الخاصة
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                {presetSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addPresetSize(s)}
                    disabled={fashionSizeItems.some((x) => x.label === s)}
                    className="px-3 py-1.5 rounded-full border font-bold text-xs transition-all bg-white border-slate-200 hover:border-slate-400 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Custom size input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addCustomSizeItem}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-black transition-all shrink-0"
                >
                  إضافة مقاس مخصص
                </button>
                <input
                  placeholder="مثال: 42 أو مقاس حر..."
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-right outline-none focus:border-teal-400"
                />
              </div>

              {/* Sizes table */}
              {fashionSizeItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  {fashionSizeItems.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <button
                        type="button"
                        onClick={() => removeSize(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold">ج.م</span>
                        <input
                          type="number"
                          value={s.price}
                          onChange={(e) => updateSizePrice(idx, e.target.value)}
                          className="w-24 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center focus:outline-none focus:border-teal-400"
                          placeholder={basePrice || 'السعر'}
                        />
                      </div>
                      <span className="font-bold text-slate-800 text-xs px-2.5 py-1 bg-white rounded-lg border border-slate-200">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pack Options */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packEnabled}
                    onChange={(e) => setPackEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-teal-600"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    تفعيل باقات التوفير (اشترِ أكثر ووفر)
                  </span>
                </label>
                <h3 className="text-xs font-bold text-slate-500">باقات الخيارات</h3>
              </div>

              {packEnabled && (
                <div className="space-y-2.5 pt-2">
                  {packOptionItems.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => removePackOption(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <div className="text-right">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            السعر الإجمالي
                          </label>
                          <input
                            type="number"
                            value={p.price}
                            onChange={(e) => updatePackOption(p.id, 'price', e.target.value)}
                            className="w-28 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-400 text-center"
                            placeholder="السعر"
                          />
                        </div>
                        <div className="text-right">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            الكمية في الباقة
                          </label>
                          <input
                            type="number"
                            value={p.qty}
                            onChange={(e) => updatePackOption(p.id, 'qty', e.target.value)}
                            className="w-24 h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-400 text-center"
                            placeholder="مثال: 3"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPackOption}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                  >
                    <Plus size={14} />
                    <span>إضافة باقة</span>
                  </button>
                </div>
              )}
            </div>

            {/* Addons / Complementary Products */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addAddon}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all"
                >
                  <Plus size={13} />
                  <span>إضافة منتج تكميلي</span>
                </button>
                <h3 className="text-xs font-bold text-slate-700">منتجات تكميلية (Cross-sell)</h3>
              </div>

              {addonItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400 rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
                  <Package size={28} className="mx-auto mb-1.5 text-slate-300" />
                  <p className="text-xs font-bold">لا توجد منتجات تكميلية مقترحة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addonItems.map((a) => (
                    <div
                      key={a.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => removeAddon(a.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors"
                        >
                          حذف
                        </button>
                        <input
                          value={a.price}
                          onChange={(e) => updateAddon(a.id, 'price', e.target.value)}
                          placeholder="السعر (ج.م)"
                          inputMode="decimal"
                          className="w-28 bg-white border border-slate-200 rounded-xl h-10 px-3 font-bold text-right outline-none text-xs focus:border-teal-400"
                        />
                        <input
                          value={a.name}
                          onChange={(e) => updateAddon(a.id, 'name', e.target.value)}
                          placeholder="اسم المنتج التكميلي (مثال: حزام جلدي)"
                          className="flex-1 bg-white border border-slate-200 rounded-xl h-10 px-3 font-bold text-right outline-none text-xs focus:border-teal-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                placeholder="مثال: ملابس صيفية"
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
