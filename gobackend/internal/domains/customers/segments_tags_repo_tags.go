package customers

import (
	"context"
	"database/sql"
	"fmt"
)

// ListTags retrieves tags for a shop.
func (r *Repository) ListTags(ctx context.Context, shopID string) ([]CustomerTag, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, name, name_ar, color, description, is_active, created_at::text, updated_at::text
		FROM customer_tags
		WHERE shop_id = $1
		ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tags: %w", err)
	}
	defer rows.Close()

	var tags []CustomerTag
	for rows.Next() {
		var t CustomerTag
		if err := rows.Scan(&t.ID, &t.ShopID, &t.Name, &t.NameAr, &t.Color, &t.Description,
			&t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			continue
		}
		tags = append(tags, t)
	}
	return tags, nil
}

// CreateTag inserts a new tag for a shop.
func (r *Repository) CreateTag(ctx context.Context, shopID, name, nameAr, color, description string, isActive bool) (*CustomerTag, error) {
	var t CustomerTag
	err := r.pool.QueryRow(ctx, `
		INSERT INTO customer_tags (shop_id, name, name_ar, color, description, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, shop_id, name, name_ar, color, description, is_active, created_at::text, updated_at::text`,
		shopID, name, nameAr, color, description, isActive,
	).Scan(&t.ID, &t.ShopID, &t.Name, &t.NameAr, &t.Color, &t.Description, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert tag: %w", err)
	}
	return &t, nil
}

// UpdateTag updates an existing tag belonging to a shop.
func (r *Repository) UpdateTag(ctx context.Context, shopID, id string, name, nameAr, color, description string, isActive *bool) (*CustomerTag, error) {
	var t CustomerTag
	err := r.pool.QueryRow(ctx, `
		UPDATE customer_tags
		SET name = $3, name_ar = $4, color = $5, description = $6, is_active = COALESCE($7, is_active), updated_at = NOW()
		WHERE id = $1 AND shop_id = $2
		RETURNING id, shop_id, name, name_ar, color, description, is_active, created_at::text, updated_at::text`,
		id, shopID, name, nameAr, color, description, isActive,
	).Scan(&t.ID, &t.ShopID, &t.Name, &t.NameAr, &t.Color, &t.Description, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("tag not found")
		}
		return nil, fmt.Errorf("failed to update tag: %w", err)
	}
	return &t, nil
}

// DeleteTag removes a tag belonging to a shop.
func (r *Repository) DeleteTag(ctx context.Context, shopID, id string) error {
	res, err := r.pool.Exec(ctx, `DELETE FROM customer_tags WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("failed to delete tag: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("tag not found")
	}
	return nil
}