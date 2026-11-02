/**
 * Guards the CSS injection fix for the published-site theme: merchant values
 * are interpolated into a <style> tag, so nothing that can close the tag,
 * close the rule, or start an at-rule may survive sanitization.
 */
import { sanitizeCssValue } from '@marketplace-lib/sanitize';

describe('sanitizeCssValue', () => {
  it('strips style-tag breakouts', () => {
    const out = sanitizeCssValue('</style><script>alert(1)</script>', 'fallback');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('/');
  });

  it('strips rule and at-rule injection characters', () => {
    const out = sanitizeCssValue('10px} @import url(evil); .x{', 'fallback');
    expect(out).not.toContain('}');
    expect(out).not.toContain('{');
    expect(out).not.toContain(';');
    expect(out).not.toContain('\\');
  });

  it('keeps legitimate values intact', () => {
    expect(sanitizeCssValue('Cairo, sans-serif', 'inherit')).toBe('Cairo, sans-serif');
    expect(sanitizeCssValue('0 4px 6px -1px rgba(0, 0, 0, 0.08)', 'fallback')).toBe(
      '0 4px 6px -1px rgba(0, 0, 0, 0.08)'
    );
    expect(sanitizeCssValue('#1d4ed8', 'fallback')).toBe('#1d4ed8');
    expect(sanitizeCssValue('24px', 'fallback')).toBe('24px');
  });

  it('falls back on empty or blank values', () => {
    expect(sanitizeCssValue('', 'inherit')).toBe('inherit');
    expect(sanitizeCssValue('   ', 'inherit')).toBe('inherit');
    expect(sanitizeCssValue(undefined, '6px')).toBe('6px');
    expect(sanitizeCssValue(null as unknown as string, '6px')).toBe('6px');
    expect(sanitizeCssValue(42 as unknown as string, '6px')).toBe('6px');
  });

  it('falls back when the value was only dangerous characters', () => {
    expect(sanitizeCssValue('</>', '16px')).toBe('16px');
  });
});
