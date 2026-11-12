import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getFullWebsiteTemplates,
  loadFullWebsiteTemplate,
  validateTemplateEntry,
} from '../apps/dashboard-web/src/components/website-builder/data/registry';
import {
  isCompleteChildBasedHero,
  resolveHeroContent,
} from '../packages/shared/src/builder/heroCompatibility';
import { PublicSiteRenderer } from '../packages/shared/src/builder/PublicSiteRenderer';

const restaurant = loadFullWebsiteTemplate('site_restaurant_cafe');
const components = restaurant.website.components;

describe('restaurant full website template repairs', () => {
  it('keeps stable IDs and legacy menu data while providing production product fields', () => {
    const menu = components.rest_menu_tabs;
    expect(menu.props.sectionTitle).toBe(menu.props.title);
    expect(menu.props.sectionSubtitle).toBe(menu.props.subtitle);
    expect(menu.props.items.map((item: any) => item.id)).toEqual([
      'dish_1',
      'dish_2',
      'dish_3',
      'dish_4',
      'dish_5',
      'dish_6',
    ]);
    expect(menu.props.products).toHaveLength(6);
    menu.props.products.forEach((product: any, index: number) => {
      expect(product.id).toBe(menu.props.items[index].id);
      expect(product.title).toBe(menu.props.items[index].name);
    });
    expect(components.rest_logo.type).toBe('paragraph');
    expect(components.rest_logo.id).toBe('rest_logo');
    expect(components.rest_logo.styles.desktop).toEqual({
      fontSize: '22px',
      fontWeight: '800',
      textColor: '#ea580c',
    });
    expect(components.rest_hero_title.props.tag).toBe('h1');
  });

  it('provides a complete child-based hero with scoped mobile styles and explicit actions', () => {
    const heroContent = resolveHeroContent(components.rest_hero, components);
    expect(isCompleteChildBasedHero(heroContent)).toBe(true);
    expect(components.rest_hero_image_box.styles.desktop.height).toBe('min(380px, 30vw)');
    expect(components.rest_hero_image_box.styles.tablet?.height).toBe('30vw');
    expect(components.rest_hero_image_box.styles.mobile).toMatchObject({
      height: 'auto',
      maxHeight: '280px',
      objectFit: 'cover',
    });
    expect(components.rest_hero_ctas.styles.mobile).toMatchObject({
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
    });
    expect(components.btn_hero_explore_menu.styles.mobile?.whiteSpace).toBe('normal');
    expect(components.btn_hero_book_table.styles.mobile?.whiteSpace).toBe('normal');
    expect(components.nav_item_menu.props.destination).toEqual({
      type: 'section',
      pageId: 'page_home',
      sectionId: 'rest_menu_tabs',
    });
    expect(components.rest_btn_order_now.props.destination.type).toBe('order');
    expect(components.nav_item_book.props.destination.sectionId).toBe('rest_table_booking');
    expect(components.nav_item_reviews.props.destination.sectionId).toBe('rest_reviews');
    expect(components.nav_item_branches.props.destination.pageId).toBe('page_contact');
  });

  it('maps footer navigation to existing content without unsupported branch or certification claims', () => {
    const links = components.rest_footer.props.links;
    expect(links.map((link: any) => link.destination)).toEqual([
      { type: 'section', pageId: 'page_home', sectionId: 'rest_menu_tabs' },
      { type: 'booking', pageId: 'page_home', sectionId: 'rest_table_booking' },
      { type: 'page', pageId: 'page_contact' },
      { type: 'section', pageId: 'page_home', sectionId: 'rest_reviews' },
    ]);
    expect(links[2].label).toBe('تواصل معنا');
    expect(links[3].label).toBe('آراء الزوار وتجاربهم');
    expect(restaurant.website.defaultDirection).toBe('rtl');
    expect(restaurant.website.language).toBe('ar');
  });

  it('keeps flat legacy heroes compatible and rejects incomplete child hero layouts', () => {
    const flatHero = {
      ...components.rest_hero,
      childrenIds: [],
      props: { title: 'عنوان قديم', description: 'وصف قديم', imageUrl: '/hero.jpg' },
    };
    const flatContent = resolveHeroContent(flatHero, components);
    expect(flatContent.title).toBe('عنوان قديم');
    expect(isCompleteChildBasedHero(flatContent)).toBe(false);
    expect(isCompleteChildBasedHero(resolveHeroContent(components.rest_hero, components))).toBe(
      true
    );
  });

  it('renders the restaurant hero, menu, booking, reviews, and footer content from its structure', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PublicSiteRenderer, {
        website: restaurant.website,
        shop: {
          id: 'restaurant-preview',
          name: restaurant.website.name,
          slug: 'restaurant-preview',
        },
        products: [],
        previewMode: true,
        previewViewport: 'desktop',
      })
    );

    expect(markup).toContain('id="rest_hero"');
    expect(markup).toContain(components.rest_hero_title.props.text);
    expect(markup).toContain(components.rest_hero_image_box.props.src.split('?')[0]);
    expect(markup).toContain(components.rest_menu_tabs.props.title);
    expect(markup).toContain(components.rest_menu_tabs.props.products[0].title);
    expect(markup).toContain(components.rest_table_booking.props.title);
    expect(markup).toContain(components.rest_reviews.props.testimonials[0].text);
    expect(markup).toContain(components.rest_footer.props.brandName);
  });

  it('validates every supported full website and reports actionable component shape/style issues', () => {
    getFullWebsiteTemplates().forEach((entry) => {
      expect(validateTemplateEntry(entry)).toEqual({ valid: true, errors: [] });
    });

    const invalid = {
      ...restaurant,
      website: {
        ...restaurant.website,
        components: {
          ...components,
          rest_hero: { ...components.rest_hero, id: 'wrong-id' },
          rest_logo: {
            ...components.rest_logo,
            name: '',
            type: 'unsupported-widget',
            styles: {
              ...components.rest_logo.styles,
              mobile: { ...components.rest_logo.styles.mobile, display: 'inline-flex' },
            },
          },
        },
      },
    };
    const errors = validateTemplateEntry(invalid).errors;
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('does not match its id') }),
        expect.objectContaining({ message: expect.stringContaining('non-empty name') }),
        expect.objectContaining({ message: expect.stringContaining('unsupported type') }),
        expect.objectContaining({ message: expect.stringContaining('styles.mobile.display') }),
      ])
    );
  });

  it('validates page IDs and explicit internal section destinations', () => {
    const invalid = {
      ...restaurant,
      website: {
        ...restaurant.website,
        pages: [
          ...restaurant.website.pages,
          { ...restaurant.website.pages[0], name: 'Duplicate page entry' },
        ],
        components: {
          ...components,
          btn_hero_explore_menu: {
            ...components.btn_hero_explore_menu,
            props: {
              ...components.btn_hero_explore_menu.props,
              destination: {
                type: 'section',
                pageId: 'page_home',
                sectionId: 'missing-section',
              },
            },
          },
        },
      },
    };

    expect(validateTemplateEntry(invalid).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('used more than once') }),
        expect.objectContaining({
          message: expect.stringContaining('invalid internal page or section'),
        }),
      ])
    );
  });

  it('rejects broken parent edges and missing required component props', () => {
    const invalid = {
      ...restaurant,
      website: {
        ...restaurant.website,
        components: {
          ...components,
          rest_hero_title: { ...components.rest_hero_title, parentId: 'missing-parent' },
          rest_hero_image_box: { ...components.rest_hero_image_box, props: {} },
        },
      },
    };
    const errors = validateTemplateEntry(invalid).errors;
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('declares parent') }),
        expect.objectContaining({ message: expect.stringContaining('Image component') }),
      ])
    );
  });
});
