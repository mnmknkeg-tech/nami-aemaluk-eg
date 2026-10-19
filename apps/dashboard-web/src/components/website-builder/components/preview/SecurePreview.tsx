'use client';

import React, { useState } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Languages,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { ComponentRenderer } from '../canvas/ComponentRenderer';
import type { ViewportBreakpoint } from '../../types/builder';

import { FloatingCartButton } from '../cart/FloatingCartButton';
import { CartDrawer } from '../cart/CartDrawer';

// ---------------------------------------------------------------------------
// SecurePreview — live preview rendered with the real component renderer
//
// What the merchant sees here is exactly what a visitor sees: the preview
// reuses the same ComponentRenderer that powers the canvas, switched to
// interactive-preview mode (no selection outlines, no editing chrome, but
// navigation links and page switching keep working).
//
// Data stays structured — components render from typed props/state, never
// from injected HTML — so the preview is safe by construction.
// ---------------------------------------------------------------------------

const VIEWPORT_OPTIONS: Array<{
  id: ViewportBreakpoint;
  label: string;
  Icon: typeof Monitor;
}> = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

export const SecurePreview: React.FC = () => {
  const {
    isLivePreviewOpen,
    setIsLivePreviewOpen,
    website,
    activePage,
    isRtl,
    setIsRtl,
    liveWebsiteUrl,
  } = useBuilder();

  const [previewViewport, setPreviewViewport] = useState<ViewportBreakpoint>('desktop');

  if (!isLivePreviewOpen) return null;

  const handleClose = () => setIsLivePreviewOpen(false);

  const getContainerWidth = () => {
    switch (previewViewport) {
      case 'desktop': return '100%';
      case 'tablet': return 'min(100%, 768px)';
      case 'mobile': return 'min(100%, 390px)';
    }
  };

  const rootNodeId = activePage?.rootNodeId;
  const hasContent = Boolean(rootNodeId && website.components[rootNodeId]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 sm:px-5 py-3 shrink-0">
        <h2 className="text-xs sm:text-sm font-bold text-slate-200 truncate">
          معاينة حية — {website.name || 'موقعي'}
          {activePage?.name ? <span className="text-slate-400 font-medium"> · {activePage.name}</span> : null}
        </h2>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* RTL / LTR toggle */}
          <button
            onClick={() => setIsRtl(!isRtl)}
            title="تبديل اتجاه اللغة"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRtl ? 'عربي' : 'EN'}</span>
          </button>

          {/* Viewport switcher */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {VIEWPORT_OPTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setPreviewViewport(id)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  previewViewport === id
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Open standalone real preview in a new tab */}
          {liveWebsiteUrl && (
            <a
              href={liveWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="فتح المعاينة الحقيقية في نافذة مستقلة"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>نافذة مستقلة</span>
            </a>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            title="إغلاق المعاينة"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Preview area — rendered by the real component renderer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-900/90 flex flex-col justify-start items-center p-2 sm:p-6 pb-24 min-h-0">
        <div
          className="bg-white transition-all duration-300 rounded-xl overflow-hidden shadow-2xl min-h-[85vh] flex flex-col w-full relative"
          style={{
            width: getContainerWidth(),
            maxWidth: previewViewport === 'desktop' ? '1280px' : getContainerWidth(),
          }}
        >
          <div
            className="w-full flex-1 min-h-[85vh] overflow-y-auto overflow-x-hidden relative"
            style={{
              backgroundColor: website.theme?.colors?.background || '#ffffff',
              color: website.theme?.colors?.textPrimary || '#0f172a',
              fontFamily: website.theme?.typography?.fontBody || 'Cairo, sans-serif',
              direction: isRtl ? 'rtl' : 'ltr',
            }}
          >
            {hasContent ? (
              <ComponentRenderer
                nodeId={rootNodeId!}
                isInteractivePreview
                overrideViewport={previewViewport}
              />
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">
                لا يوجد محتوى لعرضه بعد — أضف أقساماً من المحرر أولاً.
              </div>
            )}
          </div>

          {/* Contained floating cart and drawer in preview */}
          <FloatingCartButton contained />
          <CartDrawer contained />
        </div>
      </div>
    </div>
  );
};

