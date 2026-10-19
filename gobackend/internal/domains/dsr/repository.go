package dsr

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for DSR.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new DSR repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a new data subject request.
func (r *Repository) Create(ctx context.Context, userID, requestType string, details any) (*DataSubjectRequest, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	detailsJSON, _ := json.Marshal(details)
	if detailsJSON == nil {
		detailsJSON = []byte("{}")
	}

	query := `
		INSERT INTO data_subject_requests (id, user_id, request_type, status, details, created_at, updated_at)
		VALUES ($1, $2, $3, 'pending', $4, $5, $5)
		RETURNING id, user_id, request_type, status, details, admin_notes, created_at, updated_at, completed_at
	`

	var d DataSubjectRequest
	var detailsRaw []byte
	err := r.pool.QueryRow(ctx, query, id, userID, requestType, detailsJSON, now).Scan(
		&d.ID, &d.UserID, &d.RequestType, &d.Status, &detailsRaw,
		&d.AdminNotes, &d.CreatedAt, &d.UpdatedAt, &d.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create DSR: %w", err)
	}

	var parsed any
	json.Unmarshal(detailsRaw, &parsed)
	d.Details = parsed
	return &d, nil
}

// FindByUser returns DSRs for a specific user.
func (r *Repository) FindByUser(ctx context.Context, userID string) ([]DataSubjectRequest, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, request_type, status, details, admin_notes, created_at, updated_at, completed_at
		FROM data_subject_requests WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query DSRs: %w", err)
	}
	defer rows.Close()
	return scanDSRs(rows)
}

// FindAll returns all DSRs (admin).
func (r *Repository) FindAll(ctx context.Context) ([]DataSubjectRequest, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, request_type, status, details, admin_notes, created_at, updated_at, completed_at
		FROM data_subject_requests ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query DSRs: %w", err)
	}
	defer rows.Close()
	return scanDSRs(rows)
}

// UpdateStatus updates the status of a DSR.
func (r *Repository) UpdateStatus(ctx context.Context, id, status string, adminNotes *string) (*DataSubjectRequest, error) {
	now := time.Now().UTC()

	var completedAt *time.Time
	if status == "completed" || status == "rejected" {
		completedAt = &now
	}

	query := `
		UPDATE data_subject_requests
		SET status = $1, admin_notes = $2, completed_at = $3, updated_at = $4
		WHERE id = $5
		RETURNING id, user_id, request_type, status, details, admin_notes, created_at, updated_at, completed_at
	`

	var d DataSubjectRequest
	var detailsRaw []byte
	err := r.pool.QueryRow(ctx, query, status, adminNotes, completedAt, now, id).Scan(
		&d.ID, &d.UserID, &d.RequestType, &d.Status, &detailsRaw,
		&d.AdminNotes, &d.CreatedAt, &d.UpdatedAt, &d.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update DSR: %w", err)
	}

	var parsed any
	json.Unmarshal(detailsRaw, &parsed)
	d.Details = parsed
	return &d, nil
}

func scanDSRs(rows rowsScanner) ([]DataSubjectRequest, error) {
	var result []DataSubjectRequest
	for rows.Next() {
		var d DataSubjectRequest
		var detailsRaw []byte
		if err := rows.Scan(
			&d.ID, &d.UserID, &d.RequestType, &d.Status, &detailsRaw,
			&d.AdminNotes, &d.CreatedAt, &d.UpdatedAt, &d.CompletedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan DSR: %w", err)
		}
		var parsed any
		json.Unmarshal(detailsRaw, &parsed)
		d.Details = parsed
		result = append(result, d)
	}
	return result, nil
}

type rowsScanner interface {
	Next() bool
	Scan(dest ...any) error
	Close()
}