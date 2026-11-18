import {
  componentSupportsChildren,
  getPersistedComponentDefinition,
} from '@ray-eg/shared/builder';
import type { SectionTemplate } from '../sections/types';

export type ComponentContractIssueCode =
  | 'unknown-component'
  | 'unsupported-category'
  | 'children-not-supported'
  | 'duplicate-child-edge'
  | 'missing-child'
  | 'parent-link-mismatch'
  | 'unreachable-node';

export interface ComponentContractIssue {
  code: ComponentContractIssueCode;
  templateId: string;
  nodeId: string;
  relatedNodeId?: string;
}

/**
 * Read-only migration audit for persisted section templates.
 *
 * This deliberately does not reject or rewrite legacy templates. It exposes
 * structural/registry mismatches so future schema migrations can be based on
 * actual saved data rather than guessed defaults.
 */
export function auditSectionTemplateComponentContracts(
  templates: readonly SectionTemplate[]
): ComponentContractIssue[] {
  const issues: ComponentContractIssue[] = [];

  templates.forEach((template) => {
    const nodes = template.nodes;
    const visited = new Set<string>();
    const expectedParents = new Map<string, string>();

    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!getPersistedComponentDefinition(node.type)) {
        issues.push({ code: 'unknown-component', templateId: template.id, nodeId });
      }
      if (!getPersistedComponentDefinition(node.type) ||
          !getPersistedComponentDefinition(node.type)?.category) {
        return;
      }
      const definition = getPersistedComponentDefinition(node.type);
      if (definition && definition.category !== node.category &&
          !(node.category === 'form' && definition.category === 'forms')) {
        issues.push({ code: 'unsupported-category', templateId: template.id, nodeId });
      }
    });

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      const node = nodes[nodeId];
      if (!node) {
        issues.push({
          code: 'missing-child',
          templateId: template.id,
          nodeId: template.rootNodeId,
          relatedNodeId: nodeId,
        });
        return;
      }
      visited.add(nodeId);
      const children = Array.isArray(node.childrenIds) ? node.childrenIds : [];
      const seen = new Set<string>();
      children.forEach((childId) => {
        if (seen.has(childId)) {
          issues.push({
            code: 'duplicate-child-edge',
            templateId: template.id,
            nodeId,
            relatedNodeId: childId,
          });
          return;
        }
        seen.add(childId);
        if (!nodes[childId]) {
          issues.push({
            code: 'missing-child',
            templateId: template.id,
            nodeId,
            relatedNodeId: childId,
          });
          return;
        }
        const previousParent = expectedParents.get(childId);
        if (previousParent && previousParent !== nodeId) {
          issues.push({
            code: 'parent-link-mismatch',
            templateId: template.id,
            nodeId,
            relatedNodeId: childId,
          });
        } else {
          expectedParents.set(childId, nodeId);
        }
      });
      if (children.length && !componentSupportsChildren(node.type)) {
        issues.push({
          code: 'children-not-supported',
          templateId: template.id,
          nodeId,
        });
      }
      children.forEach((childId) => {
        if (nodes[childId]) visit(childId);
      });
    };

    visit(template.rootNodeId);
    Object.keys(nodes).forEach((nodeId) => {
      if (!visited.has(nodeId)) {
        issues.push({ code: 'unreachable-node', templateId: template.id, nodeId });
      }
    });
  });

  return issues;
}
