import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  removePageAndOrphans,
  useBuilderPageOperations,
} from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderPageOperations';
import { resolvePageScopedSelection } from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderComponentOperations';
import { findHeaderCtaForActivePage } from '../apps/dashboard-web/src/components/website-builder/components/inspector/panels/HeaderSettingsSection';

const node = (id: string, childrenIds: string[] = [], props: Record<string, any> = {}) => ({
  id,
  name: id,
  type: 'container',
  category: 'layout',
  parentId: null,
  childrenIds,
  props,
  styles: { desktop: {} },
});

describe('removePageAndOrphans', () => {
  it('removes only deleted-page nodes, preserves nodes reachable from surviving pages, and cleans page navigation', () => {
    const website = {
      id: 'site',
      pages: [
        { id: 'home', name: 'Home', slug: '', rootNodeId: 'home_root' },
        { id: 'about', name: 'About', slug: 'about', rootNodeId: 'about_root' },
      ],
      components: {
        home_root: node('home_root', ['shared_header', 'home_only']),
        about_root: node('about_root', ['shared_header', 'about_only']),
        shared_header: node('shared_header', ['about_link', 'home_link'], {
          dropdownItems: [
            { id: 'sub_about', title: 'About', url: '/about', pageId: 'about' },
            { id: 'sub_home', title: 'Home', url: '/', pageId: 'home' },
          ],
        }),
        about_link: {
          ...node('about_link', [], { text: 'About', url: '/about', pageId: 'about' }),
          type: 'button',
        },
        home_link: {
          ...node('home_link', [], { text: 'Home', url: '/', pageId: 'home' }),
          type: 'button',
        },
        home_only: node('home_only'),
        about_only: node('about_only'),
        preexisting_detached: node('preexisting_detached'),
      },
    } as any;

    const result = removePageAndOrphans(website, 'about');

    expect(result.pages.map((page: any) => page.id)).toEqual(['home']);
    expect(result.components.home_root).toBeDefined();
    expect(result.components.home_only).toBeDefined();
    expect(result.components.shared_header).toBeDefined();
    expect(result.components.home_link).toBeDefined();
    expect(result.components.about_root).toBeUndefined();
    expect(result.components.about_only).toBeUndefined();
    expect(result.components.about_link).toBeUndefined();
    expect(result.components.shared_header.childrenIds).toEqual(['home_link']);
    expect(result.components.shared_header.props.dropdownItems).toEqual([
      { id: 'sub_home', title: 'Home', url: '/', pageId: 'home' },
    ]);
    expect(result.components.preexisting_detached).toBeDefined();
  });

  it('does not delete the only remaining page', () => {
    const website = {
      pages: [{ id: 'home', name: 'Home', slug: '', rootNodeId: 'root' }],
      components: { root: node('root') },
    } as any;
    expect(removePageAndOrphans(website, 'home')).toBe(website);
  });
});

describe('active page selection scope', () => {
  it('rejects a globally stored component that is not reachable from the active page root', () => {
    const website = {
      pages: [
        { id: 'home', rootNodeId: 'home_root' },
        { id: 'about', rootNodeId: 'about_root' },
      ],
      components: {
        home_root: node('home_root', ['home_child']),
        home_child: node('home_child'),
        about_root: node('about_root', ['about_child']),
        about_child: node('about_child'),
      },
    } as any;

    expect(resolvePageScopedSelection(website, 'home_root', 'home_child')).toBe('home_child');
    expect(resolvePageScopedSelection(website, 'home_root', 'about_child')).toBeNull();
  });

  it('finds the CTA only inside the active page Header and ignores unrelated content CTAs', () => {
    const website = {
      pages: [
        { id: 'home', rootNodeId: 'home_root' },
        { id: 'about', rootNodeId: 'about_root' },
      ],
      components: {
        home_root: node('home_root', ['home_header', 'content_cta']),
        home_header: { ...node('home_header', ['home_header_cta']), type: 'header' },
        home_header_cta: { ...node('home_header_cta'), type: 'button' },
        content_cta: { ...node('content_cta'), type: 'button' },
        about_root: node('about_root', ['about_header']),
        about_header: { ...node('about_header', ['about_header_cta']), type: 'header' },
        about_header_cta: { ...node('about_header_cta'), type: 'button' },
      },
    } as any;

    const homeCta = findHeaderCtaForActivePage(
      website,
      'home_root',
      website.components.home_header,
      website.components.home_header,
      true
    );
    const aboutCta = findHeaderCtaForActivePage(
      website,
      'about_root',
      website.components.about_header,
      website.components.about_header,
      true
    );
    const noCtaWebsite = {
      pages: [{ id: 'home', rootNodeId: 'root' }],
      components: {
        root: node('root', ['header', 'content_cta']),
        header: { ...node('header'), type: 'header' },
        content_cta: { ...node('content_cta'), type: 'button' },
      },
    } as any;
    const noCta = findHeaderCtaForActivePage(
      noCtaWebsite,
      'root',
      noCtaWebsite.components.header,
      noCtaWebsite.components.header,
      true
    );

    expect(homeCta?.id).toBe('home_header_cta');
    expect(aboutCta?.id).toBe('about_header_cta');
    expect(noCta).toBeNull();
  });

  it('ignores hidden or unavailable CTA descendants and selects the first eligible Header CTA', () => {
    const website = {
      pages: [{ id: 'home', rootNodeId: 'root' }],
      components: {
        root: node('root', ['header']),
        header: {
          ...node('header', ['hidden_cta', 'disabled_cta', 'visible_cta']),
          type: 'header',
        },
        hidden_cta: {
          ...node('hidden_cta', [], { label: 'Hidden', headerCta: true, hidden: true }),
          type: 'button',
        },
        disabled_cta: {
          ...node('disabled_cta', [], { label: 'Unavailable', headerCta: true, disabled: true }),
          type: 'button',
        },
        visible_cta: {
          ...node('visible_cta', [], { label: 'Available', headerCta: true }),
          type: 'button',
        },
      },
    } as any;

    expect(
      findHeaderCtaForActivePage(
        website,
        'root',
        website.components.header,
        website.components.header,
        true
      )?.id
    ).toBe('visible_cta');
  });
});

describe('addPage', () => {
  it('keeps an explicitly blank page free of generated content sections', () => {
    const website = {
      id: 'site',
      name: 'Store',
      pages: [{ id: 'home', name: 'Home', slug: '', rootNodeId: 'home_root' }],
      components: { home_root: node('home_root') },
    } as any;
    const originalWebsite = JSON.stringify(website);
    let nextWebsite: any;
    let operations: ReturnType<typeof useBuilderPageOperations> | undefined;
    const setActivePageId = jest.fn();
    const setSelectedNodeId = jest.fn();
    const recordHistory = jest.fn((_label: string, result: any) => {
      nextWebsite = result;
    });
    const Probe = () => {
      operations = useBuilderPageOperations({
        website,
        websiteRef: { current: website },
        activePageId: 'home',
        setActivePageId,
        setSelectedNodeId,
        recordHistory,
      });
      return null;
    };

    renderToString(React.createElement(Probe));
    operations!.addPage({
      name: 'Empty',
      slug: 'empty',
      includeHeaderFooter: false,
      pageTemplate: 'blank',
    });

    const blankPage = nextWebsite.pages[1];
    const blankRoot = nextWebsite.components[blankPage.rootNodeId];
    expect(blankRoot.childrenIds).toEqual([]);
    expect(
      Object.values(nextWebsite.components).some(
        (component: any) => component.parentId === blankPage.rootNodeId && component.type === 'hero'
      )
    ).toBe(false);
    expect(JSON.stringify(website)).toBe(originalWebsite);
    expect(recordHistory).toHaveBeenCalledTimes(1);
    expect(setActivePageId).toHaveBeenCalledWith(blankPage.id);
    expect(setSelectedNodeId).toHaveBeenCalledWith(blankPage.rootNodeId);
  });

  it('creates independent Header/Footer trees and selects the new page root', () => {
    const website = {
      id: 'site',
      name: 'Store',
      pages: [{ id: 'home', name: 'Home', slug: '', rootNodeId: 'home_root' }],
      components: {
        home_root: node('home_root', ['comp_header', 'home_content', 'comp_footer']),
        comp_header: { ...node('comp_header', ['header_nav', 'header_cta_btn']), type: 'header' },
        header_nav: { ...node('header_nav', ['nav_home']), category: 'navigation' },
        nav_home: { ...node('nav_home', [], { text: 'Home', pageId: 'home' }), type: 'button' },
        header_cta_btn: { ...node('header_cta_btn', [], { text: 'Book now' }), type: 'button' },
        comp_footer: { ...node('comp_footer'), type: 'footer' },
        home_content: node('home_content'),
      },
    } as any;
    const setActivePageId = jest.fn();
    const setSelectedNodeId = jest.fn();
    let nextWebsite: any;
    let operations: ReturnType<typeof useBuilderPageOperations> | undefined;
    const recordHistory = jest.fn((_label: string, result: any) => {
      nextWebsite = result;
    });
    const Probe = () => {
      operations = useBuilderPageOperations({
        website,
        websiteRef: { current: website },
        activePageId: 'home',
        setActivePageId,
        setSelectedNodeId,
        recordHistory,
      });
      return null;
    };

    renderToString(React.createElement(Probe));
    operations!.addPage('FAQ', 'faq');

    const newPage = nextWebsite.pages[1];
    const homeHeaderId = website.components.home_root.childrenIds[0];
    const homeFooterId = website.components.home_root.childrenIds[2];
    const newRoot = nextWebsite.components[newPage.rootNodeId];
    const newHeaderId = newRoot.childrenIds[0];
    const newFooterId = newRoot.childrenIds[newRoot.childrenIds.length - 1];
    const navContainers = Object.values(nextWebsite.components).filter(
      (component: any) => component.category === 'navigation'
    ) as any[];

    expect(newPage.rootNodeId).not.toBe(website.pages[0].rootNodeId);
    expect(newHeaderId).not.toBe(homeHeaderId);
    expect(newFooterId).not.toBe(homeFooterId);
    expect(nextWebsite.components[newHeaderId].type).toBe('header');
    expect(nextWebsite.components[newFooterId].type).toBe('footer');
    expect(nextWebsite.components[newHeaderId].parentId).toBe(newPage.rootNodeId);
    const clonedCtaId = nextWebsite.components[newHeaderId].childrenIds
      .map((id: string) => nextWebsite.components[id])
      .find((component: any) => component.type === 'button')?.id;
    expect(clonedCtaId).not.toBe('header_cta_btn');
    expect(nextWebsite.components[clonedCtaId].props.headerCta).toBe(true);
    expect(
      findHeaderCtaForActivePage(
        nextWebsite,
        newPage.rootNodeId,
        nextWebsite.components[newHeaderId],
        nextWebsite.components[newHeaderId],
        true
      )?.id
    ).toBe(clonedCtaId);
    expect(setActivePageId).toHaveBeenCalledWith(newPage.id);
    expect(setSelectedNodeId).toHaveBeenCalledWith(newPage.rootNodeId);
    expect(navContainers).toHaveLength(2);
    expect(
      navContainers.every((nav) =>
        nav.childrenIds.some(
          (id: string) => nextWebsite.components[id]?.props?.pageId === newPage.id
        )
      )
    ).toBe(true);
  });

  it('seeds a full landing page (hero, features, stats, testimonials, CTA) in one click', () => {
    const website = {
      id: 'site',
      name: 'Store',
      pages: [{ id: 'home', name: 'Home', slug: '', rootNodeId: 'home_root' }],
      components: {
        home_root: node('home_root', ['comp_header', 'comp_footer']),
        comp_header: { ...node('comp_header'), type: 'header' },
        comp_footer: { ...node('comp_footer'), type: 'footer' },
      },
    } as any;
    let nextWebsite: any;
    let operations: ReturnType<typeof useBuilderPageOperations> | undefined;
    const recordHistory = jest.fn((_label: string, result: any) => {
      nextWebsite = result;
    });
    const Probe = () => {
      operations = useBuilderPageOperations({
        website,
        websiteRef: { current: website },
        activePageId: 'home',
        setActivePageId: jest.fn(),
        setSelectedNodeId: jest.fn(),
        recordHistory,
      });
      return null;
    };

    renderToString(React.createElement(Probe));
    operations!.addPage({
      name: 'عرض ترويجي',
      slug: 'promo',
      placement: 'standalone',
      pageTemplate: 'landing_page',
    });

    const landingPage = nextWebsite.pages[1];
    const root = nextWebsite.components[landingPage.rootNodeId];
    const sectionTypes = root.childrenIds.map((id: string) => nextWebsite.components[id]?.type);
    // header + hero + features + stats + testimonials + cta + footer
    expect(sectionTypes[0]).toBe('header');
    expect(sectionTypes[sectionTypes.length - 1]).toBe('footer');
    const contentTypes = sectionTypes.slice(1, -1);
    expect(contentTypes).toContain('hero');
    expect(contentTypes).toContain('features');
    expect(contentTypes).toContain('stats');
    expect(contentTypes).toContain('testimonials');
    expect(contentTypes).toContain('cta');
    expect(contentTypes.length).toBeGreaterThanOrEqual(5);
    // The generic gray hero must NOT be seeded — the template hero replaces it.
    expect(contentTypes.filter((type: string) => type === 'hero')).toHaveLength(1);
    // Every SEEDED template-section node has mobile styles generated (header/
    // footer clones keep their own original styles).
    const seededSectionIds = root.childrenIds.slice(1, -1);
    const seededNodeIds: string[] = [];
    const visit = (id: string) => {
      seededNodeIds.push(id);
      nextWebsite.components[id]?.childrenIds?.forEach(visit);
    };
    seededSectionIds.forEach(visit);
    expect(seededNodeIds.every((id: string) => nextWebsite.components[id]?.styles?.mobile)).toBe(
      true
    );
  });

  it('no longer leaves hero_services and contact_form as hero-only stubs', () => {
    const website = {
      id: 'site',
      name: 'Store',
      pages: [{ id: 'home', name: 'Home', slug: '', rootNodeId: 'home_root' }],
      components: { home_root: node('home_root') },
    } as any;
    let operations: ReturnType<typeof useBuilderPageOperations> | undefined;
    const results: any[] = [];
    const recordHistory = jest.fn((_label: string, result: any) => {
      results.push(result);
    });
    const Probe = () => {
      operations = useBuilderPageOperations({
        website,
        websiteRef: { current: website },
        activePageId: 'home',
        setActivePageId: jest.fn(),
        setSelectedNodeId: jest.fn(),
        recordHistory,
      });
      return null;
    };

    renderToString(React.createElement(Probe));
    operations!.addPage({
      name: 'خدماتنا',
      slug: 'services',
      pageTemplate: 'hero_services',
    });
    operations!.addPage({
      name: 'اتصل بنا',
      slug: 'contact',
      pageTemplate: 'contact_form',
    });

    const servicesPage = results[0].pages.find((p: any) => p.slug === 'services');
    const servicesRoot = results[0].components[servicesPage.rootNodeId];
    const servicesTypes = servicesRoot.childrenIds.map(
      (id: string) => results[0].components[id]?.type
    );
    expect(servicesTypes).toContain('features');
    expect(servicesTypes).toContain('stats');

    const contactPage = results[1].pages.find((p: any) => p.slug === 'contact');
    const contactRoot = results[1].components[contactPage.rootNodeId];
    const contactTypes = contactRoot.childrenIds.map(
      (id: string) => results[1].components[id]?.type
    );
    expect(contactTypes).toContain('contact');
  });

  it('duplicatePage clones the full subtree and never marks the copy as home', () => {
    const website = {
      id: 'site',
      name: 'Store',
      pages: [
        {
          id: 'promo',
          name: 'عرض خاص',
          slug: 'promo',
          rootNodeId: 'promo_root',
          metadata: {
            title: 'عرض خاص',
            description: 'صفحة ترويجية',
            slug: 'promo',
            isHomePage: false,
            placement: 'standalone',
          },
        },
      ],
      components: {
        promo_root: node('promo_root', ['hero_a', 'features_a']),
        hero_a: node('hero_a', [], { title: 'خصم 30%' }),
        features_a: node('features_a'),
      },
    } as any;
    let nextWebsite: any;
    let operations: ReturnType<typeof useBuilderPageOperations> | undefined;
    const recordHistory = jest.fn((_label: string, result: any) => {
      nextWebsite = result;
    });
    const Probe = () => {
      operations = useBuilderPageOperations({
        website,
        websiteRef: { current: website },
        activePageId: 'promo',
        setActivePageId: jest.fn(),
        setSelectedNodeId: jest.fn(),
        recordHistory,
      });
      return null;
    };

    renderToString(React.createElement(Probe));
    operations!.duplicatePage('promo');

    const copy = nextWebsite.pages.find((p: any) => p.slug === 'promo-copy');
    expect(copy).toBeDefined();
    expect(copy.name).toBe('عرض خاص (نسخة)');
    expect(copy.metadata.isHomePage).toBe(false);
    const copyRoot = nextWebsite.components[copy.rootNodeId];
    const copyChildIds = copyRoot.childrenIds;
    expect(copyChildIds).toHaveLength(2);
    // Children are fresh clones with the SAME props, not the source nodes.
    const copyHero = nextWebsite.components[copyChildIds[0]];
    expect(copyHero.id).not.toBe('hero_a');
    expect(copyHero.props.title).toBe('خصم 30%');
    expect(copyHero.parentId).toBe(copy.rootNodeId);
    // Source page remains untouched.
    expect(nextWebsite.components.promo_root.childrenIds).toEqual(['hero_a', 'features_a']);
  });
});
