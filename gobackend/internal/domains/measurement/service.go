package measurement

import (
	"context"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

var validUnits = []string{"cm", "inch", "mm"}

// Service implements the Measurement domain business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new measurement service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Create creates a new measurement.
func (s *Service) Create(ctx context.Context, userID string, req CreateMeasurementRequest) (*MeasurementResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	unit := req.Unit
	if unit == "" {
		unit = "cm"
	}
	if !isValidUnit(unit) {
		return nil, errors.Validation("invalid_unit", "الوحدة يجب أن تكون cm أو inch أو mm")
	}

	var labelPtr, notesPtr *string
	if strings.TrimSpace(req.Label) != "" {
		l := strings.TrimSpace(req.Label)
		labelPtr = &l
	}
	if strings.TrimSpace(req.Notes) != "" {
		n := strings.TrimSpace(req.Notes)
		notesPtr = &n
	}

	m := &Measurement{
		UserID: userID,
		Label:  labelPtr,
		Value:  req.Value,
		Unit:   unit,
		Notes:  notesPtr,
	}

	created, err := s.repo.Create(ctx, m)
	if err != nil {
		return nil, err
	}
	resp := shapeMeasurement(*created)
	return &resp, nil
}

// ListByUser returns measurements for a user.
func (s *Service) ListByUser(ctx context.Context, userID string, page, limit int) (*ListMeasurementsResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	l, o := normalizePaging(page, limit)
	measurements, total, err := s.repo.ListByUser(ctx, userID, l, o)
	if err != nil {
		return nil, err
	}
	return &ListMeasurementsResponse{
		Items: shapeMeasurements(measurements),
		Total: total,
		Page:  page,
		Limit: l,
	}, nil
}

// GetOne returns a single measurement.
func (s *Service) GetOne(ctx context.Context, id, userID string) (*MeasurementResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	m, err := s.repo.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.NotFound("measurement", id)
	}
	if m.UserID != userID {
		return nil, errors.Forbidden("unauthorized", "غير مصرح")
	}
	resp := shapeMeasurement(*m)
	return &resp, nil
}

// Update updates a measurement.
func (s *Service) Update(ctx context.Context, id, userID string, req UpdateMeasurementRequest) (*MeasurementResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	m, err := s.repo.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	if m == nil {
		return nil, errors.NotFound("measurement", id)
	}
	if m.UserID != userID {
		return nil, errors.Forbidden("unauthorized", "غير مصرح")
	}

	if req.Unit != nil && !isValidUnit(*req.Unit) {
		return nil, errors.Validation("invalid_unit", "الوحدة يجب أن تكون cm أو inch أو mm")
	}

	updated, err := s.repo.Update(ctx, id, userID, req)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, errors.NotFound("measurement", id)
	}
	resp := shapeMeasurement(*updated)
	return &resp, nil
}

// Remove deactivates a measurement.
func (s *Service) Remove(ctx context.Context, id, userID string) error {
	if userID == "" {
		return errors.Validation("unauthorized", "غير مصرح")
	}
	m, err := s.repo.FindByID(ctx, id, userID)
	if err != nil {
		return err
	}
	if m == nil {
		return errors.NotFound("measurement", id)
	}
	if m.UserID != userID {
		return errors.Forbidden("unauthorized", "غير مصرح")
	}
	return s.repo.Deactivate(ctx, id, userID)
}

// BulkCreate creates multiple measurements.
func (s *Service) BulkCreate(ctx context.Context, userID string, items []CreateMeasurementRequest) (int, error) {
	if userID == "" {
		return 0, errors.Validation("unauthorized", "غير مصرح")
	}
	if len(items) == 0 {
		return 0, errors.Validation("empty_items", "يجب إرسال مصفوفة من القياسات")
	}
	if len(items) > 50 {
		return 0, errors.Validation("too_many_items", "الحد الأقصى 50 قياس في المرة الواحدة")
	}
	for _, item := range items {
		if item.Unit != "" && !isValidUnit(item.Unit) {
			return 0, errors.Validation("invalid_unit", "الوحدة يجب أن تكون cm أو inch أو mm")
		}
	}
	return s.repo.BulkCreate(ctx, userID, items)
}

// BulkUpdate updates multiple measurements.
func (s *Service) BulkUpdate(ctx context.Context, userID string, items []BulkUpdateItem) ([]MeasurementResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	if len(items) == 0 {
		return nil, errors.Validation("empty_items", "يجب إرسال مصفوفة من القياسات")
	}
	if len(items) > 50 {
		return nil, errors.Validation("too_many_items", "الحد الأقصى 50 قياس في المرة الواحدة")
	}

	var results []MeasurementResponse
	for _, item := range items {
		m, err := s.repo.FindByID(ctx, item.ID, userID)
		if err != nil || m == nil || m.UserID != userID {
			continue
		}
		if item.Unit != nil && !isValidUnit(*item.Unit) {
			return nil, errors.Validation("invalid_unit", "الوحدة يجب أن تكون cm أو inch أو mm")
		}
		req := UpdateMeasurementRequest{
			Label:    item.Label,
			Value:    item.Value,
			Unit:     item.Unit,
			Notes:    item.Notes,
			IsActive: item.IsActive,
		}
		updated, err := s.repo.Update(ctx, item.ID, userID, req)
		if err != nil || updated == nil {
			continue
		}
		results = append(results, shapeMeasurement(*updated))
	}
	return results, nil
}

// GetSummary returns a summary of measurements grouped by label.
func (s *Service) GetSummary(ctx context.Context, userID string) (*MeasurementSummaryResponse, error) {
	if userID == "" {
		return nil, errors.Validation("unauthorized", "غير مصرح")
	}
	measurements, err := s.repo.ListAllByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	byLabel := make(map[string][]MeasurementResponse)
	for _, m := range measurements {
		key := ""
		if m.Label != nil {
			key = *m.Label
		}
		if key == "" {
			key = "unlabeled"
		}
		byLabel[key] = append(byLabel[key], shapeMeasurement(m))
	}

	return &MeasurementSummaryResponse{
		Total:   len(measurements),
		ByLabel: byLabel,
	}, nil
}

// DeleteAll deactivates all measurements for a user.
func (s *Service) DeleteAll(ctx context.Context, userID string) (int, error) {
	if userID == "" {
		return 0, errors.Validation("unauthorized", "غير مصرح")
	}
	return s.repo.DeactivateAll(ctx, userID)
}

func isValidUnit(unit string) bool {
	for _, u := range validUnits {
		if u == unit {
			return true
		}
	}
	return false
}

func normalizePaging(page, limit int) (int, int) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	return limit, (page - 1) * limit
}

func shapeMeasurements(measurements []Measurement) []MeasurementResponse {
	out := make([]MeasurementResponse, len(measurements))
	for i, m := range measurements {
		out[i] = shapeMeasurement(m)
	}
	return out
}

func shapeMeasurement(m Measurement) MeasurementResponse {
	resp := MeasurementResponse{
		ID:        m.ID,
		Value:     m.Value,
		Unit:      m.Unit,
		IsActive:  m.IsActive,
		CreatedAt: m.CreatedAt,
	}
	if m.Label != nil {
		resp.Label = *m.Label
	}
	if m.Notes != nil {
		resp.Notes = *m.Notes
	}
	return resp
}
