package feedback

import (
	"context"
)

// Service handles feedback business logic
type Service struct {
	repo *Repository
}

// NewService creates a new feedback service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateFeedback creates a new feedback
func (s *Service) CreateFeedback(ctx context.Context, userID string, data *CreateFeedbackDTO) (*Feedback, error) {
	return s.repo.CreateFeedback(ctx, userID, data)
}

// GetFeedbackByID retrieves a feedback by ID
func (s *Service) GetFeedbackByID(ctx context.Context, id string) (*Feedback, error) {
	return s.repo.GetFeedbackByID(ctx, id)
}

// ListFeedback retrieves feedback with filters
func (s *Service) ListFeedback(ctx context.Context, shopID, productID *string, feedbackType *FeedbackType, rating *int, limit, offset int) ([]Feedback, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListFeedback(ctx, shopID, productID, feedbackType, rating, limit, offset)
}

// UpdateFeedbackStatus updates the status of feedback
func (s *Service) UpdateFeedbackStatus(ctx context.Context, id string, status string) error {
	return s.repo.UpdateFeedbackStatus(ctx, id, status)
}

// ApproveFeedback approves feedback
func (s *Service) ApproveFeedback(ctx context.Context, id string) error {
	return s.repo.UpdateFeedbackStatus(ctx, id, "APPROVED")
}

// RejectFeedback rejects feedback
func (s *Service) RejectFeedback(ctx context.Context, id string) error {
	return s.repo.UpdateFeedbackStatus(ctx, id, "REJECTED")
}

// DeleteFeedback deletes feedback by ID
func (s *Service) DeleteFeedback(ctx context.Context, id string) error {
	return s.repo.DeleteFeedback(ctx, id)
}
