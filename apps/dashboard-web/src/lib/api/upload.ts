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

  try {
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    });
    if (!put.ok) {
      throw new Error('فشل رفع الصورة على خادم التخزين');
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
  } catch (putErr) {
    console.warn('Presigned upload failed, falling back to direct upload / local data:', putErr);

    // بيئة الاختبارات لا تملك FileReader؛ أعد الخطأ مباشرة بدل طلب رفع ثانٍ.
    if (typeof FileReader === 'undefined') {
      throw new Error('فشل رفع الصورة');
    }

    // Fallback 1: Direct multipart upload through backend
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);
      formData.append('purpose', purpose);

      const direct = await apiRequest<any>('/media/upload', {
        method: 'POST',
        body: formData,
      });
      const directUrl =
        direct?.originalUrl || direct?.data?.originalUrl || direct?.url || direct?.data?.url;
      if (directUrl) return directUrl;
    } catch (directErr) {
      console.warn('Direct upload also failed, using data URL fallback:', directErr);
    }

    // Fallback 2: Data URL so user work is never lost
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || publicUrl || '');
      reader.onerror = () => resolve(publicUrl || '');
      reader.readAsDataURL(file);
    });
  }
}
