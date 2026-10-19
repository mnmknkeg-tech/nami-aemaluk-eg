package invoice

// InvoiceStatus represents the status of an invoice
type InvoiceStatus string

const (
	InvoiceStatusDraft     InvoiceStatus = "DRAFT"
	InvoiceStatusPending   InvoiceStatus = "PENDING"
	InvoiceStatusSent      InvoiceStatus = "SENT"
	InvoiceStatusPaid      InvoiceStatus = "PAID"
	InvoiceStatusOverdue   InvoiceStatus = "OVERDUE"
	InvoiceStatusCancelled InvoiceStatus = "CANCELLED"
)

// Invoice represents an invoice entity
type Invoice struct {
	ID          string         `json:"id"`
	OrderID     string         `json:"order_id"`
	ShopID      string         `json:"shop_id"`
	CustomerID  string         `json:"customer_id"`
	Number      string         `json:"number"`
	Amount      float64        `json:"amount"`
	Status      InvoiceStatus  `json:"status"`
	DueDate     string         `json:"due_date"`
	PaidAt      *string        `json:"paid_at,omitempty"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
}

// InvoiceItem represents an item in an invoice
type InvoiceItem struct {
	ID        string  `json:"id"`
	InvoiceID string  `json:"invoice_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
	Total     float64 `json:"total"`
}

// CreateInvoiceRequest represents a request to create an invoice
type CreateInvoiceRequest struct {
	OrderID string `json:"order_id" validate:"required"`
	ShopID  string `json:"shop_id" validate:"required"`
	DueDate string `json:"due_date" validate:"required"`
}

// ListInvoicesRequest represents a request to list invoices
type ListInvoicesRequest struct {
	ShopID     *string        `json:"shop_id,omitempty"`
	CustomerID *string        `json:"customer_id,omitempty"`
	Status      *InvoiceStatus `json:"status,omitempty"`
	Limit       int            `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset      int            `json:"offset,omitempty" validate:"omitempty,min=0"`
}
