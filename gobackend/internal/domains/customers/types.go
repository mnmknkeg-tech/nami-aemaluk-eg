package customers

// Customer represents a customer entity
type Customer struct {
	ID          string  `json:"id"`
	UserID      string  `json:"user_id"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	Phone       string  `json:"phone"`
	Address     *string `json:"address,omitempty"`
	City        *string `json:"city,omitempty"`
	TotalOrders int64   `json:"total_orders"`
	TotalSpent  float64 `json:"total_spent"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// CustomerStats represents customer statistics
type CustomerStats struct {
	CustomerID      string  `json:"customer_id"`
	TotalOrders     int64   `json:"total_orders"`
	CompletedOrders int64   `json:"completed_orders"`
	TotalSpent      float64 `json:"total_spent"`
	AvgOrderValue   float64 `json:"avg_order_value"`
	LastOrderAt     *string `json:"last_order_at,omitempty"`
}
