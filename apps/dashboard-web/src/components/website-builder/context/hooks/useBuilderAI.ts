import { useCallback } from 'react';
import { ComponentNode, Page, Website } from '../../types/builder';
import { StructuredAiPatch } from '../../types/ai';

export interface UseBuilderAIProps {
  website: Website;
  activePage: Page;
  selectedNodeId: string | null;
  recordHistory: (actionDesc: string, newWebsite: Website) => void;
  setSelectedNodeId: (id: string | null) => void;
  setWebsite: (w: Website) => void;
  setActiveTemplateId: (id: string) => void;
  setActivePageId: (id: string) => void;
  setHoveredNodeId: (id: string | null) => void;
  resetHistory: (label: string) => void;
  setHistoryLog: React.Dispatch<React.SetStateAction<string[]>>;
  setIsAiModalOpen: (open: boolean) => void;
}

export const useBuilderAI = ({
  website,
  activePage,
  selectedNodeId,
  recordHistory,
  setSelectedNodeId,
  setWebsite,
  setActiveTemplateId,
  setActivePageId,
  setHoveredNodeId,
  resetHistory,
  setHistoryLog,
  setIsAiModalOpen,
}: UseBuilderAIProps) => {
  const applyAiPatch = useCallback(
    (patch: StructuredAiPatch) => {
      const updatedComponents = { ...website.components };
      let updatedTheme = { ...website.theme };
      let targetSelectId = patch.targetNodeIds?.[0] || selectedNodeId;

      patch.operations.forEach((op) => {
        const opType = op.op.toLowerCase();

        if (
          (opType === 'update_style' || op.op === 'UPDATE_STYLE') &&
          op.targetId &&
          updatedComponents[op.targetId]
        ) {
          const target = updatedComponents[op.targetId];
          if (typeof op.value === 'object' && op.value !== null && !op.path.includes('.')) {
            updatedComponents[op.targetId] = {
              ...target,
              styles: {
                ...target.styles,
                desktop: { ...target.styles.desktop, ...op.value },
              },
            };
          } else {
            const pathParts = op.path.split('.');
            const propName = pathParts[pathParts.length - 1];
            updatedComponents[op.targetId] = {
              ...target,
              styles: {
                ...target.styles,
                desktop: { ...target.styles.desktop, [propName]: op.value },
              },
            };
          }
        } else if (
          (opType === 'update_prop' || op.op === 'UPDATE_PROPS') &&
          op.targetId &&
          updatedComponents[op.targetId]
        ) {
          const target = updatedComponents[op.targetId];
          if (
            typeof op.value === 'object' &&
            op.value !== null &&
            (!op.path || op.path === 'props')
          ) {
            updatedComponents[op.targetId] = {
              ...target,
              props: { ...target.props, ...op.value },
            };
          } else {
            const propName = op.path.replace(/^props\./, '');
            updatedComponents[op.targetId] = {
              ...target,
              props: { ...target.props, [propName]: op.value },
            };
          }
        } else if (opType === 'insert_node' || opType === 'add_node') {
          const newNode: ComponentNode = op.value?.node || op.value;
          if (newNode && newNode.id) {
            const targetParentId =
              op.value?.targetParentId || newNode.parentId || activePage.rootNodeId;
            const insertAfterId = op.value?.insertAfterId || op.targetId;
            const parentNode = updatedComponents[targetParentId];

            if (parentNode) {
              const currentChildren = [...(parentNode.childrenIds || [])];
              const insertIdx = insertAfterId ? currentChildren.indexOf(insertAfterId) : -1;
              if (insertIdx !== -1) {
                currentChildren.splice(insertIdx + 1, 0, newNode.id);
              } else {
                currentChildren.push(newNode.id);
              }
              updatedComponents[newNode.id] = { ...newNode, parentId: targetParentId };
              updatedComponents[targetParentId] = { ...parentNode, childrenIds: currentChildren };
              targetSelectId = newNode.id;
            }
          }
        } else if (opType === 'update_theme_token' && op.path) {
          if (op.path === 'theme.colors.primary' || op.path.includes('primary')) {
            updatedTheme = {
              ...updatedTheme,
              colors: { ...updatedTheme.colors, primary: op.value, primaryHover: op.value },
            };
          }
        } else if (opType === 'replace_node' && op.targetId && updatedComponents[op.targetId]) {
          updatedComponents[op.targetId] = { ...updatedComponents[op.targetId], ...op.value };
        }
      });

      const newWebsite: Website = {
        ...website,
        components: updatedComponents,
        theme: updatedTheme,
      };

      recordHistory(
        `تطبيق تعديل الذكاء الاصطناعي: ${patch.summary || patch.description}`,
        newWebsite
      );
      if (targetSelectId && updatedComponents[targetSelectId]) {
        setSelectedNodeId(targetSelectId);
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            const el = document.getElementById(targetSelectId as string);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    },
    [website, selectedNodeId, activePage.rootNodeId, recordHistory, setSelectedNodeId]
  );

  const loadCustomWebsite = useCallback(
    (newWebsite: Website) => {
      setWebsite(newWebsite);
      setActiveTemplateId(newWebsite.id);
      const firstPage = newWebsite.pages[0];
      setActivePageId(firstPage ? firstPage.id : 'page_home');
      setSelectedNodeId(firstPage ? firstPage.rootNodeId : null);
      setHoveredNodeId(null);
      resetHistory(
        `تم توليد وبناء موقع جديد بالكامل بالذكاء الاصطناعي: (${newWebsite.name})`
      );
      setHistoryLog((prev) => [
        `تم توليد وبناء موقع جديد بالكامل بالذكاء الاصطناعي: (${newWebsite.name})`,
        ...prev,
      ]);
      setIsAiModalOpen(false);
    },
    [
      setWebsite,
      setActiveTemplateId,
      setActivePageId,
      setSelectedNodeId,
      setHoveredNodeId,
      resetHistory,
      setHistoryLog,
      setIsAiModalOpen,
    ]
  );

  return { applyAiPatch, loadCustomWebsite };
};
