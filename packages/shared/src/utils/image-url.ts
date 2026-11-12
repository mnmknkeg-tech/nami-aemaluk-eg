const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Normalize public image URLs copied from spreadsheets and merchant forms.
 * Scheme-less domains and insecure public HTTP links are upgraded to HTTPS;
 * relative app paths and image data/blob previews remain unchanged.
 */
export function normalizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';

  if (raw.startsWith('/')) {
    return raw.startsWith('//') ? `https:${raw}` : raw;
  }
  if (/^data:image\//i.test(raw) || /^blob:/i.test(raw)) return raw;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
  const looksLikeDomain = /^(?:www\.)?[^/\s?#]+\.[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(raw);
  const candidate = hasScheme ? raw : looksLikeDomain ? `https://${raw}` : '';
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return '';
    if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      url.protocol = 'https:';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/** Absolute HTTP(S) images should be loaded directly to preserve signed URLs. */
export function isExternalImageUrl(value: unknown): boolean {
  return /^https?:\/\//i.test(normalizeImageUrl(value));
}
