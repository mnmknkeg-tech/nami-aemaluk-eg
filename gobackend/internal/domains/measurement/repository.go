package measurement

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Measurement domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new measurement repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const measurementColumns = "id, user_id, label, value, unit, notes, is_active, created_at, updated_at"

// Create inserts a new measurement.
func (r *Repository) Create(ctx context.Context, m *Measurement) (*Measurement, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO user_measurements (user_id, label, value, unit, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+measurementColumns,
		m.UserID, m.Label, m.Value, m.Unit, m.Notes,
	)
	return scanMeasurement(row)
}

// FindByID returns a measurement by ID scoped to its owning user.
func (r *Repository) FindByID(ctx context.Context, id, userID string) (*Measurement, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+measurementColumns+" FROM user_measurements WHERE id = $1 AND user_id = $2", id, userID)
	return scanMeasurement(row)
}

// ListByUser returns measurements for a user.
func (r *Repository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]Measurement, int, error) {
	var total int
	err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM user_measurements WHERE user_id = $1 AND is_active = true", userID).Scan(&total)
	if err != nil {
		return nil, 0, errors.Internal("count_measurements_failed", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT `+measurementColumns+` FROM user_measurements
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, errors.Internal("list_measurements_failed", err)
	}
	defer rows.Close()
	return scanMeasurements(rows, total)
}

// Update updates a measurement scoped to its owning user.
func (r *Repository) Update(ctx context.Context, id, userID string, req UpdateMeasurementRequest) (*Measurement, error) {
	setParts := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1

	if req.Label != nil {
		setParts = append(setParts, fmt.Sprintf("label = $%d", idx))
		args = append(args, *req.Label)
		idx++
	}
	if req.Value != nil {
		setParts = append(setParts, fmt.Sprintf("value = $%d", idx))
		args = append(args, *req.Value)
		idx++
	}
	if req.Unit != nil {
		setParts = append(setParts, fmt.Sprintf("unit = $%d", idx))
		args = append(args, *req.Unit)
		idx++
	}
	if req.Notes != nil {
		setParts = append(setParts, fmt.Sprintf("notes = $%d", idx))
		args = append(args, *req.Notes)
		idx++
	}
	if req.IsActive != nil {
		setParts = append(setParts, fmt.Sprintf("is_active = $%d", idx))
		args = append(args, *req.IsActive)
		idx++
	}

	args = append(args, id, userID)
	query := fmt.Sprintf("UPDATE user_measurements SET %s WHERE id = $%d AND user_id = $%d RETURNING "+measurementColumns,
		joinStrings(setParts, ", "), idx, idx+1)
	row := r.pool.QueryRow(ctx, query, args...)
	return scanMeasurement(row)
}

// Deactivate sets is_active = false for a measurement scoped to its owning user.
func (r *Repository) Deactivate(ctx context.Context, id, userID string) error {
	_, err := r.pool.Exec(ctx, "UPDATE user_measurements SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return errors.Internal("deactivate_measurement_failed", err)
	}
	return nil
}

// DeactivateAll sets is_active = false for all user's measurements.
func (r *Repository) DeactivateAll(ctx context.Context, userID string) (int, error) {
	tag, err := r.pool.Exec(ctx, "UPDATE user_measurements SET is_active = false, updated_at = NOW() WHERE user_id = $1 AND is_active = true", userID)
	if err != nil {
		return 0, errors.Internal("deactivate_all_measurements_failed", err)
	}
	return int(tag.RowsAffected()), nil
}

// BulkCreate creates multiple measurements.
func (r *Repository) BulkCreate(ctx context.Context, userID string, items []CreateMeasurementRequest) (int, error) {
	count := 0
	for _, item := range items {
		unit := item.Unit
		if unit == "" {
			unit = "cm"
		}
		var labelPtr, notesPtr *string
		if item.Label != "" {
			labelPtr = &item.Label
		}
		if item.Notes != "" {
			notesPtr = &item.Notes
		}
		m := &Measurement{
			UserID: userID,
			Label:  labelPtr,
			Value:  item.Value,
			Unit:   unit,
			Notes:  notesPtr,
		}
		_, err := r.Create(ctx, m)
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// ListAllByUser returns all active measurements for a user (no pagination).
func (r *Repository) ListAllByUser(ctx context.Context, userID string) ([]Measurement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+measurementColumns+` FROM user_measurements
		WHERE user_id = $1 AND is_active = true
		ORDER BY label ASC
	`, userID)
	if err != nil {
		return nil, errors.Internal("list_all_measurements_failed", err)
	}
	defer rows.Close()
	measurements, _, err := scanMeasurements(rows, 0)
	return measurements, err
}

func scanMeasurement(row pgx.Row) (*Measurement, error) {
	var m Measurement
	var label, notes sql.NullString
	err := row.Scan(
		&m.ID, &m.UserID, &label, &m.Value, &m.Unit, &notes, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_measurement_failed", err)
	}
	if label.Valid {
		m.Label = &label.String
	}
	if notes.Valid {
		m.Notes = &notes.String
	}
	return &m, nil
}

func scanMeasurements(rows pgx.Rows, total int) ([]Measurement, int, error) {
	var measurements []Measurement
	for rows.Next() {
		m, err := scanMeasurement(rows)
		if err != nil {
			return nil, 0, err
		}
		if m != nil {
			measurements = append(measurements, *m)
		}
	}
	return measurements, total, rows.Err()
}

func joinStrings(parts []string, sep string) string {
	result := ""
	for i, p := range parts {
		if i > 0 {
			result += sep
		}
		result += p
	}
	return result
}
