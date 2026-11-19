import {
  listPendingMigrations,
  migrateWebsiteDocument,
  WEBSITE_MIGRATIONS,
  WEBSITE_SCHEMA_VERSION,
  type ComponentNode,
  type Website,
} from '../packages/shared/src/builder';

const makeNode = (
  id: string,
  type: string,
  props: Record<string, unknown> = {},
  extra: Partial<ComponentNode> = {}
): ComponentNode =>
  ({
    id,
    name: id,
    type,
    category: 'section',
    parentId: null,
    childrenIds: [],
    props,
    styles: { desktop: {} },
    ...extra,
  }) as ComponentNode;

const legacyWebsite = (components: Record<string, ComponentNode>): Website =>
  ({
    id: 'site_1',
    tenantId: 'tenant_1',
    name: 'موقع قديم',
    domain: 'old.example.com',
    subdomain: 'old',
    activity: 'cafe_restaurant',
    language: 'ar',
    defaultDirection: 'rtl',
    pages: [
      {
        id: 'home',
        name: 'الرئيسية',
        slug: 'home',
        rootNodeId: 'root',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        metadata: { title: 'الرئيسية', description: '', slug: 'home', isHomePage: true },
      },
    ],
    components,
    theme: {} as Website['theme'],
    currentDraftVersion: 3,
  }) as unknown as Website;

describe('website document migrations (registry stage 1)', () => {
  it('rewrites legacy component type keys to their canonical registry type', () => {
    const source = legacyWebsite({
      root: makeNode('root', 'container'),
      grid1: makeNode('grid1', 'bento-grid'),
      grid2: makeNode('grid2', 'services-grid'),
      contact1: makeNode('contact1', 'contact-section'),
      trust1: makeNode('trust1', 'trust_badges'),
      promo1: makeNode('promo1', 'promo_banner'),
      beforeAfter: makeNode('beforeAfter', 'before_after'),
      bar: makeNode('bar', 'announcement_bar'),
    });

    const { website: migrated, applied } = migrateWebsiteDocument(source);
    expect(applied).toContain('canonicalize-component-types');
    expect(migrated.components.grid1.type).toBe('bento');
    expect(migrated.components.grid2.type).toBe('services');
    expect(migrated.components.contact1.type).toBe('contact');
    expect(migrated.components.trust1.type).toBe('trust-badges');
    expect(migrated.components.promo1.type).toBe('promo-banner');
    expect(migrated.components.beforeAfter.type).toBe('before-after');
    expect(migrated.components.bar.type).toBe('announcement-bar');
    // Canonical and unknown keys stay exactly as they were.
    expect(migrated.components.root.type).toBe('container');
    expect(migrated.schemaVersion).toBe(WEBSITE_SCHEMA_VERSION);
  });

  it('strips saved destinations with executable schemes from nodes and props', () => {
    const source = legacyWebsite({
      root: makeNode('root', 'container'),
      bad: {
        ...makeNode('bad', 'button'),
        destination: { type: 'external', url: 'javascript:alert(1)' },
      } as ComponentNode,
      badProp: makeNode('badProp', 'image', {
        destination: { type: 'whatsapp', url: 'javascript:alert(1)//wa.me/123' },
      }),
      fine: {
        ...makeNode('fine', 'button'),
        destination: { type: 'external', url: 'https://example.com' },
      } as ComponentNode,
      pageLink: {
        ...makeNode('pageLink', 'button'),
        destination: { type: 'page', pageId: 'home' },
      } as ComponentNode,
    });

    const { website: migrated, applied } = migrateWebsiteDocument(source);
    expect(applied).toContain('strip-unsafe-destinations');
    expect(migrated.components.bad.destination).toBeUndefined();
    expect(migrated.components.badProp.props.destination).toBeUndefined();
    // Safe destinations survive untouched.
    expect(migrated.components.fine.destination).toEqual({
      type: 'external',
      url: 'https://example.com',
    });
    expect(migrated.components.pageLink.destination).toEqual({ type: 'page', pageId: 'home' });
  });

  it('is idempotent: a migrated document returns the same reference untouched', () => {
    const source = legacyWebsite({
      root: makeNode('root', 'container'),
      legacy: makeNode('legacy', 'trust_badges'),
    });

    const first = migrateWebsiteDocument(source);
    // `applied` only records steps that actually changed content; the
    // destination-cleanup pass had nothing to strip in this fixture.
    expect(first.applied).toEqual(['canonicalize-component-types']);
    expect(listPendingMigrations(first.website)).toEqual([]);

    const second = migrateWebsiteDocument(first.website);
    expect(second.website).toBe(first.website);
    expect(second.applied).toEqual([]);
    expect(second.website.schemaVersion).toBe(WEBSITE_SCHEMA_VERSION);
  });

  it('reports pending migrations accurately and never invents changes', () => {
    const fresh = legacyWebsite({ root: makeNode('root', 'container') });
    expect(listPendingMigrations(fresh)).toEqual(WEBSITE_MIGRATIONS.map((step) => step.id));

    // Already current documents with nothing to change keep their identity.
    const current = { ...fresh, schemaVersion: WEBSITE_SCHEMA_VERSION };
    const result = migrateWebsiteDocument(current);
    expect(result.website).toBe(current);
    expect(result.applied).toEqual([]);
  });

  it('leaves foreign and malformed component records alone', () => {
    const source = legacyWebsite({
      root: makeNode('root', 'container'),
      foreign: makeNode('foreign', 'totally-new-section'),
      broken: null,
    } as unknown as Record<string, ComponentNode>);

    const { website: migrated } = migrateWebsiteDocument(source);
    expect(migrated.components.foreign.type).toBe('totally-new-section');
    expect(migrated.components.broken).toBeNull();
  });
});
