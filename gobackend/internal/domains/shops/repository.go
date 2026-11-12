package shops

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Shops domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new shops repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByID returns a shop by ID or nil if not found.
func (r *Repository) FindByID(ctx context.Context, id string) (*Shop, error) {
	row := r.pool.QueryRow(ctx, selectShop+" WHERE s.id = $1 LIMIT 1", id)
	return scanShop(row)
}

// FindBySlug returns a shop by slug or nil if not found.
func (r *Repository) FindBySlug(ctx context.Context, slug string) (*Shop, error) {
	row := r.pool.QueryRow(ctx, selectShop+" WHERE s.slug = $1 LIMIT 1", slug)
	return scanShop(row)
}

// FindByOwnerID returns the shop owned by a user or nil.
func (r *Repository) FindByOwnerID(ctx context.Context, ownerID string) (*Shop, error) {
	row := r.pool.QueryRow(ctx, selectShop+" WHERE s.owner_id = $1 LIMIT 1", ownerID)
	return scanShop(row)
}

// FindFirstActive returns any active/approved/public shop.
func (r *Repository) FindFirstActive(ctx context.Context) (*Shop, error) {
	row := r.pool.QueryRow(ctx, selectShop+" WHERE s.is_active = true AND s.public_disabled = false AND s.status = 'APPROVED' ORDER BY s.created_at DESC LIMIT 1")
	return scanShop(row)
}

// FindMostRecentByOwner returns the most recently created shop for an owner.
func (r *Repository) FindMostRecentByOwner(ctx context.Context, ownerID string) (*Shop, error) {
	row := r.pool.QueryRow(ctx, selectShop+" WHERE s.owner_id = $1 ORDER BY s.created_at DESC LIMIT 1", ownerID)
	return scanShop(row)
}

// SlugExists reports whether a slug is already in use.
func (r *Repository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM shops WHERE slug = $1)", slug).Scan(&exists)
	return exists, err
}

// Create inserts a new shop.
func (r *Repository) Create(ctx context.Context, s *Shop) (*Shop, error) {
	// Columns and VALUES must stay in lockstep: 1 uuid + $1..$26 identity,
	// $27 builder_config, is_active literal, $28 owner_id, 2 literals, 2 NOW().
	query := `
		INSERT INTO shops (
			id, name, slug, description, category, activity, governorate, city, address,
			address_detailed, display_address, map_label, latitude, longitude,
			location_source, location_accuracy, phone, email, opening_hours,
			logo_url, banner_url, status, page_design, theme, custom_colors,
			custom_fonts, layout_config, builder_config, is_active, owner_id,
			public_disabled, delivery_disabled, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
			$27, true, $28, false, false, NOW(), NOW()
		) RETURNING ` + shopReturnColumns
	row := r.pool.QueryRow(ctx, query,
		s.Name, s.Slug, s.Description, s.Category, s.Activity, s.Governorate, s.City, s.Address,
		s.AddressDetailed, s.DisplayAddress, s.MapLabel, s.Latitude, s.Longitude,
		s.LocationSource, s.LocationAccuracy, s.Phone, s.Email, s.OpeningHours,
		s.LogoURL, s.BannerURL, s.Status, s.PageDesign, s.Theme, s.CustomColors,
		s.CustomFonts, s.LayoutConfig, s.BuilderConfig, s.OwnerID,
	)
	return scanShopReturn(row)
}

// UpdateSettings applies partial updates to a shop.
func (r *Repository) UpdateSettings(ctx context.Context, id string, fields map[string]any) (*Shop, error) {
	set := []string{}
	args := []any{}
	i := 1
	for col, val := range fields {
		set = append(set, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	if anyLocationField(fields) {
		set = append(set, "location_updated_at = NOW()")
	}
	if len(set) == 0 {
		return r.FindByID(ctx, id)
	}
	set = append(set, fmt.Sprintf("updated_at = $%d", i))
	args = append(args, time.Now().UTC())
	i++
	args = append(args, id)

	query := "UPDATE shops SET " + strings.Join(set, ", ") + fmt.Sprintf(" WHERE id = $%d RETURNING ", i) + shopReturnColumns
	row := r.pool.QueryRow(ctx, query, args...)
	return scanShopReturn(row)
}

// UpdateStatus updates the shop status and returns the updated shop.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status ShopStatus) (*Shop, error) {
	row := r.pool.QueryRow(ctx,
		"UPDATE shops SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING "+shopReturnColumns,
		status, id,
	)
	return scanShopReturn(row)
}

// ListPublic returns approved, active, public-enabled shops.
func (r *Repository) ListPublic(ctx context.Context, take, skip int, category, governorate, search string) ([]Shop, error) {
	filters := "s.is_active = true AND s.public_disabled = false AND s.status = 'APPROVED' AND u.is_active = true AND u.deactivated_at IS NULL"
	args := []any{take, skip}
	idx := 3
	if category != "" {
		filters += fmt.Sprintf(" AND s.category = $%d", idx)
		args = append(args, category)
		idx++
	}
	if governorate != "" {
		filters += fmt.Sprintf(" AND s.governorate = $%d", idx)
		args = append(args, governorate)
		idx++
	}
	if search != "" {
		filters += fmt.Sprintf(" AND s.name ILIKE $%d", idx)
		args = append(args, "%"+search+"%")
		idx++
	}

	query := selectShop + " WHERE " + filters + " ORDER BY s.created_at DESC LIMIT $1 OFFSET $2"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_public_shops_failed", err)
	}
	defer rows.Close()
	return scanShops(rows)
}

// ListByStatus returns shops filtered by status for admin.
func (r *Repository) ListByStatus(ctx context.Context, take, skip int, status ShopStatus, search string) ([]Shop, error) {
	filters := "1=1"
	args := []any{take, skip}
	idx := 3
	if status != "" {
		filters += fmt.Sprintf(" AND s.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	if search != "" {
		filters += fmt.Sprintf(" AND (s.name ILIKE $%d OR s.slug ILIKE $%d OR s.city ILIKE $%d OR s.governorate ILIKE $%d OR s.phone ILIKE $%d OR s.email ILIKE $%d OR u.email ILIKE $%d)",
			idx, idx+1, idx+2, idx+3, idx+4, idx+5, idx+6)
		pattern := "%" + search + "%"
		for n := 0; n < 7; n++ {
			args = append(args, pattern)
		}
		idx += 7
	}

	query := selectShop + " WHERE " + filters + " ORDER BY s.created_at DESC LIMIT $1 OFFSET $2"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_shops_by_status_failed", err)
	}
	defer rows.Close()
	return scanShops(rows)
}

// SitemapShops returns approved shop slugs and updated_at.
func (r *Repository) SitemapShops(ctx context.Context) ([]struct {
	Slug      string
	UpdatedAt time.Time
}, error) {
	rows, err := r.pool.Query(ctx, "SELECT slug, updated_at FROM shops WHERE status = 'APPROVED'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct {
		Slug      string
		UpdatedAt time.Time
	}
	for rows.Next() {
		var slug string
		var updatedAt time.Time
		if err := rows.Scan(&slug, &updatedAt); err != nil {
			return nil, err
		}
		out = append(out, struct {
			Slug      string
			UpdatedAt time.Time
		}{slug, updatedAt})
	}
	return out, rows.Err()
}

// SitemapProducts returns active product IDs and updated_at.
func (r *Repository) SitemapProducts(ctx context.Context) ([]struct {
	ID        string
	UpdatedAt time.Time
}, error) {
	rows, err := r.pool.Query(ctx, "SELECT id, updated_at FROM products WHERE is_active = true")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct {
		ID        string
		UpdatedAt time.Time
	}
	for rows.Next() {
		var id string
		var updatedAt time.Time
		if err := rows.Scan(&id, &updatedAt); err != nil {
			return nil, err
		}
		out = append(out, struct {
			ID        string
			UpdatedAt time.Time
		}{id, updatedAt})
	}
	return out, rows.Err()
}

// SetOwnerActive activates the owner and sets their shopId.
func (r *Repository) SetOwnerActive(ctx context.Context, ownerID, shopID string) error {
	_, err := r.pool.Exec(ctx,
		"UPDATE users SET is_active = true, shop_id = $1, updated_at = NOW() WHERE id = $2",
		shopID, ownerID,
	)
	return err
}

// SetOwnerInactive deactivates the owner account (merchant lock).
func (r *Repository) SetOwnerInactive(ctx context.Context, ownerID string) error {
	_, err := r.pool.Exec(ctx,
		"UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1",
		ownerID,
	)
	return err
}

const shopColumns = `
	s.id, s.name, s.slug, s.description, s.category, s.activity, s.governorate, s.city, s.address,
	s.address_detailed, s.display_address, s.map_label, s.latitude, s.longitude,
	s.location_source, s.location_accuracy, s.location_updated_at, s.phone, s.email,
	s.opening_hours, s.logo_url, s.banner_url, s.status, s.page_design, s.builder_config, s.theme,
	s.custom_colors, s.custom_fonts, s.layout_config, s.followers, s.visitors,
	s.rating, s.is_active, s.owner_id, s.created_at, s.updated_at, s.addons,
	s.public_disabled, s.delivery_disabled, s.ai_tier, s.ai_usage_month,
	s.ai_usage_reset_at,
	u.id AS owner_user_id, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
`

const selectShop = `SELECT ` + shopColumns + ` FROM shops s LEFT JOIN users u ON u.id = s.owner_id`

// shopReturnColumns is used for INSERT/UPDATE RETURNING clauses where table
// aliases and the joined owner (users) columns are not available.
const shopReturnColumns = `
	id, name, slug, description, category, activity, governorate, city, address,
	address_detailed, display_address, map_label, latitude, longitude,
	location_source, location_accuracy, location_updated_at, phone, email,
	opening_hours, logo_url, banner_url, status, page_design, builder_config, theme,
	custom_colors, custom_fonts, layout_config, followers, visitors,
	rating, is_active, owner_id, created_at, updated_at, addons,
	public_disabled, delivery_disabled, ai_tier, ai_usage_month,
	ai_usage_reset_at
`

func scanShopReturn(row pgx.Row) (*Shop, error) {
	var s Shop
	var desc, address, addrDetailed, displayAddr, mapLabel, locationSrc, phone, email, opening, logo, banner, theme sql.NullString
	var lat, lng, locAcc sql.NullFloat64
	var locUpdated, aiReset sql.NullTime
	var ownerIDVal sql.NullString
	var activity sql.NullString

	err := row.Scan(
		&s.ID, &s.Name, &s.Slug, &desc, &s.Category, &activity, &s.Governorate, &s.City, &address,
		&addrDetailed, &displayAddr, &mapLabel, &lat, &lng, &locationSrc, &locAcc,
		&locUpdated, &phone, &email, &opening, &logo, &banner, &s.Status, &s.PageDesign,
		&s.BuilderConfig, &theme, &s.CustomColors, &s.CustomFonts, &s.LayoutConfig, &s.Followers,
		&s.Visitors, &s.Rating, &s.IsActive, &ownerIDVal, &s.CreatedAt, &s.UpdatedAt,
		&s.Addons, &s.PublicDisabled, &s.DeliveryDisabled, &s.AiTier, &s.AiUsageMonth,
		&aiReset,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_shop_failed", err)
	}

	s.Activity = nullStringPtr(activity)
	s.Description = nullStringPtr(desc)
	s.Address = nullStringPtr(address)
	s.AddressDetailed = nullStringPtr(addrDetailed)
	s.DisplayAddress = nullStringPtr(displayAddr)
	s.MapLabel = nullStringPtr(mapLabel)
	s.Phone = phone.String
	s.Email = nullStringPtr(email)
	s.OpeningHours = nullStringPtr(opening)
	s.LogoURL = nullStringPtr(logo)
	s.BannerURL = nullStringPtr(banner)
	s.Theme = nullStringPtr(theme)
	s.Latitude = nullFloat64Ptr(lat)
	s.Longitude = nullFloat64Ptr(lng)
	s.LocationSource = nullStringPtr(locationSrc)
	s.LocationAccuracy = nullFloat64Ptr(locAcc)
	s.LocationUpdatedAt = nullTimePtr(locUpdated)
	s.AiUsageResetAt = nullTimePtr(aiReset)
	s.OwnerID = nullStringPtr(ownerIDVal)

	return &s, nil
}

func scanShop(row pgx.Row) (*Shop, error) {
	var s Shop
	var desc, address, addrDetailed, displayAddr, mapLabel, locationSrc, phone, email, opening, logo, banner, theme sql.NullString
	var lat, lng, locAcc sql.NullFloat64
	var locUpdated, aiReset sql.NullTime
	var ownerID, ownerName, ownerEmail, ownerPhone sql.NullString
	var ownerIDVal sql.NullString

	var activity sql.NullString
	err := row.Scan(
		&s.ID, &s.Name, &s.Slug, &desc, &s.Category, &activity, &s.Governorate, &s.City, &address,
		&addrDetailed, &displayAddr, &mapLabel, &lat, &lng, &locationSrc, &locAcc,
		&locUpdated, &phone, &email, &opening, &logo, &banner, &s.Status, &s.PageDesign,
		&s.BuilderConfig, &theme, &s.CustomColors, &s.CustomFonts, &s.LayoutConfig, &s.Followers,
		&s.Visitors, &s.Rating, &s.IsActive, &ownerIDVal, &s.CreatedAt, &s.UpdatedAt,
		&s.Addons, &s.PublicDisabled, &s.DeliveryDisabled, &s.AiTier, &s.AiUsageMonth,
		&aiReset, &ownerID, &ownerName, &ownerEmail, &ownerPhone,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_shop_failed", err)
	}

	s.Activity = nullStringPtr(activity)
	s.Description = nullStringPtr(desc)
	s.Address = nullStringPtr(address)
	s.AddressDetailed = nullStringPtr(addrDetailed)
	s.DisplayAddress = nullStringPtr(displayAddr)
	s.MapLabel = nullStringPtr(mapLabel)
	s.Phone = phone.String
	s.Email = nullStringPtr(email)
	s.OpeningHours = nullStringPtr(opening)
	s.LogoURL = nullStringPtr(logo)
	s.BannerURL = nullStringPtr(banner)
	s.Theme = nullStringPtr(theme)
	s.Latitude = nullFloat64Ptr(lat)
	s.Longitude = nullFloat64Ptr(lng)
	s.LocationSource = nullStringPtr(locationSrc)
	s.LocationAccuracy = nullFloat64Ptr(locAcc)
	s.LocationUpdatedAt = nullTimePtr(locUpdated)
	s.AiUsageResetAt = nullTimePtr(aiReset)
	s.OwnerID = nullStringPtr(ownerIDVal)

	if ownerID.Valid {
		s.Owner = &ShopOwner{
			ID:    ownerID.String,
			Name:  ownerName.String,
			Email: ownerEmail.String,
		}
		if ownerPhone.Valid {
			p := ownerPhone.String
			s.Owner.Phone = &p
		}
	}

	return &s, nil
}

func scanShops(rows pgx.Rows) ([]Shop, error) {
	var shops []Shop
	for rows.Next() {
		s, err := scanShop(rows)
		if err != nil {
			return nil, err
		}
		if s != nil {
			shops = append(shops, *s)
		}
	}
	return shops, rows.Err()
}

func nullStringPtr(s sql.NullString) *string {
	if !s.Valid || s.String == "" {
		return nil
	}
	return &s.String
}

func nullFloat64Ptr(f sql.NullFloat64) *float64 {
	if !f.Valid {
		return nil
	}
	return &f.Float64
}

func nullTimePtr(t sql.NullTime) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

// IsFollowing checks if a user follows a shop
func (r *Repository) IsFollowing(ctx context.Context, userID, shopID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM shop_followers WHERE user_id = $1 AND shop_id = $2)",
		userID, shopID,
	).Scan(&exists)
	return exists, err
}

// FollowShop creates a follow relationship
func (r *Repository) FollowShop(ctx context.Context, userID, shopID string) error {
	_, err := r.pool.Exec(ctx,
		"INSERT INTO shop_followers (user_id, shop_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
		userID, shopID,
	)
	return err
}

// UnfollowShop removes a follow relationship
func (r *Repository) UnfollowShop(ctx context.Context, userID, shopID string) error {
	_, err := r.pool.Exec(ctx,
		"DELETE FROM shop_followers WHERE user_id = $1 AND shop_id = $2",
		userID, shopID,
	)
	return err
}

// IncrementFollowers increments/decrements the followers count on a shop
func (r *Repository) IncrementFollowers(ctx context.Context, shopID string, delta int) error {
	_, err := r.pool.Exec(ctx,
		"UPDATE shops SET followers = GREATEST(followers + $1, 0) WHERE id = $2",
		delta, shopID,
	)
	return err
}
