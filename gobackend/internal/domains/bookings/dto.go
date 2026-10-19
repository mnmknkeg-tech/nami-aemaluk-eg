package bookings

import (
	"strings"
	"time"
)

// Booking represents a booking record.
type Booking struct {
	ID            string     `json:"id"`
	BookingNumber string     `json:"bookingNumber"`
	ServiceID     string     `json:"serviceId"`
	SlotID        *string    `json:"slotId,omitempty"`
	ShopID        string     `json:"shopId"`
	UserID        *string    `json:"userId,omitempty"`
	CustomerName  string     `json:"customerName"`
	CustomerPhone *string    `json:"customerPhone,omitempty"`
	CustomerEmail string     `json:"customerEmail"`
	StartAt       *time.Time `json:"startAt,omitempty"`
	EndAt         *time.Time `json:"endAt,omitempty"`
	Participants  int        `json:"participants"`
	TotalAmount   float64    `json:"totalAmount"`
	Currency      string     `json:"currency"`
	Status        string     `json:"status"`
	PaymentStatus string     `json:"paymentStatus"`
	Notes         *string    `json:"notes,omitempty"`
	Metadata      []byte     `json:"-"`
	ConfirmedAt   *time.Time `json:"confirmedAt,omitempty"`
	CompletedAt   *time.Time `json:"completedAt,omitempty"`
	CancelledAt   *time.Time `json:"cancelledAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`

	// Joined fields
	ServiceName   string  `json:"serviceName,omitempty"`
	ServicePrice  float64 `json:"servicePrice,omitempty"`
	SlotDate      *string `json:"slotDate,omitempty"`
	SlotStartTime *string `json:"slotStartTime,omitempty"`
	SlotEndTime   *string `json:"slotEndTime,omitempty"`
	ShopName      string  `json:"shopName,omitempty"`
}

// CreateBookingRequest is the payload for creating a booking.
type CreateBookingRequest struct {
	ShopID               string         `json:"shopId" validate:"required"`
	ItemID               string         `json:"itemId"`
	ItemName             string         `json:"itemName"`
	ItemImage            string         `json:"itemImage,omitempty"`
	ItemPrice            float64        `json:"itemPrice" validate:"min=0"`
	CustomerName         string         `json:"customerName,omitempty"`
	CustomerPhone        string         `json:"customerPhone,omitempty"`
	CustomerEmail        string         `json:"customerEmail,omitempty"`
	ServiceID            string         `json:"serviceId,omitempty"`
	SlotID               string         `json:"slotId,omitempty"`
	ResourceID           string         `json:"resourceId,omitempty"`
	Participants         int            `json:"participants,omitempty"`
	Notes                string         `json:"notes,omitempty"`
	Addons               map[string]any `json:"addons,omitempty"`
	VariantSelection     map[string]any `json:"variantSelection,omitempty"`
	Metadata             map[string]any `json:"metadata,omitempty"`
	BookingActivityType  string         `json:"bookingActivityType,omitempty"`
	BookingActivityRoute string         `json:"bookingActivityRoute,omitempty"`
	BookingDate          string         `json:"bookingDate,omitempty"`
	BookingTime          string         `json:"bookingTime,omitempty"`
}

// UpdateBookingStatusRequest is the payload for updating booking status.
type UpdateBookingStatusRequest struct {
	Status string `json:"status" validate:"required"`
}

// BookingResponse is the serialized booking response.
type BookingResponse struct {
	ID                   string    `json:"id"`
	BookingNumber        string    `json:"bookingNumber"`
	ShopID               string    `json:"shopId"`
	ItemID               string    `json:"itemId"`
	ItemName             string    `json:"itemName"`
	ItemImage            string    `json:"itemImage"`
	ItemPrice            float64   `json:"itemPrice"`
	CustomerName         string    `json:"customerName"`
	CustomerPhone        string    `json:"customerPhone"`
	CustomerEmail        string    `json:"customerEmail"`
	BookingDate          string    `json:"bookingDate"`
	BookingTime          string    `json:"bookingTime"`
	StartTime            *string   `json:"startTime,omitempty"`
	EndTime              *string   `json:"endTime,omitempty"`
	Participants         int       `json:"participants"`
	TotalAmount          float64   `json:"totalAmount"`
	Currency             string    `json:"currency"`
	Status               string    `json:"status"`
	Notes                string    `json:"notes,omitempty"`
	BookingActivityType  *string   `json:"bookingActivityType,omitempty"`
	BookingActivityRoute *string   `json:"bookingActivityRoute,omitempty"`
	CreatedAt            time.Time `json:"createdAt"`
}

// SlotAvailabilityResponse represents slot availability check result.
type SlotAvailabilityResponse struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
}

// AvailableSlot represents a time slot.
type AvailableSlot struct {
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	Available bool   `json:"available"`
}

func normalizeBookingStatus(s string) string {
	switch strings.ToUpper(s) {
	case "PENDING":
		return "PENDING"
	case "CONFIRMED":
		return "CONFIRMED"
	case "COMPLETED":
		return "COMPLETED"
	case "CANCELLED":
		return "CANCELLED"
	default:
		return ""
	}
}
