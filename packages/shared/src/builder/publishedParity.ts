import type {
  BuilderPage,
  ComponentNode,
  Website,
  WebsiteAnnouncementSettings,
  WebsiteLinkDestination,
} from './types';
import { resolveWebsiteLinkDestination } from './linkDestinations';

/**
 * Shared helpers that keep the PUBLISHED renderers (PublicSiteRenderer for
 * /site, BuilderTreeRenderer for /shop) in parity with the builder editor
 * canvas. Every rule here mirrors what the editor does, so what the merchant
 * sees while editing is what visitors see after publishing.
 */

type SettingsCarrier = Pick<Website, 'settings'>;
type PagesCarrier = Pick<Website, 'pages'>;

// ─── Header login button ─────────────────────────────────────────────────────

/**
 * Editor parity (HeaderRenderer): the account/login button is only visible
 * when auth is actually ENABLED in settings and neither the node nor the
 * header-button settings hide it. Previously the published header showed a
 * dead login button for sites with auth disabled.
 */
export function shouldShowHeaderLoginButton(
  website: SettingsCarrier,
  node?: Pick<ComponentNode, 'props'> | null
): boolean {
  return (
    Boolean(website.settings?.auth?.enabled) &&
    node?.props?.showLogin !== false &&
    website.settings?.auth?.headerButton?.show !== false
  );
}

// ─── Mobile drawer page list ─────────────────────────────────────────────────

/**
 * Editor parity (HeaderRenderer drawer): standalone pages (ads/campaign
 * landing pages) are deliberately kept OUT of the navigation, and the home
 * page is always listed. The published drawer previously listed every page,
 * leaking unlisted landing pages into the menu.
 */
export function getMobileDrawerPages(website: PagesCarrier): BuilderPage[] {
  return (website.pages || []).filter(
    (page) =>
      page.metadata?.isHomePage || (page.metadata?.placement || 'header_direct') !== 'standalone'
  );
}

// ─── Brand / logo headings ───────────────────────────────────────────────────

/**
 * Editor parity (BasicElementsRenderer): a heading whose id or name refers to
 * the brand/logo renders the merchant logo instead of plain text. The
 * published renderers previously only matched a couple of hard-coded ids.
 */
export function isBrandHeadingNode(node: Pick<ComponentNode, 'id' | 'name'>): boolean {
  const haystack = `${node?.id || ''} ${node?.name || ''}`.toLowerCase();
  return (
    haystack.includes('brand') ||
    haystack.includes('logo') ||
    Boolean(node?.name?.includes('شعار')) ||
    Boolean(node?.name?.includes('هوية'))
  );
}

/** Logo for a brand heading: node prop first, then website branding. */
export function resolveBrandLogoUrl(
  website: SettingsCarrier,
  node: Pick<ComponentNode, 'props'>
): string | null {
  const branding = website.settings?.branding as Record<string, any> | undefined;
  const candidate = node?.props?.logoUrl || branding?.logoUrl || branding?.faviconUrl || '';
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

// ─── Announcement bar ────────────────────────────────────────────────────────

/**
 * The announcement bar was configured in the editor but painted by no live
 * renderer (only the unused legacy SiteRenderer). Returns the normalized
 * announcement when it should be displayed, otherwise null.
 */
export function resolveAnnouncementBar(
  website: SettingsCarrier
): WebsiteAnnouncementSettings | null {
  const announcement = website.settings?.announcement;
  if (!announcement?.enabled || !String(announcement.text || '').trim()) return null;
  return announcement;
}

// ─── Link destinations on published pages ────────────────────────────────────

/**
 * Resolve the click target of a published node or link item. Mirrors the
 * published handler in NodeView: explicit destination wins, then legacy
 * url/pageId fields through resolveWebsiteLinkDestination, and (optionally)
 * an exact page-name/header-title match for label-only links such as footer
 * items that are plain strings.
 */
export function resolvePublishedLinkDestination(
  website: PagesCarrier,
  source: Record<string, any>,
  options?: { inferFromLabel?: boolean; label?: string }
): WebsiteLinkDestination | undefined {
  const explicit = source?.destination as WebsiteLinkDestination | undefined;
  const resolved =
    (explicit?.type ? explicit : undefined) ||
    // resolveWebsiteLinkDestination only reads website.pages internally.
    resolveWebsiteLinkDestination(website as Website, source);
  if (resolved) return resolved;

  if (!options?.inferFromLabel) return undefined;
  const label = String(options.label ?? source?.text ?? source?.label ?? source?.title ?? '')
    .trim()
    .toLowerCase();
  if (!label) return undefined;
  const pages = website.pages || [];
  const page = pages.find(
    (candidate) =>
      candidate.name?.trim().toLowerCase() === label ||
      candidate.metadata?.headerTitle?.trim().toLowerCase() === label
  );
  if (page) return { type: 'page', pageId: page.id };

  // تسميات التنقل العامة ("الرئيسية"، "الخدمات والمنتجات"، "من نحن وقصتنا"…)
  // لا تطابق أسماء الصفحات حرفيًا في كل القوالب — نطابق بالكلمات المفتاحية
  // على slug/اسم الصفحة حتى لا تبقى أزرار التنقل نصًا ميتًا في القوالب القديمة.
  const homePage = pages.find((candidate) => candidate.metadata?.isHomePage) || pages[0];
  const keywordTargets: Array<{ keywords: string[]; pageId?: string }> = [
    {
      keywords: ['الرئيسية', 'رئيسية', 'home', 'البداية'],
      pageId: homePage?.id,
    },
    {
      keywords: ['خدمات', 'منتجات', 'services', 'الأسعار', 'المتجر'],
      pageId:
        pages.find((p) => p.slug === 'services' || p.id === 'page_services')?.id ||
        pages.find(
          (p) => (p.name || '').includes('خدمات') || (p.name || '').includes('منتجات')
        )?.id,
    },
    {
      keywords: ['من نحن', 'قصتنا', 'about', 'فريقنا', 'عن الشركة'],
      pageId:
        pages.find((p) => p.slug === 'about' || p.id === 'page_about')?.id ||
        pages.find(
          (p) => (p.name || '').includes('نحن') || (p.name || '').includes('قصتنا')
        )?.id,
    },
    {
      keywords: ['تواصل', 'حجز', 'اتصال', 'contact', 'book', 'مواعيد', 'استفسار'],
      pageId:
        pages.find((p) => p.slug === 'contact' || p.id === 'page_contact')?.id ||
        pages.find(
          (p) => (p.name || '').includes('تواصل') || (p.name || '').includes('حجز')
        )?.id,
    },
  ];
  for (const target of keywordTargets) {
    if (target.keywords.some((keyword) => label.includes(keyword)) && target.pageId) {
      return { type: 'page', pageId: target.pageId };
    }
  }
  return undefined;
}

/** Side effects a published renderer can perform when following a link. */
export interface PublishedNavContext {
  website: PagesCarrier;
  /** id of the page currently being rendered */
  activePageId: string;
  onNavigatePage: (pageId: string) => void;
  onOpenCart?: () => void;
  onExternalUrl?: (url: string) => void;
  scrollToSection: (sectionId: string) => void;
}

/**
 * Execute a resolved destination in a published client renderer: open
 * external/WhatsApp URLs, open the cart for order buttons, switch page and/or
 * scroll to a section. Returns true when the click was consumed.
 */
export function followPublishedDestination(
  destination: WebsiteLinkDestination | undefined,
  ctx: PublishedNavContext
): boolean {
  if (!destination || destination.type === 'none') return false;

  if (destination.type === 'external' || destination.type === 'whatsapp') {
    if (destination.url) {
      if (ctx.onExternalUrl) ctx.onExternalUrl(destination.url);
      else window.open(destination.url, '_blank', 'noopener,noreferrer');
    }
    return true;
  }

  if (destination.type === 'order') {
    ctx.onOpenCart?.();
    return true;
  }

  const targetPage = destination.pageId
    ? (ctx.website.pages || []).find((page) => page.id === destination.pageId)
    : undefined;
  if (!targetPage) return true;

  if (targetPage.id !== ctx.activePageId) ctx.onNavigatePage(targetPage.id);

  if ((destination.type === 'section' || destination.type === 'booking') && destination.sectionId) {
    if (targetPage.id === ctx.activePageId) ctx.scrollToSection(destination.sectionId);
    else if (typeof window !== 'undefined') {
      window.setTimeout(() => ctx.scrollToSection(destination.sectionId as string), 0);
    }
  }
  return true;
}
