package breach

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for breach incidents.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new breach repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a new breach incident.
func (r *Repository) Create(ctx context.Context, title, description, severity string, affectedUsers int) (*BreachIncident, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	if severity == "" {
		severity = "medium"
	}

	query := `
		INSERT INTO breach_incidents (id, title, description, severity, affected_users_count, discovered_at, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'investigating', $6, $6)
		RETURNING id, title, description, severity, affected_users_count, discovered_at, notified_regulator_at, notified_users_at, status, created_at, updated_at
	`

	var b BreachIncident
	err := r.pool.QueryRow(ctx, query, id, title, description, severity, affectedUsers, now).Scan(
		&b.ID, &b.Title, &b.Description, &b.Severity, &b.AffectedUsersCount,
		&b.DiscoveredAt, &b.NotifiedRegulatorAt, &b.NotifiedUsersAt,
		&b.Status, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create breach: %w", err)
	}
	return &b, nil
}

// FindAll returns all breach incidents.
func (r *Repository) FindAll(ctx context.Context) ([]BreachIncident, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, description, severity, affected_users_count, discovered_at, notified_regulator_at, notified_users_at, status, created_at, updated_at
		FROM breach_incidents ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query breaches: %w", err)
	}
	defer rows.Close()

	var result []BreachIncident
	for rows.Next() {
		var b BreachIncident
		if err := rows.Scan(
			&b.ID, &b.Title, &b.Description, &b.Severity, &b.AffectedUsersCount,
			&b.DiscoveredAt, &b.NotifiedRegulatorAt, &b.NotifiedUsersAt,
			&b.Status, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan breach: %w", err)
		}
		result = append(result, b)
	}
	return result, nil
}

// UpdateStatus updates the status of a breach incident and timestamps.
func (r *Repository) UpdateStatus(ctx context.Context, id, status string) (*BreachIncident, error) {
	now := time.Now().UTC()

	// Determine which timestamp to set based on status
	var query string
	switch status {
	case "notified_regulator":
		query = `
			UPDATE breach_incidents
			SET status = $1, notified_regulator_at = $2, updated_at = $2
			WHERE id = $3
			RETURNING id, title, description, severity, affected_users_count, discovered_at, notified_regulator_at, notified_users_at, status, created_at, updated_at
		`
	case "notified_users":
		query = `
			UPDATE breach_incidents
			SET status = $1, notified_users_at = $2, updated_at = $2
			WHERE id = $3
			RETURNING id, title, description, severity, affected_users_count, discovered_at, notified_regulator_at, notified_users_at, status, created_at, updated_at
		`
	default:
		query = `
			UPDATE breach_incidents
			SET status = $1, updated_at = $2
			WHERE id = $3
			RETURNING id, title, description, severity, affected_users_count, discovered_at, notified_regulator_at, notified_users_at, status, created_at, updated_at
		`
	}

	var b BreachIncident
	err := r.pool.QueryRow(ctx, query, status, now, id).Scan(
		&b.ID, &b.Title, &b.Description, &b.Severity, &b.AffectedUsersCount,
		&b.DiscoveredAt, &b.NotifiedRegulatorAt, &b.NotifiedUsersAt,
		&b.Status, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update breach: %w", err)
	}
	return &b, nil
}

// HasActiveUnnotified checks if there is an active breach where users haven't been notified.
func (r *Repository) HasActiveUnnotified(ctx context.Context) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM breach_incidents
			WHERE status IN ('investigating', 'notified_regulator')
			  AND notified_users_at IS NULL
		)
	`).Scan(&exists)
	return exists, err
}