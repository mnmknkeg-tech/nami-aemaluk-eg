package shopimagemap

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the ShopImageMap domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new shop image map repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// GetActiveForCustomerBySlug returns the active image map for a shop by slug.
func (r *Repository) GetActiveForCustomerBySlug(ctx context.Context, slug string) (*ImageMap, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT m.id, m.shop_id, m.name, m.image_url, m.is_active, m.layout, m.created_at, m.updated_at
		FROM shop_image_maps m
		JOIN shops s ON s.id = m.shop_id
		WHERE s.slug = $1 AND m.is_active = true
		LIMIT 1
	`, slug)
	return scanImageMap(row)
}

// ListByShop returns all image maps for a shop.
func (r *Repository) ListByShop(ctx context.Context, shopID string) ([]ImageMap, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, name, image_url, is_active, layout, created_at, updated_at
		FROM shop_image_maps WHERE shop_id = $1 ORDER BY created_at DESC
	`, shopID)
	if err != nil {
		return nil, errors.Internal("list_image_maps_failed", err)
	}
	defer rows.Close()
	var maps []ImageMap
	for rows.Next() {
		m, err := scanImageMap(rows)
		if err != nil {
			return nil, err
		}
		if m != nil {
			maps = append(maps, *m)
		}
	}
	return maps, rows.Err()
}

// Create creates a new image map.
func (r *Repository) Create(ctx context.Context, m *ImageMap) (*ImageMap, error) {
	layoutJSON, _ := json.Marshal(m.Layout)
	row := r.pool.QueryRow(ctx, `
		INSERT INTO shop_image_maps (shop_id, name, image_url, is_active, layout)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, shop_id, name, image_url, is_active, layout, created_at, updated_at
	`, m.ShopID, m.Name, m.ImageURL, m.IsActive, layoutJSON)
	return scanImageMap(row)
}

// FindByID returns an image map by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*ImageMap, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, shop_id, name, image_url, is_active, layout, created_at, updated_at
		FROM shop_image_maps WHERE id = $1
	`, id)
	return scanImageMap(row)
}

// Activate sets a map as active and deactivates others for the same shop.
func (r *Repository) Activate(ctx context.Context, shopID, mapID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return errors.Internal("begin_tx_failed", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "UPDATE shop_image_maps SET is_active = false, updated_at = NOW() WHERE shop_id = $1", shopID)
	if err != nil {
		return errors.Internal("deactivate_maps_failed", err)
	}

	_, err = tx.Exec(ctx, "UPDATE shop_image_maps SET is_active = true, updated_at = NOW() WHERE id = $1 AND shop_id = $2", mapID, shopID)
	if err != nil {
		return errors.Internal("activate_map_failed", err)
	}

	return tx.Commit(ctx)
}

// SaveLayout updates the layout and image URL for a map.
func (r *Repository) SaveLayout(ctx context.Context, mapID string, imageURL *string, layout []byte) error {
	parts := []string{"layout = $2", "updated_at = NOW()"}
	args := []any{mapID, layout}

	if imageURL != nil {
		parts = append(parts, "image_url = $3")
		args = append(args, *imageURL)
	}

	query := "UPDATE shop_image_maps SET " + strings.Join(parts, ", ") + " WHERE id = $1"
	args[0] = mapID
	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return errors.Internal("save_layout_failed", err)
	}
	return nil
}

// ListSections returns sections for a map.
func (r *Repository) ListSections(ctx context.Context, mapID string) ([]ImageSection, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, map_id, name, image_url, sort_order, width, height, created_at
		FROM shop_image_sections WHERE map_id = $1 ORDER BY sort_order ASC
	`, mapID)
	if err != nil {
		return nil, errors.Internal("list_sections_failed", err)
	}
	defer rows.Close()
	var sections []ImageSection
	for rows.Next() {
		var s ImageSection
		var imageURL sql.NullString
		var width, height sql.NullInt32
		err := rows.Scan(&s.ID, &s.MapID, &s.Name, &imageURL, &s.SortOrder, &width, &height, &s.CreatedAt)
		if err != nil {
			return nil, errors.Internal("scan_section_failed", err)
		}
		if imageURL.Valid {
			s.ImageURL = &imageURL.String
		}
		if width.Valid {
			w := int(width.Int32)
			s.Width = &w
		}
		if height.Valid {
			h := int(height.Int32)
			s.Height = &h
		}
		sections = append(sections, s)
	}
	return sections, rows.Err()
}

// ListHotspots returns hotspots for a map.
func (r *Repository) ListHotspots(ctx context.Context, mapID string) ([]ImageHotspot, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, map_id, section_id, product_id, label, x, y, width, height, shape, metadata
		FROM shop_image_hotspots WHERE map_id = $1
	`, mapID)
	if err != nil {
		return nil, errors.Internal("list_hotspots_failed", err)
	}
	defer rows.Close()
	var hotspots []ImageHotspot
	for rows.Next() {
		var h ImageHotspot
		var sectionID, productID, label sql.NullString
		var metadata []byte
		err := rows.Scan(&h.ID, &h.MapID, &sectionID, &productID, &label, &h.X, &h.Y, &h.Width, &h.Height, &h.Shape, &metadata)
		if err != nil {
			return nil, errors.Internal("scan_hotspot_failed", err)
		}
		if sectionID.Valid {
			h.SectionID = &sectionID.String
		}
		if productID.Valid {
			h.ProductID = &productID.String
		}
		if label.Valid {
			h.Label = &label.String
		}
		h.Metadata = metadata
		hotspots = append(hotspots, h)
	}
	return hotspots, rows.Err()
}

func scanImageMap(row pgx.Row) (*ImageMap, error) {
	var m ImageMap
	var imageURL sql.NullString
	var layout []byte
	err := row.Scan(&m.ID, &m.ShopID, &m.Name, &imageURL, &m.IsActive, &layout, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_image_map_failed", err)
	}
	if imageURL.Valid {
		m.ImageURL = &imageURL.String
	}
	m.Layout = layout
	return &m, nil
}
