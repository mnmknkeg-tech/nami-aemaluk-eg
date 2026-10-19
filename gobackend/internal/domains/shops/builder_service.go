package shops

import (
	"context"
	"encoding/json"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"
)

// BuilderService handles builder configuration operations.
type BuilderService struct {
	repo   *Repository
	logger *zap.Logger
}

// NewBuilderService creates a new builder service.
func NewBuilderService(repo *Repository, log *zap.Logger) *BuilderService {
	return &BuilderService{
		repo:   repo,
		logger: log,
	}
}

// GetBuilderConfig retrieves the builder configuration for a shop.
func (s *BuilderService) GetBuilderConfig(ctx context.Context, shopID string) (*BuilderConfig, error) {
	var configJSON []byte
	var updatedAt time.Time

	err := s.repo.pool.QueryRow(ctx, `
		SELECT builder_config, updated_at
		FROM shops
		WHERE id = $1
	`, shopID).Scan(&configJSON, &updatedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("shop_not_found", "المتجر غير موجود")
		}
		s.logger.Error("Failed to get builder config", zap.Error(err), zap.String("shopId", shopID))
		return nil, err
	}

	var config BuilderConfig
	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &config); err != nil {
			s.logger.Error("Failed to unmarshal builder config", zap.Error(err))
			return nil, errors.Internal("invalid_config", err)
		}
	} else {
		// Return default config if none exists
		config = s.getDefaultConfig()
	}

	config.UpdatedAt = updatedAt
	return &config, nil
}

// UpdateBuilderConfig updates the builder configuration for a shop.
func (s *BuilderService) UpdateBuilderConfig(ctx context.Context, shopID string, config *BuilderConfig) (*BuilderConfig, error) {
	// Validate shop exists
	var exists bool
	err := s.repo.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM shops WHERE id = $1)", shopID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.NotFound("shop_not_found", "المتجر غير موجود")
	}

	// Serialize config to JSON
	configJSON, err := json.Marshal(config)
	if err != nil {
		s.logger.Error("Failed to marshal builder config", zap.Error(err))
		return nil, errors.Internal("invalid_config", err)
	}

	// Structural sanity check on the website tree (if the builder sent one).
	if err := validateWebsiteTree(config.Website); err != nil {
		return nil, err
	}

	// Update in database
	var updatedAt time.Time
	err = s.repo.pool.QueryRow(ctx, `
		UPDATE shops
		SET builder_config = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, configJSON, shopID).Scan(&updatedAt)

	if err != nil {
		s.logger.Error("Failed to update builder config", zap.Error(err), zap.String("shopId", shopID))
		return nil, err
	}

	config.UpdatedAt = updatedAt
	s.logger.Info("Builder config updated", zap.String("shopId", shopID))
	return config, nil
}

// PublishBuilderConfig publishes the builder configuration by snapshotting the
// current draft (builder_config) into builder_published_config. Visitors are
// always served the published snapshot, so later draft edits stay private
// until the next publish.
func (s *BuilderService) PublishBuilderConfig(ctx context.Context, shopID string) error {
	// Validate shop exists and has config
	var exists bool
	err := s.repo.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM shops WHERE id = $1 AND builder_config IS NOT NULL)",
		shopID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.NotFound("config_not_found", "التكوين غير موجود")
	}

	tag, err := s.repo.pool.Exec(ctx, `
		UPDATE shops
		SET builder_published_config = builder_config,
		    builder_published_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1 AND builder_config IS NOT NULL
	`, shopID)
	if err != nil {
		s.logger.Error("Failed to publish builder config", zap.Error(err), zap.String("shopId", shopID))
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.NotFound("config_not_found", "التكوين غير موجود")
	}

	s.logger.Info("Builder config published", zap.String("shopId", shopID))
	return nil
}

// validateWebsiteTree performs a lenient structural check on the website tree
// sent by the builder: when present, it must contain pages and components and
// every page must point at an existing root component.
func validateWebsiteTree(website map[string]any) error {
	if website == nil {
		return nil
	}
	rawPages, hasPages := website["pages"]
	rawComponents, hasComponents := website["components"]
	if !hasPages && !hasComponents {
		return nil // legacy/empty payloads are allowed through
	}
	if hasComponents {
		if _, ok := rawComponents.(map[string]any); !ok {
			return errors.Validation("invalid_website_tree", "components يجب أن يكون كائناً")
		}
	}
	if hasPages {
		pages, ok := rawPages.([]any)
		if !ok {
			return errors.Validation("invalid_website_tree", "pages يجب أن تكون مصفوفة")
		}
		components, _ := rawComponents.(map[string]any)
		for _, rp := range pages {
			page, ok := rp.(map[string]any)
			if !ok {
				return errors.Validation("invalid_website_tree", "كل صفحة يجب أن تكون كائناً")
			}
			rootID, _ := page["rootNodeId"].(string)
			if rootID == "" {
				return errors.Validation("invalid_website_tree", "كل صفحة تحتاج rootNodeId")
			}
			if len(components) > 0 {
				if _, exists := components[rootID]; !exists {
					return errors.Validation("invalid_website_tree", "rootNodeId غير موجود في components: "+rootID)
				}
			}
		}
	}
	return nil
}

// ListPublishedSlugs returns the slugs of approved shops whose website has
// been published. Exposed publicly for sitemap generation only.
func (s *BuilderService) ListPublishedSlugs(ctx context.Context) ([]string, error) {
	rows, err := s.repo.pool.Query(ctx, `
		SELECT slug FROM shops
		WHERE status = 'APPROVED' AND builder_published_at IS NOT NULL
		ORDER BY builder_published_at DESC
		LIMIT 5000
	`)
	if err != nil {
		s.logger.Error("Failed to list published slugs", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	slugs := []string{}
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return nil, err
		}
		slugs = append(slugs, slug)
	}
	return slugs, rows.Err()
}

// PublicWebsite is the public payload served to visitors of a published site.
type PublicWebsite struct {
	Published   bool           `json:"published"`
	PublishedAt *time.Time     `json:"publishedAt,omitempty"`
	Shop        PublicShopInfo `json:"shop"`
	Config      *BuilderConfig `json:"config"`
}

// PublicShopInfo is the minimal shop info exposed publicly.
type PublicShopInfo struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Slug     string  `json:"slug"`
	LogoURL  *string `json:"logoUrl,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	Address  *string `json:"address,omitempty"`
}

// GetPublicWebsiteBySlug returns the published website config for a shop by
// its slug. This is the endpoint the public storefront renders from.
func (s *BuilderService) GetPublicWebsiteBySlug(ctx context.Context, slug string) (*PublicWebsite, error) {
	var (
		shopID      string
		shopName    string
		logoURL     *string
		phone       *string
		address     *string
		configJSON  []byte
		publishedAt *time.Time
	)

	err := s.repo.pool.QueryRow(ctx, `
		SELECT id, name, logo_url, phone, address,
		       COALESCE(builder_published_config, builder_config) AS public_config,
		       builder_published_at
		FROM shops
		WHERE slug = $1 AND status = 'APPROVED'
	`, slug).Scan(&shopID, &shopName, &logoURL, &phone, &address, &configJSON, &publishedAt)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("shop_not_found", "المتجر غير موجود")
		}
		s.logger.Error("Failed to get public website", zap.Error(err), zap.String("slug", slug))
		return nil, err
	}

	var config BuilderConfig
	if len(configJSON) > 0 {
		if err := json.Unmarshal(configJSON, &config); err != nil {
			s.logger.Error("Failed to unmarshal builder config", zap.Error(err))
			return nil, errors.Internal("invalid_config", err)
		}
	} else {
		config = s.getDefaultConfig()
	}

	return &PublicWebsite{
		Published:   publishedAt != nil,
		PublishedAt: publishedAt,
		Shop: PublicShopInfo{
			ID:      shopID,
			Name:    shopName,
			Slug:    slug,
			LogoURL: logoURL,
			Phone:   phone,
			Address: address,
		},
		Config: &config,
	}, nil
}

// getDefaultConfig returns the default builder configuration.
func (s *BuilderService) getDefaultConfig() BuilderConfig {
	now := time.Now()
	return BuilderConfig{
		ActivityType:              "COMMERCIAL",
		PrimaryColor:              "#00E5FF",
		SecondaryColor:            "#BD00FF",
		Layout:                    "modern",
		BannerURL:                 "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
		BannerPosX:                50,
		BannerPosY:                50,
		HeaderType:                "centered",
		HeaderBackgroundColor:     "#FFFFFF",
		HeaderTextColor:           "#0F172A",
		HeaderTransparent:         true,
		HeaderOverlayBanner:       false,
		HeaderOpacity:             60,
		PageBackgroundColor:       "#FFFFFF",
		HomeLayoutMode:            "banner_products",
		BannerSize:                "normal",
		BannerTextPosition:        "center",
		ProductDisplay:            "cards",
		ProductsLayout:            "vertical",
		ImageAspectRatio:          "square",
		ProductCardOverlayBgColor: "#0F172A",
		ProductCardOverlayOpacity: 70,
		ProductCardTitleColor:     "#FFFFFF",
		ProductCardPriceColor:     "#FFFFFF",
		CategoryIconShape:         "circular",
		CategoryIconSize:          "medium",
		ShowProductsInCategories:  false,
		HeadingSize:               "text-4xl",
		TextSize:                  "text-sm",
		FontWeight:                "font-black",
		ButtonShape:               "rounded-2xl",
		ButtonPadding:             "px-6 py-3",
		ButtonPreset:              "primary",
		ButtonHover:               "bg-slate-900",
		FooterBackgroundColor:     "#FFFFFF",
		FooterTextColor:           "#0F172A",
		FooterTransparent:         false,
		FooterOpacity:             90,
		PagePadding:               "p-6 md:p-12",
		ItemGap:                   "gap-4 md:gap-6",
		QuickTheme:                "catalog_clean",
		HomePageName:              "الرئيسية",
		AllProductsPageName:       "جميع المنتجات",
		Surface:                   "#F8FAFC",
		ClinicLayout:              "",
		Theme: &ThemeConfig{
			ID:      "default",
			Name:    "Default Theme",
			Variant: "light",
		},
		Colors: &ColorsConfig{
			Primary:    "#00E5FF",
			Secondary:  "#BD00FF",
			Accent:     "#FF6B6B",
			Background: "#FFFFFF",
			Surface:    "#F8FAFC",
			Text: TextColors{
				Primary:   "#1A1A1A",
				Secondary: "#64748B",
				Disabled:  "#94A3B8",
			},
			Success: "#10B981",
			Warning: "#F59E0B",
			Error:   "#EF4444",
		},
		Typography: &TypographyConfig{
			FontFamily: FontFamilyConfig{
				Heading: "Inter",
				Body:    "Inter",
				Arabic:  "Cairo",
			},
			FontSize: FontSizeConfig{
				XS:   "0.75rem",
				SM:   "0.875rem",
				Base: "1rem",
				LG:   "1.125rem",
				XL:   "1.25rem",
				XL2:  "1.5rem",
				XL3:  "1.875rem",
				XL4:  "2.25rem",
			},
			FontWeight: FontWeights{
				Light:     300,
				Normal:    400,
				Medium:    500,
				Semibold:  600,
				Bold:      700,
				Extrabold: 800,
			},
		},
		LayoutConfig: &LayoutConfig{
			ContainerWidth: "1200px",
			Spacing: SpacingConfig{
				XS:  "0.5rem",
				SM:  "1rem",
				MD:  "1.5rem",
				LG:  "2rem",
				XL:  "3rem",
				XL2: "4rem",
			},
			BorderRadius: BorderRadiusConfig{
				SM:   "0.25rem",
				MD:   "0.5rem",
				LG:   "0.75rem",
				XL:   "1rem",
				XL2:  "1.5rem",
				Full: "9999px",
			},
			Header: HeaderConfig{
				Height:      "64px",
				Position:    "sticky",
				Transparent: false,
			},
			Footer: FooterConfig{
				Position:    "static",
				Transparent: false,
			},
		},
		CustomPages: []CustomPage{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// GenerateCustomPageID generates a unique ID for a custom page.
func GenerateCustomPageID() string {
	return uuid.New().String()
}
