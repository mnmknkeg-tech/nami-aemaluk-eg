package shops

import "time"

// ShopStatus mirrors the Prisma ShopStatus enum.
type ShopStatus string

const (
	ShopStatusPending   ShopStatus = "PENDING"
	ShopStatusApproved  ShopStatus = "APPROVED"
	ShopStatusRejected  ShopStatus = "REJECTED"
	ShopStatusSuspended ShopStatus = "SUSPENDED"
)

// ShopCategory mirrors the Prisma ShopCategory enum.
type ShopCategory string

const (
	ShopCategoryRetail      ShopCategory = "RETAIL"
	ShopCategoryRestaurant  ShopCategory = "RESTAURANT"
	ShopCategoryService     ShopCategory = "SERVICE"
	ShopCategoryElectronics ShopCategory = "ELECTRONICS"
	ShopCategoryFashion     ShopCategory = "FASHION"
	ShopCategoryFood        ShopCategory = "FOOD"
	ShopCategoryHealth      ShopCategory = "HEALTH"
	ShopCategoryOther       ShopCategory = "OTHER"
)

// AiSubscriptionTier mirrors the Prisma enum.
type AiSubscriptionTier string

const (
	AiTierFree       AiSubscriptionTier = "FREE"
	AiTierPro        AiSubscriptionTier = "PRO"
	AiTierEnterprise AiSubscriptionTier = "ENTERPRISE"
)

// Shop represents a shop row from the database.
type Shop struct {
	ID                string             `json:"id"`
	Name              string             `json:"name"`
	Slug              string             `json:"slug"`
	Description       *string            `json:"description,omitempty"`
	Category          ShopCategory       `json:"category"`
	Activity          *string            `json:"activity,omitempty"`
	Governorate       string             `json:"governorate"`
	City              string             `json:"city"`
	Address           *string            `json:"address,omitempty"`
	AddressDetailed   *string            `json:"addressDetailed,omitempty"`
	DisplayAddress    *string            `json:"displayAddress,omitempty"`
	MapLabel          *string            `json:"mapLabel,omitempty"`
	Latitude          *float64           `json:"latitude,omitempty"`
	Longitude         *float64           `json:"longitude,omitempty"`
	LocationSource    *string            `json:"locationSource,omitempty"`
	LocationAccuracy  *float64           `json:"locationAccuracy,omitempty"`
	LocationUpdatedAt *time.Time         `json:"locationUpdatedAt,omitempty"`
	Phone             string             `json:"phone"`
	Email             *string            `json:"email,omitempty"`
	OpeningHours      *string            `json:"openingHours,omitempty"`
	LogoURL           *string            `json:"logoUrl,omitempty"`
	BannerURL         *string            `json:"bannerUrl,omitempty"`
	Status            ShopStatus         `json:"status"`
	PageDesign        map[string]any     `json:"pageDesign,omitempty"`
	BuilderConfig     map[string]any     `json:"builderConfig,omitempty"`
	Theme             *string            `json:"theme,omitempty"`
	CustomColors      map[string]any     `json:"customColors,omitempty"`
	CustomFonts       map[string]any     `json:"customFonts,omitempty"`
	LayoutConfig      map[string]any     `json:"layoutConfig,omitempty"`
	Followers         int                `json:"followers"`
	Visitors          int                `json:"visitors"`
	Rating            float64            `json:"rating"`
	IsActive          bool               `json:"isActive"`
	OwnerID           *string            `json:"ownerId,omitempty"`
	CreatedAt         time.Time          `json:"createdAt"`
	UpdatedAt         time.Time          `json:"updatedAt"`
	Addons            []any              `json:"addons,omitempty"`
	PublicDisabled    bool               `json:"publicDisabled"`
	DeliveryDisabled  bool               `json:"deliveryDisabled"`
	AiTier            AiSubscriptionTier `json:"aiTier"`
	AiUsageMonth      int                `json:"aiUsageMonth"`
	AiUsageResetAt    *time.Time         `json:"aiUsageResetAt,omitempty"`
	Owner             *ShopOwner         `json:"owner,omitempty"`
}

// ShopOwner is a lightweight owner representation.
type ShopOwner struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Email string  `json:"email"`
	Phone *string `json:"phone,omitempty"`
}

// CreateShopRequest is the payload to create a new shop.
type CreateShopRequest struct {
	Name            string   `json:"name" validate:"required,min=2,max=120"`
	Category        string   `json:"category" validate:"required,oneof=RETAIL RESTAURANT SERVICE ELECTRONICS FASHION FOOD HEALTH OTHER"`
	Phone           string   `json:"phone" validate:"required"`
	Email           string   `json:"email,omitempty" validate:"omitempty,email"`
	Description     string   `json:"description,omitempty"`
	Address         string   `json:"address,omitempty"`
	AddressDetailed string   `json:"addressDetailed,omitempty"`
	Governorate     string   `json:"governorate,omitempty"`
	City            string   `json:"city,omitempty"`
	OpeningHours    string   `json:"openingHours,omitempty"`
	Activity        string   `json:"activity,omitempty"`
	ActivityID      string   `json:"activityId,omitempty"`
	EnabledModules  []string `json:"enabledModules,omitempty"`
	Specialties     []string `json:"specialties,omitempty"`
	ModuleFeatures  any      `json:"moduleFeatures,omitempty"`
	// LayoutConfig from self-serve onboarding (enabledFeatures chosen through
	// the signup questions) — merged over defaultDashboardConfig.
	LayoutConfig map[string]any `json:"layoutConfig,omitempty"`
}

// UpdateShopRequest is the payload to update shop settings.
type UpdateShopRequest struct {
	Name             *string  `json:"name,omitempty"`
	Description      *string  `json:"description,omitempty"`
	Category         *string  `json:"category,omitempty"`
	Activity         *string  `json:"activity,omitempty"`
	Governorate      *string  `json:"governorate,omitempty"`
	City             *string  `json:"city,omitempty"`
	AddressDetailed  *string  `json:"addressDetailed,omitempty"`
	DisplayAddress   *string  `json:"displayAddress,omitempty"`
	MapLabel         *string  `json:"mapLabel,omitempty"`
	Latitude         *float64 `json:"latitude,omitempty"`
	Longitude        *float64 `json:"longitude,omitempty"`
	LocationSource   *string  `json:"locationSource,omitempty"`
	LocationAccuracy *float64 `json:"locationAccuracy,omitempty"`
	Phone            *string  `json:"phone,omitempty"`
	Email            *string  `json:"email,omitempty"`
	OpeningHours     *string  `json:"openingHours,omitempty"`
	LogoURL          *string  `json:"logoUrl,omitempty"`
	BannerURL        *string  `json:"bannerUrl,omitempty"`
	PageDesign       *any     `json:"pageDesign,omitempty"`
	CustomColors     *any     `json:"customColors,omitempty"`
	CustomFonts      *any     `json:"customFonts,omitempty"`
	LayoutConfig     *any     `json:"layoutConfig,omitempty"`
	Addons           *any     `json:"addons,omitempty"`
	IsActive         *bool    `json:"isActive,omitempty"`
	PublicDisabled   *bool    `json:"publicDisabled,omitempty"`
	DeliveryDisabled *bool    `json:"deliveryDisabled,omitempty"`
}

// ShopListRequest represents public shop listing query params.
type ShopListRequest struct {
	Take        int    `query:"take"`
	Skip        int    `query:"skip"`
	Category    string `query:"category"`
	Governorate string `query:"governorate"`
	Search      string `query:"search"`
}

// AdminShopListRequest represents admin shop listing query params.
type AdminShopListRequest struct {
	Take   int    `query:"take"`
	Skip   int    `query:"skip"`
	Status string `query:"status"`
	Search string `query:"search"`
}

// UpdateShopStatusRequest updates shop status.
type UpdateShopStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=PENDING APPROVED REJECTED SUSPENDED"`
}
