jest.mock('../apps/dashboard-web/src/lib/api/core', () => ({ apiRequest: jest.fn() }));
import { apiRequest } from '../apps/dashboard-web/src/lib/api/core';
import { uploadMediaFile } from '../apps/dashboard-web/src/lib/api/upload';

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('permanent website image upload', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
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
