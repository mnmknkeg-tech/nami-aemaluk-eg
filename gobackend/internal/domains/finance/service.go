package finance

import "context"

// Service contains the finance report business logic. Entity CRUD (accounts,
// journal, taxes, wallets, transactions, expenses) is served by the accounting
// domain against the acc_* tables.
type Service struct {
	repo *Repository
}

// NewService creates a new finance service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetCashflowSummary(ctx context.Context, shopID string) (*CashflowSummary, error) {
	return s.repo.GetCashflowSummary(ctx, shopID)
}

func (s *Service) GetProfitSummary(ctx context.Context, shopID string) (*ProfitSummary, error) {
	return s.repo.GetProfitSummary(ctx, shopID)
}

func (s *Service) GetRevenueSummary(ctx context.Context, shopID string) (*RevenueSummary, error) {
	return s.repo.GetRevenueSummary(ctx, shopID)
}
