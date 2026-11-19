import {
  canParentAcceptChild,
  defaultPropsFor,
  getPropFieldSchema,
  validatePropsAgainstSchema,
  withDefaultProps,
} from '../packages/shared/src/builder';

describe('component props schema (registry behavior layer)', () => {
  it('exposes registered defaults for primitives without overriding callers', () => {
    expect(defaultPropsFor('heading')).toEqual({ text: 'عنوان جديد' });
    expect(withDefaultProps('heading', { text: 'مخصص', hidden: true })).toEqual({
      text: 'مخصص',
      hidden: true,
    });
    expect(withDefaultProps('image', {})).toEqual({ url: '', alt: '' });
    expect(defaultPropsFor('page')).toBeUndefined();
    expect(withDefaultProps('page', { title: 'الرئيسية' })).toEqual({ title: 'الرئيسية' });
  });

  it('resolves legacy aliases to the canonical schema', () => {
    expect(getPropFieldSchema('contact-section')).toEqual(getPropFieldSchema('contact'));
    expect(getPropFieldSchema('services-grid')).toEqual(getPropFieldSchema('services'));
    // Unknown types simply have no schema — never invent one.
    expect(getPropFieldSchema('totally-new-component')).toBeUndefined();
  });

  it('accepts structural placements the persisted templates actually use', () => {
    // Page root containers (layout category) hold sections — the fixture shape.
    expect(canParentAcceptChild('container', 'products')).toBe(true);
    expect(canParentAcceptChild('page', 'hero')).toBe(true);
    // Cards can hold typography, media and actions.
    expect(canParentAcceptChild('card', 'heading')).toBe(true);
    expect(canParentAcceptChild('hero', 'button')).toBe(true);
    // Navigation containers hold typography and actions.
    expect(canParentAcceptChild('header', 'button')).toBe(true);
  });

  it('rejects placements that no template carries and keeps unknown types permissive', () => {
    // A section must not nest inside another section or navigation chrome.
    expect(canParentAcceptChild('hero', 'faq')).toBe(false);
    expect(canParentAcceptChild('header', 'contact')).toBe(false);
    // Legacy aliases resolve before the rules run.
    expect(canParentAcceptChild('hero', 'bento-grid')).toBe(false);
    // Unrecognized keys (future/foreign documents) are never blocked.
    expect(canParentAcceptChild('totally-new-parent', 'heading')).toBe(true);
    expect(canParentAcceptChild('container', 'totally-new-child')).toBe(true);
  });

  it('validates url props against safe schemes', () => {
    const issues = validatePropsAgainstSchema('button', {
      text: 'تصفح',
      url: 'javascript:alert(1)',
    });
    expect(issues.some((issue) => issue.key === 'url' && issue.code === 'unsafe-url')).toBe(true);

    expect(validatePropsAgainstSchema('button', { text: 'تصفح', url: '#pricing' }).length).toBe(0);
    expect(
      validatePropsAgainstSchema('button', { text: 'تصفح', url: 'https://example.com' }).length
    ).toBe(0);
  });

  it('enforces required, numeric and range rules', () => {
    expect(
      validatePropsAgainstSchema('button', { text: '   ', url: '' }).some(
        (issue) => issue.key === 'text' && issue.code === 'required'
      )
    ).toBe(true);

    expect(
      validatePropsAgainstSchema('spacer', { height: 500 }).some(
        (issue) => issue.key === 'height' && issue.code === 'max'
      )
    ).toBe(true);
    expect(validatePropsAgainstSchema('spacer', { height: 24 }).length).toBe(0);

    expect(
      validatePropsAgainstSchema('pricing', { price: -5 }).some(
        (issue) => issue.key === 'price' && issue.code === 'min'
      )
    ).toBe(true);
  });

  it('never invents issues for props outside the schema', () => {
    expect(validatePropsAgainstSchema('page', { anything: 'goes' })).toEqual([]);
    expect(validatePropsAgainstSchema('totally-new-component', { text: 'ح' })).toEqual([]);
  });
});
