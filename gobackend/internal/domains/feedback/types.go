package feedback

// FeedbackType represents the type of feedback
type FeedbackType string

const (
	FeedbackTypeReview    FeedbackType = "REVIEW"
	FeedbackTypeRating    FeedbackType = "RATING"
	FeedbackTypeComment   FeedbackType = "COMMENT"
	FeedbackTypeComplaint FeedbackType = "COMPLAINT"
)

// Feedback represents a feedback entity
type Feedback struct {
	ID        string       `json:"id"`
	UserID    string       `json:"user_id"`
	ShopID    string       `json:"shop_id"`
	OrderID   *string      `json:"order_id,omitempty"`
	ProductID *string      `json:"product_id,omitempty"`
	Type      FeedbackType `json:"type"`
	Rating    *int         `json:"rating,omitempty"`
	Title     string       `json:"title"`
	Comment   string       `json:"comment"`
	Status    string       `json:"status"`
	UserName  *string      `json:"user_name,omitempty"`
	UserEmail *string      `json:"user_email,omitempty"`
	CreatedAt string       `json:"created_at"`
	UpdatedAt string       `json:"updated_at"`
}

// CreateFeedbackRequest represents a request to create feedback
type CreateFeedbackRequest struct {
	ShopID    string       `json:"shop_id" validate:"required"`
	OrderID   *string      `json:"order_id,omitempty"`
	ProductID *string      `json:"product_id,omitempty"`
	Type      FeedbackType `json:"type" validate:"required,oneof=REVIEW RATING COMMENT COMPLAINT"`
	Rating    *int         `json:"rating,omitempty" validate:"omitempty,min=1,max=5"`
	Title     string       `json:"title" validate:"required,min=1,max=255"`
	Comment   string       `json:"comment" validate:"required"`
}

// ListFeedbackRequest represents a request to list feedback
type ListFeedbackRequest struct {
	ShopID    *string       `json:"shop_id,omitempty"`
	ProductID *string       `json:"product_id,omitempty"`
	Type      *FeedbackType `json:"type,omitempty"`
	Rating    *int          `json:"rating,omitempty"`
	Limit     int           `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset    int           `json:"offset,omitempty" validate:"omitempty,min=0"`
}
