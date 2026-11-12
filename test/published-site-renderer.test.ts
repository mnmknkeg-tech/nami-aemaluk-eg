import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PublicSiteRenderer,
  resolvePreviewLink,
} from '../packages/shared/src/builder/PublicSiteRenderer';
import { NodeView } from '../packages/shared/src/builder/NodeView';
import { NodeSkeleton } from '../packages/shared/src/builder/skeleton/NodeSkeleton';
import { resolveTheme } from '../packages/shared/src/builder/theme';
import { loadFullWebsiteTemplate } from '../apps/dashboard-web/src/components/website-builder/data/registry';

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

function renderWebsiteNodeAtViewport(website: any, viewport: 'desktop' | 'tablet' | 'mobile') {
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
  it('renders complete RTL template structures and images in isolated preview mode', () => {
    ['site_restaurant_cafe', 'site_clinic_hospital', 'site_opal_fashion'].forEach((templateId) => {
      const website = loadFullWebsiteTemplate(templateId).website;
      const originalWebsite = JSON.stringify(website);
      const homePage =
        website.pages.find((page) => page.metadata?.isHomePage) ||
        website.pages.find((page) => page.id === 'page_home') ||
        website.pages[0];
      const reachable = new Set<string>();
      const visit = (nodeId: string) => {
        if (reachable.has(nodeId)) return;
        const node = website.components[nodeId];
        if (!node) return;
        reachable.add(nodeId);
        node.childrenIds.forEach(visit);
      };
      visit(homePage.rootNodeId);
      const image = [...reachable]
        .map((nodeId) => website.components[nodeId])
        .find((node) => node.type === 'image' && typeof node.props.src === 'string');

      const markup = renderToStaticMarkup(
        React.createElement(PublicSiteRenderer, {
          website,
          shop: { id: 'template-preview', name: website.name, slug: 'template-preview' },
          products: [
            { id: 'merchant-product', title: 'Merchant-only product', price: 999, image: '' },
          ],
          previewMode: true,
          previewViewport: 'desktop',
        })
      );

      expect(markup).toContain(`id="${homePage.rootNodeId}"`);
      expect(markup).toContain('direction:rtl');
      expect(reachable.size).toBeGreaterThan(5);
      expect(markup).not.toContain('Merchant-only product');
      if (image) expect(markup).toContain(image.props.src.split('?')[0]);
      expect(JSON.stringify(website)).toBe(originalWebsite);
    });
  });

  it('keeps preview links inside the template while resolving internal page links', () => {
    const pages = [
      { id: 'page_home', slug: 'home' },
      { id: 'page_services', slug: 'services' },
    ];

    expect(resolvePreviewLink('/services', pages)).toEqual({
      type: 'page',
      pageId: 'page_services',
    });
    expect(resolvePreviewLink('#services', pages)).toEqual({
      type: 'page',
      pageId: 'page_services',
    });
    expect(resolvePreviewLink('#hero', pages)).toEqual({ type: 'anchor' });
    expect(resolvePreviewLink('https://example.com', pages)).toEqual({ type: 'blocked' });
    expect(resolvePreviewLink('//example.com', pages)).toEqual({ type: 'blocked' });
    expect(resolvePreviewLink('mailto:merchant@example.com', pages)).toEqual({ type: 'blocked' });
    expect(resolvePreviewLink('https://wa.me/201000000000', pages)).toEqual({ type: 'blocked' });
    expect(resolvePreviewLink('/site/store/checkout', pages)).toEqual({ type: 'blocked' });
  });

  it('renders the merchant-owned mobile brand node instead of replacing it with shop metadata', () => {
    const website = makeWebsite([], {
      root: makeNode('header-root', 'header', null, ['brand-title']),
      'brand-title': makeNode(
        'brand-title',
        'heading',
        'header-root',
        [],
        { text: 'Merchant brand title', tag: 'h1' },
        'content'
      ),
    });
    website.pages[0].rootNodeId = 'header-root';
    const markup = renderWebsiteNodeAtViewport(website, 'mobile');

    expect(markup).toContain('Merchant brand title');
    expect(markup).not.toContain('>Shop</span>');
  });

  it('preserves the saved RTL direction in the public renderer', () => {
    const website = makeWebsite([]);
    website.defaultDirection = 'rtl';

    expect(renderSite(website)).toContain('direction:rtl');
  });

  it('renders the same responsive safety rules at mobile and tablet breakpoints', () => {
    const mobileMarkup = renderNodeAtViewport('mobile');
    const tabletMarkup = renderNodeAtViewport('tablet');
    expect(mobileMarkup).toContain('width:100%');
    expect(mobileMarkup).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
    expect(tabletMarkup).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
  });

  it('keeps responsive product placeholders aligned with the mobile and tablet viewport', () => {
    const website = makeWebsite([], {
      products: makeNode('products', 'products', null, [], {}, 'section'),
    });
    const node = website.components.products;
    const mobile = renderToStaticMarkup(
      React.createElement(NodeSkeleton, { node, website, viewport: 'mobile' })
    );
    const tablet = renderToStaticMarkup(
      React.createElement(NodeSkeleton, { node, website, viewport: 'tablet' })
    );

    expect(mobile).toContain('grid-template-columns:repeat(1, minmax(0,1fr))');
    expect(tablet).toContain('grid-template-columns:repeat(2, minmax(0,1fr))');
  });

  it('keeps ordinary mobile text containing separators and dropdown symbols visible', () => {
    const website = makeWebsite(['section'], {
      section: makeNode('section', 'container', 'root', ['copy']),
      copy: makeNode(
        'copy',
        'paragraph',
        'section',
        [],
        { text: 'توصيل•تركيب|خدمة متاحة ▾' },
        'content'
      ),
    });

    const markup = renderWebsiteNodeAtViewport(website, 'mobile');
    expect(markup).toContain('توصيل•تركيب|خدمة متاحة ▾');
    expect(markup).not.toContain('display:none');
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

  it('renders layout grids as structural wrappers without binding shop catalog products', () => {
    const website = makeWebsite(['layout-grid'], {
      'layout-grid': makeNode(
        'layout-grid',
        'grid',
        'root',
        ['layout-child'],
        {
          title: 'Layout grid',
          products: [{ id: 'template-1', title: 'Template product', price: 10 }],
        },
        'layout'
      ),
      'layout-child': makeNode(
        'layout-child',
        'heading',
        'layout-grid',
        [],
        { text: 'Layout child' },
        'content'
      ),
    });

    const markup = renderSite(website);
    expect(markup).toContain('Layout child');
    expect(markup).not.toContain('Real catalog item');
    expect(markup).not.toContain('Template product');
    expect(markup).not.toContain('Layout grid');
  });

  it('continues binding catalog products into non-layout grids', () => {
    const website = makeWebsite(['product-grid'], {
      'product-grid': makeNode('product-grid', 'grid', 'root', [], { title: 'Catalog' }, 'section'),
    });

    expect(renderSite(website)).toContain('Real catalog item');
  });

  it('preserves responsive styles on structural grids at the mobile viewport', () => {
    const website = makeWebsite([], {
      root: {
        ...makeNode('root', 'grid', null, ['layout-child'], {}, 'layout'),
        styles: {
          desktop: {
            display: 'grid',
            width: '1200px',
            gridColumns: 'repeat(4, minmax(0, 1fr))',
          },
        },
      },
      'layout-child': makeNode(
        'layout-child',
        'heading',
        'root',
        [],
        { text: 'Mobile layout child' },
        'content'
      ),
    });

    const markup = renderWebsiteNodeAtViewport(website, 'mobile');
    expect(markup).toContain('width:100%');
    expect(markup).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
    expect(markup).toContain('Mobile layout child');
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

describe('published cart visibility and icon parity', () => {
  const makeCartWebsite = (
    cart: Record<string, unknown>,
    headerProps: Record<string, unknown> = {}
  ) => {
    const website = makeWebsite([], {
      root: makeNode('root', 'header', null, [], headerProps),
    });
    website.settings = { cart };
    return website;
  };

  it('does not render a cart icon in the published Header or floating mode when globally disabled', () => {
    const website = makeCartWebsite({
      enabled: false,
      businessType: 'orders',
      showCartIcon: true,
      position: 'both',
      iconType: 'Store',
    });

    expect(renderSite(website)).not.toContain('data-cart-icon=');
  });

  it('uses the global icon over a legacy Header icon in mobile preview', () => {
    const website = makeCartWebsite(
      {
        enabled: true,
        businessType: 'orders',
        showCartIcon: true,
        position: 'header',
        iconType: 'Package',
      },
      { cartIcon: 'ShoppingCart' }
    );

    const markup = renderWebsiteNodeAtViewport(website, 'mobile');
    expect(markup).toContain('data-cart-icon="Package"');
    expect(markup).not.toContain('data-cart-icon="ShoppingCart"');
  });

  it('keeps Header-local show explicit but never lets it bypass global disabled', () => {
    const legacyHidden = makeCartWebsite(
      {
        enabled: true,
        businessType: 'orders',
        showCartIcon: true,
        position: 'header',
      },
      { hideCart: true, cartVisibilityOverride: 'show' }
    );
    expect(renderWebsiteNodeAtViewport(legacyHidden, 'desktop')).toContain('data-cart-icon=');

    legacyHidden.settings.cart.enabled = false;
    expect(renderWebsiteNodeAtViewport(legacyHidden, 'desktop')).not.toContain('data-cart-icon=');
  });

  it('does not put a floating-only cart in the published Header', () => {
    const website = makeCartWebsite({
      enabled: true,
      businessType: 'orders',
      showCartIcon: true,
      position: 'floating',
      iconType: 'CreditCard',
    });

    const markup = renderWebsiteNodeAtViewport(website, 'mobile');
    expect(markup).not.toContain('data-cart-icon=');
    expect(renderSite(website)).toContain('data-cart-icon="CreditCard"');
  });
});

describe('published cart edge cases', () => {
  it('mirrors the floating Cart to the right in an RTL published site', () => {
    const website = makeWebsite([], {
      root: makeNode('root', 'header', null, []),
    });
    website.defaultDirection = 'rtl';
    website.settings = {
      cart: {
        enabled: true,
        businessType: 'orders',
        showCartIcon: true,
        position: 'floating',
      },
    };

    const markup = renderSite(website);
    expect(markup).toContain('rtl:right-6');
    expect(markup).toContain('data-cart-icon="ShoppingBag"');
  });

  it('does not hide subscription plan CTAs when order-cart controls are unsupported', () => {
    const website = makeWebsite(['pricing'], {
      pricing: makeNode('pricing', 'pricing', 'root', [], {
        title: 'Plans',
        tiers: [
          {
            id: 'monthly-plan',
            title: 'اشتراك شهري',
            price: '100',
            ctaText: 'اشترك الآن',
            features: [],
          },
        ],
      }),
    });
    website.settings = {
      cart: {
        enabled: true,
        businessType: 'subscriptions',
        showCartIcon: true,
        position: 'both',
      },
    };

    const context = {
      website,
      viewport: 'mobile',
      activePage: website.pages[0],
      theme: resolveTheme({}),
      shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
      realProducts: [],
      realSubscriptionPlans: [],
      onNavigatePage: () => undefined,
      onSubscribePlan: () => undefined,
      waLink: () => null,
    } as any;
    const markup = renderToStaticMarkup(
      React.createElement(NodeView, { nodeId: 'root', ctx: context })
    );

    expect(markup).toContain('اشترك الآن');
    expect(markup).not.toContain('data-cart-icon=');
  });
});
