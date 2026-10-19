package media

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Media domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new media repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a new media record.
func (r *Repository) Create(ctx context.Context, m *Media) (*Media, error) {
	query := `
		INSERT INTO media (
			id, shop_id, uploaded_by, purpose, original_key, original_url, mime_type,
			file_size, width, height, optimization_status, linked_type, linked_id,
			is_active, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10, $11, true, NOW(), NOW()
		) RETURNING ` + mediaColumns

	row := r.pool.QueryRow(ctx, query,
		m.ShopID, m.UploadedBy, m.Purpose, m.OriginalKey, m.OriginalURL, m.MimeType,
		m.FileSize, m.Width, m.Height, m.LinkedType, m.LinkedID,
	)
	return scanMedia(row)
}

// FindByID returns a media record by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Media, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+mediaColumns+" FROM media WHERE id = $1 LIMIT 1", id)
	return scanMedia(row)
}

// FindByKey returns a media record by original key.
func (r *Repository) FindByKey(ctx context.Context, key string) (*Media, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+mediaColumns+" FROM media WHERE original_key = $1 LIMIT 1", key)
	return scanMedia(row)
}

// ListByShop returns paginated media for a shop.
func (r *Repository) ListByShop(ctx context.Context, shopID, purpose string, limit, offset int) ([]Media, error) {
	filters := "shop_id = $1 AND is_active = true"
	args := []any{shopID, limit, offset}
	idx := 4
	if purpose != "" {
		filters += fmt.Sprintf(" AND purpose = $%d", idx)
		args = append(args, purpose)
		idx++
	}
	query := "SELECT " + mediaColumns + " FROM media WHERE " + filters + " ORDER BY created_at DESC LIMIT $2 OFFSET $3"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_media_failed", err)
	}
	defer rows.Close()
	return scanMediaList(rows)
}

// UpdateOptimizationStatus updates the optimization status and variant URLs.
func (r *Repository) UpdateOptimizationStatus(ctx context.Context, id, status string, urls map[string]string, errMsg *string) (*Media, error) {
	set := []string{"optimization_status = $1", "updated_at = NOW()"}
	args := []any{status}
	idx := 3
	if thumb, ok := urls["thumb_key"]; ok {
		set = append(set, fmt.Sprintf("thumb_key = $%d", idx))
		args = append(args, thumb)
		idx++
	}
	if thumb, ok := urls["thumb_url"]; ok {
		set = append(set, fmt.Sprintf("thumb_url = $%d", idx))
		args = append(args, thumb)
		idx++
	}
	if small, ok := urls["small_key"]; ok {
		set = append(set, fmt.Sprintf("small_key = $%d", idx))
		args = append(args, small)
		idx++
	}
	if small, ok := urls["small_url"]; ok {
		set = append(set, fmt.Sprintf("small_url = $%d", idx))
		args = append(args, small)
		idx++
	}
	if medium, ok := urls["medium_key"]; ok {
		set = append(set, fmt.Sprintf("medium_key = $%d", idx))
		args = append(args, medium)
		idx++
	}
	if medium, ok := urls["medium_url"]; ok {
		set = append(set, fmt.Sprintf("medium_url = $%d", idx))
		args = append(args, medium)
		idx++
	}
	if opt, ok := urls["optimized_key"]; ok {
		set = append(set, fmt.Sprintf("optimized_key = $%d", idx))
		args = append(args, opt)
		idx++
	}
	if opt, ok := urls["optimized_url"]; ok {
		set = append(set, fmt.Sprintf("optimized_url = $%d", idx))
		args = append(args, opt)
		idx++
	}
	set = append(set, fmt.Sprintf("optimization_error = $%d", idx))
	args = append(args, errMsg)
	idx++
	args = append(args, id)

	query := "UPDATE media SET " + strings.Join(set, ", ") + fmt.Sprintf(" WHERE id = $%d RETURNING ", idx) + mediaColumns
	row := r.pool.QueryRow(ctx, query, args...)
	return scanMedia(row)
}

const mediaColumns = `
	id, shop_id, uploaded_by, purpose, original_key, original_url, mime_type,
	file_size, width, height, thumb_key, thumb_url, small_key, small_url,
	medium_key, medium_url, optimized_key, optimized_url, optimization_status,
	optimization_error, linked_type, linked_id, compressed_urls, is_active, created_at, updated_at
`

func scanMedia(row pgx.Row) (*Media, error) {
	var m Media
	var uploadedBy, thumbKey, thumbURL, smallKey, smallURL, mediumKey, mediumURL sql.NullString
	var optKey, optURL, optErr, linkedType, linkedID sql.NullString
	var fileSize sql.NullInt64
	var width, height sql.NullInt32
	var compressedURLs []byte

	err := row.Scan(
		&m.ID, &m.ShopID, &uploadedBy, &m.Purpose, &m.OriginalKey, &m.OriginalURL, &m.MimeType,
		&fileSize, &width, &height, &thumbKey, &thumbURL, &smallKey, &smallURL,
		&mediumKey, &mediumURL, &optKey, &optURL, &m.OptimizationStatus, &optErr,
		&linkedType, &linkedID, &compressedURLs, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_media_failed", err)
	}

	m.UploadedBy = nullStringPtr(uploadedBy)
	m.FileSize = nullInt64Ptr(fileSize)
	m.Width = nullIntPtr(width)
	m.Height = nullIntPtr(height)
	m.ThumbKey = nullStringPtr(thumbKey)
	m.ThumbURL = nullStringPtr(thumbURL)
	m.SmallKey = nullStringPtr(smallKey)
	m.SmallURL = nullStringPtr(smallURL)
	m.MediumKey = nullStringPtr(mediumKey)
	m.MediumURL = nullStringPtr(mediumURL)
	m.OptimizedKey = nullStringPtr(optKey)
	m.OptimizedURL = nullStringPtr(optURL)
	m.OptimizationError = nullStringPtr(optErr)
	m.LinkedType = nullStringPtr(linkedType)
	m.LinkedID = nullStringPtr(linkedID)

	// Parse compressed URLs from JSONB
	if len(compressedURLs) > 0 {
		m.CompressedURLs = parseJSONBMap(compressedURLs)
	}

	return &m, nil
}

func scanMediaList(rows pgx.Rows) ([]Media, error) {
	var media []Media
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return nil, err
		}
		if m != nil {
			media = append(media, *m)
		}
	}
	return media, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func nullInt64Ptr(i sql.NullInt64) *int64 {
	if !i.Valid {
		return nil
	}
	return &i.Int64
}

func nullIntPtr(i sql.NullInt32) *int {
	if !i.Valid {
		return nil
	}
	v := int(i.Int32)
	return &v
}

func parseJSONBMap(data []byte) map[string]string {
	if len(data) == 0 {
		return nil
	}
	var result map[string]string
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}
	return result
}
