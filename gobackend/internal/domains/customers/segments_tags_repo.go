package customers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// ListSegments retrieves segments for a shop.
func (r *Repository) ListSegments(ctx context.Context, shopID string) ([]CustomerSegment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, name, name_ar, description, criteria::text, is_active, created_at::text, updated_at::text
		FROM customer_segments
		WHERE shop_id = $1
		ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to query segments: %w", err)
	}
	defer rows.Close()

	var segments []CustomerSegment
	for rows.Next() {
		var s CustomerSegment
		var criteriaText sql.NullString
		if err := rows.Scan(&s.ID, &s.ShopID, &s.Name, &s.NameAr, &s.Description,
			&criteriaText, &s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
			continue
		}
		s.Criteria = map[string]interface{}{}
		if criteriaText.Valid && criteriaText.String != "" {
			_ = json.Unmarshal([]byte(criteriaText.String), &s.Criteria)
		}
		segments = append(segments, s)
	}
	return segments, nil
}

// CreateSegment inserts a new segment for a shop.
func (r *Repository) CreateSegment(ctx context.Context, shopID string, name, nameAr, description string, criteria map[string]interface{}, isActive bool) (*CustomerSegment, error) {
	criteriaJSON, _ := json.Marshal(criteria)
	var s CustomerSegment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO customer_segments (shop_id, name, name_ar, description, criteria, is_active)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		RETURNING id, shop_id, name, name_ar, description, criteria::text, is_active, created_at::text, updated_at::text`,
		shopID, name, nameAr, description, string(criteriaJSON), isActive,
	).Scan(&s.ID, &s.ShopID, &s.Name, &s.NameAr, &s.Description, &criteriaJSON, &s.IsActive, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert segment: %w", err)
	}
	s.Criteria = map[string]interface{}{}
	_ = json.Unmarshal(criteriaJSON, &s.Criteria)
	return &s, nil
}

// UpdateSegment updates an existing segment belonging to a shop.
func (r *Repository) UpdateSegment(ctx context.Context, shopID, id string, name, nameAr, description string, criteria map[string]interface{}, isActive *bool) (*CustomerSegment, error) {
	criteriaJSON, _ := json.Marshal(criteria)
	var s CustomerSegment
	err := r.pool.QueryRow(ctx, `
		UPDATE customer_segments
		SET name = $3, name_ar = $4, description = $5, criteria = $6::jsonb, is_active = COALESCE($7, is_active), updated_at = NOW()
		WHERE id = $1 AND shop_id = $2
		RETURNING id, shop_id, name, name_ar, description, criteria::text, is_active, created_at::text, updated_at::text`,
		id, shopID, name, nameAr, description, string(criteriaJSON), isActive,
	).Scan(&s.ID, &s.ShopID, &s.Name, &s.NameAr, &s.Description, &criteriaJSON, &s.IsActive, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("segment not found")
		}
		return nil, fmt.Errorf("failed to update segment: %w", err)
	}
	s.Criteria = map[string]interface{}{}
	_ = json.Unmarshal(criteriaJSON, &s.Criteria)
	return &s, nil
}

// DeleteSegment removes a segment belonging to a shop.
func (r *Repository) DeleteSegment(ctx context.Context, shopID, id string) error {
	res, err := r.pool.Exec(ctx, `DELETE FROM customer_segments WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("failed to delete segment: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("segment not found")
	}
	return nil
}