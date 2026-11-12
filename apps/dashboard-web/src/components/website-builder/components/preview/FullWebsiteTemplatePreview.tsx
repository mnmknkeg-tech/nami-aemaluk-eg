'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, Monitor, Tablet, Smartphone } from 'lucide-react';
import { adaptTemplateLinkDestinations, PublicSiteRenderer } from '@ray-eg/shared/builder';
import type { ViewportBreakpoint } from '../../types/builder';
import { loadFullWebsiteTemplate } from '../../data/registry';

interface FullWebsiteTemplatePreviewProps {
  templateId: string;
  onClose: () => void;
  onApply: (templateId: string) => void;
}

interface PreviewLoadResult {
  website: ReturnType<typeof loadFullWebsiteTemplate>['website'] | null;
  error: string | null;
}

class PreviewRenderBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[FullWebsiteTemplatePreview] Template component failed to render.', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          تعذّر عرض أحد مكونات القالب. {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const VIEWPORTS: Array<{
  id: ViewportBreakpoint;
  label: string;
  Icon: typeof Monitor;
}> = [
  { id: 'desktop', label: 'كمبيوتر', Icon: Monitor },
  { id: 'tablet', label: 'تابلت', Icon: Tablet },
  { id: 'mobile', label: 'موبايل', Icon: Smartphone },
];

export const FullWebsiteTemplatePreview: React.FC<FullWebsiteTemplatePreviewProps> = ({
  templateId,
  onClose,
  onApply,
}) => {
  const [loadResult] = useState<PreviewLoadResult>(() => {
    try {
      return {
        website: adaptTemplateLinkDestinations(loadFullWebsiteTemplate(templateId).website),
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `تعذّر تحميل القالب "${templateId}".`;
      console.error('[FullWebsiteTemplatePreview] Template could not be loaded.', {
        templateId,
        error,
      });
      return { website: null, error: message };
    }
  });
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');
  const [activePageId, setActivePageId] = useState<string | undefined>();
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const website = loadResult.website;
  const activePage =
    website?.pages.find((page) => page.id === activePageId) ||
    website?.pages.find((page) => page.metadata?.isHomePage) ||
    website?.pages.find((page) => page.id === 'page_home') ||
    website?.pages[0];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImageError = (event: React.SyntheticEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLImageElement)) return;
    const imageName = event.target.alt || event.target.currentSrc || event.target.src;
    setFailedImages((current) => (current.includes(imageName) ? current : [...current, imageName]));
  };

  const frameWidth = viewport === 'mobile' ? '390px' : viewport === 'tablet' ? '768px' : '1280px';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`معاينة قالب الموقع ${website?.name || templateId}`}
      className="fixed inset-0 z-[10000] flex flex-col bg-slate-950"
      dir="rtl"
    >
      <header className="z-10 flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-white sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">
            معاينة موقع كامل — {website?.name || templateId}
          </h2>
          {activePage && <p className="truncate text-xs text-slate-400">{activePage.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          {website && website.pages.length > 1 && (
            <select
              aria-label="صفحة المعاينة"
              value={activePageId || website.pages[0]?.id || ''}
              onChange={(event) => setActivePageId(event.target.value)}
              className="max-w-36 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
            >
              {website.pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            {VIEWPORTS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={viewport === id}
                onClick={() => setViewport(id)}
                className={`rounded-md p-1.5 ${viewport === id ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {website && (
            <button
              type="button"
              onClick={() => onApply(templateId)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
            >
              <Check className="h-4 w-4" />
              استخدام القالب
            </button>
          )}
          <button
            type="button"
            aria-label="إغلاق المعاينة"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 justify-center overflow-auto bg-slate-800 p-2 sm:p-5">
        {loadResult.error ? (
          <div
            role="alert"
            className="m-auto flex max-w-xl items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-900"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-bold">تعذّر تحميل معاينة القالب</h3>
              <p className="mt-1 break-words">{loadResult.error}</p>
            </div>
          </div>
        ) : website ? (
          <div
            className="h-fit min-h-full shrink-0 overflow-hidden rounded-xl bg-white shadow-2xl"
            style={{ width: `min(100%, ${frameWidth})` }}
            onErrorCapture={handleImageError}
          >
            {failedImages.length > 0 && (
              <div
                role="status"
                className="sticky top-0 z-50 flex items-center gap-2 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                تعذّر تحميل {failedImages.length} صورة في هذا القالب.
              </div>
            )}
            <PreviewRenderBoundary key={templateId}>
              <PublicSiteRenderer
                website={website}
                shop={{
                  id: `template-preview-${templateId}`,
                  name: website.name,
                  slug: 'template-preview',
                }}
                products={[]}
                subscriptionPlans={[]}
                previewMode
                previewViewport={viewport}
                previewPageId={activePageId}
                onNavigatePage={setActivePageId}
              />
            </PreviewRenderBoundary>
          </div>
        ) : null}
      </main>
    </div>
  );
};
