import { Script } from 'node:vm';
import { buildSandboxHtml } from '../../packages/shared/src/builder/CustomCodeFrame';
import type { ComponentNode } from '../../packages/shared/src/builder/types';

describe('CustomCodeFrame sandbox document', () => {
  it('generates a syntactically valid script with working deny-list construction', () => {
    const node = {
      id: 'custom-node',
      name: 'Custom code',
      type: 'custom_code',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: { html: '<div>Preview</div>' },
      styles: { desktop: {} },
      customCode: {
        js: 'const marker = "</script>"; console.log(marker);',
      },
    } as unknown as ComponentNode;

    const html = buildSandboxHtml(node);
    const scriptStart = html.lastIndexOf('<script>');
    const scriptEnd = html.indexOf('</script>', scriptStart);

    expect(scriptStart).toBeGreaterThanOrEqual(0);
    expect(scriptEnd).toBeGreaterThan(scriptStart);

    const generatedScript = html.slice(scriptStart + '<script>'.length, scriptEnd);
    expect(() => new Script(generatedScript)).not.toThrow();
    expect(generatedScript).toContain("new RegExp(pattern, 'i')");
    expect(generatedScript).toContain('var rawJs = ');
  });

  it('keeps hostile-looking node IDs inside a JSON string literal', () => {
    const hostileId = 'node</script><script>alert(1)</script>';
    const node = {
      id: hostileId,
      name: 'Custom code',
      type: 'custom_code',
      category: 'section',
      parentId: null,
      childrenIds: [],
      props: { html: '<div>Preview</div>' },
      styles: { desktop: {} },
    } as unknown as ComponentNode;

    const html = buildSandboxHtml(node);
    expect(html).toContain('id: "node\\u003c/script>');
    expect(html).not.toContain('id: "' + hostileId + '"');

    const scriptStart = html.lastIndexOf('<script>');
    const scriptEnd = html.indexOf('</script>', scriptStart);
    expect(() => new Script(html.slice(scriptStart + 8, scriptEnd))).not.toThrow();
  });
});
