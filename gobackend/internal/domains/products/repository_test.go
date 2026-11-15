package products

import (
	"strings"
	"testing"
)

func TestBuildWhereBasics(t *testing.T) {
	opts := listOptions{ShopID: "shop-1", Active: true}
	where, args := buildWhere(opts)

	if !strings.Contains(where, "p.shop_id = $1") {
		t.Fatalf("expected shop_id filter, got: %q", where)
	}
	if !strings.Contains(where, "p.is_active = true") {
		t.Fatalf("expected is_active filter, got: %q", where)
	}
	// public/default mode must exclude hidden categories
	if !strings.Contains(where, excludeHiddenCategoriesSQL) {
		t.Fatalf("expected hidden categories exclusion, got: %q", where)
	}
	if len(args) != 1 || args[0] != "shop-1" {
		t.Fatalf("expected 1 arg [shop-1], got %#v", args)
	}
}

func TestBuildWhereIncludeImageMap(t *testing.T) {
	opts := listOptions{ShopID: "shop-1", Filter: ProductFilter{IncludeImageMap: true}}
	where, _ := buildWhere(opts)

	if strings.Contains(where, excludeHiddenCategoriesSQL) {
		t.Fatalf("includeImageMap should not apply hidden-categories exclusion, got: %q", where)
	}
	if !strings.Contains(where, "__DUPLICATE__AUTO__") {
		t.Fatalf("includeImageMap should still exclude auto-duplicates, got: %q", where)
	}
}

func TestBuildWhereSearch(t *testing.T) {
	f := ProductFilter{Search: "كرسي"}
	opts := listOptions{ShopID: "shop-1", Active: true, Filter: f}
	where, args := buildWhere(opts)

	if !strings.Contains(where, "p.name ILIKE $2") {
		t.Fatalf("expected name ILIKE $2, got: %q", where)
	}
	if !strings.Contains(where, "p.description ILIKE $2") {
		t.Fatalf("expected description ILIKE $2, got: %q", where)
	}
	if len(args) != 2 {
		t.Fatalf("expected 2 args, got %d: %#v", len(args), args)
	}
	if args[1] != "%كرسي%" {
		t.Fatalf("expected search pattern %q, got %#v", "%كرسي%", args[1])
	}
}

func TestBuildWhereCategoryAndPrice(t *testing.T) {
	f := ProductFilter{Category: "أثاث", MinPrice: 5.0, MaxPrice: 100.0}
	opts := listOptions{ShopID: "shop-1", Filter: f}
	where, args := buildWhere(opts)

	// shop_id ($1), category ($2), min ($3), max ($4)
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d: %#v", len(args), args)
	}
	if !strings.Contains(where, "p.price >= $3") || !strings.Contains(where, "p.price <= $4") {
		t.Fatalf("expected price range filters, got: %q", where)
	}
	if !strings.Contains(where, "p.category = $2") {
		t.Fatalf("expected category filter, got: %q", where)
	}
}

func TestOrderBySQL(t *testing.T) {
	cases := map[string]string{
		"price_asc":  "ORDER BY p.price ASC",
		"price_desc": "ORDER BY p.price DESC",
		"name":       "ORDER BY p.name ASC",
		"oldest":     "ORDER BY p.created_at ASC",
		"":           "ORDER BY p.created_at DESC",
		"garbage":    "ORDER BY p.created_at DESC",
	}
	for input, expected := range cases {
		got := orderBySQL(input)
		if !strings.Contains(got, expected) {
			t.Fatalf("orderBySQL(%q) = %q, want to contain %q", input, got, expected)
		}
	}
}

// Market surface (AppActive) must exclude products of shops hidden from the
// marketplace (public_disabled), while the merchant-site surface (Active,
// "site") must NOT — a hidden merchant's published site keeps working.
func TestBuildWhereMarketSurfaceExcludesHiddenShops(t *testing.T) {
	marketOpts := listOptions{ShopID: "shop-1", AppActive: true}
	where, _ := buildWhere(marketOpts)

	if !strings.Contains(where, "public_disabled = false") {
		t.Fatalf("market surface must filter public_disabled, got: %q", where)
	}
	if !strings.Contains(where, "s.is_active = true") || !strings.Contains(where, "s.status = 'APPROVED'") {
		t.Fatalf("market surface must filter shop is_active+APPROVED, got: %q", where)
	}

	siteOpts := listOptions{ShopID: "shop-1", Active: true}
	where, _ = buildWhere(siteOpts)
	if strings.Contains(where, "public_disabled") {
		t.Fatalf("site surface must NOT filter by shop visibility, got: %q", where)
	}
}
