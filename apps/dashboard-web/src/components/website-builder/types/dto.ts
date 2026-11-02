import { ComponentNode, DesignTokens, Page, Website } from './builder';

// Go Backend API Request & Response Contracts

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    details: string;
    fieldErrors?: Record<string, string>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    tenantId: string;
  };
}

export interface GetWebsiteResponseDto {
  website: Website;
  tenant: {
    id: string;
    name: string;
    activity: string;
    tier: string;
  };
  permissions: {
    canPublish: boolean;
    canEditCustomCode: boolean;
    canUseAI: boolean;
    canManageDomains: boolean;
  };
  serverTimestamp: string;
}

export interface SaveDraftRequestDto {
  tenantId: string;
  websiteId: string;
  pageId: string;
  components: Record<string, ComponentNode>;
  theme: DesignTokens;
  clientVersion: number;
}

export interface SaveDraftResponseDto {
  status: 'saved';
  newDraftVersion: number;
  savedAt: string;
  checksum: string;
}

export interface PublishWebsiteRequestDto {
  tenantId: string;
  websiteId: string;
  targetDomain: string;
  environment: 'production' | 'staging';
  publishOptions: {
    generateSitemap: boolean;
    purgeIsrCache: boolean;
    optimizeImages: boolean;
    minifyHtml: boolean;
  };
}

export interface PublishWebsiteResponseDto {
  publishId: string;
  deploymentUrl: string;
  customDomainUrl?: string;
  versionNumber: number;
  publishedAt: string;
  buildSummary: {
    pagesGenerated: number;
    staticExportSizeKb: number;
    lighthouseEstimatedScore: number;
    edgeLocationsDeployed: number;
  };
}

export interface AssetDto {
  id: string;
  tenantId: string;
  fileName: string;
  fileType: 'image' | 'video' | 'icon' | 'font' | 'document';
  url: string;
  thumbnailUrl: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText: string;
  category: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
}

export interface NextJsPageExportDto {
  pageSlug: string;
  pageComponentTsx: string;
  metadataTs: string;
  isStaticRoute: boolean;
  revalidateSeconds?: number;
}
