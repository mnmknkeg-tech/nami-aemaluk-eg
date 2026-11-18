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
  | 'declared-parent-mismatch'
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
    const ambiguousParents = new Set<string>();

    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!getPersistedComponentDefinition(node.type)) {
        issues.push({ code: 'unknown-component', templateId: template.id, nodeId });
      }
      const definition = getPersistedComponentDefinition(node.type);
      if (!definition?.category) return;
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
          ambiguousParents.add(childId);
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

    // Compare the denormalized reverse link only when the child has one
    // unambiguous parent edge. Keep the root exempt for legacy compatibility.
    expectedParents.forEach((expectedParentId, nodeId) => {
      if (!ambiguousParents.has(nodeId) && nodes[nodeId]?.parentId !== expectedParentId) {
        issues.push({
          code: 'declared-parent-mismatch',
          templateId: template.id,
          nodeId,
          relatedNodeId: expectedParentId,
        });
      }
    });

    Object.keys(nodes).forEach((nodeId) => {
      if (!visited.has(nodeId)) {
        issues.push({ code: 'unreachable-node', templateId: template.id, nodeId });
      }
    });
  });

  return issues;
}


export type ObservedPropValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  | 'undefined';

export interface SectionTemplatePropUsage {
  key: string;
  /** Runtime value kinds observed in saved templates; never used as a validator. */
  valueKinds: ObservedPropValueKind[];
  occurrenceCount: number;
}

export interface SectionTemplateComponentUsage {
  type: string;
  nodeCount: number;
  templateCount: number;
  templateIds: string[];
  categories: string[];
  observedPropKeys: string[];
  observedProps: SectionTemplatePropUsage[];
}

function getObservedPropValueKind(value: unknown): ObservedPropValueKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return typeof value;
  }
  return 'undefined';
}

/**
 * Reports observed persisted props; this is evidence for future schemas,
 * not an authoritative allow-list or a source of inferred defaults.
 * Values themselves are intentionally never returned.
 */
export function inspectSectionTemplateComponentUsage(
  templates: readonly SectionTemplate[]
): SectionTemplateComponentUsage[] {
  const usage = new Map<string, {
    nodeCount: number;
    templateIds: Set<string>;
    categories: Set<string>;
    props: Map<string, { valueKinds: Set<ObservedPropValueKind>; occurrenceCount: number }>;
  }>();

  templates.forEach((template) => {
    Object.values(template.nodes).forEach((node) => {
      const current = usage.get(node.type) ?? {
        nodeCount: 0,
        templateIds: new Set<string>(),
        categories: new Set<string>(),
        props: new Map<string, { valueKinds: Set<ObservedPropValueKind>; occurrenceCount: number }>(),
      };
      current.nodeCount += 1;
      current.templateIds.add(template.id);
      current.categories.add(node.category);
      if (node.props && typeof node.props === 'object' && !Array.isArray(node.props)) {
        Object.entries(node.props).forEach(([key, value]) => {
          const prop = current.props.get(key) ?? {
            valueKinds: new Set<ObservedPropValueKind>(),
            occurrenceCount: 0,
          };
          prop.valueKinds.add(getObservedPropValueKind(value));
          prop.occurrenceCount += 1;
          current.props.set(key, prop);
        });
      }
      usage.set(node.type, current);
    });
  });

  return [...usage.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([type, value]) => {
      const observedProps = [...value.props.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, prop]) => ({
          key,
          valueKinds: [...prop.valueKinds].sort(),
          occurrenceCount: prop.occurrenceCount,
        }));
      return {
        type,
        nodeCount: value.nodeCount,
        templateCount: value.templateIds.size,
        templateIds: [...value.templateIds].sort(),
        categories: [...value.categories].sort(),
        observedPropKeys: observedProps.map((prop) => prop.key),
        observedProps,
      };
    });
}
