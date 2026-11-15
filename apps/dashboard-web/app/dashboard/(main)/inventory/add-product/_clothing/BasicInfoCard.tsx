'use client';

import { Image as ImageIcon, Info, ChevronDown, Map, Plus, X } from 'lucide-react';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';
import { GOOGLE_PRODUCT_CATEGORIES } from './types';

type Props = {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  basePrice: string;
  setBasePrice: (v: string) => void;
  costPrice: string;
  setCostPrice: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categories: any[];
  brand: string;
  setBrand: (v: string) => void;
  googleCategory: string;
  setGoogleCategory: (v: string) => void;
  localCategory: string;
  setLocalCategory: (v: string) => void;
  material: string;
  setMaterial: (v: string) => void;
  gender: string;
  setGender: (v: string) => void;
  stock: string;
  setStock: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  imageUrl: string;
  youtubeUrl: string;
  setYoutubeUrl: (v: string) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExtraImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeExtraImage: (index: number) => void;
  extraImagePreviews: string[];
  isInstalled: (app: string) => boolean;
  setImageMapModalOpen: (v: boolean) => void;
  onQuickAddCategory: () => void;
};

export default function ClothingBasicInfoCard({
  name,
  setName,
  description,
  setDescription,
  basePrice,
  setBasePrice,
  costPrice,
  setCostPrice,
  category,
  setCategory,
  categories,
  brand,
  setBrand,
  googleCategory,
  setGoogleCategory,
  localCategory,
  setLocalCategory,
  material,
  setMaterial,
  gender,
  setGender,
  stock,
  setStock,
  isActive,
  setIsActive,
  imageUrl,
  youtubeUrl,
  setYoutubeUrl,
  dragOver,
  setDragOver,
  handleImageUpload,
  handleExtraImagesChange,
  removeExtraImage,
  extraImagePreviews,
  isInstalled,
  setImageMapModalOpen,
  onQuickAddCategory,
}: Props) {
  return (
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
              <img src={src} className="w-full h-full object-cover" alt={`extra ${idx + 1}`} />
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
              onClick={onQuickAddCategory}
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
  );
}
