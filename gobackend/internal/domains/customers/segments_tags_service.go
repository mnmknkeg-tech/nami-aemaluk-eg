package customers

import (
	"context"
)

// ListSegments delegates to the repository.
func (s *Service) ListSegments(ctx context.Context, shopID string) ([]CustomerSegment, error) {
	return s.repo.ListSegments(ctx, shopID)
}

// CreateSegment delegates to the repository.
func (s *Service) CreateSegment(ctx context.Context, shopID string, name, nameAr, description string, criteria map[string]interface{}, isActive bool) (*CustomerSegment, error) {
	return s.repo.CreateSegment(ctx, shopID, name, nameAr, description, criteria, isActive)
}

// UpdateSegment delegates to the repository.
func (s *Service) UpdateSegment(ctx context.Context, shopID, id string, name, nameAr, description string, criteria map[string]interface{}, isActive *bool) (*CustomerSegment, error) {
	return s.repo.UpdateSegment(ctx, shopID, id, name, nameAr, description, criteria, isActive)
}

// DeleteSegment delegates to the repository.
func (s *Service) DeleteSegment(ctx context.Context, shopID, id string) error {
	return s.repo.DeleteSegment(ctx, shopID, id)
}

// ListTags delegates to the repository.
func (s *Service) ListTags(ctx context.Context, shopID string) ([]CustomerTag, error) {
	return s.repo.ListTags(ctx, shopID)
}

// CreateTag delegates to the repository.
func (s *Service) CreateTag(ctx context.Context, shopID, name, nameAr, color, description string, isActive bool) (*CustomerTag, error) {
	return s.repo.CreateTag(ctx, shopID, name, nameAr, color, description, isActive)
}

// UpdateTag delegates to the repository.
func (s *Service) UpdateTag(ctx context.Context, shopID, id string, name, nameAr, color, description string, isActive *bool) (*CustomerTag, error) {
	return s.repo.UpdateTag(ctx, shopID, id, name, nameAr, color, description, isActive)
}

// DeleteTag delegates to the repository.
func (s *Service) DeleteTag(ctx context.Context, shopID, id string) error {
	return s.repo.DeleteTag(ctx, shopID, id)
}