import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  followPublishedDestination,
  getMobileDrawerPages,
  isBrandHeadingNode,
  resolveAnnouncementBar,
  resolveBrandLogoUrl,
  resolvePublishedLinkDestination,
  shouldShowHeaderLoginButton,
} from '../packages/shared/src/builder/publishedParity';
import { inferWebsiteLinkDestinationFromLabel } from '../packages/shared/src/builder/linkDestinations';
import { PublicSiteRenderer } from '../packages/shared/src/builder/PublicSiteRenderer';
import { NodeView } from '../packages/shared/src/builder/NodeView';
import { resolveTheme } from '../packages/shared/src/builder/theme';

function makeNode(
  id: string,
  type: string,
  parentId: string | null,
  childrenIds: string[] = [],
  props: Record<string, unknown> = {}
) {
  return {
    id,
    name: id,
    type,
    category: type === 'container' ? 'layout' : 'section',
    parentId,
    childrenIds,
    props,
    styles: { desktop: { display: 'block', width: '100%' }, mobile: { width: '100%' } },
  };
}

/** Two pages: home + a standalone promo landing page, with a contact page. */
function makeWebsite(extra: Record<string, any> = {}) {
  return {
    id: 'website_parity_test',
    name: 'Parity test',
    defaultDirection: 'rtl',
    pages: [
      {
        id: 'page_home',
        name: 'الرئيسية',
        slug: '',
        rootNodeId: 'root',
        metadata: { isHomePage: true },
      },
      {
        id: 'page_contact',
        name: 'تواصل معنا',
        slug: 'contact',
        rootNodeId: 'root_contact',
        metadata: { placement: 'header_direct' },
      },
      {
        id: 'page_promo',
        name: 'عرض ترويجي خاص',
        slug: 'promo',
        rootNodeId: 'root_promo',
        metadata: { placement: 'standalone' },
      },
    ],
    components: {
      root: makeNode('root', 'container', null, []),
      root_contact: makeNode('root_contact', 'container', null, []),
      root_promo: makeNode('root_promo', 'container', null, []),
      ...extra,
    },
    theme: {},
    settings: {},
  } as any;
}

describe('published parity helpers', () => {
  describe('shouldShowHeaderLoginButton', () => {
    const node = { props: {} };
    it('hides the login button when auth is disabled (editor parity)', () => {
      expect(shouldShowHeaderLoginButton({ settings: {} }, node)).toBe(false);
      expect(shouldShowHeaderLoginButton({ settings: { auth: { enabled: false } } }, node)).toBe(
        false
      );
    });
    it('shows the login button when auth is enabled and nothing hides it', () => {
      expect(shouldShowHeaderLoginButton({ settings: { auth: { enabled: true } } }, node)).toBe(
        true
      );
    });
    it('honors the headerButton.show and node.props.showLogin overrides', () => {
      expect(
        shouldShowHeaderLoginButton(
          {
            settings: { auth: { enabled: true, headerButton: { show: false } } },
          },
          node
        )
      ).toBe(false);
      expect(
        shouldShowHeaderLoginButton(
          { settings: { auth: { enabled: true } } },
          { props: { showLogin: false } }
        )
      ).toBe(false);
    });
  });

  describe('getMobileDrawerPages', () => {
    it('keeps the home page and normal pages but excludes standalone landing pages', () => {
      const website = makeWebsite();
      const ids = getMobileDrawerPages(website).map((page) => page.id);
      expect(ids).toContain('page_home');
      expect(ids).toContain('page_contact');
      expect(ids).not.toContain('page_promo');
    });
  });

  describe('brand headings', () => {
    it('detects brand/logo headings like the editor canvas', () => {
      expect(isBrandHeadingNode({ id: 'header_brand', name: 'header_brand' })).toBe(true);
      expect(isBrandHeadingNode({ id: 'rest_logo__1', name: 'x' })).toBe(true);
      expect(isBrandHeadingNode({ id: 'comp_1', name: 'شعار المتجر' })).toBe(true);
      expect(isBrandHeadingNode({ id: 'comp_2', name: 'عنوان عادي' })).toBe(false);
    });
    it('resolves the logo from the node first, then website branding', () => {
      const website = makeWebsite();
      website.settings.branding = { logoUrl: 'https://cdn.example.com/brand.png' };
      expect(
        resolveBrandLogoUrl(website, { props: { logoUrl: 'https://cdn.example.com/n.png' } })
      ).toBe('https://cdn.example.com/n.png');
      expect(resolveBrandLogoUrl(website, { props: {} })).toBe('https://cdn.example.com/brand.png');
      expect(resolveBrandLogoUrl(makeWebsite(), { props: {} })).toBeNull();
    });
  });

  describe('resolveAnnouncementBar', () => {
    it('returns null when disabled or empty (no dead bar on published pages)', () => {
      expect(resolveAnnouncementBar({ settings: {} })).toBeNull();
      expect(
        resolveAnnouncementBar({ settings: { announcement: { enabled: false, text: 'hi' } } })
      ).toBeNull();
      expect(
        resolveAnnouncementBar({ settings: { announcement: { enabled: true, text: '  ' } } })
      ).toBeNull();
    });
    it('returns the announcement when enabled with text', () => {
      const announcement = { enabled: true, text: 'خصم 30٪ اليوم' };
      expect(resolveAnnouncementBar({ settings: { announcement } })).toEqual(announcement);
    });
  });

  describe('resolvePublishedLinkDestination', () => {
    it('prefers an explicit destination', () => {
      const website = makeWebsite();
      const destination = { type: 'page', pageId: 'page_contact' } as const;
      expect(resolvePublishedLinkDestination(website, { destination, url: '/promo' })).toEqual(
        destination
      );
    });
    it('resolves legacy pageId and url slug fields to pages', () => {
      const website = makeWebsite();
      expect(resolvePublishedLinkDestination(website, { pageId: 'page_contact' })).toEqual({
        type: 'page',
        pageId: 'page_contact',
      });
      expect(resolvePublishedLinkDestination(website, { url: '/contact' })).toEqual({
        type: 'page',
        pageId: 'page_contact',
      });
    });
    it('infers exact page-name matches for label-only footer links on demand', () => {
      const website = makeWebsite();
      expect(
        resolvePublishedLinkDestination(website, { text: 'تواصل معنا' }, { inferFromLabel: true })
      ).toEqual({ type: 'page', pageId: 'page_contact' });
      // Without the opt-in, label-only sources stay unresolved (NodeView parity).
      expect(resolvePublishedLinkDestination(website, { text: 'تواصل معنا' })).toBeUndefined();
    });
  });

  describe('followPublishedDestination', () => {
    const baseCtx = () => {
      const calls = {
        navigate: [] as string[],
        cart: 0,
        external: [] as string[],
        scroll: [] as string[],
      };
      const ctx = {
        website: makeWebsite(),
        activePageId: 'page_home',
        onNavigatePage: (pageId: string) => calls.navigate.push(pageId),
        onOpenCart: () => {
          calls.cart += 1;
        },
        onExternalUrl: (url: string) => calls.external.push(url),
        scrollToSection: (sectionId: string) => calls.scroll.push(sectionId),
      };
      return { calls, ctx };
    };

    it('opens external/whatsapp URLs through the renderer hook', () => {
      const { calls, ctx } = baseCtx();
      expect(
        followPublishedDestination(
          { type: 'external', url: 'https://x.example.com' } as any,
          ctx as any
        )
      ).toBe(true);
      expect(calls.external).toEqual(['https://x.example.com']);
    });
    it('opens the cart for order buttons', () => {
      const { calls, ctx } = baseCtx();
      expect(followPublishedDestination({ type: 'order' } as any, ctx as any)).toBe(true);
      expect(calls.cart).toBe(1);
    });
    it('navigates to the target page and scrolls to sections', () => {
      const { calls, ctx } = baseCtx();
      expect(
        followPublishedDestination(
          { type: 'section', pageId: 'page_contact', sectionId: 'sec_form' } as any,
          ctx as any
        )
      ).toBe(true);
      expect(calls.navigate).toEqual(['page_contact']);
    });
    it('ignores none/undefined destinations', () => {
      const { calls, ctx } = baseCtx();
      expect(followPublishedDestination(undefined, ctx as any)).toBe(false);
      expect(followPublishedDestination({ type: 'none' } as any, ctx as any)).toBe(false);
      expect(calls.navigate).toEqual([]);
    });
  });

  describe('inferWebsiteLinkDestinationFromLabel', () => {
    it('maps Arabic contact labels to the contact page', () => {
      const website = makeWebsite();
      const destination = inferWebsiteLinkDestinationFromLabel(website, 'تواصل معنا');
      expect(destination && destination.type === 'page' ? destination.pageId : null).toBe(
        'page_contact'
      );
    });
  });
});

describe('published /site parity rendering', () => {
  function renderSite(website: any) {
    return renderToStaticMarkup(
      React.createElement(PublicSiteRenderer, {
        website,
        shop: { id: 'shop_test', name: 'Shop', slug: 'shop-test' },
        products: [],
      })
    );
  }

  function renderHeaderNode(website: any, headerNode: any) {
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
    return renderToStaticMarkup(
      React.createElement(NodeView, { nodeId: headerNode.id, ctx: context })
    );
  }

  it('renders the announcement bar on the published site when enabled', () => {
    const website = makeWebsite();
    website.settings.announcement = {
      enabled: true,
      text: 'خصم 30٪ لفترة محدودة',
      bgColor: '#7c3aed',
      textColor: '#ffffff',
    };
    const markup = renderSite(website);
    expect(markup).toContain('شريط الإعلانات الترويجي');
    expect(markup).toContain('خصم 30٪ لفترة محدودة');
    expect(markup).toContain('background-color:#7c3aed');
  });

  it('keeps the published site free of an announcement bar when disabled', () => {
    const website = makeWebsite();
    website.settings.announcement = { enabled: false, text: 'خصم 30٪' };
    expect(renderSite(website)).not.toContain('شريط الإعلانات الترويجي');
  });

  it('does not render the header login button when auth is disabled', () => {
    const website = makeWebsite({
      header: makeNode('header', 'header', 'root', []),
    });
    website.settings.auth = { enabled: false };
    const markup = renderHeaderNode(website, website.components.header);
    expect(markup).not.toContain('حسابي');
  });

  it('renders the header login button when auth is enabled', () => {
    const website = makeWebsite({
      header: makeNode('header', 'header', 'root', []),
    });
    website.settings.auth = { enabled: true };
    const markup = renderHeaderNode(website, website.components.header);
    expect(markup).toContain('حسابي');
  });

  it('shows the merchant logo on brand headings after publishing', () => {
    const website = makeWebsite({
      header_brand: makeNode('header_brand', 'heading', 'root', [], {
        tag: 'h2',
        text: 'متجري',
      }),
    });
    website.settings.branding = { logoUrl: 'https://cdn.example.com/brand.png' };
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
    const markup = renderToStaticMarkup(
      React.createElement(NodeView, { nodeId: 'header_brand', ctx: context })
    );
    expect(markup).toContain('https://cdn.example.com/brand.png');
  });
});
