import { resolveHeroContent } from '../packages/shared/src/builder/heroCompatibility';
import type { ComponentNode } from '../packages/shared/src/builder/types';
const node = (
  id: string,
  type: string,
  name: string,
  props: Record<string, any>,
  childrenIds: string[] = []
): ComponentNode =>
  ({
    id,
    type,
    category: type === 'button' ? 'action' : 'content',
    name,
    props,
    childrenIds,
    parentId: null,
    styles: { desktop: {} },
  }) as ComponentNode;
describe('resolveHeroContent', () => {
  it('reads flat legacy template props without changing them', () => {
    const hero = node('hero', 'hero', 'Hero', {
      title: 'Flat title',
      description: 'Flat desc',
      primaryCtaText: 'Shop',
      primaryCtaLink: '/shop',
      imageUrl: 'https://cdn.example/hero.webp',
      stats: [],
    });
    expect(resolveHeroContent(hero)).toMatchObject({
      title: 'Flat title',
      description: 'Flat desc',
      primaryCtaText: 'Shop',
      primaryCtaLink: '/shop',
      imageUrl: 'https://cdn.example/hero.webp',
    });
    expect(hero.props.title).toBe('Flat title');
  });
  it('adapts child-based Hero values when flat fields are absent', () => {
    const hero = node('hero', 'hero', 'Hero', {}, ['title', 'desc', 'primary', 'photo']);
    const components = {
      title: node('title', 'heading', 'Hero title', { text: 'Child title' }),
      desc: node('desc', 'paragraph', 'Hero description', { text: 'Child description' }),
      primary: node('primary', 'button', 'Primary CTA', { text: 'Order', href: '/order' }),
      photo: node('photo', 'image', 'Hero image', { src: 'https://cdn.example/child.webp' }),
    };
    expect(resolveHeroContent(hero, components)).toMatchObject({
      title: 'Child title',
      description: 'Child description',
      primaryCtaText: 'Order',
      primaryCtaLink: '/order',
      imageUrl: 'https://cdn.example/child.webp',
    });
  });
  it('prefers the editable child value and flags it so renderers do not duplicate it', () => {
    const hero = node('hero', 'hero', 'Hero', { title: 'Merchant title' }, ['title']);
    const components = { title: node('title', 'heading', 'Title', { text: 'Child title' }) };
    expect(resolveHeroContent(hero, components)).toMatchObject({
      title: 'Child title',
      childContent: { title: true },
    });
  });
});
