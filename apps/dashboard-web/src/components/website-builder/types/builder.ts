// ============================================================
// Canonical builder types now live in @ray-eg/shared/builder —
// the single source shared with the public site renderer.
// This file re-exports them so existing relative imports keep
// working inside dashboard-web.
// ============================================================
export type {
  ViewportBreakpoint,
  CartMode,
  CartItem,
  DropdownSubItem,
  ProductCategoryFilter,
  ComponentCategory,
  ComponentType,
  BusinessActivity,
  ResponsiveValue,
  StyleProperties,
  AnimationConfig,
  InteractionConfig,
  DataBinding,
  CustomCodeScope,
  ComponentNode,
  PagePlacementMode,
  AddPageOptions,
  PageMetadata,
  Page,
  BuilderPage,
  DesignTokens,
  Website,
  Tenant,
  VersionHistoryItem,
  HistoryAction,
  PublishingPipelineStatus,
  SiteShopContext,
  SiteProduct,
  WebsiteSettings,
  WebsiteAuthSettings,
  WebsiteAuthHeaderButtonSettings,
  WebsiteAnnouncementSettings,
  WebsiteFloatingActionsSettings,
  WebsiteSeoSettings,
  WebsiteBrandingSettings,
  WebsiteCartSettings,
} from '@ray-eg/shared/builder';
