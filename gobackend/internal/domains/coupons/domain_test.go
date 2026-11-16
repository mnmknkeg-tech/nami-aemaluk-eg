package coupons

import (
	"testing"
	"time"
)

func validTestCoupon(kind string) Coupon {
	return Coupon{
		ID: "coupon-1",
		ShopID: "shop-1",
		Code: "TEST",
		Type: kind,
		Value: 10,
		MinOrderValue: 0,
		Status: "active",
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func TestValidatePercentageCoupon(t *testing.T) {
	got, err := Validate(validTestCoupon("percentage"), 200, time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("Validate returned error: %v", err)
	}
	if got != 20 {
		t.Fatalf("discount = %v, want 20", got)
	}
}

func TestValidateFixedCouponCapsAtSubtotal(t *testing.T) {
	got, err := Validate(validTestCoupon("fixed"), 5, time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("Validate returned error: %v", err)
	}
	if got != 5 {
		t.Fatalf("discount = %v, want 5", got)
	}
}

func TestValidateRejectsCouponTypesWithoutPricingSupport(t *testing.T) {
	now := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	for _, kind := range []string{"free_shipping", "buy_x_get_y", "unexpected"} {
		t.Run(kind, func(t *testing.T) {
			if _, err := Validate(validTestCoupon(kind), 200, now); err == nil {
				t.Fatalf("Validate(%q) should reject unsupported coupon type", kind)
			}
		})
	}
}
