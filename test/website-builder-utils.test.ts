import { normalizeWebsite } from '../apps/dashboard-web/src/components/website-builder/context/builderUtils';

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

  it('falls back to an existing container for an invalid page root', () => {
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

    expect(normalized.pages[0].rootNodeId).toBe('root');
  });
});
