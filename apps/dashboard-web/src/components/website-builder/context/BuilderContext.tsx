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
import {
  Tenant,
  Website,
  ViewportBreakpoint,
  WebsiteSettings,
} from '../types/builder';
import { AssetDto } from '../types/dto';
import { EditingModeId } from './types';
import { mockTenants, mockAssets } from '../data/mockTenants';
import { allActivityWebsites, activityTemplatesMeta } from '../data/allActivityTemplates';
import { sampleWebsites } from '../data/initialWebsites';
import { apiRequest } from '@/lib/auth';

// Sub-hooks
import { useBuilderCart } from './hooks/useBuilderCart';
import { useBuilderPageOperations } from './hooks/useBuilderPageOperations';
import { useBuilderComponentOperations } from './hooks/useBuilderComponentOperations';
import { useBuilderTheme } from './hooks/useBuilderTheme';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPublishing } from './hooks/useBuilderPublishing';
import { useBuilderAI } from './hooks/useBuilderAI';

// Utilities
import { getInitialBuilderState } from './builderUtils';

// Types
import { BuilderContextType } from './types';

// ─── Context ────────────────────────────────────────────────────────────────

const BuilderContext = createContext<BuilderContextType | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export const BuilderProvider: React.FC<{ children: React.ReactNode; onExit?: () => void }> = ({
  children,
  onExit,
}) => {
  // ── UI / Layout state ────────────────────────────────────────────────────
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

  // ── Editing mode & server draft version ──────────────────────────────────
  // editingMode is sent to the backend on every save so the server-side
  // capability policy can validate the payload for the active mode.
  // draftVersionRef mirrors the server's monotonic draft version for
  // optimistic-concurrency (sent as clientVersion; server rejects stale saves).
  const [editingMode, setEditingMode] = useState<EditingModeId>('visual');
  const editingModeRef = useRef<EditingModeId>(editingMode);
  useEffect(() => { editingModeRef.current = editingMode; }, [editingMode]);
  const draftVersionRef = useRef<number>(0);

  // ── Core website state ───────────────────────────────────────────────────
  const [initialBuilderData] = useState(() => getInitialBuilderState());
  const [currentTenant, setCurrentTenant] = useState<Tenant>(mockTenants[0]);
  const [website, setWebsite] = useState<Website>(initialBuilderData.website);
  const [activeTemplateId, setActiveTemplateId] = useState(initialBuilderData.templateId);
  const [activePageId, setActivePageId] = useState(initialBuilderData.pageId);

  // Stable refs for closures inside async hooks (avoid stale captures)
  const websiteRef = useRef(website);
  useEffect(() => { websiteRef.current = website; }, [website]);

  const [builderShopId, setBuilderShopId] = useState('');
  const [builderShopSlug, setBuilderShopSlug] = useState('');
  const [builderShopName, setBuilderShopName] = useState('');
  const builderShopIdRef = useRef(builderShopId);
  const builderShopSlugRef = useRef(builderShopSlug);
  useEffect(() => { builderShopIdRef.current = builderShopId; }, [builderShopId]);
  useEffect(() => { builderShopSlugRef.current = builderShopSlug; }, [builderShopSlug]);

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
    draftVersionRef
  );

  // Stable wrappers that inject setWebsite into the raw hook callbacks
  const recordHistory = useCallback(
    (actionDesc: string, newWebsite: Website) => {
      _recordHistoryRaw(actionDesc, newWebsite, setWebsite);
    },
    [_recordHistoryRaw]
  );

  const undo = useCallback(() => _undoRaw(setWebsite), [_undoRaw]);
  const redo = useCallback(() => _redoRaw(setWebsite), [_redoRaw]);
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
    activePage,
    viewport,
    recordHistory,
    setIsMobileInspectorOpen,
    initialSelectedNodeId: 'comp_hero',
  });

  // ── Page operations sub-hook ─────────────────────────────────────────────
  const pageOps = useBuilderPageOperations({
    website,
    activePageId,
    setActivePageId,
    setSelectedNodeId: componentOps.setSelectedNodeId,
    recordHistory,
  });

  // ── Theme sub-hook ───────────────────────────────────────────────────────
  const themeOps = useBuilderTheme(website, recordHistory);

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
    activePage,
    selectedNodeId: componentOps.selectedNodeId,
    recordHistory,
    setSelectedNodeId: componentOps.setSelectedNodeId,
    setWebsite,
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
    if (typeof window !== 'undefined' && website?.components && website?.pages?.length) {
      try {
        localStorage.setItem('ray_builder_last_active_site', JSON.stringify(website));
      } catch {}
    }
  }, [website]);

  // Autosave on unsaved changes
  useEffect(() => {
    return runAutosave(website);
  }, [autosaveStatus, builderShopId, website]); // eslint-disable-line

  // Fetch shop & load builder config on mount
  useEffect(() => {
    let cancelled = false;
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

        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const chosenTemplate =
            urlParams.get('template') ||
            localStorage.getItem('ray_builder_selected_template') ||
            shop?.layoutConfig?.selectedWebsiteTemplate;
          const chosenPreset =
            urlParams.get('preset') ||
            localStorage.getItem('ray_builder_selected_preset') ||
            shop?.layoutConfig?.selectedWebsitePreset;

          if (chosenTemplate) {
            try { localStorage.removeItem('ray_builder_selected_template'); } catch {}

            if (chosenTemplate === 'blank') {
              setWebsite({
                id: `site_blank_${shopId || 'custom'}`,
                tenantId: shopId || 'custom',
                name: shop?.name || 'موقعي الجديد',
                domain: `${shop?.slug || 'shop'}.saassite.com`,
                subdomain: shop?.slug || 'shop',
                activity: (shop?.category || 'RETAIL') as any,
                language: 'ar',
                defaultDirection: 'rtl',
                theme: {
                  primaryColor: '#00E5FF',
                  secondaryColor: '#1E293B',
                  accentColor: '#3B82F6',
                  fontFamily: 'Cairo, sans-serif',
                  direction: 'rtl',
                } as any,
                currentDraftVersion: 1,
                pages: [{
                  id: 'page_home',
                  name: 'الرئيسية',
                  slug: '',
                  rootNodeId: 'comp_blank_hero',
                  metadata: { title: shop?.name || 'الرئيسية', description: 'الصفحة الرئيسية', slug: '', isHomePage: true },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }],
                components: {
                  comp_blank_hero: {
                    id: 'comp_blank_hero', name: 'بداية الموقع', type: 'hero', category: 'section',
                    parentId: null, childrenIds: [],
                    props: { title: shop?.name || 'مرحباً بكم في متجرنا', subtitle: 'ابدأ بإضافة الأقسام والمنتجات من القائمة الجانبية', badge: 'قالب فارغ', align: 'center' },
                    styles: { desktop: { padding: 'py-20 px-6', backgroundColor: '#FFFFFF', textColor: '#0F172A' } },
                  },
                },
              });
              setActivePageId('page_home');
              return;
            }

            const { getMergedThemeTokens } = await import('../data/defaultTheme');
            const target = allActivityWebsites[chosenTemplate] || sampleWebsites[chosenTemplate];
            if (target) {
              const selectedTheme = chosenPreset ? getMergedThemeTokens(chosenPreset) : target.theme;
              setWebsite({ ...target, id: `site_${shopId || 'custom'}`, name: shop?.name || target.name, subdomain: shop?.slug || target.subdomain, theme: selectedTheme as any });
              setActiveTemplateId(chosenTemplate);
              setActivePageId(target.pages[0]?.id || 'page_home');
              return;
            }
          }
        }

        if (shop.builderConfig?.website?.pages?.length && shop.builderConfig?.website?.components) {
          setWebsite(shop.builderConfig.website as Website);
          setActivePageId(shop.builderConfig.website.pages[0]?.id || 'page_home');
          return;
        }

        const config = await apiRequest(`/builder/${shopId}/config`).catch(() => null);
        if (!cancelled && config?.website?.pages?.length && config?.website?.components) {
          setWebsite(config.website as Website);
          setActivePageId(config.website.pages[0]?.id || 'page_home');
        }
      } catch {
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length && !cancelled; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('ray_builder_site_')) continue;
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '');
              if (parsed?.pages?.length && parsed?.components) { setWebsite(parsed); break; }
            } catch {}
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Website utility helpers ───────────────────────────────────────────────

  const updateWebsiteSettings = useCallback((settingsPatch: Partial<WebsiteSettings>) => {
    setWebsite((prev) => {
      const current = prev.settings || {};
      return {
        ...prev,
        settings: {
          ...current,
          ...settingsPatch,
          auth: settingsPatch.auth ? { ...current.auth, ...settingsPatch.auth } : current.auth,
          announcement: settingsPatch.announcement ? { ...current.announcement, ...settingsPatch.announcement } : current.announcement,
          floatingActions: settingsPatch.floatingActions ? { ...current.floatingActions, ...settingsPatch.floatingActions } : current.floatingActions,
          seo: settingsPatch.seo ? { ...current.seo, ...settingsPatch.seo } : current.seo,
          branding: settingsPatch.branding ? { ...current.branding, ...settingsPatch.branding } : current.branding,
        } as WebsiteSettings,
      };
    });
    setAutosaveStatus('unsaved');
  }, [setAutosaveStatus]);

  // Switchers (full template / tenant replacement)
  const switchWebsite = useCallback((websiteId: string) => {
    const target = allActivityWebsites[websiteId] || sampleWebsites[websiteId];
    if (!target) return;
    setWebsite(target);
    setActiveTemplateId(websiteId);
    const firstPage = target.pages[0];
    setActivePageId(firstPage ? firstPage.id : 'page_home');
    componentOps.setSelectedNodeId(firstPage ? firstPage.rootNodeId : 'comp_hero');
    componentOps.setHoveredNode(null);
    const found = mockTenants.find((t) => t.id === target.tenantId || t.businessActivity === target.activity);
    if (found) setCurrentTenant(found);
    resetHistory(`تم تبديل القالب بالكامل إلى نشاط (${target.name})`);
  }, [componentOps, resetHistory]);

  const switchTenant = useCallback((tenantId: string) => {
    const found = mockTenants.find((t) => t.id === tenantId);
    if (!found) return;
    setCurrentTenant(found);
    const entry = Object.entries(allActivityWebsites).find(
      ([, site]) => site.tenantId === tenantId || site.activity === found.businessActivity
    );
    if (entry) {
      const [id, site] = entry;
      setWebsite(site);
      setActiveTemplateId(id);
      const firstPage = site.pages[0];
      setActivePageId(firstPage ? firstPage.id : 'page_home');
      componentOps.setSelectedNodeId(firstPage ? firstPage.rootNodeId : 'comp_hero');
      resetHistory(`تم تبديل القالب والمستأجر إلى (${site.name})`);
    }
  }, [componentOps, resetHistory]);

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
      {children}
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
