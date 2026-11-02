package customers

// CustomerSegmentCriteria holds segment filtering rules (stored as JSONB).
type CustomerSegmentCriteria struct {
	MinSpent           *float64  `json:"minSpent,omitempty"`
	MaxSpent           *float64  `json:"maxSpent,omitempty"`
	MinOrders          *int64    `json:"minOrders,omitempty"`
	MaxOrders          *int64    `json:"maxOrders,omitempty"`
	MinLoyaltyPoints   *float64  `json:"minLoyaltyPoints,omitempty"`
	MaxLoyaltyPoints   *float64  `json:"maxLoyaltyPoints,omitempty"`
	RegisteredAfter    *string   `json:"registeredAfter,omitempty"`
	RegisteredBefore   *string   `json:"registeredBefore,omitempty"`
	LastPurchaseAfter  *string   `json:"lastPurchaseAfter,omitempty"`
	LastPurchaseBefore *string   `json:"lastPurchaseBefore,omitempty"`
	Tags               []string  `json:"tags,omitempty"`
	Categories         []string  `json:"categories,omitempty"`
}

// CustomerSegment represents a customer segment (dashboard CRM).
type CustomerSegment struct {
	ID               string                 `json:"id"`
	ShopID           string                 `json:"shop_id"`
	Name             string                 `json:"name"`
	NameAr           string                 `json:"nameAr"`
	Description      string                 `json:"description"`
	Criteria         map[string]interface{} `json:"criteria"`
	IsActive         bool                   `json:"isActive"`
	CreatedAt        string                 `json:"createdAt"`
	UpdatedAt        string                 `json:"updatedAt"`
}

// CustomerTag represents a customer tag (dashboard CRM).
type CustomerTag struct {
	ID          string `json:"id"`
	ShopID      string `json:"shop_id"`
	Name        string `json:"name"`
	NameAr      string `json:"nameAr"`
	Color       string `json:"color"`
	Description string `json:"description"`
	IsActive    bool   `json:"isActive"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}