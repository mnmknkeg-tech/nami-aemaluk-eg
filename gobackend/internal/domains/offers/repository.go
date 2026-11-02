package offers

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Offers domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new offers repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const offerColumns = `
	o.id, o.title, o.description, o.discount, o.old_price, o.new_price, o.image_url,
	o.expires_at, o.is_active, o.product_id, o.shop_id, o.variant_pricing,
	o.created_at, o.updated_at
`

const offerJoinColumns = `
	p.name AS product_name, p.price AS product_price,
	s.name AS shop_name, s.slug AS shop_slug, s.logo_url AS shop_logo, s.category AS shop_category
`

// FindActiveByID returns an active, non-expired offer by ID with join data.
// Offers of products hidden from the app (app_active=false) stay out of the app.
func (r *Repository) FindActiveByID(ctx context.Context, id string) (*Offer, error) {
	query := "SELECT " + offerColumns + ", " + offerJoinColumns + `
		FROM offers o
		LEFT JOIN products p ON p.id = o.product_id
		LEFT JOIN shops s ON s.id = o.shop_id
		WHERE o.id = $1 AND o.is_active = true AND o.expires_at > NOW()
		  AND (p.id IS NULL OR p.app_active = true)
		LIMIT 1
	`
	row := r.pool.QueryRow(ctx, query, id)
	return scanOffer(row)
}

// ListActive returns active, non-expired offers filtered by optional shop/category/product.
func (r *Repository) ListActive(ctx context.Context, shopID, shopCategory, productID string, limit, offset int) ([]Offer, error) {
	filters := "o.is_active = true AND o.expires_at > NOW() AND (p.id IS NULL OR p.app_active = true)"
	args := []any{limit, offset}
	idx := 3
	if shopID != "" {
		filters += fmt.Sprintf(" AND o.shop_id = $%d", idx)
		args = append(args, shopID)
		idx++
	}
	if shopCategory != "" {
		filters += fmt.Sprintf(" AND s.category = $%d", idx)
		args = append(args, strings.ToUpper(shopCategory))
		idx++
	}
	if productID != "" {
		filters += fmt.Sprintf(" AND o.product_id = $%d", idx)
		args = append(args, productID)
		idx++
	}

	query := "SELECT " + offerColumns + ", " + offerJoinColumns + `
		FROM offers o
		LEFT JOIN products p ON p.id = o.product_id
		LEFT JOIN shops s ON s.id = o.shop_id
		WHERE ` + filters + `
		ORDER BY o.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_offers_failed", err)
	}
	defer rows.Close()
	return scanOffers(rows)
}

// Create inserts a new offer.
func (r *Repository) Create(ctx context.Context, offer *Offer) (*Offer, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO offers (
			id, title, description, discount, old_price, new_price, image_url,
			expires_at, is_active, product_id, shop_id, variant_pricing, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, NOW(), NOW()
		) RETURNING `+offerColumns,
		offer.Title, offer.Description, offer.Discount, offer.OldPrice, offer.NewPrice,
		offer.ImageURL, offer.ExpiresAt, offer.ProductID, offer.ShopID, offer.VariantPricing,
	)
	return scanOffer(row)
}

// Deactivate sets is_active = false for an offer.
func (r *Repository) Deactivate(ctx context.Context, id string) (*Offer, error) {
	row := r.pool.QueryRow(ctx,
		"UPDATE offers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING "+offerColumns,
		id,
	)
	return scanOffer(row)
}

// FindByID returns any offer by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*Offer, error) {
	row := r.pool.QueryRow(ctx,
		"SELECT "+offerColumns+", "+offerJoinColumns+`
		FROM offers o
		LEFT JOIN products p ON p.id = o.product_id
		LEFT JOIN shops s ON s.id = o.shop_id
		WHERE o.id = $1 LIMIT 1`,
		id,
	)
	return scanOffer(row)
}

// GetProductsForShop returns active products in a shop.
func (r *Repository) GetProductsForShop(ctx context.Context, shopID string, ids []string) ([]struct {
	ID          string
	Name        string
	Price       float64
	ImageURL    *string
	MenuVariants any
}, error) {
	placeholders := make([]string, len(ids))
	args := make([]any, len(ids)+1)
	args[0] = shopID
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args[i+1] = id
	}

	query := "SELECT id, name, price, image_url, menu_variants FROM products WHERE shop_id = $1 AND is_active = true"
	if len(ids) > 0 {
		query += " AND id IN (" + strings.Join(placeholders, ",") + ")"
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []struct {
		ID          string
		Name        string
		Price       float64
		ImageURL    *string
		MenuVariants any
	}
	for rows.Next() {
		var p struct {
			ID          string
			Name        string
			Price       float64
			ImageURL    *string
			MenuVariants any
		}
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.ImageURL, &p.MenuVariants); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func scanOffer(row pgx.Row) (*Offer, error) {
	var o Offer
	var desc, imageURL, productID sql.NullString
	var variantPricing any

	err := row.Scan(
		&o.ID, &o.Title, &desc, &o.Discount, &o.OldPrice, &o.NewPrice, &imageURL,
		&o.ExpiresAt, &o.IsActive, &productID, &o.ShopID, &variantPricing,
		&o.CreatedAt, &o.UpdatedAt,
		&o.ProductName, &o.ProductPrice, &o.ShopName, &o.ShopSlug, &o.ShopLogo, &o.ShopCategory,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_offer_failed", err)
	}

	o.Description = nullStringPtr(desc)
	o.ImageURL = nullStringPtr(imageURL)
	o.ProductID = nullStringPtr(productID)
	if variantPricing != nil {
		o.VariantPricing = &variantPricing
	}
	return &o, nil
}

func scanOffers(rows pgx.Rows) ([]Offer, error) {
	var offers []Offer
	for rows.Next() {
		o, err := scanOffer(rows)
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
