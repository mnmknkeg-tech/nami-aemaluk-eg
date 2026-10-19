package support

import (
	"context"
)

// Service handles support business logic
type Service struct {
	repo *Repository
}

// NewService creates a new support service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateTicket creates a new support ticket
func (s *Service) CreateTicket(ctx context.Context, userID string, shopID *string, data *CreateTicketDTO) (*Ticket, error) {
	return s.repo.CreateTicket(ctx, userID, shopID, data)
}

// GetTicketByID retrieves a ticket by ID
func (s *Service) GetTicketByID(ctx context.Context, id string) (*Ticket, error) {
	return s.repo.GetTicketByID(ctx, id)
}

// ListTickets retrieves tickets with filters
func (s *Service) ListTickets(ctx context.Context, userID, shopID *string, status *TicketStatus, category *string, limit, offset int) ([]Ticket, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListTickets(ctx, userID, shopID, status, category, limit, offset)
}

// UpdateTicketStatus updates the status of a ticket
func (s *Service) UpdateTicketStatus(ctx context.Context, id string, status TicketStatus) error {
	return s.repo.UpdateTicketStatus(ctx, id, status)
}

// ResolveTicket marks a ticket as resolved
func (s *Service) ResolveTicket(ctx context.Context, id string) error {
	return s.repo.UpdateTicketStatus(ctx, id, TicketStatusResolved)
}

// CloseTicket closes a ticket
func (s *Service) CloseTicket(ctx context.Context, id string) error {
	return s.repo.UpdateTicketStatus(ctx, id, TicketStatusClosed)
}
