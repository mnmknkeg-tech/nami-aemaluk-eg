package gallery

import (
	"context"
)

// Service handles gallery business logic
type Service struct {
	repo *Repository
}

// NewService creates a new gallery service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateGalleryItem creates a new gallery item
func (s *Service) CreateGalleryItem(ctx context.Context, shopID string, data *CreateGalleryItemDTO) (*GalleryItem, error) {
	return s.repo.CreateGalleryItem(ctx, shopID, data)
}

// GetGalleryItemByID retrieves a gallery item by ID
func (s *Service) GetGalleryItemByID(ctx context.Context, id string) (*GalleryItem, error) {
	return s.repo.GetGalleryItemByID(ctx, id)
}

// ListGalleryItems retrieves gallery items for a shop
func (s *Service) ListGalleryItems(ctx context.Context, shopID string, limit, offset int) ([]GalleryItem, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListGalleryItems(ctx, shopID, limit, offset)
}

// UpdateGalleryItem updates a gallery item scoped to its owning shop.
func (s *Service) UpdateGalleryItem(ctx context.Context, shopID, id string, data *UpdateGalleryItemDTO) error {
	return s.repo.UpdateGalleryItem(ctx, shopID, id, data)
}

// DeleteGalleryItem deletes a gallery item scoped to its owning shop.
func (s *Service) DeleteGalleryItem(ctx context.Context, shopID, id string) error {
	return s.repo.DeleteGalleryItem(ctx, shopID, id)
}
