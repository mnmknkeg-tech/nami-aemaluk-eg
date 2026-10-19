package media

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/storage"
	"github.com/google/uuid"
)

// localStorageDir is where locally stored uploads are written when object
// storage (S3/R2) is not configured.
const localStorageDir = "./uploads"

// DirectUpload stores a multipart file on local disk and records a media row.
// It powers the legacy POST /media/upload endpoint used by the dashboard,
// which sends multipart/form-data instead of using the presign flow.
func (s *Service) DirectUpload(ctx context.Context, userID, actorRole, actorShopID, shopID, purpose string, fh *multipart.FileHeader) (*Media, error) {
	if err := s.authorizeShop(shopID, actorRole, actorShopID); err != nil {
		return nil, err
	}

	purpose = strings.TrimSpace(purpose)
	if purpose == "" {
		purpose = "images"
	}

	ct := strings.ToLower(fh.Header.Get("Content-Type"))
	if ct == "" || !storage.IsAllowedContentType(ct) {
		return nil, errors.Validation("invalid_content_type", "نوع الملف غير مدعوم")
	}
	if max := s.maxUploadBytes(); max > 0 && fh.Size > max {
		return nil, errors.Validation("file_too_large", "حجم الملف أكبر من المسموح")
	}
	outExt := strings.ToLower(filepath.Ext(fh.Filename))
	if !isValidExt(outExt) {
		return nil, errors.Validation("invalid_filename", "اسم الملف غير صالح")
	}

	src, err := fh.Open()
	if err != nil {
		return nil, errors.Internal("upload_open_failed", err)
	}
	defer src.Close()

	// Server-side compression is a second line of defense behind the browser
	// pipeline: uploads the client already optimized (small webp/jpeg) are
	// stored byte-for-byte, everything else raster gets re-encoded. Any failure
	// here falls back to storing the original bytes — uploads never fail
	// because of compression.
	raw, err := io.ReadAll(src)
	if err != nil {
		return nil, errors.Internal("upload_read_failed", err)
	}
	payload, outCT, outExt := s.processUploadPayload(ct, outExt, raw)

	key, err := makeLocalKeyWithExt(shopID, purpose, outExt)
	if err != nil {
		return nil, errors.Validation("invalid_filename", "اسم الملف غير صالح")
	}

	dstPath := filepath.Join(localStorageDir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(dstPath), 0o755); err != nil {
		return nil, errors.Internal("upload_mkdir_failed", err)
	}
	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, errors.Internal("upload_create_failed", err)
	}
	defer dst.Close()
	if _, err := dst.Write(payload); err != nil {
		return nil, errors.Internal("upload_write_failed", err)
	}

	size := int64(len(payload))
	m := &Media{
		ShopID:      shopID,
		UploadedBy:  strPtr(userID),
		Purpose:     purpose,
		OriginalKey: key,
		OriginalURL: s.localPublicURL(key),
		MimeType:    outCT,
		FileSize:    &size,
	}
	return s.repo.Create(ctx, m)
}

// processUploadPayload decides what actually gets stored for an upload.
// Raster images that are not already small webp/jpeg are re-encoded at high
// quality; everything else (and any compression failure) passes through
// untouched. Returns the payload bytes, the mime type to persist, and the
// file extension to store under.
func (s *Service) processUploadPayload(ct, ext string, raw []byte) (payload []byte, outCT, outExt string) {
	payload, outCT, outExt = raw, ct, ext
	if s.compression == nil || !isRasterImage(ct) || alreadyEfficient(ct, int64(len(raw))) {
		return
	}
	res, err := s.compression.Compress(raw, compression.QualityHigh)
	if err != nil || res.SizeBytes >= len(raw) {
		return
	}
	payload = res.Data
	outCT = ct
	if res.Format == "jpeg" {
		outCT, outExt = "image/jpeg", ".jpg"
	}
	return
}

// isRasterImage reports whether the content type is a canvas-decodable raster
// image worth re-encoding. Vector and animated formats are stored as-is.
func isRasterImage(ct string) bool {
	return strings.HasPrefix(ct, "image/") &&
		ct != "image/gif" &&
		ct != "image/svg+xml"
}

// alreadyEfficient skips re-encoding for formats the browser pipeline emits
// when the payload is small enough that a second encode saves nothing.
func alreadyEfficient(ct string, size int64) bool {
	const efficientThreshold = 1 << 20 // 1 MiB
	return (ct == "image/webp" || ct == "image/jpeg") && size <= efficientThreshold
}

// makeLocalKeyWithExt builds a storage key of the form
// "<shopId>/<purpose>/<uuid><ext>" from an already-validated extension
// (compression may replace the original extension with .jpg).
func makeLocalKeyWithExt(shopID, purpose, ext string) (string, error) {
	if !isValidExt(ext) {
		return "", errors.Validation("invalid_filename", "اسم الملف غير صالح")
	}
	if shopID == "" || purpose == "" {
		return "", errors.Validation("invalid_filename", "اسم الملف غير صالح")
	}
	return shopID + "/" + purpose + "/" + uuid.NewString() + ext, nil
}

// blockedExts are extensions that must never be stored even when the
// declared content type passes the allowlist — a mismatched Content-Type
// header could otherwise smuggle active content (SVG/HTML) onto disk under
// an executable extension.
var blockedExts = map[string]bool{
	".svg": true, ".svgz": true, ".html": true, ".htm": true,
	".xhtml": true, ".js": true, ".mjs": true, ".xml": true,
}

func isValidExt(ext string) bool {
	if ext == "" || ext == "." || len(ext) > 10 {
		return false
	}
	if blockedExts[strings.ToLower(ext)] {
		return false
	}
	for _, r := range ext[1:] {
		if !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9') {
			return false
		}
	}
	return true
}

// makeLocalKey builds a storage key of the form
// "<shopId>/<purpose>/<uuid><ext>" with a sanitized extension.
func makeLocalKey(shopID, purpose, filename string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if !isValidExt(ext) {
		return "", errors.Validation("invalid_filename", "اسم الملف غير صالح")
	}
	return makeLocalKeyWithExt(shopID, purpose, ext)
}

func (s *Service) localPublicURL(key string) string {
	base := strings.TrimRight(s.cfg.App.PublicURL, "/")
	if base == "" {
		base = fmt.Sprintf("http://localhost:%d", s.cfg.App.Port)
	}
	return base + "/uploads/" + key
}
