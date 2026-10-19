import {
  ComponentNode,
  DesignTokens,
  Page,
  PageMetadata,
  PublishingPipelineStatus,
  StyleProperties,
  CustomCodeScope,
  Tenant,
  VersionHistoryItem,
  ViewportBreakpoint,
  Website,
  CartItem,
  CartMode,
  AddPageOptions,
  PagePlacementMode,
  WebsiteSettings,
} from '../types/builder';
import { StructuredAiPatch } from '../types/ai';
import { ActivityTemplateMeta } from '../data/allActivityTemplates';
import { AssetDto } from '../types/dto';

export type EditingModeId = 'visual' | 'html_only' | 'css_only' | 'full_code';

export interface BuilderContextType {
  // Multi-tenant & Website State
  currentTenant: Tenant;
  tenantsList: Tenant[];
  switchTenant: (tenantId: string) => void;
  website: Website;
  activeTemplateId: string;
  allTemplatesList: ActivityTemplateMeta[];
  switchWebsite: (websiteId: string) => void;
  activePageId: string;
  activePage: Page;
  switchPage: (pageId: string) => void;
  addPage: (
    nameOrOptions: string | AddPageOptions,
    slug?: string,
    options?: Partial<AddPageOptions>
  ) => void;
  deletePage: (pageId: string) => void;
  updatePageMetadata: (pageId: string, meta: Partial<PageMetadata>) => void;
  updatePagePlacement: (
    pageId: string,
    options: {
      placement: PagePlacementMode;
      headerTitle?: string;
      parentNavId?: string;
      dropdownDescription?: string;
      dropdownBadge?: string;
    }
  ) => void;
  getHeaderDropdownNavItems: () => {
    id: string;
    name: string;
    title: string;
    itemsCount: number;
  }[];

  // Component Tree & Selection
  selectedNodeId: string | null;
  selectedNode: ComponentNode | null;
  selectionBreadcrumbs: ComponentNode[];
  hoveredNodeId: string | null;
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;

  // Component Mutations (Undoable)
  updateNodeProps: (id: string, props: Record<string, any>) => void;
  updateNodeStyle: (
    id: string,
    stylePatch: Partial<StyleProperties>,
    breakpoint?: ViewportBreakpoint
  ) => void;
  insertNode: (node: ComponentNode, parentId: string, index?: number) => void;
  insertSectionTemplate: (templateId: string, targetIndex?: number) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  moveNode: (id: string, direction: 'up' | 'down') => void;
  moveNodePosition: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => boolean;
  reorderChildren: (parentId: string, newChildrenIds: string[]) => void;
  toggleNodeVisibility: (id: string) => void;
  toggleNodeLock: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  updateNodeCustomCode: (id: string, codePatch: Partial<CustomCodeScope>) => void;

  // Design System Tokens
  theme: DesignTokens;
  updateThemeToken: (category: keyof DesignTokens, key: string, value: any) => void;
  applyThemePreset: (presetKey: string) => void;

  // Viewport & Workspace Layout
  viewport: ViewportBreakpoint;
  setViewport: (vp: ViewportBreakpoint) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  activeSidebarTab: 'pages' | 'layers' | 'sections' | 'design' | 'settings' | 'assets';
  setActiveSidebarTab: (
    tab: 'pages' | 'layers' | 'sections' | 'design' | 'settings' | 'assets'
  ) => void;
  activeInspectorTab: 'style' | 'props' | 'responsive' | 'animation' | 'code';
  setActiveInspectorTab: (tab: 'style' | 'props' | 'responsive' | 'animation' | 'code') => void;
  isRtl: boolean;
  setIsRtl: (rtl: boolean) => void;

  // Modals & Drawers
  isCodeWorkspaceOpen: boolean;
  setIsCodeWorkspaceOpen: (open: boolean) => void;
  codeActiveFile: 'component.tsx' | 'styles.css' | 'interactions.ts' | 'schema.json';
  setCodeActiveFile: (
    file: 'component.tsx' | 'styles.css' | 'interactions.ts' | 'schema.json'
  ) => void;
  updateScopedComponentCode: (id: string, file: string, code: string) => void;

  // Editing mode (Visual / HTML-only / CSS-only / Full-code).
  // The backend is the source of truth for mode capability policy; this
  // state only tells the server which mode the client believes it is in.
  editingMode: EditingModeId;
  setEditingMode: (mode: EditingModeId) => void;

  isLivePreviewOpen: boolean;
  setIsLivePreviewOpen: (open: boolean) => void;
  isPublishModalOpen: boolean;
  setIsPublishModalOpen: (open: boolean) => void;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  isDevDrawerOpen: boolean;
  setIsDevDrawerOpen: (open: boolean) => void;

  // Booking Modal
  isBookingModalOpen?: boolean;
  bookingItem?: any;
  openBookingModal?: (item?: any) => void;
  closeBookingModal?: () => void;

  // Assets Library
  assets: AssetDto[];
  uploadMockAsset: (file: File) => void;

  // History & Autosave
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  historyLog: string[];
  autosaveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  saveDraft: (manual?: boolean) => void;

  // Version Snapshots
  versions: VersionHistoryItem[];
  createVersionSnapshot: (label: string, description: string) => void;
  restoreVersion: (versionId: string) => void;

  // Publishing Pipeline
  publishingStatus: PublishingPipelineStatus;
  runPublishPipeline: () => void;

  // AI Modification Engine
  applyAiPatch: (patch: StructuredAiPatch) => void;
  loadCustomWebsite: (newWebsite: Website) => void;

  // Cart & Commerce Engine (Dual Mode: Standalone Store vs Unified Platform Cart)
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartMode: CartMode;
  setCartMode: (mode: CartMode) => void;
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // Dynamic Catalog Search & Category Filters
  selectedProductCategory: string;
  setSelectedProductCategory: (category: string) => void;
  productSearchQuery: string;
  setProductSearchQuery: (query: string) => void;
  productSortBy: 'featured' | 'price_low' | 'price_high' | 'newest';
  setProductSortBy: (sortBy: 'featured' | 'price_low' | 'price_high' | 'newest') => void;

  // Layout, Navigation & Real Website URLs
  onExit?: () => void;
  isFocusMode: boolean;
  setIsFocusMode: (focus: boolean) => void;
  toggleFocusMode: () => void;
  builderShopSlug: string;
  builderShopName: string;
  liveWebsiteUrl: string;
  isMobileInspectorOpen: boolean;
  setIsMobileInspectorOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isThemeLoading: boolean;
  setIsThemeLoading: (loading: boolean) => void;
  updateWebsiteSettings: (settingsPatch: Partial<WebsiteSettings>) => void;
}
