package productcategories

import (
	"context"
	"errors"
)

// Service provides business logic for product categories.
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ListByShop returns all categories for a shop.
func (s *Service) ListByShop(ctx context.Context, shopID string) ([]Category, error) {
	if shopID == "" {
		return nil, errors.New("shopId is required")
	}
	return s.repo.ListByShop(ctx, shopID)
}

// Create creates a new category.
func (s *Service) Create(ctx context.Context, req CreateCategoryRequest) (*Category, error) {
	if req.ShopID == "" {
		return nil, errors.New("shopId is required")
	}
	if req.Name == "" && req.NameAr == "" {
		return nil, errors.New("name or nameAr is required")
	}
	if req.Name == "" {
		req.Name = req.NameAr
	}
	if req.NameAr == "" {
		req.NameAr = req.Name
	}
	// Clear empty parent
	if req.ParentCategoryID != nil && *req.ParentCategoryID == "" {
		req.ParentCategoryID = nil
	}
	return s.repo.Create(ctx, req)
}

// Update updates a category scoped to the owner's shop.
func (s *Service) Update(ctx context.Context, id, shopID string, req UpdateCategoryRequest) (*Category, error) {
	return s.repo.Update(ctx, id, shopID, req)
}

// Delete deletes a category scoped to the owner's shop.
func (s *Service) Delete(ctx context.Context, id, shopID string) error {
	return s.repo.Delete(ctx, id, shopID)
}
