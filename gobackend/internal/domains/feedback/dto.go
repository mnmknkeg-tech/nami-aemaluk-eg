package feedback

import "github.com/go-playground/validator/v10"

// CreateFeedbackDTO represents a DTO for creating feedback
type CreateFeedbackDTO struct {
	ShopID    string       `json:"shop_id" validate:"required"`
	OrderID   *string      `json:"order_id,omitempty"`
	ProductID *string      `json:"product_id,omitempty"`
	Type      FeedbackType `json:"type" validate:"required,oneof=REVIEW RATING COMMENT COMPLAINT"`
	Rating    *int         `json:"rating,omitempty" validate:"omitempty,min=1,max=5"`
	Title     string       `json:"title" validate:"required,min=1,max=255"`
	Comment   string       `json:"comment" validate:"required"`
}

// Validate validates the DTO
func (d *CreateFeedbackDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// FeedbackResponse represents a feedback response
type FeedbackResponse struct {
	Success bool      `json:"success"`
	Data    *Feedback `json:"data,omitempty"`
	Error   string    `json:"error,omitempty"`
}

// FeedbackListResponse represents a list of feedback response
type FeedbackListResponse struct {
	Success bool       `json:"success"`
	Data    []Feedback `json:"data,omitempty"`
	Total   int64      `json:"total,omitempty"`
	Error   string     `json:"error,omitempty"`
}
