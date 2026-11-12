package bookings

import (
	"encoding/json"
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
	// ShopID is intentionally not tagged "required": guest bookings must
	// supply it (enforced with a clear Arabic message by the service), while
	// authenticated dashboard bookings fall back to the caller's own shop
	// (token claim, then the database — the claim can be missing on access
	// tokens minted during signup, before the onboarding wizard created the
	// shop).
	ShopID               string         `json:"shopId"`
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

// RescheduleBookingRequest is the payload for moving a booking to a new
// Cairo wall-clock time. The time is interpreted in Africa/Cairo, not UTC.
type RescheduleBookingRequest struct {
	BookingDate string `json:"bookingDate" validate:"required"`
	BookingTime string `json:"bookingTime" validate:"required"`
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
	case "NO_SHOW":
		return "NO_SHOW"
	default:
		return ""
	}
}

// ---------------------------------------------------------------------------
// Booking services (bookable offerings) — CRUD + public contracts.
// ---------------------------------------------------------------------------

// BookingService is a bookable offering owned by a shop (a clinic visit, a
// hotel night, a table, a consultation...).
type BookingService struct {
	ID              string          `json:"id"`
	ShopID          string          `json:"shopId"`
	Name            string          `json:"name"`
	NameAr          *string         `json:"nameAr,omitempty"`
	ActivityType    *string         `json:"activityType,omitempty"`
	Description     *string         `json:"description,omitempty"`
	DurationMinutes int             `json:"durationMinutes"`
	Price           float64         `json:"price"`
	Currency        string          `json:"currency"`
	Capacity        int             `json:"capacity"`
	IsActive        bool            `json:"isActive"`
	ProductID       string          `json:"productId,omitempty"`
	Metadata        json.RawMessage `json:"-"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// CreateBookingServiceRequest is the merchant payload to add a bookable service.
type CreateBookingServiceRequest struct {
	Name            string  `json:"name" validate:"required"`
	NameAr          string  `json:"nameAr,omitempty"`
	ActivityType    string  `json:"activityType,omitempty"`
	Description     string  `json:"description,omitempty"`
	DurationMinutes int     `json:"durationMinutes,omitempty"`
	Price           float64 `json:"price" validate:"min=0"`
	Capacity        int     `json:"capacity,omitempty"`
	IsActive        *bool   `json:"isActive,omitempty"`
}

// UpdateBookingServiceRequest is the merchant payload to edit a bookable service.
// Zero-value fields are left untouched.
type UpdateBookingServiceRequest struct {
	Name            *string  `json:"name,omitempty"`
	NameAr          *string  `json:"nameAr,omitempty"`
	ActivityType    *string  `json:"activityType,omitempty"`
	Description     *string  `json:"description,omitempty"`
	DurationMinutes *int     `json:"durationMinutes,omitempty"`
	Price           *float64 `json:"price,omitempty"`
	Capacity        *int     `json:"capacity,omitempty"`
	IsActive        *bool    `json:"isActive,omitempty"`
}

// PublicBookingServiceResponse is the visitor-safe projection of a bookable
// service shown on the public booking page (no shop-internal bookkeeping).
type PublicBookingServiceResponse struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Description     string  `json:"description,omitempty"`
	DurationMinutes int     `json:"durationMinutes"`
	Price           float64 `json:"price"`
	Currency        string  `json:"currency"`
	Capacity        int     `json:"capacity"`
	ProductID       string  `json:"productId,omitempty"`
}

// PublicBookingLookupResponse is the limited guest-safe projection returned by
// the track-by-number lookup. It intentionally exposes no internal ids.
type PublicBookingLookupResponse struct {
	BookingNumber string    `json:"bookingNumber"`
	Status        string    `json:"status"`
	ServiceName   string    `json:"serviceName,omitempty"`
	ShopName      string    `json:"shopName,omitempty"`
	BookingDate   string    `json:"bookingDate,omitempty"`
	BookingTime   string    `json:"bookingTime,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

// ShopBookingSettings carries the merchant's booking rules stored in
// shops.page_design (written by the dashboard BookingSettingsTab).
type ShopBookingSettings struct {
	WorkStart         string // "09:00"
	WorkEnd           string // "21:00"
	SlotDuration      int    // minutes, fallback slot grid step
	AdvanceDays       int    // how far ahead booking is open
	AutoConfirm       bool
	MaxPerSlot        int
	PreventDuplicates bool
}

// BookingListFilter narrows the merchant dashboard list by time range
// (Cairo dates, inclusive) and status, with an explicit ordering.
type BookingListFilter struct {
	From   string
	To     string
	Status string
	Order  string // "asc" | "desc" (created_at / start_at aware)
}
