/**
 * Central media upload for the dashboard.
 *
 * Every image upload goes through here so the request shape stays the same
 * everywhere.
 *
 * The bytes go straight to R2 through a presigned URL instead of riding
 * through the API as multipart form-data. That is not a style choice: the
 * dashboard is served from Vercel and proxies /api/* through a Next.js
 * rewrite, and that proxy cannot carry a multipart file part — it answers
 * 500 for a file part with a content type and 415 without one. The
 * presign flow never sends the bytes through the proxy at all: the API
 * hands out a signed PUT URL, the browser uploads to R2 directly, and the
 * API is only told the upload finished.
 */
import { apiRequest } from './core';

/** Uploads one file and returns the public URL it is served from. */
export async function uploadMediaFile(
  file: File,
  shopId: string,
  purpose = 'product_image'
): Promise<string> {
  const presign = await apiRequest<any>('/media/presign', {
    method: 'POST',
    body: JSON.stringify({
      shopId,
      filename: file.name || `upload-${Date.now()}.jpg`,
      contentType: file.type || 'image/jpeg',
      purpose,
      fileSize: file.size,
    }),
  });

  const uploadUrl = presign?.url || presign?.data?.url;
  const key = presign?.key || presign?.data?.key;
  const publicUrl = presign?.publicUrl || presign?.data?.publicUrl;

  if (!uploadUrl || !key) {
    throw new Error('تعذّر تجهيز رابط رفع الصورة');
  }

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!put.ok) {
    throw new Error('فشل رفع الصورة');
  }

  const completed = await apiRequest<any>('/media/complete', {
    method: 'POST',
    body: JSON.stringify({
      shopId,
      key,
      mimeType: file.type || 'image/jpeg',
      purpose,
      fileSize: file.size,
    }),
  });

  return completed?.originalUrl || completed?.data?.originalUrl || publicUrl || '';
}
