package complaints

import (
	"context"
)

// Service handles complaints business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new complaints service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create creates a new complaint.
func (s *Service) Create(ctx context.Context, data *CreateComplaintDTO) (*Complaint, error) {
	return s.repo.Create(ctx, data)
}

// GetByID retrieves one complaint.
func (s *Service) GetByID(ctx context.Context, id string) (*Complaint, error) {
	return s.repo.GetByID(ctx, id)
}

// ListByShop lists complaints of a shop with sane pagination bounds.
func (s *Service) ListByShop(ctx context.Context, shopID string, status *string, limit, offset int) ([]Complaint, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListByShop(ctx, shopID, status, limit, offset)
}

// Update patches one complaint.
func (s *Service) Update(ctx context.Context, id string, data *UpdateComplaintDTO) (*Complaint, error) {
	return s.repo.Update(ctx, id, data)
}

// Delete removes one complaint.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// BulkDelete removes many complaints and returns the deleted count.
func (s *Service) BulkDelete(ctx context.Context, ids []string) (int64, error) {
	return s.repo.BulkDelete(ctx, ids)
}
