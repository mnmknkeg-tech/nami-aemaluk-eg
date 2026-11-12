package cartevent

import (
	"time"
)

// CartEvent represents a cart event record.
type CartEvent struct {
	ID            string     `json:"id"`
	ShopID        string     `json:"shopId"`
	ProductID     string     `json:"productId"`
	Event         string     `json:"event"`
	UserID        *string    `json:"userId,omitempty"`
	SessionID     *string    `json:"sessionId,omitempty"`
	CustomerName  *string    `json:"customerName,omitempty"`
	CustomerEmail *string    `json:"customerEmail,omitempty"`
	CustomerPhone *string    `json:"customerPhone,omitempty"`
	Quantity      int        `json:"quantity"`
	UnitPrice     float64    `json:"unitPrice"`
	Currency      string     `json:"currency"`
	Metadata      []byte     `json:"-"`
	IsRecovered   bool       `json:"isRecovered"`
	RecoveredAt   *time.Time `json:"recoveredAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// TrackRequest is the payload for tracking a cart event.
type TrackRequest struct {
	ShopID        string         `json:"shopId" validate:"required"`
	ProductID     string         `json:"productId" validate:"required"`
	Event         string         `json:"event" validate:"required"`
	UserID        string         `json:"userId,omitempty"`
	SessionID     string         `json:"sessionId,omitempty"`
	CustomerName  string         `json:"customerName,omitempty"`
	CustomerEmail string         `json:"customerEmail,omitempty"`
	CustomerPhone string         `json:"customerPhone,omitempty"`
	Quantity      int            `json:"quantity,omitempty"`
	UnitPrice     float64        `json:"unitPrice,omitempty"`
	Currency      string         `json:"currency,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

// CartEventResponse is the serialized cart event response.
type CartEventResponse struct {
	ID            string     `json:"id"`
	ShopID        string     `json:"shopId"`
	ProductID     string     `json:"productId"`
	Event         string     `json:"event"`
	UserID        string     `json:"userId,omitempty"`
	SessionID     string     `json:"sessionId,omitempty"`
	CustomerName  string     `json:"customerName,omitempty"`
	CustomerEmail string     `json:"customerEmail,omitempty"`
	CustomerPhone string     `json:"customerPhone,omitempty"`
	Quantity      int        `json:"quantity"`
	UnitPrice     float64    `json:"unitPrice"`
	Currency      string     `json:"currency"`
	IsRecovered   bool       `json:"isRecovered"`
	RecoveredAt   *time.Time `json:"recoveredAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// CartStatsResponse represents cart event statistics.
type CartStatsResponse struct {
	AddedToCart      int     `json:"addedToCart"`
	CheckoutStarted  int     `json:"checkoutStarted"`
	PaymentCompleted int     `json:"paymentCompleted"`
	Abandoned        int     `json:"abandoned"`
	Recovered        int     `json:"recovered"`
	AbandonmentRate  float64 `json:"abandonmentRate"`
	RecoveryRate     float64 `json:"recoveryRate"`
}

// ListAbandonedResponse represents the abandoned carts list response.
type ListAbandonedResponse struct {
	Items []CartEventResponse `json:"items"`
	Total int                 `json:"total"`
	Page  int                 `json:"page"`
	Limit int                `json:"limit"`
}
