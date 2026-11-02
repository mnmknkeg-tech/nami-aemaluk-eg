package pagination

import "math"

// Meta holds pagination metadata returned to clients so they can
// build pagination controls without guessing.
type Meta struct {
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	Limit   int   `json:"limit"`
	HasMore bool  `json:"hasMore"`
}

// NewMeta builds a Meta value from the requested page/limit and the
// actual total count of records.
//
// It enforces sane defaults and clamping:
//   - page  < 1  -> 1
//   - limit < 1  -> 20
//   - limit > 200 -> 200
func NewMeta(total int64, page int, limit int) Meta {
	if limit < 1 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if page < 1 {
		page = 1
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	hasMore := page < totalPages

	return Meta{
		Total:   total,
		Page:    page,
		Limit:   limit,
		HasMore: hasMore,
	}
}
