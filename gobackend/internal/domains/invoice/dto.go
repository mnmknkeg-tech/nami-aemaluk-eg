package invoice

import "github.com/go-playground/validator/v10"

// CreateInvoiceDTO represents a DTO for creating an invoice
type CreateInvoiceDTO struct {
	OrderID string `json:"order_id" validate:"required"`
	ShopID  string `json:"shop_id" validate:"required"`
	DueDate string `json:"due_date" validate:"required"`
}

// Validate validates the DTO
func (d *CreateInvoiceDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// InvoiceResponse represents an invoice response
type InvoiceResponse struct {
	Success bool     `json:"success"`
	Data    *Invoice `json:"data,omitempty"`
	Error   string   `json:"error,omitempty"`
}

// InvoicesListResponse represents a list of invoices response
type InvoicesListResponse struct {
	Success bool      `json:"success"`
	Data    []Invoice `json:"data,omitempty"`
	Total   int64     `json:"total,omitempty"`
	Error   string    `json:"error,omitempty"`
}
