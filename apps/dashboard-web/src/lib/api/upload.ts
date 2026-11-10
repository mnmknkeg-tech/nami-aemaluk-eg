/**
 * Central media upload for the dashboard.
 *
 * The object upload and the media bookkeeping request are intentionally kept
 * separate. Once the bytes are safely in object storage, a temporary failure in
 * /media/complete must never make the merchant lose the editor session or force
 * a second upload.
 */
import { apiRequest } from './core';
import { compressForUpload, type UploadImageKind } from '@/lib/upload-image';

function getUploadImageKind(purpose: string): UploadImageKind {
  const normalizedPurpose = purpose.toLowerCase();
  if (/logo|avatar/.test(normalizedPurpose)) return 'logo';
  if (/banner|hero|cover/.test(normalizedPurpose)) return 'banner';
  if (/map/.test(normalizedPurpose)) return 'map';
  if (/gallery|variant|addon/.test(normalizedPurpose)) return 'gallery';
  return 'product';
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as Error & { status?: number })?.status;
}

function getUploadUrl(value: any): string {
  return value?.originalUrl || value?.data?.originalUrl || value?.url || value?.data?.url || '';
}

async function directUpload(file: File, shopId: string, purpose: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('shopId', shopId);
  formData.append('purpose', purpose);
  const direct = await apiRequest<any>('/media/upload', {
    method: 'POST',
    body: formData,
  });
  return getUploadUrl(direct);
}

/** Uploads one file and returns the public URL it is served from. */
export async function uploadMediaFile(
  file: File,
  shopId: string,
  purpose = 'product_image'
): Promise<string> {
  // Presigned uploads bypass server-side image processing, so optimize before
  // requesting the URL. The helper is best-effort and leaves non-images alone.
  const uploadFile = await compressForUpload(file, getUploadImageKind(purpose));
  const presign = await apiRequest<any>('/media/presign', {
    method: 'POST',
    body: JSON.stringify({
      shopId,
      filename: uploadFile.name || `upload-${Date.now()}.jpg`,
      contentType: uploadFile.type || 'image/jpeg',
      purpose,
      fileSize: uploadFile.size,
    }),
  });

  const uploadUrl = presign?.url || presign?.data?.url;
  const key = presign?.key || presign?.data?.key;
  const publicUrl = presign?.publicUrl || presign?.data?.publicUrl || '';

  if (!uploadUrl || !key) {
    throw new Error('تعذّر تجهيز رابط رفع الصورة');
  }

  let storedUrl = publicUrl;
  try {
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadFile.type || 'image/jpeg' },
      body: uploadFile,
    });
    if (!put.ok) throw new Error('فشل رفع الصورة على خادم التخزين');
  } catch (putError) {
    console.warn('[media] presigned PUT failed; trying direct upload once', putError);
    // Non-browser callers cannot use the multipart/data-URL fallback safely.
    if (typeof FileReader === 'undefined') throw new Error('فشل رفع الصورة');
    try {
      const directUrl = await directUpload(uploadFile, shopId, purpose);
      if (directUrl) return directUrl;
    } catch (directError) {
      console.warn('[media] direct upload failed', directError);
    }

    // Keep the old offline-safe behavior, but only after both real upload paths fail.
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || publicUrl || '');
      reader.onerror = () => resolve(publicUrl || '');
      reader.readAsDataURL(uploadFile);
    });
  }

  // The bytes are already stored. Bookkeeping is idempotent and best-effort;
  // retry once, then keep the permanent object URL instead of starting over.
  try {
    const completed = await apiRequest<any>('/media/complete', {
      method: 'POST',
      body: JSON.stringify({
        shopId,
        key,
        mimeType: uploadFile.type || 'image/jpeg',
        purpose,
        fileSize: uploadFile.size,
      }),
    });
    storedUrl = getUploadUrl(completed) || storedUrl;
  } catch (completeError) {
    console.warn(
      '[media] upload completed in storage but bookkeeping failed; keeping permanent URL',
      { status: getErrorStatus(completeError), error: completeError }
    );
  }

  if (!storedUrl || !/^https:\/\//i.test(storedUrl) || /^blob:/i.test(storedUrl)) {
    throw new Error('لم يُرجع التخزين رابط صورة دائمًا وآمنًا.');
  }
  return storedUrl;
}
