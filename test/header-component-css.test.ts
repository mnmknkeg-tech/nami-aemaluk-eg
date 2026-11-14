// Regression test for merchant-reported bug: "added the same CSS to the
// header's per-section CSS file — nothing changed. Adding it to global.css
// worked." This exercises the full pipeline that the live-preview canvas
// runs: writeWebsiteFile → applyWebsiteFileDrafts → buildWebsiteStylesheet,
// with a `gen_header`-style node whose name is Arabic (the pharmacy template
// ships a `gen_header` named "ترويسة الموقع").

import {
  applyWebsiteFileDrafts,
  buildWebsiteStylesheet,
  listWebsiteFiles,
  writeWebsiteFile,
} from '../packages/shared/src/builder/codeFiles';
import type { Website } from '../packages/shared/src/builder/types';

const buildPharmacyWebsite = (): Website =>
  ({
    id: 'site_pharmacy',
    tenantId: 'tenant_pharmacy',
    name: 'صيدلية السعيد',
    domain: '',
    subdomain: '',
    activity: 'medical',
    language: 'ar',
    defaultDirection: 'rtl',
    pages: [
      {
        id: 'page_home',
        name: 'الرئيسية',
        slug: 'home',
        rootNodeId: 'page_root',
        metadata: { title: 'الرئيسية', slug: 'home', isHomePage: true },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    components: {
      page_root: {
        id: 'page_root',
        name: 'الصفحة',
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: ['gen_header'],
        props: {},
        styles: { desktop: {} },
      },
      gen_header: {
        id: 'gen_header',
        name: 'ترويسة الموقع',
        type: 'header',
        category: 'section',
        parentId: 'page_root',
        childrenIds: ['gen_header_inner'],
        isGlobal: true,
        props: { sticky: true },
        styles: {
          desktop: {
            display: 'block',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            position: 'sticky',
            top: '0px',
            zIndex: 50,
          },
        },
      },
      gen_header_inner: {
        id: 'gen_header_inner',
        name: 'حاوية الترويسة',
        type: 'container',
        category: 'layout',
        parentId: 'gen_header',
        childrenIds: ['gen_brand_badge', 'gen_header_cta'],
        props: {},
        styles: { desktop: { display: 'flex' } },
      },
      gen_brand_badge: {
        id: 'gen_brand_badge',
        name: 'شعار وهوية المنشأة',
        type: 'heading',
        category: 'typography',
        parentId: 'gen_header_inner',
        childrenIds: [],
        props: { text: '💊 صيدلية السعيد', level: 'h3' },
        styles: { desktop: { fontSize: '20px', fontWeight: '800' } },
      },
      gen_header_cta: {
        id: 'gen_header_cta',
        name: 'زر احجز الآن',
        type: 'button',
        category: 'action',
        parentId: 'gen_header_inner',
        childrenIds: [],
        props: { text: 'احجز الآن', variant: 'primary' },
        styles: {
          desktop: {
            backgroundColor: '#10b981',
            textColor: '#ffffff',
            borderRadius: '12px',
          },
        },
      },
    },
    theme: {} as any,
    currentDraftVersion: 1,
  }) as unknown as Website;

const HEADER_CSS = `header {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.08), rgba(255, 255, 255, 0.95)) !important;
  border-bottom: 2px solid rgba(16, 185, 129, 0.25) !important;
}
button {
  border-radius: 999px !important;
}
button:hover {
  transform: translateY(-2px) !important;
}`;

describe('header component CSS pipeline (merchant pharmacy scenario)', () => {
  it('writes component CSS to the header node and applies via drafts', () => {
    const site = buildPharmacyWebsite();
    const files = listWebsiteFiles(site, { includeNodeIds: ['gen_header'] });
    const headerCssFile = files.find(
      (f) => f.kind === 'component-css' && f.nodeId === 'gen_header'
    );
    expect(headerCssFile).toBeTruthy();
    const path = headerCssFile!.path;

    // Round-trip the CSS the merchant pasted.
    const result = writeWebsiteFile(site, path, HEADER_CSS);
    expect(result?.changed).toBe(true);
    const writtenNode = result!.website.components['gen_header'];
    expect(writtenNode.customCode?.cssSnippet).toBe(HEADER_CSS);
    expect(writtenNode.customCode?.enabled).toBe(true);

    // applyWebsiteFileDrafts must produce the same result.
    const previewSite = applyWebsiteFileDrafts(site, { [path]: HEADER_CSS });
    expect(previewSite.components['gen_header'].customCode?.cssSnippet).toBe(HEADER_CSS);

    // buildWebsiteStylesheet must include the scoped header CSS so the canvas
    // (and the published site) actually render it.
    const stylesheet = buildWebsiteStylesheet(previewSite);
    expect(stylesheet).toContain('#gen_header header');
    expect(stylesheet).toContain('#gen_header button');
    expect(stylesheet).toMatch(/linear-gradient.*16, 185, 129/);
    expect(stylesheet).toMatch(/border-radius:\s*999px !important/);
    expect(stylesheet).toMatch(/transform:\s*translateY\(-2px\) !important/);
  });

  it('scopes header selectors with !important so they win over inline styles', () => {
    const site = buildPharmacyWebsite();
    const previewSite = applyWebsiteFileDrafts(site, {
      'المكوّنات/ترويسة-الموقع--gen_header.css': HEADER_CSS,
    });
    const stylesheet = buildWebsiteStylesheet(previewSite);
    // Every declaration the merchant wrote with !important must keep it after
    // scoping — and the auto-!important pass must add it to the ones without.
    expect(stylesheet).toMatch(/background:[^;]*!important/);
    expect(stylesheet).toMatch(/border-bottom:[^;]*!important/);
    expect(stylesheet).toMatch(/border-radius:[^;]*!important/);
  });
});
