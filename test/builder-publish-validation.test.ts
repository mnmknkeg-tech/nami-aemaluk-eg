import { validateWebsiteForPublishing } from '../apps/dashboard-web/src/components/website-builder/context/hooks/publishValidation';

function makeWebsite(overrides: Record<string, unknown> = {}): any {
  return {
    pages: [{ id: 'home', name: 'الرئيسية', slug: '/', rootNodeId: 'root' }],
    components: {
      root: {
        id: 'root',
        name: 'الجذر',
        type: 'container',
        parentId: null,
        childrenIds: ['section'],
        styles: { desktop: { minHeight: '100vh' } },
      },
      section: {
        id: 'section',
        name: 'قسم',
        type: 'container',
        parentId: 'root',
        childrenIds: [],
        styles: { desktop: { height: '320px', minHeight: 'calc(100vh - 3rem)' } },
        props: {},
        customCode: {
          tsxSnippet: '<div class="card">أهلًا</div>',
          css: '.card { color: #123; }',
          js: 'console.log("ok")',
        },
      },
      comp_blank_root: {
        id: 'comp_blank_root',
        name: 'جذر فارغ قديم',
        type: 'container',
        parentId: null,
        childrenIds: [],
        styles: { desktop: { minHeight: '100vh' } },
      },
    },
    ...overrides,
  };
}

describe('validateWebsiteForPublishing', () => {
  it('accepts a consistent page tree with normal styles and safe custom code', () => {
    expect(validateWebsiteForPublishing(makeWebsite())).toEqual([]);
  });

  it('rejects a missing or invalid page root', () => {
    const website = makeWebsite({
      pages: [{ id: 'home', name: 'الرئيسية', rootNodeId: 'missing' }],
    });
    expect(validateWebsiteForPublishing(website).join(' ')).toMatch(/الجذر المرتبط بالصفحة/);
  });

  it('rejects cycles, including cycles detached from page roots', () => {
    const website = makeWebsite({
      components: {
        ...makeWebsite().components,
        loopA: { id: 'loopA', parentId: 'loopB', childrenIds: ['loopB'], styles: {} },
        loopB: { id: 'loopB', parentId: 'loopA', childrenIds: ['loopA'], styles: {} },
      },
    });
    expect(validateWebsiteForPublishing(website).join(' ')).toMatch(/دورة/);
  });

  it('rejects components that are not reachable from a page root', () => {
    const website = makeWebsite({
      components: {
        ...makeWebsite().components,
        unused: { id: 'unused', parentId: null, childrenIds: [], styles: {} },
      },
    });
    expect(validateWebsiteForPublishing(website).join(' ')).toMatch(/غير مرتبطة بجذر صفحة/);
  });

  it('rejects inconsistent parentId and childrenIds relationships', () => {
    const website = makeWebsite({
      components: {
        root: { ...makeWebsite().components.root, childrenIds: [] },
        section: { ...makeWebsite().components.section, parentId: 'root' },
      },
    });
    expect(validateWebsiteForPublishing(website).join(' ')).toMatch(/لا يدرجه ضمن childrenIds/);
  });

  it('rejects impossible or extreme height and minHeight values while allowing viewport units', () => {
    const website = makeWebsite({
      components: {
        root: { ...makeWebsite().components.root, styles: { desktop: { minHeight: '100vh' } } },
        section: { ...makeWebsite().components.section, styles: { desktop: { height: '999999px' } } },
      },
    });
    expect(validateWebsiteForPublishing(website).join(' ')).toMatch(/height في نمط desktop/);
  });

  it('rejects dangerous markup, blocked JavaScript and over-limit custom code', () => {
    const website = makeWebsite({
      components: {
        root: makeWebsite().components.root,
        section: {
          ...makeWebsite().components.section,
          customCode: {
            tsxSnippet: '<iframe src="javascript:alert(1)" onload="alert(1)"></iframe>',
            js: 'fetch("https://example.invalid")',
            css: 'x'.repeat(64 * 1024 + 1),
          },
        },
      },
    });
    const errors = validateWebsiteForPublishing(website).join(' ');
    expect(errors).toMatch(/وسم لا تسمح به/);
    expect(errors).toMatch(/معالجات الأحداث/);
    expect(errors).toMatch(/روابط javascript/);
    expect(errors).toMatch(/JavaScript على وصول أو تنفيذ محظور/);
    expect(errors).toMatch(/CSS يتجاوز الحد المسموح/);
  });
});
