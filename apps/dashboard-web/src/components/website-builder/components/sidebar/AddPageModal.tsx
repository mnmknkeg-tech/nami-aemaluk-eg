import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Navigation,
  FolderTree,
  EyeOff,
  Globe,
  Check,
  X,
  Sparkles,
  Layers,
  ShoppingBag,
  Wrench,
  PhoneCall,
  Layout,
  Tag,
  ArrowRight,
  Info,
  User,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { PagePlacementMode, AddPageOptions } from '../../types/builder';

interface AddPageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPageModal: React.FC<AddPageModalProps> = ({ isOpen, onClose }) => {
  const { addPage, getHeaderDropdownNavItems } = useBuilder();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [placement, setPlacement] = useState<PagePlacementMode>('header_direct');
  const [headerTitle, setHeaderTitle] = useState('');
  const [parentNavId, setParentNavId] = useState('');
  const [dropdownDescription, setDropdownDescription] = useState('');
  const [dropdownBadge, setDropdownBadge] = useState('');
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState(true);
  const [pageTemplate, setPageTemplate] = useState<
    | 'blank'
    | 'hero_services'
    | 'catalog_grid'
    | 'contact_form'
    | 'landing_page'
    | 'product_page'
    | 'login_page'
    | 'register_page'
  >('catalog_grid');

  const availableDropdowns = getHeaderDropdownNavItems();

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(val.toLowerCase().replace(/\s+/g, '-'));
    }
    if (!headerTitle || headerTitle === name) {
      setHeaderTitle(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const options: AddPageOptions = {
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
      placement,
      headerTitle: headerTitle.trim() || name.trim(),
      parentNavId:
        placement === 'header_dropdown' ? parentNavId || availableDropdowns[0]?.id : undefined,
      dropdownDescription: dropdownDescription.trim(),
      dropdownBadge: dropdownBadge.trim(),
      includeHeaderFooter,
      pageTemplate,
    };

    addPage(options);
    onClose();
  };

  return createPortal(
    <div
      id="add_page_modal_overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="add_page_modal_card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">إضافة صفحة جديدة وتخصيص مسارها</h2>
              <p className="text-[11px] text-slate-500">
                حدد مكان ظهور الصفحة في الهيدر، أو إدراجها داخل قسم منسدل، أو كصفحة مستقلة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Basic Page Info */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>1. المعلومات الأساسية للصفحة</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  اسم الصفحة *
                </span>
                <input
                  type="text"
                  placeholder="مثال: عروض 2025 الحصرية، باقات الصيانة"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-hidden focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">
                  المسار الرابط (Slug) *
                </span>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:bg-white transition-colors">
                  <span className="text-slate-400 font-mono text-[11px] select-none ml-1">/</span>
                  <input
                    type="text"
                    placeholder="exclusive-deals"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="w-full bg-transparent font-mono text-[11px] outline-hidden text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Placement Selection Cards */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>2. أين تريد ظهور الصفحة وطريقة التوجيه؟</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Direct Header Link */}
              <div
                onClick={() => setPlacement('header_direct')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  placement === 'header_direct'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      placement === 'header_direct'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>رابط مباشر في شريط الهيدر</span>
                      {placement === 'header_direct' && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      يظهر كزر/رابط رئيسي علوي مباشر بجانب روابط القائمة
                    </p>
                  </div>
                </div>
              </div>

              {/* Option B: Nested inside Header Dropdown */}
              <div
                onClick={() => setPlacement('header_dropdown')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  placement === 'header_dropdown'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      placement === 'header_dropdown'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>داخل قائمة منسدلة لقسم في الهيدر</span>
                      {placement === 'header_dropdown' && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      يضاف كعنصر فرعي أنيق داخل إحدى قوائم الأقسام المنسدلة
                    </p>
                  </div>
                </div>
              </div>

              {/* Option C: Standalone Page */}
              <div
                onClick={() => setPlacement('standalone')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  placement === 'standalone'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      placement === 'standalone'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>صفحة مستقلة فقط (بدون رابط بالهيدر)</span>
                      {placement === 'standalone' && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      صفحة هبوط أو صفحة ترويجية خاصة يتم التوجيه لها برابط مباشر
                    </p>
                  </div>
                </div>
              </div>

              {/* Option D: Header and Footer */}
              <div
                onClick={() => setPlacement('header_and_footer')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  placement === 'header_and_footer'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      placement === 'header_and_footer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>في الهيدر والفوتر معاً</span>
                      {placement === 'header_and_footer' && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      تظهر في شريط التنقل العلوي وأسفل الموقع في روابط الفوتر
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-options for Selected Placement */}
            {(placement === 'header_direct' || placement === 'header_and_footer') && (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                <span className="text-[11px] font-bold text-blue-900 block">
                  النص الظاهر في شريط الهيدر
                </span>
                <input
                  type="text"
                  placeholder="مثال: العروض الخاصة"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-hidden focus:border-blue-500"
                />
              </div>
            )}

            {placement === 'header_dropdown' && (
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-bold text-blue-900 block mb-1">
                    اختر قسم الهيدر الأب:
                  </span>
                  <select
                    value={parentNavId || availableDropdowns[0]?.id || 'nav_link_2'}
                    onChange={(e) => setParentNavId(e.target.value)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-medium outline-hidden focus:border-blue-500"
                  >
                    {availableDropdowns.map((drop) => (
                      <option key={drop.id} value={drop.id}>
                        {drop.title} ({drop.itemsCount} عناصر حالياً)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      الوصف المختصر للعنصر بالمنسدلة:
                    </span>
                    <input
                      type="text"
                      placeholder="مثال: أحدث العروض والأسعار الحصرية"
                      value={dropdownDescription}
                      onChange={(e) => setDropdownDescription(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">
                      شارة مميزة (Badge - اختياري):
                    </span>
                    <input
                      type="text"
                      placeholder="مثال: جديد، خصم 20%، حصري"
                      value={dropdownBadge}
                      onChange={(e) => setDropdownBadge(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Initial Template Selector */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>3. قالب الصفحة ومحتواها المبدئي</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                onClick={() => setPageTemplate('catalog_grid')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'catalog_grid'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">معرض / منتجات</span>
              </div>

              <div
                onClick={() => setPageTemplate('hero_services')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'hero_services'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Wrench className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">خدمات ومزايا</span>
              </div>

              <div
                onClick={() => setPageTemplate('contact_form')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'contact_form'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <PhoneCall className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">تواصل ونموذج</span>
              </div>

              <div
                onClick={() => setPageTemplate('product_page')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'product_page'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Tag className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">صفحة منتج وتفاصيل</span>
              </div>

              <div
                onClick={() => {
                  setPageTemplate('login_page');
                  if (!name || name === 'صفحة جديدة') {
                    setName('تسجيل الدخول');
                    setSlug('login');
                    setHeaderTitle('تسجيل الدخول');
                  }
                }}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'login_page'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Lock className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                <span className="text-[11px] block">تسجيل الدخول</span>
              </div>

              <div
                onClick={() => {
                  setPageTemplate('register_page');
                  if (!name || name === 'صفحة جديدة') {
                    setName('إنشاء حساب');
                    setSlug('register');
                    setHeaderTitle('إنشاء حساب');
                  }
                }}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'register_page'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <UserCheck className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                <span className="text-[11px] block">إنشاء حساب</span>
              </div>

              <div
                onClick={() => setPageTemplate('blank')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  pageTemplate === 'blank'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Layout className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">صفحة فارغة</span>
              </div>
            </div>
          </div>

          {/* 4. Include Header & Footer Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  تضمين الهيدر والفوتر العامين
                </span>
                <span className="text-[10px] text-slate-500">
                  إبقاء شريط الهيدر وشريط الفوتر متصلين وموحدين في هذه الصفحة
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeHeaderFooter}
                onChange={(e) => setIncludeHeaderFooter(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>إنشاء وإضافة الصفحة</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
