'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { ComponentRenderer } from '../canvas/ComponentRenderer';
import { FloatingCartButton } from '../cart/FloatingCartButton';
import { CartDrawer } from '../cart/CartDrawer';
import type { ViewportBreakpoint } from '../../types/builder';

// ---------------------------------------------------------------------------
// StandalonePreview — the "real preview" page at /preview
//
// A dedicated route (opened in its own tab/window, outside the editor chrome)
// that renders the merchant's site exactly like a visitor would see it, using
// the same ComponentRenderer as the canvas in interactive-preview mode.
// It loads the live draft config from the backend via BuilderProvider.
// ---------------------------------------------------------------------------

const TOOLBAR_VIEWPORTS: Array<{
  id: ViewportBreakpoint;
  label: string;
  Icon: typeof Monitor;
}> = [
  { id: 'desktop', label: 'شاشة كبيرة', Icon: Monitor },
  { id: 'tablet', label: 'تابلت', Icon: Tablet },
  { id: 'mobile', label: 'موبايل', Icon: Smartphone },
];

export const StandalonePreview: React.FC = () => {
  const { website, activePage, isRtl, switchPage, autosaveStatus } = useBuilder();
  const [previewViewport, setPreviewViewport] = React.useState<ViewportBreakpoint>('desktop');

  const rootNodeId = activePage?.rootNodeId;
  const hasContent = Boolean(rootNodeId && website.components[rootNodeId]);

  const frameWidth = useMemo(() => {
    switch (previewViewport) {
      case 'desktop': return '100%';
      case 'tablet': return 'min(100%, 768px)';
      case 'mobile': return 'min(100%, 390px)';
    }
  }, [previewViewport]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Standalone preview toolbar (not part of the site itself) */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/90 backdrop-blur-md px-3 sm:px-5 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
            معاينة حقيقية
          </span>
          <span className="truncate text-xs font-bold text-slate-700">
            {website.name || 'موقعي'}
          </span>
          {autosaveStatus === 'unsaved' && (
            <span className="hidden sm:inline text-[10px] text-amber-600 font-semibold">
              (تغييرات غير محفوظة — أعد فتح الصفحة بعد الحفظ)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Page switcher */}
          {website.pages.length > 1 && (
            <select
              value={activePage?.id || ''}
              onChange={(e) => switchPage(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer max-w-[140px]"
            >
              {website.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Viewport switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {TOOLBAR_VIEWPORTS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setPreviewViewport(id)}
                title={label}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  previewViewport === id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Back to editor */}
          <Link
            href="/dashboard/website"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">العودة للمحرر</span>
          </Link>
        </div>
      </div>

      {/* Site area — what the visitor actually sees */}
      <div className="flex-1 flex justify-center p-0 sm:p-4">
        <div
          className="bg-white shadow-xl sm:rounded-xl overflow-hidden w-full transition-all duration-300 relative flex flex-col min-h-0"
          style={{
            width: frameWidth,
            maxWidth: previewViewport === 'desktop' ? '1280px' : frameWidth,
            minHeight: 'calc(100vh - 3.25rem)',
          }}
        >
          <div
            className="w-full min-h-full"
            style={{
              backgroundColor: website.theme?.colors?.background || '#ffffff',
              color: website.theme?.colors?.textPrimary || '#0f172a',
              fontFamily: website.theme?.typography?.fontBody || 'Cairo, sans-serif',
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
                لا يوجد محتوى لعرضه بعد — افتح المحرر وأضف أقساماً إلى موقعك.
              </div>
            )}
          </div>

          {/* Contained floating cart and drawer in standalone preview */}
          <FloatingCartButton contained />
          <CartDrawer contained />
        </div>
      </div>
    </div>
  );
};
