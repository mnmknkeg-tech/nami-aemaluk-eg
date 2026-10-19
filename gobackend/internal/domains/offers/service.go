package offers

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/cache"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the Offers domain business logic.
type Service struct {
	repo  *Repository
	cache *cache.Cache
}

// NewService creates a new offers service. c is optional (nil disables caching).
func NewService(repo *Repository, c *cache.Cache) *Service {
	return &Service{repo: repo, cache: c}
}

// ListActive returns active non-expired offers.
func (s *Service) ListActive(ctx context.Context, req ListOffersRequest) ([]OfferResponse, error) {
	limit, offset := normalizeOfferPaging(req.Page, req.Limit)
	cat := normalizeCategory(req.ShopCategory)
	// Homepage / public browsing path: cache it. Per-shop or per-product
	// queries stay uncached (long-tail keys, low traffic).
	if req.ShopID == "" && req.ProductID == "" {
		key := fmt.Sprintf("offers:public:%s:%d:%d", cat, limit, offset)
		return cache.GetOrLoadJSON(s.cache, key, 30*time.Second, func() ([]OfferResponse, error) {
			offers, err := s.repo.ListActive(ctx, req.ShopID, cat, req.ProductID, limit, offset)
			if err != nil {
				return nil, err
			}
			return shapeOffers(offers), nil
		})
	}
	offers, err := s.repo.ListActive(ctx, req.ShopID, cat, req.ProductID, limit, offset)
	if err != nil {
		return nil, err
	}
	return shapeOffers(offers), nil
}

// GetActiveByID returns a single active offer.
func (s *Service) GetActiveByID(ctx context.Context, id string) (*OfferResponse, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	o, err := s.repo.FindActiveByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o == nil {
		return nil, errors.NotFound("offer", id)
	}
	resp := shapeOffer(*o)
	return &resp, nil
}

// Create creates one or more offers for products in a shop.
func (s *Service) Create(ctx context.Context, req CreateOfferRequest, actorRole, actorShopID string) ([]Offer, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, errors.Validation("title_required", "title مطلوب")
	}

	expiresAt := time.Now().AddDate(0, 0, 7)
	if req.ExpiresAt != nil {
		if t := *req.ExpiresAt; !t.IsZero() {
			expiresAt = t
		}
	}

	// Collect product IDs.
	productIDs := []string{}
	if req.ProductID != nil && *req.ProductID != "" {
		productIDs = append(productIDs, strings.TrimSpace(*req.ProductID))
	}
	for _, id := range req.ProductIDs {
		if id := strings.TrimSpace(id); id != "" {
			productIDs = append(productIDs, id)
		}
	}
	uniqueIDs := unique(productIDs)

	// No products: legacy shop-level offer.
	if len(uniqueIDs) == 0 {
		discount := 0.0
		if req.Discount != nil {
			discount = *req.Discount
		}
		if discount < 0 || discount > 100 {
			return nil, errors.Validation("invalid_discount", "discount غير صحيح")
		}
		oldPrice := 0.0
		if req.OldPrice != nil {
			oldPrice = *req.OldPrice
		}
		if oldPrice < 0 {
			return nil, errors.Validation("invalid_old_price", "oldPrice غير صحيح")
		}
		newPrice := 0.0
		if req.NewPrice != nil {
			newPrice = *req.NewPrice
		}
		if newPrice < 0 || newPrice > oldPrice {
			return nil, errors.Validation("invalid_new_price", "newPrice غير صحيح")
		}

		o := &Offer{
			ShopID:      shopID,
			Title:       title,
			Description: req.Description,
			Discount:    discount,
			OldPrice:    oldPrice,
			NewPrice:    newPrice,
			ImageURL:    req.ImageURL,
			ExpiresAt:   expiresAt,
		}
		created, err := s.repo.Create(ctx, o)
		if err != nil {
			return nil, err
		}
		return []Offer{*created}, nil
	}

	products, err := s.repo.GetProductsForShop(ctx, shopID, uniqueIDs)
	if err != nil {
		return nil, err
	}
	if len(products) != len(uniqueIDs) {
		return nil, errors.Validation("invalid_products", "بعض المنتجات غير صالحة لهذا المتجر")
	}

	mode := "PERCENT"
	if req.PricingMode != nil {
		mode = strings.ToUpper(*req.PricingMode)
	}

	var createdOffers []Offer
	for _, p := range products {
		oldPrice := p.Price
		var newPrice float64

		switch mode {
		case "AMOUNT":
			if req.PricingValue == nil {
				return nil, errors.Validation("pricing_value_required", "pricingValue مطلوب")
			}
			newPrice = oldPrice - *req.PricingValue
		case "NEW_PRICE":
			if req.NewPrice != nil {
				newPrice = *req.NewPrice
			} else if req.PricingValue != nil {
				newPrice = *req.PricingValue
			} else {
				return nil, errors.Validation("new_price_required", "newPrice مطلوب")
			}
		default: // PERCENT
			value := 0.0
			if req.Discount != nil {
				value = *req.Discount
			} else if req.PricingValue != nil {
				value = *req.PricingValue
			}
			if value < 0 || value > 100 {
				return nil, errors.Validation("invalid_discount", "discount غير صحيح")
			}
			newPrice = oldPrice * (1 - value/100)
		}

		newPrice = math.Round(newPrice*100) / 100
		if newPrice < 0 || newPrice > oldPrice {
			return nil, errors.Validation("invalid_new_price", "newPrice غير صحيح")
		}
		discount := computeDiscountPercent(oldPrice, newPrice)

		offerTitle := title
		if len(products) > 1 {
			offerTitle = fmt.Sprintf("%s - %s", title, p.Name)
		}

		o := &Offer{
			ShopID:         shopID,
			ProductID:      &p.ID,
			Title:          offerTitle,
			Description:    req.Description,
			Discount:       discount,
			OldPrice:       oldPrice,
			NewPrice:       newPrice,
			ImageURL:       req.ImageURL,
			ExpiresAt:      expiresAt,
			VariantPricing: req.VariantPricing,
		}
		created, err := s.repo.Create(ctx, o)
		if err != nil {
			return nil, err
		}
		createdOffers = append(createdOffers, *created)
	}

	s.cache.DeletePrefix("offers:public:")
	return createdOffers, nil
}

// Deactivate disables an offer.
func (s *Service) Deactivate(ctx context.Context, id, actorRole, actorShopID string) (*Offer, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	o, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if o == nil {
		return nil, errors.NotFound("offer", id)
	}
	if !isAdmin(actorRole) && actorShopID != o.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	s.cache.DeletePrefix("offers:public:")
	return s.repo.Deactivate(ctx, id)
}

func normalizeOfferPaging(page, limit int) (int, int) {
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

func normalizeCategory(s string) string {
	allowed := map[string]bool{
		"RETAIL": true, "RESTAURANT": true, "SERVICE": true,
		"ELECTRONICS": true, "FASHION": true, "FOOD": true, "HEALTH": true, "OTHER": true,
	}
	s = strings.ToUpper(strings.TrimSpace(s))
	if allowed[s] {
		return s
	}
	return ""
}

func computeDiscountPercent(oldPrice, newPrice float64) float64 {
	if oldPrice <= 0 {
		return 0
	}
	pct := (1 - newPrice/oldPrice) * 100
	return math.Min(100, math.Max(0, math.Round(pct*100)/100))
}

func unique(ids []string) []string {
	seen := make(map[string]bool)
	var out []string
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func shapeOffers(offers []Offer) []OfferResponse {
	out := make([]OfferResponse, len(offers))
	for i, o := range offers {
		out[i] = shapeOffer(o)
	}
	return out
}

func shapeOffer(o Offer) OfferResponse {
	shopName := ""
	if o.ShopName != nil {
		shopName = *o.ShopName
	}
	shopLogo := ""
	if o.ShopLogo != nil {
		shopLogo = *o.ShopLogo
	}
	shopSlug := ""
	if o.ShopSlug != nil {
		shopSlug = *o.ShopSlug
	}
	category := "RETAIL"
	if o.ShopCategory != nil {
		category = *o.ShopCategory
	}
	imageURL := ""
	if o.ImageURL != nil {
		imageURL = *o.ImageURL
	}
	return OfferResponse{
		ID:             o.ID,
		ShopID:         o.ShopID,
		ProductID:      o.ProductID,
		ShopName:       shopName,
		ShopLogo:       shopLogo,
		ShopSlug:       shopSlug,
		Title:          o.Title,
		Description:    strOrEmpty(o.Description),
		Discount:       o.Discount,
		OldPrice:       o.OldPrice,
		NewPrice:       o.NewPrice,
		VariantPricing: o.VariantPricing,
		ImageURL:       imageURL,
		Category:       category,
		ExpiresIn:      o.ExpiresAt.UTC().Format(time.RFC3339),
		CreatedAt:      o.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
