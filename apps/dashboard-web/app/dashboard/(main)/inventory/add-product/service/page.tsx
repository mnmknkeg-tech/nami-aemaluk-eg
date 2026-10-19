'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
  ClipboardList,
  ArrowRight,
  Save,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import { apiRequest } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import ExtendedProductSections, {
  type ProductExtraData,
  defaultExtraData,
} from '@/components/products/ExtendedProductSections';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';

const GOOGLE_PRODUCT_CATEGORIES = [
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'الفن والترفيه',
  'تجاري وصناعي',
  'كاميرات وأجهزة بصرية',
  'ملابس وإكسسوارات',
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

import { compressForUpload } from '@/lib/upload-image';
export default function ServiceAddProductPage() {
  const { shop } = useShop();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [editId, setEditId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [googleCategory, setGoogleCategory] = useState('');
  const [localCategory, setLocalCategory] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [extraData, setExtraData] = useState<ProductExtraData>(defaultExtraData());

  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam) loadServiceForEdit(editParam);
  }, []);

  const loadServiceForEdit = async (id: string) => {
    setLoadingProduct(true);
    try {
      const data: any = await apiRequest(`/products/${id}`);
      const p = data?.data || data;
      if (!p || !p.id) throw new Error('الخدمة غير موجودة');
      setEditId(String(p.id));
      setName(String(p.name || ''));
      setDescription(String(p.description || ''));
      setPrice(p.price != null ? String(p.price) : '');
      setCategory(typeof p.category === 'string' ? p.category : String(p.category?.name || ''));
      setImageUrl(String(p.imageUrl || p.image_url || ''));
      setIsActive(p.isActive !== false);
      const ex = (p.extraData || {}) as ProductExtraData;
      setExtraData({ ...defaultExtraData(), ...ex });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setBrand(String(ex.brand || ''));
      setGoogleCategory(String(ex.googleCategory || ''));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));
    } catch (err: any) {
      console.error('Failed to load service for edit:', err);
      alert(err?.message || 'تعذر تحميل بيانات الخدمة للتعديل');
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
    } catch (err) {
      alert('حدث خطأ أثناء إضافة التخصص/الفئة');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(await compressForUpload(file, 'product'));
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج أو الخدمة');
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
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

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        category: category || 'خدمات حسب الطلب',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        unit: 'custom_service',
        trackStock: !extraData.unlimitedStock,
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
          body: JSON.stringify(payload),
        });
        alert('تم تحديث الخدمة بنجاح');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        alert('تم إضافة الخدمة بنجاح');
      }
      router.push('/dashboard/inventory');
    } catch (err: any) {
      console.error('Failed to save service:', err);
      alert(err?.message || 'فشل حفظ الخدمة');
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
        <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ClipboardList size={26} />
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {editId ? 'تعديل خدمة حسب الطلب' : 'إضافة خدمة حسب الطلب'}
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            {editId
              ? 'عدّل بيانات الخدمة ونموذج الطلب الخاص بها'
              : 'خدمات مخصصة كالطباعة، التصاميم، والمكتبات مع نموذج مخصص لاستقبال متطلبات العميل'}
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

        {/* Right column: Basic info + Extended sections */}
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
                  <label className="inline-block mt-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs">
                    اختار من المعرض
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
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
                اسم المنتج <Info size={13} className="text-slate-300" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-16 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400"
                  placeholder="أدخل اسم المنتج"
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
                  السعر <span className="text-red-500">*</span>{' '}
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
                    placeholder="أدخل السعر"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">
                    #
                  </span>
                </div>
              </div>

              {/* Cost price */}
              <div className="text-right">
                <label className="text-xs font-bold text-slate-500 mb-1.5 inline-flex items-center gap-1">
                  سعر التكلفة <Info size={13} className="text-slate-300" />
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
                placeholder="اكتب مواصفات وتفاصيل الخدمة وما تشمله..."
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

          {/* 2. Extended sections (المعلومات المتقدمة، التخفيضات، قنوات عرض المنتج، خيارات الشراء، الوسوم، الشحن، المخزون، بيانات SEO، الكميات، الخيارات، نموذج الطلب، الحقول المخصصة، الإشعارات) */}
          <ExtendedProductSections value={extraData} onChange={setExtraData} showOrderForm={true} />

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
              <span>{editId ? 'حفظ التعديلات' : 'حفظ الخدمة'}</span>
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
                placeholder="مثال: خدمات الطباعة والتصوير"
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
    </div>
  );
}
