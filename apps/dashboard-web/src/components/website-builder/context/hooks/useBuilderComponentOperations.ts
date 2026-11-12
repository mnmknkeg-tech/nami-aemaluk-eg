import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ComponentNode,
  CustomCodeScope,
  Page,
  StyleProperties,
  ViewportBreakpoint,
  Website,
} from '../../types/builder';
import { isAllowedProductsParent } from '@ray-eg/shared/builder';
import { loadSectionTemplate } from '../../data/registry';
import { createTemplateMobileStyles, createUniqueBuilderId } from '../builderUtils';

export type WebsiteReducer = (website: Website) => Website;
export type RecordWebsiteHistory = (actionDesc: string, website: Website | WebsiteReducer) => void;

export interface UseBuilderComponentOperationsProps {
  website: Website;
  websiteRef: { current: Website };
  activePage: Page;
  viewport: ViewportBreakpoint;
  recordHistory: RecordWebsiteHistory;
  setIsMobileInspectorOpen: (open: boolean) => void;
  setTemplateError: (message: string | null) => void;
  initialSelectedNodeId?: string | null;
}

/** Pure reducers are exported so sequential UI changes can be regression-tested. */
export const updateNodePropsReducer =
  (id: string, newProps: Record<string, any>): WebsiteReducer =>
  (website) => {
    const target = website.components[id];
    if (!target) return website;
    return {
      ...website,
      components: {
        ...website.components,
        [id]: { ...target, props: { ...target.props, ...newProps } },
      },
    };
  };

export const updateNodeStyleReducer =
  (id: string, stylePatch: Partial<StyleProperties>, bp: ViewportBreakpoint): WebsiteReducer =>
  (website) => {
    const target = website.components[id];
    if (!target) return website;
    const styles = { ...target.styles };
    styles[bp] = { ...(styles[bp] || {}), ...stylePatch };
    return {
      ...website,
      components: { ...website.components, [id]: { ...target, styles } },
    };
  };

/**
 * When a node is dragged from one parent to another (e.g. Grid → Hero),
 * positional styles authored in the old context — `position: absolute`,
 * `top/right/bottom/left`, `zIndex`, percentage `width` — would otherwise
 * persist and render the node visually misplaced in the new parent.
 *
 * This normalizer is called after `parentId`/`childrenIds` are updated but
 * before the new node is committed. It:
 *   • clears absolute/fixed positioning and offsets
 *   • clears zIndex (keeps it only for elements that legitimately stack)
 *   • clears percentage-based width (Grid columns use %, but a Hero child
 *     should size from its own content/flex)
 *   • leaves non-positional styles (colors, typography, padding) untouched
 *
 * Header/footer are excluded because their transparent-overlay logic is
 * handled centrally in `responsiveStyles.ts` and depends on `position`.
 */
const POSITIONAL_STYLE_KEYS = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'inset',
  'insetInlineStart',
  'insetInlineEnd',
] as const;

function normalizeNodeStylesAfterMove(node: ComponentNode): ComponentNode {
  const styles = { ...node.styles };
  for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
    const block = styles[bp];
    if (!block) continue;
    const cleaned: Record<string, any> = { ...block };
    for (const key of POSITIONAL_STYLE_KEYS) {
      if (key in cleaned) delete cleaned[key];
    }
    // Drop percentage widths authored for a grid column context.
    if (typeof cleaned.width === 'string' && cleaned.width.endsWith('%')) {
      delete cleaned.width;
    }
    // `display: absolute`-style leftovers shouldn't survive a move either.
    if (cleaned.display === 'absolute' || cleaned.display === 'fixed') {
      delete cleaned.display;
    }
    styles[bp] = cleaned;
  }
  return { ...node, styles };
}

const replaceNode = (
  website: Website,
  id: string,
  update: (node: ComponentNode) => ComponentNode
): Website => {
  const target = website.components[id];
  if (!target) return website;
  return { ...website, components: { ...website.components, [id]: update(target) } };
};

// ── Products-section placement rules ────────────────────────────────────────
// The public renderer normalizes every tree with `normalizeWebsiteTree`, which
// detaches a products section whose parent is not a layout container, and any
// SECOND products section on the same page. If the editor allowed those states
// to be created, the section would look fine in the canvas and then silently
// disappear on the next save/reload/publish — merchants experienced this as
// "sections vanish / order jumps randomly". Every mutating operation therefore
// validates against the SAME rules the normalizer enforces.

/** True when the subtree rooted at `rootId` contains a `products` node. */
const subtreeContainsProducts = (website: Website, rootId: string): boolean => {
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop() as string;
    const node = website.components[id];
    if (!node) continue;
    if (node.type === 'products') return true;
    stack.push(...(node.childrenIds || []));
  }
  return false;
};

/** Count `products` nodes reachable from a page root, skipping one subtree. */
const countPageProducts = (
  website: Website,
  pageRootId: string,
  excludeSubtreeId?: string
): number => {
  let count = 0;
  const stack = [pageRootId];
  while (stack.length) {
    const id = stack.pop() as string;
    if (excludeSubtreeId && id === excludeSubtreeId) continue;
    const node = website.components[id];
    if (!node) continue;
    if (node.type === 'products') count += 1;
    stack.push(...(node.childrenIds || []));
  }
  return count;
};

/**
 * Shared validation for any operation that would place `draggedNode` (with its
 * subtree) under `newParent`. Returns an Arabic error message, or null when the
 * placement is allowed.
 */
export const validateProductsPlacement = (
  website: Website,
  draggedNode: ComponentNode,
  newParent: ComponentNode,
  pageRootId: string
): string | null => {
  const draggedHasProducts =
    draggedNode.type === 'products' || subtreeContainsProducts(website, draggedNode.id);
  if (!draggedHasProducts) return null;

  // The products node's effective parent after the move: the new parent when
  // the dragged node IS the products section, otherwise the dragged container.
  const productsParent = draggedNode.type === 'products' ? newParent : draggedNode;
  if (!isAllowedProductsParent(productsParent as any, pageRootId)) {
    return 'قسم المنتجات مسموح فقط داخل الصفحة الرئيسية أو داخل حاوية تخطيط (Layout) — لا يمكن وضعه داخل هيرو أو كارت أو جاليري.';
  }
  if (countPageProducts(website, pageRootId, draggedNode.id) >= 1) {
    return 'يوجد قسم منتجات بالفعل في هذه الصفحة — يسمح بقسم منتجات واحد فقط لكل صفحة.';
  }
  return null;
};

/**
 * Index at which to insert a top-level child into `parent` so it lands ABOVE
 * the footer instead of after it. Sections added "at the end" of a page root
 * used to drop below the footer — merchants read that as sections jumping
 * to a random place.
 */
export const topLevelInsertIndex = (website: Website, parent: ComponentNode): number => {
  if (parent.type !== 'container') return parent.childrenIds.length;
  const footerIndex = parent.childrenIds.findIndex(
    (childId) => website.components[childId]?.type === 'footer'
  );
  return footerIndex === -1 ? parent.childrenIds.length : footerIndex;
};

export const getPageReachableNodeIds = (website: Website, rootId: string): Set<string> => {
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id) || !website.components[id]) return;
    ids.add(id);
    website.components[id].childrenIds?.forEach(visit);
  };
  visit(rootId);
  return ids;
};

export const resolvePageScopedSelection = (
  website: Website,
  rootId: string,
  selectedId: string | null
): string | null =>
  selectedId && getPageReachableNodeIds(website, rootId).has(selectedId) ? selectedId : null;

export const useBuilderComponentOperations = ({
  website,
  websiteRef,
  activePage,
  viewport,
  recordHistory,
  setIsMobileInspectorOpen,
  setTemplateError,
  initialSelectedNodeId = 'comp_hero',
}: UseBuilderComponentOperationsProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedNodeId);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const activePageNodeIds = useMemo(
    () => getPageReachableNodeIds(website, activePage.rootNodeId),
    [activePage.rootNodeId, website]
  );
  const resolvedSelectedNodeId = resolvePageScopedSelection(
    website,
    activePage.rootNodeId,
    selectedNodeId
  );

  const selectedNode = useMemo(
    () => (resolvedSelectedNodeId ? website.components[resolvedSelectedNodeId] || null : null),
    [website.components, resolvedSelectedNodeId]
  );
  const selectionBreadcrumbs = useMemo(() => {
    if (!resolvedSelectedNodeId) return [];
    const crumbs: ComponentNode[] = [];
    let curr: ComponentNode | undefined = website.components[resolvedSelectedNodeId];
    const visited = new Set<string>();
    while (curr) {
      if (visited.has(curr.id)) break;
      visited.add(curr.id);
      crumbs.unshift(curr);
      curr = curr.parentId ? website.components[curr.parentId] : undefined;
    }
    return crumbs;
  }, [website.components, resolvedSelectedNodeId]);

  useEffect(() => {
    if (selectedNodeId && !activePageNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(website.components[activePage.rootNodeId] ? activePage.rootNodeId : null);
    }
  }, [activePage.rootNodeId, activePageNodeIds, selectedNodeId, website.components]);

  const selectNode = useCallback(
    (id: string | null) => {
      const validId = id && activePageNodeIds.has(id) ? id : null;
      setSelectedNodeId(validId);
      if (validId) setIsMobileInspectorOpen(true);
    },
    [activePageNodeIds, setIsMobileInspectorOpen]
  );
  const setHoveredNode = useCallback((id: string | null) => setHoveredNodeId(id), []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !selectedNodeId) return;
      setSelectedNodeId(websiteRef.current.components[selectedNodeId]?.parentId ?? null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedNodeId, websiteRef]);

  const updateNodeProps = useCallback(
    (id: string, newProps: Record<string, any>) => {
      const target = websiteRef.current.components[id];
      if (!target) return;
      recordHistory(`تعديل خصائص (${target.name})`, updateNodePropsReducer(id, newProps));
    },
    [recordHistory, websiteRef]
  );

  const updateNodeStyle = useCallback(
    (id: string, stylePatch: Partial<StyleProperties>, bp: ViewportBreakpoint = viewport) => {
      const target = websiteRef.current.components[id];
      if (!target) return;
      recordHistory(
        `تعديل مظهر (${target.name}) - [${bp}]`,
        updateNodeStyleReducer(id, stylePatch, bp)
      );
    },
    [recordHistory, viewport, websiteRef]
  );

  const insertNode = useCallback(
    (node: ComponentNode, parentId: string, index?: number) => {
      const current = websiteRef.current;
      if (!current.components[parentId] || current.components[node.id]) return;
      const parent = current.components[parentId];
      if (node.type === 'products' && parent) {
        const placementError = validateProductsPlacement(
          current,
          node,
          parent,
          activePage.rootNodeId
        );
        if (placementError) {
          setTemplateError(placementError);
          return;
        }
      }
      recordHistory(`إضافة عنصر (${node.name})`, (latest) => {
        const latestParent = latest.components[parentId];
        if (!latestParent) return latest;
        const children = [...latestParent.childrenIds];
        if (typeof index === 'number' && index >= 0 && index <= children.length) {
          children.splice(index, 0, node.id);
        } else children.push(node.id);
        return {
          ...latest,
          components: {
            ...latest.components,
            [parentId]: { ...latestParent, childrenIds: children },
            [node.id]: { ...node, parentId },
          },
        };
      });
      setSelectedNodeId(node.id);
    },
    [activePage.rootNodeId, recordHistory, setTemplateError, websiteRef]
  );

  const insertSectionTemplate = useCallback(
    (templateId: string, targetIndex?: number) => {
      try {
        const tmpl = loadSectionTemplate(templateId).template;
        const rootId = activePage.rootNodeId;
        const current = websiteRef.current;
        if (!current.components[rootId]) {
          throw new Error(
            `Cannot insert section "${templateId}": the active page root is missing.`
          );
        }
        const idMap: Record<string, string> = {};
        const usedIds = new Set(Object.keys(current.components));
        Object.keys(tmpl.nodes).forEach((origId) => {
          idMap[origId] = createUniqueBuilderId(`comp_${tmpl.category}`, usedIds);
        });
        const clonedNodes: Record<string, ComponentNode> = {};
        Object.values(tmpl.nodes).forEach((node) => {
          const newId = idMap[node.id];
          clonedNodes[newId] = {
            ...node,
            id: newId,
            parentId: node.parentId ? idMap[node.parentId] : rootId,
            childrenIds: node.childrenIds.map((childId) => idMap[childId]),
            styles: { ...node.styles, mobile: createTemplateMobileStyles(node) },
          };
        });
        const newRootId = idMap[tmpl.rootNodeId];
        const templateRootType = tmpl.nodes[tmpl.rootNodeId]?.type;
        if (templateRootType === 'products') {
          const existingProducts = countPageProducts(websiteRef.current, rootId);
          if (existingProducts >= 1) {
            setTemplateError(
              'يوجد قسم منتجات بالفعل في هذه الصفحة — يسمح بقسم منتجات واحد فقط لكل صفحة.'
            );
            return false;
          }
        }
        recordHistory(`إدراج نموذج قسم (${tmpl.nameAr})`, (latest) => {
          const root = latest.components[rootId];
          if (!root) return latest;
          const children = [...root.childrenIds];
          if (typeof targetIndex === 'number' && targetIndex >= 0) {
            children.splice(Math.min(targetIndex, children.length), 0, newRootId);
          } else {
            const footerIndex = children.findIndex(
              (id) => latest.components[id]?.type === 'footer'
            );
            children.splice(footerIndex === -1 ? children.length : footerIndex, 0, newRootId);
          }
          return {
            ...latest,
            components: {
              ...latest.components,
              ...clonedNodes,
              [rootId]: { ...root, childrenIds: children },
            },
          };
        });
        setSelectedNodeId(newRootId);
        setTemplateError(null);
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            document
              .getElementById(newRootId)
              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Unable to insert section template "${templateId}".`;
        console.error('[WebsiteBuilder] Section template insertion failed.', {
          templateId,
          error,
        });
        setTemplateError(message);
        return false;
      }
    },
    [activePage.rootNodeId, recordHistory, setTemplateError, websiteRef]
  );

  const deleteNode = useCallback(
    (id: string) => {
      const target = websiteRef.current.components[id];
      if (!target) return;
      // A page without its root cannot render, save or publish — and on reload
      // a fabricated "recovered" root replaces all content. Deleting sections
      // inside the root is the correct way to clear a page.
      if (websiteRef.current.pages.some((page) => page.rootNodeId === id)) {
        setTemplateError(
          'لا يمكن حذف جذر الصفحة نفسه — لحذف محتوى الصفحة احذف الأقسام الموجودة داخله.'
        );
        return;
      }
      const parentId = target.parentId;
      recordHistory(`حذف (${target.name})`, (current) => {
        const node = current.components[id];
        if (!node) return current;
        const remove = new Set<string>();
        const collect = (nodeId: string) => {
          if (remove.has(nodeId)) return;
          remove.add(nodeId);
          current.components[nodeId]?.childrenIds.forEach(collect);
        };
        collect(id);
        const components = { ...current.components };
        remove.forEach((nodeId) => delete components[nodeId]);
        if (!node.parentId) {
          return {
            ...current,
            components,
            pages: current.pages.map((page) =>
              page.rootNodeId === id ? { ...page, rootNodeId: null as unknown as string } : page
            ),
          };
        }
        const parent = current.components[node.parentId];
        if (!parent) return current;
        components[node.parentId] = {
          ...parent,
          childrenIds: parent.childrenIds.filter((childId) => childId !== id),
        };
        return { ...current, components };
      });
      setSelectedNodeId(parentId || null);
    },
    [recordHistory, setTemplateError, websiteRef]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const current = websiteRef.current;
      const target = current.components[id];
      if (!target?.parentId) return;
      // A duplicated products subtree would create a SECOND products section on
      // this page — the public normalizer detaches it silently on next save.
      if (subtreeContainsProducts(current, id)) {
        setTemplateError(
          'يسمح بقسم منتجات واحد فقط لكل صفحة، لذلك لا يمكن تكرار قسم المنتجات.'
        );
        return;
      }
      const idMap: Record<string, string> = {};
      const usedIds = new Set(Object.keys(current.components));
      const visited = new Set<string>();
      const collect = (nodeId: string) => {
        if (visited.has(nodeId) || !current.components[nodeId]) return;
        visited.add(nodeId);
        idMap[nodeId] = createUniqueBuilderId('dup', usedIds);
        current.components[nodeId]?.childrenIds.forEach(collect);
      };
      collect(id);
      const clones: Record<string, ComponentNode> = {};
      Object.keys(idMap).forEach((origId) => {
        const original = current.components[origId];
        if (!original) return;
        clones[idMap[origId]] = {
          ...original,
          id: idMap[origId],
          name: origId === id ? `${original.name} (نسخة)` : original.name,
          parentId: origId === id ? target.parentId : idMap[original.parentId!],
          childrenIds: original.childrenIds.map((childId) => idMap[childId]),
        };
      });
      const newId = idMap[id];
      recordHistory(`تكرار (${target.name})`, (latest) => {
        const node = latest.components[id];
        const parent = node?.parentId ? latest.components[node.parentId] : undefined;
        if (!node || !parent) return latest;
        const children = [...parent.childrenIds];
        const index = children.indexOf(id);
        if (index < 0) return latest;
        children.splice(index + 1, 0, newId);
        return {
          ...latest,
          components: {
            ...latest.components,
            ...clones,
            [parent.id]: { ...parent, childrenIds: children },
          },
        };
      });
      setSelectedNodeId(newId);
    },
    [recordHistory, websiteRef]
  );

  const moveNode = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const target = websiteRef.current.components[id];
      if (!target?.parentId) return;
      recordHistory(
        `تحريك (${target.name}) ${direction === 'up' ? 'للأعلى' : 'للأسفل'}`,
        (current) => {
          const node = current.components[id];
          const parent = node?.parentId ? current.components[node.parentId] : undefined;
          if (!node || !parent) return current;
          const index = parent.childrenIds.indexOf(id);
          const nextIndex = direction === 'up' ? index - 1 : index + 1;
          if (index < 0 || nextIndex < 0 || nextIndex >= parent.childrenIds.length) return current;
          const children = [...parent.childrenIds];
          [children[index], children[nextIndex]] = [children[nextIndex], children[index]];
          return {
            ...current,
            components: {
              ...current.components,
              [parent.id]: { ...parent, childrenIds: children },
            },
          };
        }
      );
    },
    [recordHistory, websiteRef]
  );

  const moveNodePosition = useCallback(
    (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside'): boolean => {
      const current = websiteRef.current;
      if (!draggedId || !targetId || draggedId === targetId) return false;
      const dragged = current.components[draggedId];
      const target = current.components[targetId];
      if (!dragged?.parentId || !target) return false;
      let ancestor = target;
      while (ancestor.parentId) {
        if (ancestor.parentId === draggedId) return false;
        ancestor = current.components[ancestor.parentId];
        if (!ancestor) break;
      }
      const oldParent = current.components[dragged.parentId];
      if (!oldParent) return false;
      let newParentId: string;
      if (position === 'inside') newParentId = targetId;
      else {
        if (!target.parentId || !current.components[target.parentId]) return false;
        newParentId = target.parentId;
      }
      const newParent = current.components[newParentId];
      if (!newParent) return false;
      // Reject moves that would place a products section where the public
      // normalizer would silently detach it (invalid parent or a second
      // products section on the same page).
      const placementError = validateProductsPlacement(
        current,
        dragged,
        newParent,
        activePage.rootNodeId
      );
      if (placementError) {
        setTemplateError(placementError);
        return false;
      }
      const posLabel = position === 'inside' ? 'داخل' : position === 'before' ? 'قبل' : 'بعد';
      recordHistory(`سحب وإفلات (${dragged.name}) إلى ${posLabel} (${target.name})`, (latest) => {
        const node = latest.components[draggedId];
        const targetNode = latest.components[targetId];
        if (!node?.parentId || !targetNode) return latest;
        const previousParent = latest.components[node.parentId];
        const destinationId = position === 'inside' ? targetId : targetNode.parentId;
        const destination = destinationId ? latest.components[destinationId] : undefined;
        if (!previousParent || !destination) return latest;
        const components = { ...latest.components };
        const oldChildren = previousParent.childrenIds.filter((childId) => childId !== draggedId);
        if (previousParent.id !== destination.id) {
          components[previousParent.id] = { ...previousParent, childrenIds: oldChildren };
        }
        const nextChildren = destination.childrenIds.filter((childId) => childId !== draggedId);
        if (position === 'inside') {
          // Insert ABOVE the page footer, never after it — dropping a section
          // "inside the page" used to land below the footer and look random.
          nextChildren.splice(topLevelInsertIndex(latest, destination), 0, draggedId);
        } else {
          const targetIndex = nextChildren.indexOf(targetId);
          if (targetIndex < 0) return latest;
          nextChildren.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, draggedId);
        }
        components[destination.id] = { ...destination, childrenIds: nextChildren };
        // ── Normalize stale layout styles when a node moves between parents ──
        // A card authored as position:absolute / width:50% / zIndex:999 inside
        // a Grid would otherwise keep those styles after being dropped into a
        // Hero or Section, leaving it visually misplaced. We reset positional
        // styles only when the parent actually changes, and only for non-fixed
        // elements (header/footer keep their own transparent-overlay logic in
        // responsiveStyles.ts).
        const parentChanged = previousParent.id !== destination.id;
        const isFixedNode = node.type === 'header' || node.type === 'footer';
        const cleanedNode = parentChanged && !isFixedNode
          ? normalizeNodeStylesAfterMove(node)
          : node;
        components[draggedId] = { ...cleanedNode, parentId: destination.id };
        return { ...latest, components };
      });
      setSelectedNodeId(draggedId);
      return true;
    },
    [activePage.rootNodeId, recordHistory, setTemplateError, websiteRef]
  );

  const reorderChildren = useCallback(
    (parentId: string, newChildrenIds: string[]) => {
      const parent = websiteRef.current.components[parentId];
      if (!parent) return;
      recordHistory(`إعادة ترتيب عناصر (${parent.name})`, (current) =>
        replaceNode(current, parentId, (node) => ({ ...node, childrenIds: [...newChildrenIds] }))
      );
    },
    [recordHistory, websiteRef]
  );

  const toggleNodeVisibility = useCallback(
    (id: string) => {
      const target = websiteRef.current.components[id];
      if (!target) return;
      recordHistory(`تغيير ظهور (${target.name})`, (current) =>
        replaceNode(current, id, (node) => {
          const hidden = !Boolean(node.isHidden || node.props?.hidden);
          return { ...node, isHidden: hidden, props: { ...node.props, hidden } };
        })
      );
    },
    [recordHistory, websiteRef]
  );

  const toggleNodeLock = useCallback(
    (id: string) => {
      const target = websiteRef.current.components[id];
      if (!target) return;
      recordHistory(`تغيير قفل (${target.name})`, (current) =>
        replaceNode(current, id, (node) => ({ ...node, isLocked: !node.isLocked }))
      );
    },
    [recordHistory, websiteRef]
  );

  const renameNode = useCallback(
    (id: string, newName: string) => {
      const target = websiteRef.current.components[id];
      if (!target || !newName.trim()) return;
      recordHistory(`إعادة تسمية (${target.name}) إلى ${newName.trim()}`, (current) =>
        replaceNode(current, id, (node) => ({ ...node, name: newName.trim() }))
      );
    },
    [recordHistory, websiteRef]
  );

  const updateNodeCustomCode = useCallback(
    (nodeId: string, codePatch: Partial<CustomCodeScope>) => {
      const target = websiteRef.current.components[nodeId];
      if (!target) return;
      recordHistory(`تعديل كود (${target.name})`, (current) =>
        replaceNode(current, nodeId, (node) => ({
          ...node,
          customCode: { ...node.customCode, ...codePatch },
        }))
      );
    },
    [recordHistory, websiteRef]
  );

  const updateScopedComponentCode = useCallback(
    (nodeId: string, file: string, code: string) => {
      const target = websiteRef.current.components[nodeId];
      if (!target) return;
      const key =
        file === 'component.tsx'
          ? 'tsxSnippet'
          : file === 'styles.css'
            ? 'cssSnippet'
            : file === 'interactions.ts'
              ? 'jsSnippet'
              : file === 'schema.json'
                ? 'propsSchema'
                : null;
      if (!key) return;
      recordHistory(`تعديل كود مخصص (${file}) لـ (${target.name})`, (current) =>
        replaceNode(current, nodeId, (node) => ({
          ...node,
          customCode: { ...node.customCode, [key]: code },
        }))
      );
    },
    [recordHistory, websiteRef]
  );

  return {
    selectedNodeId: resolvedSelectedNodeId,
    selectedNode,
    selectionBreadcrumbs,
    hoveredNodeId,
    setSelectedNodeId,
    selectNode,
    setHoveredNode,
    updateNodeProps,
    updateNodeStyle,
    insertNode,
    insertSectionTemplate,
    deleteNode,
    duplicateNode,
    moveNode,
    moveNodePosition,
    reorderChildren,
    toggleNodeVisibility,
    toggleNodeLock,
    renameNode,
    updateNodeCustomCode,
    updateScopedComponentCode,
  };
};
