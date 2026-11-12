import { useState, useCallback, useEffect, useRef } from 'react';
import { PublishingPipelineStatus, VersionHistoryItem, Website } from '../../types/builder';
import { apiRequest, clearApiCache } from '../../../../lib/api/client';
import { validateWebsiteForPublishing } from './publishValidation';
import { inspectWebsiteTree, normalizeWebsiteTree } from '@ray-eg/shared/builder';

function findInvalidLinks(website: Website): string[] {
  const invalid: string[] = [];
  const components = website.components || {};

  Object.values(components).forEach((component: any) => {
    const props = component?.props || {};
    for (const key of ['href', 'url', 'link', 'buttonUrl']) {
      const value = props[key];
      if (typeof value !== 'string') continue;
      if (value.trim() === '' || /^tel:\s*$/i.test(value.trim())) {
        invalid.push(`${component.name || component.id || 'قسم غير معروف'}: ${key}`);
      }
    }
  });

  return [...new Set(invalid)];
}

/**
 * Deterministic JSON stringify (object keys sorted) so a draft can be compared
 * byte-for-byte with the published snapshot regardless of key order — the
 * backend stores the config as JSONB which re-sorts keys.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/**
 * Draft-vs-published state shown next to the publish button so a merchant can
 * always tell whether what they see in the editor is what visitors see live.
 * Without it, the autosave "محفوظ" pill was the only status — merchants
 * believed their edits were live when they were not.
 */
export type BuilderPublishState = {
  status: 'checking' | 'never_published' | 'up_to_date' | 'has_changes' | 'unknown';
  /** Stable-stringified published website snapshot (null when never published). */
  publishedSnapshot: string | null;
  lastPublishedAt: string | null;
};

export const useBuilderPublishing = (
  websiteRef: { current: Website },
  builderShopIdRef: { current: string },
  builderShopSlugRef: { current: string },
  liveWebsiteUrl: string,
  saveDraft: (website: Website, manual?: boolean) => Promise<boolean>,
  setHistoryLog: React.Dispatch<React.SetStateAction<string[]>>,
  recordHistory: (actionDesc: string, newWebsite: Website) => void,
  draftVersionRef: { current: number },
  autosaveStatus?: string
) => {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [publishState, setPublishState] = useState<BuilderPublishState>({
    status: 'checking',
    publishedSnapshot: null,
    lastPublishedAt: null,
  });
  const publishStateSlugRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shopId = builderShopIdRef.current;
    if (!shopId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`ray_builder_versions_${shopId}`) || '[]');
      if (Array.isArray(saved)) setVersions(saved);
    } catch {
      setVersions([]);
    }
  }, [builderShopIdRef]);

  useEffect(() => {
    const shopId = builderShopIdRef.current;
    if (typeof window === 'undefined' || !shopId) return;
    try {
      localStorage.setItem(`ray_builder_versions_${shopId}`, JSON.stringify(versions));
    } catch {
      // Version history is non-critical when browser storage is unavailable.
    }
  }, [versions, builderShopIdRef]);

  const [publishingStatus, setPublishingStatus] = useState<PublishingPipelineStatus>({
    status: 'idle',
    currentStep: 0,
    totalSteps: 5,
    stepMessage: 'جاهز للنشر على بيئة الإنتاج السحابية',
    liveUrl: '',
  });

  /** Public marketplace URL for this shop's published site. */
  const publicSiteUrl = useCallback((): string => {
    const slug = builderShopSlugRef.current;
    if (typeof window === 'undefined' || !slug) return '';
    const marketplaceBase =
      process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5174'
        : 'https://nami-aemaluk-marketplace-eg.vercel.app');
    return `${marketplaceBase}/site/${slug}`;
  }, [builderShopSlugRef]);

  /**
   * Fetch the PUBLISHED config (the exact JSON visitors see on /site/:slug)
   * and remember it, so the UI can tell "منشور ومحدّث" from "عندك تعديلات
   * غير منشورة". 404 → the site was never published.
   */
  const refreshPublishState = useCallback(async (): Promise<void> => {
    const slug = builderShopSlugRef.current;
    if (typeof window === 'undefined' || !slug) {
      setPublishState((prev) => ({ ...prev, status: 'unknown' }));
      return;
    }
    publishStateSlugRef.current = slug;
    try {
      // cache: 'no-store' bypasses the 30s GET cache so a post-publish refetch
      // sees the new snapshot immediately.
      const res = await apiRequest<any>(`/shops/${slug}/website`, { cache: 'no-store' });
      const publishedWebsite = res?.data?.config?.website || null;
      if (!publishedWebsite || !publishedWebsite.components) {
        setPublishState({ status: 'never_published', publishedSnapshot: null, lastPublishedAt: null });
        return;
      }
      setPublishState({
        status:
          stableStringify(publishedWebsite) ===
          stableStringify(normalizeWebsiteTree(websiteRef.current))
            ? 'up_to_date'
            : 'has_changes',
        publishedSnapshot: stableStringify(publishedWebsite),
        lastPublishedAt: res?.data?.publishedAt || null,
      });
    } catch (err: any) {
      if (err?.status === 404) {
        setPublishState({ status: 'never_published', publishedSnapshot: null, lastPublishedAt: null });
      } else {
        setPublishState((prev) => ({ ...prev, status: 'unknown' }));
      }
    }
  }, [builderShopSlugRef, websiteRef]);

  // Fetch once the shop slug becomes known (builder finished initializing).
  useEffect(() => {
    const slug = builderShopSlugRef.current;
    if (!slug || publishStateSlugRef.current === slug) return;
    void refreshPublishState();
  }, [builderShopSlugRef, refreshPublishState]);

  // Re-compare after every completed autosave so the badge stays honest
  // ("has_changes" as soon as a draft edit is persisted) without polling.
  const lastComparedStatusRef = useRef<string>('');
  useEffect(() => {
    if (!autosaveStatus || lastComparedStatusRef.current === autosaveStatus) return;
    lastComparedStatusRef.current = autosaveStatus;
    if (autosaveStatus !== 'saved') return;
    setPublishState((prev) => {
      if (prev.status === 'never_published' || prev.status === 'unknown' || prev.status === 'checking') {
        return prev;
      }
      if (!prev.publishedSnapshot) return prev;
      return {
        ...prev,
        status:
          stableStringify(normalizeWebsiteTree(websiteRef.current)) === prev.publishedSnapshot
            ? 'up_to_date'
            : 'has_changes',
      };
    });
  }, [autosaveStatus, websiteRef]);

  // Version Snapshots
  const createVersionSnapshot = useCallback(
    (label: string, description: string) => {
      const newVersion: VersionHistoryItem = {
        id: `ver_${Date.now()}`,
        versionNumber:
          versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1,
        label,
        description,
        timestamp: new Date().toISOString(),
        author: 'المدير التنفيذي',
        websiteSnapshot: JSON.parse(JSON.stringify(websiteRef.current)),
      };
      setVersions((prev) => [newVersion, ...prev]);
      setHistoryLog((prev) => [
        `إنشاء نقطة استعادة (نسخة v${newVersion.versionNumber}): ${label}`,
        ...prev,
      ]);
    },
    [versions.length, websiteRef, setHistoryLog]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      const targetVer = versions.find((v) => v.id === versionId);
      if (!targetVer) return;
      recordHistory(`استعادة النسخة (v${targetVer.versionNumber})`, targetVer.websiteSnapshot);
    },
    [versions, recordHistory]
  );

  // Publishing Pipeline Workflow
  const runPublishPipeline = useCallback(async () => {
    const builderShopId = builderShopIdRef.current;
    const website = websiteRef.current;
    const treeReport = inspectWebsiteTree(website);
    const publishWebsite = normalizeWebsiteTree(website);
    const hasTreeDiagnostics = Object.entries(treeReport).some(
      ([key, value]) => key !== 'rootNodesCount' && Array.isArray(value) && value.length > 0
    );
    if (hasTreeDiagnostics) {
      console.warn('[WebsiteBuilder] normalized tree before publish', {
        websiteId: website.id,
        ...treeReport,
      });
    }

    setPublishingStatus({
      status: 'validating',
      currentStep: 1,
      totalSteps: 5,
      stepMessage: '1/5 جاري فحص والتحقق من شجرة المكونات وتوافق Next.js...',
    });

    try {
      if (!builderShopId) {
        setPublishingStatus({
          status: 'failed',
          currentStep: 1,
          totalSteps: 5,
          stepMessage: 'لا يوجد متجر مرتبط بالمنشئ — افتح المنشئ من داخل متجرك ثم أعد المحاولة.',
          errors: ['builderShopId غير متوفر'],
        });
        return;
      }

      // Validate the complete component tree and custom code before saving.
      const validationErrors = validateWebsiteForPublishing(publishWebsite);
      if (validationErrors.length > 0) {
        setPublishingStatus({
          status: 'failed',
          currentStep: 1,
          totalSteps: 5,
          stepMessage: 'تعذّر حفظ المسودة أو نشرها — أصلح أخطاء التحقق من صفحات ومكونات الموقع أولًا.',
          errors: validationErrors.slice(0, 8),
        });
        return;
      }

      const invalidLinks = findInvalidLinks(publishWebsite);
      if (invalidLinks.length > 0) {
        setPublishingStatus({
          status: 'failed',
          currentStep: 1,
          totalSteps: 5,
          stepMessage: 'لا يمكن النشر قبل إصلاح الروابط الفارغة أو غير المكتملة.',
          errors: invalidLinks.slice(0, 8),
        });
        return;
      }

      const saved = await saveDraft(publishWebsite, false);
      if (!saved) {
        throw new Error('تعذّر حفظ أحدث تعديلات المحرر قبل النشر');
      }
      setPublishingStatus({
        status: 'building_nextjs',
        currentStep: 2,
        totalSteps: 5,
        stepMessage: '2/5 تم حفظ مسودة الموقع وتجهيز حزم النشر السريع...',
      });
      const publishResult = await apiRequest<{ versionNumber?: number }>(`/builder/${builderShopId}/publish`, {
        method: 'POST',
        // Publish the draft just saved by this editor session using the
        // server version tracked by the builder save flow.
        body: JSON.stringify({ clientVersion: draftVersionRef.current }),
      });
      // Publishing creates a new globally-monotonic builder_versions row.
      // Keep the editor's optimistic-concurrency token in sync so subsequent
      // autosaves do not fail with a 409 immediately after a successful publish.
      if (typeof publishResult?.versionNumber === 'number') {
        draftVersionRef.current = publishResult.versionNumber;
      }

      setPublishingStatus({
        status: 'published',
        currentStep: 5,
        totalSteps: 5,
        stepMessage: 'تم نشر نسخة الموقع بنجاح، ومتاحة الآن على منصة Next.js.',
        liveUrl: publicSiteUrl(),
        publishedAt: new Date().toLocaleTimeString('ar-EG'),
      });
      setHistoryLog((prev) => ['نشر الموقع المحفوظ بنجاح', ...prev]);
      // Refresh the draft-vs-published badge (and drop the GET cache so the
      // public endpoint is read fresh).
      clearApiCache();
      void refreshPublishState();
    } catch (err) {
      setPublishingStatus({
        status: 'failed',
        currentStep: 2,
        totalSteps: 5,
        stepMessage: 'تعذّر النشر على الخادم — تأكد من اتصالك ثم أعد المحاولة.',
        errors: [err instanceof Error ? err.message : 'خطأ غير معروف أثناء النشر'],
      });
      setHistoryLog((prev) => ['فشل نشر الموقع — أعد المحاولة', ...prev]);
    }
  }, [
    builderShopIdRef,
    builderShopSlugRef,
    websiteRef,
    liveWebsiteUrl,
    saveDraft,
    setHistoryLog,
    draftVersionRef,
    refreshPublishState,
  ]);

  return {
    versions,
    createVersionSnapshot,
    restoreVersion,
    publishingStatus,
    runPublishPipeline,
    publishedSiteUrl: publicSiteUrl(),
    publishState,
    refreshPublishState,
  };
};
