package users

import (
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
)

// UserProfile is the public representation of a user.
type UserProfile struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Email             string            `json:"email"`
	Phone             *string           `json:"phone,omitempty"`
	ExtraPhones       []string          `json:"extraPhones,omitempty"`
	DeliveryAddresses []auth.DeliveryAddress `json:"deliveryAddresses,omitempty"`
	Role              auth.Role         `json:"role"`
	IsActive          bool              `json:"isActive"`
	CreatedAt         time.Time         `json:"createdAt"`
	LastLogin         *time.Time        `json:"lastLogin,omitempty"`
}

// UpdateMeRequest represents a profile update payload.
type UpdateMeRequest struct {
	Name        string    `json:"name,omitempty" validate:"omitempty,min=1,max=80"`
	Phone       *string   `json:"phone,omitempty" validate:"omitempty"`
	ExtraPhones *[]string `json:"extraPhones,omitempty"`
}

// ReplaceAddressesRequest replaces the whole saved address book in one call —
// add/edit/delete are all expressed as a new list.
type ReplaceAddressesRequest struct {
	Addresses []auth.DeliveryAddress `json:"addresses" validate:"required,max=10,dive"`
}

// CourierListRequest represents the query parameters for listing couriers.
type CourierListRequest struct {
	Take     int    `query:"take"`
	Skip     int    `query:"skip"`
	Search   string `query:"search"`
	IsActive string `query:"isActive"`
}

// CreateCourierRequest represents the payload for creating a courier.
type CreateCourierRequest struct {
	Email    string  `json:"email" validate:"required,email"`
	Password string  `json:"password" validate:"required"`
	Name     string  `json:"name" validate:"required,min=1,max=80"`
	Phone    *string `json:"phone,omitempty"`
}

// CourierDetails bundles courier profile with optional runtime state.
type CourierDetails struct {
	Courier      UserProfile  `json:"courier"`
	State        any          `json:"state,omitempty"`
	Stats        CourierStats `json:"stats"`
	RecentOrders []any        `json:"recentOrders"`
}

// CourierStats holds aggregate order stats for a courier.
type CourierStats struct {
	TotalOrders      int     `json:"totalOrders"`
	ActiveOrders     int     `json:"activeOrders"`
	DeliveredOrders  int     `json:"deliveredOrders"`
	CancelledOrders  int     `json:"cancelledOrders"`
	DeliveredRevenue float64 `json:"deliveredRevenue"`
}
