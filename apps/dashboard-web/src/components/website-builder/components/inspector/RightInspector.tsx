import React, { useState } from 'react';
import {
  Sparkles,
  Paintbrush,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import {
  LayoutSection,
  TypographySection,
  ColorBackgroundSection,
  PropsInspector,
} from './InspectorSections';
import { IntegratedSectionEditor } from './IntegratedSectionEditor';

export const RightInspector: React.FC = () => {
  const {
    selectedNode,
    activePage,
    viewport,
    setViewport,
    isFocusMode,
    isMobileInspectorOpen,
    setIsMobileInspectorOpen,
  } = useBuilder();

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<'integrated' | 'style'>('integrated');

  // Auto-open desktop inspector when an element is clicked
  React.useEffect(() => {
    if (selectedNode) {
      setIsInspectorOpen(true);
    }
  }, [selectedNode?.id]);

  const tabs = [
    { id: 'integrated', label: 'شامل', icon: Sparkles, desc: 'تعديل متكامل للقسم والمحتوى والألوان والصور' },
    { id: 'style', label: 'المظهر', icon: Paintbrush, desc: 'التنسيقات المتقدمة والأبعاد والخطوط' },
  ] as const;

  if (isFocusMode) return null;

  const handleTabClick = (tabId: 'integrated' | 'style') => {
    if (inspectorMode === tabId && isInspectorOpen) {
      setIsInspectorOpen(false);
    } else {
      setInspectorMode(tabId);
      setIsInspectorOpen(true);
    }
  };

  const renderInspectorContent = () => {
    if (!selectedNode) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">لم يتم تحديد أي عنصر</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              انقر على أي قسم أو عنصر لتعديل نصوصه، صوره، ألوانه وروابطه بسهولة.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              الصفحة الحالية
            </span>
            <div className="text-xs font-bold text-slate-800">{activePage.name}</div>
            <div className="text-[11px] font-mono text-slate-500">/{activePage.slug}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full">
        {inspectorMode === 'integrated' && <IntegratedSectionEditor />}

        {inspectorMode === 'style' && (
          <div className="divide-y divide-slate-100">
            <div className="p-3 bg-slate-50/70 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{selectedNode.name}</span>
                <span className="text-[9px] bg-blue-100 text-blue-800 font-mono px-1.5 py-0.5 rounded">
                  {selectedNode.type}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">#{selectedNode.id.slice(0, 8)}</span>
            </div>
            <LayoutSection />
            <TypographySection />
            <ColorBackgroundSection />
            <PropsInspector />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Large Screen Inspector (In-flow Sidebar) */}
      <aside
        className={`hidden lg:flex h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 select-none shrink-0 z-20 shadow-xs transition-all duration-200 ${
          isInspectorOpen ? 'w-64 sm:w-72 md:w-80' : 'w-11 sm:w-13'
        }`}
      >
        {/* Navigation Rail for Inspector */}
        <div className="w-11 sm:w-13 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-2 sm:py-2.5 justify-between shrink-0">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
            {tabs.map((tab) => {
              const isActive = inspectorMode === tab.id && isInspectorOpen;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  title={tab.desc}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="text-[8px] sm:text-[9px] font-bold">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Expand / Collapse Toggle Button */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            title={isInspectorOpen ? 'طي لوحة الخصائص' : 'فتح لوحة الخصائص'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            {isInspectorOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Inspector Body */}
        {isInspectorOpen && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0 animate-in fade-in duration-150">
            {/* Header Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 shrink-0">
              <button
                onClick={() => setInspectorMode('integrated')}
                className={`flex-1 py-2 sm:py-2.5 text-center border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                  inspectorMode === 'integrated'
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>تعديل متكامل (شامل)</span>
              </button>

              <button
                onClick={() => setInspectorMode('style')}
                className={`flex-1 py-2 sm:py-2.5 text-center border-b-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                  inspectorMode === 'style'
                    ? 'border-blue-600 text-blue-600 bg-white font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Paintbrush className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>المظهر</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto">
              {renderInspectorContent()}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Bottom Sheet Inspector */}
      {isMobileInspectorOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMobileInspectorOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative w-full max-h-[82vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom duration-300 border-t border-slate-200">
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Sheet Header */}
            <div className="px-4 pb-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                  {selectedNode ? selectedNode.name : 'تعديل العنصر'}
                </h3>
                {selectedNode && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-1.5 py-0.5 rounded">
                    {selectedNode.type}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMobileInspectorOpen(false)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileInspectorOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs Row */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setInspectorMode('integrated')}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  inspectorMode === 'integrated'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white'
                    : 'border-transparent text-slate-600'
                }`}
              >
                شامل
              </button>
              <button
                type="button"
                onClick={() => setInspectorMode('style')}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  inspectorMode === 'style'
                    ? 'border-blue-600 text-blue-600 font-bold bg-white'
                    : 'border-transparent text-slate-600'
                }`}
              >
                المظهر
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
              {renderInspectorContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
