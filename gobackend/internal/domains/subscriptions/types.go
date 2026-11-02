package subscriptions

import (
	"encoding/json"
	"time"
)

// SubscriptionPlan represents a subscription plan template
type SubscriptionPlan struct {
	ID           string          `json:"id"`
	ShopID       string          `json:"shop_id"`
	Name         string          `json:"name"`
	NameAr       *string         `json:"name_ar,omitempty"`
	Description  *string         `json:"description,omitempty"`
	BillingCycle string          `json:"billing_cycle"` // monthly | yearly | quarterly | weekly | custom
	DurationDays int             `json:"duration_days"`
	Price        float64         `json:"price"`
	Currency     string          `json:"currency"`
	Features     json.RawMessage `json:"features,omitempty"`
	MaxMembers   *int            `json:"max_members,omitempty"`
	TrialDays    int             `json:"trial_days"`
	SortOrder    int             `json:"sort_order"`
	IsActive     bool            `json:"is_active"`
	IsFeatured   bool            `json:"is_featured"`
	Color        *string         `json:"color,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`

	// Computed fields
	ActiveMembers int `json:"active_members,omitempty"`
}

// MemberSubscription represents a customer's subscription record
type MemberSubscription struct {
	ID             string     `json:"id"`
	ShopID         string     `json:"shop_id"`
	CustomerID     string     `json:"customer_id"`
	PlanID         string     `json:"plan_id"`
	PlanName       string     `json:"plan_name"`
	BillingCycle   string     `json:"billing_cycle"`
	Price          float64    `json:"price"`
	Currency       string     `json:"currency"`
	StartDate      string     `json:"start_date"` // DATE as string YYYY-MM-DD
	EndDate        string     `json:"end_date"`
	TrialEndDate   *string    `json:"trial_end_date,omitempty"`
	Status         string     `json:"status"`         // active | expired | frozen | cancelled | pending | trial
	PaymentStatus  string     `json:"payment_status"` // paid | pending | overdue | refunded | waived
	PaymentMethod  *string    `json:"payment_method,omitempty"`
	PaymentRef     *string    `json:"payment_ref,omitempty"`
	AutoRenew      bool       `json:"auto_renew"`
	FrozenAt       *time.Time `json:"frozen_at,omitempty"`
	FrozenDays     int        `json:"frozen_days"`
	CancelledAt    *time.Time `json:"cancelled_at,omitempty"`
	CancelReason   *string    `json:"cancel_reason,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	RenewedFromID  *string    `json:"renewed_from_id,omitempty"`
	CreatedBy      *string    `json:"created_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	// Joined fields (populated in list queries)
	CustomerName  string `json:"customer_name,omitempty"`
	CustomerPhone string `json:"customer_phone,omitempty"`
	CustomerEmail string `json:"customer_email,omitempty"`
}

// SubscriptionStats represents aggregated stats for the dashboard
type SubscriptionStats struct {
	TotalActive      int     `json:"total_active"`
	TotalExpired     int     `json:"total_expired"`
	TotalFrozen      int     `json:"total_frozen"`
	TotalCancelled   int     `json:"total_cancelled"`
	ExpiringThisWeek int     `json:"expiring_this_week"`
	ExpiringThisMonth int    `json:"expiring_this_month"`
	OverduePayments  int     `json:"overdue_payments"`
	MonthlyRevenue   float64 `json:"monthly_revenue"`
	TotalRevenue     float64 `json:"total_revenue"`
}

// --- Request DTOs ---

type CreatePlanRequest struct {
	Name         string          `json:"name" validate:"required,min=2,max=120"`
	NameAr       *string         `json:"name_ar,omitempty"`
	Description  *string         `json:"description,omitempty"`
	BillingCycle string          `json:"billing_cycle" validate:"required,oneof=monthly yearly quarterly weekly custom"`
	DurationDays int             `json:"duration_days" validate:"required,min=1"`
	Price        float64         `json:"price" validate:"min=0"`
	Currency     string          `json:"currency"`
	Features     json.RawMessage `json:"features,omitempty"`
	MaxMembers   *int            `json:"max_members,omitempty"`
	TrialDays    int             `json:"trial_days"`
	SortOrder    int             `json:"sort_order"`
	IsActive     bool            `json:"is_active"`
	IsFeatured   bool            `json:"is_featured"`
	Color        *string         `json:"color,omitempty"`
}

type UpdatePlanRequest struct {
	Name         *string         `json:"name,omitempty" validate:"omitempty,min=2,max=120"`
	NameAr       *string         `json:"name_ar,omitempty"`
	Description  *string         `json:"description,omitempty"`
	BillingCycle *string         `json:"billing_cycle,omitempty" validate:"omitempty,oneof=monthly yearly quarterly weekly custom"`
	DurationDays *int            `json:"duration_days,omitempty" validate:"omitempty,min=1"`
	Price        *float64        `json:"price,omitempty" validate:"omitempty,min=0"`
	Currency     *string         `json:"currency,omitempty"`
	Features     json.RawMessage `json:"features,omitempty"`
	MaxMembers   *int            `json:"max_members,omitempty"`
	TrialDays    *int            `json:"trial_days,omitempty"`
	SortOrder    *int            `json:"sort_order,omitempty"`
	IsActive     *bool           `json:"is_active,omitempty"`
	IsFeatured   *bool           `json:"is_featured,omitempty"`
	Color        *string         `json:"color,omitempty"`
}

type CreateSubscriptionRequest struct {
	CustomerID    string  `json:"customer_id" validate:"required"`
	PlanID        string  `json:"plan_id" validate:"required"`
	StartDate     string  `json:"start_date" validate:"required"` // YYYY-MM-DD
	PaymentStatus string  `json:"payment_status" validate:"required,oneof=paid pending overdue waived"`
	PaymentMethod *string `json:"payment_method,omitempty"`
	PaymentRef    *string `json:"payment_ref,omitempty"`
	AutoRenew     bool    `json:"auto_renew"`
	Notes         *string `json:"notes,omitempty"`
}

type UpdateSubscriptionRequest struct {
	Status        *string `json:"status,omitempty" validate:"omitempty,oneof=active expired frozen cancelled pending trial"`
	PaymentStatus *string `json:"payment_status,omitempty" validate:"omitempty,oneof=paid pending overdue refunded waived"`
	PaymentMethod *string `json:"payment_method,omitempty"`
	PaymentRef    *string `json:"payment_ref,omitempty"`
	AutoRenew     *bool   `json:"auto_renew,omitempty"`
	Notes         *string `json:"notes,omitempty"`
	CancelReason  *string `json:"cancel_reason,omitempty"`
}

type RenewSubscriptionRequest struct {
	StartDate     string  `json:"start_date" validate:"required"` // YYYY-MM-DD
	PaymentStatus string  `json:"payment_status" validate:"required,oneof=paid pending overdue waived"`
	PaymentMethod *string `json:"payment_method,omitempty"`
	PaymentRef    *string `json:"payment_ref,omitempty"`
}

// PublicSubscribeRequest represents a customer subscribing from the public website
type PublicSubscribeRequest struct {
	PlanID        string  `json:"plan_id"`
	PlanName      string  `json:"plan_name,omitempty"`
	PlanPrice     float64 `json:"plan_price,omitempty"`
	CustomerName  string  `json:"customer_name" validate:"required,min=2,max=100"`
	CustomerPhone string  `json:"customer_phone" validate:"required,min=7,max=20"`
	CustomerEmail string  `json:"customer_email,omitempty"`
	PaymentMethod string  `json:"payment_method,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}


// --- Response DTOs ---

type PlanListResponse struct {
	Success bool               `json:"success"`
	Data    []SubscriptionPlan `json:"data"`
	Total   int                `json:"total"`
	Error   string             `json:"error,omitempty"`
}

type PlanResponse struct {
	Success bool              `json:"success"`
	Data    *SubscriptionPlan `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
}

type SubscriptionListResponse struct {
	Success bool                 `json:"success"`
	Data    []MemberSubscription `json:"data"`
	Total   int                  `json:"total"`
	Error   string               `json:"error,omitempty"`
}

type SubscriptionResponse struct {
	Success bool                `json:"success"`
	Data    *MemberSubscription `json:"data,omitempty"`
	Error   string              `json:"error,omitempty"`
}

type StatsResponse struct {
	Success bool               `json:"success"`
	Data    *SubscriptionStats `json:"data,omitempty"`
	Error   string             `json:"error,omitempty"`
}
