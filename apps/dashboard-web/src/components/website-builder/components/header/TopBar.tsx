import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Play,
  Code2,
  Sparkles,
  CloudUpload,
  Globe,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  FileText,
  Terminal,
  ZoomIn,
  ZoomOut,
  Languages,
  Menu,
  X,
  ArrowRight,
  Save,
  ExternalLink,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import { useBuilder } from '../../context/BuilderContext';

export const TopBar: React.FC = () => {
  const {
    website,
    activePage,
    switchPage,
    viewport,
    setViewport,
    zoom,
    setZoom,
    canUndo,
    canRedo,
    undo,
    redo,
    autosaveStatus,
    saveDraft,
    isCodeWorkspaceOpen,
    setIsCodeWorkspaceOpen,
    isLivePreviewOpen,
    setIsLivePreviewOpen,
    isPublishModalOpen,
    setIsPublishModalOpen,
    isAiModalOpen,
    setIsAiModalOpen,
    isDevDrawerOpen,
    setIsDevDrawerOpen,
    isRtl,
    setIsRtl,
    onExit,
    isFocusMode,
    toggleFocusMode,
    liveWebsiteUrl,
  } = useBuilder();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await saveDraft(true);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  return (
    <header className="h-13 sm:h-14 bg-white border-b border-slate-200 px-2 sm:px-4 flex items-center justify-between z-30 select-none shadow-xs shrink-0 gap-1 sm:gap-2">
      {/* LEFT SECTION: Back to Dashboard, Brand & Page Switcher */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Back to Dashboard Button */}
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            title="العودة إلى لوحة التحكم الرئيسية"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">لوحة التحكم</span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Page Switcher Dropdown */}
        <div className="relative">
          <button
            id="page_switcher_btn"
            onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
            className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors cursor-pointer shrink-0"
            title="تبديل الصفحة الحالية"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="max-w-[65px] sm:max-w-[110px] truncate">{activePage.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {isPageDropdownOpen && (
            <div
              onClick={() => setIsPageDropdownOpen(false)}
              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">صفحات الموقع</div>
              {website.pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => switchPage(p.id)}
                  className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                    p.id === activePage.id ? 'text-blue-600 font-bold bg-blue-50/70' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.metadata.isHomePage && (
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded shrink-0 mr-1">
                      الرئيسية
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER SECTION: Viewport, Zoom, Undo/Redo, Focus Mode */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Undo / Redo (Hidden on mobile to keep header clean and spacious) */}
        <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            id="undo_btn"
            onClick={undo}
            disabled={!canUndo}
            title="تراجع (Ctrl+Z)"
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            id="redo_btn"
            onClick={redo}
            disabled={!canRedo}
            title="إعادة (Ctrl+Y)"
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport Switcher (Visible on md+ screens) */}
        <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            id="viewport_desktop_btn"
            onClick={() => setViewport('desktop')}
            title="سطح المكتب (Desktop 1280px)"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              viewport === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">مكتبي</span>
          </button>
          <button
            id="viewport_tablet_btn"
            onClick={() => setViewport('tablet')}
            title="جهاز لوحي (Tablet 768px)"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              viewport === 'tablet'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">تابلت</span>
          </button>
          <button
            id="viewport_mobile_btn"
            onClick={() => setViewport('mobile')}
            title="هاتف جوال (Mobile 390px)"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
              viewport === 'mobile'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">جوال</span>
          </button>
        </div>

        {/* Zoom Controls (Hidden on mobile) */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-1 rounded-lg text-xs font-mono text-slate-600">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 15))}
            className="hover:text-slate-900 disabled:opacity-30 cursor-pointer"
            disabled={zoom <= 50}
            title="تصغير"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-[11px]">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(150, zoom + 15))}
            className="hover:text-slate-900 disabled:opacity-30 cursor-pointer"
            disabled={zoom >= 150}
            title="تكبير"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Focus Mode (Declutter View Toggle) */}
        <button
          onClick={toggleFocusMode}
          title={isFocusMode ? 'الخروج من وضع التركيز (إظهار الألواح)' : 'وضع التركيز (إخفاء الألواح وتوسيع الشاشة)'}
          className={`hidden md:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            isFocusMode
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{isFocusMode ? 'عرض عادي' : 'تركيز'}</span>
        </button>
      </div>

      {/* RIGHT SECTION: Save, Live Site, Publish & More Menu */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Autosave Status Pill */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-medium text-slate-600">
          {autosaveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>محفوظ</span>
            </>
          )}
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          )}
          {autosaveStatus === 'unsaved' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>غير محفوظ</span>
            </>
          )}
          {autosaveStatus === 'error' && (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-600">تعذّر الحفظ</span>
            </>
          )}
        </div>

        {/* Direct Save Button (Hidden on xs mobile because it's in the bottom tab bar) */}
        <button
          id="save_draft_btn"
          onClick={handleManualSave}
          disabled={isSaving}
          title="حفظ التعديلات فورياً"
          className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-xs transition-all cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>حفظ</span>
        </button>

        {/* Preview Button (opens live interactive preview modal) */}
        <button
          onClick={() => setIsLivePreviewOpen(true)}
          title="معاينة حية للمتجر في كافة الشاشات"
          className="hidden md:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
          <span>معاينة</span>
        </button>

        {/* Publish Button */}
        <button
          id="open_publish_modal_btn"
          onClick={() => setIsPublishModalOpen(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white shadow-sm transition-all cursor-pointer shrink-0"
        >
          <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
          <span>نشر</span>
        </button>

        {/* More Tools Dropdown (Advanced Developer & Utility Tools) */}
        <div className="relative">
          <button
            onClick={() => setIsMoreToolsOpen(!isMoreToolsOpen)}
            title="أدوات وميزات متقدمة"
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          </button>

          {isMoreToolsOpen && (
            <div
              onClick={() => setIsMoreToolsOpen(false)}
              className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-1 text-xs"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                أدوات متقدمة
              </div>

              {/* AI Assistant — market-launch switch: AI is local-only for now. */}
              {!HIDE_UNPUBLISHED && (
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold transition-colors w-full text-right"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>مساعد الذكاء الاصطناعي</span>
                </button>
              )}

              {/* Live Preview Modal */}
              <button
                onClick={() => setIsLivePreviewOpen(true)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right"
              >
                <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
                <span>معاينة حية تفاعلية</span>
              </button>

              {/* Code Workspace IDE */}
              <button
                onClick={() => setIsCodeWorkspaceOpen(!isCodeWorkspaceOpen)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right"
              >
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>محرر الكود (Code IDE)</span>
              </button>

              {/* Dev AST Drawer */}
              <button
                onClick={() => setIsDevDrawerOpen(!isDevDrawerOpen)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right"
              >
                <Terminal className="w-4 h-4 text-cyan-600" />
                <span>شجرة العناصر للمطورين</span>
              </button>

              {/* RTL / LTR Direction */}
              <button
                onClick={() => setIsRtl(!isRtl)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right"
              >
                <Languages className="w-4 h-4 text-purple-600" />
                <span>تبديل الاتجاه ({isRtl ? 'RTL -> LTR' : 'LTR -> RTL'})</span>
              </button>

              {/* Reset Zoom */}
              <button
                onClick={() => setZoom(100)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold transition-colors w-full text-right border-t border-slate-100 mt-1"
              >
                <ZoomIn className="w-4 h-4 text-slate-500" />
                <span>إعادة ضبط المقياس 100%</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="sm:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
          title="المزيد من الأدوات"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Extra Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="sm:hidden absolute top-14 left-0 right-0 bg-white border-b border-slate-200 p-3 shadow-xl z-50 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">إجراءات سريعة</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{autosaveStatus === 'saved' ? 'محفوظ تلقائياً' : autosaveStatus === 'error' ? 'تعذّر الحفظ — أعد المحاولة' : 'تعديلات معلقة'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsLivePreviewOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800"
            >
              <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
              <span>معاينة</span>
            </button>

            <button
              onClick={() => {
                toggleFocusMode();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
            >
              <Maximize2 className="w-4 h-4 text-blue-600" />
              <span>{isFocusMode ? 'إلغاء التركيز' : 'وضع التركيز'}</span>
            </button>

            <button
              onClick={() => {
                setIsLivePreviewOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
            >
              <Play className="w-4 h-4 text-blue-600" />
              <span>معاينة حية</span>
            </button>

            {/* Market-launch switch: AI assistant is local-only for now. */}
            {!HIDE_UNPUBLISHED && (
              <button
                onClick={() => {
                  setIsAiModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>مساعد الذكاء</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};


