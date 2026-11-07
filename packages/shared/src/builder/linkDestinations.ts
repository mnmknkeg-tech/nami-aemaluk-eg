import type { BuilderPage, ComponentNode, Website, WebsiteLinkDestination } from './types';

const LEGACY_URL_FIELDS = ['url', 'href', 'link', 'linkUrl', 'targetUrl'] as const;
const LEGACY_PAGE_FIELDS = ['pageId', 'targetPage', 'targetPageId'] as const;

const normalizeReference = (value: string): string => {
  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep malformed legacy references available for exact matching.
  }
  return decoded
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^[#/\s]+|[#/\s]+$/g, '')
    .toLocaleLowerCase();
};

const isExternalUrl = (value: string): boolean => /^(?:https?:|mailto:|tel:|\/\/)/i.test(value);

const isWhatsAppUrl = (value: string): boolean => /(?:wa\.me|whatsapp)/i.test(value);

const componentSectionsForPage = (website: Website, page: BuilderPage): ComponentNode[] => {
  const found: ComponentNode[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = website.components[id];
    if (!node) return;
    found.push(node);
    node.childrenIds?.forEach(visit);
  };
  visit(page.rootNodeId);
  return found;
};

const findPage = (pages: BuilderPage[], reference: string): BuilderPage | undefined => {
  const normalized = normalizeReference(reference);
  return pages.find(
    (page) =>
      normalizeReference(page.id) === normalized ||
      normalizeReference(page.slug) === normalized ||
      normalizeReference(page.metadata?.slug || '') === normalized
  );
};

const findSection = (
  website: Website,
  page: BuilderPage,
  reference: string
): ComponentNode | undefined => {
  const normalized = normalizeReference(reference);
  return componentSectionsForPage(website, page).find((node) =>
    [
      node.id,
      node.name,
      node.props?.anchor,
      node.props?.sectionId,
      node.props?.id,
      node.props?.slug,
    ].some((value) => typeof value === 'string' && normalizeReference(value) === normalized)
  );
};

const pageText = (page: BuilderPage): string =>
  `${page.id} ${page.name} ${page.slug} ${page.metadata?.title || ''}`.toLocaleLowerCase();

const sectionText = (node: ComponentNode): string =>
  `${node.id} ${node.name} ${node.type} ${node.props?.title || ''} ${node.props?.label || ''}`.toLocaleLowerCase();

const matchPageIntent = (pages: BuilderPage[], pattern: RegExp): BuilderPage | undefined => {
  const matches = pages.filter((page) => pattern.test(pageText(page)));
  return (
    matches.find(
      (page) =>
        !page.metadata?.isHomePage &&
        page.slug !== 'home' &&
        !page.id.toLocaleLowerCase().includes('home')
    ) || matches[0]
  );
};

const matchSectionIntent = (
  website: Website,
  page: BuilderPage,
  pattern: RegExp
): ComponentNode | undefined =>
  componentSectionsForPage(website, page).find(
    (node) => node.id !== page.rootNodeId && pattern.test(sectionText(node))
  );

const inferDestinationFromLabel = (
  website: Website,
  label: string
): WebsiteLinkDestination | undefined => {
  const text = label.trim().toLocaleLowerCase();
  if (!text) return undefined;
  const exactPage = website.pages.find(
    (page) =>
      page.name.trim().toLocaleLowerCase() === text ||
      page.metadata?.headerTitle?.trim().toLocaleLowerCase() === text
  );
  if (exactPage) return { type: 'page', pageId: exactPage.id };

  const intents: Array<{
    pattern: RegExp;
    pagePattern: RegExp;
    sectionPattern: RegExp;
    type: 'booking' | 'page';
  }> = [
    {
      pattern: /حجز|احجز|موعد|reservation|booking|appointment|book/,
      pagePattern: /booking|reserv|appointment|contact|حجز|موعد|تواصل/,
      sectionPattern: /booking|reserv|appointment|حجز|موعد|احجز/,
      type: 'booking',
    },
    {
      pattern:
        /منيو|قائمة الطعام|الأطعمة|الوجبات|menu|food|meal|products?|catalog|services?|الخدمات|المنتجات|الكتالوج|الأسعار|الأسطول|المعرض/,
      pagePattern:
        /menu|food|product|catalog|service|fleet|items|خدمات|منتجات|منيو|طعام|أسعار|أسطول|معرض/,
      sectionPattern:
        /menu|food|product|catalog|service|fleet|item|منيو|وجبة|طعام|منتج|خدمة|أسعار|أسطول/,
      type: 'page',
    },
    {
      pattern: /تواصل|اتصل|فروع|contact|reach us|branches/,
      pagePattern: /contact|branch|تواصل|اتصل|فرع/,
      sectionPattern: /contact|branch|form|تواصل|اتصل|فرع/,
      type: 'page',
    },
    {
      pattern: /من نحن|قصتنا|عن الشركة|about|our story/,
      pagePattern: /about|story|من نحن|قصتنا/,
      sectionPattern: /about|story|من نحن|قصتنا/,
      type: 'page',
    },
    {
      pattern: /الرئيسية|الرئيسيه|home/,
      pagePattern: /home|الرئيسية|الرئيسيه/,
      sectionPattern: /hero|home|الرئيسية/,
      type: 'page',
    },
  ];

  for (const intent of intents) {
    if (!intent.pattern.test(text)) continue;
    const page = matchPageIntent(website.pages, intent.pagePattern);
    if (intent.type === 'booking') {
      const sectionPage =
        (page && matchSectionIntent(website, page, intent.sectionPattern) ? page : undefined) ||
        website.pages.find((candidate) =>
          matchSectionIntent(website, candidate, intent.sectionPattern)
        );
      if (sectionPage) {
        const bookingSection = matchSectionIntent(website, sectionPage, intent.sectionPattern);
        return {
          type: 'booking',
          pageId: sectionPage.id,
          ...(bookingSection ? { sectionId: bookingSection.id } : {}),
        };
      }
      if (page) return { type: 'booking', pageId: page.id };
    }
    if (page) return { type: 'page', pageId: page.id };

    const sectionPage =
      website.pages.find((candidate) =>
        matchSectionIntent(website, candidate, intent.sectionPattern)
      ) || page;
    if (sectionPage) {
      const section = matchSectionIntent(website, sectionPage, intent.sectionPattern);
      if (section) {
        return intent.type === 'booking'
          ? { type: 'booking', pageId: sectionPage.id, sectionId: section.id }
          : { type: 'section', pageId: sectionPage.id, sectionId: section.id };
      }
      return intent.type === 'booking'
        ? { type: 'booking', pageId: sectionPage.id }
        : { type: 'page', pageId: sectionPage.id };
    }
  }

  if (/اطلب|اشتر|شراء|أضف للسلة|اطلب الآن|order|buy now|checkout|cart/.test(text)) {
    return { type: 'order' };
  }
  return undefined;
};

const legacyDestination = (
  website: Website,
  source: Record<string, any>,
  label: string,
  inferFromLabel = true
): WebsiteLinkDestination | undefined => {
  const existing = source.destination as WebsiteLinkDestination | undefined;
  if (existing?.type) return existing;

  for (const field of LEGACY_PAGE_FIELDS) {
    const value = source[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const page = findPage(website.pages, value);
    if (page) return { type: 'page', pageId: page.id };
    return undefined;
  }

  const url = LEGACY_URL_FIELDS.map((field) => source[field])
    .find((value) => typeof value === 'string' && value.trim())
    ?.trim();
  if (url) {
    if (isWhatsAppUrl(url)) return { type: 'whatsapp', url };
    if (isExternalUrl(url)) return { type: 'external', url };

    const reference = normalizeReference(url);
    const page = findPage(website.pages, reference);
    if (page) return { type: 'page', pageId: page.id };

    if (url.startsWith('#')) {
      for (const candidate of website.pages) {
        const section = findSection(website, candidate, reference);
        if (section) return { type: 'section', pageId: candidate.id, sectionId: section.id };
      }
      return inferFromLabel ? inferDestinationFromLabel(website, label) : undefined;
    }
    return undefined;
  }
  return inferFromLabel ? inferDestinationFromLabel(website, label) : undefined;
};

export const resolveWebsiteLinkDestination = (
  website: Website,
  source: Record<string, any>
): WebsiteLinkDestination | undefined => legacyDestination(website, source, '', false);

const validDestination = (
  website: Website,
  destination: WebsiteLinkDestination | undefined
): boolean => {
  if (!destination) return true;
  if (destination.type === 'none') return true;
  if (destination.type === 'external' || destination.type === 'whatsapp') {
    return Boolean(destination.url.trim());
  }
  if (destination.type === 'order') {
    return (
      (!destination.pageId || website.pages.some((page) => page.id === destination.pageId)) &&
      (!destination.sectionId ||
        (Boolean(destination.pageId) &&
          Boolean(
            website.pages.find((page) => page.id === destination.pageId)?.rootNodeId &&
            findSection(
              website,
              website.pages.find((page) => page.id === destination.pageId)!,
              destination.sectionId
            )
          )))
    );
  }
  const page = website.pages.find((candidate) => candidate.id === destination.pageId);
  if (!page) return false;
  if (destination.type === 'page' || (destination.type === 'booking' && !destination.sectionId)) {
    return true;
  }
  return Boolean(destination.sectionId && findSection(website, page, destination.sectionId));
};

const labelOf = (source: Record<string, any>): string =>
  String(source.text || source.label || source.title || source.name || '');

export const adaptTemplateLinkDestinations = (website: Website): Website => {
  const components: Website['components'] = { ...website.components };
  let changed = false;

  for (const [id, node] of Object.entries(components)) {
    const props = node.props || {};
    const destination = legacyDestination(
      website,
      { ...props, destination: node.destination || props.destination },
      labelOf(props)
    );
    let nextProps = props;

    if (Array.isArray(props.dropdownItems)) {
      const dropdownItems = props.dropdownItems.map((item: Record<string, any>) => {
        const resolved = legacyDestination(website, item, labelOf(item));
        if (!resolved || item.destination?.type) return item;
        changed = true;
        return { ...item, destination: resolved };
      });
      if (
        dropdownItems.some((item: unknown, index: number) => item !== props.dropdownItems[index])
      ) {
        nextProps = { ...nextProps, dropdownItems };
      }
    }

    if (
      typeof props.text === 'string' &&
      props.text.includes('•') &&
      !Array.isArray(props.navigationItems)
    ) {
      const navigationItems = props.text
        .split('•')
        .map((label: string) => label.trim())
        .filter(Boolean)
        .map((label: string) => ({
          label,
          destination: inferDestinationFromLabel(website, label),
        }));
      if (
        navigationItems.some((item: { destination?: WebsiteLinkDestination }) => item.destination)
      ) {
        nextProps = { ...nextProps, navigationItems };
        changed = true;
      }
    }

    if (Array.isArray(props.links)) {
      const links = props.links.map((item: unknown) => {
        if (typeof item === 'string') {
          const resolved = inferDestinationFromLabel(website, item);
          if (!resolved) return item;
          changed = true;
          return { label: item, destination: resolved };
        }
        if (item && typeof item === 'object') {
          const link = item as Record<string, any>;
          const resolved = legacyDestination(website, link, labelOf(link));
          if (!resolved || link.destination?.type) return item;
          changed = true;
          return { ...link, destination: resolved };
        }
        return item;
      });
      if (links.some((item: unknown, index: number) => item !== props.links[index])) {
        nextProps = { ...nextProps, links };
      }
    }

    if (destination && !node.destination?.type) {
      components[id] = { ...node, destination, props: nextProps };
      changed = true;
    } else if (nextProps !== props) {
      components[id] = { ...node, props: nextProps };
    }
  }

  return changed ? { ...website, components } : website;
};

export const getPageDestinationReferenceCount = (website: Website, pageId: string): number => {
  let count = 0;
  const page = website.pages.find((candidate) => candidate.id === pageId);
  if (!page) return count;
  const paths = new Set([page.id, page.slug, page.metadata?.slug || ''].map(normalizeReference));
  const targetsPage = (destination?: WebsiteLinkDestination) =>
    Boolean(destination && 'pageId' in destination && destination.pageId === pageId);
  const targetsLegacyPath = (source: Record<string, any>) =>
    LEGACY_PAGE_FIELDS.some((field) => source[field] === pageId) ||
    LEGACY_URL_FIELDS.some((field) => {
      const value = source[field];
      return typeof value === 'string' && paths.has(normalizeReference(value));
    });

  for (const node of Object.values(website.components)) {
    if (
      targetsPage(node.destination) ||
      targetsPage(node.props?.destination) ||
      targetsLegacyPath(node.props || {})
    ) {
      count += 1;
    }
    for (const item of node.props?.dropdownItems || []) {
      if (targetsPage(item.destination) || targetsLegacyPath(item)) count += 1;
    }
    for (const item of node.props?.links || []) {
      if (
        item &&
        typeof item === 'object' &&
        (targetsPage(item.destination) || targetsLegacyPath(item))
      ) {
        count += 1;
      }
    }
    for (const item of node.props?.navigationItems || []) {
      if (targetsPage(item.destination)) count += 1;
    }
  }
  return count;
};

export const removePageDestinationReferences = (
  website: Website,
  pageId: string
): Website['components'] => {
  const page = website.pages.find((candidate) => candidate.id === pageId);
  if (!page) return website.components;
  const removedPaths = new Set(
    [page.id, page.slug, page.metadata?.slug]
      .filter((reference): reference is string => Boolean(reference?.trim()))
      .map(normalizeReference)
  );
  if (page.slug === '') removedPaths.add(normalizeReference('/'));
  const isRemovedDestination = (destination?: WebsiteLinkDestination) =>
    Boolean(destination && 'pageId' in destination && destination.pageId === pageId);
  const matchesRemovedPage = (source: Record<string, any>) =>
    LEGACY_PAGE_FIELDS.some((field) => source[field] === pageId) ||
    LEGACY_URL_FIELDS.some((field) => {
      const value = source[field];
      return typeof value === 'string' && removedPaths.has(normalizeReference(value));
    });
  const components = { ...website.components };

  for (const [id, node] of Object.entries(components)) {
    let props = node.props || {};
    let propsChanged = false;
    const clearTarget = (source: Record<string, any>) => {
      const next = { ...source };
      let changed = false;
      LEGACY_PAGE_FIELDS.forEach((field) => {
        if (next[field] === pageId) {
          delete next[field];
          changed = true;
        }
      });
      LEGACY_URL_FIELDS.forEach((field) => {
        if (typeof next[field] === 'string' && removedPaths.has(normalizeReference(next[field]))) {
          delete next[field];
          changed = true;
        }
      });
      if (isRemovedDestination(next.destination)) {
        delete next.destination;
        changed = true;
      }
      return changed ? next : source;
    };

    const removeNodeDestination = isRemovedDestination(node.destination);
    if (matchesRemovedPage(props) || isRemovedDestination(props.destination)) {
      props = clearTarget(props);
      propsChanged = true;
    }
    if (Array.isArray(props.dropdownItems)) {
      const dropdownItems = props.dropdownItems.filter((item: Record<string, any>) => {
        const remove = matchesRemovedPage(item) || isRemovedDestination(item.destination);
        if (remove) propsChanged = true;
        return !remove;
      });
      props = { ...props, dropdownItems };
    }
    if (Array.isArray(props.links)) {
      const links = props.links.map((item: unknown) => {
        if (
          !item ||
          typeof item !== 'object' ||
          (!matchesRemovedPage(item as Record<string, any>) &&
            !isRemovedDestination((item as Record<string, any>).destination))
        ) {
          return item;
        }
        propsChanged = true;
        return clearTarget(item as Record<string, any>);
      });
      props = { ...props, links };
    }
    if (Array.isArray(props.navigationItems)) {
      const navigationItems = props.navigationItems.filter((item: Record<string, any>) => {
        const remove = isRemovedDestination(item.destination) || matchesRemovedPage(item);
        if (remove) propsChanged = true;
        return !remove;
      });
      props = { ...props, navigationItems };
    }

    if (propsChanged || removeNodeDestination) {
      const { destination, ...nodeWithoutDestination } = node;
      components[id] = {
        ...nodeWithoutDestination,
        ...(!removeNodeDestination && destination ? { destination } : {}),
        props,
      };
    }
  }
  return components;
};

export const syncPageSlugInDestinations = (
  website: Website,
  pageId: string,
  oldSlug: string,
  newSlug: string
): Website['components'] => {
  const oldPath = normalizeReference(oldSlug);
  const components = { ...website.components };
  const updateLegacyPath = (source: Record<string, any>) => {
    let changed = false;
    const next = { ...source };
    LEGACY_URL_FIELDS.forEach((field) => {
      const value = next[field];
      if (typeof value !== 'string') return;
      const normalized = normalizeReference(value);
      if (normalized !== oldPath) return;
      next[field] = value.startsWith('#') ? `#${newSlug}` : `/${newSlug}`;
      changed = true;
    });
    return changed ? next : source;
  };

  for (const [id, node] of Object.entries(components)) {
    let props = updateLegacyPath(node.props || {});
    if (Array.isArray(props.dropdownItems)) {
      const dropdownItems = props.dropdownItems.map((item: Record<string, any>) =>
        updateLegacyPath(item)
      );
      if (
        dropdownItems.some((item: unknown, index: number) => item !== props.dropdownItems[index])
      ) {
        props = { ...props, dropdownItems };
      }
    }
    if (Array.isArray(props.links)) {
      const links = props.links.map((item: unknown) =>
        item && typeof item === 'object' ? updateLegacyPath(item as Record<string, any>) : item
      );
      if (links.some((item: unknown, index: number) => item !== props.links[index])) {
        props = { ...props, links };
      }
    }
    if (props !== node.props) components[id] = { ...node, props };
  }
  return components;
};

export const getInvalidPageDestinations = (website: Website): string[] => {
  const invalid: string[] = [];
  const check = (name: string, destination?: WebsiteLinkDestination) => {
    if (destination && !validDestination(website, destination)) invalid.push(name);
  };
  Object.values(website.components).forEach((node) => {
    check(node.name || node.id, node.destination || node.props?.destination);
    node.props?.dropdownItems?.forEach((item: Record<string, any>) =>
      check(item.title || item.id, item.destination)
    );
    node.props?.links?.forEach((item: unknown, index: number) => {
      if (item && typeof item === 'object') {
        const link = item as Record<string, any>;
        check(String(link.label || link.title || index), link.destination);
      }
    });
    node.props?.navigationItems?.forEach((item: Record<string, any>) =>
      check(String(item.label || node.id), item.destination)
    );
  });
  return invalid;
};
