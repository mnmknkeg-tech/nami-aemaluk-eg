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

// ImageOptimizeHandler processes jobs.TypeImageOptimize tasks. It currently
// marks the upload as optimized without resizing/re-encoding; real
// resize/webp conversion (e.g. via govips) can be plugged in here without
// changing the queue contract.
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

	// TODO: integrate real image processing (resize/thumbnail/webp) here,
	// e.g. via govips against s.s3, then pass the resulting keys/URLs below.
	logger.Global().Info("image optimize job received (no-op placeholder)",
		zap.String("media_id", p.MediaID),
		zap.String("key", p.Key),
	)

	_, err := h.media.UpdateOptimizationStatus(ctx, p.MediaID, "completed", map[string]string{}, nil)
	return err
}
