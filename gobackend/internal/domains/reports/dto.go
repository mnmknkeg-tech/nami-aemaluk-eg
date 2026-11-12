package reports

import (
	"time"
)

// ProductReport represents a product report record.
type ProductReport struct {
	ID          string     `json:"id"`
	ProductID   string     `json:"productId"`
	ShopID      string     `json:"shopId"`
	ReporterID  *string    `json:"reporterId,omitempty"`
	Reason      string     `json:"reason"`
	Description string     `json:"description"`
	Status      string     `json:"status"`
	AdminNotes  *string    `json:"adminNotes,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// CreateReportRequest is the payload for reporting a product.
type CreateReportRequest struct {
	ProductID   string `json:"productId"`
	ShopID      string `json:"shopId"`
	Reason      string `json:"reason"`
	Description string `json:"description,omitempty"`
}

// UpdateReportRequest is the payload for admin updating a report.
type UpdateReportRequest struct {
	Status     string  `json:"status"`
	AdminNotes *string `json:"adminNotes,omitempty"`
}