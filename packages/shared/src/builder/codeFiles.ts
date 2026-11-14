// ---------------------------------------------------------------------------
// codeFiles.ts — the builder's VIRTUAL CODE FILE SYSTEM + stylesheet engine
//
// Shopify model ("Edit code" + Custom CSS), adapted to the Ray builder:
//   • theme/global.css        → website.settings.branding.customCss (SITE-WIDE)
//   • theme/tokens.json       → website.theme design tokens (AI-friendly JSON)
//   • pages/<slug>/head.html  → page.customHeadCode (home page is injected
//                               into the published <head>/metadata)
//   • pages/<slug>/body.html  → page.customBodyCode
//   • components/<name>--<nodeId>.{html,css,js} → node.customCode snippets
//
// Everything here is PURE (no DOM, no React) so it runs in the dashboard,
// the marketplace server components, and future AI tooling alike. The AI
// assistant planned later drives exactly these list/read/write functions.
//
// Scoping rules (mirrors Shopify section Custom CSS):
//   • Node CSS selectors are auto-prefixed with `#<nodeId>` and declarations
//     get `!important` so merchant CSS can override the renderer's inline
//     styles without fighting specificity.
//   • Global CSS selectors are auto-prefixed with `.ray-site-root` so a
//     merchant can never style the dashboard chrome — only their site.
// ---------------------------------------------------------------------------

import type { BuilderPage, ComponentNode, DesignTokens, Website } from './types';
import { resolveTheme } from './theme';

// ── Types ───────────────────────────────────────────────────────────────────

export type WebsiteFileKind =
  | 'theme-global-css'
  | 'theme-tokens-json'
  | 'page-head'
  | 'page-body'
  | 'component-html'
  | 'component-css'
  | 'component-js';

export type WebsiteFileLanguage = 'css' | 'html' | 'javascript' | 'json';

export interface WebsiteFileEntry {
  /** Virtual path, e.g. `theme/global.css`, `pages/home/head.html`. */
  path: string;
  kind: WebsiteFileKind;
  language: WebsiteFileLanguage;
  /** Arabic display label for the file tree. */
  label: string;
  nodeId?: string;
  pageId?: string;
  /** File content can be cleared by the user (structural files like tokens are not). */
  deletable: boolean;
}

export interface WriteWebsiteFileResult {
  website: Website;
  changed: boolean;
  /** Set when the file exists but the content could not be applied (bad JSON…). */
  error?: string;
}

// ── Sanitization (merchant-authored CSS must never break out of <style>) ───

/** Neutralize `</style>` breakouts and dangerous url() schemes in authored CSS. */
export function sanitizeCssText(css: string): string {
  return String(css || '')
    .replace(/<\/style/gi, '<\\/style')
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '(');
}

/** Safe a single CSS token value (color / font stack / shadow) for interpolation. */
export function sanitizeCssToken(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const safe = raw.replace(/[{}<>;`]/g, '').trim();
  return safe || fallback;
}

// ── Theme CSS variables ─────────────────────────────────────────────────────

/** Variable names exposed to merchant/AI CSS (e.g. `var(--ray-color-primary)`). */
const THEME_VARIABLE_MAP: Array<[string, string]> = [
  ['colors.primary', '--ray-color-primary'],
  ['colors.primaryHover', '--ray-color-primary-hover'],
  ['colors.secondary', '--ray-color-secondary'],
  ['colors.accent', '--ray-color-accent'],
  ['colors.background', '--ray-color-background'],
  ['colors.surface', '--ray-color-surface'],
  ['colors.textPrimary', '--ray-color-text-primary'],
  ['colors.textSecondary', '--ray-color-text-secondary'],
  ['colors.textMuted', '--ray-color-text-muted'],
  ['colors.border', '--ray-color-border'],
  ['colors.success', '--ray-color-success'],
  ['colors.warning', '--ray-color-warning'],
  ['colors.error', '--ray-color-error'],
  ['typography.fontHeading', '--ray-font-heading'],
  ['typography.fontBody', '--ray-font-body'],
  ['typography.baseFontSize', '--ray-font-size-base'],
  ['radius.sm', '--ray-radius-sm'],
  ['radius.md', '--ray-radius-md'],
  ['radius.lg', '--ray-radius-lg'],
  ['radius.xl', '--ray-radius-xl'],
  ['radius.full', '--ray-radius-full'],
  ['shadows.sm', '--ray-shadow-sm'],
  ['shadows.md', '--ray-shadow-md'],
  ['shadows.lg', '--ray-shadow-lg'],
  ['shadows.glow', '--ray-shadow-glow'],
];

function readTokenPath(tokens: DesignTokens, path: string): unknown {
  const [group, key] = path.split('.');
  return (tokens as unknown as Record<string, Record<string, unknown>>)[group]?.[key];
}

/**
 * Structural (deep-partial) theme input — lets merchants/AI pass a subset of
 * tokens (e.g. `{ colors: { primary: '#000' } }`) without the full shape.
 */
export type LooseDesignTokens = {
  colors?: Record<string, unknown> | null;
  typography?: Record<string, unknown> | null;
  radius?: Record<string, unknown> | null;
  shadows?: Record<string, unknown> | null;
  spacingUnit?: unknown;
};

/** `:root` + `.ray-site-root` variable block generated from design tokens. */
export function buildThemeVariablesCss(theme?: LooseDesignTokens | null): string {
  const tokens = resolveTheme(theme as unknown as Partial<DesignTokens>);
  const lines = THEME_VARIABLE_MAP.map(([path, varName]) => {
    const value = sanitizeCssToken(readTokenPath(tokens, path), '');
    return value ? `  ${varName}: ${value};` : '';
  }).filter(Boolean);
  return [':root, .ray-site-root {', ...lines, '}'].join('\n');
}

// ── Theme-variable substitution (values baked into node styles become live) ─

const hexNormalize = (value: string): string =>
  /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : value.trim();

/**
 * Replace style values that exactly equal a theme token with its CSS variable
 * reference. Old documents have theme colors/fonts BAKED into every node's
 * inline styles; after substitution they become live `var(--ray-…)` references
 * so later theme changes (and merchant CSS) propagate everywhere again — the
 * exact Shopify theme-settings behavior.
 */
export function applyThemeVariables<T extends object>(
  styles: T,
  theme?: LooseDesignTokens | null
): T {
  const tokens = resolveTheme(theme as unknown as Partial<DesignTokens>);
  const valueToVariable = new Map<string, string>();
  THEME_VARIABLE_MAP.forEach(([path, varName]) => {
    // Radius/shadows keep unit-bearing values; colors normalize hex case.
    const isColor = path.startsWith('colors.');
    const raw = readTokenPath(tokens, path);
    if (raw === undefined || raw === null) return;
    const value = isColor ? hexNormalize(String(raw)) : String(raw).trim();
    if (value) valueToVariable.set(value, varName);
  });
  if (valueToVariable.size === 0) return styles;

  const next: Record<string, unknown> = { ...(styles as Record<string, unknown>) };
  let changed = false;
  for (const [prop, value] of Object.entries(next)) {
    if (typeof value !== 'string' || !value) continue;
    const matched = valueToVariable.get(hexNormalize(value)) || valueToVariable.get(value.trim());
    if (matched && matched !== value) {
      next[prop] = `var(${matched})`;
      changed = true;
    }
  }
  return (changed ? next : styles) as T;
}

// ── CSS scoping (Shopify-style section scoping) ─────────────────────────────

type ScopeMode = 'global' | 'node';

const AT_RULES_TO_SKIP = ['@import', '@charset'];
const AT_RULES_VERBATIM = ['@font-face', '@keyframes', '@page', '@property'];
const AT_RULES_RECURSE = ['@media', '@supports', '@layer', '@container'];

function scopeSelector(selector: string, mode: ScopeMode, nodeId?: string): string | null {
  const raw = selector.trim();
  if (!raw) return null;
  const bare = raw.replace(/^:root(?![\w-])/i, '').trim();
  // `:root`/`html`/`body` map onto the component element itself (node mode)
  // or the site root wrapper (global mode).
  if (bare === '' || /^(html|body|:host)$/i.test(bare)) {
    return mode === 'node' && nodeId ? `#${cssEscapeId(nodeId)}` : '.ray-site-root';
  }
  if (mode === 'node' && nodeId) return `#${cssEscapeId(nodeId)} ${raw}`;
  return `.ray-site-root ${raw}`;
}

/** Minimal ID escape for selector use (ids are our own, but stay defensive). */
function cssEscapeId(id: string): string {
  return id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function appendImportant(declaration: string): string {
  const trimmed = declaration.trim();
  if (!trimmed || trimmed.startsWith('/*')) return declaration;
  if (/!\s*important/i.test(trimmed)) return declaration;
  // `!important` must land BEFORE the trailing semicolon, never after it.
  const endsWithSemicolon = /;\s*$/.test(declaration);
  const base = declaration.replace(/;\s*$/, '').replace(/\s+$/, '');
  return `${base} !important${endsWithSemicolon ? ';' : ''}`;
}

/**
 * Full scoping pass. Implemented as a single walk (prelude+body pairs) so
 * selector rewriting and nesting rules stay in one place.
 */
function scopeStylesheet(
  css: string,
  mode: ScopeMode,
  nodeId: string | undefined,
  important: boolean
): string {
  const source = sanitizeCssText(css);
  if (!source.trim()) return '';
  let result = '';
  let i = 0;
  while (i < source.length) {
    // Accumulate until the next '{' or end. Semicolon-terminated at-rules
    // (@import/@charset) have no block — consume and drop them so they never
    // swallow the rule that follows.
    let prelude = '';
    while (i < source.length && source[i] !== '{' && source[i] !== '}') {
      const char = source[i];
      prelude += char;
      i += 1;
      if (char === ';' && /^@(?:import|charset)/i.test(prelude.trim())) {
        prelude = '';
      }
    }
    if (i >= source.length) {
      result += prelude;
      break;
    }
    if (source[i] === '}') {
      // Stray closing brace — preserve structure.
      result += prelude + '}';
      i += 1;
      continue;
    }
    // source[i] === '{' — capture the balanced body.
    i += 1;
    let body = '';
    let depth = 1;
    while (i < source.length && depth > 0) {
      const char = source[i];
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
      body += char;
      i += 1;
    }
    i += 1; // skip closing '}'

    const preludeTrim = prelude.trim();
    const atRule = preludeTrim.toLowerCase().split(/[\s(]/)[0];

    if (AT_RULES_TO_SKIP.includes(atRule)) {
      // Remote/charset imports are dropped entirely.
      continue;
    }
    if (AT_RULES_VERBATIM.includes(atRule)) {
      result += `${prelude}{${body}}`;
      continue;
    }
    if (AT_RULES_RECURSE.includes(atRule)) {
      const innerImportant = important && atRule !== '@keyframes';
      result += `${prelude}{${scopeStylesheet(body, mode, nodeId, atRule === '@keyframes' ? false : innerImportant)}}`;
      continue;
    }

    // Ordinary rule: scope each comma-separated selector.
    const selectors = preludeTrim
      .split(',')
      .map((selector) => scopeSelector(selector, mode, nodeId))
      .filter((selector): selector is string => Boolean(selector));
    if (selectors.length === 0) continue;

    const declarations: string[] = [];
    let declaration = '';
    let declDepth = 0;
    for (let j = 0; j < body.length; j++) {
      const char = body[j];
      if (char === '{') declDepth += 1;
      else if (char === '}') declDepth -= 1;
      declaration += char;
      if (char === ';' && declDepth === 0) {
        declarations.push(declaration);
        declaration = '';
      }
    }
    if (declaration.trim()) declarations.push(declaration);

    const scopedBody = declarations
      .map((decl) => (important && declDepth >= 0 ? appendImportant(decl) : decl))
      .join('');
    result += `${selectors.join(', ')}{${scopedBody}}`;
  }
  return result;
}

/** Scope merchant CSS written for ONE component (auto `#nodeId` + !important). */
export function scopeNodeCss(css: string, nodeId: string): string {
  return scopeStylesheet(css, 'node', nodeId, true);
}

/** Scope site-wide merchant CSS (auto `.ray-site-root`, no !important). */
export function scopeGlobalCss(css: string): string {
  return scopeStylesheet(css, 'global', undefined, false);
}

// ── The published stylesheet (variables + global + all node CSS) ────────────

const readNodeSnippet = (node: ComponentNode, kind: 'css' | 'js' | 'html'): string => {
  const cc = node.customCode || {};
  if (kind === 'css') return String(cc.cssSnippet ?? cc.css ?? '');
  if (kind === 'js') return String(cc.jsSnippet ?? cc.js ?? '');
  return String(cc.tsxSnippet ?? cc.tsx ?? node.props?.html ?? '');
};

const nodeCodeEnabled = (node: ComponentNode): boolean => node.customCode?.enabled !== false;

/**
 * Everything merchant-authored that must style the rendered site, as ONE
 * stylesheet: theme variables → site-wide CSS → per-component scoped CSS.
 * Injected by SiteRenderer / PublicSiteRenderer (published) and CanvasArea
 * (editor preview) so what merchants see while editing matches the live site.
 */
export function buildWebsiteStylesheet(website: Website): string {
  const parts: string[] = [buildThemeVariablesCss(website.theme)];

  const globalCss = scopeGlobalCss(String(website.settings?.branding?.customCss || ''));
  if (globalCss.trim()) parts.push(globalCss);

  Object.values(website.components || {}).forEach((node) => {
    if (!node || !nodeCodeEnabled(node)) return;
    const css = readNodeSnippet(node, 'css');
    if (!css.trim()) return;
    const scoped = scopeNodeCss(css, node.id);
    if (scoped.trim()) parts.push(scoped);
  });

  return parts.join('\n\n');
}

// ── Virtual file system ─────────────────────────────────────────────────────

const COMPONENTS_GROUP = 'المكوّنات';
const safeFileName = (name: string): string =>
  (name || 'component')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 40) || 'component';

const nodeIdFromPath = (path: string): string | null => {
  const base = path.split('/').pop() || '';
  const withoutExt = base.replace(/\.(html|css|js|json)$/i, '');
  const marker = withoutExt.lastIndexOf('--');
  return marker >= 0 ? withoutExt.slice(marker + 2) : null;
};

const extFromPath = (path: string): 'html' | 'css' | 'js' | 'json' =>
  (path.split('.').pop() as 'html' | 'css' | 'js' | 'json') || 'html';

const componentPath = (node: ComponentNode, ext: 'html' | 'css' | 'js'): string =>
  `${COMPONENTS_GROUP}/${safeFileName(node.name)}--${node.id}.${ext}`;

interface ListFilesOptions {
  /** Always include all three files for these node ids (e.g. the selection). */
  includeNodeIds?: string[];
}

/** The file tree shown in the code environment (and readable by future AI). */
export function listWebsiteFiles(
  website: Website,
  options: ListFilesOptions = {}
): WebsiteFileEntry[] {
  const files: WebsiteFileEntry[] = [];
  const includeIds = new Set(options.includeNodeIds || []);

  files.push({
    path: 'theme/global.css',
    kind: 'theme-global-css',
    language: 'css',
    label: 'CSS المخصص العام — يطبق على كل الصفحات',
    deletable: true,
  });
  files.push({
    path: 'theme/tokens.json',
    kind: 'theme-tokens-json',
    language: 'json',
    label: 'متغيرات الثيم (الألوان والخطوط) — JSON',
    deletable: false,
  });

  (website.pages || []).forEach((page) => {
    const slug = page.slug || page.id;
    files.push({
      path: `pages/${slug}/head.html`,
      kind: 'page-head',
      language: 'html',
      label: `كود Head — ${page.name || slug}`,
      pageId: page.id,
      deletable: true,
    });
    files.push({
      path: `pages/${slug}/body.html`,
      kind: 'page-body',
      language: 'html',
      label: `كود Body — ${page.name || slug}`,
      pageId: page.id,
      deletable: true,
    });
  });

  Object.values(website.components || {}).forEach((node) => {
    if (!node) return;
    const hasAnyCode =
      nodeCodeEnabled(node) &&
      Boolean(
        readNodeSnippet(node, 'html').trim() ||
        readNodeSnippet(node, 'css').trim() ||
        readNodeSnippet(node, 'js').trim() ||
        node.type === 'custom-code'
      );
    if (!hasAnyCode && !includeIds.has(node.id)) return;
    const html = readNodeSnippet(node, 'html');
    const css = readNodeSnippet(node, 'css');
    const js = readNodeSnippet(node, 'js');
    if (html.trim() || node.type === 'custom-code' || includeIds.has(node.id)) {
      files.push({
        path: componentPath(node, 'html'),
        kind: 'component-html',
        language: 'html',
        label: `HTML — ${node.name}`,
        nodeId: node.id,
        deletable: true,
      });
    }
    if (css.trim() || includeIds.has(node.id)) {
      files.push({
        path: componentPath(node, 'css'),
        kind: 'component-css',
        language: 'css',
        label: `CSS — ${node.name}`,
        nodeId: node.id,
        deletable: true,
      });
    }
    if (js.trim() || includeIds.has(node.id)) {
      files.push({
        path: componentPath(node, 'js'),
        kind: 'component-js',
        language: 'javascript',
        label: `JavaScript — ${node.name}`,
        nodeId: node.id,
        deletable: true,
      });
    }
  });

  return files;
}

/** Read the current content of a virtual file (empty string when blank). */
export function readWebsiteFile(website: Website, path: string): string | null {
  if (path === 'theme/global.css') {
    return String(website.settings?.branding?.customCss || '');
  }
  if (path === 'theme/tokens.json') {
    try {
      return JSON.stringify(resolveTheme(website.theme), null, 2);
    } catch {
      return '{}';
    }
  }
  const ext = extFromPath(path);
  if (path.startsWith('pages/')) {
    const slug = path.split('/')[1];
    const file = path.split('/')[2] || '';
    const page = (website.pages || []).find(
      (candidate) => (candidate.slug || candidate.id) === slug
    );
    if (!page) return null;
    if (file === 'head.html') return pageHeadCode(page);
    if (file === 'body.html') return pageBodyCode(page);
    return '';
  }
  if (path.startsWith(`${COMPONENTS_GROUP}/`)) {
    const nodeId = nodeIdFromPath(path);
    if (!nodeId) return null;
    const node = website.components?.[nodeId];
    if (!node) return null;
    if (ext === 'css') return readNodeSnippet(node, 'css');
    if (ext === 'js') return readNodeSnippet(node, 'js');
    return readNodeSnippet(node, 'html');
  }
  return null;
}

// NOTE: page head/body storage — BuilderPage declares customHeadCode/customBodyCode.
const pageHeadCode = (page: BuilderPage): string =>
  String((page as BuilderPage & { customHeadCode?: string }).customHeadCode || '');
const pageBodyCode = (page: BuilderPage): string =>
  String((page as BuilderPage & { customBodyCode?: string }).customBodyCode || '');

export { pageHeadCode, pageBodyCode };

/** Read a page's head/body code by page id (used by the published renderer). */
export function readPageInjectionCode(
  website: Website,
  pageId: string,
  kind: 'head' | 'body'
): string {
  const page = (website.pages || []).find((candidate) => candidate.id === pageId);
  if (!page) return '';
  return kind === 'head' ? pageHeadCode(page) : pageBodyCode(page);
}

/**
 * Apply a virtual-file edit to the website state (pure, immutable).
 * Returns null when the path is unknown — callers treat that as "no such file".
 */
export function writeWebsiteFile(
  website: Website,
  path: string,
  content: string
): WriteWebsiteFileResult | null {
  const value = String(content ?? '');

  if (path === 'theme/global.css') {
    const current = String(website.settings?.branding?.customCss || '');
    if (current === value) return { website, changed: false };
    return {
      website: {
        ...website,
        settings: {
          ...(website.settings || {}),
          branding: { ...(website.settings?.branding || {}), customCss: value },
        },
      },
      changed: true,
    };
  }

  if (path === 'theme/tokens.json') {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { website, changed: false, error: 'JSON غير صالح — يجب أن يكون كائن ثيم.' };
      }
      return {
        website: { ...website, theme: { ...resolveTheme(website.theme), ...parsed } },
        changed: true,
      };
    } catch {
      return { website, changed: false, error: 'تعذر قراءة JSON — راجع الصيغة ثم أعد المحاولة.' };
    }
  }

  if (path.startsWith('pages/')) {
    const [, slug, file] = path.split('/');
    const kind = file === 'head.html' ? 'head' : file === 'body.html' ? 'body' : null;
    if (!slug || !kind) return null;
    let touched = false;
    const pages = (website.pages || []).map((page) => {
      if ((page.slug || page.id) !== slug) return page;
      touched = true;
      if (kind === 'head') {
        return { ...page, customHeadCode: value } as BuilderPage & { customHeadCode: string };
      }
      return { ...page, customBodyCode: value } as BuilderPage & { customBodyCode: string };
    });
    if (!touched) return null;
    return { website: { ...website, pages }, changed: true };
  }

  if (path.startsWith(`${COMPONENTS_GROUP}/`)) {
    const nodeId = nodeIdFromPath(path);
    if (!nodeId) return null;
    const node = website.components?.[nodeId];
    if (!node) return null;
    const ext = extFromPath(path);
    const existing = node.customCode || {};
    let customCode: typeof existing;
    let props = node.props;
    if (ext === 'css')
      customCode = { ...existing, cssSnippet: value, css: undefined, enabled: true };
    else if (ext === 'js')
      customCode = { ...existing, jsSnippet: value, js: undefined, enabled: true };
    else {
      customCode = { ...existing, tsxSnippet: value, tsx: undefined, enabled: true };
      // CustomCodeFrame prefers props.html — keep both in sync so edits are
      // never shadowed by a stale template default.
      props = { ...node.props, html: value };
    }
    return {
      website: {
        ...website,
        components: { ...website.components, [nodeId]: { ...node, customCode, props } },
      },
      changed: true,
    };
  }

  return null;
}

// ── Head-code meta extraction (published <head> parity) ─────────────────────

const META_TAG_RE = /<meta\s+([^>]*?)name\s*=\s*["']([^"']+)["']\s*([^>]*?)>/gi;
const META_CONTENT_RE = /content\s*=\s*["']([^"']*)["']/i;

export interface HeadCodeSplit {
  /** name→content pairs for Next.js `metadata.other`. */
  meta: Record<string, string>;
  /** Everything else (scripts/styles/links) — merchant-trusted, render as-is. */
  rest: string;
}

/**
 * Split a page's customHeadCode into <meta> tags (safe to hoist into Next.js
 * metadata) and the remainder (pixels/scripts — injected into the page body).
 */
export function splitHeadCode(headCode: string): HeadCodeSplit {
  const meta: Record<string, string> = {};
  let rest = String(headCode || '');
  if (!rest.trim()) return { meta, rest };

  rest = rest.replace(META_TAG_RE, (full, _before: string, name: string) => {
    const contentMatch = full.match(META_CONTENT_RE);
    if (contentMatch) meta[name] = contentMatch[1];
    return '';
  });
  return { meta, rest: rest.trim() };
}
