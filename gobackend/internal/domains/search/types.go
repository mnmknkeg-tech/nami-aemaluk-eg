package search

// SearchType represents the type of search
type SearchType string

const (
	SearchTypeProducts SearchType = "products"
	SearchTypeShops    SearchType = "shops"
	SearchTypeOrders   SearchType = "orders"
	SearchTypeUsers    SearchType = "users"
	SearchTypeAll      SearchType = "all"
)

// SearchResult represents a generic search result
type SearchResult struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Subtitle string                 `json:"subtitle,omitempty"`
	Image    *string                `json:"image,omitempty"`
	URL      string                 `json:"url"`
	Score    float64                `json:"score"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ProductSearchResult represents a product search result
type ProductSearchResult struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Image       *string `json:"image,omitempty"`
	ShopID      string  `json:"shop_id"`
	ShopName    string  `json:"shop_name"`
	Category    *string `json:"category,omitempty"`
	Score       float64 `json:"score"`
}

// ShopSearchResult represents a shop search result
type ShopSearchResult struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Image       *string `json:"image,omitempty"`
	Category    string  `json:"category"`
	Rating      float64 `json:"rating"`
	Status      string  `json:"status"`
	Score       float64 `json:"score"`
}

// OrderSearchResult represents an order search result
type OrderSearchResult struct {
	ID         string  `json:"id"`
	OrderNumber string `json:"order_number"`
	Status     string  `json:"status"`
	Total      float64 `json:"total"`
	CustomerName string `json:"customer_name"`
	ShopName   string  `json:"shop_name"`
	CreatedAt  string  `json:"created_at"`
	Score      float64 `json:"score"`
}

// SearchRequest represents a search request
type SearchRequest struct {
	Query     string     `json:"query" validate:"required,min=1"`
	Type      SearchType `json:"type,omitempty" validate:"omitempty,oneof=products shops orders users all"`
	ShopID    *string    `json:"shop_id,omitempty"`
	UserID    *string    `json:"user_id,omitempty"`
	Category  *string    `json:"category,omitempty"`
	MinPrice  *float64   `json:"min_price,omitempty"`
	MaxPrice  *float64   `json:"max_price,omitempty"`
	Limit     int        `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset    int        `json:"offset,omitempty" validate:"omitempty,min=0"`
}

// SearchResponse represents a search response
type SearchResponse struct {
	Success bool           `json:"success"`
	Data    []SearchResult `json:"data,omitempty"`
	Total   int64          `json:"total,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// ProductSearchResponse represents a product search response
type ProductSearchResponse struct {
	Success bool                 `json:"success"`
	Data    []ProductSearchResult `json:"data,omitempty"`
	Total   int64                `json:"total,omitempty"`
	Error   string               `json:"error,omitempty"`
}

// ShopSearchResponse represents a shop search response
type ShopSearchResponse struct {
	Success bool             `json:"success"`
	Data    []ShopSearchResult `json:"data,omitempty"`
	Total   int64            `json:"total,omitempty"`
	Error   string           `json:"error,omitempty"`
}

// OrderSearchResponse represents an order search response
type OrderSearchResponse struct {
	Success bool               `json:"success"`
	Data    []OrderSearchResult `json:"data,omitempty"`
	Total   int64              `json:"total,omitempty"`
	Error   string             `json:"error,omitempty"`
}
