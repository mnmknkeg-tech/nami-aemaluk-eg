package breach

import (
	"context"
)

// Service handles breach incident business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new breach service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create creates a new breach incident.
func (s *Service) Create(ctx context.Context, title, description, severity string, affectedUsers int) (*BreachIncident, error) {
	return s.repo.Create(ctx, title, description, severity, affectedUsers)
}

// ListAll returns all breach incidents.
func (s *Service) ListAll(ctx context.Context) ([]BreachIncident, error) {
	return s.repo.FindAll(ctx)
}

// UpdateStatus updates a breach incident status.
func (s *Service) UpdateStatus(ctx context.Context, id, status string) (*BreachIncident, error) {
	return s.repo.UpdateStatus(ctx, id, status)
}

// HasActiveUnnotified checks if there are active unnotified breaches.
func (s *Service) HasActiveUnnotified(ctx context.Context) (bool, error) {
	return s.repo.HasActiveUnnotified(ctx)
}