'use client';

import React from 'react';
import {
  CalendarClock,
  Upload,
  Youtube,
  Plus,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Code,
} from 'lucide-react';

interface BasicInfoCardProps {
  isActive: boolean;
  onIsActiveChange: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageUrl: string;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
}

export default function BasicInfoCard({
  isActive,
  onIsActiveChange,
  fileInputRef,
  imageUrl,
  onImageUpload,
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
}: BasicInfoCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <CalendarClock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">المعلومات الأساسية</h3>
            <p className="text-[11px] text-slate-400">بيانات الخدمة، الاسم، والصور</p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
          <span>مفعلة بالمتجر</span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => onIsActiveChange(e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
          />
        </label>
      </div>

      {/* Media Upload */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          صورة الحجز ورابط الفيديو
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative group w-full h-28">
                <img
                  src={imageUrl}
                  alt="Booking"
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-bold">
                  تغيير الصورة
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
                  <Upload size={18} />
                </div>
                <p className="text-xs font-bold text-slate-700">اسحب الصورة وأفلتها هنا</p>
                <p className="text-[10px] text-slate-400 mt-0.5">أو اضغط للاختيار من جهازك</p>
              </>
            )}
          </div>

          {/* YouTube Link */}
          <div className="flex flex-col justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Youtube size={16} className="text-red-500" />
              <span>رابط فيديو يوتيوب (اختياري)</span>
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
              dir="ltr"
            />
            <p className="text-[10px] text-slate-400">
              يمكنك وضع رابط فيديو توضيحي للخدمة أو الجلسة
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          اسم الخدمة أو الحجز <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            placeholder="مثال: استشارة قانونية، جلسة مساج وسبا، كشف أسنان، ورشة تدريبية"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <span className="absolute left-3 top-2.5 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
            AR
          </span>
        </div>
      </div>

      {/* Price & Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            سعر الحجز للعميل <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="0.00"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
              ج.م
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            سعر التكلفة (اختياري)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => onCostPriceChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
              ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Categories & Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">التصنيف</label>
            <button
              type="button"
              onClick={onQuickCategory}
              className="text-[10px] text-teal-600 font-bold hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} />
              <span>إضافة تصنيف جديد</span>
            </button>
          </div>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          >
            <option value="">اختر التصنيف...</option>
            {categories.map((cat: any) => (
              <option key={cat.id || cat.name} value={cat.name || cat.nameAr}>
                {cat.nameAr || cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            العلامة التجارية / مقدم الخدمة
          </label>
          <input
            type="text"
            placeholder="مثال: عيادة د. أحمد، مركز الرعاية، Ray Spa"
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Google & Local Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            تصنيفات جوجل (Google Shopping)
          </label>
          <select
            value={googleCategory}
            onChange={(e) => onGoogleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
          >
            <option value="الصحة والجمال">الصحة والجمال</option>
            <option value="الفن والترفيه">الفن والترفيه</option>
            <option value="تجاري وصناعي">تجاري وصناعي</option>
            <option value="ملابس وإكسسوارات">ملابس وإكسسوارات</option>
            <option value="إلكترونيات">إلكترونيات</option>
            <option value="المأكولات والمشروبات والتبغ">المأكولات والمشروبات والتبغ</option>
            <option value="الأثاث">الأثاث</option>
            <option value="الحديقة والمنزل">الحديقة والمنزل</option>
            <option value="الرضيع والطفل">الرضيع والطفل</option>
            <option value="وسائط">وسائط</option>
            <option value="المستلزمات المكتبية">المستلزمات المكتبية</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">تصنيف محلي</label>
          <input
            type="text"
            placeholder="مثال: حجوزات VIP، عروض نهاية الأسبوع"
            value={localCategory}
            onChange={(e) => onLocalCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Description with Toolbar mockup */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-700">وصف الخدمة أو الحجز</label>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
              title="محاذاة لليمين"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
              title="توسيط"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
              title="محاذاة لليسار"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
              title="ضبط"
            >
              <AlignJustify size={13} />
            </button>
            <span className="w-px h-3 bg-slate-300 mx-0.5" />
            <button
              type="button"
              className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded flex items-center gap-0.5"
              title="HTML"
            >
              <Code size={13} />
              <span className="text-[10px]">HTML</span>
            </button>
          </div>
        </div>
        <div className="relative">
          <textarea
            rows={4}
            placeholder="اكتب وصفاً مفصلاً عن الخدمة، ماذا تشمل الجلسة، الشروط والتعليمات..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
          />
          <span className="absolute left-3 bottom-3 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
            AR
          </span>
        </div>
      </div>
    </div>
  );
}
