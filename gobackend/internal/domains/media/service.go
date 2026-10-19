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
	if err := s.authorizeShop(req.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	if s.s3 == nil {
		return nil, errors.Internal("s3_not_configured", fmt.Errorf("object storage not configured"))
	}

	ct := strings.ToLower(strings.TrimSpace(req.ContentType))
	if !storage.IsAllowedContentType(ct) {
		return nil, errors.Validation("invalid_content_type", "نوع الملف غير مدعوم")
	}

	purpose := strings.TrimSpace(req.Purpose)
	if purpose == "" {
		purpose = "images"
	}

	if req.FileSize != nil && *req.FileSize > 0 {
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
func (s *Service) CompleteUpload(ctx context.Context, userID, actorRole, actorShopID string, req CompleteUploadRequest) (*Media, error) {
	if err := s.authorizeShop(req.ShopID, actorRole, actorShopID); err != nil {
		return nil, err
	}
	if s.s3 == nil {
		return nil, errors.Internal("s3_not_configured", fmt.Errorf("object storage not configured"))
	}

	existing, err := s.repo.FindByKey(ctx, req.Key)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	purpose := strings.TrimSpace(req.Purpose)
	if purpose == "" {
		purpose = "images"
	}

	publicURL := s.s3.PublicURL(req.Key)
	if req.PublicURL != nil && *req.PublicURL != "" && s.s3.IsValidPublicURL(*req.PublicURL) {
		publicURL = *req.PublicURL
	}

	// Determine compression quality based on purpose
	var quality compression.Quality
	switch purpose {
	case "gallery":
		quality = compression.QualityUltra
	case "products":
		quality = compression.QualityHigh
	case "avatars":
		quality = compression.QualityMedium
	case "thumbnails":
		quality = compression.QualityThumbnail
	default:
		quality = compression.QualityHigh
	}

	compressedURLs := make(map[string]string)
	if s.compression != nil && strings.HasPrefix(strings.ToLower(req.MimeType), "image/") {
		compressedURLs["high"] = s.compression.GetCompressedURL(publicURL, compression.QualityHigh)
		compressedURLs["medium"] = s.compression.GetCompressedURL(publicURL, compression.QualityMedium)
		compressedURLs["thumbnail"] = s.compression.GetCompressedURL(publicURL, compression.QualityThumbnail)
		compressedURLs["default"] = s.compression.GetCompressedURL(publicURL, quality)
	}

	m := &Media{
		ShopID:         req.ShopID,
		UploadedBy:     strPtr(userID),
		Purpose:        purpose,
		OriginalKey:    req.Key,
		OriginalURL:    publicURL,
		MimeType:       req.MimeType,
		FileSize:       req.FileSize,
		Width:          req.Width,
		Height:         req.Height,
		LinkedType:     req.LinkedType,
		LinkedID:       req.LinkedID,
		CompressedURLs: compressedURLs,
	}

	created, err := s.repo.Create(ctx, m)
	if err != nil {
		return nil, err
	}

	// Best-effort: enqueue background optimization for images. Failure to
	// enqueue must never fail the upload flow.
	if s.jobs != nil && strings.HasPrefix(strings.ToLower(m.MimeType), "image/") {
		if err := s.jobs.EnqueueImageOptimize(ctx, jobs.ImageOptimizePayload{
			MediaID: created.ID,
			Key:     created.OriginalKey,
			ShopID:  created.ShopID,
		}); err != nil {
			logger.Global().Warn("failed to enqueue image optimize job", zap.String("media_id", created.ID), zap.Error(err))
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
