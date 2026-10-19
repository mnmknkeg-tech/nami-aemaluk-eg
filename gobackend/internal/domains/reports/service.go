package reports

import (
	"context"
)

// Service handles product report business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new reports service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create creates a new product report.
func (s *Service) Create(ctx context.Context, productID, shopID string, reporterID *string, reason, description string) (*ProductReport, error) {
	return s.repo.Create(ctx, productID, shopID, reporterID, reason, description)
}

// ListAll returns all product reports.
func (s *Service) ListAll(ctx context.Context) ([]ProductReport, error) {
	return s.repo.FindAll(ctx)
}

// UpdateStatus updates a report status.
func (s *Service) UpdateStatus(ctx context.Context, id, status string, adminNotes *string) (*ProductReport, error) {
	return s.repo.UpdateStatus(ctx, id, status, adminNotes)
}