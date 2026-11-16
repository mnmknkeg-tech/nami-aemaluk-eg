'use client';

import React from 'react';
import { Image as ImageIcon, Info, ChevronDown } from 'lucide-react';
import { RichDescriptionEditor } from '@/components/products/RichDescriptionEditor';
import { GOOGLE_PRODUCT_CATEGORIES } from './types';

interface BasicInfoCardProps {
  dragOver: boolean;
  setDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageUrl: string;
  youtubeUrl: string;
  onYoutubeUrlChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  price: string;
  onPriceChange: (v: string) => void;
  costPrice: string;
  onCostPriceChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: any[];
  onQuickCategory: () => void;
  brand: string;
  onBrandChange: (v: string) => void;
  googleCategory: string;
  onGoogleCategoryChange: (v: string) => void;
  localCategory: string;
  onLocalCategoryChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  isActive: boolean;
  onIsActiveChange: (v: boolean) => void;
}

export default function BasicInfoCard({
  dragOver,
  setDragOver,
  onImageUpload,
  imageUrl,
  youtubeUrl,
  onYoutubeUrlChange,
  name,
  onNameChange,
  price,
  onPriceChange,
  costPrice,
  onCostPriceChange,
  category,
  onCategoryChange,
  categories,
  onQuickCategory,
  brand,
  onBrandChange,
  googleCategory,
  onGoogleCategoryChange,
  localCategory,
  onLocalCategoryChange,
  description,
  onDescriptionChange,
  isActive,
  onIsActiveChange,
}: BasicInfoCardProps) {
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
            onImageUpload({ target: { files: [file] } } as any);
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
                <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3 text-left border-t border-slate-100 pt-2" dir="ltr">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
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
            onChange={(e) => onNameChange(e.target.value)}
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
              onChange={(e) => onPriceChange(e.target.value)}
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
              onChange={(e) => onCostPriceChange(e.target.value)}
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
              onChange={(e) => onCategoryChange(e.target.value)}
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
              onClick={onQuickCategory}
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
            onChange={(e) => onBrandChange(e.target.value)}
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
          onChange={(e) => onGoogleCategoryChange(e.target.value)}
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
            onChange={(e) => onLocalCategoryChange(e.target.value)}
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
          onChange={onDescriptionChange}
          placeholder="اكتب مكونات الوجبة والمقبلات وتفاصيل الطهي والتقديم..."
        />
      </div>

      {/* Available for sale / order */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 accent-teal-600"
        />
        <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
          متاح للطلب والبيع في المتجر
        </label>
      </div>
    </div>
  );
}
