import {
  createUniqueBuilderId,
  normalizeWebsite,
} from '../apps/dashboard-web/src/components/website-builder/context/builderUtils';

describe('normalizeWebsite', () => {
  it('repairs missing node fields and removes invalid children', () => {
    const normalized = normalizeWebsite({
      pages: [{ id: 'home', name: 'Home', slug: '/', rootNodeId: 'root' }],
      components: {
        root: {
          id: 'root',
          name: 'Root',
          type: 'container',
          category: 'layout',
          parentId: 'missing-parent',
          childrenIds: ['child', 'child', 'missing-child'],
        },
        child: {
          id: 'child',
          name: 'Child',
          type: 'text',
          category: 'content',
        },
      },
    } as any);

    expect(normalized.components.root.parentId).toBeNull();
    expect(normalized.components.root.childrenIds).toEqual(['child']);
    expect(normalized.components.root.props).toEqual({});
    expect(normalized.components.root.styles).toEqual({});
  });

  it('creates an independent recovered root for an invalid page root', () => {
    const normalized = normalizeWebsite({
      pages: [{ id: 'home', name: 'Home', slug: '/', rootNodeId: 'missing' }],
      components: {
        root: {
          id: 'root',
          name: 'Root',
          type: 'container',
          category: 'layout',
          childrenIds: [],
        },
      },
    } as any);

    expect(normalized.pages[0].rootNodeId).toBe('recovered_root_home');
    expect(normalized.pages[0].rootNodeId).not.toBe('root');
    expect(normalized.components[normalized.pages[0].rootNodeId].childrenIds).toEqual([]);
    expect(normalized.components.root).toBeDefined();
  });

  it('gives each invalid page root a separate recovery container without sharing another page tree', () => {
    const normalized = normalizeWebsite({
      pages: [
        { id: 'home', name: 'Home', slug: '/', rootNodeId: 'root' },
        { id: 'about', name: 'About', slug: '/about', rootNodeId: 'missing' },
        { id: 'contact', name: 'Contact', slug: '/contact', rootNodeId: 'missing-too' },
      ],
      components: {
        root: {
          id: 'root',
          name: 'Root',
          type: 'container',
          category: 'layout',
          parentId: null,
          childrenIds: ['private-section'],
        },
        'private-section': {
          id: 'private-section',
          name: 'Home-only content',
          type: 'section',
          category: 'section',
          parentId: 'root',
          childrenIds: [],
        },
      },
    } as any);

    const [home, about, contact] = normalized.pages;
    expect(about.rootNodeId).not.toBe(contact.rootNodeId);
    expect(about.rootNodeId).not.toBe(home.rootNodeId);
    expect(normalized.components[about.rootNodeId].childrenIds).toEqual([]);
    expect(normalized.components[contact.rootNodeId].childrenIds).toEqual([]);
    expect(normalized.components['private-section']).toBeDefined();
  });
});

describe('createUniqueBuilderId', () => {
  it('adds a collision suffix instead of overwriting an existing component ID', () => {
    const usedIds = new Set(['component_same']);
    const id = createUniqueBuilderId('component', usedIds, () => 'same');
    expect(id).toBe('component_same_1');
    expect(usedIds.has(id)).toBe(true);
  });
});
