import {
  getPublicBuilderConfig,
  type PublishedWebsite,
} from '../apps/marketplace-next/src/lib/services';

describe('public /shop builder configuration selection', () => {
  const publishedConfig = { website: { pages: [{ id: 'published-home' }] } };

  it('returns only a config explicitly marked as published', () => {
    const published: PublishedWebsite = {
      published: true,
      shop: { id: 'shop-1', name: 'Shop', slug: 'shop' },
      config: publishedConfig,
    };

    expect(getPublicBuilderConfig(published)).toBe(publishedConfig);
  });

  it('never promotes an unpublished config to public renderer input', () => {
    const draftOnly: PublishedWebsite = {
      published: false,
      shop: { id: 'shop-1', name: 'Shop', slug: 'shop' },
      config: { website: { pages: [{ id: 'draft-home' }] } },
    };

    expect(getPublicBuilderConfig(draftOnly)).toBeUndefined();
    expect(getPublicBuilderConfig(null)).toBeUndefined();
  });
});
