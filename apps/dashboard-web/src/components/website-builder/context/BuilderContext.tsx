/**
 * BuilderContext.tsx — Slim orchestration layer
 *
 * All heavy logic is delegated to focused sub-hooks:
 *   • useBuilderCart           – Cart & Commerce
 *   • useBuilderPageOperations – Page management & navigation
 *   • useBuilderComponentOperations – Node CRUD, drag/drop, code
 *   • useBuilderTheme          – Design tokens & presets
 *   • useBuilderHistory        – Undo/Redo & autosave
 *   • useBuilderPublishing     – Version snapshots & publish pipeline
 *   • useBuilderAI             – AI patch application
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Tenant, Website, ViewportBreakpoint, WebsiteSettings } from '../types/builder';
import { AssetDto } from '../types/dto';
import { EditingModeId } from './types';
import { mockTenants, mockAssets } from '../data/mockTenants';
import {
  getFullWebsiteTemplateMetadata,
  getFullWebsiteTemplates,
  loadFullWebsiteTemplate,
  loadThemePreset,
} from '../data/registry';
import { apiRequest } from '../../../lib/api/client';
import { uploadMediaFile } from '../../../lib/api/upload';
import { validateImageFile } from '../../../lib/image-utils';

// Sub-hooks
import { useBuilderCart } from './hooks/useBuilderCart';
import { useBuilderPageOperations } from './hooks/useBuilderPageOperations';
import {
  useBuilderComponentOperations,
  type WebsiteReducer,
} from './hooks/useBuilderComponentOperations';
import { useBuilderTheme } from './hooks/useBuilderTheme';
import { mergeWebsiteSettings, useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPublishing } from './hooks/useBuilderPublishing';
import { useBuilderAI } from './hooks/useBuilderAI';

// Utilities
import {
  createFullWebsiteTemplateCandidate,
  getHomePageId,
  getInitialBuilderState,
  hasWebsiteContentToReplace,
  normalizeWebsite,
  persistTemplateCandidateBeforeCommit,
} from './builderUtils';
import { getMergedThemeTokens } from '../data/themes/utils';
import { normalizeCatalogProduct } from '@ray-eg/shared/builder';

// Types
import { BuilderContextType } from './types';

// ─── Context ────────────────────────────────────────────────────────────────

const BuilderContext = createContext<BuilderContextType | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export const BuilderProvider: React.FC<{ children: React.ReactNode; onExit?: () => void }> = ({
  children,
  onExit,
}) => {
  // ── State ────────────────────────────────────────────────────────────────
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const toggleFocusMode = useCallback(() => setIsFocusMode((p) => !p), []);

  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');
  const [zoom, setZoom] = useState(100);
  const [activeSidebarTab, setActiveSidebarTab] = useState<
    'pages' | 'layers' | 'sections' | 'design' | 'settings' | 'assets'
  >('layers');
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'style' | 'props' | 'responsive' | 'animation' | 'code'
  >('style');
  const [isRtl, setIsRtl] = useState(true);

  // Modals
  const [isCodeWorkspaceOpen, setIsCodeWorkspaceOpen] = useState(false);
  const [codeActiveFile, setCodeActiveFile] = useState<
    'component.tsx' | 'styles.css' | 'interactions.ts' | 'schema.json'
  >('component.tsx');
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);
  const [isThemeLoading, setIsThemeLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // ── Initializing state ───────────────────────────────────────────────────
  // Suppresses flicker when loading the saved project: we mount the real editor
  // skeleton and keep the canvas empty until the backend config arrives.

  // ── Editing mode & server draft version ──────────────────────────────────
  // editingMode is sent to the backend on every save so the server-side
  // capability policy can validate the payload for the active mode.
  // draftVersionRef mirrors the server's monotonic draft version for
  // optimistic-concurrency (sent as clientVersion; server rejects stale saves).
  const [editingMode, setEditingMode] = useState<EditingModeId>('visual');
  const editingModeRef = useRef<EditingModeId>(editingMode);
  useEffect(() => {
    editingModeRef.current = editingMode;
  }, [editingMode]);
  const draftVersionRef = useRef<number>(0);

  // ── Core website state ───────────────────────────────────────────────────
  const [initialBuilderData] = useState(() => getInitialBuilderState());
  const [currentTenant, setCurrentTenant] = useState<Tenant>(mockTenants[0]);
  const [website, setWebsiteState] = useState<Website>(initialBuilderData.website);
  const [activeTemplateId, setActiveTemplateId] = useState(initialBuilderData.templateId);
  const [templateError, setTemplateError] = useState<string | null>(
    initialBuilderData.templateError
  );
  const [activePageId, setActivePageId] = useState(initialBuilderData.pageId);
  const hasPersistedWebsiteRef = useRef(false);
  const websiteLoadFailedRef = useRef(false);
  const pendingTemplateApplicationRef = useRef<string | null>(null);

  // Mutations update the ref synchronously so back-to-back actions compose even
  // before React has committed a render. The revision also guards in-flight saves.
  const websiteRef = useRef(website);
  const websiteRevisionRef = useRef(0);
  const setWebsite = useCallback<React.Dispatch<React.SetStateAction<Website>>>((value) => {
    const next = typeof value === 'function' ? value(websiteRef.current) : value;
    if (next === websiteRef.current) return;
    websiteRef.current = next;
    websiteRevisionRef.current += 1;
    setWebsiteState(next);
  }, []);

  const [builderShopId, setBuilderShopId] = useState('');
  const [builderShopSlug, setBuilderShopSlug] = useState('');
  const [builderShopName, setBuilderShopName] = useState('');
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const builderShopIdRef = useRef(builderShopId);
  const builderShopSlugRef = useRef(builderShopSlug);
  useEffect(() => {
    builderShopIdRef.current = builderShopId;
  }, [builderShopId]);
  useEffect(() => {
    builderShopSlugRef.current = builderShopSlug;
  }, [builderShopSlug]);

  // Assets
  const [assets, setAssets] = useState<AssetDto[]>(mockAssets);

  // ── History sub-hook ─────────────────────────────────────────────────────
  const {
    historyLog,
    autosaveStatus,
    setAutosaveStatus,
    setHistoryLog,
    canUndo,
    canRedo,
    resetHistory,
    saveDraft,
    runAutosave,
    recordHistory: _recordHistoryRaw,
    undo: _undoRaw,
    redo: _redoRaw,
  } = useBuilderHistory(
    initialBuilderData.website,
    websiteRef,
    builderShopId,
    editingModeRef,
    draftVersionRef,
    websiteRevisionRef
  );

  // Stable wrappers that inject setWebsite into the raw hook callbacks
  const recordHistory = useCallback(
    (actionDesc: string, newWebsite: Website | WebsiteReducer, alreadySaved = false) => {
      _recordHistoryRaw(actionDesc, newWebsite, setWebsite, alreadySaved);
    },
    [_recordHistoryRaw, setWebsite]
  );

  const undo = useCallback(() => _undoRaw(setWebsite), [_undoRaw, setWebsite]);
  const redo = useCallback(() => _redoRaw(setWebsite), [_redoRaw, setWebsite]);

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(
        target?.closest('input, textarea, select, [contenteditable="true"]')
      );
      if (isTyping || !(event.metaKey || event.ctrlKey)) return;

      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [redo, undo]);

  const saveDraftWithWebsite = useCallback(
    (manual?: boolean) => saveDraft(websiteRef.current, manual),
    [saveDraft]
  );

  // ── Cart sub-hook ────────────────────────────────────────────────────────
  const cart = useBuilderCart({ currentTenant });

  // ── Component operations sub-hook ────────────────────────────────────────
  const activePage = useMemo(
    () => website.pages.find((p) => p.id === activePageId) || website.pages[0],
    [website.pages, activePageId]
  );

  const componentOps = useBuilderComponentOperations({
    website,
    websiteRef,
    activePage,
    viewport,
    recordHistory,
    setIsMobileInspectorOpen,
    setTemplateError,
    initialSelectedNodeId: activePage?.rootNodeId ?? null,
  });

  // ── Page operations sub-hook ─────────────────────────────────────────────
  const pageOps = useBuilderPageOperations({
    website,
    websiteRef,
    activePageId,
    setActivePageId,
    setSelectedNodeId: componentOps.setSelectedNodeId,
    recordHistory,
  });

  // ── Theme sub-hook ───────────────────────────────────────────────────────
  const themeOps = useBuilderTheme(website, recordHistory, websiteRef, setTemplateError);

  // ── Computed URLs ────────────────────────────────────────────────────────
  // Real preview URL: a dedicated /preview route inside this dashboard app.
  // It renders the site with the real component renderer in its own tab,
  // independent of the marketplace app (still under development).
  const liveWebsiteUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/preview`;
  }, []);

  // ── Publishing sub-hook ──────────────────────────────────────────────────
  const publishing = useBuilderPublishing(
    websiteRef,
    builderShopIdRef,
    builderShopSlugRef,
    liveWebsiteUrl,
    saveDraft,
    setHistoryLog,
    recordHistory,
    draftVersionRef
  );

  // ── AI sub-hook ──────────────────────────────────────────────────────────
  const aiOps = useBuilderAI({
    website,
    websiteRef,
    activePage,
    selectedNodeId: componentOps.selectedNodeId,
    recordHistory,
    setSelectedNodeId: componentOps.setSelectedNodeId,
    setWebsite,
    setAutosaveStatus,
    setActiveTemplateId,
    setActivePageId,
    setHoveredNodeId: componentOps.setHoveredNode,
    resetHistory,
    setHistoryLog,
    setIsAiModalOpen,
  });

  // ── Effects ──────────────────────────────────────────────────────────────

  // Auto-detect mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setViewport('mobile');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setViewport('mobile');
      else if (w < 1024) setViewport((prev) => (prev === 'desktop' ? 'tablet' : prev));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync local storage on every website change
  useEffect(() => {
    if (
      !isInitializing &&
      typeof window !== 'undefined' &&
      website?.components &&
      website?.pages?.length
    ) {
      try {
        localStorage.setItem('ray_builder_last_active_site', JSON.stringify(website));
      } catch {}
    }
  }, [isInitializing, website]);

  // Autosave on unsaved changes
  useEffect(() => {
    if (isInitializing) return undefined;
    return runAutosave(website);
  }, [autosaveStatus, builderShopId, isInitializing, website]); // eslint-disable-line

  // Fetch shop & load builder config on mount
  useEffect(() => {
    let cancelled = false;
    setIsInitializing(true);
    (async () => {
      try {
        const shop = await apiRequest('/shops/me').catch(() => null);
        if (!shop || cancelled) return;

        const shopId = shop.id;
        setBuilderShopId(shopId);
        builderShopIdRef.current = shopId;
        if (shop.slug) setBuilderShopSlug(shop.slug);
        if (shop.name) {
          setBuilderShopName(shop.name);
          setCurrentTenant((prev) => ({
            ...prev,
            id: shopId,
            name: shop.name,
            businessInfo: {
              ...prev.businessInfo,
              brandName: shop.name,
              logoUrl: shop.logoUrl || shop.logo || prev.businessInfo.logoUrl,
            },
            customDomain: `${shop.slug || 'shop'}.mnmknk.com`,
          }));
        }

        // Fetch real active inventory products for this shop to bind to the website
        apiRequest(`/products?shopId=${shopId}&surface=site&limit=100`)
          .then((res: any) => {
            if (!cancelled && res) {
              const items = Array.isArray(res) ? res : res.data || res.items || [];
              setShopProducts(
                items.map((item: any, index: number) => normalizeCatalogProduct(item, index))
              );
            }
          })
          .catch(() => undefined);

        let config: any = null;
        try {
          config = await apiRequest(`/builder/${shopId}/config`);
          websiteLoadFailedRef.current = false;
        } catch (error) {
          websiteLoadFailedRef.current = true;
          console.error('[WebsiteBuilder] Could not load the current website draft.', error);
          setTemplateError('تعذر تحميل مسودة الموقع الحالية. أعد تحميل المحرر قبل تطبيق أي قالب.');
        }
        if (!cancelled && config?.website?.pages?.length && config?.website?.components) {
          hasPersistedWebsiteRef.current = true;
          draftVersionRef.current = Number.isSafeInteger(config.draftVersion)
            ? config.draftVersion
            : 0;
          let loadedWebsite = normalizeWebsite(config.website as Website);
          try {
            const rawBackup = localStorage.getItem(`ray_builder_site_${shopId}`);
            const backup = rawBackup ? JSON.parse(rawBackup) : null;
            if (
              backup &&
              Array.isArray(backup.pages) &&
              backup.pages.length > 0 &&
              backup.components &&
              typeof backup.components === 'object'
            ) {
              const localWebsite = normalizeWebsite(backup as Website);
              if (JSON.stringify(localWebsite) === JSON.stringify(loadedWebsite)) {
                // Local backup matches server exactly — clean it up so we don't prompt needlessly
                localStorage.removeItem(`ray_builder_site_${shopId}`);
              } else if (
                window.confirm(
                  'تم العثور على تغييرات محلية غير مطابقة لمسودة الخادم لهذا المتجر. استعادة التغييرات المحلية؟ اختر إلغاء لاستخدام نسخة الخادم.'
                )
              ) {
                loadedWebsite = localWebsite;
                hasPersistedWebsiteRef.current = true;
                setAutosaveStatus('unsaved');
              } else {
                // User explicitly dismissed the local draft in favor of server draft:
                // overwrite local storage with server copy so the prompt never appears again!
                localStorage.setItem(`ray_builder_site_${shopId}`, JSON.stringify(loadedWebsite));
              }
            }
          } catch {
            // Invalid or inaccessible local backups are ignored, never trusted.
          }
          const shopLogo = shop.logoUrl || shop.logo || '';
          if (shopLogo) {
            loadedWebsite.settings = {
              ...(loadedWebsite.settings || {}),
              branding: {
                ...((loadedWebsite.settings as any)?.branding || {}),
                logoUrl: shopLogo,
              },
            } as any;
          }
          setWebsite(loadedWebsite);
          setActivePageId(getHomePageId(loadedWebsite) || 'page_home');
        } else if (!cancelled) {
          try {
            const parsed = JSON.parse(localStorage.getItem(`ray_builder_site_${shopId}`) || '');
            if (
              Array.isArray(parsed?.pages) &&
              parsed.pages.length &&
              parsed?.components &&
              window.confirm(
                'تعذر تحميل مسودة الخادم. هل تريد فتح النسخة المحلية المحفوظة لهذا المتجر؟'
              )
            ) {
              const recovered = normalizeWebsite(parsed);
              hasPersistedWebsiteRef.current = true;
              setWebsite(recovered);
              setActivePageId(getHomePageId(recovered) || 'page_home');
              setAutosaveStatus('unsaved');
            }
          } catch {}
        }
      } catch {
        // Recover only this shop's backup; never scan arbitrary merchant keys.
        if (typeof window !== 'undefined' && !cancelled) {
          try {
            const key = builderShopIdRef.current
              ? `ray_builder_site_${builderShopIdRef.current}`
              : 'ray_builder_site_local';
            const parsed = JSON.parse(localStorage.getItem(key) || '');
            if (
              Array.isArray(parsed?.pages) &&
              parsed.pages.length &&
              parsed?.components &&
              window.confirm(
                'تعذر تحميل مسودة الخادم. هل تريد فتح النسخة المحلية المحفوظة لهذا المتجر؟'
              )
            ) {
              hasPersistedWebsiteRef.current = true;
              setWebsite(normalizeWebsite(parsed));
              setAutosaveStatus('unsaved');
            }
          } catch {}
        }
      } finally {
        // Also release the gate when /shops/me fails or the shop has no config.
        if (!cancelled) setIsInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAutosaveStatus, setTemplateError, setWebsite]);

  // ── Website utility helpers ───────────────────────────────────────────────

  const updateWebsiteSettings = useCallback(
    (settingsPatch: Partial<WebsiteSettings>) => {
      recordHistory('تحديث إعدادات الموقع', (prev) => mergeWebsiteSettings(prev, settingsPatch));
    },
    [recordHistory]
  );

  // Switchers (full template / tenant replacement)
  const switchWebsite = useCallback(
    async (websiteId: string, presetId?: string): Promise<boolean> => {
      let candidate: Website;
      let entry: ReturnType<typeof loadFullWebsiteTemplate>;
      try {
        if (!builderShopId) throw new Error('تعذّر تحديد المتجر لحفظ قالب الموقع.');
        if (websiteLoadFailedRef.current) {
          throw new Error(
            'تعذر تحميل مسودة الموقع الحالية؛ لم يُطبّق القالب لحماية محتوى متجرك. أعد تحميل المحرر وحاول مجددًا.'
          );
        }
        entry = loadFullWebsiteTemplate(websiteId);
        const presetTheme = presetId
          ? getMergedThemeTokens(loadThemePreset(presetId).presetKey)
          : undefined;
        candidate = createFullWebsiteTemplateCandidate(
          websiteRef.current,
          entry,
          {
            shopId: builderShopId,
            shopSlug: builderShopSlug,
            preserveExistingIdentity: hasPersistedWebsiteRef.current,
          },
          presetTheme
        );
        if (
          entry.id === activeTemplateId &&
          !presetId &&
          JSON.stringify(candidate.pages) === JSON.stringify(websiteRef.current.pages) &&
          JSON.stringify(candidate.components) === JSON.stringify(websiteRef.current.components)
        ) {
          return true;
        }
        const hasUnsavedChanges = autosaveStatus !== 'saved';
        if (
          (hasWebsiteContentToReplace(websiteRef.current) || hasUnsavedChanges) &&
          typeof window !== 'undefined' &&
          !window.confirm(
            `تطبيق قالب "${entry.displayName}" سيستبدل صفحات ومكونات ومحتوى مسودة موقعك الحالية.${hasUnsavedChanges ? ' لديك أيضًا تغييرات غير محفوظة ستُستبدل.' : ''} سيُحفظ التغيير كمسودة فقط ولن يُنشر. يمكنك التراجع عنه من سجل التراجع بعد التطبيق. هل تريد المتابعة؟`
          )
        ) {
          return false;
        }

        const startingRevision = websiteRevisionRef.current;
        const applied = await persistTemplateCandidateBeforeCommit(
          candidate,
          (snapshot) => saveDraft(snapshot, false),
          (savedCandidate) => {
            recordHistory(`تطبيق قالب الموقع (${entry.displayName})`, savedCandidate, true);
            setActiveTemplateId(entry.id);
            const firstPageId = getHomePageId(savedCandidate) || 'page_home';
            const firstPage = savedCandidate.pages.find((page) => page.id === firstPageId);
            setActivePageId(firstPageId);
            componentOps.setSelectedNodeId(
              firstPage && savedCandidate.components[firstPage.rootNodeId]
                ? firstPage.rootNodeId
                : null
            );
            componentOps.setHoveredNode(null);
            setTemplateError(null);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('ray_builder_selected_template', entry.id);
              } catch (error) {
                console.error('[WebsiteBuilder] Could not remember the applied template.', error);
              }
            }
          },
          () => startingRevision === websiteRevisionRef.current
        );
        if (!applied && startingRevision !== websiteRevisionRef.current) {
          const restored = await saveDraft(websiteRef.current, false);
          throw new Error(
            restored
              ? 'تغيرت المسودة أثناء تطبيق القالب؛ أُعيد حفظ أحدث مسودتك ولم يُطبّق القالب.'
              : 'تغيرت المسودة أثناء تطبيق القالب وتعذّر تأكيد استعادة أحدث نسخة على الخادم.'
          );
        }
        if (!applied) {
          throw new Error('لم يتم حفظ قالب الموقع على الخادم؛ بقيت مسودة موقعك الحالية كما هي.');
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Unable to load website template "${websiteId}".`;
        console.error('[WebsiteBuilder] Website template switch failed.', {
          templateId: websiteId,
          error,
        });
        setTemplateError(message);
        return false;
      }
    },
    [
      activeTemplateId,
      autosaveStatus,
      builderShopId,
      builderShopSlug,
      componentOps,
      recordHistory,
      saveDraft,
      setTemplateError,
      websiteRef,
      websiteRevisionRef,
    ]
  );

  useEffect(() => {
    if (isInitializing || !builderShopId || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('applyTemplate') !== '1') return;

    const templateId = url.searchParams.get('template');
    const presetId = url.searchParams.get('preset') || undefined;
    const requestKey = `${templateId || ''}:${presetId || ''}`;
    if (!templateId || pendingTemplateApplicationRef.current === requestKey) return;
    pendingTemplateApplicationRef.current = requestKey;

    void switchWebsite(templateId, presetId).finally(() => {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('applyTemplate');
      currentUrl.searchParams.delete('template');
      currentUrl.searchParams.delete('preset');
      window.history.replaceState(
        {},
        '',
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
      );
    });
  }, [builderShopId, isInitializing, switchWebsite]);

  const switchTenant = useCallback(
    (tenantId: string) => {
      const found = mockTenants.find((t) => t.id === tenantId);
      if (!found) return;
      setCurrentTenant(found);
      const entry = getFullWebsiteTemplates().find(
        ({ website: site }) =>
          site.tenantId === tenantId || site.activity === found.businessActivity
      );
      if (entry) {
        const { id, website: site } = entry;
        setWebsite(normalizeWebsite(site));
        setActiveTemplateId(id);
        const firstPage = site.pages[0];
        setActivePageId(firstPage ? firstPage.id : 'page_home');
        componentOps.setSelectedNodeId(firstPage ? firstPage.rootNodeId : 'comp_hero');
        resetHistory(`تم تبديل القالب والمستأجر إلى (${site.name})`);
        setAutosaveStatus('unsaved');
        setTemplateError(null);
      }
    },
    [componentOps, resetHistory, setAutosaveStatus, setWebsite]
  );

  const uploadMockAsset = useCallback(
    async (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) throw new Error(validation.error || 'نوع أو حجم الصورة غير مقبول.');
      if (!currentTenant.id) throw new Error('تعذر تحديد المتجر لرفع الصورة.');
      const url = await uploadMediaFile(file, currentTenant.id, 'website_image');
      if (!url || !/^https:\/\//i.test(url) || /^blob:/i.test(url)) {
        throw new Error('لم يُرجع التخزين رابط صورة دائمًا وآمنًا.');
      }
      const newAsset: AssetDto = {
        id: `asset_${Date.now()}`,
        tenantId: currentTenant.id,
        fileName: file.name,
        fileType: 'image',
        url,
        thumbnailUrl: url,
        sizeBytes: file.size,
        altText: file.name,
        category: 'Uploads',
        tags: ['user-upload'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      setAssets((prev) => [newAsset, ...prev]);
    },
    [currentTenant.id]
  );
  // ── Context value ────────────────────────────────────────────────────────

  return (
    <BuilderContext.Provider
      value={{
        // Tenant & Website
        currentTenant,
        tenantsList: mockTenants,
        switchTenant,
        website,
        activeTemplateId,
        templateError,
        allTemplatesList: getFullWebsiteTemplateMetadata(),
        switchWebsite,

        // Pages
        activePageId,
        ...pageOps,

        // Component tree
        ...componentOps,
        // (selectedNodeId, selectedNode, selectionBreadcrumbs, hoveredNodeId,
        //  selectNode, setHoveredNode, updateNodeProps, updateNodeStyle,
        //  insertNode, insertSectionTemplate, deleteNode, duplicateNode,
        //  moveNode, moveNodePosition, reorderChildren, toggleNodeVisibility,
        //  toggleNodeLock, renameNode, updateNodeCustomCode, updateScopedComponentCode)

        // Theme
        theme: website.theme,
        ...themeOps,

        // Viewport & Layout
        viewport,
        setViewport,
        zoom,
        setZoom,
        activeSidebarTab,
        setActiveSidebarTab,
        activeInspectorTab,
        setActiveInspectorTab,
        isRtl,
        setIsRtl,

        // Modals
        isCodeWorkspaceOpen,
        setIsCodeWorkspaceOpen,
        codeActiveFile,
        setCodeActiveFile,
        editingMode,
        setEditingMode,
        isLivePreviewOpen,
        setIsLivePreviewOpen,
        isPublishModalOpen,
        setIsPublishModalOpen,
        isAiModalOpen,
        setIsAiModalOpen,
        isDevDrawerOpen,
        setIsDevDrawerOpen,

        // Assets
        assets,
        uploadMockAsset,

        // History
        canUndo,
        canRedo,
        undo,
        redo,
        historyLog,
        autosaveStatus,
        saveDraft: saveDraftWithWebsite,

        // Publishing
        ...publishing,

        // AI
        ...aiOps,

        // Cart & Commerce
        ...cart,

        // Layout & Real URLs
        onExit,
        isFocusMode,
        setIsFocusMode,
        toggleFocusMode,
        builderShopSlug,
        builderShopName,
        shopProducts,
        liveWebsiteUrl,
        isMobileInspectorOpen,
        setIsMobileInspectorOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isThemeLoading,
        setIsThemeLoading,
        updateWebsiteSettings,
      }}
    >
      {isInitializing ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="text-center max-w-sm">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">
              جاري تحميل محرر الموقع... حمّل مبروك
            </p>
          </div>
        </div>
      ) : (
        children
      )}
    </BuilderContext.Provider>
  );
};

export const useBuilder = (): BuilderContextType => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
};
