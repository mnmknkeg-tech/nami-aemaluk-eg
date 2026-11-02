package shops

import (
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// defaultDashboardConfig returns the default layout_config for a category.
// It is intentionally minimal for Phase 3 and can be expanded as more modules are migrated.
func defaultDashboardConfig(category ShopCategory, activityID string) map[string]any {
	modules := []string{"dashboard", "products", "orders", "analytics", "settings"}
	switch category {
	case ShopCategoryRestaurant:
		modules = append(modules, "tables", "bookings")
	case ShopCategoryService:
		modules = append(modules, "services", "appointments")
	case ShopCategoryFashion, ShopCategoryRetail:
		modules = append(modules, "inventory", "offers")
	}
	cfg := map[string]any{
		"enabledModules": modules,
		"category":       string(category),
	}
	if activityID != "" {
		cfg["activityId"] = activityID
	}
	return cfg
}

// parseUpdateFields normalizes the raw update body into database column names.
func parseUpdateFields(body map[string]any) (map[string]any, error) {
	fields := make(map[string]any)

	if v, ok := getString(body, "name"); ok {
		v = strings.TrimSpace(v)
		if v == "" {
			return nil, errors.Validation("name_required", "الاسم مطلوب")
		}
		if len(v) > 120 {
			return nil, errors.Validation("name_too_long", "الاسم طويل جداً")
		}
		fields["name"] = v
	}
	if v, ok := getString(body, "description"); ok {
		fields["description"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "activity"); ok {
		fields["activity"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "category"); ok {
		cat := ShopCategory(strings.ToUpper(strings.TrimSpace(v)))
		switch cat {
		case ShopCategoryRetail, ShopCategoryRestaurant, ShopCategoryService,
			ShopCategoryElectronics, ShopCategoryFashion, ShopCategoryFood,
			ShopCategoryHealth, ShopCategoryOther:
			fields["category"] = string(cat)
		default:
			return nil, errors.Validation("invalid_category", "تصنيف المتجر غير صالح")
		}
	}
	if v, ok := getString(body, "governorate"); ok {
		fields["governorate"] = strings.TrimSpace(v)
	}
	if v, ok := getString(body, "city"); ok {
		fields["city"] = strings.TrimSpace(v)
	}
	if v, ok := getString(body, "addressDetailed"); ok {
		fields["address_detailed"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "address_detailed"); ok {
		fields["address_detailed"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "displayAddress"); ok {
		fields["display_address"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "display_address"); ok {
		fields["display_address"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "mapLabel"); ok {
		fields["map_label"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "map_label"); ok {
		fields["map_label"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getFloat(body, "latitude"); ok {
		fields["latitude"] = v
	}
	if v, ok := getFloat(body, "longitude"); ok {
		fields["longitude"] = v
	}
	if v, ok := getString(body, "locationSource"); ok {
		fields["location_source"] = nullIfEmpty(strings.ToLower(strings.TrimSpace(v)))
	}
	if v, ok := getString(body, "location_source"); ok {
		fields["location_source"] = nullIfEmpty(strings.ToLower(strings.TrimSpace(v)))
	}
	if v, ok := getFloat(body, "locationAccuracy"); ok {
		if *v < 0 {
			return nil, errors.Validation("location_accuracy_invalid", "دقة الموقع غير صالحة")
		}
		fields["location_accuracy"] = *v
	}
	if v, ok := getFloat(body, "location_accuracy"); ok {
		if *v < 0 {
			return nil, errors.Validation("location_accuracy_invalid", "دقة الموقع غير صالحة")
		}
		fields["location_accuracy"] = *v
	}
	if v, ok := getString(body, "phone"); ok {
		fields["phone"] = strings.TrimSpace(v)
	}
	if v, ok := getString(body, "email"); ok {
		v = strings.TrimSpace(v)
		if v != "" && !isEmailLike(v) {
			return nil, errors.Validation("invalid_email", "البريد الإلكتروني غير صالح")
		}
		fields["email"] = nullIfEmpty(v)
	}
	if v, ok := getString(body, "openingHours"); ok {
		fields["opening_hours"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "opening_hours"); ok {
		fields["opening_hours"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "logoUrl"); ok {
		fields["logo_url"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "logo_url"); ok {
		fields["logo_url"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "bannerUrl"); ok {
		fields["banner_url"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := getString(body, "banner_url"); ok {
		fields["banner_url"] = nullIfEmpty(strings.TrimSpace(v))
	}
	if v, ok := body["isActive"]; ok {
		if b, ok := v.(bool); ok {
			fields["is_active"] = b
		}
	}
	if v, ok := body["publicDisabled"]; ok {
		if b, ok := v.(bool); ok {
			fields["public_disabled"] = b
		}
	}
	if v, ok := body["public_disabled"]; ok {
		if b, ok := v.(bool); ok {
			fields["public_disabled"] = b
		}
	}
	if v, ok := body["deliveryDisabled"]; ok {
		if b, ok := v.(bool); ok {
			fields["delivery_disabled"] = b
		}
	}
	if v, ok := body["delivery_disabled"]; ok {
		if b, ok := v.(bool); ok {
			fields["delivery_disabled"] = b
		}
	}
	if v, ok := body["pageDesign"]; ok {
		fields["page_design"] = v
	}
	if v, ok := body["builderConfig"]; ok {
		fields["builder_config"] = v
	}
	if v, ok := body["customColors"]; ok {
		fields["custom_colors"] = v
	}
	if v, ok := body["customFonts"]; ok {
		fields["custom_fonts"] = v
	}
	if v, ok := body["layoutConfig"]; ok {
		fields["layout_config"] = v
	}
	if v, ok := body["addons"]; ok {
		fields["addons"] = v
	}

	return fields, nil
}

func getString(m map[string]any, key string) (string, bool) {
	v, ok := m[key]
	if !ok || v == nil {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

func getFloat(m map[string]any, key string) (*float64, bool) {
	v, ok := m[key]
	if !ok || v == nil {
		return nil, false
	}
	switch n := v.(type) {
	case float64:
		return &n, true
	case float32:
		f := float64(n)
		return &f, true
	case int:
		f := float64(n)
		return &f, true
	}
	return nil, false
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func anyLocationField(fields map[string]any) bool {
	for k := range fields {
		if k == "latitude" || k == "longitude" || k == "location_source" || k == "location_accuracy" {
			return true
		}
	}
	return false
}

func isEmailLike(s string) bool {
	return strings.Contains(s, "@") && strings.Contains(s, ".")
}
