package reports

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for product reports.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new reports repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a new product report.
func (r *Repository) Create(ctx context.Context, productID, shopID string, reporterID *string, reason, description string) (*ProductReport, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	query := `
		INSERT INTO product_reports (id, product_id, shop_id, reporter_id, reason, description, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $7)
		RETURNING id, product_id, shop_id, reporter_id, reason, description, status, admin_notes, created_at, updated_at
	`

	var p ProductReport
	err := r.pool.QueryRow(ctx, query, id, productID, shopID, reporterID, reason, description, now).Scan(
		&p.ID, &p.ProductID, &p.ShopID, &p.ReporterID, &p.Reason, &p.Description,
		&p.Status, &p.AdminNotes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}
	return &p, nil
}

// FindAll returns all product reports (admin).
func (r *Repository) FindAll(ctx context.Context) ([]ProductReport, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, product_id, shop_id, reporter_id, reason, description, status, admin_notes, created_at, updated_at
		FROM product_reports ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query reports: %w", err)
	}
	defer rows.Close()

	var result []ProductReport
	for rows.Next() {
		var p ProductReport
		if err := rows.Scan(
			&p.ID, &p.ProductID, &p.ShopID, &p.ReporterID, &p.Reason, &p.Description,
			&p.Status, &p.AdminNotes, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan report: %w", err)
		}
		result = append(result, p)
	}
	return result, nil
}

// UpdateStatus updates the status of a product report.
func (r *Repository) UpdateStatus(ctx context.Context, id, status string, adminNotes *string) (*ProductReport, error) {
	now := time.Now().UTC()
	query := `
		UPDATE product_reports
		SET status = $1, admin_notes = $2, updated_at = $3
		WHERE id = $4
		RETURNING id, product_id, shop_id, reporter_id, reason, description, status, admin_notes, created_at, updated_at
	`

	var p ProductReport
	err := r.pool.QueryRow(ctx, query, status, adminNotes, now, id).Scan(
		&p.ID, &p.ProductID, &p.ShopID, &p.ReporterID, &p.Reason, &p.Description,
		&p.Status, &p.AdminNotes, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update report: %w", err)
	}
	return &p, nil
}