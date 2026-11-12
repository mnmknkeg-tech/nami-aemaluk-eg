jest.mock('../apps/dashboard-web/src/lib/api/core', () => ({ apiRequest: jest.fn() }));
jest.mock('../apps/dashboard-web/src/lib/upload-image', () => ({ compressForUpload: jest.fn() }));

import { apiRequest } from '../apps/dashboard-web/src/lib/api/core';
import { compressForUpload } from '../apps/dashboard-web/src/lib/upload-image';
import { uploadMediaFile } from '../apps/dashboard-web/src/lib/api/upload';

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockedCompressForUpload = compressForUpload as jest.MockedFunction<typeof compressForUpload>;

describe('permanent image upload', () => {
  beforeEach(() => {
    mockedCompressForUpload.mockImplementation(async (file) => file);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('compresses the image before presigning and uploads the optimized file', async () => {
    const source = new File(['large source image'], 'product.png', { type: 'image/png' });
    const optimized = new File(['small webp'], 'product.webp', { type: 'image/webp' });
    mockedCompressForUpload.mockResolvedValueOnce(optimized);
    mockedApiRequest
      .mockResolvedValueOnce({
        url: 'https://r2.example/signed-put',
        key: 'shop/product.webp',
        publicUrl: 'https://cdn.example/product.webp',
      } as never)
      .mockResolvedValueOnce({ originalUrl: 'https://cdn.example/product.webp' } as never);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await expect(uploadMediaFile(source, 'shop-123')).resolves.toBe(
      'https://cdn.example/product.webp'
    );

    expect(mockedCompressForUpload).toHaveBeenCalledWith(source, 'product');
    const presignBody = JSON.parse(mockedApiRequest.mock.calls[0][1]?.body as string);
    expect(presignBody).toMatchObject({
      filename: 'product.webp',
      contentType: 'image/webp',
      fileSize: optimized.size,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://r2.example/signed-put',
      expect.objectContaining({ method: 'PUT', body: optimized })
    );
  });

  it('returns the permanent URL only after storage upload and completion succeed', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({
        url: 'https://r2.example/signed-put',
        key: 'shop/hero.webp',
        publicUrl: 'https://cdn.example/hero.webp',
      } as never)
      .mockResolvedValueOnce({ originalUrl: 'https://cdn.example/hero.webp' } as never);
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const file = new File(['image'], 'hero.webp', { type: 'image/webp' });

    await expect(uploadMediaFile(file, 'shop-123', 'website_image')).resolves.toBe(
      'https://cdn.example/hero.webp'
    );
    expect(mockedApiRequest).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://r2.example/signed-put',
      expect.objectContaining({ method: 'PUT', body: file })
    );
  });

  it('rejects failed object storage uploads before marking them complete', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      url: 'https://r2.example/signed-put',
      key: 'shop/hero.webp',
      publicUrl: 'https://cdn.example/hero.webp',
    } as never);
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const file = new File(['image'], 'hero.webp', { type: 'image/webp' });

    await expect(uploadMediaFile(file, 'shop-123', 'website_image')).rejects.toThrow(
      'فشل رفع الصورة'
    );
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
  });
});
