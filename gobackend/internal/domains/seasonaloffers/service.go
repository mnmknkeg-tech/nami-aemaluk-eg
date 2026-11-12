package seasonaloffers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/cache"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the SeasonalOffers domain business logic.
type Service struct {
	repo  *Repository
	cache *cache.Cache
}

// NewService creates a new seasonal offers service. c is optional.
func NewService(repo *Repository, c *cache.Cache) *Service {
	return &Service{repo: repo, cache: c}
}

// ListByShop returns seasonal offers for a shop with filters.
func (s *Service) ListByShop(ctx context.Context, req ListSeasonalOffersRequest) ([]SeasonalOfferResponse, error) {
	limit, offset := normalizePaging(req.Page, req.Limit)
	offers, err := s.repo.ListByShop(ctx, req.ShopID, req.Status, req.Occasion, limit, offset)
	if err != nil {
		return nil, err
	}
	return shapeOffers(offers), nil
}

// ListPublic returns active seasonal offers for the marketplace.
func (s *Service) ListPublic(ctx context.Context, page, limit int) ([]SeasonalOfferResponse, error) {
	limit, offset := normalizePaging(page, limit)
	key := fmt.Sprintf("seasonal:public:%d:%d", limit, offset)
	return cache.GetOrLoadJSON(s.cache, key, 30*time.Second, func() ([]SeasonalOfferResponse, error) {
		offers, err := s.repo.ListPublic(ctx, limit, offset)
		if err != nil {
			return nil, err
		}
		return shapeOffers(offers), nil
	})
}

// GetByID returns a single seasonal offer.
func (s *Service) GetByID(ctx context.Context, id string) (*SeasonalOfferResponse, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	o, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o == nil {
		return nil, errors.NotFound("seasonal_offer", id)
	}
	resp := shapeOffer(*o)
	return &resp, nil
}

// Create creates a new seasonal offer.
func (s *Service) Create(ctx context.Context, req CreateSeasonalOfferRequest, actorRole, actorShopID string) (*SeasonalOfferResponse, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.Validation("name_required", "name مطلوب")
	}

	discountType := "percentage"
	if req.DiscountType != "" {
		discountType = strings.ToLower(req.DiscountType)
	}
	if discountType != "percentage" && discountType != "fixed" {
		return nil, errors.Validation("invalid_discount_type", "discountType غير صحيح")
	}

	if req.DiscountValue < 0 {
		return nil, errors.Validation("invalid_discount_value", "discountValue غير صحيح")
	}
	if discountType == "percentage" && req.DiscountValue > 100 {
		return nil, errors.Validation("invalid_discount_value", "discountValue يجب أن يكون بين 0 و 100")
	}

	occasion := strings.TrimSpace(req.Occasion)
	if occasion == "" {
		occasion = "general"
	}

	now := time.Now()
	startDate := now
	if req.StartDate != nil && !req.StartDate.IsZero() {
		startDate = *req.StartDate
	}
	endDate := now.AddDate(0, 0, 7)
	if req.EndDate != nil && !req.EndDate.IsZero() {
		endDate = *req.EndDate
	}
	if endDate.Before(startDate) {
		return nil, errors.Validation("invalid_dates", "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية")
	}

	bannerColor := "#1A1A1A"
	if req.BannerColor != "" {
		bannerColor = req.BannerColor
	}

	status := "scheduled"
	if now.After(endDate) {
		status = "ended"
	} else if (now.Equal(startDate) || now.After(startDate)) && now.Before(endDate) {
		status = "active"
	}

	categories := req.Categories
	if categories == nil {
		categories = []string{}
	}

	o := &SeasonalOffer{
		ShopID:        shopID,
		Name:          name,
		Description:   req.Description,
		Occasion:      occasion,
		DiscountType:  discountType,
		DiscountValue: req.DiscountValue,
		Categories:    categories,
		StartDate:     startDate,
		EndDate:       endDate,
		BannerColor:   bannerColor,
		Status:        status,
	}

	created, err := s.repo.Create(ctx, o)
	if err != nil {
		return nil, err
	}
	s.cache.DeletePrefix("seasonal:public:")
	resp := shapeOffer(*created)
	return &resp, nil
}

// Update updates a seasonal offer.
func (s *Service) Update(ctx context.Context, id string, req UpdateSeasonalOfferRequest, actorRole, actorShopID string) (*SeasonalOfferResponse, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.NotFound("seasonal_offer", id)
	}
	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	updated, err := s.repo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.NotFound("seasonal_offer", id)
	}
	s.cache.DeletePrefix("seasonal:public:")
	resp := shapeOffer(*updated)
	return &resp, nil
}

// Delete deactivates a seasonal offer.
func (s *Service) Delete(ctx context.Context, id, actorRole, actorShopID string) error {
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.NotFound("seasonal_offer", id)
	}
	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	s.cache.DeletePrefix("seasonal:public:")
	return s.repo.Delete(ctx, id)
}

func normalizePaging(page, limit int) (int, int) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit
	return limit, offset
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func shapeOffers(offers []SeasonalOffer) []SeasonalOfferResponse {
	out := make([]SeasonalOfferResponse, len(offers))
	for i, o := range offers {
		out[i] = shapeOffer(o)
	}
	return out
}

func shapeOffer(o SeasonalOffer) SeasonalOfferResponse {
	shopName := ""
	if o.ShopName != nil {
		shopName = *o.ShopName
	}
	shopSlug := ""
	if o.ShopSlug != nil {
		shopSlug = *o.ShopSlug
	}
	description := ""
	if o.Description != nil {
		description = *o.Description
	}
	categories := o.Categories
	if categories == nil {
		categories = []string{}
	}
	return SeasonalOfferResponse{
		ID:            o.ID,
		ShopID:        o.ShopID,
		ShopName:      shopName,
		ShopSlug:      shopSlug,
		Name:          o.Name,
		Description:   description,
		Occasion:      o.Occasion,
		DiscountType:  o.DiscountType,
		DiscountValue: o.DiscountValue,
		Categories:    categories,
		StartDate:     o.StartDate.UTC().Format(time.RFC3339),
		EndDate:       o.EndDate.UTC().Format(time.RFC3339),
		BannerColor:   o.BannerColor,
		Status:        o.Status,
	}
}
