'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  X,
  ArrowRight,
  Loader2,
  Save,
  Upload,
  Image as ImageIcon,
  Info,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  Globe2,
  Key,
} from 'lucide-react';
import { useShop } from '@/hooks/useShop';
import ExtendedProductSections, {
  type ProductExtraData,
  defaultExtraData,
} from '@/components/products/ExtendedProductSections';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';
import { apiRequest } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const GOOGLE_PRODUCT_CATEGORIES = [
  'وسائط',
  'إلكترونيات',
  'الفن والترفيه',
  'تجاري وصناعي',
  'المستلزمات المكتبية',
  'ملابس وإكسسوارات',
  'المأكولات والمشروبات والتبغ',
  'الأثاث',
  'الصحة والجمال',
  'الحديقة والمنزل',
  'الرضيع والطفل',
  'أجهزة',
  'المركبات وقطع الغيار',
  'مستلزمات الحيوانات والحيوانات الأليفة',
  'كاميرات وأجهزة بصرية',
];

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
export default function GiftCardAddProductPage() {
  const { shop } = useShop();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Product form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [googleCategory, setGoogleCategory] = useState('وسائط');
  const [localCategory, setLocalCategory] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  // Digital codes state
  const [codeType, setCodeType] = useState<'general' | 'by_country'>('general');
  const [targetCountry, setTargetCountry] = useState('US');
  const [inputMode, setInputMode] = useState<'manual' | 'file'>('manual');
  const [rawCodesInput, setRawCodesInput] = useState('');
  const [digitalCodes, setDigitalCodes] = useState<string[]>([]);

  // Extended sections data for Gift Card
  const [extraData, setExtraData] = useState<ProductExtraData>(() => ({
    ...defaultExtraData(),
    requiresShipping: false,
    unlimitedStock: false,
  }));

  // Quick category modal
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit mode
  const [editId, setEditId] = useState('');
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    loadCategories();
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

      const ex = (p.extraData || {}) as ProductExtraData & {
        digitalCodes?: string[];
        codeType?: string;
        targetCountry?: string;
      };
      setExtraData({ ...defaultExtraData(), ...ex, requiresShipping: false });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setGoogleCategory(String(ex.googleCategory || 'وسائط'));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));
      if (Array.isArray(ex.digitalCodes)) {
        setDigitalCodes(ex.digitalCodes);
      }
      if (ex.codeType) {
        setCodeType(ex.codeType as any);
      }
      if (ex.targetCountry) {
        setTargetCountry(ex.targetCountry);
      }
    } catch (err: any) {
      console.error('Failed to load giftcard product for edit:', err);
      alert(err?.message || 'تعذر تحميل بيانات المنتج للتعديل');
    } finally {
      setLoadingProduct(false);
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

  // Add codes from textarea
  const handleAddCodes = () => {
    const lines = rawCodesInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    // Filter duplicates against existing codes
    const newUnique = lines.filter((code) => !digitalCodes.includes(code));
    setDigitalCodes((prev) => [...prev, ...newUnique]);
    setRawCodesInput('');
  };

  const handleRemoveCode = (index: number) => {
    setDigitalCodes((prev) => prev.filter((_, i) => i !== index));
  };

  // Parse text file with codes
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      const newUnique = lines.filter((code) => !digitalCodes.includes(code));
      setDigitalCodes((prev) => [...prev, ...newUnique]);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    const resolvedBasePrice = parseNumberInput(price);
    if (!Number.isFinite(resolvedBasePrice) || resolvedBasePrice < 0) {
      alert('يرجى إدخال سعر صحيح للمنتج');
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
        category: category || 'بطاقات رقمية',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        unit: 'giftcard',
        stock: digitalCodes.length,
        trackStock: true,
        ...(brand ? { brand } : {}),
        extraData: {
          ...extraData,
          costPrice: costPrice ? Number(costPrice) : null,
          brand: brand || undefined,
          googleCategory: googleCategory || undefined,
          localCategory: localCategory || undefined,
          youtubeUrl: youtubeUrl || undefined,
          requiresShipping: false,
          codeType,
          targetCountry: codeType === 'by_country' ? targetCountry : undefined,
          digitalCodes,
        },
      };

      if (editId) {
        await apiRequest(`/products/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
        alert('تم تحديث البطاقة الرقمية بنجاح');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        alert('تم إنشاء المنتج بنجاح');
      }
      router.push('/dashboard/inventory/products');
    } catch (err: any) {
      console.error('Failed to save giftcard product:', err);
      alert(err?.message || 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const parsedCodesCount = rawCodesInput
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div
      className="min-h-full bg-[#F4F5F7] p-4 sm:p-6 md:p-8 space-y-6"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CreditCard size={26} />
        </div>
        <div className="text-right flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {editId ? 'تعديل بطاقة رقمية' : 'إضافة بطاقة رقمية'}
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            بطاقات مسبقة الدفع واشتراكات وكروت هدايا مع تسليم فوري للأكواد بعد الدفع
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
          <span>{editId ? 'حفظ التعديلات' : 'إنشاء المنتج'}</span>
        </button>
      </div>

      {/* Feature Banner: متاحة في باقتك / قدّم بطاقات رقمية لعملائك */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/80 via-white to-teal-50/50 p-5 sm:p-6 text-right relative overflow-hidden shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-teal-800 text-[11px] font-bold">
              <Sparkles size={12} className="text-teal-600" />
              <span>متاحة في باقتك</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">قدّم بطاقات رقمية لعملائك</h2>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              أرسل بطاقات رقمية فورية لعملائك دون شحن — مثالية للهدايا والكوبونات.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                <span>إرسال البطاقة مباشرة للعميل</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                <span>استخدام فوري بدون شحن</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                <span>مناسب للهدايا الرقمية والكوبونات</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              alert(
                'البطاقات الرقمية تتيح إضافة أكواد مسبقة يتم تسليم كود تلقائي منها للعميل في فاتورته ورسالة الشراء فور إتمام الدفع.'
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-teal-300 bg-white text-teal-700 text-xs font-bold hover:bg-teal-50 transition-colors shrink-0 shadow-2xs self-start md:self-center"
          >
            <HelpCircle size={14} />
            <span>اعرف أكثر</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left column (Live Preview) + Right column (Fields & Sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Live preview panel (Sticky on Desktop) */}
        <div className="bg-white rounded-2xl p-5 lg:sticky lg:top-4 text-center border border-slate-200/80 shadow-xs order-2 lg:order-1">
          <div className="w-full aspect-square rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-4 relative">
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                <ImageIcon size={44} />
              </div>
            )}
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
              <Zap size={10} /> بطاقة رقمية
            </span>
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

          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 text-[11px] font-bold mb-2">
            🔑 المخزون الحالي: {digitalCodes.length} كود جاهز للتسليم
          </div>

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
                  placeholder="أدخل اسم البطاقة الرقمية (مثال: بطاقة بلايستيشن 50$)"
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
                  السعر * <Info size={13} className="text-slate-300" />
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
                placeholder="اكتب تعليمات تفعيل وشحن الكود وشروط الاستخدام..."
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

          {/* 2. Digital Card Codes Card (أكواد البطاقات الرقمية) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6 shadow-xs text-right">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                {digitalCodes.length} كود متوفر
              </span>
              <h2 className="text-base font-bold text-slate-900">أكواد البطاقات الرقمية</h2>
            </div>

            {/* Code type */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 block">نوع البطاقة الرقمية</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    codeType === 'general'
                      ? 'border-purple-600 bg-purple-50/40 text-purple-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <input
                      type="radio"
                      name="codeType"
                      checked={codeType === 'general'}
                      onChange={() => setCodeType('general')}
                      className="accent-purple-600 w-4 h-4"
                    />
                    <span className="text-xs font-black">أكواد عامة</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pr-6">
                    أضف أكواد رقمية دون تعيينها لمتجر دولة معينة.
                  </p>
                </label>

                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    codeType === 'by_country'
                      ? 'border-purple-600 bg-purple-50/40 text-purple-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <input
                      type="radio"
                      name="codeType"
                      checked={codeType === 'by_country'}
                      onChange={() => setCodeType('by_country')}
                      className="accent-purple-600 w-4 h-4"
                    />
                    <span className="text-xs font-black">أكواد حسب المتجر</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pr-6">
                    أضف أكواد رقمية مُخصَّصة لمتجر دولة معينة.
                  </p>
                </label>
              </div>

              {codeType === 'by_country' && (
                <div className="pt-2 flex items-center justify-end gap-2">
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="US">🇺🇸 متجر الولايات المتحدة (US)</option>
                    <option value="SA">🇸🇦 متجر السعودية (SA)</option>
                    <option value="AE">🇦🇪 متجر الإمارات (AE)</option>
                    <option value="EG">🇪🇬 متجر مصر (EG)</option>
                    <option value="KW">🇰🇼 متجر الكويت (KW)</option>
                    <option value="UK">🇬🇧 متجر بريطانيا (UK)</option>
                  </select>
                  <label className="text-xs font-bold text-slate-600">حدد دولة المتجر:</label>
                </div>
              )}
            </div>

            {/* Input tabs: manual / file */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-end gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inputMode === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    رفع ملف
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inputMode === 'manual'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    إدخال يدوي
                  </button>
                </div>
              </div>

              {inputMode === 'manual' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-600 tabular-nums">
                      {parsedCodesCount} كود
                    </span>
                    <label className="text-xs font-bold text-slate-600">أدخل الأكواد</label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    انسخ الأكواد وألصقها هنا، وتأكد من أن كل سطر يحتوي على كود واحد فقط.
                  </p>
                  <textarea
                    rows={4}
                    value={rawCodesInput}
                    onChange={(e) => setRawCodesInput(e.target.value)}
                    dir="ltr"
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-purple-400 bg-slate-50/50"
                    placeholder="XXXX-YYYY-ZZZZ&#10;AAAA-BBBB-CCCC"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCodes}
                      disabled={parsedCodesCount === 0}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-40"
                    >
                      إضافة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
                  <FileSpreadsheet size={32} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">
                    ارفع ملف نصي (.txt أو .csv) يحتوي على كود بكل سطر
                  </p>
                  <label className="inline-block px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs">
                    اختيار ملف الأكواد
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* List of active codes */}
            {digitalCodes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setDigitalCodes([])}
                    className="text-[11px] font-bold text-red-500 hover:underline"
                  >
                    حذف جميع الأكواد
                  </button>
                  <span className="text-xs font-bold text-slate-600">
                    الأكواد المضافة جاهزة للتسليم ({digitalCodes.length})
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50/40">
                  {digitalCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveCode(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">
                        {code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Extended Sections for Gift Card:
                 المعلومات المتقدمة، التخفيضات، قنوات العرض، خيارات الشراء، الوسوم، بيانات SEO، الحقول المخصصة، الإشعارات
          */}
          <ExtendedProductSections
            value={extraData}
            onChange={setExtraData}
            showShipping={false}
            showInventory={false}
            showQuantities={false}
            showProductOptions={false}
            showOrderForm={false}
            showFiles={false}
            showNotifications={true}
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
              <span>{editId ? 'حفظ التعديلات' : 'إنشاء المنتج'}</span>
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
                placeholder="مثال: بطاقات ألعاب / اشتراكات ترفيه"
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
