import {
  inspectWebsiteTree,
  normalizeWebsiteTree,
} from '../packages/shared/src/builder/websiteTree';

function node(
  id: string,
  type: string,
  parentId: string | null,
  childrenIds: string[] = [],
  category = type === 'container' || type === 'grid' || type === 'flex' ? 'layout' : 'section'
) {
  return {
    id,
    name: id,
    type,
    category,
    parentId,
    childrenIds,
    props: {},
    styles: { desktop: { display: 'block' } },
  };
}

function website(components: Record<string, any>, rootNodeId = 'root') {
  return {
    id: 'website_test',
    pages: [{ id: 'page_home', name: 'Home', slug: '', rootNodeId }],
    components,
  } as any;
}

describe('shared website tree normalization and diagnostics', () => {
  it('deduplicates children, repairs parent links, and breaks recursive cycles without deleting nodes', () => {
    const input = website({
      root: node('root', 'container', null, ['section', 'section']),
      section: node('section', 'container', 'incorrect-parent', ['root', 'leaf']),
      leaf: node('leaf', 'heading', 'section'),
      unused: node('unused', 'card', 'root'),
    });
    const report = inspectWebsiteTree(input);
    const normalized = normalizeWebsiteTree(input);

    expect(report.duplicateChildren).toEqual([
      { pageId: 'page_home', parentId: 'root', childId: 'section' },
    ]);
    expect(report.cycles).toEqual([
      { pageId: 'page_home', nodeIds: ['root', 'section', 'root'] },
    ]);
    expect(normalized.components.root.childrenIds).toEqual(['section']);
    expect(normalized.components.section.parentId).toBe('root');
    expect(normalized.components.section.childrenIds).toEqual(['leaf']);
    expect(normalized.components.root.parentId).toBeNull();
    expect(normalized.components.unused).toBeDefined();
    expect(normalized.components.unused.parentId).toBeNull();
    expect(normalized.components.unused.childrenIds).toEqual([]);
  });

  it('keeps the first parent path and reports components referenced by multiple parents', () => {
    const input = website({
      root: node('root', 'container', null, ['first', 'second']),
      first: node('first', 'container', 'root', ['shared']),
      second: node('second', 'container', 'root', ['shared']),
      shared: node('shared', 'card', 'second'),
    });
    const normalized = normalizeWebsiteTree(input);

    expect(inspectWebsiteTree(input).multipleParents).toEqual([
      { pageId: 'page_home', nodeId: 'shared', parentIds: ['first', 'second'] },
    ]);
    expect(normalized.components.first.childrenIds).toEqual(['shared']);
    expect(normalized.components.second.childrenIds).toEqual([]);
    expect(normalized.components.shared.parentId).toBe('first');
  });

  it('renders only one valid Products section and detaches Products from Hero', () => {
    const input = website({
      root: node('root', 'container', null, ['hero', 'products_one', 'products_two']),
      hero: node('hero', 'hero', 'root', ['products_in_hero']),
      products_in_hero: node('products_in_hero', 'products', 'hero'),
      products_one: node('products_one', 'products', 'root', ['design_card']),
      products_two: node('products_two', 'products', 'root'),
      design_card: node('design_card', 'card', 'products_one'),
    });
    const report = inspectWebsiteTree(input);
    const normalized = normalizeWebsiteTree(input);

    expect(report.invalidProductParents).toEqual([
      {
        pageId: 'page_home',
        nodeId: 'products_in_hero',
        parentId: 'hero',
        parentType: 'hero',
      },
    ]);
    expect(report.duplicateProductSections[0].nodeIds).toEqual([
      'products_in_hero',
      'products_one',
      'products_two',
    ]);
    expect(normalized.components.root.childrenIds).toEqual(['hero', 'products_one']);
    expect(normalized.components.hero.childrenIds).toEqual([]);
    expect(normalized.components.products_one.childrenIds).toEqual(['design_card']);
    expect(normalized.components.products_two).toBeDefined();
    expect(normalized.components.products_two.parentId).toBeNull();
  });

  it('does not invent a root when rootNodeId is missing and reports the invalid root', () => {
    const input = website({ root: node('root', 'container', null) }, 'missing');
    expect(inspectWebsiteTree(input).missingRootNodeIds).toEqual([
      { pageId: 'page_home', rootNodeId: 'missing' },
    ]);
    expect(normalizeWebsiteTree(input).pages[0].rootNodeId).toBe('missing');
    expect(normalizeWebsiteTree(input).components.root.parentId).toBeNull();
  });

  it('reports missing mobile styles and strips non-serializable responsive values', () => {
    const input = website({
      root: {
        ...node('root', 'container', null, ['child']),
        styles: {
          desktop: { width: '100%', opacity: 0.7, padding: { invalid: true } },
          mobile: { width: ['100%'] },
        },
      },
      child: node('child', 'heading', 'root'),
    });
    const report = inspectWebsiteTree(input);
    const normalized = normalizeWebsiteTree(input);

    expect(report.missingMobileStyles).toContainEqual({ pageIds: ['page_home'], nodeId: 'child' });
    expect(normalized.components.root.styles).toEqual({
      desktop: { width: '100%', opacity: 0.7 },
      mobile: {},
    });
    expect(report.invalidResponsiveValues).toEqual([
      { pageIds: ['page_home'], nodeId: 'root', viewport: 'desktop', property: 'padding' },
      { pageIds: ['page_home'], nodeId: 'root', viewport: 'mobile', property: 'width' },
    ]);
  });
});
