package orders

import "time"

// OrderStatus mirrors the Prisma OrderStatus enum.
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "PENDING"
	OrderStatusConfirmed OrderStatus = "CONFIRMED"
	OrderStatusPreparing OrderStatus = "PREPARING"
	OrderStatusReady     OrderStatus = "READY"
	OrderStatusDelivered OrderStatus = "DELIVERED"
	OrderStatusCancelled OrderStatus = "CANCELLED"
	OrderStatusRefunded  OrderStatus = "REFUNDED"
)

// isValidOrderStatus reports whether s is one of the known order statuses.
func isValidOrderStatus(s OrderStatus) bool {
	switch s {
	case OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing,
		OrderStatusReady, OrderStatusDelivered, OrderStatusCancelled, OrderStatusRefunded:
		return true
	}
	return false
}

// Order represents a customer order.
type Order struct {
	ID                    string      `json:"id"`
	Total                 float64     `json:"total"`
	Status                OrderStatus `json:"status"`
	PaymentMethod         *string     `json:"paymentMethod,omitempty"`
	PaymentStatus         *string     `json:"paymentStatus,omitempty"`
	Notes                 *string     `json:"notes,omitempty"`
	CustomerPhone         *string     `json:"customerPhone,omitempty"`
	DeliveryAddressManual *string     `json:"deliveryAddressManual,omitempty"`
	DeliveryLat           *float64    `json:"deliveryLat,omitempty"`
	DeliveryLng           *float64    `json:"deliveryLng,omitempty"`
	DeliveryNote          *string     `json:"deliveryNote,omitempty"`
	CustomerNote          *string     `json:"customerNote,omitempty"`
	UserID                string      `json:"userId"`
	ShopID                string      `json:"shopId"`
	CustomerID            *string     `json:"customerId,omitempty"` // العميل المركزي
	CourierID             *string     `json:"courierId,omitempty"`
	PosShiftID            *string     `json:"posShiftId,omitempty"`
	HandedToCourierAt     *time.Time  `json:"handedToCourierAt,omitempty"`
	CodCollectedAt        *time.Time  `json:"codCollectedAt,omitempty"`
	DeliveredAt           *time.Time  `json:"deliveredAt,omitempty"`
	Source                string      `json:"source"`
	Items                 []OrderItem `json:"items"`
	CreatedAt             time.Time   `json:"createdAt"`
	UpdatedAt             time.Time   `json:"updatedAt"`
}

// OrderItem represents a line item in an order.
type OrderItem struct {
	ID               string  `json:"id"`
	OrderID          string  `json:"orderId"`
	ProductID        string  `json:"productId"`
	ProductName      string  `json:"productName"`
	Quantity         int     `json:"quantity"`
	Price            float64 `json:"price"`
	Addons           []any   `json:"addons,omitempty"`
	VariantSelection any     `json:"variantSelection,omitempty"`
}

// CreateOrderItem is the input for an order line.
type CreateOrderItem struct {
	ProductID        string `json:"productId" validate:"required"`
	Quantity         int    `json:"quantity" validate:"required,min=1"`
	Addons           []any  `json:"addons,omitempty"`
	VariantSelection any    `json:"variantSelection,omitempty"`
}

// CustomerInfo is the nested customer object sent by the frontend.
type CustomerInfo struct {
	Name     string   `json:"name,omitempty"`
	Phone    string   `json:"phone,omitempty"`
	City     string   `json:"city,omitempty"`
	District string   `json:"district,omitempty"`
	Address  string   `json:"address,omitempty"`
	Notes    string   `json:"notes,omitempty"`
	Lat      *float64 `json:"lat,omitempty"`
	Lng      *float64 `json:"lng,omitempty"`
}

// CreateOrderRequest is the payload for creating an order.
type CreateOrderRequest struct {
	ShopID                string            `json:"shopId" validate:"required"`
	Items                 []CreateOrderItem `json:"items" validate:"required,min=1,dive"`
	Total                 *float64          `json:"total,omitempty"`
	PaymentMethod         *string           `json:"paymentMethod,omitempty"`
	PaymentStatus         *string           `json:"paymentStatus,omitempty"`
	Notes                 *string           `json:"notes,omitempty"`
	Customer              *CustomerInfo     `json:"customer,omitempty"`
	CustomerPhone         *string           `json:"customerPhone,omitempty"`
	DeliveryAddressManual *string           `json:"deliveryAddressManual,omitempty"`
	DeliveryLat           *float64          `json:"deliveryLat,omitempty"`
	DeliveryLng           *float64          `json:"deliveryLng,omitempty"`
	DeliveryNote          *string           `json:"deliveryNote,omitempty"`
	CustomerNote          *string           `json:"customerNote,omitempty"`
	Source                *string           `json:"source,omitempty"`
	Status                *string           `json:"status,omitempty"`
	// PosShiftID links this order to a POS shift. Sent by the cashier desktop
	// syncer so refreshMetrics can use a direct join instead of time-window.
	PosShiftID            *string           `json:"posShiftId,omitempty"`
}

// UpdateOrderRequest updates order status and metadata.
type UpdateOrderRequest struct {
	Status          *string `json:"status,omitempty" validate:"omitempty,oneof=PENDING CONFIRMED PREPARING READY DELIVERED CANCELLED REFUNDED"`
	Notes           *string `json:"notes,omitempty"`
	CodCollected    *bool   `json:"codCollected,omitempty"`
	HandedToCourier *bool   `json:"handedToCourier,omitempty"`
}

// CourierUpdateRequest is the payload for a courier update.
type CourierUpdateRequest struct {
	Status       *string `json:"status,omitempty" validate:"omitempty,oneof=DELIVERED CANCELLED"`
	CodCollected *bool   `json:"codCollected,omitempty"`
}

// AssignCourierRequest assigns a courier to an order.
type AssignCourierRequest struct {
	CourierID string `json:"courierId" validate:"required"`
}

// OrderListRequest is the query for listing orders.
type OrderListRequest struct {
	ShopID string     `query:"shopId"`
	UserID string     `query:"userId"`
	From   *time.Time `query:"from"`
	To     *time.Time `query:"to"`
	Page   int        `query:"page"`
	Limit  int        `query:"limit"`
}

// CourierOrderListRequest is the query for courier orders.
type CourierOrderListRequest struct {
	Page  int `query:"page"`
	Limit int `query:"limit"`
}
