import {
  customCodePatchForSnippet,
  readCustomCodeSnippet,
} from '../apps/dashboard-web/src/components/website-builder/components/code/CodeWorkspace';

describe('CodeWorkspace CSS/JavaScript snippet round-trip', () => {
  it.each([
    ['css', 'cssSnippet', 'css', '.card { color: teal; }'],
    ['js', 'jsSnippet', 'js', 'container.dataset.ready = "true";'],
  ] as const)('loads and writes the %s snippet canonically', (kind, canonicalField, legacyField, value) => {
    const legacyCustomCode = { [legacyField]: `legacy ${kind}` };
    expect(readCustomCodeSnippet(legacyCustomCode, kind)).toBe(`legacy ${kind}`);

    const originalCustomCode = {
      enabled: true,
      tsxSnippet: '<section>preserved</section>',
      propsSchema: '{"type":"object"}',
      ...legacyCustomCode,
    };
    const patch = customCodePatchForSnippet(kind, value);
    const updatedCustomCode = { ...originalCustomCode, ...patch };

    expect(patch.enabled).toBe(true);
    expect(patch[canonicalField]).toBe(value);
    expect(updatedCustomCode[canonicalField]).toBe(value);
    expect(updatedCustomCode[legacyField]).toBeUndefined();
    expect(updatedCustomCode).toMatchObject({
      enabled: true,
      tsxSnippet: '<section>preserved</section>',
      propsSchema: '{"type":"object"}',
    });
    expect(readCustomCodeSnippet(updatedCustomCode, kind)).toBe(value);
  });

  it('prefers a defined canonical snippet, including an intentionally empty value', () => {
    expect(
      readCustomCodeSnippet(
        { cssSnippet: '', css: '.stale { color: red; }', jsSnippet: '', js: 'stale()' },
        'css'
      )
    ).toBe('');
    expect(
      readCustomCodeSnippet(
        { cssSnippet: '', css: '.stale { color: red; }', jsSnippet: '', js: 'stale()' },
        'js'
      )
    ).toBe('');
  });
});
