package measurement

import "time"

// Measurement represents a user measurement record.
type Measurement struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	Label     *string    `json:"label,omitempty"`
	Value     float64    `json:"value"`
	Unit      string     `json:"unit"`
	Notes     *string    `json:"notes,omitempty"`
	IsActive  bool       `json:"isActive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// CreateMeasurementRequest is the payload for creating a measurement.
type CreateMeasurementRequest struct {
	Label string  `json:"label,omitempty"`
	Value float64 `json:"value" validate:"required,gt=0"`
	Unit  string  `json:"unit,omitempty"`
	Notes string  `json:"notes,omitempty"`
}

// UpdateMeasurementRequest is the payload for updating a measurement.
type UpdateMeasurementRequest struct {
	Label    *string  `json:"label,omitempty"`
	Value    *float64 `json:"value,omitempty" validate:"omitempty,gt=0"`
	Unit     *string  `json:"unit,omitempty"`
	Notes    *string  `json:"notes,omitempty"`
	IsActive *bool    `json:"isActive,omitempty"`
}

// BulkCreateRequest is the payload for bulk creating measurements.
type BulkCreateRequest struct {
	Items []CreateMeasurementRequest `json:"items" validate:"required,dive"`
}

// BulkUpdateItem is a single item in a bulk update.
type BulkUpdateItem struct {
	ID       string   `json:"id" validate:"required"`
	Label    *string  `json:"label,omitempty"`
	Value    *float64 `json:"value,omitempty" validate:"omitempty,gt=0"`
	Unit     *string  `json:"unit,omitempty"`
	Notes    *string  `json:"notes,omitempty"`
	IsActive *bool    `json:"isActive,omitempty"`
}

// BulkUpdateRequest is the payload for bulk updating measurements.
type BulkUpdateRequest struct {
	Items []BulkUpdateItem `json:"items" validate:"required,dive"`
}

// MeasurementResponse is the serialized measurement response.
type MeasurementResponse struct {
	ID        string    `json:"id"`
	Label     string    `json:"label,omitempty"`
	Value     float64   `json:"value"`
	Unit      string    `json:"unit"`
	Notes     string    `json:"notes,omitempty"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// ListMeasurementsResponse is the paginated list response.
type ListMeasurementsResponse struct {
	Items []MeasurementResponse `json:"items"`
	Total int                   `json:"total"`
	Page  int                   `json:"page"`
	Limit int                   `json:"limit"`
}

// MeasurementSummaryResponse is the summary response.
type MeasurementSummaryResponse struct {
	Total   int                            `json:"total"`
	ByLabel map[string][]MeasurementResponse `json:"byLabel"`
}
