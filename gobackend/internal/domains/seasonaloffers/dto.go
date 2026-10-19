package seasonaloffers

import "time"

// SeasonalOffer represents a seasonal promotional offer.
type SeasonalOffer struct {
	ID            string    `json:"id"`
	ShopID        string    `json:"shopId"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	Occasion      string    `json:"occasion"`
	DiscountType  string    `json:"discountType"`
	DiscountValue float64   `json:"discountValue"`
	Categories    []string  `json:"categories"`
	StartDate     time.Time `json:"startDate"`
	EndDate       time.Time `json:"endDate"`
	BannerColor   string    `json:"bannerColor"`
	Status        string    `json:"status"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`

	// Joined fields
	ShopName *string `json:"shopName,omitempty"`
	ShopSlug *string `json:"shopSlug,omitempty"`
}

// CreateSeasonalOfferRequest is the payload for creating a seasonal offer.
type CreateSeasonalOfferRequest struct {
	ShopID        string     `json:"shopId" validate:"required"`
	Name          string     `json:"name" validate:"required"`
	Description   *string    `json:"description,omitempty"`
	Occasion      string     `json:"occasion"`
	DiscountType  string     `json:"discountType" validate:"omitempty,oneof=percentage fixed"`
	DiscountValue float64    `json:"discountValue"`
	Categories    []string   `json:"categories,omitempty"`
	StartDate     *time.Time `json:"startDate,omitempty"`
	EndDate       *time.Time `json:"endDate,omitempty"`
	BannerColor   string     `json:"bannerColor,omitempty"`
}

// UpdateSeasonalOfferRequest is the payload for updating a seasonal offer.
type UpdateSeasonalOfferRequest struct {
	Name          *string    `json:"name,omitempty"`
	Description   *string    `json:"description,omitempty"`
	Occasion      *string    `json:"occasion,omitempty"`
	DiscountType  *string    `json:"discountType,omitempty" validate:"omitempty,oneof=percentage fixed"`
	DiscountValue *float64   `json:"discountValue,omitempty"`
	Categories    []string   `json:"categories,omitempty"`
	StartDate     *time.Time `json:"startDate,omitempty"`
	EndDate       *time.Time `json:"endDate,omitempty"`
	BannerColor   *string    `json:"bannerColor,omitempty"`
	Status        *string    `json:"status,omitempty" validate:"omitempty,oneof=active scheduled paused ended"`
}

// ListSeasonalOffersRequest is the query for listing seasonal offers.
type ListSeasonalOffersRequest struct {
	ShopID   string `query:"shopId"`
	Status   string `query:"status"`
	Occasion string `query:"occasion"`
	Page     int    `query:"page"`
	Limit    int    `query:"limit"`
}

// SeasonalOfferResponse is the shaped public response.
type SeasonalOfferResponse struct {
	ID            string   `json:"id"`
	ShopID        string   `json:"shopId"`
	ShopName      string   `json:"shopName"`
	ShopSlug      string   `json:"shopSlug"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Occasion      string   `json:"occasion"`
	DiscountType  string   `json:"discountType"`
	DiscountValue float64  `json:"discountValue"`
	Categories    []string `json:"categories"`
	StartDate     string   `json:"startDate"`
	EndDate       string   `json:"endDate"`
	BannerColor   string   `json:"bannerColor"`
	Status        string   `json:"status"`
}
