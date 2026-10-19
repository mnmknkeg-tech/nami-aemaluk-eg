package reviews

import "github.com/go-playground/validator/v10"

// CreateReviewDTO represents a DTO for creating a review
type CreateReviewDTO struct {
	Rating  int    `json:"rating" validate:"required,min=1,max=5"`
	Comment string `json:"comment" validate:"required,min=1,max=2000"`
}

// Validate validates the DTO
func (d *CreateReviewDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// ReviewResponse represents a review response
type ReviewResponse struct {
	Success bool    `json:"success"`
	Data    *Review `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
}

// ReviewListResponse represents a list of reviews response
type ReviewListResponse struct {
	Success bool     `json:"success"`
	Data    []Review `json:"data,omitempty"`
	Total   int64    `json:"total,omitempty"`
	Average float64  `json:"average,omitempty"`
	Error   string   `json:"error,omitempty"`
}
