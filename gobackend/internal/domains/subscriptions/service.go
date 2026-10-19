package subscriptions

import "context"

// Service handles business logic for subscriptions
type Service struct {
	repo *Repository
}

// NewService creates a new subscriptions service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ============================================================
// PLANS
// ============================================================

func (s *Service) ListPlans(ctx context.Context, shopID string) ([]SubscriptionPlan, error) {
	return s.repo.ListPlans(ctx, shopID)
}

func (s *Service) GetPlanByID(ctx context.Context, id, shopID string) (*SubscriptionPlan, error) {
	return s.repo.GetPlanByID(ctx, id, shopID)
}

func (s *Service) CreatePlan(ctx context.Context, shopID string, req CreatePlanRequest) (*SubscriptionPlan, error) {
	return s.repo.CreatePlan(ctx, shopID, req)
}

func (s *Service) UpdatePlan(ctx context.Context, id, shopID string, req UpdatePlanRequest) (*SubscriptionPlan, error) {
	return s.repo.UpdatePlan(ctx, id, shopID, req)
}

func (s *Service) DeletePlan(ctx context.Context, id, shopID string) error {
	return s.repo.DeletePlan(ctx, id, shopID)
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

func (s *Service) ListSubscriptions(ctx context.Context, shopID string, filters map[string]string, limit, offset int) ([]MemberSubscription, int, error) {
	return s.repo.ListSubscriptions(ctx, shopID, filters, limit, offset)
}

func (s *Service) GetSubscriptionByID(ctx context.Context, id, shopID string) (*MemberSubscription, error) {
	return s.repo.GetSubscriptionByID(ctx, id, shopID)
}

func (s *Service) CreateSubscription(ctx context.Context, shopID, createdBy string, req CreateSubscriptionRequest) (*MemberSubscription, error) {
	return s.repo.CreateSubscription(ctx, shopID, createdBy, req)
}

func (s *Service) UpdateSubscription(ctx context.Context, id, shopID string, req UpdateSubscriptionRequest) (*MemberSubscription, error) {
	return s.repo.UpdateSubscription(ctx, id, shopID, req)
}

func (s *Service) RenewSubscription(ctx context.Context, id, shopID, createdBy string, req RenewSubscriptionRequest) (*MemberSubscription, error) {
	return s.repo.RenewSubscription(ctx, id, shopID, createdBy, req)
}

func (s *Service) GetStats(ctx context.Context, shopID string) (*SubscriptionStats, error) {
	return s.repo.GetStats(ctx, shopID)
}

func (s *Service) GetCustomerSubscriptions(ctx context.Context, customerID, shopID string) ([]MemberSubscription, error) {
	return s.repo.GetCustomerSubscriptions(ctx, customerID, shopID)
}

func (s *Service) ListPublicPlans(ctx context.Context, shopIDOrSlug string) ([]SubscriptionPlan, error) {
	return s.repo.ListPublicPlans(ctx, shopIDOrSlug)
}

func (s *Service) PublicSubscribe(ctx context.Context, shopIDOrSlug string, req PublicSubscribeRequest) (*MemberSubscription, error) {
	return s.repo.PublicSubscribe(ctx, shopIDOrSlug, req)
}

