import type { ComponentNode, Website, WebsiteLinkDestination } from './types';
import { resolveComponentType } from './componentRegistry';
import { isSafeExternalDestination } from './linkDestinations';

// ============================================================
// componentMigrations — document-level migrations for the builder
//
// The Component Registry carries per-component versions, but persisted
// documents need their own cursor so a website loaded from an old draft
// (or an old published snapshot) is upgraded exactly once, then left
// alone. Migration runs happen through normalizeWebsite on every editor
// load path: they are idempotent, keep unknown/foreign nodes untouched,
// and return the same reference when there is nothing to do.
// ============================================================

/** Highest schema version this build understands. */
export const WEBSITE_SCHEMA_VERSION = 2;

export interface WebsiteMigrationStep {
  id: string;
  /** Document schema version after this step runs. */
  toVersion: number;
  description: string;
  apply: (website: Website) => Website;
}

/** v1: rewrite legacy component type keys to their canonical registry type. */
const canonicalizeComponentTypes: WebsiteMigrationStep = {
  id: 'canonicalize-component-types',
  toVersion: 1,
  description:
    'توحيد مفاتيح أنواع المكونات القديمة (trust_badges، promo_banner، ...) إلى النوع المسجل',
  apply: (website) => {
    let changed = false;
    const components: Record<string, ComponentNode> = {};
    for (const [id, node] of Object.entries(website.components)) {
      if (!node || typeof node !== 'object') {
        components[id] = node;
        continue;
      }
      const canonical = resolveComponentType(String(node.type || ''));
      if (canonical && canonical !== node.type) {
        changed = true;
        components[id] = { ...node, type: canonical };
      } else {
        components[id] = node;
      }
    }
    // Preserve reference identity when nothing changed (idempotence).
    return changed ? { ...website, components } : website;
  },
};

/** v2: drop external/WhatsApp destinations with executable schemes. */
const stripUnsafeDestinations: WebsiteMigrationStep = {
  id: 'strip-unsafe-destinations',
  toVersion: 2,
  description:
    'إزالة الروابط الخارجية ذات الأنماط غير الآمنة (javascript:/data:) المحفوظة في المستند',
  apply: (website) => {
    let changed = false;
    const components: Record<string, ComponentNode> = {};
    for (const [id, node] of Object.entries(website.components)) {
      if (!node || typeof node !== 'object') {
        components[id] = node;
        continue;
      }
      let next = node;
      const nodeDestination = next.destination as WebsiteLinkDestination | undefined;
      if (
        (nodeDestination?.type === 'external' || nodeDestination?.type === 'whatsapp') &&
        !isSafeExternalDestination(nodeDestination)
      ) {
        const { destination: _drop, ...rest } = next as ComponentNode & { destination?: unknown };
        next = rest as ComponentNode;
        changed = true;
      }
      const propsDestination = next.props?.destination as WebsiteLinkDestination | undefined;
      if (
        (propsDestination?.type === 'external' || propsDestination?.type === 'whatsapp') &&
        !isSafeExternalDestination(propsDestination)
      ) {
        const props = { ...(next.props || {}) };
        delete props.destination;
        next = { ...next, props };
        changed = true;
      }
      components[id] = next;
    }
    return changed ? { ...website, components } : website;
  },
};

export const WEBSITE_MIGRATIONS: readonly WebsiteMigrationStep[] = [
  canonicalizeComponentTypes,
  stripUnsafeDestinations,
];

/** Migration steps that would run for the given document right now. */
export function listPendingMigrations(website: Website): string[] {
  const current = website?.schemaVersion ?? 0;
  return WEBSITE_MIGRATIONS.filter((step) => step.toVersion > current).map((step) => step.id);
}

/**
 * Bring a persisted website document up to WEBSITE_SCHEMA_VERSION.
 * Returns the same reference for already-migrated documents, so callers
 * can compare identities cheaply.
 */
export function migrateWebsiteDocument(website: Website): {
  website: Website;
  applied: string[];
} {
  if (!website || typeof website !== 'object' || !website.components) {
    return { website, applied: [] };
  }
  const from = website.schemaVersion ?? 0;
  let current = website;
  const applied: string[] = [];
  for (const step of WEBSITE_MIGRATIONS) {
    if (step.toVersion <= from) continue;
    const next = step.apply(current);
    if (next !== current) applied.push(step.id);
    current = next;
  }
  if ((current.schemaVersion ?? 0) < WEBSITE_SCHEMA_VERSION) {
    current = { ...current, schemaVersion: WEBSITE_SCHEMA_VERSION };
  }
  return { website: current, applied };
}
