package orders

import "testing"

func TestNormalizeEgyptianPhone(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"01012345678", "01012345678"},
		{" 010 1234 5678 ", "01012345678"},
		{"010-1234-5678", "01012345678"},
		{"+201012345678", "01012345678"},
		{"00201012345678", "01012345678"},
		{"201012345678", "01012345678"},
		{"1012345678", "01012345678"},      // dropped leading zero
		{"٠١٠١٢٣٤٥٦٧٨", "01012345678"},     // Arabic-Indic digits
		{"+٢٠١٠١٢٣٤٥٦٧٨", "01012345678"},   // Arabic digits + country prefix
		{"۰۱۰۱۲۳۴۵۶۷۸", "01012345678"},     // Eastern Arabic digits
		{"(010) 1234.5678", "01012345678"}, // punctuation
		{"0223456789", "0223456789"},       // Cairo landline
		{"", ""},
		{"   ", ""},
		{"abcdef", ""}, // garbage strips to nothing — validator/required check rejects
	}
	for _, c := range cases {
		if got := normalizeEgyptianPhone(c.in); got != c.want {
			t.Errorf("normalizeEgyptianPhone(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestIsValidEgyptianPhone(t *testing.T) {
	valid := []string{
		"01012345678", "01112345678", "01212345678", "01512345678",
		"0223456789", // landline
	}
	for _, p := range valid {
		if !isValidEgyptianPhone(p) {
			t.Errorf("isValidEgyptianPhone(%q) = false, want true", p)
		}
	}
	invalid := []string{
		"", "0101234567", // too short
		"010123456789", // too long
		"01312345678",  // invalid mobile prefix (013 not in 01[0125])
		"01812345678",  // invalid mobile prefix
		"abcdefghij",   // letters
		"1234567890",   // no leading zero
	}
	for _, p := range invalid {
		if isValidEgyptianPhone(p) {
			t.Errorf("isValidEgyptianPhone(%q) = true, want false", p)
		}
	}
}

func TestResolveUnitPriceVariantAndAddons(t *testing.T) {
	product := OrderProduct{
		ID:    "p1",
		Price: 50,
		MenuVariants: []any{
			map[string]any{
				"id":   "g1",
				"name": "الحجم",
				"sizes": []any{
					map[string]any{"id": "s1", "label": "صغير", "price": 50.0},
					map[string]any{"id": "s2", "label": "كبير", "price": 65.0},
					map[string]any{"id": "s3", "label": "بدون سعر"},
				},
			},
		},
		AddonsJSON: []any{
			map[string]any{
				"name": "إضافات",
				"options": []any{
					map[string]any{
						"id": "a1", "name": "جبنة", "price": 5.0,
						"variants": []any{
							map[string]any{"id": "v1", "label": "عادي", "price": 5.0},
							map[string]any{"id": "v2", "label": "إضافي", "price": 9.0},
						},
					},
					map[string]any{"id": "a2", "name": "صوص", "price": 3.0},
				},
			},
		},
	}

	cases := []struct {
		name string
		item CreateOrderItem
		want float64
	}{
		{
			name: "plain product, no variant/addons",
			item: CreateOrderItem{ProductID: "p1", Quantity: 1},
			want: 50,
		},
		{
			name: "large size replaces base price",
			item: CreateOrderItem{
				ProductID:        "p1",
				Quantity:         1,
				VariantSelection: map[string]any{"size": "كبير", "sizeLabel": "كبير", "price": 999999.0},
			},
			want: 65, // server price wins — client price ignored
		},
		{
			name: "unknown size label keeps base price",
			item: CreateOrderItem{
				ProductID:        "p1",
				Quantity:         1,
				VariantSelection: map[string]any{"size": "ضخم", "sizeLabel": "ضخم", "price": 1.0},
			},
			want: 50, // forged size label cannot undercharge
		},
		{
			name: "forged tiny size price is ignored",
			item: CreateOrderItem{
				ProductID:        "p1",
				Quantity:         1,
				VariantSelection: map[string]any{"sizeLabel": "كبير", "price": 0.5},
			},
			want: 65,
		},
		{
			name: "size without a price falls back to base",
			item: CreateOrderItem{
				ProductID:        "p1",
				Quantity:         1,
				VariantSelection: map[string]any{"sizeLabel": "بدون سعر", "price": 40.0},
			},
			want: 50,
		},
		{
			name: "addons priced from server catalog",
			item: CreateOrderItem{
				ProductID: "p1",
				Quantity:  1,
				Addons: []any{
					map[string]any{"name": "جبنة", "price": 0.0},
					map[string]any{"name": "صوص", "price": 123.0},
				},
			},
			want: 58, // 50 + 5 + 3 (server prices, client prices ignored)
		},
		{
			name: "addon variant label picks server variant price",
			item: CreateOrderItem{
				ProductID: "p1",
				Quantity:  1,
				Addons: []any{
					map[string]any{"name": "جبنة", "variant": "إضافي", "price": 1.0},
				},
			},
			want: 59, // 50 + 9
		},
		{
			name: "unknown addons contribute nothing",
			item: CreateOrderItem{
				ProductID: "p1",
				Quantity:  1,
				Addons: []any{
					map[string]any{"name": "مش موجودة", "price": -100},
				},
			},
			want: 50,
		},
		{
			name: "negative addon prices are clamped to zero",
			item: CreateOrderItem{
				ProductID: "p1",
				Quantity:  1,
				Addons: []any{
					map[string]any{"name": "جبنة", "price": -25},
				},
			},
			want: 55, // 50 + 5 (server price, clamped)
		},
		{
			name: "size + addons combined",
			item: CreateOrderItem{
				ProductID:        "p1",
				Quantity:         1,
				VariantSelection: map[string]any{"sizeLabel": "كبير"},
				Addons:           []any{map[string]any{"name": "صوص"}},
			},
			want: 68, // 65 + 3
		},
	}

	for _, c := range cases {
		if got := resolveUnitPrice(product, c.item); got != c.want {
			t.Errorf("%s: resolveUnitPrice = %v, want %v", c.name, got, c.want)
		}
	}
}

func TestIsValidTransitionWithReturned(t *testing.T) {
	// RETURNED is reachable from every non-terminal state (POS full-return).
	for _, from := range []OrderStatus{
		OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing,
		OrderStatusReady, OrderStatusDelivered,
	} {
		if !isValidTransition(from, OrderStatusReturned) {
			t.Errorf("%s -> RETURNED should be valid", from)
		}
	}
	// RETURNED is terminal.
	for _, to := range []OrderStatus{
		OrderStatusPending, OrderStatusConfirmed, OrderStatusPreparing,
		OrderStatusReady, OrderStatusDelivered, OrderStatusCancelled,
		OrderStatusRefunded, OrderStatusReturned,
	} {
		if isValidTransition(OrderStatusReturned, to) {
			t.Errorf("RETURNED -> %s should be invalid", to)
		}
	}
	// Existing terminal rules still hold.
	if isValidTransition(OrderStatusCancelled, OrderStatusPending) {
		t.Error("CANCELLED -> PENDING should be invalid")
	}
	if isValidTransition(OrderStatusRefunded, OrderStatusDelivered) {
		t.Error("REFUNDED -> DELIVERED should be invalid")
	}
}
