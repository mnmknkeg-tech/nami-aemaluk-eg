package orders

import "context"

func (s *Service) returnsRepo() *returnsRepository {
	return &returnsRepository{pool: s.repo.pool}
}

// ListOrderReturns lists every return recorded for an order of a shop.
func (s *Service) ListOrderReturns(ctx context.Context, shopID, orderID string) ([]*OrderReturn, error) {
	return s.returnsRepo().ListByOrder(ctx, shopID, orderID)
}

// CreateOrderReturn records a return with its items.
func (s *Service) CreateOrderReturn(ctx context.Context, input *CreateReturnInput) (*OrderReturn, error) {
	return s.returnsRepo().Create(ctx, input)
}

// UpdateOrderReturnStatus transitions a return through its lifecycle.
func (s *Service) UpdateOrderReturnStatus(ctx context.Context, shopID, returnID, status string) error {
	return s.returnsRepo().UpdateStatus(ctx, shopID, returnID, status)
}
