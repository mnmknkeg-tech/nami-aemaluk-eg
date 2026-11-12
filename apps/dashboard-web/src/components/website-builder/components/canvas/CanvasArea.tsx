import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBuilder } from '../../context/BuilderContext';
import { ComponentRenderer } from './ComponentRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { ContextToolbar } from './ContextToolbar';
import { PREVIEW_VIEWPORT_WIDTHS, SiteSkeleton, computeWebsiteBackgroundStyles } from '@ray-eg/shared/builder';
import { FloatingCartButton } from '../cart/FloatingCartButton';
import { CartDrawer } from '../cart/CartDrawer';

export const CanvasArea: React.FC = () => {
  const {
    website,
    activePage,
    viewport,
    zoom,
    selectNode,
    isRtl,
    isThemeLoading,
    isCodeWorkspaceOpen,
  } = useBuilder();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const [previewFrameRoot, setPreviewFrameRoot] = useState<HTMLElement | null>(null);

  const initializePreviewFrame = useCallback(() => {
    const frameDocument = previewFrameRef.current?.contentDocument;
    if (!frameDocument) return;

    frameDocument.documentElement.className = document.documentElement.className;
    frameDocument.documentElement.style.cssText = document.documentElement.style.cssText;
    frameDocument.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    frameDocument.documentElement.lang = 'ar';
    frameDocument.body.className = document.body.className;
    frameDocument.body.style.margin = '0';
    frameDocument.body.style.minHeight = '100vh';
    frameDocument.body.style.overflowX = 'hidden';

    // Reuse the application's compiled Tailwind and theme styles in the
    // same-origin frame so CSS media queries use the frame's actual width.
    document
      .querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style')
      .forEach((source) => {
        if (source.hasAttribute('data-preview-frame-style')) return;
        const copy = source.cloneNode(true) as HTMLLinkElement | HTMLStyleElement;
        copy.setAttribute('data-preview-frame-style', 'true');
        frameDocument.head.appendChild(copy);
      });

    const root = frameDocument.getElementById('preview-frame-root');
    if (root) setPreviewFrameRoot(root);
  }, [isRtl]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicked directly on canvas background, deselect
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).id === 'canvas_viewport_wrapper'
    ) {
      selectNode(null);
    }
  };

  return (
    <main
      ref={canvasContainerRef}
      id="canvas_main_container"
      className={`flex-1 h-[calc(100vh-3.5rem)] bg-slate-100/80 overflow-y-auto overflow-x-hidden sm:overflow-x-auto relative flex flex-col items-center min-h-0 transition-all ${isCodeWorkspaceOpen ? 'pb-[26rem]' : ''}`}
      onClick={handleCanvasClick}
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Context Toolbar for Selected Element (Only visible when editing a node) */}
      <ContextToolbar />

      {/* Viewport Frame Container */}
      <div
        id="canvas_viewport_wrapper"
        className="w-full flex justify-center py-2 sm:py-6 px-0 sm:px-6 pb-36 transition-all max-w-full"
      >
        <div
          className="transition-all duration-300 origin-top flex flex-col shrink-0 shadow-xl rounded-none sm:rounded-2xl overflow-hidden border-x-0 sm:border border-slate-300/80 bg-white w-full sm:w-auto relative"
          style={{
            width: `${PREVIEW_VIEWPORT_WIDTHS[viewport]}px`,
            maxWidth: `${PREVIEW_VIEWPORT_WIDTHS[viewport]}px`,
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            direction: isRtl ? 'rtl' : 'ltr',
          }}
        >
          {/* Mobile / Tablet Simulated Device Header Frame (Visible only on desktop simulation) */}
          {viewport !== 'desktop' && (
            <div className="hidden sm:flex h-7 bg-slate-900 text-white items-center justify-between px-4 text-[10px] font-mono select-none shrink-0">
              <span>9:41</span>
              <div className="w-16 h-3 bg-slate-800 rounded-full" />
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Real browsing context: CSS media queries now evaluate against the
              selected device width, while the React portal retains BuilderContext. */}
          <iframe
            ref={previewFrameRef}
            title="معاينة الموقع حسب حجم الجهاز"
            aria-label="معاينة حقيقية لعرض الموقع المتجاوب"
            onLoad={initializePreviewFrame}
            srcDoc="<!doctype html><html lang='ar'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><div id='preview-frame-root'></div></body></html>"
            className="block w-full border-0 bg-white"
            style={{
              width: '100%',
              height: viewport === 'mobile' ? '844px' : viewport === 'tablet' ? '1024px' : '900px',
            }}
          />
          {previewFrameRoot &&
            createPortal(
              <div
                className="w-full min-h-[900px] flex flex-col overflow-x-hidden max-w-full relative"
                style={{
                  backgroundColor: website.theme?.colors?.background || '#ffffff',
                  color: website.theme?.colors?.textPrimary || '#0f172a',
                  fontFamily: website.theme?.typography?.fontBody || 'Cairo, sans-serif',
                  direction: isRtl ? 'rtl' : 'ltr',
                  ...computeWebsiteBackgroundStyles(website.settings?.background),
                }}
              >
                {isThemeLoading ? (
                  <SiteSkeleton
                    website={website}
                    pageId={activePage?.id}
                    viewport={viewport}
                    backgroundColor={website.theme?.colors?.background || '#ffffff'}
                  />
                ) : (
                  <ComponentRenderer nodeId={activePage.rootNodeId} />
                )}
                <FloatingCartButton contained />
                <CartDrawer contained />
              </div>,
              previewFrameRoot
            )}
        </div>
      </div>

      {/* Breadcrumb / Path Overlay at bottom */}
      <SelectionOverlay />
    </main>
  );
};
