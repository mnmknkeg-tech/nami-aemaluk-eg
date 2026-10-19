// ============================================================================
// ADVANCED IMAGE UPLOAD HOOK
// ============================================================================

import { useState, useCallback } from 'react';
import { compressImage, validateImageFile, formatFileSize, CompressionOptions } from '@/lib/image-utils';

interface UseImageUploadOptions {
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  onUpload?: (file: File) => Promise<string>;
}

interface UploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  error: string | null;
  progress: number;
  compressedSize: number | null;
  originalSize: number | null;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    maxSizeMB = 5,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    onUpload,
  } = options;

  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    error: null,
    progress: 0,
    compressedSize: null,
    originalSize: null,
  });

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Reset state
      setState({
        file: null,
        preview: null,
        uploading: false,
        error: null,
        progress: 0,
        compressedSize: null,
        originalSize: null,
      });

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setState((prev) => ({ ...prev, error: validation.error || 'خطأ في الملف' }));
        return;
      }

      try {
        // Create preview
        const preview = URL.createObjectURL(file);
        setState((prev) => ({
          ...prev,
          file,
          preview,
          originalSize: file.size,
        }));

        // Compress image
        setState((prev) => ({ ...prev, uploading: true, progress: 30 }));

        const compressionOptions: CompressionOptions = {
          maxWidth,
          maxHeight,
          quality,
          maxSizeMB,
        };

        const compressed = await compressImage(file, compressionOptions);

        setState((prev) => ({
          ...prev,
          file: compressed.file,
          compressedSize: compressed.compressedSize,
          progress: 60,
        }));

        // Upload if callback provided
        if (onUpload) {
          setState((prev) => ({ ...prev, progress: 80 }));

          const url = await onUpload(compressed.file);

          setState((prev) => ({
            ...prev,
            preview: url,
            uploading: false,
            progress: 100,
          }));

          // Revoke object URL if we have a remote URL
          if (url && url.startsWith('http')) {
            URL.revokeObjectURL(preview);
          }
        } else {
          setState((prev) => ({
            ...prev,
            uploading: false,
            progress: 100,
          }));
        }
      } catch (error) {
        console.error('Upload error:', error);
        setState((prev) => ({
          ...prev,
          uploading: false,
          error: 'فشل في رفع الصورة',
          progress: 0,
        }));
      }
    },
    [maxSizeMB, maxWidth, maxHeight, quality, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const reset = useCallback(() => {
    if (state.preview && state.preview.startsWith('blob:')) {
      URL.revokeObjectURL(state.preview);
    }
    setState({
      file: null,
      preview: null,
      uploading: false,
      error: null,
      progress: 0,
      compressedSize: null,
      originalSize: null,
    });
  }, [state.preview]);

  return {
    state,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    reset,
    getCompressionInfo: () => {
      if (!state.originalSize || !state.compressedSize) return null;
      return {
        original: formatFileSize(state.originalSize),
        compressed: formatFileSize(state.compressedSize),
        ratio: (state.originalSize / state.compressedSize).toFixed(1),
      };
    },
  };
}