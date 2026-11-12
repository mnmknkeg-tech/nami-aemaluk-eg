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

// ProductSearchResult represents a product search result.
// JSON tags are camelCase to match the marketplace ProductCard shape directly.
type ProductSearchResult struct {
        ID          string  `json:"id"`
        Name        string  `json:"name"`
        Description string  `json:"description,omitempty"`
        Price       float64 `json:"price"`
        Image       *string `json:"image,omitempty"`
        ImageURL    *string `json:"imageUrl,omitempty"`
        ShopID      string  `json:"shopId"`
        ShopSlug    string  `json:"shopSlug,omitempty"`
        ShopName    string  `json:"shopName"`
        Category    *string `json:"category,omitempty"`
        Score       float64 `json:"score"`
}

// ShopSearchResult represents a shop search result.
// Slug/Logo/City/Activity feed the marketplace SearchBar navigation.
type ShopSearchResult struct {
        ID          string  `json:"id"`
        Name        string  `json:"name"`
        Slug        string  `json:"slug"`
        Description string  `json:"description,omitempty"`
        Image       *string `json:"image,omitempty"`
        Logo        string  `json:"logo,omitempty"`
        City        string  `json:"city,omitempty"`
        Activity    string  `json:"activity,omitempty"`
        Category    string  `json:"category"`
        Rating      float64 `json:"rating"`
        Status      string  `json:"status"`
        Score       float64 `json:"score"`
}

// OrderSearchResult represents an order search result.
// The schema has no order_number column — the order id is surfaced instead.
type OrderSearchResult struct {
        ID           string  `json:"id"`
        OrderNumber  string  `json:"orderNumber"`
        Status       string  `json:"status"`
        Total        float64 `json:"total"`
        CustomerName string  `json:"customerName"`
        ShopName     string  `json:"shopName"`
        CreatedAt    string  `json:"createdAt"`
        Score        float64 `json:"score"`
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
