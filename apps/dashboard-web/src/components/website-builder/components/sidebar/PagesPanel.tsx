import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Settings,
  Home,
  Navigation,
  FolderTree,
  EyeOff,
  Globe,
  ChevronLeft,
  Copy,
  Sparkles,
  X,
  Layers,
  ArrowRight,
  ExternalLink,
  Check,
  PhoneCall,
  User,
  ShieldCheck,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { Page, PagePlacementMode } from '../../types/builder';
import { AddPageModal } from './AddPageModal';

export const PagesPanel: React.FC = () => {
  const {
    website,
    activePageId,
    switchPage,
    addPage,
    deletePage,
    updatePageMetadata,
    updatePagePlacement,
    getHeaderDropdownNavItems,
  } = useBuilder();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  // Editing page state
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPlacement, setEditPlacement] = useState<PagePlacementMode>('header_direct');
  const [editHeaderTitle, setEditHeaderTitle] = useState('');
  const [editParentNavId, setEditParentNavId] = useState('');
  const [editDropdownDesc, setEditDropdownDesc] = useState('');
  const [editDropdownBadge, setEditDropdownBadge] = useState('');

  const availableDropdowns = getHeaderDropdownNavItems();

  const handleOpenSettings = (p: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPage(p);
    setEditName(p.name);
    setEditSlug(p.slug);
    setEditTitle(p.metadata.title || '');
    setEditDesc(p.metadata.description || '');
    setEditPlacement(p.metadata.placement || 'header_direct');
    setEditHeaderTitle(p.metadata.headerTitle || p.name);
    setEditParentNavId(p.metadata.parentNavId || (availableDropdowns[0]?.id || 'nav_link_2'));
    setEditDropdownDesc('');
    setEditDropdownBadge('');
  };

  const handleDuplicatePage = (page: Page, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicatedName = `${page.name} (نسخة)`;
    const duplicatedSlug = `${page.slug}-copy`;
    addPage({
      name: duplicatedName,
      slug: duplicatedSlug,
      placement: page.metadata.placement || 'standalone',
      headerTitle: duplicatedName,
      includeHeaderFooter: true,
      pageTemplate: 'blank',
    });
  };

  const handleQuickAddPreset = (type: 'contact' | 'login' | 'privacy' | 'about' | 'catalog' | 'blank') => {
    switch (type) {
      case 'contact':
        addPage({
          name: 'اتصل بنا وفروعنا',
          slug: 'contact',
          placement: 'standalone',
          headerTitle: 'اتصل بنا',
          includeHeaderFooter: true,
          pageTemplate: 'contact_form',
        });
        break;
      case 'login':
        addPage({
          name: 'تسجيل الدخول / حسابي',
          slug: 'login',
          placement: 'standalone',
          headerTitle: 'حسابي',
          includeHeaderFooter: true,
          pageTemplate: 'login_page',
        });
        break;
      case 'privacy':
        addPage({
          name: 'سياسة الخصوصية والشروط',
          slug: 'privacy-policy',
          placement: 'standalone',
          headerTitle: 'الخصوصية والشروط',
          includeHeaderFooter: true,
          pageTemplate: 'blank',
        });
        break;
      case 'about':
        addPage({
          name: 'من نحن وقصتنا',
          slug: 'about',
          placement: 'standalone',
          headerTitle: 'من نحن',
          includeHeaderFooter: true,
          pageTemplate: 'hero_services',
        });
        break;
      case 'catalog':
        addPage({
          name: 'كتالوج المتجر والعروض',
          slug: 'catalog',
          placement: 'standalone',
          headerTitle: 'الكتالوج',
          includeHeaderFooter: true,
          pageTemplate: 'catalog_grid',
        });
        break;
      case 'blank':
        addPage({
          name: 'صفحة جديدة مستقلة',
          slug: `page-${Date.now().toString(36)}`,
          placement: 'standalone',
          headerTitle: 'صفحة جديدة',
          includeHeaderFooter: true,
          pageTemplate: 'blank',
        });
        break;
    }
  };

  const handleSavePageSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;

    updatePageMetadata(editingPage.id, {
      title: editTitle.trim() || editName,
      description: editDesc.trim(),
      slug: editSlug.trim() || editName.toLowerCase().replace(/\s+/g, '-'),
      isHomePage: editingPage.metadata.isHomePage,
    });

    if (!editingPage.metadata.isHomePage) {
      updatePagePlacement(editingPage.id, {
        placement: editPlacement,
        headerTitle: editHeaderTitle.trim() || editName,
        parentNavId: editPlacement === 'header_dropdown' ? editParentNavId : undefined,
        dropdownDescription: editDropdownDesc.trim(),
        dropdownBadge: editDropdownBadge.trim(),
      });
    }

    setEditingPage(null);
  };

  const getPlacementBadge = (p: Page) => {
    if (p.metadata.isHomePage) {
      return (
        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <Home className="w-3 h-3" />
          <span>الرئيسية</span>
        </span>
      );
    }

    const mode = p.metadata.placement || 'header_direct';
    if (mode === 'header_dropdown') {
      const parentNav = availableDropdowns.find((d) => d.id === p.metadata.parentNavId);
      return (
        <span className="text-[9px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <FolderTree className="w-3 h-3" />
          <span>منسدلة {parentNav?.title ? `(${parentNav.title})` : ''}</span>
        </span>
      );
    }
    if (mode === 'standalone') {
      return (
        <span className="text-[9px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <EyeOff className="w-3 h-3 text-slate-500" />
          <span>صفحة مستقلة</span>
        </span>
      );
    }
    if (mode === 'header_and_footer') {
      return (
        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <Globe className="w-3 h-3" />
          <span>هيدر وفوتر</span>
        </span>
      );
    }
    return (
      <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
        <Navigation className="w-3 h-3" />
        <span>رابط بالهيدر</span>
      </span>
    );
  };

  return (
    <div className="p-3.5 space-y-4">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">إدارة الصفحات والتنقل</h3>
            <span className="text-[10px] text-slate-400 font-medium block">
              {website.pages.length} صفحات مسجلة
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>صفحة جديدة</span>
        </button>
      </div>

      {/* Quick 1-Click Standalone Page Presets */}
      <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 rounded-2xl space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>إضافة صفحة سريعة بنقرة واحدة (1-Click)</span>
          </span>
          <span className="text-[10px] text-blue-700 bg-blue-100/70 font-bold px-2 py-0.5 rounded-full">
            صفحات منفصلة
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickAddPreset('contact')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">اتصل بنا وفروعنا</span>
              <span className="text-[9px] text-slate-400 block truncate">نموذج + خريطة</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAddPreset('login')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <User className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">تسجيل الدخول</span>
              <span className="text-[9px] text-slate-400 block truncate">حساب العميل</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAddPreset('privacy')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">الخصوصية والشروط</span>
              <span className="text-[9px] text-slate-400 block truncate">صفحة قانونية</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAddPreset('about')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <Building2 className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">من نحن وقصتنا</span>
              <span className="text-[9px] text-slate-400 block truncate">نبذة وفريق العمل</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAddPreset('catalog')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">الكتالوج الكامل</span>
              <span className="text-[9px] text-slate-400 block truncate">شبكة المنتجات</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickAddPreset('blank')}
            className="flex items-center gap-2 p-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-xl text-right transition-all cursor-pointer group shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">صفحة فارغة</span>
              <span className="text-[9px] text-slate-400 block truncate">تخصيص كامل</span>
            </div>
          </button>
        </div>
      </div>

      {/* Pages List */}
      <div className="space-y-2">
        {website.pages.map((p) => {
          const isActive = p.id === activePageId;
          return (
            <div
              key={p.id}
              onClick={() => switchPage(p.id)}
              className={`group flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                  }`}
                >
                  {p.metadata.isHomePage ? <Home className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold truncate text-slate-900">{p.name}</span>
                    {getPlacementBadge(p)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                    /{p.slug}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Duplicate page */}
                <button
                  onClick={(e) => handleDuplicatePage(p, e)}
                  title="تكرار الصفحة"
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Page Settings */}
                <button
                  onClick={(e) => handleOpenSettings(p, e)}
                  title="إعدادات الصفحة وموضعها"
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                {/* Delete page */}
                {!p.metadata.isHomePage && website.pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(p.id);
                    }}
                    title="حذف الصفحة"
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Page Modal Wizard */}
      <AddPageModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Edit Page Settings & Placement Modal */}
      {editingPage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">إعدادات الصفحة: {editingPage.name}</h3>
                  <span className="text-[10px] text-slate-500">تعديل الاسم وموضع الظهور والتنقل</span>
                </div>
              </div>
              <button
                onClick={() => setEditingPage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePageSettings} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم الصفحة</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">المسار الرابط (Slug)</label>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-[11px] outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {!editingPage.metadata.isHomePage && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    موضع ظهور الصفحة وطريقة التوجيه:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPlacement('header_direct')}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                        editPlacement === 'header_direct'
                          ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5 mb-1 text-blue-600" />
                      <span className="block text-[11px]">في الهيدر مباشرة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditPlacement('header_dropdown')}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                        editPlacement === 'header_dropdown'
                          ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <FolderTree className="w-3.5 h-3.5 mb-1 text-blue-600" />
                      <span className="block text-[11px]">داخل قائمة منسدلة بالهيدر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditPlacement('standalone')}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                        editPlacement === 'standalone'
                          ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5 mb-1 text-blue-600" />
                      <span className="block text-[11px]">صفحة مستقلة (خارج الهيدر)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditPlacement('header_and_footer')}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                        editPlacement === 'header_and_footer'
                          ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 mb-1 text-blue-600" />
                      <span className="block text-[11px]">في الهيدر والفوتر</span>
                    </button>
                  </div>

                  {editPlacement === 'header_dropdown' && (
                    <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 mt-2 animate-in fade-in">
                      <label className="text-[10px] font-bold text-blue-900 block">اختر القسم الأب في الهيدر:</label>
                      <select
                        value={editParentNavId}
                        onChange={(e) => setEditParentNavId(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-lg p-1.5 text-xs font-medium outline-hidden"
                      >
                        {availableDropdowns.map((drop) => (
                          <option key={drop.id} value={drop.id}>
                            {drop.title} ({drop.itemsCount} عناصر)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">عنوان الـ SEO (Title)</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">الوصف التعريفي (Description)</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 outline-hidden focus:border-blue-500 focus:bg-white resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
