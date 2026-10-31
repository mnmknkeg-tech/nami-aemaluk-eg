import { ComponentNode, StyleProperties, Website } from '../types/builder';
import {
  defaultDesignTokens,
  getMergedThemeTokens,
  normalizeThemeTokens,
} from '../data/defaultTheme';
import { allActivityWebsites } from '../data/allActivityTemplates';
import { sampleWebsites } from '../data/initialWebsites';

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
  // Preserve merchant data verbatim — never silently replace merchant pages/components
  // with BLANK_WEBSITE fallbacks. Only fill in missing required shape fields.
  const pages = Array.isArray(site.pages) ? site.pages : BLANK_WEBSITE.pages;
  const components =
    site.components && typeof site.components === 'object'
      ? site.components
      : BLANK_WEBSITE.components;
  return {
    ...BLANK_WEBSITE,
    ...site,
    pages,
    components,
    theme: normalizeThemeTokens(site.theme),
  };
};

export const getInitialBuilderState = (): {
  website: Website;
  templateId: string;
  pageId: string;
} => {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const chosenTemplate =
        urlParams.get('template') || localStorage.getItem('ray_builder_selected_template');
      // Saved preset key from themes gallery — applies colour/typography on top of template layout
      const savedPreset =
        urlParams.get('preset') || localStorage.getItem('ray_builder_selected_preset');

      const applyPreset = (site: Website): Website => {
        if (!savedPreset) return normalizeWebsite(site);
        try {
          const mergedTokens = getMergedThemeTokens(savedPreset);
          return normalizeWebsite({ ...site, theme: mergedTokens as any });
        } catch {
          return normalizeWebsite(site);
        }
      };

      if (chosenTemplate) {
        if (allActivityWebsites[chosenTemplate]) {
          const site = applyPreset(allActivityWebsites[chosenTemplate]);
          return {
            website: site,
            templateId: chosenTemplate,
            pageId: site.pages[0]?.id || 'page_home',
          };
        }
        if (sampleWebsites[chosenTemplate]) {
          const site = applyPreset(sampleWebsites[chosenTemplate]);
          return {
            website: site,
            templateId: chosenTemplate,
            pageId: site.pages[0]?.id || 'page_home',
          };
        }
      }

      const lastActiveSiteStr = localStorage.getItem('ray_builder_last_active_site');
      if (lastActiveSiteStr) {
        const parsed = JSON.parse(lastActiveSiteStr);
        if (parsed?.components && parsed?.pages?.length) {
          const site = normalizeWebsite(parsed);
          return {
            website: site,
            templateId: site.id || 'custom',
            pageId: site.pages[0]?.id || 'page_home',
          };
        }
      }
    } catch {}
  }

  // Neutral blank canvas — never show a hardcoded template for unknown shops
  return {
    website: normalizeWebsite(BLANK_WEBSITE),
    templateId: 'blank',
    pageId: 'page_home',
  };
};
