package search

import "github.com/go-playground/validator/v10"

// SearchDTO represents a DTO for search requests
type SearchDTO struct {
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

// Validate validates the DTO
func (d *SearchDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}
