package products

import (
	"encoding/json"
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Products domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new products repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// FindByID returns a product by ID scoped to a shop, or nil if not found.
func (r *Repository) FindByID(ctx context.Context, id, shopID string) (*Product, error) {
	query := selectProduct + " WHERE p.id = $1"
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	row := r.pool.QueryRow(ctx, query, args...)
	return scanProduct(row)
}

// FindByIDWithInactive returns a product by ID scoped to a shop regardless of is_active.
func (r *Repository) FindByIDWithInactive(ctx context.Context, id, shopID string) (*Product, error) {
	return r.FindByID(ctx, id, shopID)
}

// listOptions combines shop-scoped + filter + paging params.
// Active filters on is_active (موقع المتجر) and AppActive on app_active (تطبيق الماركت) —
// the two surfaces are toggled independently from the merchant dashboard.
type listOptions struct {
	ShopID    string
	Active    bool
	AppActive bool
	Offset    int
	Limit     int
	Filter    ProductFilter
	CountOnly bool
}

// buildWhere constructs the WHERE clause and args for product listing,
// shared between List and Count to guarantee consistent filtering.
func buildWhere(opts listOptions) (string, []any) {
	var clauses []string
	var args []any
	i := 1

	if opts.ShopID != "" {
		clauses = append(clauses, fmt.Sprintf("p.shop_id = $%d", i))
		args = append(args, opts.ShopID)
		i++
	}
	if opts.Active {
		clauses = append(clauses, "p.is_active = true")
	}
	if opts.AppActive {
		clauses = append(clauses, "p.app_active = true")
	}

	f := opts.Filter
	if f.IncludeImageMap {
		if f.Category != "" {
			clauses = append(clauses, fmt.Sprintf("p.category = $%d", i))
			args = append(args, f.Category)
			i++
		} else {
			clauses = append(clauses, "p.category != '__DUPLICATE__AUTO__'")
		}
	} else {
		clauses = append(clauses, "("+excludeHiddenCategoriesSQL+")")
		if f.Category != "" {
			clauses = append(clauses, fmt.Sprintf("p.category = $%d", i))
			args = append(args, f.Category)
			i++
		}
	}

	if f.MinPrice > 0 {
		clauses = append(clauses, fmt.Sprintf("p.price >= $%d", i))
		args = append(args, f.MinPrice)
		i++
	}
	if f.MaxPrice > 0 {
		clauses = append(clauses, fmt.Sprintf("p.price <= $%d", i))
		args = append(args, f.MaxPrice)
		i++
	}

	if strings.TrimSpace(f.Search) != "" {
		clauses = append(clauses, fmt.Sprintf("(p.name ILIKE $%d OR p.description ILIKE $%d)", i, i))
		pat := "%" + strings.TrimSpace(f.Search) + "%"
		args = append(args, pat)
		i++
	}

	// تصفية بنشاط المتجر (الأقسام في الماركت) عبر subquery بدل تعديل FROM.
	// بتدعم أكتر من قيمة مفصولة بفاصلة (OR بينهم) — مثال: "cars,carShowroom,auto_parts".
	// ده بيخلّي القسم الواحد في الماركت يجمّع أكتر من نشاط/تصنيف في الباك إند.
	if raw := strings.TrimSpace(f.ShopActivity); raw != "" {
		values := make([]string, 0, 4)
		for _, part := range strings.Split(raw, ",") {
			if v := strings.TrimSpace(part); v != "" && len([]rune(v)) <= 64 {
				values = append(values, v)
			}
		}
		if len(values) > 0 {
			ors := make([]string, 0, len(values))
			for _, v := range values {
				// ملاحظة: s.category نوعه enum في Postgres (ShopCategory) و LOWER مش معرّفة على الـ enum،
				// فلازم نحوّله text قبل LOWER وإلا الاستعلام كله بيرجّع 500.
				ors = append(ors, fmt.Sprintf(
					"LOWER(s.activity) = LOWER($%d) OR LOWER(s.category::text) = LOWER($%d)", i, i))
				args = append(args, v)
				i++
			}
			clauses = append(clauses, fmt.Sprintf(
				"p.shop_id IN (SELECT s.id FROM shops s WHERE %s)", strings.Join(ors, " OR ")))
		}
	}

	if len(clauses) == 0 {
		return "", args
	}
	return strings.Join(clauses, " AND "), args
}

func orderBySQL(sort string) string {
	switch sort {
	case "price_asc":
		return "ORDER BY p.price ASC NULLS LAST"
	case "price_desc":
		return "ORDER BY p.price DESC NULLS LAST"
	case "name":
		return "ORDER BY p.name ASC"
	case "oldest":
		return "ORDER BY p.created_at ASC"
	default:
		return "ORDER BY p.created_at DESC"
	}
}

// surfaceOptions maps a public listing surface to its visibility flag:
// "site" يقرأ is_active (موقع المتجر)، وأي حاجة تانية — including the default —
// تقرأ app_active (تطبيق الماركت).
func surfaceOptions(surface string) (active, appActive bool) {
	if surface == "site" {
		return true, false
	}
	return false, true
}

// ListByShop returns visible products for a shop on the requested surface,
// honoring search/filter/sort.
func (r *Repository) ListByShop(ctx context.Context, shopID, surface string, limit, offset int, f ProductFilter) ([]Product, error) {
	active, appActive := surfaceOptions(surface)
	opts := listOptions{ShopID: shopID, Active: active, AppActive: appActive, Limit: limit, Offset: offset, Filter: f}
	where, args := buildWhere(opts)
	query := selectProduct + " WHERE " + where + " " + orderBySQL(f.Sort) +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_products_failed", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

// CountByShop returns the total matching count for ListByShop.
func (r *Repository) CountByShop(ctx context.Context, shopID, surface string, f ProductFilter) (int64, error) {
	active, appActive := surfaceOptions(surface)
	opts := listOptions{ShopID: shopID, Active: active, AppActive: appActive, Filter: f}
	where, args := buildWhere(opts)
	query := "SELECT COUNT(*) FROM products p WHERE " + where
	var total int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, errors.Internal("count_products_failed", err)
	}
	return total, nil
}

// ListAllActive returns visible products across shops on the requested surface.
func (r *Repository) ListAllActive(ctx context.Context, surface string, limit, offset int, f ProductFilter) ([]Product, error) {
	active, appActive := surfaceOptions(surface)
	opts := listOptions{Active: active, AppActive: appActive, Limit: limit, Offset: offset, Filter: f}
	where, args := buildWhere(opts)
	query := selectProduct + " WHERE " + where + " " + orderBySQL(f.Sort) +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_products_failed", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

// CountAllActive returns the total matching count for ListAllActive.
func (r *Repository) CountAllActive(ctx context.Context, surface string, f ProductFilter) (int64, error) {
	active, appActive := surfaceOptions(surface)
	opts := listOptions{Active: active, AppActive: appActive, Filter: f}
	where, args := buildWhere(opts)
	query := "SELECT COUNT(*) FROM products p WHERE " + where
	var total int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, errors.Internal("count_products_failed", err)
	}
	return total, nil
}

// ListByShopForManage returns products for a shop including inactive ones, honoring filter/sort.
func (r *Repository) ListByShopForManage(ctx context.Context, shopID string, limit, offset int, includeImageMap bool, f ProductFilter) ([]Product, error) {
	f.IncludeImageMap = includeImageMap
	opts := listOptions{ShopID: shopID, Limit: limit, Offset: offset, Filter: f}
	where, args := buildWhere(opts)
	query := selectProduct + " WHERE " + where + " " + orderBySQL(f.Sort) +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Internal("list_products_manage_failed", err)
	}
	defer rows.Close()
	return scanProducts(rows)
}

// CountByShopForManage returns the total matching count for ListByShopForManage.
func (r *Repository) CountByShopForManage(ctx context.Context, shopID string, includeImageMap bool, f ProductFilter) (int64, error) {
	f.IncludeImageMap = includeImageMap
	opts := listOptions{ShopID: shopID, Filter: f}
	where, args := buildWhere(opts)
	query := "SELECT COUNT(*) FROM products p WHERE " + where
	var total int64
	err := r.pool.QueryRow(ctx, query, args...).Scan(&total)
	if err != nil {
		return 0, errors.Internal("count_products_failed", err)
	}
	return total, nil
}

// Create inserts a product with an optional furniture meta row.
func (r *Repository) Create(ctx context.Context, p *Product) (*Product, error) {
	// RETURNING can't reference the fm join (see Update), so furniture
	// columns come back NULL and are filled by upsertFurnitureMeta below.
	query := `
		INSERT INTO products (
			id, name, description, price, stock, category, image_url, is_active, app_active,
			shop_id, track_stock, unit, images, colors, sizes, addons,
			menu_variants, pack_options, model_3d_url, spin_images, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
		) RETURNING ` + fmNullColumnsNoAlias

	row := r.pool.QueryRow(ctx, query,
		p.Name, p.Description, p.Price, p.Stock, p.Category, p.ImageURL, p.IsActive, p.AppActive,
		p.ShopID, p.TrackStock, p.Unit, p.Images, p.Colors, p.Sizes, p.Addons,
		p.MenuVariants, p.PackOptions, p.Model3DURL, p.SpinImages,
	)
	created, err := scanProduct(row)
	if err != nil {
		return nil, err
	}
	if p.FurnitureMeta != nil {
		fm, err := r.upsertFurnitureMeta(ctx, created.ID, p.FurnitureMeta)
		if err != nil {
			return nil, err
		}
		created.FurnitureMeta = fm
	}
	return created, nil
}

// Update applies a partial update to a product and optionally updates furniture meta.
func (r *Repository) Update(ctx context.Context, id, shopID string, fields map[string]any, furnitureMeta *FurnitureMeta) (*Product, error) {
	set := []string{}
	args := []any{}
	i := 1
	for col, val := range fields {
		set = append(set, fmt.Sprintf("%s = $%d", col, i))
		args = append(args, val)
		i++
	}
	if len(set) == 0 && furnitureMeta == nil {
		return r.FindByID(ctx, id, shopID)
	}
	set = append(set, fmt.Sprintf("updated_at = $%d", i))
	args = append(args, time.Now().UTC())
	i++
	args = append(args, id)

	// "AS p" is required: productColumns returns p-prefixed columns. RETURNING
	// can't reference the fm join, so furniture columns come back NULL and are
	// filled from product_furniture_meta right after.
	where := " WHERE p.id = $" + strconv.Itoa(i)
	if shopID != "" {
		where += " AND p.shop_id = $" + strconv.Itoa(i+1)
	}
	query := "UPDATE products AS p SET " + strings.Join(set, ", ") + where + " RETURNING " + fmNullColumns
	args = append(args, shopID)
	row := r.pool.QueryRow(ctx, query, args...)
	updated, err := scanProduct(row)
	if err != nil {
		return nil, err
	}
	// re-read with the full join so furniture meta is accurate
	if updated != nil {
		if fresh, ferr := r.FindByID(ctx, id, shopID); ferr == nil && fresh != nil {
			updated = fresh
		}
	}
	if furnitureMeta != nil {
		fm, err := r.upsertFurnitureMeta(ctx, id, furnitureMeta)
		if err != nil {
			return nil, err
		}
		updated.FurnitureMeta = fm
	}
	return updated, nil
}

// Delete removes a product scoped to its owning shop.
func (r *Repository) Delete(ctx context.Context, id, shopID string) error {
	query := "DELETE FROM products WHERE id = $1"
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

// NameMapForShop loads the existing normalized-name → product-ID mapping for a
// shop inside the import transaction, once per chunk instead of per row.
func (r *Repository) NameMapForShop(ctx context.Context, tx pgx.Tx, shopID string) (map[string]string, error) {
	rows, err := tx.Query(ctx,
		"SELECT id, lower(btrim(name)) FROM products WHERE shop_id = $1", shopID)
	if err != nil {
		return nil, errors.Internal("import_namemap_failed", err)
	}
	defer rows.Close()
	m := make(map[string]string, 64)
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, errors.Internal("import_namemap_scan_failed", err)
		}
		m[name] = id
	}
	return m, rows.Err()
}

// FindIDForUpdate resolves the target product for a bulk-import row inside the
// import transaction: by productId when provided (and owned by the shop),
// otherwise by trimmed name within the shop. The row is locked FOR UPDATE so
// the subsequent update is safe.
func (r *Repository) FindIDForUpdate(ctx context.Context, tx pgx.Tx, shopID, productID, name string) (string, error) {
	if productID != "" {
		var id string
		err := tx.QueryRow(ctx,
			"SELECT id FROM products WHERE id = $1 AND shop_id = $2 FOR UPDATE",
			productID, shopID).Scan(&id)
		if err == nil {
			return id, nil
		}
		if err != pgx.ErrNoRows {
			return "", err
		}
		// Stale productId: fall through to a name match.
	}
	var id string
	err := tx.QueryRow(ctx,
		"SELECT id FROM products WHERE shop_id = $1 AND lower(btrim(name)) = lower(btrim($2)) FOR UPDATE",
		shopID, name).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return id, nil
}

// UpdateImported overwrites the importable columns of an existing product.
func (r *Repository) UpdateImported(ctx context.Context, tx pgx.Tx, id string, p *Product) (string, error) {
	_, err := tx.Exec(ctx,
		`UPDATE products SET
			name = $2, description = $3, price = $4, stock = $5, category = $6,
			unit = $7, image_url = $8, track_stock = $9, updated_at = NOW()
		 WHERE id = $1`,
		id, p.Name, p.Description, p.Price, p.Stock, p.Category,
		p.Unit, p.ImageURL, p.TrackStock)
	if err != nil {
		return "", err
	}
	return id, nil
}

// CreateImported inserts a new product inside the import transaction and
// returns its generated ID. Column list mirrors Create so imported products
// look exactly like single-created ones.
func (r *Repository) CreateImported(ctx context.Context, tx pgx.Tx, p *Product) (string, error) {
	var id string
	err := tx.QueryRow(ctx,
		`INSERT INTO products (
			id, name, description, price, stock, category, image_url, is_active, app_active,
			shop_id, track_stock, unit, images, colors, sizes, addons,
			menu_variants, pack_options, model_3d_url, spin_images, created_at, updated_at
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
		) RETURNING id`,
		p.Name, p.Description, p.Price, p.Stock, p.Category, p.ImageURL, p.IsActive, p.AppActive,
		p.ShopID, p.TrackStock, p.Unit, p.Images, p.Colors, p.Sizes, p.Addons,
		p.MenuVariants, p.PackOptions, p.Model3DURL, p.SpinImages).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// ShopExists checks if a shop with the given ID exists.
func (r *Repository) ShopExists(ctx context.Context, shopID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM shops WHERE id = $1)", shopID).Scan(&exists)
	return exists, err
}

// GetShopCategory returns the category of a shop.
func (r *Repository) GetShopCategory(ctx context.Context, shopID string) (string, error) {
	var category string
	err := r.pool.QueryRow(ctx, "SELECT category FROM shops WHERE id = $1", shopID).Scan(&category)
	if err != nil {
		return "", err
	}
	return category, nil
}

func (r *Repository) upsertFurnitureMeta(ctx context.Context, productID string, fm *FurnitureMeta) (*FurnitureMeta, error) {
	query := `
		INSERT INTO product_furniture_meta (id, product_id, unit, length_cm, width_cm, height_cm, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (product_id) DO UPDATE SET
			unit = EXCLUDED.unit,
			length_cm = EXCLUDED.length_cm,
			width_cm = EXCLUDED.width_cm,
			height_cm = EXCLUDED.height_cm,
			updated_at = NOW()
		RETURNING id, unit, length_cm, width_cm, height_cm
	`
	row := r.pool.QueryRow(ctx, query, productID, fm.Unit, fm.LengthCm, fm.WidthCm, fm.HeightCm)
	var out FurnitureMeta
	if err := row.Scan(&out.ID, &out.Unit, &out.LengthCm, &out.WidthCm, &out.HeightCm); err != nil {
		return nil, err
	}
	return &out, nil
}

const productColumns = `
	p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.is_active, p.app_active,
	p.shop_id, p.track_stock, p.unit, p.images, p.colors, p.sizes, p.addons,
	p.menu_variants, p.pack_options, p.model_3d_url, p.spin_images, p.extra_data, p.created_at, p.updated_at,
	fm.id AS fm_id, fm.unit AS fm_unit, fm.length_cm AS fm_length, fm.width_cm AS fm_width, fm.height_cm AS fm_height
`

// productColumns with the fm join replaced by NULLs — INSERT/UPDATE RETURNING
// clauses can only reference the mutated table, never a joined one.
const fmNullColumns = `
	p.id, p.name, p.description, p.price, p.stock, p.category, p.image_url, p.is_active, p.app_active,
	p.shop_id, p.track_stock, p.unit, p.images, p.colors, p.sizes, p.addons,
	p.menu_variants, p.pack_options, p.model_3d_url, p.spin_images, p.extra_data, p.created_at, p.updated_at,
	NULL::text AS fm_id, NULL::text AS fm_unit, NULL::float8 AS fm_length, NULL::float8 AS fm_width, NULL::float8 AS fm_height
`

// fmNullColumns without the "p." alias — INSERT ... RETURNING exposes the
// target table's columns bare (no alias exists for INSERT).
const fmNullColumnsNoAlias = `
	id, name, description, price, stock, category, image_url, is_active, app_active,
	shop_id, track_stock, unit, images, colors, sizes, addons,
	menu_variants, pack_options, model_3d_url, spin_images, extra_data, created_at, updated_at,
	NULL::text AS fm_id, NULL::text AS fm_unit, NULL::float8 AS fm_length, NULL::float8 AS fm_width, NULL::float8 AS fm_height
`

const selectProduct = `SELECT ` + productColumns + ` FROM products p LEFT JOIN product_furniture_meta fm ON fm.product_id = p.id`

func scanProduct(row pgx.Row) (*Product, error) {
	p := &Product{}
	var desc, imageURL, unit, model3d sql.NullString
	var extraData []byte
	var fmID, fmUnit sql.NullString
	var fmLength, fmWidth, fmHeight sql.NullFloat64

	err := row.Scan(
		&p.ID, &p.Name, &desc, &p.Price, &p.Stock, &p.Category, &imageURL, &p.IsActive, &p.AppActive,
		&p.ShopID, &p.TrackStock, &unit, &p.Images, &p.Colors, &p.Sizes, &p.Addons,
		&p.MenuVariants, &p.PackOptions, &model3d, &p.SpinImages, &extraData, &p.CreatedAt, &p.UpdatedAt,
		&fmID, &fmUnit, &fmLength, &fmWidth, &fmHeight,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_product_failed", err)
	}

	if len(extraData) > 0 {
		_ = json.Unmarshal(extraData, &p.ExtraData)
	}

	p.Description = nullStringPtr(desc)
	p.ImageURL = nullStringPtr(imageURL)
	p.Unit = nullStringPtr(unit)
	p.Model3DURL = nullStringPtr(model3d)

	if fmID.Valid {
		p.FurnitureMeta = &FurnitureMeta{
			ID:       fmID.String,
			Unit:     nullStringPtr(fmUnit),
			LengthCm: nullFloat64Ptr(fmLength),
			WidthCm:  nullFloat64Ptr(fmWidth),
			HeightCm: nullFloat64Ptr(fmHeight),
		}
	}

	return p, nil
}

func scanProducts(rows pgx.Rows) ([]Product, error) {
	var products []Product
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		if p != nil {
			products = append(products, *p)
		}
	}
	return products, rows.Err()
}

const excludeHiddenCategoriesSQL = `p.category != '__IMAGE_MAP__' AND p.category NOT ILIKE '%IMAGE_MAP%' AND p.category != '__DUPLICATE__AUTO__'`

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
