// Client-side image compression for marketplace uploads (canvas-based, no deps).
// Images are shrunk to WebP before they ever hit the network. Mirrors the
// dashboard's upload-image pipeline; non-image or failure cases pass through.

export interface CompressOptions {
  maxWidthOrHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg';
}

const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/gif']);

export async function compressImageBeforeUpload(
  file: File,
  { maxWidthOrHeight = 1600, quality = 0.82, outputFormat = 'image/webp' }: CompressOptions = {}
): Promise<File> {
  if (typeof document === 'undefined') return file;
  if (!file.type.startsWith('image/') || PASSTHROUGH_TYPES.has(file.type)) return file;
  // Tiny files gain nothing from a re-encode round trip.
  if (file.size < 60 * 1024 && file.type === outputFormat) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxWidthOrHeight / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputFormat, quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const ext = outputFormat === 'image/jpeg' ? 'jpg' : 'webp';
    console.info(
      `[upload] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB`
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: outputFormat });
  } catch {
    return file;
  }
}
