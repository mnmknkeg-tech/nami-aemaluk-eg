package publicinbox

import (
	"context"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"go.uber.org/zap"
)

// Service handles public contact / suggestion submissions.
type Service struct {
	repo   *Repository
	logger *zap.Logger
}

// NewService creates a public inbox service.
func NewService(repo *Repository, log *zap.Logger) *Service {
	return &Service{repo: repo, logger: log}
}

// SubmitContact stores a contact-form message.
func (s *Service) SubmitContact(ctx context.Context, req CreateRequest) (*PublicMessage, error) {
	return s.submit(ctx, "contact", req)
}

// SubmitSuggestion stores a suggestion message.
func (s *Service) SubmitSuggestion(ctx context.Context, req CreateRequest) (*PublicMessage, error) {
	return s.submit(ctx, "suggestion", req)
}

func (s *Service) submit(ctx context.Context, kind string, req CreateRequest) (*PublicMessage, error) {
	m, err := s.repo.Create(ctx, kind, req.Name, req.Email, req.Message, req.Meta)
	if err != nil {
		s.logger.Error("Failed to store public message", zap.Error(err), zap.String("kind", kind))
		return nil, err
	}
	return m, nil
}

// List returns messages for the admin inbox.
func (s *Service) List(ctx context.Context, kind string, limit, offset int) ([]PublicMessage, int64, error) {
	return s.repo.List(ctx, kind, limit, offset)
}

// MarkHandled marks a message as processed.
func (s *Service) MarkHandled(ctx context.Context, id string) error {
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	if err := s.repo.MarkHandled(ctx, id); err != nil {
		return errors.NotFound("message_not_found", "الرسالة غير موجودة")
	}
	return nil
}
