import DOMPurify from 'dompurify';

// Hardening applied to every sanitized document: iframes are sandboxed into an
// opaque origin with https-only sources (embedded merchant content must not be
// able to reach the parent page, cookies, or localStorage), and links that
// open a new tab get rel="noopener" so they cannot touch window.opener.
let hooksInstalled = false;
function installHooks(): void {
  if (hooksInstalled || typeof window === 'undefined') return;
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    if (el.tagName === 'IFRAME') {
      el.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms');
      const src = el.getAttribute('src') || '';
      if (!/^https:\/\//i.test(src)) {
        el.removeAttribute('src');
      }
    }
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * تنظيف أي HTML قادم من مستخدمين/بيانات خارجية قبل حقنه في الصفحة (حماية من XSS).
 * يُستخدم مع dangerouslySetInnerHTML فقط.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return '';
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'p',
      'div',
      'span',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'blockquote',
      'img',
      'figure',
      'figcaption',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'video',
      'source',
      'iframe',
      'button',
      'input',
      'select',
      'option',
      'label',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'style',
      'target',
      'rel',
      'width',
      'height',
      'type',
      'placeholder',
      'value',
      'name',
      'controls',
      'colspan',
      'rowspan',
    ],
    ADD_ATTR: ['target', 'rel'],
  });
}

/**
 * Make a merchant-provided value safe to interpolate into a CSS property value
 * inside a <style> tag (site builder theme settings). Everything that could
 * close the tag, close the rule, start an at-rule/comment, or escape the value
 * is stripped; legitimate values (colors, lengths, shadows, font names) only
 * need the remaining character set.
 */
export function sanitizeCssValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[<>{};\\/]/g, '').trim();
  return cleaned ? cleaned : fallback;
}
