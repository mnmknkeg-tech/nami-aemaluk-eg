package media

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/storage"
	"github.com/aws/aws-sdk-go-v2/aws"
	"go.uber.org/zap"
)

// Service implements the Media domain business logic.
type Service struct {
	cfg         *config.Config
	repo        *Repository
	s3          *storage.S3Client
	jobs        *jobs.Client
	compression *compression.Service
}

// NewService creates a media service. jobsClient is optional; when provided,
// completed uploads are enqueued for background optimization (resize/convert).
func NewService(cfg *config.Config, repo *Repository, s3 *storage.S3Client, jobsClient *jobs.Client, compressionSvc *compression.Service) *Service {
	return &Service{cfg: cfg, repo: repo, s3: s3, jobs: jobsClient, compression: compressionSvc}
}

// PresignUpload generates a presigned PUT URL for direct S3/R2 uploads.
func (s *Service) PresignUpload(ctx context.Context, userID, actorRole, actorShopID string, req PresignUploadRequest) (*PresignUploadResponse, error) {
	if strings.TrimSpace(req.ShopID) == "" {
		req.ShopID = actorShopID
	}
	if req.ShopID == "" {
		return nil, errors.Validation("shop_id_required", "معرف المتجر مطلوب")
	}
	if err := s.authorizeShop(req.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	if s.s3 == nil {
		return nil, errors.Internal("s3_not_configured", fmt.Errorf("object storage not configured"))
	}

	ct := strings.ToLower(strings.TrimSpace(req.ContentType))
	if !storage.IsAllowedContentType(ct) || storage.ParseContentTypeFromFilename(req.Filename) != ct {
		return nil, errors.Validation("invalid_content_type", "نوع الملف لا يطابق امتداده أو غير مدعوم")
	}

	purpose := strings.TrimSpace(req.Purpose)
	if purpose == "" {
		purpose = "images"
	}

	if req.FileSize != nil {
		if *req.FileSize <= 0 {
			return nil, errors.Validation("invalid_file_size", "حجم الملف غير صالح")
		}
		maxBytes := s.maxUploadBytes()
		if maxBytes > 0 && *req.FileSize > maxBytes {
			return nil, errors.Validation("file_too_large", "حجم الملف أكبر من المسموح")
		}
	}

	key := s.s3.MakeKey(req.ShopID, purpose, req.Filename)
	expires := 15 * time.Minute
	url, err := s.s3.PresignUpload(ctx, key, ct, expires)
	if err != nil {
		logger.Global().Error("failed to presign upload", zap.Error(err))
		return nil, errors.Internal("presign_failed", err)
	}

	publicURL := s.s3.PublicURL(key)

	return &PresignUploadResponse{
		URL:         url,
		Key:         key,
		PublicURL:   publicURL,
		ContentType: ct,
		ExpiresIn:   int(expires.Seconds()),
	}, nil
}

// CompleteUpload records a media row after the client uploads directly to S3.
// It is idempotent: if a media record with the same key already exists, the
// existing record is returned without creating a duplicate.
func (s *Service) CompleteUpload(ctx context.Context, userID, actorRole, actorShopID string, req CompleteUploadRequest) (*Media, error) {
	if strings.TrimSpace(req.ShopID) == "" {
		req.ShopID = actorShopID
	}
	if req.ShopID == "" {
		return nil, errors.Validation("shop_id_required", "معرف المتجر مطلوب")
	}
	if err := s.authorizeShop(req.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	if s.s3 == nil {
		return nil, errors.Internal("s3_not_configured", fmt.Errorf("object storage not configured"))
	}

	// Validate key syntax and tenant ownership before looking up or recording it.
	if err := s.s3.ValidateKey(req.Key); err != nil {
		return nil, errors.Validation("invalid_key", "invalid upload key")
	}
	if !strings.HasPrefix(req.Key, "shops/"+req.ShopID+"/") {
		return nil, errors.Forbidden("upload_key_tenant_mismatch", "ملف الرفع لا يتبع هذا المتجر")
	}
	mimeType := strings.ToLower(strings.TrimSpace(req.MimeType))
	if !storage.IsAllowedContentType(mimeType) {
		return nil, errors.Validation("invalid_content_type", "نوع الملف غير مدعوم")
	}

	existing, err := s.repo.FindByKey(ctx, req.Key)
	if err != nil {
		return nil, errors.Internal("complete_upload_find_failed", err)
	}
	if existing != nil {
		if existing.ShopID != req.ShopID {
			return nil, errors.Forbidden("upload_key_tenant_mismatch", "ملف الرفع لا يتبع هذا المتجر")
		}
		return existing, nil
	}

	head, err := s.s3.HeadObject(ctx, req.Key)
	if err != nil {
		return nil, errors.Validation("uploaded_object_missing", "الملف غير موجود في التخزين أو تعذر التحقق منه")
	}
	actualMime := strings.ToLower(strings.TrimSpace(aws.ToString(head.ContentType)))
	actualSize := aws.ToInt64(head.ContentLength)
	if !storage.IsAllowedContentType(actualMime) || actualMime != mimeType ||
		storage.ParseContentTypeFromFilename(req.Key) != actualMime {
		return nil, errors.Validation("uploaded_object_type_mismatch", "نوع الملف المخزن لا يطابق امتداده أو الطلب")
	}
	if strings.HasPrefix(actualMime, "image/") {
		prefix, readErr := s.s3.ReadObjectPrefix(ctx, req.Key, 512)
		if readErr != nil || !isValidImageSignature(prefix, actualMime) {
			return nil, errors.Validation("uploaded_object_signature_invalid", "محتوى الصورة المخزن غير صالح أو لا يطابق نوعه")
		}
	}
	if actualSize <= 0 || actualSize > s.maxUploadBytes() {
		return nil, errors.Validation("uploaded_object_size_invalid", "حجم الملف المخزن غير صالح")
	}
	if req.FileSize != nil && *req.FileSize > 0 && *req.FileSize != actualSize {
		return nil, errors.Validation("uploaded_object_size_mismatch", "حجم الملف المخزن لا يطابق الطلب")
	}

	purpose := strings.TrimSpace(req.Purpose)
	if purpose == "" {
		purpose = "images"
	}

	// Public URL is derived only from our configured storage base; never trust a client URL.
	publicURL := s.s3.PublicURL(req.Key)


	m := &Media{
		ShopID:         req.ShopID,
		UploadedBy:     strPtr(userID),
		Purpose:        purpose,
		OriginalKey:    req.Key,
		OriginalURL:    publicURL,
		MimeType:       actualMime,
		FileSize:       &actualSize,
		Width:          req.Width,
		Height:         req.Height,
		LinkedType:     req.LinkedType,
		LinkedID:       req.LinkedID,
	}

	created, err := s.repo.Create(ctx, m)
	if err != nil {
		return nil, errors.Internal("complete_upload_persist_failed", err)
	}

	// Best-effort: enqueue background optimization for images. Failure to
	// enqueue must never fail the upload flow.
	if s.jobs != nil && strings.HasPrefix(strings.ToLower(m.MimeType), "image/") {
		if err := s.jobs.EnqueueImageOptimize(ctx, jobs.ImageOptimizePayload{
			MediaID: created.ID,
			Key:     created.OriginalKey,
			ShopID:  created.ShopID,
		}); err != nil {
			logger.Global().Warn("failed to enqueue image optimize job",
				zap.String("media_id", created.ID),
				zap.Error(err),
			)
		}
	}

	return created, nil
}

// ListMedia lists media for a shop.
func (s *Service) ListMedia(ctx context.Context, actorRole, actorShopID string, req ListMediaRequest) ([]Media, error) {
	if err := s.authorizeShop(req.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	limit, offset := normalizeMediaPaging(req.Page, req.Limit)
	return s.repo.ListByShop(ctx, req.ShopID, req.Purpose, limit, offset)
}

// GetMedia returns a single media record.
func (s *Service) GetMedia(ctx context.Context, id, actorRole, actorShopID string) (*Media, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.NotFound("media", id)
	}
	if err := s.authorizeShop(m.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	return m, nil
}

// UpdateOptimizationStatus is intended to be called by the async optimize worker.
func (s *Service) UpdateOptimizationStatus(ctx context.Context, id, status string, urls map[string]string, errMsg *string) (*Media, error) {
	return s.repo.UpdateOptimizationStatus(ctx, id, status, urls, errMsg)
}

func (s *Service) authorizeShop(shopID, actorRole, actorShopID string) error {
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	if strings.EqualFold(actorRole, "ADMIN") {
		return nil
	}
	if actorShopID != shopID {
		return errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	return nil
}

func (s *Service) maxUploadBytes() int64 {
	raw := s.cfg.S3.MaxUploadSizeMB
	if raw <= 0 {
		raw = 4096
	}
	return int64(raw) * 1024 * 1024
}

func normalizeMediaPaging(page, limit int) (int, int) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit
	return limit, offset
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
