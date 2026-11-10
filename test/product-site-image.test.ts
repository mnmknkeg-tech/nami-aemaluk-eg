import { getSiteProductImageUrl, mapSiteProduct } from '../packages/shared/src/builder/theme';

describe('site product image URL mapping', () => {
  it('prefers the main camelCase image URL over gallery images', () => {
    expect(
      getSiteProductImageUrl({
        imageUrl: ' https://cdn.example.com/main.jpg ',
        images: ['https://cdn.example.com/gallery.jpg'],
      })
    ).toBe('https://cdn.example.com/main.jpg');
  });

  it('supports snake_case, legacy image, and object-shaped gallery entries', () => {
    expect(getSiteProductImageUrl({ image_url: 'https://cdn.example.com/snake.jpg' })).toBe(
      'https://cdn.example.com/snake.jpg'
    );
    expect(getSiteProductImageUrl({ image: 'https://cdn.example.com/legacy.jpg' })).toBe(
      'https://cdn.example.com/legacy.jpg'
    );
    expect(
      getSiteProductImageUrl({ images: [{ url: 'https://cdn.example.com/gallery.jpg' }] })
    ).toBe('https://cdn.example.com/gallery.jpg');
  });

  it('upgrades public HTTP image links so secure storefronts can display them', () => {
    expect(getSiteProductImageUrl({ imageUrl: 'http://cdn.example.com/product.jpg' })).toBe(
      'https://cdn.example.com/product.jpg'
    );
  });

  it('uses the normalized image in the published SiteProduct shape', () => {
    expect(
      mapSiteProduct({
        id: 'p-1',
        name: 'منتج',
        price: 25,
        images: [],
        imageUrl: 'https://cdn.example.com/product.jpg',
      }).image
    ).toBe('https://cdn.example.com/product.jpg');
  });
});
