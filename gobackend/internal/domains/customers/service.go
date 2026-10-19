package customers

import (
	"context"
)

// Service handles customers business logic
type Service struct {
	repo *Repository
}

// NewService creates a new customers service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ListCustomers retrieves all customers
func (s *Service) ListCustomers(ctx context.Context, shopID *string, limit, offset int) ([]Customer, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListCustomers(ctx, shopID, limit, offset)
}

// GetCustomerByID retrieves a customer by ID
func (s *Service) GetCustomerByID(ctx context.Context, id string) (*Customer, error) {
	return s.repo.GetCustomerByID(ctx, id)
}

// GetCustomerStats retrieves customer statistics
func (s *Service) GetCustomerStats(ctx context.Context, customerID string) (*CustomerStats, error) {
	return s.repo.GetCustomerStats(ctx, customerID)
}
