package support

import "github.com/go-playground/validator/v10"

// CreateTicketDTO represents a DTO for creating a ticket
type CreateTicketDTO struct {
	Subject     string         `json:"subject" validate:"required,min=1,max=255"`
	Description string         `json:"description" validate:"required"`
	Category    string         `json:"category" validate:"required"`
	Priority    TicketPriority `json:"priority,omitempty" validate:"omitempty,oneof=LOW MEDIUM HIGH URGENT"`
}

// Validate validates the DTO
func (d *CreateTicketDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// TicketResponse represents a ticket response
type TicketResponse struct {
	Success bool    `json:"success"`
	Data    *Ticket `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
}

// TicketsListResponse represents a list of tickets response
type TicketsListResponse struct {
	Success bool     `json:"success"`
	Data    []Ticket `json:"data,omitempty"`
	Total   int64    `json:"total,omitempty"`
	Error   string   `json:"error,omitempty"`
}
