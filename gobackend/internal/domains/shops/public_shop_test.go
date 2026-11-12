package shops

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPublicShopViewOmitsDraftBuilderConfig(t *testing.T) {
	shop := &Shop{
		ID:            "shop-1",
		Slug:          "example",
		BuilderConfig: map[string]any{"website": map[string]any{"draft": true}},
		PageDesign:    map[string]any{"primaryColor": "#123456"},
	}

	public := publicShopView(shop)
	encoded, err := json.Marshal(public)
	if err != nil {
		t.Fatalf("marshal public shop: %v", err)
	}
	if strings.Contains(string(encoded), "builderConfig") || strings.Contains(string(encoded), "draft") {
		t.Fatalf("public shop response exposed draft config: %s", encoded)
	}
	if public.PageDesign["primaryColor"] != "#123456" {
		t.Fatal("public legacy page design should remain available")
	}
	if shop.BuilderConfig == nil {
		t.Fatal("public view must not mutate the source shop")
	}

	listJSON, err := json.Marshal(publicShopViews([]Shop{*shop}))
	if err != nil {
		t.Fatalf("marshal public shop list: %v", err)
	}
	if strings.Contains(string(listJSON), "builderConfig") || strings.Contains(string(listJSON), "draft") {
		t.Fatalf("public shop list exposed draft config: %s", listJSON)
	}
}
