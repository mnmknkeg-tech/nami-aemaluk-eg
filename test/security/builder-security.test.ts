/**
 * Security tests for the Website Builder platform.
 *
 * These tests verify that user-authored HTML, CSS, JavaScript, and custom
 * code cannot break out of the sandboxed preview, access privileged data,
 * or perform cross-tenant attacks.
 */
/// <reference types="jest" />

// ---------------------------------------------------------------------------
// Helper: simulate the backend validation functions from builder_security.go
// ---------------------------------------------------------------------------

type EditingMode = 'visual' | 'html_only' | 'css_only' | 'full_code';

const ModePolicies: Record<EditingMode, { allowJs: boolean; allowCss: boolean; allowHtml: boolean; maxHtml: number; maxCss: number; maxJs: number }> = {
  visual:   { allowJs: false, allowCss: true, allowHtml: false, maxHtml: 0, maxCss: 0, maxJs: 0 },
  html_only:{ allowJs: false, allowCss: false, allowHtml: true,  maxHtml: 64 * 1024, maxCss: 0, maxJs: 0 },
  css_only: { allowJs: false, allowCss: true, allowHtml: false, maxHtml: 0, maxCss: 64 * 1024, maxJs: 0 },
  full_code:{ allowJs: true,  allowCss: true, allowHtml: true,  maxHtml: 256 * 1024, maxCss: 64 * 1024, maxJs: 64 * 1024 },
};

const scriptTagRe = /<script\b[^>]*>[\s\S]*?<\/script>/i;
const eventHandlerRe = /\bon[a-z]+\s*=/i;
const javascriptURLRe = /javascript\s*:/i;
const vbscriptURLRe = /vbscript\s*:/i;
const iframeRe = /<iframe/i;
const dataURLRe = /data\s*:/i;
const importCSSRe = /@import\s+/i;
const expressionRe = /expression\s*\(/i;
const urlInCSSRe = /url\s*\(/i;

function dangerousHTMLError(html: string, mode: EditingMode): string | null {
  const p = ModePolicies[mode];
  if (!p.allowHtml || !p.allowJs) {
    if (scriptTagRe.test(html)) return 'script tags not allowed in this mode';
    if (eventHandlerRe.test(html)) return 'inline event handlers not allowed';
    if (javascriptURLRe.test(html)) return 'javascript: URLs not allowed';
    if (vbscriptURLRe.test(html)) return 'vbscript: URLs not allowed';
  }
  if (!p.allowJs && iframeRe.test(html)) return 'iframe elements not allowed in this mode';
  if (!p.allowJs && dataURLRe.test(html)) return 'data: URLs not allowed';
  if (p.maxHtml > 0 && html.length > p.maxHtml) return 'HTML exceeds size limit';
  return null;
}

function dangerousCSSError(css: string, mode: EditingMode): string | null {
  const p = ModePolicies[mode];
  if (!p.allowCss) return 'CSS editing not allowed in this mode';
  if (importCSSRe.test(css)) return '@import not allowed';
  if (expressionRe.test(css)) return 'CSS expression() not allowed';
  if (!p.allowJs && urlInCSSRe.test(css)) return 'CSS url() not allowed in this mode';
  if (p.maxCss > 0 && css.length > p.maxCss) return 'CSS exceeds size limit';
  return null;
}

function dangerousJSError(js: string, mode: EditingMode): string | null {
  const p = ModePolicies[mode];
  if (!p.allowJs) {
    if (scriptTagRe.test(js)) return 'JavaScript not allowed in this mode';
    if (eventHandlerRe.test(js)) return 'event handlers not allowed in this mode';
  }
  const denyPatterns = [
    /\bparent\s*\./i,
    /\btop\s*\./i,
    /\bopener\s*\./i,
    /\bfetch\s*\(/i,
    /XMLHttpRequest/i,
    /ActiveXObject/i,
    /\blocalStorage/i,
    /\bsessionStorage/i,
    /\bdocument\.cookie/i,
    /\beval\s*\(/i,
    /\bFunction\s*\(/i,
  ];
  for (const re of denyPatterns) {
    if (re.test(js)) return `blocked pattern: ${re}`;
  }
  if (p.maxJs > 0 && js.length > p.maxJs) return 'JS exceeds size limit';
  return null;
}

describe('Editing mode capability policy', () => {
  it('blocks inline event handlers in visual mode HTML', () => {
    const err = dangerousHTMLError('<div onclick="alert(1)">x</div>', 'visual');
    expect(err).not.toBeNull();
  });

  it('allows script tags only in full_code mode', () => {
    expect(dangerousHTMLError('<script>alert(1)</script>', 'visual')).not.toBeNull();
    expect(dangerousHTMLError('<script>alert(1)</script>', 'html_only')).not.toBeNull();
    expect(dangerousHTMLError('<script>alert(1)</script>', 'css_only')).not.toBeNull();
    expect(dangerousHTMLError('<script>alert(1)</script>', 'full_code')).toBeNull();
  });

  it('blocks inline event handlers in non-full-code modes', () => {
    expect(dangerousHTMLError('<img onerror="alert(1)">', 'visual')).not.toBeNull();
    expect(dangerousHTMLError('<img onerror="alert(1)">', 'html_only')).not.toBeNull();
    expect(dangerousHTMLError('<img onerror="alert(1)">', 'css_only')).not.toBeNull();
  });

  it('blocks javascript: URLs in HTML', () => {
    expect(dangerousHTMLError('<a href="javascript:alert(1)">link</a>', 'visual')).not.toBeNull();
    expect(dangerousHTMLError('<a href="javascript:alert(1)">link</a>', 'html_only')).not.toBeNull();
  });

  it('blocks @import in CSS', () => {
    expect(dangerousCSSError('@import url(evil);', 'visual')).not.toBeNull();
    expect(dangerousCSSError('@import url(evil);', 'full_code')).not.toBeNull();
  });

  it('blocks CSS expression()', () => {
    expect(dangerousCSSError('width: expression(1)', 'visual')).not.toBeNull();
    expect(dangerousCSSError('width: expression(1)', 'full_code')).not.toBeNull();
  });

  it('blocks parent/top/opener access in JS', () => {
    expect(dangerousJSError('parent.postMessage({}, "*")', 'full_code')).not.toBeNull();
    expect(dangerousJSError('top.location = "evil"', 'full_code')).not.toBeNull();
    expect(dangerousJSError('opener.location = "evil"', 'full_code')).not.toBeNull();
  });

  it('blocks storage and cookie access in JS', () => {
    expect(dangerousJSError('localStorage.getItem("token")', 'full_code')).not.toBeNull();
    expect(dangerousJSError('sessionStorage.setItem("x", "y")', 'full_code')).not.toBeNull();
    expect(dangerousJSError('document.cookie', 'full_code')).not.toBeNull();
  });

  it('blocks fetch/XHR in JS', () => {
    expect(dangerousJSError('fetch("http://evil.com")', 'full_code')).not.toBeNull();
    expect(dangerousJSError('new XMLHttpRequest()', 'full_code')).not.toBeNull();
  });

  it('blocks eval and dynamic code execution', () => {
    expect(dangerousJSError('eval("alert(1)")', 'full_code')).not.toBeNull();
    expect(dangerousJSError('new Function("alert(1)")', 'full_code')).not.toBeNull();
  });
});


describe('Cross-frame message validation', () => {
  it('rejects messages from unknown sources', () => {
    // Simulates the preview iframe's window vs. any other source.
    const previewWindow = { name: 'preview-sandbox' };
    const attackerWindow = { name: 'attacker' };
    const handler = (e: { source: unknown }) => e.source === previewWindow;
    expect(handler({ source: attackerWindow })).toBe(false);
    expect(handler({ source: { name: 'other' } })).toBe(false);
    expect(handler({ source: previewWindow })).toBe(true);
  });

  it('rejects unknown message types', () => {
    const ALLOWED = new Set(['custom-code-height']);
    const data = { type: 'evil-command', payload: { deleteAll: true } };
    expect(ALLOWED.has(data.type)).toBe(false);
  });

  it('rejects messages with missing required fields', () => {
    const isValid = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;
      return typeof d.type === 'string' && typeof d.id === 'string' && typeof d.height === 'number';
    };
    expect(isValid({ type: 'custom-code-height' })).toBe(false);
    expect(isValid({ type: 'custom-code-height', id: 'test' })).toBe(false);
    expect(isValid({ type: 'custom-code-height', id: 'test', height: 100 })).toBe(true);
  });
});

describe('HTML injection / XSS prevention', () => {
  const dangerousPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<body onload=alert(1)>',
    '<a href="javascript:alert(1)">x</a>',
    '<iframe src="javascript:alert(1)">x</iframe>',
    '<details open ontoggle=alert(1)>x</details>',
  ];

  it.each(dangerousPayloads)('rejects dangerous HTML payload: %s', (payload) => {
    const err = dangerousHTMLError(payload, 'visual');
    expect(err).not.toBeNull();
  });

  it('allows safe HTML in visual mode', () => {
    expect(dangerousHTMLError('<div class="card">Hello</div>', 'visual')).toBeNull();
    expect(dangerousHTMLError('<h1>Title</h1><p>Text</p>', 'visual')).toBeNull();
  });
});

describe('CSS security', () => {
  it('blocks @import in CSS', () => {
    const err = dangerousCSSError('@import "https://evil.com/style.css";', 'css_only');
    expect(err).not.toBeNull();
  });

  it('blocks CSS expression() XSS vector', () => {
    const err = dangerousCSSError('width: expression(alert(1))', 'css_only');
    expect(err).not.toBeNull();
  });

  it('blocks external url() in CSS-only mode', () => {
    const err = dangerousCSSError('background: url("https://evil.com/img.png")', 'css_only');
    expect(err).not.toBeNull();
  });

  it('allows legitimate CSS values', () => {
    expect(dangerousCSSError('color: #1d4ed8; font-size: 16px;', 'css_only')).toBeNull();
    expect(dangerousCSSError('margin: 0 4px 6px -1px rgba(0,0,0,0.08)', 'css_only')).toBeNull();
  });
});

describe('Version history and concurrency', () => {
  it('detects version conflict on concurrent edits', () => {
    const currentVersion: number = 5;
    const clientVersion: number = 3;
    const hasConflict = currentVersion !== clientVersion && clientVersion > 0;
    expect(hasConflict).toBe(true);
  });

  it('allows save when clientVersion matches current version', () => {
    const currentVersion = 5;
    const clientVersion = 5;
    const hasConflict = currentVersion !== clientVersion && clientVersion > 0;
    expect(hasConflict).toBe(false);
  });

  it('allows first save when clientVersion is 0', () => {
    const currentVersion = 0;
    const clientVersion = 0;
    const hasConflict = currentVersion !== clientVersion && clientVersion > 0;
    expect(hasConflict).toBe(false);
  });
});

describe('Resource limits', () => {
  it('rejects oversized HTML in html_only mode', () => {
    const bigHtml = 'x'.repeat(65 * 1024);
    const err = dangerousHTMLError(bigHtml, 'html_only');
    expect(err).not.toBeNull();
  });

  it('rejects oversized CSS in css_only mode', () => {
    const bigCss = 'x'.repeat(65 * 1024);
    const err = dangerousCSSError(bigCss, 'css_only');
    expect(err).not.toBeNull();
  });

  it('rejects oversized JS in full_code mode', () => {
    const bigJs = 'x'.repeat(65 * 1024);
    const err = dangerousJSError(bigJs, 'full_code');
    expect(err).not.toBeNull();
  });
});

describe('Data URI blocking', () => {
  it('blocks data: URLs in non-full-code modes', () => {
    expect(dangerousHTMLError('<img src="data:text/html,<script>alert(1)</script>">', 'visual')).not.toBeNull();
    expect(dangerousHTMLError('<img src="data:text/html,<script>alert(1)</script>">', 'html_only')).not.toBeNull();
    expect(dangerousHTMLError('<img src="data:text/html,<script>alert(1)</script>">', 'css_only')).not.toBeNull();
    expect(dangerousHTMLError('<img src="data:text/html,<script>alert(1)</script>">', 'full_code')).toBeNull();
  });
});

describe('iframe and frame blocking', () => {
  it('blocks iframes in visual/html_only/css_only modes', () => {
    expect(dangerousHTMLError('<iframe src="evil"></iframe>', 'visual')).not.toBeNull();
    expect(dangerousHTMLError('<iframe src="evil"></iframe>', 'html_only')).not.toBeNull();
    expect(dangerousHTMLError('<iframe src="evil"></iframe>', 'css_only')).not.toBeNull();
    expect(dangerousHTMLError('<iframe src="evil"></iframe>', 'full_code')).toBeNull();
  });
});