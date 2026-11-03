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
import { allActivityWebsites, activityTemplatesMeta } from '../data/allActivityTemplates';
import { sampleWebsites } from '../data/initialWebsites';
import { apiRequest } from '../../../lib/api/client';

// Sub-hooks
import { useBuilderCart } from './hooks/useBuilderCart';
import { useBuilderPageOperations } from './hooks/useBuilderPageOperations';
import { useBuilderComponentOperations, type WebsiteReducer } from './hooks/useBuilderComponentOperations';
import { useBuilderTheme } from './hooks/useBuilderTheme';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPublishing } from './hooks/useBuilderPublishing';
import { useBuilderAI } from './hooks/useBuilderAI';

// Utilities
import { getHomePageId, getInitialBuilderState, normalizeWebsite } from './builderUtils';

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
  const [activePageId, setActivePageId] = useState(initialBuilderData.pageId);

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
    (actionDesc: string, newWebsite: Website | WebsiteReducer) => {
      _recordHistoryRaw(actionDesc, newWebsite, setWebsite);
    },
    [_recordHistoryRaw, setWebsite]
  );

  const undo = useCallback(() => _undoRaw(setWebsite), [_undoRaw]);
  const redo = useCallback(() => _redoRaw(setWebsite), [_redoRaw]);

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
  const themeOps = useBuilderTheme(website, recordHistory, websiteRef);

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
    if (!isInitializing && typeof window !== 'undefined' && website?.components && website?.pages?.length) {
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
        if (shop.slug) setBuilderShopSlug(shop.slug);
        if (shop.name) {
          setBuilderShopName(shop.name);
          setCurrentTenant((prev) => ({
            ...prev,
            id: shopId,
            name: shop.name,
            businessInfo: { ...prev.businessInfo, brandName: shop.name },
            customDomain: `${shop.slug || 'shop'}.mnmknk.com`,
          }));
        }

        // Fetch real active inventory products for this shop to bind to the website
        apiRequest(`/products?shopId=${shopId}&surface=site&limit=100`)
          .then((res: any) => {
            if (!cancelled && res) {
              const items = Array.isArray(res) ? res : res.data || res.items || [];
              setShopProducts(items);
            }
          })
          .catch(() => undefined);

        // If the shop/config overrides the initial state, load it before leaving
        // the initialization gate. GET currently returns BuilderConfig only and
        // does not expose draftVersion; the first PUT therefore starts at 0.
        if (shop.builderConfig?.website?.pages?.length && shop.builderConfig?.website?.components) {
          const normalized = normalizeWebsite(shop.builderConfig.website as Website);
          setWebsite(normalized);
          setActivePageId(getHomePageId(normalized) || 'page_home');
          return;
        }

        const config = await apiRequest(`/builder/${shopId}/config`).catch(() => null);
        if (!cancelled && config?.website?.pages?.length && config?.website?.components) {
          const normalized = normalizeWebsite(config.website as Website);
          setWebsite(normalized);
          setActivePageId(getHomePageId(normalized) || 'page_home');
        }
      } catch {
        // Only restore the explicitly local draft. Never scan arbitrary shop keys:
        // that could load another shop's website into the current editor.
        if (typeof window !== 'undefined' && !cancelled) {
          try {
            const parsed = JSON.parse(localStorage.getItem('ray_builder_site_local') || '');
            if (parsed?.pages?.length && parsed?.components) {
              setWebsite(normalizeWebsite(parsed));
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
  }, []);

  // ── Website utility helpers ───────────────────────────────────────────────

  const updateWebsiteSettings = useCallback(
    (settingsPatch: Partial<WebsiteSettings>) => {
      setWebsite((prev) => {
        const current = prev.settings || {};
        return {
          ...prev,
          settings: {
            ...current,
            ...settingsPatch,
            auth: settingsPatch.auth ? { ...current.auth, ...settingsPatch.auth } : current.auth,
            announcement: settingsPatch.announcement
              ? { ...current.announcement, ...settingsPatch.announcement }
              : current.announcement,
            floatingActions: settingsPatch.floatingActions
              ? { ...current.floatingActions, ...settingsPatch.floatingActions }
              : current.floatingActions,
            seo: settingsPatch.seo ? { ...current.seo, ...settingsPatch.seo } : current.seo,
            branding: settingsPatch.branding
              ? { ...current.branding, ...settingsPatch.branding }
              : current.branding,
          } as WebsiteSettings,
        };
      });
      setAutosaveStatus('unsaved');
    },
    [setAutosaveStatus]
  );

  // Switchers (full template / tenant replacement)
  const switchWebsite = useCallback(
    (websiteId: string) => {
      const target = allActivityWebsites[websiteId] || sampleWebsites[websiteId];
      if (!target) return;
      setWebsite(normalizeWebsite(target));
      setActiveTemplateId(websiteId);
      const firstPage = target.pages[0];
      setActivePageId(firstPage ? firstPage.id : 'page_home');
      componentOps.setSelectedNodeId(firstPage ? firstPage.rootNodeId : 'comp_hero');
      componentOps.setHoveredNode(null);
      const found = mockTenants.find(
        (t) => t.id === target.tenantId || t.businessActivity === target.activity
      );
      if (found) setCurrentTenant(found);
      resetHistory(`تم تبديل القالب بالكامل إلى نشاط (${target.name})`);
      setAutosaveStatus('unsaved');
    },
    [componentOps, resetHistory, setAutosaveStatus]
  );

  const switchTenant = useCallback(
    (tenantId: string) => {
      const found = mockTenants.find((t) => t.id === tenantId);
      if (!found) return;
      setCurrentTenant(found);
      const entry = Object.entries(allActivityWebsites).find(
        ([, site]) => site.tenantId === tenantId || site.activity === found.businessActivity
      );
      if (entry) {
        const [id, site] = entry;
        setWebsite(normalizeWebsite(site));
        setActiveTemplateId(id);
        const firstPage = site.pages[0];
        setActivePageId(firstPage ? firstPage.id : 'page_home');
        componentOps.setSelectedNodeId(firstPage ? firstPage.rootNodeId : 'comp_hero');
        resetHistory(`تم تبديل القالب والمستأجر إلى (${site.name})`);
        setAutosaveStatus('unsaved');
      }
    },
    [componentOps, resetHistory, setAutosaveStatus]
  );

  const uploadMockAsset = useCallback(
    (file: File) => {
      const newAsset: AssetDto = {
        id: `asset_${Date.now()}`,
        tenantId: currentTenant.id,
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 'document',
        url: URL.createObjectURL(file),
        thumbnailUrl: URL.createObjectURL(file),
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
        allTemplatesList: activityTemplatesMeta,
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
