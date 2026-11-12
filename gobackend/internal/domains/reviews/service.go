package reviews

import (
	"context"
	"fmt"
)

// Service handles review business logic
type Service struct {
	repo *Repository
}

// NewService creates a new reviews service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateReview creates a new review
func (s *Service) CreateReview(ctx context.Context, userID string, targetType ReviewTarget, targetID string, data *CreateReviewDTO) (*Review, error) {
	exists, err := s.repo.HasReview(ctx, userID, targetType, targetID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing review: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("you have already reviewed this")
	}

	return s.repo.CreateReview(ctx, userID, targetType, targetID, data)
}

// ListReviews retrieves reviews for a target
func (s *Service) ListReviews(ctx context.Context, targetType ReviewTarget, targetID string, limit, offset int) ([]Review, int64, float64, error) {
	return s.repo.ListReviews(ctx, targetType, targetID, limit, offset)
}

// DeleteReview deletes a review by the owner
func (s *Service) DeleteReview(ctx context.Context, reviewID, userID string) error {
	return s.repo.DeleteReview(ctx, reviewID, userID)
}
