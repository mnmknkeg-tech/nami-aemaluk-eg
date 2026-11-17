package shopimagemap

import (
	"encoding/json"
	"fmt"
)

// The dashboard editor persists sections and hotspots inline inside the
// layout JSON document it PATCHes, so that document is the source of truth.
// The normalized shop_image_sections / shop_image_hotspots tables are read
// first (they may be populated by other writers in the future); when they
// yield nothing, these helpers rebuild the editable content from the layout
// JSON so saved hotspots are always returned to the editor and to customers.

func layoutDoc(raw []byte) map[string]json.RawMessage {
	doc := map[string]json.RawMessage{}
	if len(raw) == 0 {
		return doc
	}
	_ = json.Unmarshal(raw, &doc)
	return doc
}

// sectionsFromLayout rebuilds sections stored under "sections" in the
// layout document.
func sectionsFromLayout(mapID string, raw []byte) []ImageSection {
	items, ok := layoutDoc(raw)["sections"]
	if !ok {
		return nil
	}
	var rows []map[string]any
	if json.Unmarshal(items, &rows) != nil {
		return nil
	}
	out := make([]ImageSection, 0, len(rows))
	for i, r := range rows {
		s := ImageSection{
			ID:        str(r["id"], fmt.Sprintf("sec_layout_%d", i)),
			MapID:     mapID,
			Name:      str(r["name"], ""),
			SortOrder: numInt(r["sortOrder"], i),
		}
		if v, ok := strPtr(r["imageUrl"], r["image_url"]); ok {
			s.ImageURL = v
		}
		if v, ok := intPtr(r["width"]); ok {
			s.Width = v
		}
		if v, ok := intPtr(r["height"]); ok {
			s.Height = v
		}
		out = append(out, s)
	}
	return out
}

// hotspotsFromLayout rebuilds hotspots stored under "hotspots" in the
// layout document.
func hotspotsFromLayout(mapID string, raw []byte) []ImageHotspot {
	items, ok := layoutDoc(raw)["hotspots"]
	if !ok {
		return nil
	}
	var rows []map[string]any
	if json.Unmarshal(items, &rows) != nil {
		return nil
	}
	out := make([]ImageHotspot, 0, len(rows))
	for i, r := range rows {
		h := ImageHotspot{
			ID:        str(r["id"], fmt.Sprintf("hs_layout_%d", i)),
			MapID:     mapID,
			X:         num(r["x"]),
			Y:         num(r["y"]),
			Width:     num(r["width"]),
			Height:    num(r["height"]),
			Shape:     str(r["shape"], "rect"),
			SortOrder: numInt(r["sortOrder"], i),
		}
		if v, ok := strPtr(r["sectionId"], r["section_id"]); ok {
			h.SectionID = v
		}
		if v, ok := strPtr(r["productId"], r["product_id"]); ok {
			h.ProductID = v
		}
		if v, ok := strPtr(r["label"]); ok {
			h.Label = v
		}
		if v, ok := numPtr(r["priceOverride"], r["price_override"]); ok {
			h.PriceOverride = v
		}
		out = append(out, h)
	}
	return out
}

func str(v any, def string) string {
	if s, ok := v.(string); ok && s != "" {
		return s
	}
	return def
}

func strPtr(vs ...any) (*string, bool) {
	for _, v := range vs {
		switch t := v.(type) {
		case string:
			if t != "" {
				s := t
				return &s, true
			}
		case nil:
			// explicit null — report a nil pointer as the stored value
			return nil, true
		}
	}
	return nil, false
}

func num(v any) float64 {
	if f, ok := v.(float64); ok {
		return f
	}
	return 0
}

func numPtr(vs ...any) (*float64, bool) {
	for _, v := range vs {
		if f, ok := v.(float64); ok {
			return &f, true
		}
	}
	return nil, false
}

func numInt(v any, def int) int {
	if f, ok := v.(float64); ok {
		return int(f)
	}
	return def
}

func intPtr(v any) (*int, bool) {
	if f, ok := v.(float64); ok {
		i := int(f)
		return &i, true
	}
	return nil, false
}
