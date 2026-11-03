import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicSiteRenderer } from '../packages/shared/src/builder/PublicSiteRenderer';
import { NodeView } from '../packages/shared/src/builder/NodeView';
import { resolveTheme } from '../packages/shared/src/builder/theme';

function makeNode(
  id: string,
  type: string,
  parentId: string | null,
  childrenIds: string[] = [],
  props: Record<string, unknown> = {},
  category = type === 'container' ? 'layout' : 'section'
) {
  return {
    id,
    name: id,
    type,
    category,
    parentId,
    childrenIds,
    props,
    styles: { desktop: { display: 'block', width: '100%' }, mobile: { width: '100%' } },
  };
}

function makeWebsite(children: string[], extra: Record<string, any> = {}) {
  return {
    id: 'website_public_test',
    name: 'Public test',
    defaultDirection: 'ltr',
    pages: [
      {
        id: 'page_home',
        name: 'Home',
        slug: '',
        rootNodeId: 'root',
        metadata: { isHomePage: true },
      },
    ],
    components: {
      root: makeNode('root', 'container', null, children),
      ...extra,
    },
    theme: {},
    settings: { cart: { businessType: 'services', showCartIcon: false } },
  } as any;
}

function renderSite(website: any) {
  return renderToStaticMarkup(
    React.createElement(PublicSiteRenderer, {
      website,
      shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
      products: [{ id: 'catalog-1', title: 'Real catalog item', price: 100, image: '' }],
      onAddToCart: () => undefined,
    })
  );
}

function renderNodeAtViewport(viewport: 'desktop' | 'tablet' | 'mobile') {
  const website = makeWebsite([], {
    root: {
      ...makeNode('root', 'container', null),
      styles: {
        desktop: {
          display: 'grid',
          width: '1200px',
          gridColumns: 'repeat(4, minmax(0, 1fr))',
        },
      },
    },
  });
  const context = {
    website,
    viewport,
    activePage: website.pages[0],
    theme: resolveTheme({}),
    shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
    realProducts: [],
    onNavigatePage: () => undefined,
    waLink: () => null,
  } as any;
  return renderToStaticMarkup(React.createElement(NodeView, { nodeId: 'root', ctx: context }));
}

describe('published /site renderer product tree', () => {
  it('renders the same responsive safety rules at mobile and tablet breakpoints', () => {
    const mobileMarkup = renderNodeAtViewport('mobile');
    const tabletMarkup = renderNodeAtViewport('tablet');
    expect(mobileMarkup).toContain('width:100%');
    expect(mobileMarkup).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
    expect(tabletMarkup).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
  });

  it('renders one Products section only at its valid page-root position and tracks its builder node', () => {
    const website = makeWebsite(['products-one', 'products-two'], {
      'products-one': makeNode('products-one', 'products', 'root', [], { title: 'Catalog' }),
      'products-two': makeNode('products-two', 'products', 'root', [], { title: 'Duplicate' }),
    });

    const markup = renderSite(website);
    expect((markup.match(/data-section="products"/g) || []).length).toBe(1);
    expect(markup).toContain('id="products-one"');
    expect(markup).toContain('data-builder-node-id="products-one"');
    expect(markup).toContain('Real catalog item');
    expect(markup).not.toContain('Duplicate');
  });

  it('does not render a real catalog card from an ordinary card node without a Products section', () => {
    const website = makeWebsite(['design-card'], {
      'design-card': makeNode('design-card', 'card', 'root', [], {
        title: 'Design card',
        image: 'https://example.invalid/template.png',
        price: '10',
        features: [],
      }),
    });

    const markup = renderSite(website);
    expect(markup).toContain('Design card');
    expect(markup).not.toContain('Real catalog item');
    expect(markup).not.toContain('data-section="products"');
  });

  it('does not display Products nested under Hero or add them outside the actual tree location', () => {
    const website = makeWebsite(['hero'], {
      hero: makeNode('hero', 'hero', 'root', ['products-in-hero']),
      'products-in-hero': makeNode('products-in-hero', 'products', 'hero', [], { title: 'Hidden' }),
    });

    const markup = renderSite(website);
    expect(markup).not.toContain('data-section="products"');
    expect(markup).not.toContain('Real catalog item');
    expect(markup).not.toContain('Hidden');
  });
});
