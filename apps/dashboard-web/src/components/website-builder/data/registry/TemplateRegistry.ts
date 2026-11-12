import { getInvalidPageDestinations, inspectWebsiteTree } from '@ray-eg/shared/builder';
import type { ComponentNode, Website } from '../../types/builder';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_SCHEMA_VERSIONS,
  type TemplateCategory,
  type TemplateRecordByCategory,
  type TemplateRegistryEntry,
} from './templateTypes';
import type { ValidationError, ValidationResult } from './validationTypes';

const SCHEMA_BY_CATEGORY: Record<TemplateCategory, string> = {
  'full-website': TEMPLATE_SCHEMA_VERSIONS.fullWebsite,
  'section-template': TEMPLATE_SCHEMA_VERSIONS.section,
  'theme-preset': TEMPLATE_SCHEMA_VERSIONS.theme,
};
const TEMPLATE_CATEGORY_SET: ReadonlySet<string> = new Set(TEMPLATE_CATEGORIES);

function isTemplateCategory(value: unknown): value is TemplateCategory {
  return typeof value === 'string' && TEMPLATE_CATEGORY_SET.has(value);
}

const COMPONENT_TYPES = new Set([
  'product_filter_tabs',
  'website',
  'page',
  'header',
  'hero',
  'features',
  'bento',
  'bento-grid',
  'services',
  'services-grid',
  'products',
  'pricing',
  'testimonials',
  'gallery',
  'team',
  'stats',
  'faq',
  'cta',
  'contact',
  'contact-section',
  'footer',
  'navigation',
  'form',
  'container',
  'grid',
  'flex',
  'heading',
  'paragraph',
  'button',
  'image',
  'badge',
  'card',
  'divider',
  'spacer',
  'icon',
  'input',
  'custom-code',
  'whatsapp-float',
  'mobile_footer',
  'whatsapp_button',
  'trust-badges',
  'trust_badges',
  'before-after',
  'before_after',
  'promo-banner',
  'promo_banner',
  'announcement-bar',
  'announcement_bar',
  'auth',
  'auth_login',
  'auth_register',
]);
const COMPONENT_CATEGORIES = new Set([
  'layout',
  'typography',
  'media',
  'action',
  'section',
  'commerce',
  'forms',
  'form',
  'navigation',
  'interactive',
  'auth',
]);
const STYLE_ENUMS: Record<string, readonly string[]> = {
  display: ['block', 'flex', 'grid', 'inline-block', 'none'],
  flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
  justifyContent: [
    'flex-start',
    'center',
    'flex-end',
    'space-between',
    'space-around',
    'space-evenly',
  ],
  alignItems: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'],
  flexWrap: ['nowrap', 'wrap', 'wrap-reverse'],
  fontWeight: ['300', '400', '500', '600', '700', '800', '900'],
  fontStyle: ['normal', 'italic', 'oblique'],
  textAlign: ['left', 'center', 'right', 'justify'],
  textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
  objectFit: ['cover', 'contain', 'fill', 'none', 'scale-down'],
  backgroundSize: ['cover', 'contain', 'auto'],
  backgroundPosition: ['center', 'top', 'bottom', 'left', 'right'],
  borderStyle: ['solid', 'dashed', 'dotted', 'none'],
  overflow: ['visible', 'hidden', 'scroll', 'auto'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
};

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function validateComponentRecords(
  components: Record<string, unknown>,
  templateId: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  Object.entries(components).forEach(([key, value]) => {
    const invalid = (message: string) =>
      errors.push({ code: 'INVALID_RELATIONSHIP', message, templateId });
    if (!isRecord(value)) {
      invalid(`Component "${key}" must be an object.`);
      return;
    }
    if (!key.trim()) invalid('Component IDs must not be empty.');
    if (value.id !== key)
      invalid(`Component key "${key}" does not match its id "${String(value.id)}".`);
    if (typeof value.name !== 'string' || !value.name.trim()) {
      invalid(`Component "${key}" must have a non-empty name.`);
    }
    if (typeof value.type !== 'string' || !COMPONENT_TYPES.has(value.type)) {
      invalid(`Component "${key}" has unsupported type "${String(value.type)}".`);
    }
    if (typeof value.category !== 'string' || !COMPONENT_CATEGORIES.has(value.category)) {
      invalid(`Component "${key}" has unsupported category "${String(value.category)}".`);
    }
    if (!(
      value.parentId === null ||
      (typeof value.parentId === 'string' && value.parentId.length > 0)
    )) {
      invalid(`Component "${key}" must declare a string parentId or null.`);
    }
    if (
      !Array.isArray(value.childrenIds) ||
      value.childrenIds.some((childId: unknown) => typeof childId !== 'string')
    ) {
      invalid(`Component "${key}" must have a childrenIds array of string IDs.`);
    }
    if (!isRecord(value.props)) {
      invalid(`Component "${key}" must have a props object.`);
    } else {
      const hasText = ['text', 'title', 'label'].some(
        (property) => typeof value.props[property] === 'string' && value.props[property].trim()
      );
      if (
        value.type === 'heading' &&
        !(typeof value.props.text === 'string' && value.props.text.trim())
      ) {
        invalid(`Heading component "${key}" requires a non-empty props.text value.`);
      }
      if (value.type === 'button' && !hasText) {
        invalid(
          `Button component "${key}" requires non-empty props.text, props.title, or props.label.`
        );
      }
      if (
        value.type === 'image' &&
        !['src', 'image', 'imageUrl'].some(
          (property) => typeof value.props[property] === 'string' && value.props[property].trim()
        )
      ) {
        invalid(
          `Image component "${key}" requires a non-empty props.src, props.image, or props.imageUrl.`
        );
      }
    }
    if (!isRecord(value.styles)) {
      invalid(`Component "${key}" must have a styles object.`);
    } else {
      Object.entries(value.styles).forEach(([viewport, styleValues]) => {
        if (!['desktop', 'tablet', 'mobile'].includes(viewport)) {
          invalid(`Component "${key}" has unsupported style viewport "${viewport}".`);
          return;
        }
        if (!isRecord(styleValues)) {
          invalid(`Component "${key}" styles.${viewport} must be an object.`);
          return;
        }
        Object.entries(styleValues).forEach(([property, styleValue]) => {
          const allowed = STYLE_ENUMS[property];
          if (allowed && !allowed.includes(String(styleValue))) {
            invalid(
              `Component "${key}" styles.${viewport}.${property} has unsupported value "${String(styleValue)}"; expected one of: ${allowed.join(', ')}.`
            );
          }
        });
      });
    }
  });
  return errors;
}

function validateWebsiteRelationships(website: Website, templateId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const components = isRecord(website.components) ? website.components : {};
  const pages = Array.isArray(website.pages) ? website.pages : [];
  errors.push(...validateComponentRecords(components, templateId));
  const pageIds = new Set<string>();

  if (pages.length === 0) {
    errors.push({
      code: 'MISSING_REQUIRED',
      message: 'A full website template must contain at least one page.',
      templateId,
    });
    return errors;
  }

  pages.forEach((page) => {
    if (!isRecord(page) || typeof page.id !== 'string' || !page.id.trim()) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: 'Every page must have a non-empty stable ID.',
        templateId,
      });
      return;
    }
    if (pageIds.has(page.id)) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Page ID "${page.id}" is used more than once.`,
        templateId,
      });
    }
    pageIds.add(page.id);
    if (typeof page.name !== 'string' || !page.name.trim()) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Page "${page.id}" must have a non-empty name.`,
        templateId,
      });
    }
    if (!page.rootNodeId || !components[page.rootNodeId]) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Page "${page.name || page.id}" references missing root component "${page.rootNodeId || ''}".`,
        templateId,
      });
    }
  });
  getInvalidPageDestinations(website).forEach((destination) => {
    errors.push({
      code: 'INVALID_RELATIONSHIP',
      message: `Template contains a link with an invalid internal page or section destination: "${destination}".`,
      templateId,
    });
  });

  Object.entries(components).forEach(([id, rawNode]) => {
    if (!isRecord(rawNode)) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Component "${id}" is not a valid component record.`,
        templateId,
      });
      return;
    }
    const node = rawNode as ComponentNode;
    const childIds = Array.isArray(node.childrenIds) ? node.childrenIds : [];
    const seen = new Set<string>();
    childIds.forEach((childId) => {
      if (typeof childId !== 'string' || !components[childId]) {
        errors.push({
          code: 'INVALID_RELATIONSHIP',
          message: `Component "${id}" references missing child "${String(childId)}".`,
          templateId,
        });
      } else if (seen.has(childId)) {
        errors.push({
          code: 'INVALID_RELATIONSHIP',
          message: `Component "${id}" lists child "${childId}" more than once.`,
          templateId,
        });
      }
      seen.add(childId);
    });
  });

  const report = inspectWebsiteTree(website);
  const parentsAcrossPages = new Map<string, Set<string>>();
  const pageRoots = new Set<string>();
  pages.forEach((page) => {
    if (!page.rootNodeId || !components[page.rootNodeId]) return;
    pageRoots.add(page.rootNodeId);

    const parentsByNode = new Map<string, Set<string>>();
    const visited = new Set<string>();
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = components[nodeId];
      const childIds = Array.isArray(node.childrenIds) ? node.childrenIds : [];
      childIds.forEach((childId: unknown) => {
        if (typeof childId !== 'string' || !components[childId]) return;
        const parents = parentsByNode.get(childId) || new Set<string>();
        parents.add(nodeId);
        parentsByNode.set(childId, parents);
        const allParents = parentsAcrossPages.get(childId) || new Set<string>();
        allParents.add(nodeId);
        parentsAcrossPages.set(childId, allParents);
        visit(childId);
      });
    };
    visit(page.rootNodeId);

    parentsByNode.forEach((parents, nodeId) => {
      if (parents.size > 1) {
        errors.push({
          code: 'INVALID_RELATIONSHIP',
          message: `Component "${nodeId}" has multiple parents on page "${page.name || page.id}".`,
          templateId,
        });
      }
    });
  });
  parentsAcrossPages.forEach((parents, nodeId) => {
    if (pageRoots.has(nodeId)) {
      if (components[nodeId].parentId != null) {
        errors.push({
          code: 'INVALID_RELATIONSHIP',
          message: `Page root component "${nodeId}" must not declare a parent.`,
          templateId,
        });
      }
      return;
    }
    const declaredParentId = components[nodeId].parentId;
    if (declaredParentId != null && parents.has(declaredParentId)) return;
    if (parents.size === 0 && declaredParentId == null) return;
    if (parents.size > 1) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Component "${nodeId}" declares parent "${declaredParentId ?? ''}", but is listed under different parents: ${[...parents].join(', ')}.`,
        templateId,
      });
      return;
    }
    const [parentId] = parents;
    if (declaredParentId !== parentId) {
      errors.push({
        code: 'INVALID_RELATIONSHIP',
        message: `Component "${nodeId}" declares parent "${components[nodeId].parentId ?? ''}" but is listed under "${parentId}".`,
        templateId,
      });
    }
  });
  report.cycles.forEach((cycle) => {
    errors.push({
      code: 'INVALID_RELATIONSHIP',
      message: `Page "${cycle.pageId}" contains a component cycle: ${cycle.nodeIds.join(' -> ')}.`,
      templateId,
    });
  });
  report.invalidProductParents.forEach((conflict) => {
    errors.push({
      code: 'INVALID_RELATIONSHIP',
      message: `Products section "${conflict.nodeId}" is nested in unsupported "${conflict.parentType}" component "${conflict.parentId}".`,
      templateId,
    });
  });
  return errors;
}

export function validateTemplateEntry(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return {
      valid: false,
      errors: [{ code: 'MISSING_REQUIRED', message: 'Template entry must be an object.' }],
    };
  }

  const id = typeof input.id === 'string' ? input.id : '';
  const templateId = id || undefined;
  if (!id.trim()) {
    errors.push({ code: 'MISSING_ID', message: 'Template ID is required.' });
  }

  const category = input.category;
  if (!isTemplateCategory(category)) {
    errors.push({
      code: 'INVALID_CATEGORY',
      message: `Template "${id || '(missing id)'}" has unsupported category "${String(category)}".`,
      templateId,
    });
  } else {
    if (input.schemaVersion !== SCHEMA_BY_CATEGORY[category]) {
      errors.push({
        code: 'UNSUPPORTED_SCHEMA',
        message: `Template "${id}" uses unsupported ${category} schema "${String(input.schemaVersion)}".`,
        templateId,
      });
    }
    if (typeof input.displayName !== 'string' || !input.displayName.trim()) {
      errors.push({
        code: 'MISSING_REQUIRED',
        message: `Template "${id}" is missing a display name.`,
        templateId,
      });
    }
    if (typeof input.version !== 'string' || !input.version.trim()) {
      errors.push({
        code: 'MISSING_REQUIRED',
        message: `Template "${id}" is missing a version.`,
        templateId,
      });
    }
    if (typeof input.dataSource !== 'string' || !input.dataSource.trim()) {
      errors.push({
        code: 'MISSING_REQUIRED',
        message: `Template "${id}" is missing its source mapping.`,
        templateId,
      });
    }

    switch (category) {
      case 'full-website':
        if (!isRecord(input.website) || !isRecord(input.website.components)) {
          errors.push({
            code: 'MISSING_REQUIRED',
            message: `Full website template "${id}" must contain a website and component map.`,
            templateId,
          });
        } else {
          errors.push(...validateWebsiteRelationships(input.website as Website, id));
        }
        break;
      case 'section-template': {
        const template = input.template;
        if (
          !isRecord(template) ||
          !isRecord(template.nodes) ||
          typeof template.rootNodeId !== 'string' ||
          !template.rootNodeId
        ) {
          errors.push({
            code: 'MISSING_REQUIRED',
            message: `Section template "${id}" must contain nodes and a rootNodeId.`,
            templateId,
          });
        } else {
          const nodes = template.nodes as Record<string, unknown>;
          const rootNode = nodes[template.rootNodeId];
          if (!rootNode) {
            errors.push({
              code: 'INVALID_RELATIONSHIP',
              message: `Section template "${id}" references missing root node "${template.rootNodeId}".`,
              templateId,
            });
            break;
          }

          const parentsByNode = new Map<string, Set<string>>();
          const visited = new Set<string>();
          const visiting = new Set<string>();
          const visit = (nodeId: string) => {
            if (visiting.has(nodeId)) {
              errors.push({
                code: 'INVALID_RELATIONSHIP',
                message: `Section template "${id}" contains a component cycle at "${nodeId}".`,
                templateId,
              });
              return;
            }
            if (visited.has(nodeId)) return;
            const node = nodes[nodeId];
            if (!isRecord(node)) {
              errors.push({
                code: 'INVALID_RELATIONSHIP',
                message: `Section template "${id}" contains an invalid node "${nodeId}".`,
                templateId,
              });
              return;
            }

            visiting.add(nodeId);
            const childIds = Array.isArray(node.childrenIds) ? node.childrenIds : [];
            childIds.forEach((childId) => {
              if (typeof childId !== 'string' || !nodes[childId]) {
                errors.push({
                  code: 'INVALID_RELATIONSHIP',
                  message: `Section template "${id}" node "${nodeId}" references missing child "${String(childId)}".`,
                  templateId,
                });
                return;
              }
              const parents = parentsByNode.get(childId) || new Set<string>();
              parents.add(nodeId);
              parentsByNode.set(childId, parents);
              visit(childId);
            });
            visiting.delete(nodeId);
            visited.add(nodeId);
          };

          visit(template.rootNodeId);
          parentsByNode.forEach((parents, nodeId) => {
            if (parents.size > 1) {
              errors.push({
                code: 'INVALID_RELATIONSHIP',
                message: `Section template "${id}" node "${nodeId}" has multiple parents.`,
                templateId,
              });
            }
          });
          Object.keys(nodes).forEach((nodeId) => {
            if (!visited.has(nodeId)) {
              errors.push({
                code: 'INVALID_RELATIONSHIP',
                message: `Section template "${id}" contains unreachable node "${nodeId}".`,
                templateId,
              });
            }
          });
        }
        break;
      }
      case 'theme-preset':
        if (
          typeof input.presetKey !== 'string' ||
          !input.presetKey.trim() ||
          !isRecord(input.preset?.tokens)
        ) {
          errors.push({
            code: 'MISSING_REQUIRED',
            message: `Theme preset "${id}" must contain a preset key and visual tokens.`,
            templateId,
          });
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTemplateEntries(entries: readonly unknown[]): ValidationResult {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();
  entries.forEach((entry) => {
    const result = validateTemplateEntry(entry);
    errors.push(...result.errors);
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.trim()) return;
    if (seenIds.has(entry.id)) {
      errors.push({
        code: 'DUPLICATE_ID',
        message: `Template ID "${entry.id}" is registered more than once.`,
        templateId: entry.id,
      });
    }
    seenIds.add(entry.id);
  });
  return { valid: errors.length === 0, errors };
}

export class TemplateRegistry {
  private readonly entries: TemplateRegistryEntry[];
  private readonly entriesById: Map<string, TemplateRegistryEntry>;
  private readonly aliases: Map<string, string>;

  constructor(entries: readonly TemplateRegistryEntry[], aliases: Record<string, string> = {}) {
    const result = validateTemplateEntries(entries);
    if (!result.valid) {
      throw new Error(
        `Template registry contains invalid entries:\n${result.errors
          .map((error) => `- ${error.code}: ${error.message}`)
          .join('\n')}`
      );
    }

    this.entries = [...entries];
    this.entriesById = new Map(this.entries.map((entry) => [entry.id, entry]));
    this.aliases = new Map(Object.entries(aliases));
    this.aliases.forEach((targetId, alias) => {
      if (this.entriesById.has(alias)) return;
      if (
        !this.entriesById.has(targetId) ||
        this.entriesById.get(targetId)?.category !== 'full-website'
      ) {
        throw new Error(
          `Legacy template ID "${alias}" resolves to missing full website template "${targetId}".`
        );
      }
    });
  }

  get(id: string): TemplateRegistryEntry | null {
    return this.entriesById.get(id) || this.entriesById.get(this.aliases.get(id) || '') || null;
  }

  getByCategory<C extends TemplateCategory>(category: C): TemplateRecordByCategory<C>[] {
    return this.entries.filter(
      (entry) => entry.category === category
    ) as TemplateRecordByCategory<C>[];
  }

  getFullWebsites(): TemplateRecordByCategory<'full-website'>[] {
    return this.getByCategory('full-website');
  }

  getSectionTemplates(): TemplateRecordByCategory<'section-template'>[] {
    return this.getByCategory('section-template');
  }

  getThemePresets(): TemplateRecordByCategory<'theme-preset'>[] {
    return this.getByCategory('theme-preset');
  }

  getCanonicalId(id: string): string | null {
    const directEntry = this.entriesById.get(id);
    if (directEntry?.category === 'full-website') return id;
    const canonicalId = this.aliases.get(id);
    return canonicalId && this.entriesById.get(canonicalId)?.category === 'full-website'
      ? canonicalId
      : null;
  }

  load<C extends TemplateCategory>(id: string, category: C): TemplateRecordByCategory<C> {
    const entry = this.get(id);
    if (!entry || entry.category !== category) {
      throw new Error(
        `Template "${id}" was not found as a ${category}. Choose a template from the ${category} catalog.`
      );
    }
    const result = validateTemplateEntry(entry);
    if (!result.valid) {
      throw new Error(
        `Template "${id}" cannot be loaded:\n${result.errors.map((error) => error.message).join('\n')}`
      );
    }
    return entry as TemplateRecordByCategory<C>;
  }

  list(): TemplateRegistryEntry[] {
    return [...this.entries];
  }
}
