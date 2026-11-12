import { normalizeImageUrl } from '../packages/shared/src/utils/image-url';
import { buildProductImportPreview } from '../apps/dashboard-web/src/lib/importer';
import { getOptimizedImageUrl } from '../apps/dashboard-web/src/lib/image-utils';
import { resolveProductImage } from '../apps/marketplace-next/src/lib/product-image';

describe('external image URLs', () => {
  it('trims, upgrades insecure public links, and adds HTTPS to bare domains', () => {
    expect(normalizeImageUrl(' http://cdn.example.com/p/item.jpg ')).toBe(
      'https://cdn.example.com/p/item.jpg'
    );
    expect(normalizeImageUrl('www.cdn.example.com/item.jpg')).toBe(
      'https://www.cdn.example.com/item.jpg'
    );
    expect(normalizeImageUrl('//cdn.example.com/item.jpg')).toBe(
      'https://cdn.example.com/item.jpg'
    );
  });

  it('preserves signed query strings and does not invent unsupported optimization params', () => {
    const signedUrl = 'https://cdn.example.com/item.jpg?token=a%2Fb&expires=123';
    expect(normalizeImageUrl(signedUrl)).toBe(signedUrl);
    expect(getOptimizedImageUrl(signedUrl, 'thumb')).toBe(signedUrl);
  });

  it('rejects unsafe schemes and normalizes legacy product URLs before display', () => {
    expect(normalizeImageUrl('javascript:alert(1)')).toBe('');
    expect(resolveProductImage({ imageUrl: 'http://cdn.example.com/item.jpg', images: [] })).toBe(
      'https://cdn.example.com/item.jpg'
    );
  });
});

describe('bulk product image import', () => {
  it('normalizes imageUrl and image-array links before the payload is sent', () => {
    const preview = buildProductImportPreview({
      headers: ['اسم المنتج', 'السعر', 'رابط الصورة', 'صور إضافية'],
      rows: [
        [
          'منتج تجريبي',
          25,
          'www.cdn.example.com/main.jpg',
          '[{"url":"http://cdn.example.com/extra.jpg"}]',
        ],
      ],
    });

    expect(preview.valid).toHaveLength(1);
    expect(preview.valid[0].imageUrl).toBe('https://www.cdn.example.com/main.jpg');
    expect(preview.valid[0].images).toEqual([{ url: 'https://cdn.example.com/extra.jpg' }]);
  });

  it('reports a row-level error for unsupported image URL schemes', () => {
    const preview = buildProductImportPreview({
      headers: ['name', 'price', 'imageUrl'],
      rows: [['Broken URL product', 25, 'javascript:alert(1)']],
    });

    expect(preview.valid).toHaveLength(0);
    expect(preview.invalid).toHaveLength(1);
    expect(preview.invalid[0].reason).toContain('رابط الصورة غير صالح');
  });
});
