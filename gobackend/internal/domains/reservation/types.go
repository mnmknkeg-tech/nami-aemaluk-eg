package reservation

// ReservationStatus represents the status of a reservation
type ReservationStatus string

const (
	ReservationStatusPending   ReservationStatus = "PENDING"
	ReservationStatusConfirmed ReservationStatus = "CONFIRMED"
	ReservationStatusCancelled ReservationStatus = "CANCELLED"
	ReservationStatusCompleted ReservationStatus = "COMPLETED"
	ReservationStatusExpired   ReservationStatus = "EXPIRED"
)

// Reservation represents a reservation entity
type Reservation struct {
	ID               string            `json:"id"`
	ItemID           string            `json:"item_id"`
	ItemName         string            `json:"item_name"`
	ItemImage        *string           `json:"item_image,omitempty"`
	ItemPrice        float64           `json:"item_price"`
	ShopID           string            `json:"shop_id"`
	ShopName         string            `json:"shop_name"`
	CustomerName     string            `json:"customer_name"`
	CustomerPhone    *string           `json:"customer_phone,omitempty"`
	CustomerID       *string           `json:"customer_id,omitempty"`
	Addons           []AddonSelection  `json:"addons,omitempty"`
	VariantSelection *VariantSelection `json:"variant_selection,omitempty"`
	Status           ReservationStatus `json:"status"`
	Subtotal         float64           `json:"subtotal"`
	ExpiresAt        string            `json:"expires_at"`
	CreatedAt        string            `json:"created_at"`
	UpdatedAt        string            `json:"updated_at"`
}

// AddonSelection represents a selected addon
type AddonSelection struct {
	OptionID     string  `json:"option_id"`
	OptionName   string  `json:"option_name"`
	OptionImage  *string `json:"option_image,omitempty"`
	VariantID    string  `json:"variant_id"`
	VariantLabel string  `json:"variant_label"`
	Price        float64 `json:"price"`
}

// VariantSelection represents a selected variant
type VariantSelection struct {
	TypeID     string  `json:"type_id,omitempty"`
	TypeName   string  `json:"type_name,omitempty"`
	SizeID     string  `json:"size_id,omitempty"`
	SizeLabel  string  `json:"size_label,omitempty"`
	Price      float64 `json:"price"`
	ColorName  *string `json:"color_name,omitempty"`
	ColorValue *string `json:"color_value,omitempty"`
	Size       string  `json:"size,omitempty"`
	Kind       string  `json:"kind,omitempty"`
}

// ReservationAnalytics represents reservation analytics
type ReservationAnalytics struct {
	TotalReservations int64   `json:"total_reservations"`
	CompletedCount    int64   `json:"completed_count"`
	PendingCount      int64   `json:"pending_count"`
	CancelledCount    int64   `json:"cancelled_count"`
	TotalRevenue      float64 `json:"total_revenue"`
	AverageValue      float64 `json:"average_value"`
}

// CreateReservationRequest represents a request to create a reservation
type CreateReservationRequest struct {
	ItemID           string            `json:"item_id" validate:"required"`
	ItemName         string            `json:"item_name" validate:"required"`
	ItemImage        *string           `json:"item_image,omitempty"`
	ItemPrice        float64           `json:"item_price" validate:"required,min=0"`
	ShopID           string            `json:"shop_id" validate:"required,uuid"`
	ShopName         string            `json:"shop_name" validate:"required"`
	CustomerName     string            `json:"customer_name" validate:"required,min=1,max=255"`
	CustomerPhone    *string           `json:"customer_phone,omitempty"`
	CustomerID       *string           `json:"customer_id,omitempty"`
	Addons           []AddonSelection  `json:"addons,omitempty"`
	VariantSelection *VariantSelection `json:"variant_selection,omitempty"`
}

// UpdateReservationStatusRequest represents a request to update reservation status
type UpdateReservationStatusRequest struct {
	Status ReservationStatus `json:"status" validate:"required,oneof=PENDING CONFIRMED CANCELLED COMPLETED EXPIRED"`
}

// ListReservationsRequest represents a request to list reservations
type ListReservationsRequest struct {
	ShopID *string            `json:"shop_id,omitempty"`
	UserID *string            `json:"user_id,omitempty"`
	Status *ReservationStatus `json:"status,omitempty"`
	Limit  int                `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
	Offset int                `json:"offset,omitempty" validate:"omitempty,min=0"`
}
