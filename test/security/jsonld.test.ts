/**
 * Guards the JSON-LD XSS fix: ld+json payloads embed merchant-controlled
 * fields, so "</script>" inside any value must not be able to break out of
 * the <script> tag on public pages.
 */
import { serializeJsonLd } from '@marketplace-lib/jsonld';

describe('serializeJsonLd', () => {
  it('escapes tag breakouts in string values', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script');
    expect(out).toContain('\\u003c');
  });

  it('escapes standalone "<" anywhere in the payload', () => {
    const out = serializeJsonLd({ a: '<b>', b: ['x<y', { c: '<<' }] });
    expect(out).not.toContain('<');
  });

  it('escapes U+2028/U+2029 line separators', () => {
    const out = serializeJsonLd({ name: 'line\u2028sep\u2029end' });
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
  });

  it('stays valid JSON with identical parsed values', () => {
    const data = { name: '</script><b>حلويات</b>', price: 12.5, tags: ['a<b', 'c'] };
    const parsed = JSON.parse(serializeJsonLd(data));
    expect(parsed).toEqual(data);
  });

  it('handles nested and non-string values unchanged', () => {
    const data = { nested: { deep: { ok: true } }, count: 3, nil: null };
    const parsed = JSON.parse(serializeJsonLd(data));
    expect(parsed).toEqual(data);
  });
});
