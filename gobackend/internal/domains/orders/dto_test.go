package orders

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// The whitelist guards the create path: only trusted actors (merchant/admin on
// their own shop) may pick an initial status, and even they cannot write an
// arbitrary string into the orders table.
func TestIsValidOrderStatus(t *testing.T) {
	valid := []OrderStatus{
		OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing,
		OrderStatusReady, OrderStatusDelivered, OrderStatusCancelled, OrderStatusRefunded,
	}
	for _, s := range valid {
		assert.True(t, isValidOrderStatus(s), "expected %q to be valid", s)
	}

	invalid := []OrderStatus{
		"", "PAID", "SHIPPED", "pending ", "PENDING; DROP TABLE orders",
	}
	for _, s := range invalid {
		assert.False(t, isValidOrderStatus(s), "expected %q to be invalid", s)
	}
}
