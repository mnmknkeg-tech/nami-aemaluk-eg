// ============================================================================
// CENTRAL COMPRESS-BEFORE-UPLOAD PIPELINE
// ============================================================================
// Every image a merchant picks is compressed in the browser BEFORE it hits the
// network: smaller payloads (faster uploads, less bandwidth), and the preview
// shown in the UI is the exact file that gets stored.
//
// Usage at a file-selection handler:
//   const compressed = await compressForUpload(file, 'product');
//   setImageFile(compressed);
//
// Non-raster files (SVG, GIF, PDFs) pass through untouched, and any compression
// failure degrades gracefully to the original file — uploads must never break
// because of this module.

import { compressImage } from '@/lib/image-utils';

export type UploadImageKind =
  | 'product' // main product photo
  | 'gallery' // extra / variant / addon photos
  | 'logo' // logos & icons
  | 'banner' // covers & banners
  | 'map' // image-map sources — re-encode only, near-original resolution
  | 'document'; // KYC / uploaded documents

interface KindPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeMB: number;
}

const PRESETS: Record<UploadImageKind, KindPreset> = {
  product: { maxWidth: 1600, maxHeight: 1600, quality: 0.82, maxSizeMB: 0.6 },
  gallery: { maxWidth: 1400, maxHeight: 1400, quality: 0.8, maxSizeMB: 0.5 },
  logo: { maxWidth: 512, maxHeight: 512, quality: 0.9, maxSizeMB: 0.3 },
  banner: { maxWidth: 1920, maxHeight: 1080, quality: 0.82, maxSizeMB: 0.7 },
  map: { maxWidth: 2400, maxHeight: 2400, quality: 0.9, maxSizeMB: 1.5 },
  document: { maxWidth: 2000, maxHeight: 2000, quality: 0.85, maxSizeMB: 1 },
};

// Vector and animated formats must not be canvas-re-encoded.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/gif']);

function isCompressible(file: File): boolean {
  return file.type.startsWith('image/') && !PASSTHROUGH_TYPES.has(file.type);
}

export async function compressForUpload(
  file: File,
  kind: UploadImageKind = 'product'
): Promise<File> {
  if (!file) return file;
  if (!isCompressible(file)) return file;
  // Document flows accept PDFs alongside images — pass those through.
  if (kind === 'document' && file.type === 'application/pdf') return file;

  try {
    const preset = PRESETS[kind];
    const result = await compressImage(file, {
      maxWidth: preset.maxWidth,
      maxHeight: preset.maxHeight,
      quality: preset.quality,
      maxSizeMB: preset.maxSizeMB,
      outputFormat: 'webp',
    });

    if (result.compressedSize >= file.size) {
      // Nothing to gain (already-optimal small file) — keep the original.
      return file;
    }

    const savedPct = Math.max(0, Math.round((1 - result.compressedSize / file.size) * 100));
    console.info(
      `[upload] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(result.compressedSize / 1024).toFixed(0)}KB (-${savedPct}%)`
    );
    return result.file;
  } catch {
    // Compression is an optimization, never a gate.
    return file;
  }
}
