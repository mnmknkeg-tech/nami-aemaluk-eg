import { scopeNodeCss } from '../packages/shared/src/builder/codeFiles';

describe('scoper bare-tag self-match (header/footer/nav/section)', () => {
  it('self-matches a bare <header> selector on a header component', () => {
    const scoped = scopeNodeCss('header { background: red; }', 'gen_header');
    // Must include BOTH the self-match (`:is(header)`) and the descendant
    // match — so the rule applies to the <header id="gen_header"> element
    // itself AND any nested headers.
    expect(scoped).toContain('#gen_header\\:is(header)'.replace('\\:', ':'));
    expect(scoped).toContain('#gen_header:is(header)');
    expect(scoped).toContain('#gen_header header');
    expect(scoped).toMatch(/background:\s*red !important/);
  });

  it('self-matches a bare <footer> selector on a footer component', () => {
    const scoped = scopeNodeCss('footer { color: teal; }', 'gen_footer');
    expect(scoped).toContain('#gen_footer:is(footer)');
    expect(scoped).toContain('#gen_footer footer');
  });

  it('self-matches a bare <nav> selector on a navigation component', () => {
    const scoped = scopeNodeCss('nav { padding: 0; }', 'gen_nav');
    expect(scoped).toContain('#gen_nav:is(nav)');
  });

  it('does NOT self-match bare div/span/p (too generic)', () => {
    // A `div { }` rule inside a container's CSS almost always means a nested
    // div — auto-self-matching would silently restyle the container itself.
    const scoped = scopeNodeCss('div { color: red; }', 'comp_container');
    expect(scoped).not.toContain(':is(div)');
    expect(scoped).toContain('#comp_container div');
  });

  it('does NOT self-match selectors that are not bare tags', () => {
    // header.class, header#id, header:hover, header > .child — these all stay
    // descendant-only.
    const cases = [
      'header.sticky',
      'header#main',
      'header:hover',
      'header > .child',
      'header.class:hover',
    ];
    for (const sel of cases) {
      const scoped = scopeNodeCss(`${sel} { color: red; }`, 'gen_header');
      expect(scoped).not.toContain(':is(');
      expect(scoped).toContain('#gen_header');
    }
  });

  it('preserves comma-separated bare tags (each gets self+descendant)', () => {
    const scoped = scopeNodeCss('header, footer { color: red; }', 'gen_header');
    // `header` self-matches; `footer` (a bare tag) also self-matches because
    // the merchant might be styling both elements at once in a header CSS
    // file (rare, but the scoper shouldn't second-guess).
    expect(scoped).toContain('#gen_header:is(header)');
    expect(scoped).toContain('#gen_header:is(footer)');
  });
});
