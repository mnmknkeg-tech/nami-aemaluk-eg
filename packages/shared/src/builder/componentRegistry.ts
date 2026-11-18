import type { ComponentCategory, ComponentType } from './types';

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  version: 1;
  aliases: readonly ComponentType[];
  supportsChildren: boolean;
}

/** Canonical metadata for every persisted builder component. Legacy keys remain valid. */
export const COMPONENT_REGISTRY = {
  'product_filter_tabs': { type: 'product_filter_tabs', label: "Product filter tabs", category: 'commerce', version: 1, aliases: [], supportsChildren: false },
  'website': { type: 'website', label: "Website", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'page': { type: 'page', label: "Page", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'header': { type: 'header', label: "Header", category: 'navigation', version: 1, aliases: [], supportsChildren: true },
  'hero': { type: 'hero', label: "Hero", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'features': { type: 'features', label: "Features", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'bento': { type: 'bento', label: "Bento grid", category: 'section', version: 1, aliases: ["bento-grid"], supportsChildren: true },
  'bento-grid': { type: 'bento-grid', label: "Bento grid (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'services': { type: 'services', label: "Services", category: 'section', version: 1, aliases: ["services-grid"], supportsChildren: true },
  'services-grid': { type: 'services-grid', label: "Services (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'products': { type: 'products', label: "Products", category: 'commerce', version: 1, aliases: [], supportsChildren: true },
  'pricing': { type: 'pricing', label: "Pricing", category: 'commerce', version: 1, aliases: [], supportsChildren: true },
  'testimonials': { type: 'testimonials', label: "Testimonials", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'gallery': { type: 'gallery', label: "Gallery", category: 'media', version: 1, aliases: [], supportsChildren: true },
  'team': { type: 'team', label: "Team", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'stats': { type: 'stats', label: "Statistics", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'faq': { type: 'faq', label: "FAQ", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'cta': { type: 'cta', label: "Call to action", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'contact': { type: 'contact', label: "Contact", category: 'section', version: 1, aliases: ["contact-section"], supportsChildren: true },
  'contact-section': { type: 'contact-section', label: "Contact (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'footer': { type: 'footer', label: "Footer", category: 'navigation', version: 1, aliases: [], supportsChildren: true },
  'navigation': { type: 'navigation', label: "Navigation", category: 'navigation', version: 1, aliases: [], supportsChildren: true },
  'form': { type: 'form', label: "Form", category: 'forms', version: 1, aliases: [], supportsChildren: true },
  'container': { type: 'container', label: "Container", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'grid': { type: 'grid', label: "Grid", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'flex': { type: 'flex', label: "Flex layout", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'heading': { type: 'heading', label: "Heading", category: 'typography', version: 1, aliases: [], supportsChildren: false },
  'paragraph': { type: 'paragraph', label: "Paragraph", category: 'typography', version: 1, aliases: [], supportsChildren: false },
  'button': { type: 'button', label: "Button", category: 'action', version: 1, aliases: [], supportsChildren: false },
  'image': { type: 'image', label: "Image", category: 'media', version: 1, aliases: [], supportsChildren: false },
  'badge': { type: 'badge', label: "Badge", category: 'typography', version: 1, aliases: [], supportsChildren: false },
  'card': { type: 'card', label: "Card", category: 'layout', version: 1, aliases: [], supportsChildren: true },
  'divider': { type: 'divider', label: "Divider", category: 'layout', version: 1, aliases: [], supportsChildren: false },
  'spacer': { type: 'spacer', label: "Spacer", category: 'layout', version: 1, aliases: [], supportsChildren: false },
  'icon': { type: 'icon', label: "Icon", category: 'media', version: 1, aliases: [], supportsChildren: false },
  'input': { type: 'input', label: "Input", category: 'forms', version: 1, aliases: [], supportsChildren: false },
  'custom-code': { type: 'custom-code', label: "Custom code", category: 'interactive', version: 1, aliases: [], supportsChildren: false },
  'whatsapp-float': { type: 'whatsapp-float', label: "WhatsApp floating button", category: 'action', version: 1, aliases: [], supportsChildren: false },
  'mobile_footer': { type: 'mobile_footer', label: "Mobile footer", category: 'navigation', version: 1, aliases: [], supportsChildren: true },
  'whatsapp_button': { type: 'whatsapp_button', label: "WhatsApp button", category: 'action', version: 1, aliases: [], supportsChildren: false },
  'trust-badges': { type: 'trust-badges', label: "Trust badges", category: 'section', version: 1, aliases: ["trust_badges"], supportsChildren: true },
  'trust_badges': { type: 'trust_badges', label: "Trust badges (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'before-after': { type: 'before-after', label: "Before and after", category: 'interactive', version: 1, aliases: ["before_after"], supportsChildren: false },
  'before_after': { type: 'before_after', label: "Before and after (legacy)", category: 'interactive', version: 1, aliases: [], supportsChildren: false },
  'promo-banner': { type: 'promo-banner', label: "Promotion banner", category: 'section', version: 1, aliases: ["promo_banner"], supportsChildren: true },
  'promo_banner': { type: 'promo_banner', label: "Promotion banner (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: true },
  'announcement-bar': { type: 'announcement-bar', label: "Announcement bar", category: 'section', version: 1, aliases: ["announcement_bar"], supportsChildren: false },
  'announcement_bar': { type: 'announcement_bar', label: "Announcement bar (legacy)", category: 'section', version: 1, aliases: [], supportsChildren: false },
  'auth': { type: 'auth', label: "Authentication", category: 'auth', version: 1, aliases: [], supportsChildren: true },
  'auth_login': { type: 'auth_login', label: "Login form", category: 'auth', version: 1, aliases: [], supportsChildren: true },
  'auth_register': { type: 'auth_register', label: "Registration form", category: 'auth', version: 1, aliases: [], supportsChildren: true },
} satisfies Record<ComponentType, ComponentDefinition>;

export const COMPONENT_TYPE_SET: ReadonlySet<string> = new Set(Object.keys(COMPONENT_REGISTRY));
export const COMPONENT_CATEGORY_SET: ReadonlySet<string> = new Set([
  ...Object.values(COMPONENT_REGISTRY).map(({ category }) => category),
  'form', // Legacy category alias retained for saved documents.
]);

const COMPONENT_ALIAS_MAP: Readonly<Record<string, ComponentType>> = Object.freeze(
  Object.values(COMPONENT_REGISTRY).reduce((aliases, definition) => {
    definition.aliases.forEach((alias) => {
      aliases[alias] = definition.type;
    });
    return aliases;
  }, {} as Record<string, ComponentType>)
);

export function resolveComponentType(type: string): ComponentType | undefined {
  return COMPONENT_ALIAS_MAP[type] ?? (Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, type) ? type as ComponentType : undefined);
}

export function componentSupportsChildren(type: string): boolean {
  const canonicalType = resolveComponentType(type);
  return canonicalType ? COMPONENT_REGISTRY[canonicalType].supportsChildren : false;
}

export function isRegisteredComponentType(type: unknown): type is ComponentType {
  return typeof type === 'string' && COMPONENT_TYPE_SET.has(type);
}

export function isRegisteredComponentCategory(category: unknown): category is ComponentCategory {
  return typeof category === 'string' && COMPONENT_CATEGORY_SET.has(category);
}

/**
 * Returns the canonical definition for a persisted component type.
 * Legacy aliases resolve to their canonical definition without rewriting the
 * saved node; callers that need to inspect the literal stored key can use
 * getPersistedComponentDefinition instead.
 */
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  const canonicalType = resolveComponentType(type);
  return canonicalType ? COMPONENT_REGISTRY[canonicalType] : undefined;
}

/** Returns metadata for the exact persisted key, including legacy entries. */
export function getPersistedComponentDefinition(type: string): ComponentDefinition | undefined {
  return isRegisteredComponentType(type) ? COMPONENT_REGISTRY[type] : undefined;
}

/** Current schema version for a known component key, or undefined if unknown. */
export function getComponentVersion(type: string): number | undefined {
  return getComponentDefinition(type)?.version;
}
