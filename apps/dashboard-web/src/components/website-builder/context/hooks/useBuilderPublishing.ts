import { useState, useCallback } from 'react';
import { PublishingPipelineStatus, VersionHistoryItem, Website } from '../../types/builder';
import { apiRequest } from '@/lib/auth';

export const useBuilderPublishing = (
  websiteRef: { current: Website },
  builderShopIdRef: { current: string },
  builderShopSlugRef: { current: string },
  liveWebsiteUrl: string,
  saveDraft: (website: Website, manual?: boolean) => Promise<void>,
  setHistoryLog: React.Dispatch<React.SetStateAction<string[]>>,
  recordHistory: (actionDesc: string, newWebsite: Website) => void,
  draftVersionRef: { current: number }
) => {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [publishingStatus, setPublishingStatus] = useState<PublishingPipelineStatus>({
    status: 'idle',
    currentStep: 0,
    totalSteps: 5,
    stepMessage: 'جاهز للنشر على بيئة الإنتاج السحابية',
    liveUrl: '',
  });

  // Version Snapshots
  const createVersionSnapshot = useCallback(
    (label: string, description: string) => {
      const newVersion: VersionHistoryItem = {
        id: `ver_${Date.now()}`,
        versionNumber: versions.length + 1,
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
    const builderShopSlug = builderShopSlugRef.current;
    const website = websiteRef.current;

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
      await saveDraft(website, false);
      setPublishingStatus({
        status: 'building_nextjs',
        currentStep: 2,
        totalSteps: 5,
        stepMessage: '2/5 تم حفظ مسودة الموقع وتجهيز حزم النشر السريع...',
      });
      await apiRequest(`/builder/${builderShopId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ clientVersion: draftVersionRef.current }),
      });

      // Ask the marketplace to drop its cached /site/:slug page
      const publishSlug = builderShopSlug || website.subdomain;
      if (publishSlug) {
        try {
          const isDev =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          const marketplaceBase = isDev
            ? process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:5174'
            : process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'https://mnmknk.com';
          const revalidateSecret =
            process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'dev-revalidate-secret';
          void fetch(`${marketplaceBase}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: publishSlug, secret: revalidateSecret }),
          }).catch(() => undefined);
        } catch {
          /* non-fatal */
        }
      }

      setPublishingStatus({
        status: 'published',
        currentStep: 5,
        totalSteps: 5,
        stepMessage: 'تم نشر نسخة الموقع بنجاح، ومتاحة الآن على منصة Next.js.',
        liveUrl: liveWebsiteUrl,
        publishedAt: new Date().toLocaleTimeString('ar-EG'),
      });
      setHistoryLog((prev) => ['نشر الموقع المحفوظ بنجاح', ...prev]);
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
  }, [builderShopIdRef, builderShopSlugRef, websiteRef, liveWebsiteUrl, saveDraft, setHistoryLog, draftVersionRef]);

  return {
    versions,
    createVersionSnapshot,
    restoreVersion,
    publishingStatus,
    runPublishPipeline,
  };
};
