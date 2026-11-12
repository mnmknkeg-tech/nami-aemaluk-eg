import {
  adaptTemplateLinkDestinations,
  getInvalidPageDestinations,
  getPageDestinationReferenceCount,
  resolveWebsiteLinkDestination,
  syncPageSlugInDestinations,
  type ComponentNode,
  type Website,
} from '../packages/shared/src/builder';
import { removePageAndOrphans } from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderPageOperations';
import {
  getFullWebsiteTemplates,
  loadFullWebsiteTemplate,
} from '../apps/dashboard-web/src/components/website-builder/data/registry';

const makeNode = (
  id: string,
  type: ComponentNode['type'],
  parentId: string | null,
  childrenIds: string[],
  props: Record<string, any> = {}
): ComponentNode => ({
  id,
  name: id,
  type,
  category: type === 'container' ? 'layout' : type === 'paragraph' ? 'typography' : 'section',
  parentId,
  childrenIds,
  props,
  styles: { desktop: {} },
});

const sourceWebsite = loadFullWebsiteTemplate('site_restaurant_cafe').website;
const fixtureWebsite: Website = {
  ...sourceWebsite,
  pages: [
    {
      id: 'home',
      name: 'الرئيسية',
      slug: 'home',
      rootNodeId: 'home-root',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        title: 'الرئيسية',
        description: '',
        slug: 'home',
        isHomePage: true,
      },
    },
    {
      id: 'contact',
      name: 'تواصل معنا',
      slug: 'contact',
      rootNodeId: 'contact-root',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        title: 'تواصل معنا',
        description: '',
        slug: 'contact',
      },
    },
  ],
  components: {
    'home-root': makeNode('home-root', 'container', null, [
      'navigation',
      'menu-section',
      'booking-section',
      'footer',
    ]),
    navigation: makeNode('navigation', 'paragraph', 'home-root', [], {
      text: 'المنيو • احجز طاولة • تواصل معنا • واتساب',
    }),
    'menu-section': makeNode('menu-section', 'products', 'home-root', [], {
      title: 'قائمة الطعام',
    }),
    'booking-section': makeNode('booking-section', 'form', 'home-root', [], {
      title: 'حجز طاولة',
    }),
    'contact-root': makeNode('contact-root', 'container', null, ['contact-form']),
    'contact-form': makeNode('contact-form', 'contact', 'contact-root', [], {
      title: 'تواصل معنا',
    }),
    'menu-cta': makeNode('menu-cta', 'button', 'home-root', [], { text: 'شاهد المنيو' }),
    'booking-cta': makeNode('booking-cta', 'button', 'home-root', [], { text: 'احجز طاولة الآن' }),
    'contact-cta': makeNode('contact-cta', 'button', 'home-root', [], { text: 'تواصل معنا' }),
    'whatsapp-cta': makeNode('whatsapp-cta', 'button', 'home-root', [], {
      text: 'واتساب',
      href: 'https://wa.me/201000000000',
    }),
    footer: makeNode('footer', 'footer', 'home-root', [], {
      links: [
        { label: 'المنيو', href: '#menu-section' },
        { label: 'حجز طاولة', href: '#booking-section' },
      ],
    }),
  },
};

describe('automatic page and action destinations', () => {
  it('links every full website template without introducing invalid internal references', () => {
    getFullWebsiteTemplates().forEach((entry) => {
      const adapted = adaptTemplateLinkDestinations(entry.website);
      expect(getInvalidPageDestinations(adapted)).toEqual([]);
    });
  });

  it('connects restaurant navigation, menu, booking, contact, and hero actions by intent', () => {
    const linked = adaptTemplateLinkDestinations(fixtureWebsite);
    const items = linked.components.navigation.props.navigationItems;
    const destinationFor = (label: string) =>
      items.find((item: { label: string }) => item.label === label)?.destination;

    expect(destinationFor('المنيو')).toEqual({
      type: 'section',
      pageId: 'home',
      sectionId: 'menu-section',
    });
    expect(destinationFor('احجز طاولة')).toEqual({
      type: 'booking',
      pageId: 'home',
      sectionId: 'booking-section',
    });
    expect(destinationFor('تواصل معنا')).toEqual({ type: 'page', pageId: 'contact' });
    expect(destinationFor('واتساب')).toBeUndefined();
    expect(linked.components['menu-cta'].destination).toEqual(destinationFor('المنيو'));
    expect(linked.components['booking-cta'].destination).toEqual(destinationFor('احجز طاولة'));
    expect(linked.components['contact-cta'].destination).toEqual({
      type: 'page',
      pageId: 'contact',
    });
    expect(linked.components['whatsapp-cta'].destination).toEqual({
      type: 'whatsapp',
      url: 'https://wa.me/201000000000',
    });
    expect(linked.components.footer.props.links[0].destination).toEqual({
      type: 'section',
      pageId: 'home',
      sectionId: 'menu-section',
    });
    expect(getInvalidPageDestinations(linked)).toEqual([]);
  });

  it('links the restaurant menu item to its intended section on the home page', () => {
    const linked = adaptTemplateLinkDestinations(sourceWebsite);

    expect(linked.pages.some((page) => page.id === 'page_services')).toBe(true);
    expect(linked.components.nav_item_menu.destination).toEqual({
      type: 'section',
      pageId: 'page_home',
      sectionId: 'rest_menu_tabs',
    });
  });

  it('preserves explicit external URLs and resolves legacy internal hrefs by page', () => {
    expect(resolveWebsiteLinkDestination(fixtureWebsite, { href: '/contact' })).toEqual({
      type: 'page',
      pageId: 'contact',
    });
    expect(
      resolveWebsiteLinkDestination(fixtureWebsite, { linkUrl: 'https://example.com/menu' })
    ).toEqual({ type: 'external', url: 'https://example.com/menu' });
    expect(
      resolveWebsiteLinkDestination(fixtureWebsite, { href: 'https://wa.me/201000000000' })
    ).toEqual({ type: 'whatsapp', url: 'https://wa.me/201000000000' });
  });

  it('warns about and removes deleted-page navigation references without redirecting them', () => {
    const linked = adaptTemplateLinkDestinations(fixtureWebsite);
    expect(getPageDestinationReferenceCount(linked, 'contact')).toBeGreaterThan(0);

    const updated = removePageAndOrphans(linked, 'contact');

    expect(updated.pages.some((page) => page.id === 'contact')).toBe(false);
    expect(updated.components.navigation.props.navigationItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: { type: 'page', pageId: 'contact' } }),
      ])
    );
    expect(updated.components['contact-cta'].destination).toBeUndefined();
    expect(updated.components['contact-cta'].props.pageId).toBeUndefined();
    expect(getInvalidPageDestinations(updated)).toEqual([]);
  });

  it('keeps stable page IDs while updating legacy paths after a slug change or page reorder', () => {
    const linked = adaptTemplateLinkDestinations(fixtureWebsite);
    const renamed = {
      ...linked,
      pages: linked.pages.map((page) =>
        page.id === 'contact'
          ? {
              ...page,
              slug: 'get-in-touch',
              metadata: { ...page.metadata, slug: 'get-in-touch' },
            }
          : page
      ),
      components: syncPageSlugInDestinations(linked, 'contact', 'contact', 'get-in-touch'),
    };
    const reordered = { ...renamed, pages: [...renamed.pages].reverse() };

    expect(reordered.components['contact-cta'].destination).toEqual({
      type: 'page',
      pageId: 'contact',
    });
    expect(reordered.components['contact-cta'].props.url).toBeUndefined();
    expect(getInvalidPageDestinations(reordered)).toEqual([]);
  });

  it('does not infer WhatsApp or navigation from a label without an explicit destination', () => {
    const linked = adaptTemplateLinkDestinations(fixtureWebsite);
    expect(linked.components['whatsapp-cta'].destination?.type).toBe('whatsapp');
    expect(
      linked.components.navigation.props.navigationItems.find(
        (item: { label: string }) => item.label === 'واتساب'
      ).destination
    ).toBeUndefined();
    expect(resolveWebsiteLinkDestination(fixtureWebsite, { text: 'تواصل معنا' })).toBeUndefined();
  });
});
