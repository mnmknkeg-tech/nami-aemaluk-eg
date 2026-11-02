package workers

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/mailer"
	"github.com/hibiken/asynq"
)

// EmailHandler processes jobs.TypeEmailSend tasks by delivering them through
// the configured Mailer (typically SMTP).
type EmailHandler struct {
	mailer mailer.Mailer
}

// NewEmailHandler creates a handler for outgoing email jobs.
func NewEmailHandler(m mailer.Mailer) *EmailHandler {
	return &EmailHandler{mailer: m}
}

// ProcessTask implements asynq.Handler.
func (h *EmailHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p jobs.EmailPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("%w: %v", asynq.SkipRetry, err)
	}

	if p.To == "" {
		return fmt.Errorf("%w: missing recipient", asynq.SkipRetry)
	}

	_, err := h.mailer.Send(ctx, mailer.Message{
		To:      p.To,
		Subject: p.Subject,
		Text:    p.Text,
		HTML:    p.HTML,
	})
	return err
}
