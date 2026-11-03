import { useState, useCallback, useRef } from 'react';
import { Website } from '../../types/builder';
import { EditingModeId } from '../types';
import { apiRequest } from '../../../../lib/api/client';
import type { WebsiteReducer } from './useBuilderComponentOperations';

type WebsiteUpdate = Website | WebsiteReducer;
type AutosaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

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
    (actionDesc: string, websiteUpdate: WebsiteUpdate, setWebsite: (w: Website) => void) => {
      const before = websiteRef.current;
      const next = typeof websiteUpdate === 'function' ? websiteUpdate(before) : websiteUpdate;
      if (next === before) return;
      setPastStates((prev) => [...prev.slice(-30), before]);
      setFutureStates([]);
      setHistoryLog((prev) => [actionDesc, ...prev.slice(0, 40)]);
      setWebsite(next);
      setAutosaveStatus('unsaved');
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
                config: { activityType: websiteSnapshot.activity, website: websiteSnapshot },
                mode: editingModeRef.current,
                clientVersion: draftVersionRef.current,
              }),
            });
            if (response && typeof response.draftVersion === 'number') {
              draftVersionRef.current = response.draftVersion;
            }
          }
          writeLocalDraft(builderShopId, websiteRef.current);
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
          // Preserve the freshest local draft, never the stale request snapshot.
          writeLocalDraft(builderShopId, websiteRef.current);
          if (requestId === saveRequestIdRef.current) {
            setAutosaveStatus('error');
            if (status === 409) {
              setHistoryLog((prev) => [
                'تعارض في نسخة المسودة (409): لم تُستبدل النسخة الأحدث على الخادم، واحتُفظ بأحدث تغييراتك محليًا. حدّث النسخة وادمج التغييرات قبل الحفظ مجددًا.',
                ...prev,
              ]);
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
