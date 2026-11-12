package offers

import "time"

// Offer represents a promotional offer.
type Offer struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	Description    *string `json:"description,omitempty"`
	Discount       float64 `json:"discount"`
	OldPrice       float64 `json:"oldPrice"`
	NewPrice       float64 `json:"newPrice"`
	ImageURL       *string `json:"imageUrl,omitempty"`
	ExpiresAt      time.Time `json:"expiresAt"`
	IsActive       bool    `json:"isActive"`
	ProductID      *string `json:"productId,omitempty"`
	ShopID         string  `json:"shopId"`
	VariantPricing *any    `json:"variantPricing,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`

	// Joined fields for listings.
	ProductName  *string `json:"productName,omitempty"`
	ProductPrice *float64 `json:"productPrice,omitempty"`
	ShopName     *string `json:"shopName,omitempty"`
	ShopSlug     *string `json:"shopSlug,omitempty"`
	ShopLogo     *string `json:"shopLogo,omitempty"`
	ShopCategory *string `json:"shopCategory,omitempty"`
}

// ListOffersRequest is the query for public active offers.
type ListOffersRequest struct {
	ShopID       string `query:"shopId"`
	ShopCategory string `query:"shopCategory"`
	ProductID    string `query:"productId"`
	Page         int    `query:"page"`
	Limit        int    `query:"limit"`
}

// CreateOfferRequest is the payload for creating offers.
type CreateOfferRequest struct {
	ShopID         string    `json:"shopId" validate:"required"`
	ProductID      *string   `json:"productId,omitempty"`
	ProductIDs     []string  `json:"productIds,omitempty"`
	Title          string    `json:"title" validate:"required"`
	Description    *string   `json:"description,omitempty"`
	Discount       *float64  `json:"discount,omitempty"`
	OldPrice       *float64  `json:"oldPrice,omitempty"`
	NewPrice       *float64  `json:"newPrice,omitempty"`
	PricingMode    *string   `json:"pricingMode,omitempty" validate:"omitempty,oneof=PERCENT AMOUNT NEW_PRICE"`
	PricingValue   *float64  `json:"pricingValue,omitempty"`
	ImageURL       *string   `json:"imageUrl,omitempty"`
	ExpiresAt      *time.Time `json:"expiresAt,omitempty"`
	VariantPricing *any      `json:"variantPricing,omitempty"`
}

// OfferResponse is the shaped public response.
type OfferResponse struct {
	ID             string  `json:"id"`
	ShopID         string  `json:"shopId"`
	ProductID      *string `json:"productId,omitempty"`
	ShopName       string  `json:"shopName"`
	ShopLogo       string  `json:"shopLogo"`
	ShopSlug       string  `json:"shopSlug"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Discount       float64 `json:"discount"`
	OldPrice       float64 `json:"oldPrice"`
	NewPrice       float64 `json:"newPrice"`
	VariantPricing *any    `json:"variantPricing,omitempty"`
	ImageURL       string  `json:"imageUrl"`
	Category       string  `json:"category"`
	ExpiresIn      string  `json:"expiresIn"`
	CreatedAt      string  `json:"created_at"`
}
