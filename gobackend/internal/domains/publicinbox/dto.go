package publicinbox

import "time"

// PublicMessage is a contact / suggestion message submitted from the public
// marketplace (no authentication required).
type PublicMessage struct {
	ID        string     `json:"id"`
	Kind      string     `json:"kind"` // 'contact' | 'suggestion'
	Name      string     `json:"name"`
	Email     string     `json:"email"`
	Message   string     `json:"message"`
	Meta      string     `json:"meta,omitempty"`
	Handled   bool       `json:"handled"`
	CreatedAt time.Time  `json:"createdAt"`
	HandledAt *time.Time `json:"handledAt,omitempty"`
}

// CreateRequest is the public payload for POST /contact and POST /suggestions.
type CreateRequest struct {
	Name    string `json:"name" validate:"required,max=120"`
	Email   string `json:"email" validate:"required,email,max=200"`
	Message string `json:"message" validate:"required,max=4000"`
	// Optional extras (page the user came from, locale…)
	Meta string `json:"meta,omitempty" validate:"max=500"`
}

// HandlerResponse is the admin list envelope.
type ListResponse struct {
	Success bool            `json:"success"`
	Data    []PublicMessage `json:"data"`
	Total   int64           `json:"total"`
}
