import { isLegacyProductCardNode } from '../packages/shared/src/builder/productCard';

describe('legacy product card detection shared by renderer paths', () => {
  it('keeps the existing Marketplace fallback for cards with image or price data', () => {
    expect(
      isLegacyProductCardNode({ type: 'card', props: { image: 'https://cdn/item.webp' } })
    ).toBe(true);
    expect(isLegacyProductCardNode({ type: 'card', props: { price: 250 } })).toBe(true);
  });

  it('does not classify non-card nodes as product cards', () => {
    expect(
      isLegacyProductCardNode({
        type: 'testimonial',
        props: { image: 'https://cdn/item.webp', price: 250 },
      })
    ).toBe(false);
  });

  it('does not classify a card with neither image nor price data', () => {
    expect(isLegacyProductCardNode({ type: 'card', props: { title: 'Decorative card' } })).toBe(
      false
    );
  });
});
