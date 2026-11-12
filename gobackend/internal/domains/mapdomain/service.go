package mapdomain

import "context"

// Service handles map business logic
type Service struct {
	repo *Repository
}

// NewService creates a new map service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetPins retrieves map pins
func (s *Service) GetPins(ctx context.Context, lat, lng *float64, radiusKm *float64) ([]MapPin, error) {
	return s.repo.GetPins(ctx, lat, lng, radiusKm)
}

// ListPendingListings retrieves pending listings for admin
func (s *Service) ListPendingListings(ctx context.Context, limit int) ([]map[string]any, error) {
	return s.repo.ListPendingListings(ctx, limit)
}

// SetListingStatus updates listing status
func (s *Service) SetListingStatus(ctx context.Context, id, status, note, adminID string) error {
	return s.repo.SetListingStatus(ctx, id, status, note, adminID)
}

// SubmitListing creates a new pending map listing with its primary branch.
func (s *Service) SubmitListing(ctx context.Context, req SubmitListingRequest) (string, error) {
	return s.repo.CreateListing(ctx, req)
}
