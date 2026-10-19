package shops

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/notification"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/cache"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/mailer"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"go.uber.org/zap"
)

// Service implements the Shops domain business logic.
type Service struct {
	cfg    *config.Config
	repo   *Repository
	mailer mailer.Mailer
	notif  *notification.Service
	cache  *cache.Cache
}

// NewService creates a new shop service. notifSvc is optional — when present,
// platform admins get an in-app notification for every newly registered shop.
// c is an optional TTL cache used for the hot public listing path.
func NewService(cfg *config.Config, repo *Repository, m mailer.Mailer, notifSvc *notification.Service, c *cache.Cache) *Service {
	if m == nil {
		m = mailer.NoOpMailer{}
	}
	return &Service{cfg: cfg, repo: repo, mailer: m, notif: notifSvc, cache: c}
}

// CreateShop creates a new shop for an owner.
func (s *Service) CreateShop(ctx context.Context, ownerID string, req CreateShopRequest) (*Shop, error) {
	existing, err := s.repo.FindByOwnerID(ctx, ownerID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if s.cfg.IsProduction() {
			return nil, errors.Conflict("owner_already_has_shop", "المستخدم لديه متجر بالفعل")
		}
		// In development update the existing shop name/description only.
		updated, err := s.repo.UpdateSettings(ctx, existing.ID, map[string]any{
			"name":        req.Name,
			"description": req.Description,
		})
		if err == nil {
			s.invalidatePublicList()
		}
		return updated, err
	}

	slug, err := s.generateUniqueSlug(ctx, req.Name)
	if err != nil {
		return nil, err
	}

	activityID := strings.TrimSpace(req.ActivityID)
	layoutConfig := defaultDashboardConfig(ShopCategory(req.Category), activityID)

	// Self-serve onboarding: the signup wizard sends the layout the merchant
	// actually configured (enabledFeatures from his answers) — it wins over
	// the category defaults so "no cashier" really means no cashier.
	if len(req.LayoutConfig) > 0 {
		for k, v := range req.LayoutConfig {
			if v == nil {
				continue
			}
			layoutConfig[k] = v
		}
	}

	// Build module config for builder_config
	var builderConfig map[string]any
	if len(req.EnabledModules) > 0 || len(req.Specialties) > 0 || req.ModuleFeatures != nil {
		builderConfig = map[string]any{
			"enabledModules": req.EnabledModules,
			"specialties":    req.Specialties,
			"moduleFeatures": req.ModuleFeatures,
		}
	}

	shop := &Shop{
		Name:            req.Name,
		Slug:            slug,
		Description:     strPtr(req.Description),
		Category:        ShopCategory(req.Category),
		Activity:        strPtr(req.Activity),
		Governorate:     req.Governorate,
		City:            req.City,
		Address:         strPtr(req.Address),
		AddressDetailed: strPtr(req.AddressDetailed),
		Phone:           req.Phone,
		Email:           strPtr(req.Email),
		OpeningHours:    strPtr(req.OpeningHours),
		// Self-serve onboarding: merchants start approved on a free trial
		// instead of waiting for admin approval. Admins can still lock any
		// merchant (SUSPENDED) at any time from the admin panel.
		Status:        ShopStatusApproved,
		LayoutConfig:  layoutConfig,
		BuilderConfig: builderConfig,
		Theme:         strPtr("default"),
		OwnerID:       &ownerID,
	}

	created, err := s.repo.Create(ctx, shop)
	if err != nil {
		return nil, errors.Internal("create_shop_failed", err)
	}

	// Activate the owner account and link the shop immediately (the same
	// step the approval flow used to perform).
	if err := s.repo.SetOwnerActive(ctx, ownerID, created.ID); err != nil {
		logger.Global().Warn("failed to activate owner after signup", zap.Error(err))
	}

	// Fire-and-forget: let platform admins know a new shop joined.
	if s.notif != nil {
		notifSvc := s.notif
		shopID := created.ID
		shopName := created.Name
		go func() {
			notifCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := notifSvc.NotifyAdminsNewShop(notifCtx, shopID, shopName, ownerID); err != nil {
				logger.Global().Warn("notify admins new shop failed", zap.Error(err))
			}
		}()
	}

	logger.Global().Info("shop created", zap.String("shop_id", created.ID), zap.String("owner_id", ownerID))
	s.invalidatePublicList()
	return created, nil
}

// GetMyShop returns the shop associated with the authenticated user.
func (s *Service) GetMyShop(ctx context.Context, userID, shopID string, isDev bool) (*Shop, error) {
	if shopID != "" {
		shop, err := s.repo.FindByID(ctx, shopID)
		if err != nil {
			return nil, err
		}
		if shop != nil {
			return shop, nil
		}
	}

	// Always resolve by owner ID when available so merchants are linked to their real shop
	if userID != "" {
		shop, err := s.repo.FindMostRecentByOwner(ctx, userID)
		if err != nil {
			return nil, err
		}
		if shop != nil {
			_ = s.repo.SetOwnerActive(ctx, userID, shop.ID)
			return shop, nil
		}
	}

	if isDev {
		shop, err := s.repo.FindFirstActive(ctx)
		if err != nil {
			return nil, err
		}
		if shop != nil {
			return shop, nil
		}
	}

	return nil, nil
}

// GetShopBySlug returns a public shop by slug.
func (s *Service) GetShopBySlug(ctx context.Context, slug string) (*Shop, error) {
	shop, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if shop == nil {
		return nil, errors.NotFound("shop", slug)
	}
	if !canAccessPublicly(shop) {
		return nil, errors.NotFound("shop", slug)
	}
	return shop, nil
}

// GetShopByID returns a shop by ID regardless of public visibility.
func (s *Service) GetShopByID(ctx context.Context, id string) (*Shop, error) {
	return s.repo.FindByID(ctx, id)
}

// invalidatePublicList drops cached browse pages after a shop write. Without it
// a merchant's settings — notably layoutConfig.commerce (سلة / حجز 24 ساعة /
// موعد / تواصل) and hiding the price — would keep showing the previous decision
// for up to the 30s TTL, so the marketplace would disagree with the dashboard.
func (s *Service) invalidatePublicList() {
	if s.cache != nil {
		s.cache.DeletePrefix("shops:public:")
	}
}

// ListPublic returns public-facing shops. The browse path (no free-text search,
// which has unbounded key diversity) is served from a short TTL cache so the
// marketplace homepage and /shops page do not hit Postgres on every visit.
func (s *Service) ListPublic(ctx context.Context, req ShopListRequest) ([]Shop, error) {
	take, skip := normalizePaging(req.Take, req.Skip, 500)
	search := strings.TrimSpace(req.Search)
	if search != "" {
		return s.repo.ListPublic(ctx, take, skip, req.Category, req.Governorate, search)
	}
	key := fmt.Sprintf("shops:public:%d:%d:%s:%s", take, skip, req.Category, req.Governorate)
	return cache.GetOrLoadJSON(s.cache, key, 30*time.Second, func() ([]Shop, error) {
		return s.repo.ListPublic(ctx, take, skip, req.Category, req.Governorate, "")
	})
}

// ListByStatus returns shops filtered by status for admin.
func (s *Service) ListByStatus(ctx context.Context, req AdminShopListRequest) ([]Shop, error) {
	take, skip := normalizePaging(req.Take, req.Skip, 200)
	status := parseStatus(req.Status)
	return s.repo.ListByStatus(ctx, take, skip, status, strings.TrimSpace(req.Search))
}

// UpdateMyShop updates settings for a shop the caller owns or admin targets.
func (s *Service) UpdateMyShop(ctx context.Context, actor middleware.AuthUser, shopID string, body map[string]any) (*Shop, error) {
	if actor.Role != string(auth.RoleAdmin) {
		shopID = actor.ShopID
	}
	if shopID == "" {
		return nil, errors.NotFound("shop", "user")
	}

	fields, err := parseUpdateFields(body)
	if err != nil {
		return nil, err
	}
	if len(fields) == 0 {
		return nil, errors.Validation("no_update_data", "لا توجد بيانات للتحديث")
	}

	shop, err := s.repo.UpdateSettings(ctx, shopID, fields)
	if err != nil {
		return nil, err
	}
	s.invalidatePublicList()
	return shop, nil
}

// UpdateAdminShop allows admins to update any shop's fields directly.
func (s *Service) UpdateAdminShop(ctx context.Context, shopID string, body map[string]any) (*Shop, error) {
	if shopID == "" {
		return nil, errors.NotFound("shop", shopID)
	}

	fields, err := parseUpdateFields(body)
	if err != nil {
		return nil, err
	}
	if len(fields) == 0 {
		return nil, errors.Validation("no_update_data", "لا توجد بيانات للتحديث")
	}

	shop, err := s.repo.UpdateSettings(ctx, shopID, fields)
	if err != nil {
		return nil, err
	}
	s.invalidatePublicList()
	return shop, nil
}

// UpdateStatus changes a shop status: approving activates the owner,
// suspending locks the owner out of the platform until re-approved.
func (s *Service) UpdateStatus(ctx context.Context, shopID string, status ShopStatus) (*Shop, error) {
	shop, err := s.repo.UpdateStatus(ctx, shopID, status)
	if err != nil {
		return nil, errors.Internal("update_status_failed", err)
	}
	if shop == nil {
		return nil, errors.NotFound("shop", shopID)
	}

	if shop.OwnerID != nil {
		switch status {
		case ShopStatusApproved:
			if err := s.repo.SetOwnerActive(ctx, *shop.OwnerID, shop.ID); err != nil {
				logger.Global().Warn("failed to activate owner after approval", zap.Error(err))
			}
			if err := s.sendApprovalEmail(ctx, shop); err != nil {
				logger.Global().Warn("failed to send approval email", zap.Error(err))
			}
		case ShopStatusSuspended:
			if err := s.repo.SetOwnerInactive(ctx, *shop.OwnerID); err != nil {
				logger.Global().Warn("failed to lock owner after suspension", zap.Error(err))
			}
		}
	}

	s.invalidatePublicList()
	return shop, nil
}

// GenerateSitemap builds a simple XML sitemap.
func (s *Service) GenerateSitemap(ctx context.Context) (string, error) {
	baseURL := s.cfg.App.FrontendURL
	if baseURL == "" {
		baseURL = "https://mnmknk.com"
	}
	baseURL = strings.TrimSuffix(baseURL, "/")

	var sb strings.Builder
	sb.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	sb.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")

	static := []struct {
		loc       string
		freq      string
		priority  string
		updatedAt string
	}{
		{baseURL + "/", "daily", "1.0", ""},
		{baseURL + "/shops", "daily", "0.8", ""},
		{baseURL + "/restaurants", "daily", "0.8", ""},
		{baseURL + "/about", "monthly", "0.5", ""},
	}
	for _, u := range static {
		writeURL(&sb, u.loc, u.updatedAt, u.freq, u.priority)
	}

	shops, err := s.repo.SitemapShops(ctx)
	if err != nil {
		return "", err
	}
	for _, shop := range shops {
		writeURL(&sb, baseURL+"/shops/"+shop.Slug, shop.UpdatedAt.Format(time.RFC3339), "weekly", "0.9")
	}

	products, err := s.repo.SitemapProducts(ctx)
	if err != nil {
		return "", err
	}
	for _, p := range products {
		writeURL(&sb, baseURL+"/products/"+p.ID, p.UpdatedAt.Format(time.RFC3339), "weekly", "0.7")
	}

	sb.WriteString("</urlset>\n")
	return sb.String(), nil
}

// FindFirstActiveShop returns any active public shop.
func (s *Service) FindFirstActiveShop(ctx context.Context) (*Shop, error) {
	return s.repo.FindFirstActive(ctx)
}

func (s *Service) generateUniqueSlug(ctx context.Context, name string) (string, error) {
	slug := slugify(name)
	if slug == "" {
		slug = "shop"
	}
	candidate := slug
	counter := 1
	for {
		exists, err := s.repo.SlugExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = fmt.Sprintf("%s-%d", slug, counter)
		counter++
	}
}

func (s *Service) sendApprovalEmail(ctx context.Context, shop *Shop) error {
	to := ""
	if shop.Email != nil && *shop.Email != "" {
		to = *shop.Email
	}
	if to == "" && shop.Owner != nil {
		to = shop.Owner.Email
	}
	if to == "" {
		return nil
	}
	_, err := s.mailer.Send(ctx, mailer.Message{
		To:      to,
		Subject: "تمت الموافقة على متجرك في MNMKNK",
		Text:    fmt.Sprintf("مرحباً %s،\n\nتمت الموافقة على متجرك \"%s\". يمكنك الآن تسجيل الدخول والوصول للوحة التحكم.", shop.OwnerName(), shop.Name),
	})
	return err
}

func slugify(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	name = re.ReplaceAllString(name, "-")
	name = strings.Trim(name, "-")
	return name
}

func canAccessPublicly(shop *Shop) bool {
	return shop.IsActive && !shop.PublicDisabled && shop.Status == ShopStatusApproved
}

func parseStatus(s string) ShopStatus {
	s = strings.ToUpper(strings.TrimSpace(s))
	switch s {
	case "PENDING", "APPROVED", "REJECTED", "SUSPENDED":
		return ShopStatus(s)
	}
	return ""
}

func normalizePaging(take, skip, max int) (int, int) {
	if take <= 0 {
		take = 50
	}
	if take > max {
		take = max
	}
	if skip < 0 {
		skip = 0
	}
	return take, skip
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// OwnerName returns the owner name or an empty string.
func (s *Shop) OwnerName() string {
	if s.Owner != nil {
		return s.Owner.Name
	}
	return ""
}

func writeURL(sb *strings.Builder, loc, lastmod, changefreq, priority string) {
	sb.WriteString("  <url>\n")
	sb.WriteString(fmt.Sprintf("    <loc>%s</loc>\n", escapeXML(loc)))
	if lastmod != "" {
		sb.WriteString(fmt.Sprintf("    <lastmod>%s</lastmod>\n", lastmod))
	}
	sb.WriteString(fmt.Sprintf("    <changefreq>%s</changefreq>\n", changefreq))
	sb.WriteString(fmt.Sprintf("    <priority>%s</priority>\n", priority))
	sb.WriteString("  </url>\n")
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	s = strings.ReplaceAll(s, "'", "&apos;")
	return s
}

// IsFollowing checks if a user follows a shop
func (s *Service) IsFollowing(ctx context.Context, userID, shopID string) (bool, error) {
	return s.repo.IsFollowing(ctx, userID, shopID)
}

// FollowShop creates a follow relationship
func (s *Service) FollowShop(ctx context.Context, userID, shopID string) error {
	if err := s.repo.FollowShop(ctx, userID, shopID); err != nil {
		return err
	}
	_ = s.repo.IncrementFollowers(ctx, shopID, 1)
	return nil
}

// UnfollowShop removes a follow relationship
func (s *Service) UnfollowShop(ctx context.Context, userID, shopID string) error {
	if err := s.repo.UnfollowShop(ctx, userID, shopID); err != nil {
		return err
	}
	_ = s.repo.IncrementFollowers(ctx, shopID, -1)
	return nil
}
