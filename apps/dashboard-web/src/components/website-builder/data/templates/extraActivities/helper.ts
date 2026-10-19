import { Website, ComponentNode } from '../../../types/builder';
import { getMergedThemeTokens } from '../../defaultTheme';

// Helper to create basic common components for any activity site
export const createExtraWebsite = (
  id: string,
  tenantId: string,
  name: string,
  subdomain: string,
  activity: string,
  themeKey: string,
  components: Record<string, ComponentNode>,
  pages: any[]
): Website => {
  const theme = getMergedThemeTokens(themeKey);
  const comps = { ...components };
  const allPages = [...pages];

  const headerId = Object.keys(comps).find((k) => comps[k].type === 'header') || '';
  const footerId = Object.keys(comps).find((k) => comps[k].type === 'footer') || '';
  const itemsSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'products' ||
        comps[k].type === 'grid' ||
        k.includes('menu') ||
        k.includes('item') ||
        k.includes('product') ||
        k.includes('service')
    ) || '';
  const formSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'form' ||
        comps[k].type === 'contact' ||
        k.includes('book') ||
        k.includes('contact') ||
        k.includes('form')
    ) || '';
  const featuresSectionId =
    Object.keys(comps).find(
      (k) =>
        comps[k].type === 'features' ||
        comps[k].type === 'testimonials' ||
        k.includes('feature') ||
        k.includes('review')
    ) || '';

  // Ensure full multi-page suite exists if only home is passed
  if (allPages.length === 1 && allPages[0].id === 'page_home') {
    if (itemsSectionId) {
      comps['page_services_root'] = {
        id: 'page_services_root',
        name: `صفحة الخدمات والمنتجات - ${name}`,
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: [headerId, itemsSectionId, formSectionId, footerId].filter(Boolean),
        props: {},
        styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
      };
      allPages.push({
        id: 'page_services',
        name: 'الخدمات والمنتجات',
        slug: 'services',
        rootNodeId: 'page_services_root',
        metadata: { title: `الخدمات والمنتجات | ${name}`, description: `تصفح الخدمات والمنتجات من ${name}`, slug: 'services', isHomePage: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (featuresSectionId) {
      comps['page_about_root'] = {
        id: 'page_about_root',
        name: `صفحة من نحن - ${name}`,
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: [headerId, featuresSectionId, formSectionId, footerId].filter(Boolean),
        props: {},
        styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
      };
      allPages.push({
        id: 'page_about',
        name: 'من نحن وقصتنا',
        slug: 'about',
        rootNodeId: 'page_about_root',
        metadata: { title: `من نحن وقصتنا | ${name}`, description: `تعرف على قصة وخبرات ${name}`, slug: 'about', isHomePage: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (formSectionId) {
      comps['page_contact_root'] = {
        id: 'page_contact_root',
        name: `صفحة التواصل والحجز - ${name}`,
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: [headerId, formSectionId, footerId].filter(Boolean),
        props: {},
        styles: { desktop: { display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', textColor: '#0f172a' } },
      };
      allPages.push({
        id: 'page_contact',
        name: 'تواصل معنا والحجز',
        slug: 'contact',
        rootNodeId: 'page_contact_root',
        metadata: { title: `تواصل معنا والحجز | ${name}`, description: `تواصل مباشرة مع ${name}`, slug: 'contact', isHomePage: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    id,
    tenantId,
    name,
    domain: `${subdomain}.saassite.com`,
    subdomain,
    activity: activity as any,
    language: 'ar',
    defaultDirection: 'rtl',
    theme: theme as any,
    currentDraftVersion: 1,
    pages: allPages,
    components: comps,
  };
};
