import { useState, useCallback, useMemo } from 'react';
import {
  ComponentNode,
  CustomCodeScope,
  Page,
  StyleProperties,
  ViewportBreakpoint,
  Website,
} from '../../types/builder';
import { sectionTemplates } from '../../data/sectionLibrary';
import { createTemplateMobileStyles } from '../builderUtils';

export interface UseBuilderComponentOperationsProps {
  website: Website;
  activePage: Page;
  viewport: ViewportBreakpoint;
  recordHistory: (actionDesc: string, newWebsite: Website) => void;
  setIsMobileInspectorOpen: (open: boolean) => void;
  initialSelectedNodeId?: string | null;
}

export const useBuilderComponentOperations = ({
  website,
  activePage,
  viewport,
  recordHistory,
  setIsMobileInspectorOpen,
  initialSelectedNodeId = 'comp_hero',
}: UseBuilderComponentOperationsProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedNodeId);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return website.components[selectedNodeId] || null;
  }, [website.components, selectedNodeId]);

  // Compute breadcrumbs from root to selected node
  const selectionBreadcrumbs = useMemo(() => {
    if (!selectedNodeId) return [];
    const crumbs: ComponentNode[] = [];
    let curr: ComponentNode | undefined = website.components[selectedNodeId];
    while (curr) {
      crumbs.unshift(curr);
      curr = curr.parentId ? website.components[curr.parentId] : undefined;
    }
    return crumbs;
  }, [website.components, selectedNodeId]);

  // Node Selection
  const selectNode = useCallback(
    (id: string | null) => {
      setSelectedNodeId(id);
      if (id) {
        setIsMobileInspectorOpen(true);
      }
    },
    [setIsMobileInspectorOpen]
  );

  const setHoveredNode = useCallback((id: string | null) => {
    setHoveredNodeId(id);
  }, []);

  // Update Props
  const updateNodeProps = useCallback(
    (id: string, newProps: Record<string, any>) => {
      const target = website.components[id];
      if (!target) return;

      const updatedNode: ComponentNode = {
        ...target,
        props: {
          ...target.props,
          ...newProps,
        },
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [id]: updatedNode,
        },
      };

      recordHistory(`تعديل خصائص (${target.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  // Update Style (with responsive breakpoint support)
  const updateNodeStyle = useCallback(
    (id: string, stylePatch: Partial<StyleProperties>, bp: ViewportBreakpoint = viewport) => {
      const target = website.components[id];
      if (!target) return;

      const updatedStyles = { ...target.styles };

      if (bp === 'desktop') {
        updatedStyles.desktop = {
          ...updatedStyles.desktop,
          ...stylePatch,
        };
      } else if (bp === 'tablet') {
        updatedStyles.tablet = {
          ...(updatedStyles.tablet || {}),
          ...stylePatch,
        };
      } else if (bp === 'mobile') {
        updatedStyles.mobile = {
          ...(updatedStyles.mobile || {}),
          ...stylePatch,
        };
      }

      const updatedNode: ComponentNode = {
        ...target,
        styles: updatedStyles,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [id]: updatedNode,
        },
      };

      recordHistory(`تعديل مظهر (${target.name}) - [${bp}]`, newWebsite);
    },
    [website, viewport, recordHistory]
  );

  // Insert Child Node
  const insertNode = useCallback(
    (node: ComponentNode, parentId: string, index?: number) => {
      const parent = website.components[parentId];
      if (!parent) return;

      const newChildren = [...parent.childrenIds];
      if (typeof index === 'number' && index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, node.id);
      } else {
        newChildren.push(node.id);
      }

      const updatedParent: ComponentNode = {
        ...parent,
        childrenIds: newChildren,
      };

      const nodeWithParent: ComponentNode = {
        ...node,
        parentId,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [parentId]: updatedParent,
          [node.id]: nodeWithParent,
        },
      };

      recordHistory(`إضافة عنصر (${node.name})`, newWebsite);
      setSelectedNodeId(node.id);
    },
    [website, recordHistory]
  );

  // Insert Section Template
  const insertSectionTemplate = useCallback(
    (templateId: string, targetIndex?: number) => {
      const tmpl = sectionTemplates.find((t) => t.id === templateId);
      if (!tmpl) return;

      const rootPageNode = website.components[activePage.rootNodeId];
      if (!rootPageNode) return;

      // Generate unique cloned IDs to prevent collision
      const idMap: Record<string, string> = {};
      const timestamp = Date.now().toString(36);

      Object.keys(tmpl.nodes).forEach((origId) => {
        idMap[origId] =
          `comp_${tmpl.category}_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
      });

      const clonedNodes: Record<string, ComponentNode> = {};
      Object.values(tmpl.nodes).forEach((node) => {
        const newId = idMap[node.id];
        const newParentId = node.parentId ? idMap[node.parentId] : activePage.rootNodeId;
        const newChildrenIds = node.childrenIds.map((cId) => idMap[cId]);

        clonedNodes[newId] = {
          ...node,
          id: newId,
          parentId: newParentId,
          childrenIds: newChildrenIds,
          styles: {
            ...node.styles,
            mobile: createTemplateMobileStyles(node),
          },
        };
      });

      const newRootSectionId = idMap[tmpl.rootNodeId];
      const newChildren = [...rootPageNode.childrenIds];

      if (typeof targetIndex === 'number' && targetIndex >= 0) {
        newChildren.splice(targetIndex, 0, newRootSectionId);
      } else {
        // Put before footer if present, else at the end
        const footerIndex = newChildren.findIndex(
          (id) => website.components[id]?.type === 'footer'
        );
        if (footerIndex !== -1) {
          newChildren.splice(footerIndex, 0, newRootSectionId);
        } else {
          newChildren.push(newRootSectionId);
        }
      }

      const updatedRootPageNode: ComponentNode = {
        ...rootPageNode,
        childrenIds: newChildren,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          ...clonedNodes,
          [activePage.rootNodeId]: updatedRootPageNode,
        },
      };

      recordHistory(`إدراج نموذج قسم (${tmpl.nameAr})`, newWebsite);
      setSelectedNodeId(newRootSectionId);

      // Live smooth scroll to the newly inserted section
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById(newRootSectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 120);
      }
    },
    [website, activePage.rootNodeId, recordHistory]
  );

  // Delete Node (recursively removes child keys)
  // Allows deleting ANY node, including the root container of the page.
  // When the root is deleted, the page's rootNodeId is cleared so the page
  // becomes truly empty and can stay blank.
  const deleteNode = useCallback(
    (id: string) => {
      const target = website.components[id];
      if (!target) return;

      const parentId = target.parentId;
      const isRoot = !parentId;

      // Collect all descendant ids
      const idsToDelete = new Set<string>();
      const collectDescendants = (nodeId: string) => {
        idsToDelete.add(nodeId);
        const node = website.components[nodeId];
        if (node) {
          node.childrenIds.forEach(collectDescendants);
        }
      };
      collectDescendants(id);

      const newComponents = { ...website.components };
      idsToDelete.forEach((delId) => {
        delete newComponents[delId];
      });

      // If deleting the root container, clear the page's rootNodeId so the page
      // is considered empty (and stays blank on save/load/refresh).
      if (isRoot) {
        const currentPage = website.pages.find((p) => p.rootNodeId === id);
        if (currentPage) {
          const updatedPages = website.pages.map((p) =>
            p.id === currentPage.id ? { ...p, rootNodeId: null as unknown as string } : p
          );
          const newWebsite: Website = {
            ...website,
            components: newComponents,
            pages: updatedPages,
          };
          recordHistory(`حذف (${target.name})`, newWebsite);
          setSelectedNodeId(null);
          return;
        }
      }

      // Normal deletion: update the parent's children list
      if (!parentId) return;
      const parent = website.components[parentId];
      if (!parent) return;

      const updatedParent: ComponentNode = {
        ...parent,
        childrenIds: parent.childrenIds.filter((childId: string) => childId !== id),
      };

      newComponents[parentId] = updatedParent;

      const newWebsite: Website = {
        ...website,
        components: newComponents,
      };

      recordHistory(`حذف (${target.name})`, newWebsite);
      setSelectedNodeId(parentId);
    },
    [website, recordHistory]
  );

  // Duplicate Node
  const duplicateNode = useCallback(
    (id: string) => {
      const target = website.components[id];
      if (!target || !target.parentId) return;

      const parent = website.components[target.parentId];
      if (!parent) return;

      const idMap: Record<string, string> = {};
      const timestamp = Date.now().toString(36);

      const collectSubtree = (nodeId: string) => {
        idMap[nodeId] = `dup_${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
        const n = website.components[nodeId];
        if (n) {
          n.childrenIds.forEach(collectSubtree);
        }
      };
      collectSubtree(id);

      const clonedSubtree: Record<string, ComponentNode> = {};
      Object.keys(idMap).forEach((origId) => {
        const origNode = website.components[origId];
        const newId = idMap[origId];
        const newParentId = origId === id ? target.parentId : idMap[origNode.parentId!];

        clonedSubtree[newId] = {
          ...origNode,
          id: newId,
          name: origId === id ? `${origNode.name} (نسخة)` : origNode.name,
          parentId: newParentId,
          childrenIds: origNode.childrenIds.map((cId) => idMap[cId]),
        };
      });

      const targetIdx = parent.childrenIds.indexOf(id);
      const newChildren = [...parent.childrenIds];
      newChildren.splice(targetIdx + 1, 0, idMap[id]);

      const updatedParent: ComponentNode = {
        ...parent,
        childrenIds: newChildren,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          ...clonedSubtree,
          [parent.id]: updatedParent,
        },
      };

      recordHistory(`تكرار (${target.name})`, newWebsite);
      setSelectedNodeId(idMap[id]);
    },
    [website, recordHistory]
  );

  // Move Node Up or Down in parent
  const moveNode = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const target = website.components[id];
      if (!target || !target.parentId) return;

      const parent = website.components[target.parentId];
      if (!parent) return;

      const idx = parent.childrenIds.indexOf(id);
      if (idx === -1) return;

      const newChildren = [...parent.childrenIds];
      if (direction === 'up' && idx > 0) {
        const temp = newChildren[idx];
        newChildren[idx] = newChildren[idx - 1];
        newChildren[idx - 1] = temp;
      } else if (direction === 'down' && idx < newChildren.length - 1) {
        const temp = newChildren[idx];
        newChildren[idx] = newChildren[idx + 1];
        newChildren[idx + 1] = temp;
      } else {
        return;
      }

      const updatedParent: ComponentNode = {
        ...parent,
        childrenIds: newChildren,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [parent.id]: updatedParent,
        },
      };

      recordHistory(
        `تحريك (${target.name}) ${direction === 'up' ? 'للأعلى' : 'للأسفل'}`,
        newWebsite
      );
    },
    [website, recordHistory]
  );

  // Move node to a specific position relative to target (before, after, inside)
  const moveNodePosition = useCallback(
    (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside'): boolean => {
      if (!draggedId || !targetId || draggedId === targetId) return false;

      const draggedNode = website.components[draggedId];
      const targetNode = website.components[targetId];
      if (!draggedNode || !targetNode) return false;

      // Prevent dragging page root
      if (!draggedNode.parentId) return false;

      // Prevent dragging a node into its own children / descendants (cycle prevention)
      const isDescendantOf = (ancestorId: string, candidateId: string): boolean => {
        let curr = website.components[candidateId];
        while (curr && curr.parentId) {
          if (curr.parentId === ancestorId) return true;
          curr = website.components[curr.parentId];
        }
        return false;
      };

      if (isDescendantOf(draggedId, targetId)) {
        return false;
      }

      const oldParentId = draggedNode.parentId;
      const oldParent = website.components[oldParentId];
      if (!oldParent) return false;

      let newParentId: string;
      const newComponents: Record<string, ComponentNode> = { ...website.components };

      if (position === 'inside') {
        newParentId = targetId;
        const newTargetChildren = (targetNode.childrenIds || []).filter((id) => id !== draggedId);
        newTargetChildren.push(draggedId);

        newComponents[targetId] = {
          ...targetNode,
          childrenIds: newTargetChildren,
        };

        if (oldParentId !== targetId) {
          newComponents[oldParentId] = {
            ...oldParent,
            childrenIds: oldParent.childrenIds.filter((id) => id !== draggedId),
          };
        }
      } else {
        // 'before' or 'after'
        if (!targetNode.parentId) return false;
        newParentId = targetNode.parentId;
        const targetParent = website.components[newParentId];
        if (!targetParent) return false;

        const filteredChildren = targetParent.childrenIds.filter((id) => id !== draggedId);
        const targetIndex = filteredChildren.indexOf(targetId);
        if (targetIndex === -1) return false;

        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        filteredChildren.splice(insertIndex, 0, draggedId);

        newComponents[newParentId] = {
          ...targetParent,
          childrenIds: filteredChildren,
        };

        if (oldParentId !== newParentId) {
          newComponents[oldParentId] = {
            ...oldParent,
            childrenIds: oldParent.childrenIds.filter((id) => id !== draggedId),
          };
        }
      }

      newComponents[draggedId] = {
        ...draggedNode,
        parentId: newParentId,
      };

      const newWebsite: Website = {
        ...website,
        components: newComponents,
      };

      const posAr = position === 'inside' ? 'داخل' : position === 'before' ? 'قبل' : 'بعد';
      recordHistory(
        `سحب وإفلات (${draggedNode.name}) إلى ${posAr} (${targetNode.name})`,
        newWebsite
      );
      setSelectedNodeId(draggedId);
      return true;
    },
    [website, recordHistory]
  );

  // Reorder Children
  const reorderChildren = useCallback(
    (parentId: string, newChildrenIds: string[]) => {
      const parent = website.components[parentId];
      if (!parent) return;

      const updatedParent: ComponentNode = {
        ...parent,
        childrenIds: newChildrenIds,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [parentId]: updatedParent,
        },
      };

      recordHistory(`إعادة ترتيب عناصر (${parent.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  // Visibility & Lock
  const toggleNodeVisibility = useCallback(
    (id: string) => {
      const target = website.components[id];
      if (!target) return;

      const isCurrentlyHidden = Boolean(target.isHidden || target.props?.hidden);
      const nextHidden = !isCurrentlyHidden;

      const updatedNode: ComponentNode = {
        ...target,
        isHidden: nextHidden,
        props: {
          ...target.props,
          hidden: nextHidden,
        },
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [id]: updatedNode,
        },
      };

      recordHistory(`تغيير ظهور (${target.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  const toggleNodeLock = useCallback(
    (id: string) => {
      const target = website.components[id];
      if (!target) return;

      const updatedNode: ComponentNode = {
        ...target,
        isLocked: !target.isLocked,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [id]: updatedNode,
        },
      };

      recordHistory(`تغيير قفل (${target.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  const renameNode = useCallback(
    (id: string, newName: string) => {
      const target = website.components[id];
      if (!target || !newName.trim()) return;

      const updatedNode: ComponentNode = {
        ...target,
        name: newName.trim(),
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [id]: updatedNode,
        },
      };

      recordHistory(`إعادة تسمية (${target.name}) إلى ${newName}`, newWebsite);
    },
    [website, recordHistory]
  );

  // Custom Scoped Code
  const updateNodeCustomCode = useCallback(
    (nodeId: string, codePatch: Partial<CustomCodeScope>) => {
      const target = website.components[nodeId];
      if (!target) return;

      const updatedNode: ComponentNode = {
        ...target,
        customCode: {
          ...target.customCode,
          ...codePatch,
        },
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [nodeId]: updatedNode,
        },
      };

      recordHistory(`تعديل كود (${target.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  const updateScopedComponentCode = useCallback(
    (nodeId: string, file: string, code: string) => {
      const target = website.components[nodeId];
      if (!target) return;

      const currentCustomCode = target.customCode || {};
      const updatedCustomCode = { ...currentCustomCode };

      if (file === 'component.tsx') updatedCustomCode.tsxSnippet = code;
      else if (file === 'styles.css') updatedCustomCode.cssSnippet = code;
      else if (file === 'interactions.ts') updatedCustomCode.jsSnippet = code;
      else if (file === 'schema.json') updatedCustomCode.propsSchema = code;

      const updatedNode: ComponentNode = {
        ...target,
        customCode: updatedCustomCode,
      };

      const newWebsite: Website = {
        ...website,
        components: {
          ...website.components,
          [nodeId]: updatedNode,
        },
      };

      recordHistory(`تعديل كود مخصص (${file}) لـ (${target.name})`, newWebsite);
    },
    [website, recordHistory]
  );

  return {
    selectedNodeId,
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
