package cartevent

import (
	"context"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the CartEvent domain business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new cart event service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

var validEvents = []string{"add_to_cart", "checkout_started", "payment_completed", "abandoned"}
var validPublicEvents = []string{"add_to_cart", "checkout_started"}

// Track records a cart event.
func (s *Service) Track(ctx context.Context, req TrackRequest, userID *string) (*CartEventResponse, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	productID := strings.TrimSpace(req.ProductID)
	if productID == "" {
		return nil, errors.Validation("productId_required", "productId مطلوب")
	}
	event := strings.ToLower(strings.TrimSpace(req.Event))
	if !contains(validEvents, event) {
		return nil, errors.Validation("invalid_event", "event يجب أن يكون أحد: "+strings.Join(validEvents, ", "))
	}

	quantity := req.Quantity
	if quantity < 1 {
		quantity = 1
	}
	currency := req.Currency
	if currency == "" {
		currency = "EGP"
	}

	e := &CartEvent{
		ShopID:    shopID,
		ProductID: productID,
		Event:     event,
		Quantity:  quantity,
		UnitPrice: req.UnitPrice,
		Currency:  currency,
	}

	if userID != nil && *userID != "" {
		e.UserID = userID
	}
	if req.SessionID != "" {
		e.SessionID = &req.SessionID
	}
	if req.CustomerName != "" {
		e.CustomerName = &req.CustomerName
	}
	if req.CustomerEmail != "" {
		e.CustomerEmail = &req.CustomerEmail
	}
	if req.CustomerPhone != "" {
		e.CustomerPhone = &req.CustomerPhone
	}

	created, err := s.repo.Track(ctx, e)
	if err != nil {
		return nil, err
	}
	resp := shapeEvent(*created)
	return &resp, nil
}

// TrackPublic records a public cart event (limited events).
func (s *Service) TrackPublic(ctx context.Context, req TrackRequest) (*CartEventResponse, error) {
	event := strings.ToLower(strings.TrimSpace(req.Event))
	if !contains(validPublicEvents, event) {
		return nil, errors.Validation("invalid_event", "event يجب أن يكون أحد: "+strings.Join(validPublicEvents, ", "))
	}
	return s.Track(ctx, req, nil)
}

// ListAbandoned returns abandoned cart events for a shop.
func (s *Service) ListAbandoned(ctx context.Context, shopID string, from, to *time.Time, page, limit int, actorRole, actorShopID string) (*ListAbandonedResponse, error) {
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	l, o := normalizePaging(page, limit)
	events, total, err := s.repo.ListAbandoned(ctx, shopID, from, to, l, o)
	if err != nil {
		return nil, err
	}
	return &ListAbandonedResponse{
		Items: shapeEvents(events),
		Total: total,
		Page:  page,
		Limit: l,
	}, nil
}

// GetStats returns cart event statistics.
func (s *Service) GetStats(ctx context.Context, shopID string, from, to *time.Time, actorRole, actorShopID string) (*CartStatsResponse, error) {
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	return s.repo.GetStats(ctx, shopID, from, to)
}

// MarkRecovered marks a cart event as recovered.
func (s *Service) MarkRecovered(ctx context.Context, id, actorRole, actorShopID string) (*CartEventResponse, error) {
	event, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if event == nil {
		return nil, errors.NotFound("cart_event", id)
	}
	if !isAdmin(actorRole) && actorShopID != event.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	updated, err := s.repo.MarkRecovered(ctx, id)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.NotFound("cart_event", id)
	}
	resp := shapeEvent(*updated)
	return &resp, nil
}

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func normalizePaging(page, limit int) (int, int) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	return limit, (page - 1) * limit
}

func shapeEvents(events []CartEvent) []CartEventResponse {
	out := make([]CartEventResponse, len(events))
	for i, e := range events {
		out[i] = shapeEvent(e)
	}
	return out
}

func shapeEvent(e CartEvent) CartEventResponse {
	resp := CartEventResponse{
		ID:          e.ID,
		ShopID:      e.ShopID,
		ProductID:   e.ProductID,
		Event:       e.Event,
		Quantity:    e.Quantity,
		UnitPrice:   e.UnitPrice,
		Currency:    e.Currency,
		IsRecovered: e.IsRecovered,
		RecoveredAt: e.RecoveredAt,
		CreatedAt:   e.CreatedAt,
	}
	if e.UserID != nil {
		resp.UserID = *e.UserID
	}
	if e.SessionID != nil {
		resp.SessionID = *e.SessionID
	}
	if e.CustomerName != nil {
		resp.CustomerName = *e.CustomerName
	}
	if e.CustomerEmail != nil {
		resp.CustomerEmail = *e.CustomerEmail
	}
	if e.CustomerPhone != nil {
		resp.CustomerPhone = *e.CustomerPhone
	}
	return resp
}
