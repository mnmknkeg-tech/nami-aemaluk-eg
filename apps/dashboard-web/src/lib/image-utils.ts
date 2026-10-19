// ============================================================================
// ADVANCED IMAGE UTILITIES - COMPRESSION & OPTIMIZATION
// ============================================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
  outputFormat?: 'webp' | 'jpeg' | 'png';
}

export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: { width: number; height: number };
}

/**
 * Compress image using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    maxSizeMB = 0.5,
    outputFormat = 'webp',
  } = options;

  const originalSize = file.size;

  // Skip compression for small WebP/AVIF files
  if (
    (file.type === 'image/webp' || file.type === 'image/avif') &&
    originalSize < maxSizeMB * 1024 * 1024
  ) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      dimensions: await getImageDimensions(file),
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      const ratio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }

      // Create canvas for compression
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const extension = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${extension}`),
            {
              type: `image/${outputFormat}`,
            }
          );

          resolve({
            file: compressed,
            originalSize,
            compressedSize: compressed.size,
            compressionRatio: originalSize / compressed.size,
            dimensions: { width, height },
          });
        },
        `image/${outputFormat}`,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions without loading the full image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generate video thumbnail
 */
export async function generateVideoThumbnail(
  file: File,
  time: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.addEventListener('loadeddata', () => {
      video.currentTime = time;
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to generate thumbnail'));
          return;
        }

        URL.revokeObjectURL(url);
        resolve(URL.createObjectURL(blob));
      }, 'image/jpeg', 0.8);
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    });

    video.src = url;
  });
}

/**
 * Build responsive srcset string
 */
export function buildSrcSet(
  baseUrl: string,
  variants: { width: number; quality?: number }[]
): string {
  return variants
    .map((variant) => {
      const url = new URL(baseUrl);
      url.searchParams.set('w', variant.width.toString());
      if (variant.quality) {
        url.searchParams.set('q', variant.quality.toString());
      }
      return `${url.toString()} ${variant.width}w`;
    })
    .join(', ');
}

/**
 * Detect browser image format support
 */
export function detectImageFormatSupport(): {
  avif: boolean;
  webp: boolean;
} {
  const canvas = document.createElement('canvas');
  
  // Check WebP support
  const webp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  // Check AVIF support
  const avif = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  
  return { avif, webp };
}

/**
 * Get optimized image URL with variant
 */
export function getOptimizedImageUrl(
  baseUrl: string,
  variant: 'thumb' | 'md' | 'opt' = 'opt'
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('variant', variant);
  return url.toString();
}

/**
 * Build picture sources for responsive images
 */
export function buildPictureSources(
  baseUrl: string,
  variants: { format: string; srcset: string }[]
): Array<{ type: string; srcSet: string }> {
  const { avif, webp } = detectImageFormatSupport();
  
  return variants
    .filter((variant) => {
      if (variant.format === 'image/avif') return avif;
      if (variant.format === 'image/webp') return webp;
      return true;
    })
    .map((variant) => ({
      type: variant.format,
      srcSet: variant.srcset,
    }));
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'نوع الملف غير مدعوم' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create object-fit styles for image positioning
 */
export function createObjectFitStyles(
  posX: number = 50,
  posY: number = 50
): React.CSSProperties {
  return {
    objectFit: 'cover',
    objectPosition: `${posX}% ${posY}%`,
  };
}