import type { ComponentNode, Website } from './types';

export interface TreeParentConflict {
  pageId: string;
  nodeId: string;
  parentIds: string[];
}

export interface TreeCycle {
  pageId: string;
  nodeIds: string[];
}

export interface ProductSectionConflict {
  pageId: string;
  nodeIds: string[];
}

export interface InvalidProductParent {
  pageId: string;
  nodeId: string;
  parentId: string;
  parentType: string;
}

export interface InvalidResponsiveValue {
  pageIds: string[];
  nodeId: string;
  viewport: string;
  property: string;
}

export interface UnreachableTreeNode {
  pageId: string;
  nodeId: string;
}

/** A safe-to-log diagnostic summary; it contains identifiers and structure only. */
export interface WebsiteTreeReport {
  rootNodesCount: number;
  missingRootNodeIds: Array<{ pageId: string; rootNodeId?: string }>;
  unreachableNodeIds: UnreachableTreeNode[];
  duplicateChildren: Array<{ pageId: string; parentId: string; childId: string }>;
  multipleParents: TreeParentConflict[];
  cycles: TreeCycle[];
  duplicateProductSections: ProductSectionConflict[];
  invalidProductParents: InvalidProductParent[];
  missingMobileStyles: Array<{ pageIds: string[]; nodeId: string }>;
  invalidResponsiveValues: InvalidResponsiveValue[];
}

const EMPTY_REPORT = (): WebsiteTreeReport => ({
  rootNodesCount: 0,
  missingRootNodeIds: [],
  unreachableNodeIds: [],
  duplicateChildren: [],
  multipleParents: [],
  cycles: [],
  duplicateProductSections: [],
  invalidProductParents: [],
  missingMobileStyles: [],
  invalidResponsiveValues: [],
});

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function sanitizeStyles(value: unknown): ComponentNode['styles'] {
  if (!isRecord(value)) return {} as ComponentNode['styles'];
  const result: Record<string, Record<string, string | number>> = {};
  for (const viewport of ['desktop', 'tablet', 'mobile']) {
    const styles = value[viewport];
    if (!isRecord(styles)) continue;
    const safeStyles: Record<string, string | number> = {};
    for (const [property, styleValue] of Object.entries(styles)) {
      if (typeof styleValue === 'string') safeStyles[property] = styleValue;
      else if (
        (property === 'opacity' || property === 'zIndex' || property === 'flexShrink') &&
        typeof styleValue === 'number' &&
        Number.isFinite(styleValue)
      ) {
        safeStyles[property] = styleValue;
      }
    }
    result[viewport] = safeStyles;
  }
  return result as unknown as ComponentNode['styles'];
}

/**
 * Products are content sections, never overlays or implicit catalog fallbacks.
 * They may live on a page root or inside a layout-only container.
 */
export function isAllowedProductsParent(parent: ComponentNode, pageRootId: string): boolean {
  if (parent.id === pageRootId && parent.type === 'container') return true;
  return (
    (parent.type === 'container' || parent.type === 'grid' || parent.type === 'flex') &&
    parent.category === 'layout'
  );
}

/**
 * Inspect the stored graph without mutating it. `childrenIds` is treated as the
 * structural source of truth; parent links are checked against those edges.
 */
export function inspectWebsiteTree(input: unknown): WebsiteTreeReport {
  const report = EMPTY_REPORT();
  if (!isRecord(input)) return report;

  const rawComponents = isRecord(input.components) ? input.components : {};
  const components: Record<string, any> = {};
  for (const [id, value] of Object.entries(rawComponents)) {
    if (isRecord(value)) components[id] = value;
  }
  const pages: any[] = Array.isArray(input.pages) ? input.pages : [];
  const parentEdges = new Map<string, Set<string>>();
  const reachable = new Set<string>();
  const pageIdsByNode = new Map<string, Set<string>>();

  report.rootNodesCount = Object.values(components).filter((node) => node.parentId == null).length;

  for (const page of pages) {
    const pageId = typeof page?.id === 'string' ? page.id : '(unknown-page)';
    const rootNodeId = typeof page?.rootNodeId === 'string' ? page.rootNodeId : undefined;
    if (!rootNodeId || !components[rootNodeId]) {
      report.missingRootNodeIds.push({ pageId, rootNodeId });
      continue;
    }
    const reachedHere = new Set<string>();
    const productSections: string[] = [];
    const visit = (nodeId: string, path: string[]) => {
      const node = components[nodeId];
      if (!node || reachedHere.has(nodeId)) return;
      reachedHere.add(nodeId);
      reachable.add(nodeId);
      const pageIds = pageIdsByNode.get(nodeId) || new Set<string>();
      pageIds.add(pageId);
      pageIdsByNode.set(nodeId, pageIds);
      if (node.type === 'products') productSections.push(nodeId);

      const childIds = Array.isArray(node.childrenIds) ? node.childrenIds : [];
      const childSeen = new Set<string>();
      for (const childId of childIds) {
        if (typeof childId !== 'string') continue;
        if (childSeen.has(childId)) {
          report.duplicateChildren.push({ pageId, parentId: nodeId, childId });
          continue;
        }
        childSeen.add(childId);
        if (!components[childId]) continue;

        const parents = parentEdges.get(childId) || new Set<string>();
        parents.add(nodeId);
        parentEdges.set(childId, parents);

        if (components[childId].type === 'products') {
          const rootForPage = rootNodeId;
          const parent = components[nodeId] as ComponentNode;
          if (!isAllowedProductsParent(parent, rootForPage)) {
            report.invalidProductParents.push({
              pageId,
              nodeId: childId,
              parentId: nodeId,
              parentType: String(parent.type || 'unknown'),
            });
          }
        }

        if (path.includes(childId)) {
          const cycleStart = path.indexOf(childId);
          const cycleIds = [...path.slice(cycleStart), childId];
          const signature = [...new Set(cycleIds)].sort().join('|');
          if (!cycleSignatures.has(signature)) {
            cycleSignatures.add(signature);
            report.cycles.push({ pageId, nodeIds: cycleIds });
          }
          continue;
        }
        visit(childId, [...path, childId]);
      }
    };

    const cycleSignatures = new Set<string>();
    visit(rootNodeId, [rootNodeId]);
    if (productSections.length > 1) {
      report.duplicateProductSections.push({ pageId, nodeIds: productSections });
    }
  }

  for (const [nodeId, node] of Object.entries(components)) {
    const pageIds = [...(pageIdsByNode.get(nodeId) || [])];
    if (!reachable.has(nodeId)) report.unreachableNodeIds.push({ pageId: '(unreachable)', nodeId });
    const parents = [...(parentEdges.get(nodeId) || [])];
    if (parents.length > 1) {
      report.multipleParents.push({ pageId: pageIds[0] || '(multiple-pages)', nodeId, parentIds: parents });
    }

    const styles = isRecord(node.styles) ? node.styles : {};
    if (
      isRecord(styles.desktop) &&
      Object.keys(styles.desktop).length > 0 &&
      !isRecord(styles.mobile)
    ) {
      report.missingMobileStyles.push({ pageIds: pageIds.length ? pageIds : ['(unreachable)'], nodeId });
    }
    for (const viewport of ['desktop', 'tablet', 'mobile']) {
      const viewportStyles = styles[viewport];
      if (!isRecord(viewportStyles)) continue;
      for (const [property, value] of Object.entries(viewportStyles)) {
        const numericAllowed = property === 'opacity' || property === 'zIndex' || property === 'flexShrink';
        const valid =
          typeof value === 'string' ||
          (numericAllowed && typeof value === 'number' && Number.isFinite(value));
        if (!valid) {
          report.invalidResponsiveValues.push({
            pageIds: pageIds.length ? pageIds : ['(unreachable)'],
            nodeId,
            viewport,
            property,
          });
        }
      }
    }
  }

  report.unreachableNodeIds.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  report.duplicateChildren = dedupeRecords(
    report.duplicateChildren,
    (x) => `${x.pageId}:${x.parentId}:${x.childId}`
  );
  report.invalidProductParents = dedupeRecords(
    report.invalidProductParents,
    (x) => `${x.pageId}:${x.nodeId}:${x.parentId}`
  );
  report.cycles = dedupeRecords(report.cycles, (x) => `${x.pageId}:${[...x.nodeIds].sort().join('|')}`);
  report.duplicateProductSections = report.duplicateProductSections.filter(
    (x) => x.nodeIds.length > 1
  );
  report.missingRootNodeIds = dedupeRecords(report.missingRootNodeIds, (x) => `${x.pageId}:${x.rootNodeId || ''}`);
  report.missingMobileStyles = dedupeRecords(
    report.missingMobileStyles,
    (x) => `${x.pageIds.join(',')}:${x.nodeId}`
  );
  report.invalidResponsiveValues = dedupeRecords(
    report.invalidResponsiveValues,
    (x) => `${x.pageIds.join(',')}:${x.nodeId}:${x.viewport}:${x.property}`
  );
  return report;
}

function dedupeRecords<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

/**
 * Return a copy of the website whose trees are safe to render. The existing
 * component map is retained so merchant data is not deleted; malformed and
 * unreachable nodes are detached (parent=null, children=[]). Only first valid
 * occurrence of a node is kept, ordered by page order and child order.
 */
export function normalizeWebsiteTree<T extends Website>(website: T): T {
  if (!isRecord(website) || !isRecord(website.components)) return website;

  const original = website.components as Record<string, any>;
  const components: Record<string, ComponentNode> = {};
  const originalChildren = new Map<string, string[]>();

  for (const [key, rawNode] of Object.entries(original)) {
    if (!isRecord(rawNode)) continue;
    components[key] = {
      ...(rawNode as ComponentNode),
      id: key,
      parentId: null,
      childrenIds: [],
      props: isRecord(rawNode.props) ? rawNode.props : {},
      styles: sanitizeStyles(rawNode.styles),
    };
    originalChildren.set(
      key,
      Array.isArray(rawNode.childrenIds)
        ? rawNode.childrenIds.filter((childId: unknown): childId is string => typeof childId === 'string')
        : []
    );
  }

  const pages = Array.isArray(website.pages) ? website.pages : [];
  const pageRootIds = new Set(
    pages.map((page) => page?.rootNodeId).filter((id): id is string => typeof id === 'string')
  );
  const claimed = new Set<string>();
  const visitedRoots = new Set<string>();

  const normalizeChildren = (
    parentId: string,
    pageRootId: string,
    trail: Set<string>,
    productSectionSeen: { value: boolean }
  ): string[] => {
    const parent = components[parentId];
    if (!parent) return [];
    const result: string[] = [];
    const localSeen = new Set<string>();

    for (const childId of originalChildren.get(parentId) || []) {
      const child = components[childId];
      if (!child || localSeen.has(childId) || childId === parentId || trail.has(childId)) continue;
      localSeen.add(childId);
      // A page root cannot also be nested in another page's component tree.
      if (pageRootIds.has(childId)) continue;
      // The first page/parent path claims a component. Later references are isolated.
      if (claimed.has(childId)) continue;
      if (child.type === 'products') {
        if (!isAllowedProductsParent(parent, pageRootId) || productSectionSeen.value) continue;
        productSectionSeen.value = true;
      }

      claimed.add(childId);
      child.parentId = parentId;
      const nextTrail = new Set(trail);
      nextTrail.add(childId);
      child.childrenIds = normalizeChildren(childId, pageRootId, nextTrail, productSectionSeen);
      result.push(childId);
    }
    return result;
  };

  for (const page of pages) {
    const rootId = page?.rootNodeId;
    if (typeof rootId !== 'string' || !components[rootId] || visitedRoots.has(rootId)) continue;
    visitedRoots.add(rootId);
    claimed.add(rootId);
    const root = components[rootId];
    root.parentId = null;
    const productSectionSeen = { value: false };
    root.childrenIds = normalizeChildren(rootId, rootId, new Set([rootId]), productSectionSeen);
  }

  // Keep detached node records for merchant recovery, but never let unreachable
  // edges, stale parents, or cycles leak into a renderer traversal.
  for (const [id, node] of Object.entries(components)) {
    if (!claimed.has(id)) {
      node.parentId = null;
      node.childrenIds = [];
    }
  }

  return { ...website, components };
}
