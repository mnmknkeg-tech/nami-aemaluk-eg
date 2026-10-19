import type { DesignTokens, PageSchema, BrandIdentity, StylePreset } from '@/types/pageSchema';

// ─── Website ──────────────────────────────────────────────────

export type WebsiteStatus = 'draft' | 'published' | 'archived' | 'scheduled';

export interface Website {
  id: string;
  shopId: string;
  name: string;
  slug: string;
  status: WebsiteStatus;
  domain?: string;
  customDomain?: string;
  templateId?: string;
  designTokens: DesignTokens;
  pageSchema: PageSchema;
  brandIdentity?: Partial<BrandIdentity>;
  customCode?: {
    head?: string;
    body?: string;
    css?: string;
  };
  seoSettings?: SeoSettings;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// ─── Template ──────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  previewUrl: string;
  category: TemplateCategory;
  activityIds: string[];
  designTokens: DesignTokens;
  pageSchema: PageSchema;
  brandIdentity?: Partial<BrandIdentity>;
  isPremium: boolean;
  price?: number;
  rating: number;
  downloadCount: number;
  tags: string[];
}

export type TemplateCategory =
  | 'restaurant'
  | 'clinic'
  | 'retail'
  | 'real-estate'
  | 'automotive'
  | 'professional'
  | 'beauty'
  | 'education'
  | 'portfolio'
  | 'landing-page'
  | 'blog'
  | 'ecommerce'
  | 'general';

// ─── Theme ─────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  designTokens: DesignTokens;
  isDark: boolean;
  category: string;
  tags: string[];
  isPremium: boolean;
  price?: number;
}

// ─── Domain ────────────────────────────────────────────────────

export type DomainStatus = 'pending' | 'verifying' | 'verified' | 'failed' | 'ssl-pending' | 'active';

export interface Domain {
  id: string;
  websiteId: string;
  domain: string;
  isCustom: boolean;
  status: DomainStatus;
  sslStatus: 'pending' | 'active' | 'failed';
  dnsRecords: DnsRecord[];
  verifiedAt?: string;
  createdAt: string;
}

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  host: string;
  value: string;
  verified: boolean;
}

// ─── SEO Settings ──────────────────────────────────────────────

export interface SeoSettings {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  sitemapEnabled: boolean;
  schemaMarkup?: Record<string, any>;
  redirects?: RedirectRule[];
  customHeaders?: Record<string, string>;
}

export interface RedirectRule {
  from: string;
  to: string;
  type: 301 | 302;
  enabled: boolean;
}

// ─── Publishing ────────────────────────────────────────────────

export type PublishAction = 'publish' | 'unpublish' | 'schedule' | 'rollback';

export interface PublishRecord {
  id: string;
  websiteId: string;
  version: number;
  action: PublishAction;
  triggeredBy: string;
  createdAt: string;
  rollbackVersion?: number;
  deploymentLog?: string;
  status: 'success' | 'failed' | 'in-progress';
}

export interface VersionHistory {
  id: string;
  websiteId: string;
  version: number;
  snapshot: {
    designTokens: DesignTokens;
    pageSchema: PageSchema;
    brandIdentity?: Partial<BrandIdentity>;
  };
  createdBy: string;
  createdAt: string;
  label?: string;
}

// ─── Media ────────────────────────────────────────────────────

export interface MediaAsset {
  id: string;
  websiteId?: string;
  shopId?: string;
  type: 'image' | 'video' | 'document' | 'font' | 'icon' | 'logo';
  url: string;
  thumbnail?: string;
  name: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  alt?: string;
  tags: string[];
  createdAt: string;
}

// ─── Analytics ─────────────────────────────────────────────────

export interface AnalyticsSummary {
  visitors: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: { path: string; views: number }[];
  trafficSources: { source: string; visitors: number; percentage: number }[];
  topCountries: { country: string; visitors: number }[];
  devices: { device: 'desktop' | 'mobile' | 'tablet'; percentage: number }[];
}

export interface SeoReport {
  score: number;
  issues: { type: 'error' | 'warning' | 'info'; message: string; path?: string }[];
  keywords: { keyword: string; position: number; volume: number }[];
  backlinks: number;
  domainAuthority: number;
}

// ─── Integrations ─────────────────────────────────────────────

export type IntegrationType =
  | 'google-analytics'
  | 'google-search-console'
  | 'meta-pixel'
  | 'google-tag-manager'
  | 'cloudflare'
  | 'smtp'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'stripe'
  | 'paypal'
  | 'maps';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  connected: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ─── Content Management ────────────────────────────────────────

export interface ContentPage {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  content: Record<string, any>;
  seo?: Partial<SeoSettings>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface BlogPost {
  id: string;
  websiteId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  author: string;
  publishedAt: string;
  readTime?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  order: number;
  parentId?: string;
  target?: '_self' | '_blank';
}

export interface NavigationMenu {
  id: string;
  name: string;
  location: 'header' | 'footer' | 'sidebar' | 'mobile';
  items: MenuItem[];
}

// ─── Settings ─────────────────────────────────────────────────

export interface PlatformSettings {
  general: {
    siteName: string;
    siteDescription: string;
    logo: string;
    favicon: string;
    timezone: string;
    language: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  localization: {
    defaultLanguage: string;
    languages: string[];
    defaultCurrency: string;
    currencies: string[];
    timezone: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
    ipWhitelist: string[];
  };
}

// ─── Reviews & Ratings ────────────────────────────────────────

export interface Review {
  id: string;
  shopId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  reply?: string;
  isVerified: boolean;
  createdAt: string;
}

// ─── Bookmarks & Collections ───────────────────────────────────

export interface Bookmark {
  id: string;
  shopId: string;
  userId: string;
  collectionId?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  userId: string;
  shopIds: string[];
  isPublic: boolean;
  createdAt: string;
}

// ─── Marketplace ───────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  type: 'theme' | 'template' | 'component' | 'plugin';
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  previewUrl: string;
  author: string;
  price: number;
  isFree: boolean;
  rating: number;
  downloadCount: number;
  tags: string[];
  category: string;
}
