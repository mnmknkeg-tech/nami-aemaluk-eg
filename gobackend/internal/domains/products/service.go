package products

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/cache"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/pagination"
)

// Service implements the Products domain business logic.
type Service struct {
	repo        *Repository
	compression *compression.Service
	cache       *cache.Cache
}

// NewService creates a new products service. c is optional (nil disables caching).
func NewService(repo *Repository, compressionSvc *compression.Service, c *cache.Cache) *Service {
	return &Service{repo: repo, compression: compressionSvc, cache: c}
}

// invalidatePublicList drops cached public catalog pages after a write.
func (s *Service) invalidatePublicList() {
	s.cache.DeletePrefix("products:public:")
}

// GetByID returns a public product by ID. The detail page is shared between
// the two surfaces, so a product is fetchable as long as it is shown on at
// least one of them (الموقع أو التطبيق) — fully hidden ones 404.
func (s *Service) GetByID(ctx context.Context, id, shopID string) (*Product, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	p, err := s.repo.FindByID(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if p == nil || (!p.IsActive && !p.AppActive) {
		return nil, errors.NotFound("product", id)
	}
	if isHiddenCategory(p.Category) {
		return nil, errors.NotFound("product", id)
	}
	return p, nil
}

// ListByShop lists products visible on the requested surface for a public shop.
func (s *Service) ListByShop(ctx context.Context, req ProductListRequest) ([]Product, pagination.Meta, error) {
	shopID := strings.TrimSpace(req.ShopID)
	if shopID == "" {
		return nil, pagination.Meta{}, errors.Validation("shopId_required", "shopId مطلوب")
	}
	_, limit, offset := normalizePaging(req.Page, req.Limit)
	req.Filter.Sort = normalizeSort(req.Filter.Sort)
	total, err := s.repo.CountByShop(ctx, shopID, req.Surface, req.Filter)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	products, err := s.repo.ListByShop(ctx, shopID, req.Surface, limit, offset, req.Filter)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return products, pagination.NewMeta(total, req.Page, limit), nil
}

// productListResult bundles a catalog page for TTL caching.
type productListResult struct {
	Products []Product       `json:"products"`
	Meta     pagination.Meta `json:"meta"`
}

// ListAllActive lists products visible on the requested surface. Cached
// briefly: the public catalog is read-heavy and stale-for-15s is acceptable;
// writes invalidate.
func (s *Service) ListAllActive(ctx context.Context, req ProductListRequest) ([]Product, pagination.Meta, error) {
	_, limit, offset := normalizePaging(req.Page, req.Limit)
	req.Filter.Sort = normalizeSort(req.Filter.Sort)
	key := fmt.Sprintf("products:public:%s:%d:%d:%s:%s:%s:%s:%v:%v:%v", req.Surface, limit, offset,
		req.Filter.Search, req.Filter.Category, req.Filter.ShopActivity, req.Filter.Sort,
		req.Filter.MinPrice, req.Filter.MaxPrice, req.Filter.IncludeImageMap)
	res, err := cache.GetOrLoadJSON(s.cache, key, 15*time.Second, func() (productListResult, error) {
		total, err := s.repo.CountAllActive(ctx, req.Surface, req.Filter)
		if err != nil {
			return productListResult{}, err
		}
		products, err := s.repo.ListAllActive(ctx, req.Surface, limit, offset, req.Filter)
		if err != nil {
			return productListResult{}, err
		}
		return productListResult{Products: products, Meta: pagination.NewMeta(total, req.Page, limit)}, nil
	})
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return res.Products, res.Meta, nil
}

// ListByShopForManage lists products for a merchant/admin dashboard.
func (s *Service) ListByShopForManage(ctx context.Context, shopID string, actorShopID, actorRole string, req ManageProductListRequest) ([]Product, pagination.Meta, error) {
	shopID = strings.TrimSpace(shopID)
	if shopID == "" {
		return nil, pagination.Meta{}, errors.Validation("shopId_required", "shopId مطلوب")
	}
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, pagination.Meta{}, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	_, limit, offset := normalizePaging(req.Page, req.Limit)
	req.Filter.Sort = normalizeSort(req.Filter.Sort)
	total, err := s.repo.CountByShopForManage(ctx, shopID, req.IncludeImageMap, req.Filter)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	products, err := s.repo.ListByShopForManage(ctx, shopID, limit, offset, req.IncludeImageMap, req.Filter)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	return products, pagination.NewMeta(total, req.Page, limit), nil
}

// Create creates a product for the authenticated merchant's shop.
func (s *Service) Create(ctx context.Context, req CreateProductRequest, shopID, actorShopID, actorRole string) (*Product, error) {
	if !isAdmin(actorRole) && actorShopID != shopID {
		return nil, errors.Forbidden("insufficient_role", "ليس لديك صلاحية لإضافة منتجات لهذا المتجر")
	}
	if shopID == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}

	exists, err := s.repo.ShopExists(ctx, shopID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.NotFound("shop", shopID)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.Validation("name_required", "اسم المنتج مطلوب")
	}

	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "عام"
	}

	shopCategory, err := s.repo.GetShopCategory(ctx, shopID)
	if err != nil {
		return nil, err
	}
	trackStock := req.TrackStock == nil || *req.TrackStock
	if strings.EqualFold(shopCategory, "RESTAURANT") {
		trackStock = false
	}

	p := &Product{
		Name:          name,
		Description:   req.Description,
		Price:         req.Price,
		Stock:         req.Stock,
		Category:      category,
		Unit:          req.Unit,
		ImageURL:      req.ImageURL,
		TrackStock:    trackStock,
		IsActive:      true,
		AppActive:     req.AppActive == nil || *req.AppActive,
		ShopID:        shopID,
		Images:        req.Images,
		Colors:        req.Colors,
		Sizes:         req.Sizes,
		Addons:        req.Addons,
		MenuVariants:  req.MenuVariants,
		ExtraData:     req.ExtraData,
		PackOptions:   req.PackOptions,
		Model3DURL:    req.Model3DURL,
		SpinImages:    req.SpinImages,
		FurnitureMeta: req.FurnitureMeta,
	}

	s.invalidatePublicList()
	return s.repo.Create(ctx, p)
}

// Update updates a product for the authenticated merchant's shop.
func (s *Service) Update(ctx context.Context, id string, req UpdateProductRequest, actorShopID, actorRole string) (*Product, error) {
	if id == "" {
		return nil, errors.Validation("id_required", "id مطلوب")
	}
	existing, err := s.repo.FindByID(ctx, id, actorShopID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.NotFound("product", id)
	}
	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return nil, errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}

	fields := make(map[string]any)
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, errors.Validation("name_required", "اسم المنتج مطلوب")
		}
		fields["name"] = name
	}
	if req.Price != nil {
		if *req.Price < 0 {
			return nil, errors.Validation("price_invalid", "السعر غير صالح")
		}
		fields["price"] = *req.Price
	}
	if req.Stock != nil {
		if *req.Stock < 0 {
			return nil, errors.Validation("stock_invalid", "المخزون غير صالح")
		}
		fields["stock"] = *req.Stock
	}
	if req.Category != nil {
		fields["category"] = strings.TrimSpace(*req.Category)
	}
	if req.Unit != nil {
		fields["unit"] = nullIfEmpty(*req.Unit)
	}
	if req.ExtraData != nil {
		fields["extra_data"] = req.ExtraData
	}
	if req.ImageURL != nil {
		if err := assertImageOnly(*req.ImageURL); err != nil {
			return nil, err
		}
		fields["image_url"] = nullIfEmpty(*req.ImageURL)
	}
	if req.Description != nil {
		fields["description"] = nullIfEmpty(*req.Description)
	}
	if req.TrackStock != nil {
		fields["track_stock"] = *req.TrackStock
	}
	if req.Images != nil {
		for _, img := range req.Images {
			if url, ok := img.(string); ok {
				if err := assertImageOnly(url); err != nil {
					return nil, err
				}
			}
		}
		fields["images"] = req.Images
	}
	if req.Colors != nil {
		fields["colors"] = req.Colors
	}
	if req.Sizes != nil {
		fields["sizes"] = req.Sizes
	}
	if req.Addons != nil {
		fields["addons"] = req.Addons
	}
	if req.MenuVariants != nil {
		fields["menu_variants"] = req.MenuVariants
	}
	if req.PackOptions != nil {
		fields["pack_options"] = req.PackOptions
	}
	if req.Model3DURL != nil {
		fields["model_3d_url"] = nullIfEmpty(*req.Model3DURL)
	}
	if req.SpinImages != nil {
		fields["spin_images"] = req.SpinImages
	}
	if req.IsActive != nil {
		fields["is_active"] = *req.IsActive
	}
	if req.AppActive != nil {
		fields["app_active"] = *req.AppActive
	}

	var furnitureMeta *FurnitureMeta
	if req.FurnitureMeta != nil {
		if err := validateFurnitureMeta(req.FurnitureMeta); err != nil {
			return nil, err
		}
		furnitureMeta = req.FurnitureMeta
	}

	s.invalidatePublicList()
	return s.repo.Update(ctx, id, actorShopID, fields, furnitureMeta)
}

// Delete removes a product.
func (s *Service) Delete(ctx context.Context, id, actorShopID, actorRole string) error {
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}
	existing, err := s.repo.FindByID(ctx, id, actorShopID)
	if err != nil {
		return err
	}
	if existing == nil {
		return errors.NotFound("product", id)
	}
	if !isAdmin(actorRole) && actorShopID != existing.ShopID {
		return errors.Forbidden("insufficient_role", "صلاحيات غير كافية")
	}
	s.invalidatePublicList()
	return s.repo.Delete(ctx, id, actorShopID)
}

func normalizePaging(page, limit int) (normalizedPage, normalizedLimit, offset int) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if page < 1 {
		page = 1
	}
	offset = (page - 1) * limit
	return page, limit, offset
}

func normalizeSort(sort string) string {
	switch sort {
	case "price_asc", "price_desc", "name", "oldest":
		return sort
	default:
		return "newest"
	}
}

func isAdmin(role string) bool {
	return strings.EqualFold(role, "ADMIN")
}

func isHiddenCategory(category string) bool {
	c := strings.ToUpper(strings.TrimSpace(category))
	return c == "__IMAGE_MAP__" || c == "__DUPLICATE__AUTO__" || strings.Contains(c, "IMAGE_MAP")
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func assertImageOnly(url string) error {
	lower := strings.ToLower(strings.TrimSpace(url))
	if lower == "" {
		return nil
	}
	// Strip query/hash for extension check.
	noQuery := strings.SplitN(strings.SplitN(lower, "?", 2)[0], "#", 2)[0]
	re := regexp.MustCompile(`\.(mp4|webm|mov|m4v|avi|mkv)$`)
	if re.MatchString(noQuery) {
		return errors.Validation("video_not_allowed", "المنتجات لا تدعم الفيديو. يرجى رفع صور فقط")
	}
	return nil
}

func validateFurnitureMeta(fm *FurnitureMeta) error {
	if fm.LengthCm != nil && *fm.LengthCm <= 0 {
		return errors.Validation("invalid_length", "طول الأثاث غير صالح")
	}
	if fm.WidthCm != nil && *fm.WidthCm <= 0 {
		return errors.Validation("invalid_width", "عرض الأثاث غير صالح")
	}
	if fm.HeightCm != nil && *fm.HeightCm <= 0 {
		return errors.Validation("invalid_height", "ارتفاع الأثاث غير صالح")
	}
	return nil
}
