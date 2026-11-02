package seasonaloffers

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

// Repository handles persistence for the SeasonalOffers domain.
type Repository struct {
	pool *db.Pool
}

func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// The seasonal_offers table uses title/discount_percent/starts_at/ends_at and
// keeps categories + bannerColor inside the metadata jsonb. These projections
// map the real columns onto the JSON shape the frontend expects (name,
// discountType, startDate, endDate, ...) so scans stay in one stable order.
const seasonalOfferColumns = `
	so.id, so.shop_id, so.title AS name, so.description, so.occasion,
	'percentage' AS discount_type, so.discount_percent AS discount_value,
	COALESCE(so.metadata->'categories', '[]'::jsonb) AS categories,
	so.starts_at AS start_date, so.ends_at AS end_date,
	COALESCE(so.metadata->>'bannerColor', '') AS banner_color,
	so.status, (so.status = 'active') AS is_active, so.created_at, so.updated_at
`

const seasonalOfferJoinColumns = `
	s.name AS shop_name, s.slug AS shop_slug
`

// FindByID returns a seasonal offer by ID with join data.
func (r *Repository) FindByID(ctx context.Context, id string) (*SeasonalOffer, error) {
	query := "SELECT " + seasonalOfferColumns + ", " + seasonalOfferJoinColumns + `
		FROM seasonal_offers so
		LEFT JOIN shops s ON s.id = so.shop_id
		WHERE so.id = $1 LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, id)
	return scanSeasonalOffer(row)
}

// ListByShop returns seasonal offers for a shop with optional filters.
func (r *Repository) ListByShop(ctx context.Context, shopID, status, occasion string, limit, offset int) ([]SeasonalOffer, error) {
	filters := "TRUE"
	args := []any{limit, offset}
	idx := 3

	if shopID != "" {
		filters += fmt.Sprintf(" AND so.shop_id = $%d", idx)
		args = append(args, shopID)
		idx++
	}
	if status != "" {
		filters += fmt.Sprintf(" AND so.status = $%d", idx)
		args = append(args, strings.ToLower(status))
		idx++
	}
	if occasion != "" {
		filters += fmt.Sprintf(" AND so.occasion = $%d", idx)
		args = append(args, occasion)
		idx++
	}

	query := "SELECT " + seasonalOfferColumns + ", " + seasonalOfferJoinColumns + `
		FROM seasonal_offers so
		LEFT JOIN shops s ON s.id = so.shop_id
		WHERE ` + filters + `
		ORDER BY so.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_seasonal_offers_failed", err)
	}
	defer rows.Close()
	return scanSeasonalOffers(rows)
}

// ListPublic returns active seasonal offers for all shops (for marketplace).
func (r *Repository) ListPublic(ctx context.Context, limit, offset int) ([]SeasonalOffer, error) {
	query := "SELECT " + seasonalOfferColumns + ", " + seasonalOfferJoinColumns + `
		FROM seasonal_offers so
		LEFT JOIN shops s ON s.id = so.shop_id
		WHERE so.status = 'active'
		  AND so.starts_at <= NOW()
		  AND so.ends_at >= NOW()
		ORDER BY so.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, errors.Internal("list_public_seasonal_offers_failed", err)
	}
	defer rows.Close()
	return scanSeasonalOffers(rows)
}

// Create inserts a new seasonal offer.
func (r *Repository) Create(ctx context.Context, o *SeasonalOffer) (*SeasonalOffer, error) {
	metaJSON, err := json.Marshal(map[string]any{
		"categories":  o.Categories,
		"bannerColor": o.BannerColor,
	})
	if err != nil {
		metaJSON = []byte(`{}`)
	}
	row := r.pool.QueryRow(ctx, `
		INSERT INTO seasonal_offers AS so (
			shop_id, title, description, occasion,
			discount_percent, starts_at, ends_at, status, metadata,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7, $8, $9::jsonb,
			NOW(), NOW()
		) RETURNING `+seasonalOfferColumns,
		o.ShopID, o.Name, o.Description, o.Occasion,
		o.DiscountValue, o.StartDate, o.EndDate, normalizeStatus(o.Status), string(metaJSON),
	)
	return scanSeasonalOffer(row)
}

// Update updates a seasonal offer by ID.
func (r *Repository) Update(ctx context.Context, id string, req UpdateSeasonalOfferRequest) (*SeasonalOffer, error) {
	setParts := []string{"updated_at = NOW()"}
	args := []any{}
	idx := 1

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("title = $%d", idx))
		args = append(args, *req.Name)
		idx++
	}
	if req.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", idx))
		args = append(args, *req.Description)
		idx++
	}
	if req.Occasion != nil {
		setParts = append(setParts, fmt.Sprintf("occasion = $%d", idx))
		args = append(args, *req.Occasion)
		idx++
	}
	if req.DiscountValue != nil {
		setParts = append(setParts, fmt.Sprintf("discount_percent = $%d", idx))
		args = append(args, *req.DiscountValue)
		idx++
	}
	if req.StartDate != nil {
		setParts = append(setParts, fmt.Sprintf("starts_at = $%d", idx))
		args = append(args, *req.StartDate)
		idx++
	}
	if req.EndDate != nil {
		setParts = append(setParts, fmt.Sprintf("ends_at = $%d", idx))
		args = append(args, *req.EndDate)
		idx++
	}
	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", idx))
		args = append(args, normalizeStatus(*req.Status))
		idx++
	}

	// categories / bannerColor live inside metadata jsonb
	metaKeys := []string{}
	metaArgs := []any{}
	if req.Categories != nil {
		metaKeys = append(metaKeys, "categories")
		raw, _ := json.Marshal(req.Categories)
		metaArgs = append(metaArgs, string(raw))
	}
	if req.BannerColor != nil {
		metaKeys = append(metaKeys, "bannerColor")
		metaArgs = append(metaArgs, *req.BannerColor)
	}
	for i, key := range metaKeys {
		path := fmt.Sprintf("{%s}", key)
		setParts = append(setParts, fmt.Sprintf(
			"metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '%s', to_jsonb($%d::text))", path, idx))
		args = append(args, metaArgs[i])
		idx++
	}

	args = append(args, id)
	query := fmt.Sprintf(
		"UPDATE seasonal_offers AS so SET %s WHERE so.id = $%d RETURNING "+seasonalOfferColumns,
		strings.Join(setParts, ", "), idx,
	)
	row := r.pool.QueryRow(ctx, query, args...)
	return scanSeasonalOffer(row)
}

// Delete soft-deletes a seasonal offer by moving it back to draft.
func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, "UPDATE seasonal_offers SET status = 'draft', updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return errors.Internal("delete_seasonal_offer_failed", err)
	}
	return nil
}

func scanSeasonalOffer(row pgx.Row) (*SeasonalOffer, error) {
	var o SeasonalOffer
	var desc sql.NullString
	var shopName, shopSlug sql.NullString
	var categoriesJSON []byte

	err := row.Scan(
		&o.ID, &o.ShopID, &o.Name, &desc, &o.Occasion,
		&o.DiscountType, &o.DiscountValue, &categoriesJSON, &o.StartDate, &o.EndDate,
		&o.BannerColor, &o.Status, &o.IsActive, &o.CreatedAt, &o.UpdatedAt,
		&shopName, &shopSlug,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_seasonal_offer_failed", err)
	}

	o.Description = nullStringPtr(desc)
	o.ShopName = nullStringPtr(shopName)
	o.ShopSlug = nullStringPtr(shopSlug)
	o.Categories = []string{}
	if len(categoriesJSON) > 0 && string(categoriesJSON) != "null" {
		_ = json.Unmarshal(categoriesJSON, &o.Categories)
	}
	return &o, nil

}

func scanSeasonalOffers(rows pgx.Rows) ([]SeasonalOffer, error) {
	var offers []SeasonalOffer
	for rows.Next() {
		o, err := scanSeasonalOffer(rows)
		if err != nil {
			return nil, err
		}
		if o != nil {
			offers = append(offers, *o)
		}
	}
	return offers, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func normalizeStatus(status string) string {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "active", "paused", "ended", "expired", "draft":
		return s
	default:
		return "draft"
	}
}
