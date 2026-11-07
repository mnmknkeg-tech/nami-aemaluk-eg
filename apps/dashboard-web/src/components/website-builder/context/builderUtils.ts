import { ComponentNode, StyleProperties, Website } from '../types/builder';
import {
  defaultDesignTokens,
  getMergedThemeTokens,
  normalizeThemeTokens,
} from '../data/defaultTheme';
import {
  loadFullWebsiteTemplate,
  loadThemePreset,
  validateTemplateEntry,
  type FullWebsiteTemplateEntry,
} from '../data/registry';
import {
  adaptTemplateLinkDestinations,
  getInvalidPageDestinations,
  normalizeWebsiteTree,
} from '@ray-eg/shared/builder';

export const createUniqueBuilderId = (
  prefix: string,
  usedIds: Set<string>,
  generateRandomId: () => string = () =>
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
): string => {
  const randomId = generateRandomId();
  const baseId = `${prefix}_${randomId}`;
  let id = baseId;
  let suffix = 1;
  while (usedIds.has(id)) id = `${baseId}_${suffix++}`;
  usedIds.add(id);
  return id;
};

/**
 * Section-library entries are authored as desktop-first compositions. Store a
 * sensible mobile override at insertion time so every ready-made section is
 * usable on a real phone and remains editable from the responsive inspector.
 * Explicit mobile values authored by a template always take precedence.
 */
export const createTemplateMobileStyles = (node: ComponentNode): Partial<StyleProperties> => {
  const desktop = node.styles.desktop || {};
  const mobile: Partial<StyleProperties> = {};
  const pixelValue = (value?: string) => {
    const parsed = Number.parseFloat(value || '');
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const capHorizontalPadding = (value?: string) => {
    const parsed = pixelValue(value);
    return parsed && parsed > 16 ? '16px' : undefined;
  };

  if (desktop.display === 'grid' || desktop.gridColumns) {
    mobile.gridColumns = 'minmax(0, 1fr)';
    mobile.gap =
      pixelValue(desktop.gap) && pixelValue(desktop.gap)! > 16 ? '16px' : desktop.gap || '12px';
  }

  // Keep navigation headers compact; other desktop rows stack safely on phones.
  if (desktop.display === 'flex' && desktop.flexDirection !== 'column' && node.type !== 'header') {
    mobile.flexDirection = 'column';
    mobile.alignItems = 'stretch';
    mobile.flexWrap = 'nowrap';
    mobile.gap = mobile.gap || '12px';
  }

  if (
    node.category === 'section' ||
    node.type === 'container' ||
    node.type === 'flex' ||
    node.type === 'grid'
  ) {
    mobile.width = '100%';
    mobile.minWidth = '0';
    mobile.maxWidth = '100%';
    mobile.paddingLeft = capHorizontalPadding(desktop.paddingLeft);
    mobile.paddingRight = capHorizontalPadding(desktop.paddingRight);
  }

  if (node.type === 'heading') {
    const size = pixelValue(desktop.fontSize);
    if (size && size > 24) mobile.fontSize = `${Math.max(22, Math.round(size * 0.72))}px`;
    mobile.lineHeight = desktop.lineHeight || '1.3';
  }

  if (node.type === 'image') {
    mobile.width = '100%';
    mobile.maxWidth = '100%';
    mobile.height = 'auto';
  }

  if (node.type === 'card' || node.type === 'button') {
    mobile.maxWidth = '100%';
  }

  return { ...mobile, ...(node.styles.mobile || {}) };
};

// Synchronously resolve initial website to eliminate any flash/flicker of default themes
export const BLANK_WEBSITE: Website = {
  id: 'site_blank_initial',
  tenantId: 'guest',
  name: 'موقعي الجديد',
  domain: 'mysite.ray.eg',
  subdomain: 'mysite',
  activity: 'RETAIL' as any,
  language: 'ar',
  defaultDirection: 'rtl',
  theme: defaultDesignTokens as any,
  currentDraftVersion: 1,
  pages: [
    {
      id: 'page_home',
      name: 'الرئيسية',
      slug: '',
      rootNodeId: 'page_root', // ← الجذر الحقيقي: عنصر حاوية (container) مش هيدر
      metadata: {
        title: 'الرئيسية',
        description: '',
        slug: '',
        isHomePage: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  components: {
    // ── الحاوية الجذرية للكانفاس الفارغ (container Layout) ──────────────
    // تكون فاضي (childrenIds: []) عشان ما يظهرش محتوى ثابت، ويمكن للمستخدم
    // إضافة أقسام ونواحي بداخلها. هذا هو "الغالف" الشكلي للكانفاس.
    page_root: {
      id: 'page_root',
      name: 'الصفحة الرئيسية',
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [],
      props: {},
      styles: {
        desktop: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          textColor: '#0F172A',
        },
      },
    },
    comp_blank_root: {
      id: 'comp_blank_root',
      name: 'الصفحة الرئيسية',
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [],
      props: {},
      styles: {
        desktop: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          textColor: '#0F172A',
        },
      },
    },
  },
};

export const normalizeWebsite = (site: Website): Website => {
  if (!site || typeof site !== 'object') return BLANK_WEBSITE;
  const rawComponents =
    site.components && typeof site.components === 'object'
      ? site.components
      : BLANK_WEBSITE.components;
  // Keep the record key as the canonical node ID: child links and page roots
  // are keyed by this value, even when an old payload contains a mismatched id.
  const components = Object.fromEntries(
    Object.entries(rawComponents)
      .filter(([, node]) => Boolean(node) && typeof node === 'object')
      .map(([id, node]) => [id, { ...(node as ComponentNode), id }])
  ) as Record<string, ComponentNode>;
  const claimedRootIds = new Set<string>();
  const incomingPages =
    Array.isArray(site.pages) && site.pages.length ? site.pages : BLANK_WEBSITE.pages;
  const pages = incomingPages.map((page) => {
    const existingRootId = page.rootNodeId;
    if (existingRootId && components[existingRootId] && !claimedRootIds.has(existingRootId)) {
      claimedRootIds.add(existingRootId);
      return { ...page };
    }

    const safePageId = String(page.id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseRootId = `recovered_root_${safePageId}`;
    let rootId = baseRootId;
    let suffix = 1;
    while (components[rootId] || claimedRootIds.has(rootId)) rootId = `${baseRootId}_${suffix++}`;
    components[rootId] = {
      id: rootId,
      name: `Recovered page root (${page.name || page.id || 'page'})`,
      type: 'container',
      category: 'layout',
      parentId: null,
      childrenIds: [],
      props: {},
      styles: {
        desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' },
      },
    } as ComponentNode;
    claimedRootIds.add(rootId);
    return { ...page, rootNodeId: rootId };
  });
  return normalizeWebsiteTree({
    ...BLANK_WEBSITE,
    ...site,
    pages,
    components,
    theme: normalizeThemeTokens(site.theme),
  } as Website);
};

export const getHomePageId = (site: Website): string | undefined =>
  site.pages.find((page) => page.metadata?.isHomePage)?.id ||
  site.pages.find((page) => page.id === 'page_home')?.id ||
  site.pages.find((page) => page.slug === '')?.id ||
  site.pages[0]?.id;

export interface WebsiteMerchantIdentity {
  shopId: string;
  shopSlug: string;
  preserveExistingIdentity: boolean;
}

export const createFullWebsiteTemplateCandidate = (
  currentWebsite: Website,
  entry: FullWebsiteTemplateEntry,
  identity: WebsiteMerchantIdentity,
  theme?: Website['theme']
): Website => {
  const sourceValidation = validateTemplateEntry(entry);
  if (!sourceValidation.valid) {
    throw new Error(
      `Template "${entry.id}" cannot be applied:\n${sourceValidation.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join('\n')}`
    );
  }

  const templateWebsite = entry.website;
  const candidate = adaptTemplateLinkDestinations(
    normalizeWebsite({
      ...templateWebsite,
      id: identity.preserveExistingIdentity ? currentWebsite.id : identity.shopId,
      tenantId: identity.shopId,
      name: identity.preserveExistingIdentity ? currentWebsite.name : templateWebsite.name,
      domain: identity.preserveExistingIdentity
        ? currentWebsite.domain
        : `${identity.shopSlug || 'shop'}.mnmknk.com`,
      subdomain: identity.preserveExistingIdentity
        ? currentWebsite.subdomain
        : identity.shopSlug || 'shop',
      theme: theme || templateWebsite.theme,
    })
  );
  const validation = validateTemplateEntry({ ...entry, website: candidate });
  if (!validation.valid) {
    throw new Error(
      `Template "${entry.id}" cannot be applied:\n${validation.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join('\n')}`
    );
  }
  const invalidDestinations = getInvalidPageDestinations(candidate);
  if (invalidDestinations.length) {
    throw new Error(
      `Template "${entry.id}" has invalid internal destinations: ${invalidDestinations.join(', ')}.`
    );
  }

  const pageReferences = new Set(
    candidate.pages.flatMap((page) => [page.id, page.slug].filter(Boolean))
  );
  Object.values(candidate.components).forEach((node) => {
    const explicitPageId = node.props.pageId || node.props.targetPage || node.props.targetPageId;
    if (explicitPageId && !pageReferences.has(String(explicitPageId))) {
      throw new Error(
        `Template "${entry.id}" component "${node.id}" refers to missing page "${String(explicitPageId)}".`
      );
    }
  });

  if (candidate.globalHeaderId && !candidate.components[candidate.globalHeaderId]) {
    throw new Error(
      `Template "${entry.id}" refers to missing global header "${candidate.globalHeaderId}".`
    );
  }
  if (candidate.globalFooterId && !candidate.components[candidate.globalFooterId]) {
    throw new Error(
      `Template "${entry.id}" refers to missing global footer "${candidate.globalFooterId}".`
    );
  }

  return candidate;
};

export const hasWebsiteContentToReplace = (website: Website): boolean =>
  website.pages.length > 1 ||
  website.pages.some((page) => website.components[page.rootNodeId]?.childrenIds.length > 0) ||
  Object.values(website.components).some(
    (node) => node.type !== 'container' && node.type !== 'page'
  );

export const persistTemplateCandidateBeforeCommit = async (
  candidate: Website,
  saveDraft: (website: Website) => Promise<boolean>,
  commit: (website: Website) => void,
  canCommit: () => boolean = () => true
): Promise<boolean> => {
  if (!(await saveDraft(candidate))) return false;
  if (!canCommit()) return false;
  commit(candidate);
  return true;
};

export interface InitialBuilderSelection {
  search?: string;
  selectedTemplate?: string | null;
  selectedPreset?: string | null;
  lastActiveSite?: string | null;
}

const getBrowserSelection = (): InitialBuilderSelection => {
  if (typeof window === 'undefined') return {};
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isPendingTemplateApplication = urlParams.get('applyTemplate') === '1';
    return {
      search: window.location.search,
      selectedTemplate: isPendingTemplateApplication
        ? null
        : urlParams.get('template') || localStorage.getItem('ray_builder_selected_template'),
      selectedPreset: isPendingTemplateApplication
        ? null
        : urlParams.get('preset') || localStorage.getItem('ray_builder_selected_preset'),
      lastActiveSite: localStorage.getItem('ray_builder_last_active_site'),
    };
  } catch (error) {
    console.error('[WebsiteBuilder] Could not read the initial template selection.', error);
    return {};
  }
};

export const getInitialBuilderState = (
  selection?: InitialBuilderSelection
): {
  website: Website;
  templateId: string;
  pageId: string;
  templateError: string | null;
} => {
  const requested = selection || getBrowserSelection();
  const params = new URLSearchParams(requested.search || '');
  const isPendingTemplateApplication = params.get('applyTemplate') === '1';
  const chosenTemplate = isPendingTemplateApplication
    ? undefined
    : params.get('template') || requested.selectedTemplate || undefined;
  const chosenPreset = isPendingTemplateApplication
    ? undefined
    : params.get('preset') || requested.selectedPreset || undefined;
  let templateError: string | null = null;

  if (chosenTemplate && chosenTemplate !== 'blank') {
    try {
      const entry = loadFullWebsiteTemplate(chosenTemplate);
      let site = entry.website;
      if (chosenPreset) {
        const preset = loadThemePreset(chosenPreset);
        site = { ...site, theme: getMergedThemeTokens(preset.presetKey) };
      }
      const normalized = normalizeWebsite(site);
      return {
        website: normalized,
        templateId: entry.id,
        pageId: getHomePageId(normalized) || 'page_home',
        templateError: null,
      };
    } catch (error) {
      templateError =
        error instanceof Error
          ? error.message
          : `Unable to load website template "${chosenTemplate}".`;
      console.error('[WebsiteBuilder] Initial template selection failed.', {
        templateId: chosenTemplate,
        presetId: chosenPreset,
        error,
      });
    }
  }

  if (requested.lastActiveSite) {
    try {
      const parsed = JSON.parse(requested.lastActiveSite);
      if (parsed?.components && Array.isArray(parsed?.pages) && parsed.pages.length > 0) {
        const site = normalizeWebsite(parsed);
        return {
          website: site,
          templateId: site.id || 'custom',
          pageId: getHomePageId(site) || 'page_home',
          templateError,
        };
      }
    } catch (error) {
      console.error('[WebsiteBuilder] Could not restore the saved website draft.', error);
      templateError =
        templateError ||
        (error instanceof Error ? error.message : 'The saved website draft could not be restored.');
    }
  }

  // An explicitly invalid selection is surfaced to the editor; it is never
  // silently replaced with a different full website template.
  return {
    website: normalizeWebsite(BLANK_WEBSITE),
    templateId: 'blank',
    pageId: 'page_home',
    templateError,
  };
};
