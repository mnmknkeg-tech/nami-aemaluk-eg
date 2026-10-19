// ============================================================
// Canonical Website Builder data model — single source of truth
// shared by the dashboard editor (canvas) and the public site
// renderer (marketplace /site/[slug]).
// ============================================================

export type ViewportBreakpoint = 'desktop' | 'tablet' | 'mobile';

export type ComponentCategory =
  | 'layout'
  | 'typography'
  | 'media'
  | 'action'
  | 'section'
  | 'commerce'
  | 'forms'
  | 'form'
  | 'navigation'
  | 'interactive'
  | 'auth';

export type ComponentType =
  | 'product_filter_tabs'
  | 'website'
  | 'page'
  | 'header'
  | 'hero'
  | 'features'
  | 'bento'
  | 'bento-grid'
  | 'services'
  | 'services-grid'
  | 'products'
  | 'pricing'
  | 'testimonials'
  | 'gallery'
  | 'team'
  | 'stats'
  | 'faq'
  | 'cta'
  | 'contact'
  | 'contact-section'
  | 'footer'
  | 'navigation'
  | 'form'
  | 'container'
  | 'grid'
  | 'flex'
  | 'heading'
  | 'paragraph'
  | 'button'
  | 'image'
  | 'badge'
  | 'card'
  | 'divider'
  | 'spacer'
  | 'icon'
  | 'input'
  | 'custom-code'
  | 'whatsapp-float'
  | 'mobile_footer'
  | 'whatsapp_button'
  | 'trust-badges'
  | 'trust_badges'
  | 'before-after'
  | 'before_after'
  | 'promo-banner'
  | 'promo_banner'
  | 'announcement-bar'
  | 'announcement_bar'
  | 'auth'
  | 'auth_login'
  | 'auth_register';

export type BusinessActivity =
  | 'automotive'
  | 'real_estate'
  | 'ecommerce'
  | 'tech_saas'
  | 'clinic_health'
  | 'restaurant'
  | 'agency'
  | 'education'
  | 'furniture'
  | 'car_rental'
  | 'flowers'
  | 'accounting'
  | 'gym_fitness'
  | 'salon_beauty'
  | 'gold_jewelry'
  | 'fashion_boutique'
  | 'grocery_supermarket'
  | 'home_services'
  | 'travel_tourism'
  | 'law_firm'
  | 'general';

export interface StyleProperties {
  // Layout
  display?: 'block' | 'flex' | 'grid' | 'inline-block' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?:
    'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flex?: string;
  gridColumns?: string;
  gap?: string;

  // Dimensions
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;

  // Spacing
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace?: string;

  // Media
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  // Background & Colors
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundGradient?: string;

  // Borders & Radius
  borderWidth?: string;
  borderTopWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  borderRightWidth?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderColor?: string;
  borderRadius?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomLeftRadius?: string;
  borderBottomRightRadius?: string;

  // Effects & Shadows
  boxShadow?: string;
  opacity?: number;
  backdropBlur?: string;
  transform?: string;
  transition?: string;
  zIndex?: number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  textOverflow?: string;
  flexShrink?: number | string;
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface AnimationConfig {
  type: 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'zoom-in' | 'bounce' | 'pulse';
  duration: number;
  delay: number;
  easing: string;
  hoverEffect?: 'none' | 'lift' | 'glow' | 'scale' | 'tilt';
}

export interface InteractionConfig {
  onClickAction?:
    'none' | 'navigate' | 'scroll-to' | 'open-modal' | 'toggle-element' | 'custom-script';
  targetUrl?: string;
  targetElementId?: string;
  openInNewTab?: boolean;
  customJsSnippet?: string;
}

export interface DataBinding {
  field: string;
  sourceKey: string;
  fallbackValue?: string;
}

export interface CustomCodeScope {
  tsx?: string;
  css?: string;
  js?: string;
  tsxSnippet?: string;
  cssSnippet?: string;
  jsSnippet?: string;
  propsSchema?: string;
}

export interface ComponentNode {
  id: string;
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  parentId: string | null;
  childrenIds: string[];

  props: Record<string, any>;

  styles: {
    desktop: StyleProperties;
    tablet?: StyleProperties;
    mobile?: StyleProperties;
  };

  animation?: AnimationConfig;
  interaction?: InteractionConfig;
  dataBindings?: Record<string, DataBinding>;
  customCode?: CustomCodeScope;

  isLocked?: boolean;
  isHidden?: boolean;
  isGlobal?: boolean;
  globalComponentKey?: string;
  activityTags?: BusinessActivity[];
  notes?: string;
}

export type PagePlacementMode =
  'header_direct' | 'header_dropdown' | 'standalone' | 'header_and_footer';

export interface PageMetadata {
  title: string;
  description: string;
  slug: string;
  canonicalUrl?: string;
  robots?: 'index, follow' | 'noindex, follow' | 'index, nofollow' | 'noindex, nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  structuredDataJson?: string;
  isHomePage?: boolean;
  placement?: PagePlacementMode;
  headerTitle?: string;
  parentNavId?: string;
}

export interface BuilderPage {
  id: string;
  name: string;
  slug: string;
  rootNodeId: string;
  metadata: PageMetadata;
  customHeadCode?: string;
  customBodyCode?: string;
  createdAt: string;
  updatedAt: string;
}

/** Alias kept for dashboard-web compatibility (previously defined locally). */
export type Page = BuilderPage;

/** Cart behaviour: per-site standalone cart or unified marketplace cart. */
export type CartMode = 'standalone' | 'unified';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  priceFormatted: string;
  image: string;
  category?: string;
  badge?: string;
  quantity: number;
  tenantId?: string;
  tenantName?: string;
}

export interface DropdownSubItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  pageId?: string;
  iconName?: string;
  badge?: string;
}

export interface ProductCategoryFilter {
  id: string;
  label: string;
  count?: number;
  iconName?: string;
}

export interface ResponsiveValue<T> {
  desktop?: T;
  tablet?: T;
  mobile?: T;
}

export interface AddPageOptions {
  name: string;
  slug: string;
  placement?: PagePlacementMode;
  headerTitle?: string;
  parentNavId?: string;
  dropdownDescription?: string;
  dropdownBadge?: string;
  includeHeaderFooter?: boolean;
  pageTemplate?:
    | 'blank'
    | 'hero_services'
    | 'catalog_grid'
    | 'contact_form'
    | 'landing_page'
    | 'product_page'
    | 'login_page'
    | 'register_page';
}

export interface Tenant {
  id: string;
  name: string;
  ownerEmail: string;
  businessActivity: BusinessActivity;
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
  customDomain?: string;
  businessInfo: {
    brandName: string;
    phone: string;
    email: string;
    address: string;
    whatsappNumber: string;
    currency: string;
    logoUrl: string;
  };
  dataSources: {
    productsCount: number;
    servicesCount: number;
    testimonialsCount: number;
  };
}

export interface VersionHistoryItem {
  id: string;
  versionNumber: number;
  label: string;
  description: string;
  timestamp: string;
  author: string;
  websiteSnapshot: Website;
  isPublished?: boolean;
}

export interface HistoryAction {
  id: string;
  description: string;
  timestamp: string;
  undo: () => void;
  redo: () => void;
}

export interface PublishingPipelineStatus {
  status:
    | 'idle'
    | 'validating'
    | 'building_nextjs'
    | 'generating_metadata'
    | 'purging_cache'
    | 'published'
    | 'failed';
  currentStep: number;
  totalSteps: number;
  stepMessage: string;
  liveUrl?: string;
  publishedAt?: string;
  errors?: string[];
  buildStats?: {
    pagesCount: number;
    totalSizeKb: number;
    staticRoutes: number;
    ssrRoutes: number;
    firstLoadJsKb: number;
    coreWebVitalsEstimatedScore: number;
  };
}

export interface DesignTokens {
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontHeading: string;
    fontBody: string;
    scaleRatio: number;
    baseFontSize: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
  spacingUnit: number;
}

export interface WebsiteAuthHeaderButtonSettings {
  show?: boolean;
  style?: 'icon' | 'button' | 'icon_and_text';
  text?: string;
  targetPageId?: string;
}

export interface WebsiteAuthSettings {
  enabled: boolean;
  mode?: 'phone_otp' | 'email_password' | 'both';
  allowGuestCheckout?: boolean;
  loginTitle?: string;
  requireVerification?: boolean;
  /** Display mode: separate dedicated page, embedded section on landing page, or both */
  displayMode?: 'dedicated_page' | 'embedded' | 'both';
  /** Top navigation header button / icon */
  headerButton?: WebsiteAuthHeaderButtonSettings;
  /** Target slug for login page if separate page is used (default: 'login') */
  dedicatedLoginSlug?: string;
  /** Target slug for register page if separate page is used (default: 'register') */
  dedicatedRegisterSlug?: string;
}

export interface WebsiteAnnouncementSettings {
  enabled: boolean;
  text: string;
  link?: string;
  bgColor?: string;
  textColor?: string;
}

export interface WebsiteFloatingActionsSettings {
  whatsappButton: boolean;
  whatsappNumber?: string;
  welcomeMessage?: string;
  stickyMobileBottomBar: boolean;
}

export interface WebsiteSeoSettings {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  keywords?: string;
  metaPixelId?: string;
  googleAnalyticsId?: string;
}

export interface WebsiteBrandingSettings {
  faviconUrl?: string;
  customCss?: string;
}

export interface WebsiteCartSettings {
  enabled?: boolean;
  businessType?: 'orders' | 'bookings' | 'subscriptions';
  showCartIcon?: boolean;
  iconType?: 'ShoppingBag' | 'ShoppingCart' | 'Store' | 'Package' | 'CreditCard';
  position?: 'header' | 'floating' | 'both';
  mode?: 'standalone' | 'unified';
  allowDirectCheckout?: boolean;
  notes?: string;
}

export interface WebsiteSettings {
  auth?: WebsiteAuthSettings;
  announcement?: WebsiteAnnouncementSettings;
  floatingActions?: WebsiteFloatingActionsSettings;
  seo?: WebsiteSeoSettings;
  branding?: WebsiteBrandingSettings;
  cart?: WebsiteCartSettings;
}

export interface Website {
  id: string;
  tenantId: string;
  name: string;
  domain: string;
  subdomain: string;
  activity: BusinessActivity;
  language: 'ar' | 'en' | 'both';
  defaultDirection: 'rtl' | 'ltr';
  pages: BuilderPage[];
  components: Record<string, ComponentNode>;
  theme: DesignTokens;
  settings?: WebsiteSettings;
  globalHeaderId?: string;
  globalFooterId?: string;
  publishedVersionId?: string;
  currentDraftVersion: number;
}

// Context about the shop owning the published site, resolved server-side.
export interface SiteShopContext {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
}

// A real product coming from the shop catalog, mapped for section binding.
export interface SiteProduct {
  id: string;
  title: string;
  description?: string;
  price: number | string;
  image?: string;
  hoverImage?: string;
  badge?: string;
  specs?: string[];
  /** Hide the order/buy CTA on this product card (e.g. catalog-only cards). */
  hideBuyBtn?: boolean;
  /**
   * أحجام/مقاسات المنتج — تُعرض تلقائياً كـ chips على بطاقة المنتج.
   * يُقبل: string[] أو {label,price}[] (يُطبَّع عبر normalizeProductSizes).
   */
  sizes?: any[];
  /** المخزون المتبقي — إن وُجد يظهر شارة "متوفر/نفد المخزون" على البطاقة. */
  stock?: number;
  slug?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  shopId?: string;
  shopSlug?: string;
}

// A real subscription plan coming from the shop subscriptions system, mapped for section binding.
export interface SiteSubscriptionPlan {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  billingCycle: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'custom';
  durationDays: number;
  price: number;
  currency: string;
  features?: string[];
  trialDays?: number;
  isFeatured?: boolean;
  color?: string;
}

