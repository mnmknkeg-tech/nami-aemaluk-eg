/**
 * Central multipart media upload for the dashboard.
 *
 * Every image upload goes through here so the request shape stays the same
 * everywhere.
 *
 * The shop id travels in the multipart body, not in the query string. The
 * dashboard is served from Vercel and proxies /api/* through a Next.js
 * rewrite, and that rewrite answers 500 for a multipart POST whose query
 * string carries a dashed UUID — the request itself is fine, the proxy
 * chokes on it. Sending the shop id as a form field sidesteps the bug, and
 * the API accepts both shapes.
 */
import { apiRequest } from './core';

/** Uploads one file and returns the public URL it is served from. */
export async function uploadMediaFile(
  file: File,
  shopId: string,
  purpose = 'product_image'
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('shopId', shopId);
  form.append('purpose', purpose);

  const response = await apiRequest<any>('/media/upload', {
    method: 'POST',
    body: form,
  });

  return response?.url || response?.data?.url || response?.data?.originalUrl || '';
}
