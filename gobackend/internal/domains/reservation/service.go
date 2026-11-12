package reservation

import (
	"context"
	"fmt"
	"time"
)

// Service handles reservation business logic
type Service struct {
	repo *Repository
}

// NewService creates a new reservation service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateReservation creates a new reservation
func (s *Service) CreateReservation(ctx context.Context, data *CreateReservationDTO) (*Reservation, error) {
	// Validate item price
	if data.ItemPrice < 0 {
		return nil, fmt.Errorf("item price cannot be negative")
	}

	// Validate addons
	for _, addon := range data.Addons {
		if addon.Price < 0 {
			return nil, fmt.Errorf("addon price cannot be negative")
		}
	}

	// Validate variant selection
	if data.VariantSelection != nil {
		if data.VariantSelection.Price < 0 {
			return nil, fmt.Errorf("variant price cannot be negative")
		}
	}

	return s.repo.CreateReservation(ctx, data)
}

// GetReservationByID retrieves a reservation by ID
func (s *Service) GetReservationByID(ctx context.Context, id string) (*Reservation, error) {
	return s.repo.GetReservationByID(ctx, id)
}

// ListReservations retrieves reservations with filters
func (s *Service) ListReservations(ctx context.Context, shopID, userID *string, status *ReservationStatus, limit, offset int) ([]Reservation, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListReservations(ctx, shopID, userID, status, limit, offset)
}

// UpdateReservationStatus updates the status of a reservation
func (s *Service) UpdateReservationStatus(ctx context.Context, id string, status ReservationStatus) error {
	// Validate status transition
	reservation, err := s.repo.GetReservationByID(ctx, id)
	if err != nil {
		return err
	}

	// Check if status transition is valid
	if !s.isValidStatusTransition(reservation.Status, status) {
		return fmt.Errorf("invalid status transition from %s to %s", reservation.Status, status)
	}

	return s.repo.UpdateReservationStatus(ctx, id, status)
}

// ExpireStaleReservations marks pending/confirmed reservations as expired if past expiry time
func (s *Service) ExpireStaleReservations(ctx context.Context) error {
	return s.repo.ExpireStaleReservations(ctx)
}

// GetReservationAnalytics retrieves analytics for reservations
func (s *Service) GetReservationAnalytics(ctx context.Context, shopID *string) (*ReservationAnalytics, error) {
	return s.repo.GetReservationAnalytics(ctx, shopID)
}

// isValidStatusTransition checks if a status transition is valid
func (s *Service) isValidStatusTransition(current, new ReservationStatus) bool {
	// Define valid transitions
	validTransitions := map[ReservationStatus][]ReservationStatus{
		ReservationStatusPending:   {ReservationStatusConfirmed, ReservationStatusCancelled, ReservationStatusExpired},
		ReservationStatusConfirmed: {ReservationStatusCompleted, ReservationStatusCancelled},
		ReservationStatusCompleted: {},
		ReservationStatusCancelled: {},
		ReservationStatusExpired:  {},
	}

	allowed, exists := validTransitions[current]
	if !exists {
		return false
	}

	for _, allowedStatus := range allowed {
		if allowedStatus == new {
			return true
		}
	}

	return false
}

// CalculateSubtotal calculates the subtotal for a reservation
func (s *Service) CalculateSubtotal(itemPrice float64, addons []AddonSelection, variant *VariantSelection) float64 {
	subtotal := itemPrice

	for _, addon := range addons {
		subtotal += addon.Price
	}

	if variant != nil {
		subtotal += variant.Price
	}

	return subtotal
}

// IsExpired checks if a reservation is expired
func (s *Service) IsExpired(reservation *Reservation) bool {
	expiresAt, err := time.Parse(time.RFC3339, reservation.ExpiresAt)
	if err != nil {
		return false
	}

	return time.Now().UTC().After(expiresAt)
}

// GetReservationsByShop retrieves reservations for a specific shop
func (s *Service) GetReservationsByShop(ctx context.Context, shopID string, status *ReservationStatus, limit, offset int) ([]Reservation, int64, error) {
	return s.ListReservations(ctx, &shopID, nil, status, limit, offset)
}

// GetReservationsByUser retrieves reservations for a specific user
func (s *Service) GetReservationsByUser(ctx context.Context, userID string, status *ReservationStatus, limit, offset int) ([]Reservation, int64, error) {
	return s.ListReservations(ctx, nil, &userID, status, limit, offset)
}

// ConfirmReservation confirms a pending reservation
func (s *Service) ConfirmReservation(ctx context.Context, id string) error {
	return s.UpdateReservationStatus(ctx, id, ReservationStatusConfirmed)
}

// CancelReservation cancels a reservation
func (s *Service) CancelReservation(ctx context.Context, id string) error {
	return s.UpdateReservationStatus(ctx, id, ReservationStatusCancelled)
}

// CompleteReservation marks a reservation as completed
func (s *Service) CompleteReservation(ctx context.Context, id string) error {
	return s.UpdateReservationStatus(ctx, id, ReservationStatusCompleted)
}
