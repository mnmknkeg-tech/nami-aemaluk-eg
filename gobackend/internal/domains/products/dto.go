package products

import "time"

// Product represents a product row from the database.
type Product struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Description   *string        `json:"description,omitempty"`
	Price         float64        `json:"price"`
	Stock         int            `json:"stock"`
	Category      string         `json:"category"`
	ImageURL      *string        `json:"imageUrl,omitempty"`
	IsActive      bool           `json:"isActive"`
	AppActive     bool           `json:"appActive"`
	ShopID        string         `json:"shopId"`
	TrackStock    bool           `json:"trackStock"`
	Unit          *string        `json:"unit,omitempty"`
	Images        []any          `json:"images,omitempty"`
	Colors        []any          `json:"colors,omitempty"`
	Sizes         []any          `json:"sizes,omitempty"`
	Addons        []any          `json:"addons,omitempty"`
	MenuVariants  []any          `json:"menuVariants,omitempty"`
	PackOptions   []any          `json:"packOptions,omitempty"`
	Model3DURL    *string        `json:"model3dUrl,omitempty"`
	SpinImages    []any          `json:"spinImages,omitempty"`
	ExtraData     map[string]any `json:"extraData,omitempty"`
	FurnitureMeta *FurnitureMeta `json:"furnitureMeta,omitempty"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
}

// FurnitureMeta represents dimensional metadata for furniture products.
type FurnitureMeta struct {
	ID       string   `json:"id,omitempty"`
	Unit     *string  `json:"unit,omitempty"`
	LengthCm *float64 `json:"lengthCm,omitempty"`
	WidthCm  *float64 `json:"widthCm,omitempty"`
	HeightCm *float64 `json:"heightCm,omitempty"`
}

// CreateProductRequest is the payload for creating a product.
type CreateProductRequest struct {
	Name          string         `json:"name" validate:"required"`
	Price         float64        `json:"price" validate:"min=0"`
	Stock         int            `json:"stock" validate:"min=0"`
	ShopID        string         `json:"shopId,omitempty" validate:"omitempty"`
	Category      string         `json:"category,omitempty"`
	Unit          *string        `json:"unit,omitempty"`
	ImageURL      *string        `json:"imageUrl,omitempty"`
	Description   *string        `json:"description,omitempty"`
	TrackStock    *bool          `json:"trackStock,omitempty"`
	Images        []any          `json:"images,omitempty"`
	Colors        []any          `json:"colors,omitempty"`
	Sizes         []any          `json:"sizes,omitempty"`
	Addons        []any          `json:"addons,omitempty"`
	MenuVariants  []any          `json:"menuVariants,omitempty"`
	PackOptions   []any          `json:"packOptions,omitempty"`
	Model3DURL    *string        `json:"model3dUrl,omitempty"`
	SpinImages    []any          `json:"spinImages,omitempty"`
	IsActive      *bool          `json:"isActive,omitempty"`
	AppActive     *bool          `json:"appActive,omitempty"`
	ExtraData     map[string]any `json:"extraData,omitempty"`
	FurnitureMeta *FurnitureMeta `json:"furnitureMeta,omitempty"`
}

// UpdateProductRequest is the payload for updating a product.
type UpdateProductRequest struct {
	Name          *string        `json:"name,omitempty"`
	Price         *float64       `json:"price,omitempty" validate:"omitempty,min=0"`
	Stock         *int           `json:"stock,omitempty" validate:"omitempty,min=0"`
	Category      *string        `json:"category,omitempty"`
	Unit          *string        `json:"unit,omitempty"`
	ImageURL      *string        `json:"imageUrl,omitempty"`
	Description   *string        `json:"description,omitempty"`
	TrackStock    *bool          `json:"trackStock,omitempty"`
	Images        []any          `json:"images,omitempty"`
	Colors        []any          `json:"colors,omitempty"`
	Sizes         []any          `json:"sizes,omitempty"`
	Addons        []any          `json:"addons,omitempty"`
	MenuVariants  []any          `json:"menuVariants,omitempty"`
	PackOptions   []any          `json:"packOptions,omitempty"`
	Model3DURL    *string        `json:"model3dUrl,omitempty"`
	SpinImages    []any          `json:"spinImages,omitempty"`
	IsActive      *bool          `json:"isActive,omitempty"`
	AppActive     *bool          `json:"appActive,omitempty"`
	ExtraData     map[string]any `json:"extraData,omitempty"`
	FurnitureMeta *FurnitureMeta `json:"furnitureMeta,omitempty"`
}

// ProductFilter carries optional search/filter/sort parameters.
type ProductFilter struct {
	Search          string  `query:"search"`
	Category        string  `query:"category"`
	MinPrice        float64 `query:"minPrice"`
	MaxPrice        float64 `query:"maxPrice"`
	Sort            string  `query:"sort"` // newest | price_asc | price_desc | name | oldest
	IncludeImageMap bool   `query:"includeImageMap"`
	ShopActivity    string  `query:"shopActivity"`
}

// ProductListRequest is the query for listing products.
type ProductListRequest struct {
	ShopID  string `query:"shopId"`
	Surface string `query:"surface"` // site → is_active فقط، غير كده app_active (التطبيق)
	Page    int    `query:"page"`
	Limit   int    `query:"limit"`
	Filter  ProductFilter
}

// ManageProductListRequest is the query for management listings.
type ManageProductListRequest struct {
	Page            int    `query:"page"`
	Limit           int    `query:"limit"`
	IncludeImageMap bool   `query:"includeImageMap"`
	Filter          ProductFilter
}

// FurnitureMetaInput mirrors the accepted JSON payload.
type FurnitureMetaInput struct {
	Unit     *string  `json:"unit,omitempty"`
	LengthCm *float64 `json:"lengthCm,omitempty"`
	WidthCm  *float64 `json:"widthCm,omitempty"`
	HeightCm *float64 `json:"heightCm,omitempty"`
}
