package reviews

// ReviewTarget represents the target type of a review
type ReviewTarget string

const (
	ReviewTargetProduct ReviewTarget = "PRODUCT"
	ReviewTargetShop    ReviewTarget = "SHOP"
)

// Review represents a review entity
type Review struct {
	ID         string       `json:"id"`
	UserID     string       `json:"user_id"`
	TargetType ReviewTarget `json:"target_type"`
	TargetID   string       `json:"target_id"`
	Rating     int          `json:"rating"`
	Comment    string       `json:"comment"`
	UserName   *string      `json:"user_name,omitempty"`
	CreatedAt  string       `json:"created_at"`
	UpdatedAt  string       `json:"updated_at"`
}
