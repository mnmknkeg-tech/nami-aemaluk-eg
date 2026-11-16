package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/media"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// ImageOptimizeHandler records that optimization is unavailable until a real
// image transformation pipeline is configured. The original upload remains usable.
type ImageOptimizeHandler struct {
	media *media.Service
}

// NewImageOptimizeHandler creates a handler for image optimization jobs.
func NewImageOptimizeHandler(mediaSvc *media.Service) *ImageOptimizeHandler {
	return &ImageOptimizeHandler{media: mediaSvc}
}

// ProcessTask implements asynq.Handler.
func (h *ImageOptimizeHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p jobs.ImageOptimizePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("%w: %v", asynq.SkipRetry, err)
	}

	if p.MediaID == "" {
		return fmt.Errorf("%w: missing media_id", asynq.SkipRetry)
	}

	reason := "Image optimization is not configured; the original uploaded file remains available."
	_, err := h.media.UpdateOptimizationStatus(ctx, p.MediaID, "FAILED", map[string]string{}, &reason)
	if err != nil {
		return fmt.Errorf("record image optimization status: %w", err)
	}

	logger.Global().Warn("image optimization unavailable; original media retained",
		zap.String("media_id", p.MediaID),
		zap.String("key", p.Key),
	)
	return nil
}
