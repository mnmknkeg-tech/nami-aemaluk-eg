import { useState, useCallback } from 'react';
import { Website } from '../../types/builder';
import { EditingModeId } from '../types';
import { apiRequest } from '@/lib/auth';

export const useBuilderHistory = (
  _initialWebsite: Website,
  websiteRef: { current: Website },
  builderShopId: string,
  editingModeRef: { current: EditingModeId },
  draftVersionRef: { current: number }
) => {
  const [pastStates, setPastStates] = useState<Website[]>([]);
  const [futureStates, setFutureStates] = useState<Website[]>([]);
  const [historyLog, setHistoryLog] = useState<string[]>(['بدء جلسة العمل']);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>(
    'saved'
  );

  /** Called before every mutating operation — takes setWebsite so it can update state atomically */
  const recordHistory = useCallback(
    (actionDesc: string, newWebsite: Website, setWebsite: (w: Website) => void) => {
      setPastStates((prev) => [...prev.slice(-30), websiteRef.current]);
      setFutureStates([]);
      setHistoryLog((prev) => [actionDesc, ...prev.slice(0, 40)]);
      setWebsite(newWebsite);
      setAutosaveStatus('unsaved');
    },
    [websiteRef]
  );

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const undo = useCallback(
    (setWebsite: (w: Website) => void) => {
      if (!canUndo) return;
      const previous = pastStates[pastStates.length - 1];
      setPastStates((prev) => prev.slice(0, prev.length - 1));
      setFutureStates((prev) => [websiteRef.current, ...prev]);
      setWebsite(previous);
      setHistoryLog((prev) => ['تراجع عن العملية الأخيرة (Undo)', ...prev]);
    },
    [canUndo, pastStates, websiteRef]
  );

  const redo = useCallback(
    (setWebsite: (w: Website) => void) => {
      if (!canRedo) return;
      const next = futureStates[0];
      setFutureStates((prev) => prev.slice(1));
      setPastStates((prev) => [...prev, websiteRef.current]);
      setWebsite(next);
      setHistoryLog((prev) => ['إعادة تطبيق العملية (Redo)', ...prev]);
    },
    [canRedo, futureStates, websiteRef]
  );

  const resetHistory = useCallback((label: string) => {
    setPastStates([]);
    setFutureStates([]);
    setHistoryLog((prev) => [label, ...prev]);
  }, []);

  /** Debounced autosave — returns cleanup fn, call from useEffect */
  const runAutosave = useCallback(
    (website: Website) => {
      if (autosaveStatus !== 'unsaved' || !builderShopId) return undefined;
      const timer = setTimeout(async () => {
        setAutosaveStatus('saving');
        try {
          const res = await apiRequest(`/builder/${builderShopId}/config`, {
            method: 'PUT',
            body: JSON.stringify({
              config: { activityType: website.activity, website },
              mode: editingModeRef.current,
              clientVersion: draftVersionRef.current,
            }),
          });
          if (res && typeof res.draftVersion === 'number') {
            draftVersionRef.current = res.draftVersion;
          }
          setAutosaveStatus('saved');
        } catch {
          setAutosaveStatus('error');
        }
      }, 1500);
      return () => clearTimeout(timer);
    },
    [autosaveStatus, builderShopId, editingModeRef, draftVersionRef]
  );

  const saveDraft = useCallback(
    async (website: Website, manual = true) => {
      setAutosaveStatus('saving');
      try {
        if (builderShopId) {
          const res = await apiRequest(`/builder/${builderShopId}/config`, {
            method: 'PUT',
            body: JSON.stringify({
              config: { activityType: website.activity, website },
              mode: editingModeRef.current,
              clientVersion: draftVersionRef.current,
            }),
          });
          if (res && typeof res.draftVersion === 'number') {
            draftVersionRef.current = res.draftVersion;
          }
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `ray_builder_site_${builderShopId || 'local'}`,
            JSON.stringify(website)
          );
        }
        setAutosaveStatus('saved');
        if (manual) {
          setHistoryLog((prev) => [
            builderShopId
              ? 'تم حفظ مسودة الموقع بنجاح'
              : 'تم حفظ نسخة محلية فقط (لا يوجد متجر مرتبط بعد)',
            ...prev,
          ]);
        }
      } catch {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `ray_builder_site_${builderShopId || 'local'}`,
              JSON.stringify(website)
            );
          } catch {}
        }
        setAutosaveStatus('error');
        if (manual) {
          setHistoryLog((prev) => [
            'تعذّر الحفظ على السيرفر — حُفظت نسخة محلية فقط، أعد المحاولة',
            ...prev,
          ]);
        }
      }
    },
    [builderShopId, editingModeRef, draftVersionRef]
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
