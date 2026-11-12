package invoice

import (
	"context"
)

// Service handles invoice business logic
type Service struct {
	repo *Repository
}

// NewService creates a new invoice service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// CreateInvoice creates a new invoice
func (s *Service) CreateInvoice(ctx context.Context, orderID, shopID string, dueDate string) (*Invoice, error) {
	return s.repo.CreateInvoice(ctx, orderID, shopID, dueDate)
}

// GetInvoiceByID retrieves an invoice by ID
func (s *Service) GetInvoiceByID(ctx context.Context, id string) (*Invoice, error) {
	return s.repo.GetInvoiceByID(ctx, id)
}

// ListInvoices retrieves invoices with filters
func (s *Service) ListInvoices(ctx context.Context, shopID, customerID *string, status *InvoiceStatus, limit, offset int) ([]Invoice, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	return s.repo.ListInvoices(ctx, shopID, customerID, status, limit, offset)
}

// UpdateInvoiceStatus updates the status of an invoice
func (s *Service) UpdateInvoiceStatus(ctx context.Context, id string, status InvoiceStatus) error {
	return s.repo.UpdateInvoiceStatus(ctx, id, status)
}

// MarkInvoiceAsPaid marks an invoice as paid
func (s *Service) MarkInvoiceAsPaid(ctx context.Context, id string) error {
	return s.repo.UpdateInvoiceStatus(ctx, id, InvoiceStatusPaid)
}

// CancelInvoice cancels an invoice
func (s *Service) CancelInvoice(ctx context.Context, id string) error {
	return s.repo.UpdateInvoiceStatus(ctx, id, InvoiceStatusCancelled)
}

// SendInvoice marks an invoice as sent to the customer
func (s *Service) SendInvoice(ctx context.Context, id string) error {
	return s.repo.UpdateInvoiceStatus(ctx, id, InvoiceStatusSent)
}
