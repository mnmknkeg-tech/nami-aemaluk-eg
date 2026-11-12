package search

import (
	"context"
)

// Service handles search business logic
type Service struct {
	repo *Repository
}

// NewService creates a new search service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// SearchProducts searches for products
func (s *Service) SearchProducts(ctx context.Context, query string, shopID *string, category *string, minPrice, maxPrice *float64, limit, offset int) ([]ProductSearchResult, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.SearchProducts(ctx, query, shopID, category, minPrice, maxPrice, limit, offset)
}

// SearchShops searches for shops
func (s *Service) SearchShops(ctx context.Context, query string, category *string, limit, offset int) ([]ShopSearchResult, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.SearchShops(ctx, query, category, limit, offset)
}

// SearchOrders searches for orders
func (s *Service) SearchOrders(ctx context.Context, query string, shopID *string, userID *string, limit, offset int) ([]OrderSearchResult, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.SearchOrders(ctx, query, shopID, userID, limit, offset)
}
