import React, { useState } from 'react';
import {
  Layers,
  LayoutGrid,
  FileText,
  Palette,
  Settings,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  X,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { LayersPanel } from './LayersPanel';
import { SectionLibraryPanel } from './SectionLibraryPanel';
import { PagesPanel } from './PagesPanel';
import { DesignSystemPanel } from './DesignSystemPanel';
import { SiteSettingsPanel } from './SiteSettingsPanel';

export const LeftSidebar: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    isFocusMode,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useBuilder();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExpandedWidth, setIsExpandedWidth] = useState(false);

  const navItems = [
    { id: 'sections', label: 'الأقسام', icon: LayoutGrid },
    { id: 'pages', label: 'الصفحات', icon: FileText },
    { id: 'design', label: 'المظهر', icon: Palette },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
    { id: 'layers', label: 'الطبقات', icon: Layers },
  ] as const;

  if (isFocusMode) return null;

  const handleTabClick = (tabId: typeof activeSidebarTab) => {
    if (activeSidebarTab === tabId && isDrawerOpen) {
      setIsDrawerOpen(false);
    } else {
      setActiveSidebarTab(tabId);
      setIsDrawerOpen(true);
    }
  };

  const getActiveTabTitle = () => {
    const current = navItems.find((n) => n.id === activeSidebarTab);
    return current ? current.label : '';
  };

  return (
    <>
      {/* Desktop / Large Screen Sidebar */}
      <aside
        className={`hidden lg:flex h-[calc(100vh-3.5rem)] bg-white border-l border-slate-200 select-none shrink-0 z-20 shadow-xs transition-all duration-200 ${
          isDrawerOpen
            ? isExpandedWidth
              ? 'w-[280px] sm:w-[340px] md:w-[380px]'
              : 'w-[230px] sm:w-[270px] md:w-[300px]'
            : 'w-11 sm:w-13'
        }`}
      >
        {/* Navigation Rail (Leftmost) */}
        <div className="w-11 sm:w-13 bg-slate-50 border-l border-slate-200 flex flex-col items-center py-2 sm:py-2.5 justify-between shrink-0">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
            {navItems.map((item) => {
              const isActive = activeSidebarTab === item.id && isDrawerOpen;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[8px] sm:text-[9px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Expand / Collapse Toggle Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title={isDrawerOpen ? 'طي القائمة الجانبية' : 'فتح القائمة الجانبية'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            {isDrawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Panel Drawer Container */}
        {isDrawerOpen && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0 animate-in fade-in duration-150">
            {/* Drawer Top Header with Close & Resize Action */}
            <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <span className="text-xs font-bold text-slate-800">{getActiveTabTitle()}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpandedWidth(!isExpandedWidth)}
                  className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors font-medium cursor-pointer"
                  title={isExpandedWidth ? 'عرض عادي' : 'عرض واسع'}
                >
                  {isExpandedWidth ? 'تضييق' : 'توسيع'}
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="إخفاء اللوحة"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {activeSidebarTab === 'sections' && <SectionLibraryPanel />}
              {activeSidebarTab === 'pages' && <PagesPanel />}
              {activeSidebarTab === 'design' && <DesignSystemPanel />}
              {activeSidebarTab === 'settings' && <SiteSettingsPanel />}
              {activeSidebarTab === 'layers' && <LayersPanel />}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end" dir="rtl">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-[340px] max-w-[88vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-sm font-bold text-slate-900">{getActiveTabTitle()}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Switcher Tabs Inside Drawer */}
            <div className="flex border-b border-slate-100 bg-slate-50/60 p-1.5 gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
              {navItems.map((item) => {
                const isActive = activeSidebarTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSidebarTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
              {activeSidebarTab === 'sections' && <SectionLibraryPanel />}
              {activeSidebarTab === 'pages' && <PagesPanel />}
              {activeSidebarTab === 'design' && <DesignSystemPanel />}
              {activeSidebarTab === 'settings' && <SiteSettingsPanel />}
              {activeSidebarTab === 'layers' && <LayersPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
