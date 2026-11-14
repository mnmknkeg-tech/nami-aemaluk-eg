import {
  applyThemeVariables,
  applyWebsiteFileDrafts,
  buildWebsiteStylesheet,
  listWebsiteFiles,
  readWebsiteFile,
  scopeGlobalCss,
  scopeNodeCss,
  splitHeadCode,
  writeWebsiteFile,
} from '../packages/shared/src/builder/codeFiles';
import type { Website } from '../packages/shared/src/builder/types';

const buildWebsite = (overrides: Partial<Website> = {}): Website =>
  ({
    id: 'site_1',
    tenantId: 'tenant_1',
    name: 'موقع تجريبي',
    domain: '',
    subdomain: '',
    activity: 'grocery',
    language: 'ar',
    defaultDirection: 'rtl',
    pages: [
      {
        id: 'page_home',
        name: 'الرئيسية',
        slug: 'home',
        rootNodeId: 'root',
        metadata: { title: 'الرئيسية', slug: 'home', isHomePage: true },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'page_about',
        name: 'من نحن',
        slug: 'about',
        rootNodeId: 'root_about',
        metadata: { title: 'من نحن', slug: 'about' },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    components: {
      // Builder invariant: the components record is keyed BY node id.
      root: {
        id: 'root',
        name: 'الصفحة',
        type: 'container',
        category: 'layout',
        parentId: null,
        childrenIds: [],
        props: {},
        styles: { desktop: {} },
      },
      comp_hero: {
        id: 'comp_hero',
        name: 'Hero Section',
        type: 'hero',
        category: 'hero',
        parentId: 'root',
        childrenIds: [],
        props: {},
        styles: { desktop: {} },
      },
      custom_code_abc: {
        id: 'custom_code_abc',
        name: 'مكوّن مخصص',
        type: 'custom-code',
        category: 'interactive',
        parentId: 'root',
        childrenIds: [],
        props: { html: '<b>مرحبا</b>' },
        styles: { desktop: {} },
        customCode: {
          enabled: true,
          tsxSnippet: '<b>مرحبا</b>',
          cssSnippet: '.a{color:red}',
          jsSnippet: 'console.log(1)',
        },
      },
    },
    theme: {},
    currentDraftVersion: 1,
    ...overrides,
  }) as Website;

describe('builder virtual code files', () => {
  it('lists theme, page and component files', () => {
    const files = listWebsiteFiles(buildWebsite());
    const paths = files.map((f) => f.path);
    expect(paths).toContain('theme/global.css');
    expect(paths).toContain('theme/tokens.json');
    expect(paths).toContain('pages/home/head.html');
    expect(paths).toContain('pages/about/body.html');
    // The custom-code node always exposes its HTML; CSS/JS exist (non-empty snippets).
    expect(
      paths.some((p) => p.startsWith('المكوّنات/') && p.endsWith('--custom_code_abc.html'))
    ).toBe(true);
    expect(
      paths.some((p) => p.startsWith('المكوّنات/') && p.endsWith('--custom_code_abc.css'))
    ).toBe(true);
    // Plain nodes without code are not listed.
    expect(paths.some((p) => p.endsWith('--comp_hero.css'))).toBe(false);
  });

  it('includes selected node files even when empty (includeNodeIds)', () => {
    const files = listWebsiteFiles(buildWebsite(), { includeNodeIds: ['comp_hero'] });
    expect(files.some((f) => f.nodeId === 'comp_hero' && f.path.endsWith('.css'))).toBe(true);
  });

  it('round-trips site-wide CSS through theme/global.css', () => {
    const site = buildWebsite();
    const result = writeWebsiteFile(site, 'theme/global.css', '.ray-site-root h2 { color: teal; }');
    expect(result?.changed).toBe(true);
    expect(result?.website.settings?.branding?.customCss).toBe(
      '.ray-site-root h2 { color: teal; }'
    );
    expect(readWebsiteFile(result!.website, 'theme/global.css')).toBe(
      '.ray-site-root h2 { color: teal; }'
    );
  });

  it('round-trips component CSS into cssSnippet (legacy field migrated)', () => {
    const site = buildWebsite();
    const path = listWebsiteFiles(site).find((f) => f.kind === 'component-css')!.path;
    const result = writeWebsiteFile(site, path, '.a{color:blue}');
    expect(result?.changed).toBe(true);
    const node = result!.website.components['custom_code_abc'];
    expect(node.customCode?.cssSnippet).toBe('.a{color:blue}');
    expect(node.customCode?.css).toBeUndefined();
    expect(node.customCode?.tsxSnippet).toBe('<b>مرحبا</b>');
  });

  it('keeps props.html in sync when component HTML changes', () => {
    const site = buildWebsite();
    const path = listWebsiteFiles(site).find((f) => f.kind === 'component-html')!.path;
    const result = writeWebsiteFile(site, path, '<i>تحديث</i>');
    const node = result!.website.components['custom_code_abc'];
    expect(node.customCode?.tsxSnippet).toBe('<i>تحديث</i>');
    expect(node.props.html).toBe('<i>تحديث</i>');
  });

  it('writes page head/body code and reads it back', () => {
    const site = buildWebsite();
    const result = writeWebsiteFile(site, 'pages/about/head.html', '<meta name="x" content="y">');
    expect(result?.changed).toBe(true);
    expect((result!.website.pages[1] as any).customHeadCode).toBe('<meta name="x" content="y">');
    expect(readWebsiteFile(result!.website, 'pages/about/head.html')).toBe(
      '<meta name="x" content="y">'
    );
  });

  it('rejects invalid theme tokens JSON without mutating the site', () => {
    const site = buildWebsite();
    const result = writeWebsiteFile(site, 'theme/tokens.json', '{oops');
    expect(result?.changed).toBe(false);
    expect(result?.error).toBeTruthy();
    expect(result?.website).toBe(site);
  });
});

describe('CSS scoping', () => {
  it('scopes node selectors with #id and !important, keeps keyframes intact', () => {
    const css = [
      '@media (min-width: 768px) {',
      '  .card { color: red; }',
      '}',
      '@keyframes pulse { 0% { opacity: 1; } }',
      '@import url("https://evil.example/x.css");',
      ':root { --x: 1; }',
    ].join('\n');
    const scoped = scopeNodeCss(css, 'comp_hero');
    expect(scoped).toContain('#comp_hero .card');
    expect(scoped).toMatch(/color:\s*red !important/);
    expect(scoped).toContain('@keyframes pulse');
    expect(scoped).not.toMatch(/opacity:\s*1 !important/);
    expect(scoped).not.toContain('@import');
    expect(scoped).toContain('#comp_hero{');
  });

  it('scopes global CSS under .ray-site-root without !important', () => {
    const scoped = scopeGlobalCss('h2 { color: teal; }');
    expect(scoped).toContain('.ray-site-root h2');
    expect(scoped).toContain('color: teal;');
    expect(scoped).not.toContain('!important');
  });

  it('neutralizes </style> breakouts', () => {
    const scoped = scopeGlobalCss('.a::after { content: "</style><script>alert(1)</script>"; }');
    expect(scoped).not.toContain('</style>');
    expect(scoped).toContain('<\\/style');
  });

  it('maps :root to the site root even with a comment before it (merchant bug)', () => {
    // Regression: `/* note */ :root { … }` used to become
    // `.ray-site-root /* note */ :root`, which matches nothing — theme
    // variable overrides silently died. Comments are stripped pre-parse.
    const scoped = scopeGlobalCss(
      '/* تجربة: اقلب الثيم كله */\n:root { --ray-color-primary: #7c3aed; }'
    );
    expect(scoped).not.toContain('/*');
    expect(scoped).toContain('.ray-site-root{');
    expect(scoped).toContain('--ray-color-primary: #7c3aed');
  });

  it('strips comments so ; and , inside them cannot corrupt rules', () => {
    const scoped = scopeGlobalCss(
      [
        '/* note; with comma, and brace { */',
        'h2 { letter-spacing: -0.5px; }',
        'button { transition: box-shadow 0.2s ease; /* keep; calm */ box-shadow: none; }',
      ].join('\n')
    );
    expect(scoped).not.toContain('/*');
    expect(scoped).toContain('.ray-site-root h2');
    expect(scoped).toContain('.ray-site-root button');
    expect(scoped).toContain('letter-spacing: -0.5px;');
    expect(scoped).toContain('box-shadow: none;');
  });
});

describe('published stylesheet', () => {
  it('contains theme variables, global css and scoped node css', () => {
    const site = buildWebsite({
      settings: { branding: { customCss: 'h1 { letter-spacing: 1px; }' } },
    });
    const sheet = buildWebsiteStylesheet(site);
    expect(sheet).toContain('--ray-color-primary');
    expect(sheet).toContain('.ray-site-root h1');
    expect(sheet).toContain('#custom_code_abc .a');
  });
});

describe('theme variable substitution', () => {
  it('replaces baked token values with live variables', () => {
    const styles = {
      backgroundColor: '#1D4ED8',
      borderRadius: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      fontSize: '14px',
    };
    const substituted = applyThemeVariables(styles, { colors: { primary: '#1d4ed8' } });
    expect(substituted.backgroundColor).toBe('var(--ray-color-primary)');
    expect(substituted.borderRadius).toBe('var(--ray-radius-lg)');
    expect(substituted.boxShadow).toBe('var(--ray-shadow-md)');
    expect(substituted.fontSize).toBe('14px');
  });

  it('leaves non-token values untouched', () => {
    const styles = { backgroundColor: '#ff00aa' };
    expect(applyThemeVariables(styles, {})).toEqual(styles);
  });
});

describe('splitHeadCode', () => {
  it('extracts meta tags and returns the remainder', () => {
    const { meta, rest } = splitHeadCode(
      '<meta name="google-site-verification" content="abc123"><script src="https://x/pixel.js"></script>'
    );
    expect(meta).toEqual({ 'google-site-verification': 'abc123' });
    expect(rest).toContain('pixel.js');
    expect(rest).not.toContain('google-site-verification');
  });
});

describe('applyWebsiteFileDrafts', () => {
  it('overlays unsaved drafts onto the website without mutating the source', () => {
    const site = buildWebsite();
    const preview = applyWebsiteFileDrafts(site, {
      'theme/global.css': '.ray-site-root h2 { color: purple; }',
      'pages/about/head.html': '<meta name="draft" content="1">',
    });
    expect(preview.settings?.branding?.customCss).toBe('.ray-site-root h2 { color: purple; }');
    expect((preview.pages[1] as any).customHeadCode).toBe('<meta name="draft" content="1">');
    // Source untouched — drafts are preview-only until saved.
    expect(site.settings?.branding?.customCss).toBeUndefined();
  });

  it('skips invalid payloads and unknown paths so the preview stays renderable', () => {
    const site = buildWebsite();
    const preview = applyWebsiteFileDrafts(site, {
      'theme/tokens.json': '{oops',
      'no/such/file.css': '.a{}',
      'theme/global.css': '.ray-site-root button { box-shadow: none; }',
    });
    expect(preview.settings?.branding?.customCss).toBe(
      '.ray-site-root button { box-shadow: none; }'
    );
    expect(preview.theme).toBe(site.theme);
    expect(applyWebsiteFileDrafts(site, null)).toBe(site);
  });

  it('feeds the published stylesheet exactly like a saved website would', () => {
    const site = buildWebsite();
    const preview = applyWebsiteFileDrafts(site, {
      'theme/global.css': '/* تجربة */\n:root { --ray-color-accent: #f59e0b; }',
    });
    const sheet = buildWebsiteStylesheet(preview);
    expect(sheet).toContain('--ray-color-accent: #f59e0b');
    // The override lands after the theme variable block → it wins over the theme.
    expect(sheet.indexOf('--ray-color-accent: #f59e0b')).toBeGreaterThan(
      sheet.indexOf(':root, .ray-site-root {')
    );
  });
});
