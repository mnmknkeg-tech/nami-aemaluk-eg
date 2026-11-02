package shopimagemap

import (
	"time"
)

// ImageMap represents a shop image map.
type ImageMap struct {
	ID        string    `json:"id"`
	ShopID    string    `json:"shopId"`
	Name      string    `json:"name"`
	ImageURL  *string   `json:"imageUrl,omitempty"`
	IsActive  bool      `json:"isActive"`
	Layout    []byte    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ImageSection represents a section within an image map.
type ImageSection struct {
	ID        string    `json:"id"`
	MapID     string    `json:"mapId"`
	Name      string    `json:"name"`
	ImageURL  *string   `json:"imageUrl,omitempty"`
	SortOrder int       `json:"sortOrder"`
	Width     *int      `json:"width,omitempty"`
	Height    *int      `json:"height,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// ImageHotspot represents a clickable hotspot on a map.
type ImageHotspot struct {
	ID        string  `json:"id"`
	MapID     string  `json:"mapId"`
	SectionID *string `json:"sectionId,omitempty"`
	ProductID *string `json:"productId,omitempty"`
	Label     *string `json:"label,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Width     float64 `json:"width"`
	Height    float64 `json:"height"`
	Shape     string  `json:"shape"`
	Metadata  []byte  `json:"-"`
}

// CreateMapRequest is the payload for creating an image map.
type CreateMapRequest struct {
	Name     string         `json:"name,omitempty"`
	ImageURL string         `json:"imageUrl,omitempty"`
	Layout   map[string]any `json:"layout,omitempty"`
}

// SaveLayoutRequest is the payload for saving a map layout.
type SaveLayoutRequest struct {
	ImageURL string         `json:"imageUrl,omitempty"`
	Layout   map[string]any `json:"layout"`
}

// AnalyzeRequest is the payload for layout analysis.
type AnalyzeRequest struct {
	ImageURL string `json:"imageUrl" validate:"required"`
	Language string `json:"language,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	Hint     string `json:"hint,omitempty"`
}

// ImageMapResponse is the serialized image map response.
type ImageMapResponse struct {
	ID        string         `json:"id"`
	ShopID    string         `json:"shopId"`
	Name      string         `json:"name"`
	ImageURL  string         `json:"imageUrl,omitempty"`
	IsActive  bool           `json:"isActive"`
	Layout    map[string]any `json:"layout"`
	Sections  []ImageSection `json:"sections,omitempty"`
	Hotspots  []ImageHotspot `json:"hotspots,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

// AnalyzeSection is a suggested visual section for a shop image map.
type AnalyzeSection struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
	SortOrder   int     `json:"sortOrder"`
}

// AnalyzeHotspot is a suggested clickable area for a shop image map.
type AnalyzeHotspot struct {
	ID        string         `json:"id"`
	SectionID string         `json:"sectionId"`
	Label     string         `json:"label"`
	X         float64        `json:"x"`
	Y         float64        `json:"y"`
	Width     float64        `json:"width"`
	Height    float64        `json:"height"`
	Shape     string         `json:"shape"`
	Metadata  map[string]any `json:"metadata"`
}

// AnalyzeResponse is the deterministic layout analysis response.
type AnalyzeResponse struct {
	ImageURL    string           `json:"imageUrl"`
	Mode        string           `json:"mode"`
	Sections    []AnalyzeSection `json:"sections"`
	Hotspots    []AnalyzeHotspot `json:"hotspots"`
	Suggestions []string         `json:"suggestions"`
}
