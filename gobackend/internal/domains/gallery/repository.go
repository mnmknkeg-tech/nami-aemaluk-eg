package gallery

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for gallery
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new gallery repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateGalleryItem creates a new gallery item
func (r *Repository) CreateGalleryItem(ctx context.Context, shopID string, data *CreateGalleryItemDTO) (*GalleryItem, error) {
	id := uuid.New().String()
	now := time.Now().UTC()

	order := data.Order
	if order == 0 {
		// Get max order for this shop
		var maxOrder int
		err := r.pool.QueryRow(ctx, "SELECT COALESCE(MAX(sort_order), 0) FROM gallery_items WHERE shop_id = $1", shopID).Scan(&maxOrder)
		if err == nil {
			order = maxOrder + 1
		} else {
			order = 1
		}
	}

	query := `
		INSERT INTO gallery_items (id, shop_id, title, image_url, sort_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, shop_id, title, image_url, sort_order, created_at, updated_at
	`

	var item GalleryItem
	err := r.pool.QueryRow(ctx, query,
		id, shopID, data.Title, data.ImageURL, order, now, now,
	).Scan(
		&item.ID, &item.ShopID, &item.Title, &item.ImageURL, &item.Order, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create gallery item: %w", err)
	}

	item.CreatedAt = now.UTC().Format(time.RFC3339)
	item.UpdatedAt = now.UTC().Format(time.RFC3339)

	return &item, nil
}

// GetGalleryItemByID retrieves a gallery item by ID
func (r *Repository) GetGalleryItemByID(ctx context.Context, id string) (*GalleryItem, error) {
	query := `
		SELECT id, shop_id, title, image_url, sort_order, created_at, updated_at
		FROM gallery_items
		WHERE id = $1
	`

	var item GalleryItem
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&item.ID, &item.ShopID, &item.Title, &item.ImageURL, &item.Order, &item.CreatedAt, &item.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get gallery item: %w", err)
	}

	return &item, nil
}

// ListGalleryItems retrieves gallery items for a shop
func (r *Repository) ListGalleryItems(ctx context.Context, shopID string, limit, offset int) ([]GalleryItem, int64, error) {
	query := `
		SELECT id, shop_id, title, image_url, sort_order, created_at, updated_at
		FROM gallery_items
		WHERE shop_id = $1
		ORDER BY sort_order ASC, created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, shopID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query gallery items: %w", err)
	}
	defer rows.Close()

	var items []GalleryItem
	for rows.Next() {
		var item GalleryItem
		err := rows.Scan(
			&item.ID, &item.ShopID, &item.Title, &item.ImageURL, &item.Order, &item.CreatedAt, &item.UpdatedAt,
		)
		if err != nil {
			continue
		}
		items = append(items, item)
	}

	// Get total count
	var total int64
	err = r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM gallery_items WHERE shop_id = $1", shopID).Scan(&total)
	if err != nil {
		return items, 0, nil
	}

	return items, total, nil
}

// UpdateGalleryItem updates a gallery item scoped to its owning shop.
// The shopID filter prevents one merchant from modifying another shop's items.
func (r *Repository) UpdateGalleryItem(ctx context.Context, shopID, id string, data *UpdateGalleryItemDTO) error {
	query := `UPDATE gallery_items SET updated_at = NOW()`
	args := []interface{}{}
	argIndex := 1

	if data.Title != nil {
		query += fmt.Sprintf(", title = $%d", argIndex)
		args = append(args, *data.Title)
		argIndex++
	}

	if data.ImageURL != nil {
		query += fmt.Sprintf(", image_url = $%d", argIndex)
		args = append(args, *data.ImageURL)
		argIndex++
	}

	if data.Order != nil {
		query += fmt.Sprintf(", sort_order = $%d", argIndex)
		args = append(args, *data.Order)
		argIndex++
	}

	query += fmt.Sprintf(" WHERE id = $%d AND shop_id = $%d", argIndex, argIndex+1)
	args = append(args, id, shopID)

	tag, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("gallery item not found")
	}
	return nil
}

// DeleteGalleryItem deletes a gallery item scoped to its owning shop.
func (r *Repository) DeleteGalleryItem(ctx context.Context, shopID, id string) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM gallery_items WHERE id = $1 AND shop_id = $2", id, shopID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("gallery item not found")
	}
	return err
}
