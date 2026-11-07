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

func TestProductAvailabilityUsesSalesChannel(t *testing.T) {
	product := OrderProduct{IsActive: false, AppActive: true}
	marketplace := "marketplace"
	website := "website"

	assert.True(t, productAvailableOnChannel(product, &marketplace))
	assert.False(t, productAvailableOnChannel(product, &website))
	assert.False(t, productAvailableOnChannel(product, nil))
}

func TestNormalizePaymentMethod(t *testing.T) {
	method, err := normalizePaymentMethod(pointer("cod"), true)
	assert.NoError(t, err)
	assert.Equal(t, "COD", *method)

	defaultMethod, err := normalizePaymentMethod(nil, true)
	assert.NoError(t, err)
	assert.Equal(t, "COD", *defaultMethod)

	method, err = normalizePaymentMethod(pointer("split"), false)
	assert.NoError(t, err)
	assert.Equal(t, "SPLIT", *method)

	_, err = normalizePaymentMethod(pointer("paid"), false)
	assert.Error(t, err)
}

func pointer(value string) *string { return &value }
