import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicSiteRenderer } from '../packages/shared/src/builder/PublicSiteRenderer';
import { NodeView } from '../packages/shared/src/builder/NodeView';
import { resolveTheme } from '../packages/shared/src/builder/theme';
import {
  applyWebsiteBackgroundToPageRoot,
  computeWebsiteBackgroundStyles,
} from '../packages/shared/src/builder/responsiveStyles';

const BG_URL = 'https://storage.example.com/site-background.webp';

const BACKGROUND_SETTINGS = {
  enabled: true,
  imageUrl: BG_URL,
  size: 'cover',
  position: 'center top',
  repeat: 'no-repeat',
  attachment: 'scroll',
};

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
    id: 'website_bg_test',
    name: 'Background test',
    defaultDirection: 'rtl',
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
      root: {
        ...makeNode('root', 'container', null, children),
        // Merchants commonly keep an opaque page-root background — this is what
        // used to hide the long page background on the published site.
        styles: {
          desktop: { display: 'block', width: '100%', backgroundColor: '#ffffff' },
          mobile: { width: '100%' },
        },
      },
      ...extra,
    },
    theme: {},
    settings: { background: BACKGROUND_SETTINGS, cart: { businessType: 'services' } },
  } as any;
}

function renderRootNode(website: any) {
  const context = {
    website,
    viewport: 'desktop',
    activePage: website.pages[0],
    theme: resolveTheme({}),
    shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
    realProducts: [],
    onNavigatePage: () => undefined,
    waLink: () => null,
  } as any;
  return renderToStaticMarkup(React.createElement(NodeView, { nodeId: 'root', ctx: context }));
}

describe('website background publish parity', () => {
  it('computeWebsiteBackgroundStyles only emits CSS when enabled with an image', () => {
    expect(computeWebsiteBackgroundStyles(undefined)).toEqual({});
    expect(computeWebsiteBackgroundStyles({ enabled: true })).toEqual({});
    expect(computeWebsiteBackgroundStyles({ enabled: false, imageUrl: BG_URL })).toEqual({});

    const css = computeWebsiteBackgroundStyles(BACKGROUND_SETTINGS) as Record<string, string>;
    expect(css.backgroundImage).toBe(`url("${BG_URL}")`);
    expect(css.backgroundSize).toBe('cover');
    expect(css.backgroundPosition).toBe('center top');
    expect(css.position).toBe('relative');
  });

  it('applyWebsiteBackgroundToPageRoot mirrors the editor canvas merge only for page roots', () => {
    const base = { backgroundColor: '#ffffff' } as Record<string, string>;

    expect(applyWebsiteBackgroundToPageRoot(base, false, BACKGROUND_SETTINGS)).toBe(base);

    const merged = applyWebsiteBackgroundToPageRoot(base, true, BACKGROUND_SETTINGS) as Record<
      string,
      string
    >;
    expect(merged.backgroundColor).toBe('#ffffff');
    expect(merged.position).toBe('relative');
    expect(merged.backgroundImage).toBe(`url("${BG_URL}")`);

    const disabled = applyWebsiteBackgroundToPageRoot(base, true, {
      ...BACKGROUND_SETTINGS,
      enabled: false,
    }) as Record<string, string>;
    expect(disabled.backgroundImage).toBeUndefined();
    expect(disabled.backgroundColor).toBe('#ffffff');
  });

  it('paints the long page background on the page root even when the root has an opaque background color', () => {
    const website = makeWebsite([]);
    const markup = renderRootNode(website);

    expect(markup).toContain('background-color:#ffffff');
    expect(markup).toContain(`background-image:url(&quot;${BG_URL}&quot;)`);
    expect(markup).toContain('position:relative');
  });

  it('does not paint the page background on ordinary sections inside the page', () => {
    const website = makeWebsite(['section'], {
      section: makeNode('section', 'container', 'root', []),
    });
    const context = {
      website,
      viewport: 'desktop',
      activePage: website.pages[0],
      theme: resolveTheme({}),
      shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
      realProducts: [],
      onNavigatePage: () => undefined,
      waLink: () => null,
    } as any;

    const sectionMarkup = renderToStaticMarkup(
      React.createElement(NodeView, { nodeId: 'section', ctx: context })
    );
    expect(sectionMarkup).not.toContain('background-image');
  });

  it('renders the background on both the public wrapper and the page root after publishing', () => {
    const website = makeWebsite([]);
    const markup = renderToStaticMarkup(
      React.createElement(PublicSiteRenderer, {
        website,
        shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
        products: [],
      })
    );

    // Once on the wrapper div and once on the page root itself — the page root
    // occurrence is the fix: previously only the wrapper had it and the opaque
    // white root covered it completely.
    const occurrences = markup.split(`background-image:url(&quot;${BG_URL}&quot;)`).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('keeps the published site free of background CSS when the merchant disabled it', () => {
    const website = makeWebsite([]);
    website.settings = {
      ...website.settings,
      background: { ...BACKGROUND_SETTINGS, enabled: false },
    };

    const markup = renderToStaticMarkup(
      React.createElement(PublicSiteRenderer, {
        website,
        shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
        products: [],
      })
    );

    expect(markup).not.toContain('background-image');
  });
});
