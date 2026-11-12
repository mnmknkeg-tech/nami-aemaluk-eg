package dsr

import (
	"context"
)

// Service handles DSR business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new DSR service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create creates a new data subject request.
func (s *Service) Create(ctx context.Context, userID, requestType string, details any) (*DataSubjectRequest, error) {
	return s.repo.Create(ctx, userID, requestType, details)
}

// ListByUser returns DSRs for a user.
func (s *Service) ListByUser(ctx context.Context, userID string) ([]DataSubjectRequest, error) {
	return s.repo.FindByUser(ctx, userID)
}

// ListAll returns all DSRs (admin).
func (s *Service) ListAll(ctx context.Context) ([]DataSubjectRequest, error) {
	return s.repo.FindAll(ctx)
}

// UpdateStatus updates a DSR status.
func (s *Service) UpdateStatus(ctx context.Context, id, status string, adminNotes *string) (*DataSubjectRequest, error) {
	return s.repo.UpdateStatus(ctx, id, status, adminNotes)
}