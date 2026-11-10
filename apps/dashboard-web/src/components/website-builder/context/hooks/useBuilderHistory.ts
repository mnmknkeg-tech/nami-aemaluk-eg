import { useState, useCallback, useRef } from 'react';
import { Website, WebsiteSettings } from '../../types/builder';
import { EditingModeId } from '../types';
import { apiRequest } from '../../../../lib/api/client';
import type { WebsiteReducer } from './useBuilderComponentOperations';
import { inspectWebsiteTree, normalizeWebsiteTree } from '@ray-eg/shared/builder';

type WebsiteUpdate = Website | WebsiteReducer;
type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/** Merge settings without mutating snapshots, preserving nested settings groups. */
export const mergeWebsiteSettings = (
  website: Website,
  patch: Partial<WebsiteSettings>
): Website => {
  const current = website.settings || {};
  return {
    ...website,
    settings: {
      ...current,
      ...patch,
      auth: patch.auth ? { ...current.auth, ...patch.auth } : current.auth,
      announcement: patch.announcement
        ? { ...current.announcement, ...patch.announcement }
        : current.announcement,
      floatingActions: patch.floatingActions
        ? { ...current.floatingActions, ...patch.floatingActions }
        : current.floatingActions,
      seo: patch.seo ? { ...current.seo, ...patch.seo } : current.seo,
      branding: patch.branding ? { ...current.branding, ...patch.branding } : current.branding,
    } as WebsiteSettings,
  };
};

export interface HistoryRestoreInput {
  direction: 'undo' | 'redo';
  current: Website;
  past: Website[];
  future: Website[];
}
export interface HistoryRestoreResult {
  website: Website;
  past: Website[];
  future: Website[];
  autosaveStatus: AutosaveStatus;
}

/** Pure history transition shared by undo/redo and regression tests. */
export const restoreHistorySnapshot = ({
  direction,
  current,
  past,
  future,
}: HistoryRestoreInput): HistoryRestoreResult | null => {
  if (direction === 'undo') {
    if (!past.length) return null;
    return {
      website: past[past.length - 1],
      past: past.slice(0, -1),
      future: [current, ...future],
      autosaveStatus: 'unsaved',
    };
  }
  if (!future.length) return null;
  return {
    website: future[0],
    past: [...past, current],
    future: future.slice(1),
    autosaveStatus: 'unsaved',
  };
};

export const isCurrentWebsiteRevision = (capturedRevision: number, currentRevision: number) =>
  capturedRevision === currentRevision;

export const enqueueSerialSave = <T>(
  queueRef: { current: Promise<unknown> },
  task: () => Promise<T>
): Promise<T> => {
  const queued = queueRef.current.catch(() => undefined).then(task);
  queueRef.current = queued;
  return queued;
};

const writeLocalDraft = (shopId: string, website: Website) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`ray_builder_site_${shopId || 'local'}`, JSON.stringify(website));
  } catch {
    // Keep the in-memory copy; quota/private-mode errors should not hide save errors.
  }
};

export const useBuilderHistory = (
  _initialWebsite: Website,
  websiteRef: { current: Website },
  builderShopId: string,
  editingModeRef: { current: EditingModeId },
  draftVersionRef: { current: number },
  websiteRevisionRef: { current: number }
) => {
  const [pastStates, setPastStates] = useState<Website[]>([]);
  const [futureStates, setFutureStates] = useState<Website[]>([]);
  const [historyLog, setHistoryLog] = useState<string[]>(['بدء جلسة العمل']);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveRequestIdRef = useRef(0);

  const recordHistory = useCallback(
    (
      actionDesc: string,
      websiteUpdate: WebsiteUpdate,
      setWebsite: (w: Website) => void,
      alreadySaved = false
    ) => {
      const before = websiteRef.current;
      const next = typeof websiteUpdate === 'function' ? websiteUpdate(before) : websiteUpdate;
      if (next === before) return;
      setPastStates((prev) => [...prev.slice(-30), before]);
      setFutureStates([]);
      setHistoryLog((prev) => [actionDesc, ...prev.slice(0, 40)]);
      setWebsite(next);
      setAutosaveStatus(alreadySaved ? 'saved' : 'unsaved');
    },
    [websiteRef]
  );

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const undo = useCallback(
    (setWebsite: (w: Website) => void) => {
      const transition = restoreHistorySnapshot({
        direction: 'undo',
        current: websiteRef.current,
        past: pastStates,
        future: futureStates,
      });
      if (!transition) return;
      setPastStates(transition.past);
      setFutureStates(transition.future);
      setWebsite(transition.website);
      setAutosaveStatus(transition.autosaveStatus);
      setHistoryLog((prev) => ['تراجع عن العملية الأخيرة (Undo)', ...prev]);
    },
    [futureStates, pastStates, websiteRef]
  );

  const redo = useCallback(
    (setWebsite: (w: Website) => void) => {
      const transition = restoreHistorySnapshot({
        direction: 'redo',
        current: websiteRef.current,
        past: pastStates,
        future: futureStates,
      });
      if (!transition) return;
      setPastStates(transition.past);
      setFutureStates(transition.future);
      setWebsite(transition.website);
      setAutosaveStatus(transition.autosaveStatus);
      setHistoryLog((prev) => ['إعادة تطبيق العملية (Redo)', ...prev]);
    },
    [futureStates, pastStates, websiteRef]
  );

  const resetHistory = useCallback((label: string) => {
    setPastStates([]);
    setFutureStates([]);
    setHistoryLog((prev) => [label, ...prev]);
  }, []);

  const enqueueSave = useCallback(
    (websiteSnapshot: Website, manual: boolean, revision: number): Promise<boolean> => {
      const requestId = ++saveRequestIdRef.current;
      const treeReport = inspectWebsiteTree(websiteSnapshot);
      const safeSnapshot = normalizeWebsiteTree(websiteSnapshot);
      const hasTreeDiagnostics = Object.entries(treeReport).some(
        ([key, value]) => key !== 'rootNodesCount' && Array.isArray(value) && value.length > 0
      );
      if (hasTreeDiagnostics) {
        console.warn('[WebsiteBuilder] normalized tree before draft save', {
          websiteId: websiteSnapshot.id,
          ...treeReport,
        });
      }
      setAutosaveStatus('saving');
      const perform = async (): Promise<boolean> => {
        // A queued snapshot can become obsolete while a prior request is in flight.
        // Never send it; the newer revision remains dirty and will be saved separately.
        if (!isCurrentWebsiteRevision(revision, websiteRevisionRef.current)) {
          if (requestId === saveRequestIdRef.current) setAutosaveStatus('unsaved');
          return false;
        }
        try {
          if (builderShopId) {
            const response = await apiRequest<any>(`/builder/${builderShopId}/config`, {
              method: 'PUT',
              body: JSON.stringify({
                config: { activityType: safeSnapshot.activity, website: safeSnapshot },
                mode: editingModeRef.current,
                clientVersion: draftVersionRef.current,
              }),
            });
            if (response && typeof response.draftVersion === 'number') {
              draftVersionRef.current = response.draftVersion;
            }
          }
          writeLocalDraft(builderShopId, safeSnapshot);
          if (typeof window !== 'undefined' && builderShopId) {
            const recoveryKey = `ray_builder_site_${builderShopId}_recovery`;
            try {
              const rawRecovery = localStorage.getItem(recoveryKey);
              const recovery = rawRecovery ? JSON.parse(rawRecovery) : null;
              if (
                recovery &&
                JSON.stringify(normalizeWebsiteTree(recovery)) === JSON.stringify(safeSnapshot)
              ) {
                localStorage.removeItem(recoveryKey);
              }
            } catch {
              // A recovery copy is safer to keep than to delete on a parse/storage error.
            }
          }
          if (
            isCurrentWebsiteRevision(revision, websiteRevisionRef.current) &&
            requestId === saveRequestIdRef.current
          ) {
            setAutosaveStatus('saved');
            if (manual) {
              setHistoryLog((prev) => [
                builderShopId
                  ? 'تم حفظ مسودة الموقع بنجاح'
                  : 'تم حفظ نسخة محلية فقط (لا يوجد متجر مرتبط بعد)',
                ...prev,
              ]);
            }
            return true;
          }
          // The request succeeded, but edits made during it are still unsaved.
          if (requestId === saveRequestIdRef.current) setAutosaveStatus('unsaved');
          return false;
        } catch (error) {
          const status = (error as Error & { status?: number })?.status;
          // Preserve the freshest local draft, but keep its tree render-safe.
          writeLocalDraft(builderShopId, normalizeWebsiteTree(websiteRef.current));
          if (requestId === saveRequestIdRef.current) {
            setAutosaveStatus('error');
            if (status === 409) {
              try {
                const latest = await apiRequest<any>(`/builder/${builderShopId}/config`);
                const latestVersion = latest?.draftVersion;
                const keepLocal =
                  Number.isSafeInteger(latestVersion) &&
                  typeof window !== 'undefined' &&
                  window.confirm(
                    `توجد نسخة أحدث على الخادم (الإصدار ${latestVersion}). تغييراتك المحلية محفوظة. هل تريد اعتماد تغييراتك المحلية فوق نسخة الخادم؟ اختر إلغاء للاحتفاظ بنسخة الخادم وإبقاء نسختك المحلية للاستعادة لاحقًا.`
                  );
                if (keepLocal) {
                  const resolved = await apiRequest<any>(`/builder/${builderShopId}/config`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      config: { activityType: safeSnapshot.activity, website: safeSnapshot },
                      mode: editingModeRef.current,
                      clientVersion: latestVersion,
                    }),
                  });
                  if (typeof resolved?.draftVersion === 'number') {
                    draftVersionRef.current = resolved.draftVersion;
                  }
                  writeLocalDraft(builderShopId, normalizeWebsiteTree(websiteRef.current));
                  const stillCurrent = isCurrentWebsiteRevision(
                    revision,
                    websiteRevisionRef.current
                  );
                  setAutosaveStatus(stillCurrent ? 'saved' : 'unsaved');
                  setHistoryLog((prev) => [
                    'تم حل تعارض المسودة باختيار تغييراتك المحلية وحفظها على الخادم',
                    ...prev,
                  ]);
                  return stillCurrent;
                }
                setHistoryLog((prev) => [
                  'تعارض المسودة: اخترت الاحتفاظ بنسخة الخادم؛ تغييراتك المحلية ما زالت محفوظة في النسخة الاحتياطية.',
                  ...prev,
                ]);
              } catch {
                setHistoryLog((prev) => [
                  'تعذّر جلب أحدث نسخة لحل التعارض؛ بقيت تغييراتك محفوظة محليًا ولم يُستبدل إصدار الخادم.',
                  ...prev,
                ]);
              }
            } else if (manual) {
              setHistoryLog((prev) => [
                'تعذّر الحفظ على السيرفر — حُفظ أحدث تعديل محليًا، أعد المحاولة',
                ...prev,
              ]);
            }
          }
          return false;
        }
      };
      return enqueueSerialSave(saveQueueRef, perform);
    },
    [builderShopId, draftVersionRef, editingModeRef, websiteRef, websiteRevisionRef]
  );

  /** Debounced autosave — returns cleanup fn, call from useEffect after hydration. */
  const runAutosave = useCallback(
    (website: Website) => {
      if (autosaveStatus !== 'unsaved' || !builderShopId) return undefined;
      const revision = websiteRevisionRef.current;
      const timer = setTimeout(() => {
        // Do not queue a snapshot from a superseded React render.
        if (revision !== websiteRevisionRef.current) return;
        void enqueueSave(website, false, revision);
      }, 1500);
      return () => clearTimeout(timer);
    },
    [autosaveStatus, builderShopId, enqueueSave, websiteRevisionRef]
  );

  const saveDraft = useCallback(
    async (website: Website, manual = true) =>
      enqueueSave(website, manual, websiteRevisionRef.current),
    [enqueueSave, websiteRevisionRef]
  );

  return {
    historyLog,
    autosaveStatus,
    setAutosaveStatus,
    setHistoryLog,
    recordHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    resetHistory,
    runAutosave,
    saveDraft,
  };
};
