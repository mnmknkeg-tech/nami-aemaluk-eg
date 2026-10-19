package reservation

import "github.com/go-playground/validator/v10"

// CreateReservationDTO represents a DTO for creating a reservation
type CreateReservationDTO struct {
	ItemID           string            `json:"item_id" validate:"required"`
	ItemName         string            `json:"item_name" validate:"required,min=1,max=255"`
	ItemImage        *string           `json:"item_image,omitempty"`
	ItemPrice        float64           `json:"item_price" validate:"required,min=0"`
	ShopID           string            `json:"shop_id" validate:"required,uuid"`
	ShopName         string            `json:"shop_name" validate:"required,min=1,max=255"`
	CustomerName     string            `json:"customer_name" validate:"required,min=1,max=255"`
	CustomerPhone    *string           `json:"customer_phone,omitempty"`
	CustomerID       *string           `json:"customer_id,omitempty"`
	Addons           []AddonSelection  `json:"addons,omitempty"`
	VariantSelection *VariantSelection `json:"variant_selection,omitempty"`
}

// Validate validates the DTO
func (d *CreateReservationDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// UpdateStatusDTO represents a DTO for updating reservation status
type UpdateStatusDTO struct {
	Status ReservationStatus `json:"status" validate:"required,oneof=PENDING CONFIRMED CANCELLED COMPLETED EXPIRED"`
}

// Validate validates the DTO
func (d *UpdateStatusDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// ListReservationsDTO represents a DTO for listing reservations
type ListReservationsDTO struct {
	ShopID *string            `json:"shop_id,omitempty" validate:"omitempty,uuid"`
	UserID *string            `json:"user_id,omitempty" validate:"omitempty,uuid"`
	Status *ReservationStatus `json:"status,omitempty" validate:"omitempty,oneof=PENDING CONFIRMED CANCELLED COMPLETED EXPIRED"`
	Limit  int                `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset int                `json:"offset,omitempty" validate:"omitempty,min=0"`
}

// Validate validates the DTO
func (d *ListReservationsDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// ReservationResponse represents a reservation response
type ReservationResponse struct {
	Success bool         `json:"success"`
	Data    *Reservation `json:"data,omitempty"`
	Error   string       `json:"error,omitempty"`
}

// ReservationsListResponse represents a list of reservations response
type ReservationsListResponse struct {
	Success bool          `json:"success"`
	Data    []Reservation `json:"data,omitempty"`
	Total   int64         `json:"total,omitempty"`
	Error   string        `json:"error,omitempty"`
}

// AnalyticsResponse represents reservation analytics response
type AnalyticsResponse struct {
	Success bool                  `json:"success"`
	Data    *ReservationAnalytics `json:"data,omitempty"`
	Error   string                `json:"error,omitempty"`
}
