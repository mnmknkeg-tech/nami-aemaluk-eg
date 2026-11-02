package support

// TicketStatus represents the status of a support ticket
type TicketStatus string

const (
	TicketStatusOpen     TicketStatus = "OPEN"
	TicketStatusPending  TicketStatus = "PENDING"
	TicketStatusResolved TicketStatus = "RESOLVED"
	TicketStatusClosed   TicketStatus = "CLOSED"
)

// TicketPriority represents the priority of a support ticket
type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "LOW"
	TicketPriorityMedium TicketPriority = "MEDIUM"
	TicketPriorityHigh   TicketPriority = "HIGH"
	TicketPriorityUrgent TicketPriority = "URGENT"
)

// Ticket represents a support ticket
type Ticket struct {
	ID          string          `json:"id"`
	UserID      string          `json:"user_id"`
	ShopID      *string         `json:"shop_id,omitempty"`
	Subject     string          `json:"subject"`
	Description string          `json:"description"`
	Status      TicketStatus    `json:"status"`
	Priority    TicketPriority  `json:"priority"`
	Category    string          `json:"category"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}

// TicketMessage represents a message in a support ticket
type TicketMessage struct {
	ID        string `json:"id"`
	TicketID  string `json:"ticket_id"`
	UserID    string `json:"user_id"`
	IsAdmin   bool   `json:"is_admin"`
	Message   string `json:"message"`
	CreatedAt string `json:"created_at"`
}

// CreateTicketRequest represents a request to create a ticket
type CreateTicketRequest struct {
	Subject     string         `json:"subject" validate:"required,min=1,max=255"`
	Description string         `json:"description" validate:"required"`
	Category    string         `json:"category" validate:"required"`
	Priority    TicketPriority `json:"priority,omitempty" validate:"omitempty,oneof=LOW MEDIUM HIGH URGENT"`
}

// ListTicketsRequest represents a request to list tickets
type ListTicketsRequest struct {
	UserID   *string        `json:"user_id,omitempty"`
	ShopID   *string        `json:"shop_id,omitempty"`
	Status   *TicketStatus  `json:"status,omitempty"`
	Category *string        `json:"category,omitempty"`
	Limit    int            `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset   int            `json:"offset,omitempty" validate:"omitempty,min=0"`
}
