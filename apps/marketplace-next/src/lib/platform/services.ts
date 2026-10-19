import { api } from '../api';
import type {
  Template,
  Theme,
  MediaAsset,
  AnalyticsSummary,
  SeoReport,
  Integration,
  ContentPage,
  BlogPost,
  NavigationMenu,
  Review,
  Bookmark,
  Collection,
  MarketplaceItem,
  PlatformSettings,
} from './types';

// ─── Template Services ─────────────────────────────────────────

export async function getTemplates(category?: string, activityId?: string): Promise<Template[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (activityId) params.set('activity', activityId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get<Template[]>(`/templates${query}`, { revalidate: 3600, tags: ['templates'] });
}

export async function getTemplate(id: string): Promise<Template | null> {
  try {
    return await api.get<Template>(`/templates/${id}`, {
      revalidate: 3600,
      tags: [`template:${id}`],
    });
  } catch {
    return null;
  }
}

// ─── Theme Services ────────────────────────────────────────────

export async function getThemes(category?: string): Promise<Theme[]> {
  const query = category ? `?category=${category}` : '';
  return api.get<Theme[]>(`/themes${query}`, { revalidate: 3600, tags: ['themes'] });
}

// ─── Media Services ────────────────────────────────────────────

export async function getMediaAssets(shopId: string, type?: string): Promise<MediaAsset[]> {
  const query = type ? `?type=${type}` : '';
  return api.get<MediaAsset[]>(`/shops/${shopId}/media${query}`, {
    revalidate: 0,
    tags: [`media:${shopId}`],
  });
}

export async function uploadMediaAsset(
  shopId: string,
  file: File,
  type: string
): Promise<MediaAsset> {
  const { compressImageBeforeUpload } = await import('../compress-image');
  const toUpload = await compressImageBeforeUpload(file);
  const formData = new FormData();
  formData.append('file', toUpload);
  formData.append('type', type);
  return api.post<MediaAsset>(`/shops/${shopId}/media`, formData);
}

export async function deleteMediaAsset(shopId: string, assetId: string): Promise<void> {
  await api.delete(`/shops/${shopId}/media/${assetId}`);
}

// ─── Analytics Services ────────────────────────────────────────

export async function getAnalytics(websiteId: string, days = 30): Promise<AnalyticsSummary> {
  return api.get<AnalyticsSummary>(`/websites/${websiteId}/analytics?days=${days}`, {
    revalidate: 300,
    tags: [`analytics:${websiteId}`],
  });
}

export async function getSeoReport(websiteId: string): Promise<SeoReport> {
  return api.get<SeoReport>(`/websites/${websiteId}/seo-report`, {
    revalidate: 3600,
    tags: [`seo-report:${websiteId}`],
  });
}

// ─── Integration Services ──────────────────────────────────────

export async function getIntegrations(shopId: string): Promise<Integration[]> {
  return api.get<Integration[]>(`/shops/${shopId}/integrations`, {
    revalidate: 0,
    tags: [`integrations:${shopId}`],
  });
}

export async function connectIntegration(
  shopId: string,
  type: string,
  config: Record<string, any>
): Promise<Integration> {
  return api.post<Integration>(`/shops/${shopId}/integrations`, { type, config });
}

export async function disconnectIntegration(shopId: string, integrationId: string): Promise<void> {
  await api.delete(`/shops/${shopId}/integrations/${integrationId}`);
}

// ─── Content Services ──────────────────────────────────────────

export async function getContentPages(websiteId: string): Promise<ContentPage[]> {
  return api.get<ContentPage[]>(`/websites/${websiteId}/pages`, {
    revalidate: 0,
    tags: [`pages:${websiteId}`],
  });
}

export async function createContentPage(
  websiteId: string,
  data: Partial<ContentPage>
): Promise<ContentPage> {
  return api.post<ContentPage>(`/websites/${websiteId}/pages`, data);
}

export async function updateContentPage(
  websiteId: string,
  pageId: string,
  data: Partial<ContentPage>
): Promise<ContentPage> {
  return api.patch<ContentPage>(`/websites/${websiteId}/pages/${pageId}`, data);
}

export async function deleteContentPage(websiteId: string, pageId: string): Promise<void> {
  await api.delete(`/websites/${websiteId}/pages/${pageId}`);
}

// ─── Blog Services ─────────────────────────────────────────────

export async function getBlogPosts(websiteId?: string): Promise<BlogPost[]> {
  const query = websiteId ? `?websiteId=${websiteId}` : '';
  return api.get<BlogPost[]>(`/blog${query}`, { revalidate: 3600, tags: ['blog'] });
}

export async function createBlogPost(
  websiteId: string,
  data: Partial<BlogPost>
): Promise<BlogPost> {
  return api.post<BlogPost>(`/websites/${websiteId}/blog`, data);
}

export async function updateBlogPost(
  websiteId: string,
  postId: string,
  data: Partial<BlogPost>
): Promise<BlogPost> {
  return api.patch<BlogPost>(`/websites/${websiteId}/blog/${postId}`, data);
}

export async function deleteBlogPost(websiteId: string, postId: string): Promise<void> {
  await api.delete(`/websites/${websiteId}/blog/${postId}`);
}

// ─── Navigation Services ──────────────────────────────────────

export async function getNavigationMenus(websiteId: string): Promise<NavigationMenu[]> {
  return api.get<NavigationMenu[]>(`/websites/${websiteId}/menus`, {
    revalidate: 0,
    tags: [`menus:${websiteId}`],
  });
}

export async function updateNavigationMenu(
  websiteId: string,
  menuId: string,
  data: Partial<NavigationMenu>
): Promise<NavigationMenu> {
  return api.patch<NavigationMenu>(`/websites/${websiteId}/menus/${menuId}`, data);
}

// ─── Review Services ───────────────────────────────────────────

export async function getShopReviews(shopId: string): Promise<Review[]> {
  return api.get<Review[]>(`/shops/${shopId}/reviews`, {
    revalidate: 300,
    tags: [`reviews:${shopId}`],
  });
}

export async function createReview(
  shopId: string,
  rating: number,
  comment: string
): Promise<Review> {
  return api.post<Review>(`/shops/${shopId}/reviews`, { rating, comment });
}

// ─── Bookmark Services ─────────────────────────────────────────

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  return api.get<Bookmark[]>(`/users/${userId}/bookmarks`, {
    revalidate: 0,
    tags: [`bookmarks:${userId}`],
  });
}

export async function toggleBookmark(
  userId: string,
  shopId: string
): Promise<{ bookmarked: boolean }> {
  return api.post<{ bookmarked: boolean }>(`/users/${userId}/bookmarks`, { shopId });
}

export async function getCollections(userId: string): Promise<Collection[]> {
  return api.get<Collection[]>(`/users/${userId}/collections`, {
    revalidate: 0,
    tags: [`collections:${userId}`],
  });
}

// ─── Marketplace Services ──────────────────────────────────────

export async function getMarketplaceItems(
  type: string,
  category?: string
): Promise<MarketplaceItem[]> {
  const params = new URLSearchParams({ type });
  if (category) params.set('category', category);
  return api.get<MarketplaceItem[]>(`/marketplace?${params}`, {
    revalidate: 3600,
    tags: ['marketplace'],
  });
}

// ─── Settings Services ─────────────────────────────────────────

export async function getPlatformSettings(shopId: string): Promise<PlatformSettings> {
  return api.get<PlatformSettings>(`/shops/${shopId}/settings`, {
    revalidate: 0,
    tags: [`settings:${shopId}`],
  });
}

export async function updatePlatformSettings(
  shopId: string,
  data: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>(`/shops/${shopId}/settings`, data);
}
