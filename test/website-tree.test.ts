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

  it('clones shared Header/Footer component trees for independent pages during normalization', () => {
    const input = {
      id: 'multi_page',
      pages: [
        { id: 'page_one', name: 'One', slug: '', rootNodeId: 'root_one' },
        { id: 'page_two', name: 'Two', slug: 'two', rootNodeId: 'root_two' },
      ],
      components: {
        root_one: node('root_one', 'container', null, ['comp_header', 'section_one']),
        root_two: node('root_two', 'container', null, ['comp_header', 'section_two']),
        comp_header: node('comp_header', 'header', null, ['header_inner']),
        header_inner: node('header_inner', 'container', 'comp_header', ['header_cta_btn']),
        header_cta_btn: node('header_cta_btn', 'button', 'header_inner'),
        section_one: node('section_one', 'hero', 'root_one'),
        section_two: node('section_two', 'hero', 'root_two'),
      },
    } as any;

    const normalized = normalizeWebsiteTree(input);
    const firstHeaderId = normalized.components.root_one.childrenIds[0];
    const secondHeaderId = normalized.components.root_two.childrenIds[0];

    expect(firstHeaderId).toBe('comp_header');
    expect(secondHeaderId).not.toBe(firstHeaderId);
    expect(normalized.components[secondHeaderId].type).toBe('header');
    const clonedInnerId = normalized.components[secondHeaderId].childrenIds[0];
    const clonedCtaId = normalized.components[clonedInnerId].childrenIds[0];
    expect(clonedCtaId).not.toBe('header_cta_btn');
    expect(normalized.components[clonedCtaId].type).toBe('button');
    expect(normalized.pages[1].rootNodeId).toBe('root_two');
  });

  it('recovers duplicate page root ownership with a cloned independent root', () => {
    const input = {
      id: 'duplicate_roots',
      pages: [
        { id: 'page_one', name: 'One', slug: '', rootNodeId: 'root' },
        { id: 'page_two', name: 'Two', slug: 'two', rootNodeId: 'root' },
      ],
      components: {
        root: node('root', 'container', null, ['hero']),
        hero: node('hero', 'hero', 'root'),
      },
    } as any;

    const normalized = normalizeWebsiteTree(input);

    expect(normalized.pages[0].rootNodeId).toBe('root');
    expect(normalized.pages[1].rootNodeId).not.toBe('root');
    expect(normalized.components[normalized.pages[1].rootNodeId].childrenIds).toHaveLength(1);
    expect(normalized.components[normalized.pages[1].rootNodeId].childrenIds[0]).not.toBe('hero');
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
