package shops

import (
	"context"
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"go.uber.org/zap"
)

// TestDefaultDashboardConfig verifies category-specific default modules.
func TestDefaultDashboardConfig(t *testing.T) {
	cfgRetail := defaultDashboardConfig(ShopCategoryRetail, "")
	modsRetail, ok := cfgRetail["enabledModules"].([]string)
	if !ok {
		t.Fatalf("expected []string for enabledModules, got %T", cfgRetail["enabledModules"])
	}
	foundInventory := false
	for _, m := range modsRetail {
		if m == "inventory" {
			foundInventory = true
			break
		}
	}
	if !foundInventory {
		t.Errorf("expected Retail to have 'inventory', got %v", modsRetail)
	}

	cfgRestaurant := defaultDashboardConfig(ShopCategoryRestaurant, "")
	modsRestaurant := cfgRestaurant["enabledModules"].([]string)
	foundBookings := false
	for _, m := range modsRestaurant {
		if m == "bookings" {
			foundBookings = true
			break
		}
	}
	if !foundBookings {
		t.Errorf("expected Restaurant to have 'bookings', got %v", modsRestaurant)
	}
}

// TestParseUpdateFields verifies update payload normalization and validation.
func TestParseUpdateFields(t *testing.T) {
	// Valid update
	body := map[string]any{
		"name":     " متجر الأمل ",
		"category": "RETAIL",
	}
	fields, err := parseUpdateFields(body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fields["name"] != "متجر الأمل" {
		t.Errorf("expected trimmed name 'متجر الأمل', got %v", fields["name"])
	}
	if fields["category"] != "RETAIL" {
		t.Errorf("expected category 'RETAIL', got %v", fields["category"])
	}

	// Invalid category
	invalidBody := map[string]any{
		"category": "INVALID_CAT",
	}
	_, err = parseUpdateFields(invalidBody)
	if err == nil {
		t.Error("expected error for invalid category, got nil")
	}

	// Empty name
	emptyNameBody := map[string]any{
		"name": "   ",
	}
	_, err = parseUpdateFields(emptyNameBody)
	if err == nil {
		t.Error("expected error for empty name, got nil")
	}
}

// TestCheckActorShopAccess verifies ownership and admin authorization.
func TestCheckActorShopAccess(t *testing.T) {
	svc := &BuilderService{
		logger: zap.NewNop(),
	}

	ctx := context.Background()

	// 1. Admin can access any shop
	admin := middleware.AuthUser{ID: "admin_1", Role: "ADMIN", ShopID: ""}
	res, err := svc.CheckActorShopAccess(ctx, admin, "shop_123")
	if err != nil || res != "shop_123" {
		t.Errorf("admin should access any shop, got res=%v, err=%v", res, err)
	}

	// 2. Merchant with matching JWT ShopID can access
	merchant := middleware.AuthUser{ID: "user_1", Role: "MERCHANT", ShopID: "shop_123"}
	res, err = svc.CheckActorShopAccess(ctx, merchant, "shop_123")
	if err != nil || res != "shop_123" {
		t.Errorf("merchant should access matching shop, got res=%v, err=%v", res, err)
	}

	// 3. Merchant accessing different shop is forbidden
	res, err = svc.CheckActorShopAccess(ctx, merchant, "other_shop")
	if err == nil {
		t.Error("merchant accessing foreign shop should be forbidden, got nil error")
	}
}

// TestBuilderCapabilityModes verifies sandbox policies for visual vs full_code.
func TestBuilderCapabilityModes(t *testing.T) {
	// Visual mode rejects raw script tags
	htmlWithScript := "<p>Hello</p><script>alert('xss')</script>"
	if err := dangerousHTMLError(htmlWithScript, ModeVisual); err == nil {
		t.Error("visual mode should reject <script> tags")
	}

	// Visual mode rejects inline event handlers
	htmlWithEvent := `<img src="x" onerror="alert(1)">`
	if err := dangerousHTMLError(htmlWithEvent, ModeVisual); err == nil {
		t.Error("visual mode should reject inline onerror handlers")
	}

	// Safe HTML in ModeHTMLOnly is allowed
	safeHTML := `<div class="p-4"><p>Safe content</p></div>`
	if err := dangerousHTMLError(safeHTML, ModeHTMLOnly); err != nil {
		t.Errorf("html_only mode should allow safe HTML, got: %v", err)
	}
}
